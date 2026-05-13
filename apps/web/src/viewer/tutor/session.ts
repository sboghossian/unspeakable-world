/**
 * 🎓 Tutoring session — client runtime.
 *
 * The teacher generates a 6-char code, then PUTs its current camera +
 * overlay state to `/api/tutor/<code>` whenever the camera changes
 * (debounced 500 ms). Students poll the same URL every ~2 s, applying
 * the latest state to their local scene.
 *
 * No accounts, no WebSockets. The KV layer is shared with the Copilot's
 * rate-limit namespace (`RATE_LIMIT_KV`) — see
 * `functions/api/tutor/[code].ts` for the server side. If the KV binding
 * is missing the function returns 503 and `joinAsStudent` surfaces an
 * `error` event so the panel can show "session unavailable".
 *
 * Polling cadence: 2 s under normal load, with exponential backoff up to
 * 30 s on consecutive failures. Resets to 2 s on the next successful
 * fetch. ETag is used so the function answers `304 Not Modified` for
 * idle teachers — students still poll, but the body is empty.
 */

import { log } from "../../lib/logger";
import {
  decodeTutorState,
  encodeTutorState,
  generateSessionCode,
  normaliseTutorState,
  type TutorState,
} from "./state-codec";

const POLL_INTERVAL_MIN_MS = 2000;
const POLL_INTERVAL_MAX_MS = 30_000;
const PUT_DEBOUNCE_MS = 500;
/** Teacher PUTs are throttled — at most one in flight + one queued every Nms. */
const PUT_MIN_INTERVAL_MS = 1000;
/** Drop states older than this on the student side ("session ended"). */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000; // 6h (KV TTL is 4h + slack)

export type TeacherHandle = {
  /** The 6-character session code (e.g. "X8K2P4"). */
  code: string;
  /** Push the latest teacher state — debounced + rate-limited internally. */
  publish: (state: TutorState) => void;
  /** Current number of student GETs in the last minute, as reported by the
   *  server. `null` until at least one PUT has completed. */
  watcherCount: () => number | null;
  /** Subscribe to teacher-side lifecycle events. */
  subscribe: (listener: TeacherListener) => () => void;
  /** Tear down the session — issues a final PUT with `caption: "session ended"`. */
  stop: () => void;
};

export type StudentHandle = {
  code: string;
  /** Subscribe to incoming state snapshots. */
  subscribe: (listener: StudentListener) => () => void;
  /** Stop polling. */
  unsubscribe: () => void;
};

export type TeacherEvent =
  | { kind: "started"; code: string }
  | { kind: "published"; ts: number; watchers: number | null }
  | { kind: "error"; message: string }
  | { kind: "stopped" };

export type StudentEvent =
  | { kind: "state"; state: TutorState }
  | { kind: "stale"; lastTs: number }
  | { kind: "error"; message: string; status?: number };

type TeacherListener = (event: TeacherEvent) => void;
type StudentListener = (event: StudentEvent) => void;

/* ------------------------------------------------------------------ */
/* Teacher                                                              */
/* ------------------------------------------------------------------ */

/**
 * Start broadcasting as a teacher. Returns a handle whose `publish`
 * method the scene calls every time the camera changes.
 */
export function becomeTeacher(opts?: {
  /** Provide a pre-existing code (e.g. resumed from local storage). */
  code?: string;
}): TeacherHandle {
  const code = opts?.code ?? generateSessionCode();
  const listeners = new Set<TeacherListener>();
  let lastWatchers: number | null = null;
  let pendingState: TutorState | null = null;
  let putInflight = false;
  let lastPutAt = 0;
  let debounceHandle: number | undefined;
  let stopped = false;

  const emit = (event: TeacherEvent): void => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        log.warn("[tutor/teacher] listener threw", err);
      }
    }
  };

  const flush = async (): Promise<void> => {
    if (stopped || !pendingState || putInflight) return;
    const now = Date.now();
    if (now - lastPutAt < PUT_MIN_INTERVAL_MS) {
      // Re-schedule a flush after the throttle window.
      const wait = PUT_MIN_INTERVAL_MS - (now - lastPutAt);
      window.clearTimeout(debounceHandle);
      debounceHandle = window.setTimeout(() => void flush(), wait);
      return;
    }
    const state = pendingState;
    pendingState = null;
    putInflight = true;
    try {
      const resp = await fetch(tutorUrl(code), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: encodeTutorState(state),
      });
      lastPutAt = Date.now();
      if (!resp.ok) {
        const message = `PUT failed (${resp.status})`;
        emit({ kind: "error", message });
      } else {
        const watchers = readWatcherHeader(resp);
        if (watchers !== null) lastWatchers = watchers;
        emit({ kind: "published", ts: state.ts, watchers: lastWatchers });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit({ kind: "error", message });
    } finally {
      putInflight = false;
      // Drain any state queued while the request was in flight.
      if (pendingState && !stopped) {
        window.clearTimeout(debounceHandle);
        debounceHandle = window.setTimeout(() => void flush(), PUT_DEBOUNCE_MS);
      }
    }
  };

  const publish = (state: TutorState): void => {
    if (stopped) return;
    pendingState = normaliseTutorState({ ...state, ts: Date.now() });
    window.clearTimeout(debounceHandle);
    debounceHandle = window.setTimeout(() => void flush(), PUT_DEBOUNCE_MS);
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(debounceHandle);
    // Best-effort farewell so any students see the "ended" caption.
    if (pendingState) {
      void fetch(tutorUrl(code), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: encodeTutorState({
          ...pendingState,
          ts: Date.now(),
          caption: "Session ended by teacher.",
        }),
      }).catch(() => {
        /* ignore — we're tearing down */
      });
    }
    listeners.clear();
    emit({ kind: "stopped" });
  };

  // Announce the new session on the next tick so callers can subscribe
  // first and then catch the "started" event.
  window.setTimeout(() => emit({ kind: "started", code }), 0);

  return {
    code,
    publish,
    watcherCount: () => lastWatchers,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    stop,
  };
}

/* ------------------------------------------------------------------ */
/* Student                                                              */
/* ------------------------------------------------------------------ */

/**
 * Join as a student — polls the teacher's session URL every ~2 s and
 * emits state events. Returns an unsubscribe callback.
 */
export function joinAsStudent(code: string): StudentHandle {
  const listeners = new Set<StudentListener>();
  let stopped = false;
  let etag: string | null = null;
  let lastState: TutorState | null = null;
  let nextDelay = POLL_INTERVAL_MIN_MS;
  let timer: number | undefined;
  let inflight: AbortController | null = null;

  const emit = (event: StudentEvent): void => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        log.warn("[tutor/student] listener threw", err);
      }
    }
  };

  const schedule = (delay: number): void => {
    if (stopped) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void poll(), delay);
  };

  const poll = async (): Promise<void> => {
    if (stopped) return;
    if (inflight) inflight.abort();
    inflight = new AbortController();
    const headers: Record<string, string> = {};
    if (etag) headers["if-none-match"] = etag;
    try {
      const resp = await fetch(tutorUrl(code), {
        method: "GET",
        headers,
        signal: inflight.signal,
        cache: "no-store",
      });
      if (resp.status === 304) {
        // No change since last poll — still healthy.
        nextDelay = POLL_INTERVAL_MIN_MS;
        maybeMarkStale();
        schedule(nextDelay);
        return;
      }
      if (resp.status === 404) {
        emit({
          kind: "error",
          message: "Session not found. Ask the teacher to share the link again.",
          status: 404,
        });
        nextDelay = Math.min(POLL_INTERVAL_MAX_MS, nextDelay * 2);
        schedule(nextDelay);
        return;
      }
      if (resp.status === 503) {
        emit({
          kind: "error",
          message: "Live tutoring isn't enabled on this deployment yet.",
          status: 503,
        });
        // Slow the poll right down — there's nothing we can do until the
        // operator wires a KV namespace.
        nextDelay = POLL_INTERVAL_MAX_MS;
        schedule(nextDelay);
        return;
      }
      if (!resp.ok) {
        emit({
          kind: "error",
          message: `GET failed (${resp.status})`,
          status: resp.status,
        });
        nextDelay = Math.min(POLL_INTERVAL_MAX_MS, Math.max(POLL_INTERVAL_MIN_MS, nextDelay * 2));
        schedule(nextDelay);
        return;
      }
      const newEtag = resp.headers.get("etag");
      if (newEtag) etag = newEtag;
      const text = await resp.text();
      const state = decodeTutorState(text);
      if (state) {
        lastState = state;
        emit({ kind: "state", state });
      }
      nextDelay = POLL_INTERVAL_MIN_MS;
      schedule(nextDelay);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      const message = err instanceof Error ? err.message : String(err);
      emit({ kind: "error", message });
      nextDelay = Math.min(POLL_INTERVAL_MAX_MS, Math.max(POLL_INTERVAL_MIN_MS, nextDelay * 2));
      schedule(nextDelay);
    } finally {
      inflight = null;
    }
  };

  const maybeMarkStale = (): void => {
    if (!lastState) return;
    if (Date.now() - lastState.ts > STALE_AFTER_MS) {
      emit({ kind: "stale", lastTs: lastState.ts });
    }
  };

  // First poll happens immediately so the student doesn't stare at a
  // blank panel for two seconds after joining.
  schedule(0);

  return {
    code,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    unsubscribe: () => {
      stopped = true;
      window.clearTimeout(timer);
      inflight?.abort();
      listeners.clear();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function tutorUrl(code: string): string {
  return `/api/tutor/${encodeURIComponent(code)}`;
}

function readWatcherHeader(resp: Response): number | null {
  const raw = resp.headers.get("x-tutor-watchers");
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Probe whether the server-side tutor function is wired up. Used by the
 * Tutor button to render disabled-with-tooltip when the deployment
 * lacks the KV binding.
 */
export async function probeTutorHealth(): Promise<boolean> {
  try {
    const resp = await fetch("/api/tutor/health", {
      method: "GET",
      cache: "no-store",
    });
    return resp.ok;
  } catch {
    return false;
  }
}

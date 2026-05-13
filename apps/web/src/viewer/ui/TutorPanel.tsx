import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { log } from "../../lib/logger";
import {
  becomeTeacher,
  buildTutorHash,
  joinAsStudent,
  parseTutorHash,
  probeTutorHealth,
  type StudentEvent,
  type StudentHandle,
  type TeacherEvent,
  type TeacherHandle,
  type TutorMode,
  type TutorState,
} from "../tutor";

/**
 * 🎓 Tutor Panel — entry point for the live-tutoring feature.
 *
 * Two modes:
 *
 *   • TEACHER (no `#tutor=…` in the hash) — clicking "Start a session"
 *     mints a 6-char code, switches the button to a watcher-count badge,
 *     and opens a popover with the shareable URL.
 *
 *   • STUDENT (`#tutor=CODE` is present in the hash) — auto-joins as
 *     student, applies the teacher's incoming state via the adapter,
 *     and shows the teacher's optional caption.
 *
 * Scene integration is via a small {@link TutorSceneAdapter} interface
 * so the same panel works across Viewer (sky), SolarFlight, Galactic,
 * and Universe modes without bringing scene internals into the panel.
 *
 * Complements (but does not replace) the existing Curriculum and
 * Certificate panels — tutoring is the live counterpart to the
 * async classroom roster encoded in `lib/teacher.ts`.
 */

export type TutorSceneAdapter = {
  /** Identifies which mode the scene is running so the protocol can
   *  reject mismatched joins without crashing (e.g. a student in Universe
   *  joining a teacher who's in Sky mode). */
  mode: TutorMode;
  /** Snapshot the scene's current camera + overlay state for broadcast.
   *  Called by the teacher's debounced publish loop. */
  snapshot: () => Omit<TutorState, "v" | "ts">;
  /** Apply an incoming teacher state to the local scene. Called on every
   *  successful student poll that produced a fresh state. Implementations
   *  MUST be idempotent and MUST NOT trigger a follow-up publish. */
  apply: (state: TutorState) => void;
};

type Props = {
  adapter: TutorSceneAdapter | null;
  /** Optional CSS classes applied to the trigger button. Defaults to the
   *  standard top-bar styling. */
  buttonClassName?: string;
};

type Phase =
  | { kind: "idle" }
  | { kind: "teacher"; handle: TeacherHandle }
  | { kind: "student"; handle: StudentHandle }
  | { kind: "loading" };

export function TutorPanel({ adapter, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [watchers, setWatchers] = useState<number | null>(null);
  const [studentState, setStudentState] = useState<TutorState | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const lastAppliedTsRef = useRef<number>(0);

  // Probe the backend once per mount — cheap HEAD-ish GET.
  useEffect(() => {
    let cancelled = false;
    void probeTutorHealth().then((ok) => {
      if (!cancelled) setHealthAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-join as student if the URL hash has a tutor code on mount.
  useEffect(() => {
    if (!adapter) return;
    if (phase.kind !== "idle") return;
    if (typeof window === "undefined") return;
    const code = parseTutorHash(window.location.hash);
    if (!code) return;
    const handle = joinAsStudent(code);
    setPhase({ kind: "student", handle });
    setOpen(true);
    return () => {
      handle.unsubscribe();
    };
    // We intentionally don't depend on `phase` here — the guard above is
    // sufficient and re-running on phase changes would tear down a
    // healthy student session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // Wire the teacher's lifecycle events into local UI state.
  useEffect(() => {
    if (phase.kind !== "teacher") return;
    const unsub = phase.handle.subscribe((event: TeacherEvent) => {
      if (event.kind === "published") {
        setWatchers(event.watchers);
        setTeacherError(null);
      } else if (event.kind === "error") {
        setTeacherError(event.message);
      } else if (event.kind === "stopped") {
        setPhase({ kind: "idle" });
        setWatchers(null);
      }
    });
    return () => {
      unsub();
    };
  }, [phase]);

  // Wire the student's lifecycle events into local UI state, and apply
  // each fresh state to the scene via the adapter.
  useEffect(() => {
    if (phase.kind !== "student") return;
    const unsub = phase.handle.subscribe((event: StudentEvent) => {
      if (event.kind === "state") {
        setStudentError(null);
        setStudentState(event.state);
        if (!adapter) return;
        if (event.state.ts <= lastAppliedTsRef.current) return;
        lastAppliedTsRef.current = event.state.ts;
        try {
          adapter.apply(event.state);
        } catch (err) {
          log.warn("[tutor/student] adapter.apply threw", err);
        }
      } else if (event.kind === "error") {
        setStudentError(event.message);
      } else if (event.kind === "stale") {
        setStudentError("Teacher has been quiet for a while.");
      }
    });
    return () => {
      unsub();
    };
  }, [phase, adapter]);

  // Teacher publish loop — debounced snapshot every time the adapter's
  // snapshot output changes meaningfully. We poll the adapter at a
  // modest cadence rather than wiring scene-internal subscriptions; the
  // teacher PUTs are already throttled server-side so a stable view
  // produces zero traffic after the first identical-payload short-cut.
  useEffect(() => {
    if (phase.kind !== "teacher") return;
    if (!adapter) return;
    const handle = phase.handle;
    let lastEncoded = "";
    const intervalMs = 750;
    const id = window.setInterval(() => {
      try {
        const snap = adapter.snapshot();
        const next: TutorState = {
          v: 1,
          ts: Date.now(),
          ...snap,
        };
        if (caption.trim()) next.caption = caption.trim();
        else delete next.caption;
        // Only publish on meaningful change — encode and compare. Drops
        // the `ts` so identical camera state doesn't keep spamming KV.
        const fingerprint = JSON.stringify({ ...next, ts: 0 });
        if (fingerprint === lastEncoded) return;
        lastEncoded = fingerprint;
        handle.publish(next);
      } catch (err) {
        log.warn("[tutor/teacher] snapshot threw", err);
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [phase, adapter, caption]);

  // Close popover on Escape / outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (popoverRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick, true);
    };
  }, [open]);

  const startTeaching = useCallback(() => {
    if (!adapter) return;
    if (phase.kind !== "idle") return;
    if (healthAvailable === false) {
      setTeacherError("Live tutoring isn't enabled on this deployment yet.");
      return;
    }
    setPhase({ kind: "loading" });
    const handle = becomeTeacher();
    setPhase({ kind: "teacher", handle });
    // Land the session code in the URL hash so the teacher's address bar
    // already shows a shareable link the moment the popover opens.
    try {
      if (typeof window !== "undefined") {
        const hash = `#${buildTutorHash(handle.code)}`;
        window.history.replaceState(null, "", hash);
      }
    } catch {
      /* ignore — best-effort cosmetic */
    }
  }, [adapter, phase.kind, healthAvailable]);

  const stopSession = useCallback(() => {
    if (phase.kind === "teacher") {
      phase.handle.stop();
    } else if (phase.kind === "student") {
      phase.handle.unsubscribe();
    }
    setPhase({ kind: "idle" });
    setWatchers(null);
    setStudentState(null);
    setStudentError(null);
    setTeacherError(null);
    setCaption("");
    // Strip the tutor= hash so a stale code doesn't auto-rejoin on reload.
    try {
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash.startsWith("#tutor")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    } catch {
      /* ignore */
    }
  }, [phase]);

  const shareUrl = useMemo(() => {
    if (phase.kind !== "teacher") return "";
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}#${buildTutorHash(phase.handle.code)}`;
  }, [phase]);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // eslint-disable-next-line no-alert
        window.prompt("Copy this link:", shareUrl);
      }
    } catch (err) {
      log.warn("[tutor] clipboard copy failed", err);
    }
  }, [shareUrl]);

  const buttonLabel = (() => {
    if (phase.kind === "teacher") {
      const n = watchers ?? 0;
      return `🎓 ${n} watching`;
    }
    if (phase.kind === "student") return "🎓 student";
    return "🎓 tutor";
  })();

  const buttonAccent =
    phase.kind === "teacher"
      ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
      : phase.kind === "student"
        ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
        : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white";

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        title="Live tutoring — broadcast or join a class"
        className={
          buttonClassName ??
          `pointer-events-auto rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${buttonAccent}`
        }
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur"
        >
          {phase.kind === "idle" && (
            <IdleView
              available={healthAvailable}
              onStart={startTeaching}
              note={teacherError}
            />
          )}

          {phase.kind === "loading" && (
            <div className="font-mono text-xs text-white/70">
              starting session…
            </div>
          )}

          {phase.kind === "teacher" && (
            <TeacherView
              code={phase.handle.code}
              shareUrl={shareUrl}
              watchers={watchers}
              error={teacherError}
              caption={caption}
              onCaptionChange={setCaption}
              onCopy={copyShareUrl}
              onStop={stopSession}
            />
          )}

          {phase.kind === "student" && (
            <StudentView
              code={phase.handle.code}
              state={studentState}
              error={studentError}
              onLeave={stopSession}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-views                                                            */
/* ------------------------------------------------------------------ */

function IdleView({
  available,
  onStart,
  note,
}: {
  available: boolean | null;
  onStart: () => void;
  note: string | null;
}) {
  const disabled = available === false;
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        🎓 live tutoring
      </div>
      <p className="text-xs leading-snug text-white/70">
        Start a session and share the link with your class. Students see the
        teacher&apos;s view update in real time — camera, layers, overlays, all
        of it. Complements the offline curriculum + certificate workflow.
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className={`rounded-lg border px-3 py-2 font-mono text-xs uppercase tracking-widest transition ${
          disabled
            ? "border-white/5 bg-white/5 text-white/30"
            : "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25"
        }`}
      >
        Start a session
      </button>
      {disabled && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 px-2 py-1.5 font-mono text-[10px] leading-snug text-amber-200/80">
          Live tutoring isn&apos;t enabled on this deployment. Ask the operator
          to bind a KV namespace (TUTOR_KV).
        </div>
      )}
      {note && (
        <div className="rounded-md border border-rose-400/30 bg-rose-400/5 px-2 py-1.5 font-mono text-[10px] leading-snug text-rose-200/80">
          {note}
        </div>
      )}
    </div>
  );
}

function TeacherView({
  code,
  shareUrl,
  watchers,
  error,
  caption,
  onCaptionChange,
  onCopy,
  onStop,
}: {
  code: string;
  shareUrl: string;
  watchers: number | null;
  error: string | null;
  caption: string;
  onCaptionChange: (next: string) => void;
  onCopy: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
          🎓 broadcasting
        </div>
        <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-200">
          👁 {watchers ?? 0} watching
        </div>
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 p-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          session code
        </div>
        <div className="font-mono text-2xl tracking-[0.4em] text-white">
          {code}
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          share link
        </span>
        <input
          type="text"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-white/10 bg-space-950 px-2 py-1.5 font-mono text-[11px] text-white/80 focus:border-amber-400/50 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          caption (optional)
        </span>
        <input
          type="text"
          value={caption}
          maxLength={200}
          placeholder="Notice the Tarantula Nebula here…"
          onChange={(e) => onCaptionChange(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-space-950 px-2 py-1.5 text-xs text-white/85 placeholder-white/30 focus:border-amber-400/50 focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 transition hover:bg-white/10"
        >
          📋 copy link
        </button>
        <button
          type="button"
          onClick={onStop}
          className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-rose-200 transition hover:bg-rose-400/20"
        >
          stop
        </button>
      </div>
      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-400/5 px-2 py-1.5 font-mono text-[10px] leading-snug text-rose-200/80">
          {error}
        </div>
      )}
    </div>
  );
}

function StudentView({
  code,
  state,
  error,
  onLeave,
}: {
  code: string;
  state: TutorState | null;
  error: string | null;
  onLeave: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-200/80">
        🎓 student mode — camera follows teacher
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 p-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          session
        </div>
        <div className="font-mono text-lg tracking-[0.3em] text-white">
          {code}
        </div>
      </div>
      {state?.caption && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-xs leading-snug text-amber-100">
          {state.caption}
        </div>
      )}
      {state && (
        <div className="font-mono text-[10px] leading-snug text-white/50">
          mode: {state.mode}
          {state.focus ? ` · focus: ${state.focus}` : ""}
          {state.overlay ? ` · overlay: ${state.overlay}` : ""}
          {state.layers.length > 0
            ? ` · ${state.layers.length} layer${state.layers.length === 1 ? "" : "s"}`
            : ""}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-400/5 px-2 py-1.5 font-mono text-[10px] leading-snug text-rose-200/80">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={onLeave}
        className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 transition hover:bg-white/10"
      >
        Leave session
      </button>
    </div>
  );
}

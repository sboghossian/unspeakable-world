/**
 * Voice input — thin wrapper around the Web Speech API.
 *
 * The Web Speech API ships as `SpeechRecognition` on Chrome/Edge/Opera
 * (prefixed `webkitSpeechRecognition`) and on iOS/macOS Safari 14.1+
 * (also prefixed). Firefox does *not* ship it as of this writing. We
 * detect at runtime and expose `isSupported()` so the UI can disable the
 * mic button gracefully without crashing.
 *
 * Modes:
 *  - One-shot: click mic → record one utterance → onResult(finalText) → stop.
 *  - We use continuous=false + interimResults=true so the UI can show
 *    the partial transcript as it builds, but commit only on the final.
 *
 * Permissions are gated by the browser — we surface "denied" /
 * "not-allowed" errors verbatim through onError so the panel can render
 * a hint ("Allow microphone in browser settings").
 *
 * No external deps; everything here is `window.SpeechRecognition || window.webkitSpeechRecognition`.
 */

import { log } from "../../lib/logger";

/** Browser-side SpeechRecognition interface, redeclared minimally. */
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SREvent) => void) | null;
  onerror: ((ev: SRError) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SREvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    0: { transcript: string; confidence: number };
  }>;
};

type SRError = {
  error: string;
  message?: string;
};

type SRConstructor = new () => SR;

/** Vendor-prefixed constructor lookup; returns null when unsupported. */
function getSRCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSupported(): boolean {
  return getSRCtor() !== null;
}

export type VoiceState = "idle" | "listening" | "denied" | "unsupported";

export type VoiceEvent =
  | { kind: "state"; state: VoiceState }
  | { kind: "partial"; text: string }
  | { kind: "final"; text: string }
  | { kind: "error"; error: string; message: string };

type Listener = (ev: VoiceEvent) => void;

/**
 * Singleton-per-call controller — each `createVoiceInput()` returns its
 * own instance so the panel can hold onto it for the component lifetime.
 *
 * The instance owns at most one in-flight SpeechRecognition object. We
 * tear down and re-create on each `startListening()` because Chrome's
 * implementation refuses to restart a stopped instance reliably.
 */
export function createVoiceInput(): {
  startListening: (lang?: string) => void;
  stopListening: () => void;
  subscribe: (cb: Listener) => () => void;
  state: () => VoiceState;
} {
  let rec: SR | null = null;
  const listeners = new Set<Listener>();
  let currentState: VoiceState = isSupported() ? "idle" : "unsupported";

  const emit = (ev: VoiceEvent): void => {
    if (ev.kind === "state") currentState = ev.state;
    for (const cb of listeners) {
      try {
        cb(ev);
      } catch (err) {
        log.warn("[voice] listener threw", err);
      }
    }
  };

  const startListening = (lang = "en-US"): void => {
    const Ctor = getSRCtor();
    if (!Ctor) {
      emit({ kind: "state", state: "unsupported" });
      return;
    }
    // Tear down any prior instance.
    if (rec) {
      try {
        rec.abort();
      } catch {
        // ignore
      }
      rec = null;
    }
    const r = new Ctor();
    r.lang = lang;
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;

    let finalText = "";

    r.onstart = () => emit({ kind: "state", state: "listening" });
    r.onresult = (ev: SREvent) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) {
          finalText += alt.transcript;
        } else {
          interim += alt.transcript;
        }
      }
      if (interim) emit({ kind: "partial", text: (finalText + interim).trim() });
      else if (finalText) emit({ kind: "partial", text: finalText.trim() });
    };
    r.onerror = (ev: SRError) => {
      log.warn("[voice] error", ev.error, ev.message);
      const next: VoiceState =
        ev.error === "not-allowed" || ev.error === "service-not-allowed"
          ? "denied"
          : "idle";
      emit({
        kind: "error",
        error: ev.error,
        message: ev.message ?? humanError(ev.error),
      });
      emit({ kind: "state", state: next });
    };
    r.onend = () => {
      // Commit any captured final text. If the user said nothing, this
      // is the empty string — we still surface state=idle so the UI
      // returns to the resting mic.
      if (finalText.trim().length > 0) {
        emit({ kind: "final", text: finalText.trim() });
      }
      if (currentState !== "denied") {
        emit({ kind: "state", state: "idle" });
      }
      rec = null;
    };

    try {
      r.start();
      rec = r;
    } catch (err) {
      log.warn("[voice] start failed", err);
      emit({
        kind: "error",
        error: "start-failed",
        message: "Couldn't start listening. Try again.",
      });
      emit({ kind: "state", state: "idle" });
    }
  };

  const stopListening = (): void => {
    if (!rec) return;
    try {
      rec.stop();
    } catch (err) {
      log.warn("[voice] stop failed", err);
    }
  };

  const subscribe = (cb: Listener): (() => void) => {
    listeners.add(cb);
    // Push current state immediately so new subscribers don't miss it.
    cb({ kind: "state", state: currentState });
    return () => {
      listeners.delete(cb);
    };
  };

  return {
    startListening,
    stopListening,
    subscribe,
    state: () => currentState,
  };
}

function humanError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission denied. Allow it in your browser settings.";
    case "no-speech":
      return "Didn't catch that — try again.";
    case "audio-capture":
      return "No microphone detected on this device.";
    case "network":
      return "Speech service unreachable.";
    case "aborted":
      return "Listening was cancelled.";
    default:
      return `Voice error: ${code}`;
  }
}

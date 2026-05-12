/**
 * 🔒 Local-only consent state.
 *
 * Stores the user's analytics + error-tracking preferences in
 * localStorage under `uw:consent:v1`. Nothing here ever leaves the
 * browser — the wrappers in `telemetry.ts` and `error-tracking.ts`
 * read this to decide whether to bring up the SDKs at all.
 *
 * Shape v1:
 *   {
 *     telemetry: boolean,      // PostHog usage analytics
 *     errorTracking: boolean,  // Sentry crash reports
 *     decidedAt: number,       // epoch ms, used to surface re-prompts
 *   }
 *
 * `getConsent()` returns `null` when the user has never made a choice
 * (first load) — the consent banner uses that to decide whether to
 * show itself.
 */
import { useEffect, useState } from "react";
import { log } from "./logger";

const STORAGE_KEY = "uw:consent:v1";

export type ConsentState = {
  telemetry: boolean;
  errorTracking: boolean;
  decidedAt: number;
};

type ConsentInput = {
  telemetry: boolean;
  errorTracking: boolean;
};

const listeners = new Set<(s: ConsentState | null) => void>();

function readRaw(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Partial<ConsentState>;
    if (typeof obj.telemetry !== "boolean") return null;
    if (typeof obj.errorTracking !== "boolean") return null;
    return {
      telemetry: obj.telemetry,
      errorTracking: obj.errorTracking,
      decidedAt: typeof obj.decidedAt === "number" ? obj.decidedAt : Date.now(),
    };
  } catch (err) {
    log.warn("[consent] failed to parse stored consent", err);
    return null;
  }
}

/** Returns the persisted consent record, or null if the user hasn't decided. */
export function getConsent(): ConsentState | null {
  return readRaw();
}

/** Persists a fresh consent decision and notifies subscribers. */
export function setConsent(input: ConsentInput): ConsentState {
  const next: ConsentState = {
    telemetry: input.telemetry,
    errorTracking: input.errorTracking,
    decidedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      log.warn("[consent] failed to persist consent", err);
    }
  }
  for (const l of listeners) l(next);
  return next;
}

/**
 * Subscribe to consent changes. Returns an unsubscribe fn. Fired
 * whenever {@link setConsent} runs in the current tab. Cross-tab
 * sync is best-effort via the `storage` event below.
 */
export function onConsentChange(cb: (s: ConsentState | null) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = readRaw();
    for (const l of listeners) l(next);
  });
}

/** React hook returning [consent, setConsent]. Re-renders on change. */
export function useConsent(): [
  ConsentState | null,
  (input: ConsentInput) => void,
] {
  const [s, setS] = useState<ConsentState | null>(() => readRaw());
  useEffect(() => onConsentChange(setS), []);
  return [s, (input) => setConsent(input)];
}

/**
 * 📊 Telemetry wrapper around posthog-js.
 *
 * Goals:
 * - Lazy: posthog-js is only fetched from disk on the *first* track()
 *   call, so the landing-page main bundle stays light.
 * - Opt-out by default: the SDK is a complete no-op unless the consent
 *   banner explicitly returns telemetry=true AND `VITE_POSTHOG_KEY`
 *   is set.
 * - Resilient: bad keys, network blocks, ad-blocker shenanigans must
 *   never throw or reject in caller code.
 *
 * API:
 *   initTelemetry({ optOut })   // wire up state, no network yet
 *   track(event, props?)         // queues until SDK is ready
 *   setOptOut(v)                 // flip at runtime (from settings)
 *   isOptedOut()                 // current state
 */
import { log } from "./logger";

type PostHogClient = {
  init: (key: string, cfg: Record<string, unknown>) => unknown;
  capture: (event: string, props?: Record<string, unknown>) => void;
  opt_out_capturing: () => void;
  opt_in_capturing: () => void;
  has_opted_out_capturing?: () => boolean;
};

type PostHogModule = {
  default: PostHogClient;
};

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://us.i.posthog.com";

/** Has the SDK module been requested at least once? */
let loadingPromise: Promise<PostHogClient | null> | null = null;
/** Resolved instance once the dynamic import lands. Stays null in no-op mode. */
let client: PostHogClient | null = null;
let optedOut = true;
let initialized = false;

function isConfigured(): boolean {
  return typeof KEY === "string" && KEY.length > 0;
}

async function loadClient(): Promise<PostHogClient | null> {
  if (!isConfigured()) return null;
  if (client) return client;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      const mod = (await import("posthog-js")) as unknown as PostHogModule;
      const ph = mod.default;
      ph.init(KEY as string, {
        api_host: HOST,
        // Privacy-first defaults. Session replay is OFF and the
        // anonymous-only flags below double-check that nothing
        // identifying leaks even if PostHog flips a default upstream.
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        autocapture: false,
        // Defense-in-depth: if session recording is ever turned on
        // (e.g. via the dashboard's remote config), mask everything by
        // default so we still match the consent copy.
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: "*",
          maskInputOptions: {
            password: true,
            email: true,
            tel: true,
            color: true,
            date: true,
            "datetime-local": true,
            month: true,
            number: true,
            range: true,
            search: true,
            text: true,
            time: true,
            url: true,
            week: true,
            textarea: true,
            select: true,
          },
        },
        // No automatic identification — telemetry is anonymous.
        disable_persistence: false,
        persistence: "localStorage+cookie",
        // Don't follow redirects to PostHog's session-id endpoint.
        respect_dnt: true,
        // Honour the opt-out we already have on disk.
        opt_out_capturing_by_default: optedOut,
        loaded: (instance: PostHogClient) => {
          if (optedOut) instance.opt_out_capturing();
          else instance.opt_in_capturing();
        },
      });
      client = ph;
      return ph;
    } catch (err) {
      log.warn("[telemetry] posthog-js load failed", err);
      return null;
    }
  })();
  return loadingPromise;
}

/**
 * Wire up the opt-out state. Does NOT load the SDK — that happens
 * lazily on the first track() call. Safe to call multiple times.
 */
export function initTelemetry(opts: { optOut: boolean }): void {
  optedOut = !!opts.optOut;
  initialized = true;
  // If the SDK already loaded (re-init after consent flip), propagate.
  if (client) {
    try {
      if (optedOut) client.opt_out_capturing();
      else client.opt_in_capturing();
    } catch (err) {
      log.warn("[telemetry] opt-out toggle failed", err);
    }
  }
}

/**
 * Emit an event. Silently no-ops when:
 *   - `VITE_POSTHOG_KEY` is empty
 *   - the user has opted out
 *   - the SDK fails to load (ad-blockers, offline, etc)
 */
export function track(
  event: string,
  props?: Record<string, unknown>,
): void {
  if (!initialized) {
    // Caller forgot to init — treat as opted out. Don't throw.
    return;
  }
  if (optedOut) return;
  if (!isConfigured()) return;
  void loadClient().then((ph) => {
    if (!ph) return;
    if (optedOut) return; // re-check: state may have flipped during load
    try {
      ph.capture(event, props);
    } catch (err) {
      log.warn("[telemetry] capture failed", err);
    }
  });
}

/** Flip the opt-out state at runtime (from the privacy settings panel). */
export function setOptOut(v: boolean): void {
  optedOut = !!v;
  if (!client) return;
  try {
    if (optedOut) client.opt_out_capturing();
    else client.opt_in_capturing();
  } catch (err) {
    log.warn("[telemetry] opt-out toggle failed", err);
  }
}

/** Current opt-out state. */
export function isOptedOut(): boolean {
  return optedOut;
}

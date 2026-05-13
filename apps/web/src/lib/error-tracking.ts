/**
 * 🛟 Error tracking wrapper around @sentry/browser.
 *
 * Lazy-loaded on first signal so the landing bundle stays light. If
 * `VITE_SENTRY_DSN` is empty, every entry point is a no-op — no
 * network call, no SDK fetch, no throws.
 *
 * Auto-instruments:
 *   - window 'error' (synchronous errors)
 *   - window 'unhandledrejection' (promise rejections)
 *
 * Both are buffered on a tiny in-memory queue before init() resolves
 * so we don't drop the first failure of the session.
 *
 * Sample rates:
 *   - tracesSampleRate: 0 (we don't ship performance tracing)
 *   - replaysSessionSampleRate: 0 (consent copy says "crash reports
 *     only" — session replay is a separate privacy concern and we
 *     don't ask for it, so we don't collect it)
 *   - replaysOnErrorSampleRate: 0 (ditto)
 *
 * The replay integration is intentionally NOT loaded — the consent
 * banner only promises anonymous crash reports.
 */
import { log } from "./logger";

type SentryClient = {
  init: (cfg: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  addBreadcrumb: (b: Record<string, unknown>) => void;
  replayIntegration?: (cfg?: Record<string, unknown>) => unknown;
};

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const RELEASE =
  (import.meta.env.VITE_APP_VERSION as string | undefined) || "dev";

let client: SentryClient | null = null;
let loadingPromise: Promise<SentryClient | null> | null = null;
let started = false;

type QueuedError = {
  kind: "error";
  err: unknown;
  ctx?: Record<string, unknown>;
};
type QueuedCrumb = {
  kind: "crumb";
  msg: string;
  data?: Record<string, unknown>;
};
const queue: Array<QueuedError | QueuedCrumb> = [];
const MAX_QUEUE = 32;

function isConfigured(): boolean {
  return typeof DSN === "string" && DSN.length > 0;
}

async function loadClient(): Promise<SentryClient | null> {
  if (!isConfigured()) return null;
  if (client) return client;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    try {
      // Sentry's browser SDK ships ESM under the default export +
      // named exports; we hold the named-export object as our client.
      const sentry = (await import("@sentry/browser")) as unknown as SentryClient;
      // Replay intentionally disabled — the consent banner promises
      // "crash reports only" and session replay would record DOM mutations
      // beyond that scope. Keep the integration array empty.
      sentry.init({
        dsn: DSN,
        release: RELEASE,
        environment: import.meta.env.PROD ? "production" : "development",
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        integrations: [],
        // Strip personally-identifying request headers/queries by default.
        sendDefaultPii: false,
      });
      client = sentry;
      // Drain any signals that arrived before the SDK was ready.
      flushQueue();
      return sentry;
    } catch (err) {
      log.warn("[error-tracking] @sentry/browser load failed", err);
      return null;
    }
  })();
  return loadingPromise;
}

function flushQueue(): void {
  if (!client) return;
  for (const item of queue.splice(0)) {
    try {
      if (item.kind === "error") {
        client.captureException(item.err, item.ctx);
      } else {
        client.addBreadcrumb({ message: item.msg, data: item.data });
      }
    } catch (err) {
      log.warn("[error-tracking] flush failed", err);
    }
  }
}

function enqueue(item: QueuedError | QueuedCrumb): void {
  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push(item);
}

/**
 * Wire up the global error handlers and kick off the lazy SDK load.
 * Safe to call multiple times; only the first call attaches listeners.
 */
export function initErrorTracking(): void {
  if (started) return;
  started = true;
  if (!isConfigured()) return; // strict no-op when DSN is empty
  if (typeof window === "undefined") return;

  window.addEventListener("error", (e: ErrorEvent) => {
    captureException(e.error ?? new Error(e.message));
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    captureException(e.reason ?? new Error("unhandled rejection"));
  });

  // Kick off the dynamic import. Don't await — first signal triggers
  // the queue path if it lands before the SDK is ready.
  void loadClient();
}

/**
 * Report an exception. No-op when DSN is empty. Buffers up to
 * MAX_QUEUE entries before the SDK is loaded.
 */
export function captureException(
  err: unknown,
  ctx?: Record<string, unknown>,
): void {
  if (!isConfigured()) return;
  if (!client) {
    const entry: QueuedError = { kind: "error", err };
    if (ctx !== undefined) entry.ctx = ctx;
    enqueue(entry);
    void loadClient();
    return;
  }
  try {
    client.captureException(err, ctx);
  } catch (logErr) {
    log.warn("[error-tracking] captureException failed", logErr);
  }
}

/**
 * Drop a breadcrumb. Useful for narrating the user journey before a
 * crash ("opened settings", "toggled extra layer X"). No-op when DSN
 * is empty.
 */
export function addBreadcrumb(
  msg: string,
  data?: Record<string, unknown>,
): void {
  if (!isConfigured()) return;
  if (!client) {
    const entry: QueuedCrumb = { kind: "crumb", msg };
    if (data !== undefined) entry.data = data;
    enqueue(entry);
    return;
  }
  try {
    client.addBreadcrumb({ message: msg, data });
  } catch (err) {
    log.warn("[error-tracking] addBreadcrumb failed", err);
  }
}

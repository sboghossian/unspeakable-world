/**
 * 🛟 Canonical error-copy library.
 *
 * Every user-facing error message in the viewer should resolve to one of
 * these strings (or be added here when a new kind shows up). The tone
 * rules are documented in `docs/ERROR-COPY.md`:
 *
 *   - friendly, never accusatory
 *   - blame-shift toward the failing service / device, never toward the
 *     user
 *   - always offer a next action
 *
 * The function signature is intentionally narrow: callers pass the
 * `kind` (a coarse error category) plus an optional context bag for
 * `{service}` and `{retry}` substitutions, and the library returns a
 * ready-to-render `{ title, body, action? }` triple. We deliberately
 * don't include JSX here — that keeps this file framework-neutral so
 * the same copy can be used in landing-page banners or PWA install
 * toasts as easily as inside the viewer chrome.
 */

export type ErrorKind =
  | "network"
  | "permission"
  | "webgl"
  | "cors"
  | "rate-limit"
  | "missing-data"
  | "unknown";

export type ErrorCopy = {
  /** Short header. One line, sentence case. */
  title: string;
  /** Body. One or two sentences. Always ends with a "what's next" pivot. */
  body: string;
  /** Optional primary action. The label follows verb-first convention. */
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type ErrorCopyContext = {
  /** Specific upstream service name — "SIMBAD", "ALeRCE", "ATel". */
  service?: string;
  /** Specific permission — "camera", "microphone", "location", "motion". */
  permission?: string;
  /** Specific layer/feature label — "Multimessenger", "JWST live". */
  feature?: string;
  /** Caller-supplied retry handler. Wired into `action.onClick`. */
  retry?: () => void;
  /** Caller-supplied alternative action (e.g. switch to offline backend). */
  fallback?: { label: string; onClick: () => void };
};

/**
 * Build a `{ title, body, action }` triple for a given error kind. The
 * returned object is safe to render anywhere — no JSX, no imports.
 *
 * The `ctx.retry`/`ctx.fallback` callbacks are wired into the action
 * slot when present. If neither is provided we return only `title` +
 * `body` so the caller can render their own escape hatch.
 */
export function getCopy(kind: ErrorKind, ctx: ErrorCopyContext = {}): ErrorCopy {
  const service = ctx.service ?? "the service";
  const permission = ctx.permission ?? "this permission";
  const feature = ctx.feature ?? "this feature";

  switch (kind) {
    case "network":
      return withAction(
        {
          title: `We couldn't reach ${service} just now`,
          body: `${cap(service)} didn't respond — the sky's still here, and your data is safe. Try again in a moment.`,
        },
        ctx,
        "Try again",
      );
    case "permission":
      return withAction(
        {
          title: `${cap(permission)} permission was denied`,
          body: `${cap(feature)} needs ${permission} access to work. You can re-allow it from your browser settings — no data leaves your device.`,
        },
        ctx,
        "Re-check permission",
      );
    case "webgl":
      return withAction(
        {
          title: "WebGL2 isn't available on this device",
          body: "Your GPU appears blocked, or the browser shipped without WebGL2. The viewer can still load in WebGPU mode (experimental) or as a static gallery.",
        },
        ctx,
        "Try the WebGPU build",
      );
    case "cors":
      return withAction(
        {
          title: `${cap(service)} blocked the request`,
          body: `${cap(service)} doesn't allow direct browser access (CORS). We're working on a proxy — for now the rest of the viewer is unaffected.`,
        },
        ctx,
        "Open the upstream site",
      );
    case "rate-limit":
      return withAction(
        {
          title: `${cap(service)} is asking us to slow down`,
          body: `Too many requests in a short window. Give it a minute — we'll automatically resume when the limit clears.`,
        },
        ctx,
        "Retry in a minute",
      );
    case "missing-data":
      return withAction(
        {
          title: `No ${service} data for this region`,
          body: `Nothing was catalogued near this point. Try clicking closer to a bright object, or zoom in for a different field.`,
        },
        ctx,
        "Zoom in",
      );
    case "unknown":
    default:
      return withAction(
        {
          title: "Something went sideways",
          body: "The viewer fell back to a safe state. We've reported the error — your settings and bookmarks are untouched.",
        },
        ctx,
        "Try again",
      );
  }
}

function withAction(
  base: { title: string; body: string },
  ctx: ErrorCopyContext,
  defaultLabel: string,
): ErrorCopy {
  if (ctx.retry) {
    return {
      title: base.title,
      body: base.body,
      action: { label: defaultLabel, onClick: ctx.retry },
    };
  }
  if (ctx.fallback) {
    return {
      title: base.title,
      body: base.body,
      action: ctx.fallback,
    };
  }
  return { title: base.title, body: base.body };
}

function cap(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Heuristic that maps an arbitrary thrown value to an ErrorKind. Useful
 * for `.catch(err => ...)` paths that don't have a typed upstream.
 *
 * The matcher is intentionally permissive: anything that smells like a
 * fetch failure → "network", anything mentioning `DOMException` +
 * "denied" → "permission", anything with HTTP 429 → "rate-limit", etc.
 */
export function inferKind(err: unknown): ErrorKind {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (/(webgl|gl context|shader|compile)/i.test(msg)) return "webgl";
  if (lower.includes("denied") || lower.includes("notallowederror"))
    return "permission";
  if (/\b429\b|rate[- ]?limit/i.test(msg)) return "rate-limit";
  if (/\bcors\b|cross-origin|access-control/i.test(msg)) return "cors";
  if (/(failed to fetch|networkerror|load failed|typeerror|aborted)/i.test(msg))
    return "network";
  if (/not found|no rows|empty|missing/i.test(lower)) return "missing-data";
  return "unknown";
}

/**
 * 🔭 JWST live status — extra-layer entry.
 *
 * Renders a cyan reticle on the celestial sphere at the current JWST
 * target's RA/Dec, plus a "JWST: <target>" label below it. Data comes
 * from `functions/api/jwst-status.ts` (STScI Whereabouts proxy) with a
 * 30-minute cache.
 *
 * The handle also exposes `getApi()` so the top-bar badge
 * (`ui/JwstLiveBadge.tsx`) can read the current target without driving
 * a parallel feed.
 */

import type { Group } from "three";
import { JwstLiveField } from "./field";
import { subscribeJwstStatus, type JwstStatus } from "./feed";
import { log } from "../../lib/logger";

export const LAYER_META = {
  id: "jwst-live",
  label: "JWST live pointing",
  icon: "🔭",
  attribution:
    "STScI · NASA JWST Whereabouts · public data (NASA-funded research)",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Live reticle at the James Webb Space Telescope's current target, parsed from the STScI weekly observation plan. Refreshed every 30 minutes.",
} as const;

export type LayerMode = "sky" | "solar";

export type JwstLiveApi = {
  /** Current JWST status, or null if we don't know yet. */
  getStatus(): JwstStatus | null;
  /** Subscribe to status updates; unsubscribe on returned thunk. */
  subscribe(cb: (s: JwstStatus | null) => void): () => void;
};

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setTime?(ms: number): void;
  getApi(): JwstLiveApi;
  dispose(): void;
};

export type MountOpts = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new JwstLiveField();
  opts.parent.add(field.group);

  let mode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let disposed = false;
  let status: JwstStatus | null = null;
  const subscribers = new Set<(s: JwstStatus | null) => void>();

  const applyVisibility = (): void => {
    field.setVisible(enabled && mode === "sky" && hasTarget());
  };

  const hasTarget = (): boolean => {
    const cur = status?.current ?? status?.next ?? null;
    return !!(
      cur &&
      typeof cur.raDeg === "number" &&
      typeof cur.decDeg === "number"
    );
  };

  const applyData = (): void => {
    const cur = status?.current ?? status?.next ?? null;
    if (
      cur &&
      typeof cur.raDeg === "number" &&
      typeof cur.decDeg === "number"
    ) {
      field.setData({
        raDeg: cur.raDeg,
        decDeg: cur.decDeg,
        label: `JWST: ${prettyTarget(cur.target)}`,
      });
    } else {
      field.setData(null);
    }
    applyVisibility();
  };

  // Subscribe to feed; this fires immediately with the cached value (if
  // any) then again every 30 minutes.
  const unsubscribeFeed = subscribeJwstStatus((s) => {
    if (disposed) return;
    status = s;
    applyData();
    subscribers.forEach((fn) => {
      try {
        fn(s);
      } catch (err) {
        log.warn("[jwst-live] subscriber threw", err);
      }
    });
  });

  applyVisibility();

  return {
    setEnabled(v: boolean): void {
      if (disposed) return;
      enabled = v;
      applyVisibility();
    },
    setMode(m: LayerMode): void {
      if (disposed) return;
      mode = m;
      applyVisibility();
    },
    setTime(_ms: number): void {
      /* live ephemeris is anchored to wall-clock time */
    },
    getApi(): JwstLiveApi {
      return {
        getStatus: () => status,
        subscribe(cb) {
          subscribers.add(cb);
          // Fire once with the current snapshot so late subscribers
          // don't wait 30 min for a redraw.
          try {
            cb(status);
          } catch (err) {
            log.warn("[jwst-live] subscriber threw on init", err);
          }
          return () => {
            subscribers.delete(cb);
          };
        },
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribeFeed();
      subscribers.clear();
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

function prettyTarget(raw: string): string {
  if (!raw) return "unknown";
  return raw.replace(/-+/g, " ").trim();
}

export { fetchJwstStatus, subscribeJwstStatus } from "./feed";
export type { JwstStatus, JwstScheduleRow } from "./feed";

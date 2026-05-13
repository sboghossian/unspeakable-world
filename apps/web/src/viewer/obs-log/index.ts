/**
 * 📒 Personal observation log — extra-layer entry.
 *
 * Renders the user's saved observations as yellow ✦ markers on the
 * celestial sphere (sky mode only). Data is owned by `store.ts` and
 * lives entirely in localStorage — no accounts, no upload, no sync.
 *
 * The layer's host API exposes a tiny API that the panel uses to drive
 * the field directly (refresh after add/edit, click-to-focus on a
 * specific marker).
 */

import type { Group } from "three";
import { ObsLogField } from "./field";
import {
  listObservations,
  subscribe as subscribeStore,
  type Observation,
} from "./store";

export const LAYER_META = {
  id: "obs-log",
  label: "My observation log",
  icon: "📒",
  attribution: "Local-only · stored in your browser · not sent anywhere",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Your personal logbook: telescope, target, date, notes — plotted on the sky as ✦ markers. Saved in localStorage only; export via JSON or CSV.",
} as const;

export type LayerMode = "sky" | "solar";

export type ObsLogApi = {
  /** Current snapshot of saved observations. */
  list(): ReadonlyArray<Observation>;
  /** Subscribe to log updates. Fires immediately. */
  subscribe(cb: (list: ReadonlyArray<Observation>) => void): () => void;
  /** Resolve the marker nearest a given celestial point (degrees). */
  findNearest(
    raDeg: number,
    decDeg: number,
    maxDeg?: number,
  ): Observation | null;
};

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setTime?(ms: number): void;
  getApi(): ObsLogApi;
  dispose(): void;
};

export type MountOpts = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new ObsLogField();
  opts.parent.add(field.group);

  let mode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let disposed = false;

  const applyVisibility = (): void => {
    field.setVisible(enabled && mode === "sky");
  };

  // Initial data + live subscription so add/edit/delete from the panel
  // flows back into the field automatically.
  const unsubscribe = subscribeStore((list) => {
    if (disposed) return;
    field.setData(list);
  });

  applyVisibility();

  let raf = 0;
  const tick = (): void => {
    if (disposed) return;
    if (field.group.visible) field.update();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

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
      /* observations are timestamped on creation; no time-machine logic */
    },
    getApi(): ObsLogApi {
      return {
        list: () => listObservations(),
        subscribe: subscribeStore,
        findNearest: (raDeg, decDeg, maxDeg = 1.5) =>
          field.findNearest(raDeg, decDeg, maxDeg),
      };
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      cancelAnimationFrame(raf);
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

export type { Observation } from "./store";

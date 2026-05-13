/**
 * spice — federation module rendering pre-baked spacecraft trajectories
 * in heliocentric coordinates.
 *
 * This is a SCAFFOLD. The renderer and loader are wired end-to-end but
 * the data file (`apps/web/public/data/spice-trajectories.json`) does
 * NOT exist yet — it needs to be produced by running:
 *
 *     pnpm --filter @unspeakable/web bake:spice
 *
 * (see `scripts/bake-spice.ts`). Until then the layer is enabled-but-
 * empty: turning it on is a no-op, no errors, no visible content.
 *
 * v1 covers five probes: Voyager 1/2, New Horizons, Parker Solar Probe,
 * and JWST. Phase 2 expansion to every probe ever flown requires either
 * a WASM SPICE wrapper or scripted Horizons fetches for ~80 more SPK
 * IDs — see README.md for the upgrade path.
 */
import type { Group } from "three";
import { SpiceTrajectoryField } from "./field";
import { loadTrajectories } from "./trajectory-loader";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "spice-trajectories",
  label: "Spacecraft trajectories (SPICE)",
  icon: "🛰️",
  attribution:
    "NASA JPL Horizons (public domain). Baked daily-resolution heliocentric trajectories.",
  modes: ["solar"] as const,
  defaultEnabled: false,
  description:
    "Heliocentric trajectories for Voyager 1/2, New Horizons, Parker Solar Probe, and JWST. Daily-resolution polylines baked from JPL Horizons.",
  synthetic: false,
} as const;

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  dispose(): void;
};

export function mountLayer(opts: MountOptions): MountedLayer {
  const field = new SpiceTrajectoryField();
  opts.parent.add(field.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let loaded = false;
  let cancelled = false;

  const isModeSupported = (m: LayerMode): boolean => m === "solar";

  const applyVisibility = (): void => {
    field.setVisible(enabled && isModeSupported(currentMode) && loaded);
  };

  const load = async (): Promise<void> => {
    const bundle = await loadTrajectories();
    if (cancelled) return;
    if (bundle) {
      field.setTrajectories(bundle.probes);
      loaded = true;
    }
    applyVisibility();
  };

  void load();
  applyVisibility();

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      applyVisibility();
    },
    setMode(m: LayerMode): void {
      currentMode = m;
      applyVisibility();
    },
    dispose(): void {
      cancelled = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

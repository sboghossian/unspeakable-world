/**
 * Exoplanets layer — public entry point.
 *
 * Exposes the standard LAYER_META + mountLayer factory the host viewer
 * uses to wire this module into a Three.js scene without reaching
 * inside the renderer.
 *
 * Data sources (both MIT-compatible):
 *   - NASA Exoplanet Archive PSCompPars (public domain, IPAC/Caltech)
 *     → bake script: scripts/bake-exoplanets-full.ts
 *     → asset:       public/data/exoplanets-full.json (~1.1 MB / 6.3K rows)
 *   - PHL @ UPR Arecibo Habitable Worlds Catalog (CC-BY 4.0)
 *     → bake script: scripts/bake-phl-hwc.ts
 *     → asset:       public/data/phl-hwc.json
 *
 * Note: the existing slim `exoplanets.json` is still loaded by
 * `viewer/scene/scene.ts` directly via `new ExoplanetField()`; this
 * module is the *new* layer wrapper that ships the full dataset.
 */

import type { Group } from "three";
import { ExoplanetField, type ExoplanetColorMode } from "./exoplanet-field";
import { log } from "../../lib/logger";

export const LAYER_META = {
  id: "exoplanets-full",
  label: "Exoplanets (NASA full)",
  icon: "🪐",
  attribution:
    "NASA Exoplanet Archive · IPAC/Caltech · public domain · habitability via PHL @ UPR Arecibo (CC-BY)",
  modes: ["sky", "galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "All 5,800+ confirmed exoplanets with optional habitability colouring.",
};

export type LayerMode = "sky" | "galactic" | "universe";

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setColorMode?(c: ExoplanetColorMode): void;
  setTime?(ms: number): void;
  dispose(): void;
};

export type MountOpts = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
  /**
   * Override catalogue source. Defaults to the baked
   * `/data/exoplanets-full.json`. Pass the slim `/data/exoplanets.json`
   * for the legacy dataset.
   */
  catalogueUrl?: string;
  /**
   * Override habitability source. Defaults to `/data/phl-hwc.json`.
   * Pass `null` to skip the PHL fetch entirely.
   */
  habitabilityUrl?: string | null;
};

/**
 * Build an ExoplanetField, attach to `parent`, and return a small
 * handle the caller drives. Loading happens lazily on first enable so
 * disabled-by-default doesn't pay the network cost.
 */
export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new ExoplanetField();
  if (opts.habitabilityUrl !== undefined) {
    field.setHabitabilitySource(opts.habitabilityUrl);
  }
  opts.parent.add(field.group);
  field.setVisible(opts.enabled);

  const url = opts.catalogueUrl ?? "/data/exoplanets-full.json";

  let loaded = false;
  let disposed = false;

  const ensureLoaded = (): void => {
    if (loaded || disposed) return;
    loaded = true;
    field.load(url).catch((err: unknown) => {
      log.warn("[exoplanets]", "load failed", err);
    });
  };

  if (opts.enabled) ensureLoaded();

  return {
    setEnabled(v: boolean): void {
      if (disposed) return;
      field.setVisible(v);
      if (v) ensureLoaded();
    },
    setMode(_m: LayerMode): void {
      // The exoplanet field is mode-agnostic — same celestial-sphere
      // geometry serves sky, galactic, and universe. Hosts that need
      // to hide it in a given mode should call setEnabled(false).
    },
    setColorMode(c: ExoplanetColorMode): void {
      if (disposed) return;
      field.setColorMode(c);
    },
    setTime(_ms: number): void {
      // Static catalogue — host star proper motion is sub-pixel over
      // human timescales, same trade-off as Gaia DR3.
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

export {
  ExoplanetField,
  type ExoplanetColorMode,
  type ExoplanetEntry,
} from "./exoplanet-field";
export {
  loadHabitability,
  lookup as lookupHabitability,
  esiToRgb,
  type HabitabilityRecord,
  type HabitabilityIndex,
} from "./habitability";

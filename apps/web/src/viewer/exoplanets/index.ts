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
 *     → assets:
 *         public/data/exoplanets.json       (slim, ~200 KB, default)
 *         public/data/exoplanets-full.json  (full, ~1.1 MB / 6.3K rows)
 *   - PHL @ UPR Arecibo Habitable Worlds Catalog (CC-BY 4.0)
 *     → bake script: scripts/bake-phl-hwc.ts
 *     → asset:       public/data/phl-hwc.json
 *
 * Bandwidth strategy: we default to the slim `exoplanets.json` so the
 * cold-start cost of enabling this layer is ~200 KB instead of ~1.1 MB.
 * The full catalogue (with stellar/host-system fields needed for ESI
 * scoring) is only fetched when the user picks the `habitability`
 * color mode — see `setColorMode` below. The slim file still has
 * enough columns to render points and basic labels; it's missing
 * only the host-star physical params that habitability needs.
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
   * Override catalogue source. Defaults to the slim
   * `/data/exoplanets.json` (~200 KB). The full
   * `/data/exoplanets-full.json` (~1.1 MB) is fetched lazily when the
   * user switches to the `habitability` color mode.
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

  // Default to the slim catalogue (~200 KB). The full catalogue
  // (~1.1 MB) is only loaded lazily if the caller flips into the
  // habitability color mode, since that's the only feature that needs
  // the full host-star physical params.
  const SLIM_URL = "/data/exoplanets.json";
  const FULL_URL = "/data/exoplanets-full.json";
  let url = opts.catalogueUrl ?? SLIM_URL;

  let loaded = false;
  let disposed = false;
  /** Track whether we've upgraded from slim → full. The upgrade is
   *  irreversible for a given mount; switching back to non-habitability
   *  modes keeps the richer data on hand. */
  let loadedFull = url === FULL_URL || opts.catalogueUrl !== undefined;

  const ensureLoaded = (): void => {
    if (loaded || disposed) return;
    loaded = true;
    field.load(url).catch((err: unknown) => {
      log.warn("[exoplanets]", "load failed", err);
    });
  };

  /** Switch to the full catalogue. Idempotent. Called only when the
   *  user picks a habitability-flavoured color mode — the slim
   *  catalogue lacks the host-star fields ESI scoring needs. */
  const upgradeToFull = (): void => {
    if (disposed || loadedFull) return;
    loadedFull = true;
    url = FULL_URL;
    field.load(FULL_URL).catch((err: unknown) => {
      log.warn("[exoplanets]", "full load failed", err);
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
      // Habitability colouring requires fields only present in the
      // full catalogue; upgrade transparently before applying the
      // mode so the field has data to score against.
      if (c === "habitability") upgradeToFull();
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

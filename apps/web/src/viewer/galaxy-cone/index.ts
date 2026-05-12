/**
 * galaxy-cone — public entry point for the 2MRS+6dFGS 3D galaxy
 * distribution layer.
 *
 * The host viewer calls `mountLayer({ parent, mode, enabled })` and
 * receives a small handle. Everything else stays inside this module
 * (data fetch, geometry build, named-structure overlay, hover state).
 *
 * Data licence: 2MRS (Huchra/Macri/Masters 2012, ApJS 199:26) and
 * 6dFGS DR3 (Jones et al. 2009 MNRAS) are publicly redistributable
 * with attribution; the binary catalog at `public/data/galaxy-cone.bin`
 * is produced by `scripts/bake-galaxy-cone.ts`.
 */

import type { Group } from "three";
import { GalaxyField, type GalaxyFieldMode } from "./galaxy-field";
import { DEFAULT_CATALOG_URL, loadGalaxyCatalog } from "./loader";
import { log } from "../../lib/logger";

/** Layer metadata consumed by the layer-registry / Explore drawer. */
export const LAYER_META = {
  id: "galaxy-cone",
  label: "Galaxy cone (2MRS+6dFGS)",
  icon: "◌",
  attribution:
    "2MRS · Huchra et al. 2012 · 6dFGS · Jones et al. 2009 · CC-BY",
  modes: ["galactic", "universe"] as const,
  defaultEnabled: false,
  description: "~80K nearby galaxies in 3D, out to z≈0.1.",
};

export type LayerMode = (typeof LAYER_META.modes)[number];

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setTime?(ms: number): void;
  dispose(): void;
};

export type MountOpts = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
  /** Override the catalog URL (test / mock data). */
  url?: string;
};

/**
 * Build a GalaxyField, attach to `parent`, lazy-load the binary on first
 * enable, and return a handle. Errors during load are surfaced via the
 * shared `log.warn` channel — the layer stays mounted but empty so the
 * UI can offer a retry later without dispose/remount.
 */
export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new GalaxyField();
  field.setMode(toFieldMode(opts.mode));
  opts.parent.add(field.group);
  field.setVisible(opts.enabled);

  let loaded = false;
  let loading = false;
  let disposed = false;
  const ac = new AbortController();

  const ensureLoaded = (): void => {
    if (loaded || loading || disposed) return;
    loading = true;
    const url = opts.url ?? DEFAULT_CATALOG_URL;
    loadGalaxyCatalog(url, ac.signal)
      .then((cat) => {
        if (disposed) return;
        field.build(cat);
        loaded = true;
        log.info(
          "[galaxy-cone]",
          `loaded ${cat.count.toLocaleString()} galaxies from ${url}`,
        );
      })
      .catch((err: unknown) => {
        if (disposed) return;
        log.warn("[galaxy-cone]", "catalog load failed", err);
      })
      .finally(() => {
        loading = false;
      });
  };

  if (opts.enabled) ensureLoaded();

  return {
    setEnabled(v: boolean): void {
      if (disposed) return;
      field.setVisible(v);
      if (v) ensureLoaded();
    },
    setMode(m: LayerMode): void {
      if (disposed) return;
      field.setMode(toFieldMode(m));
    },
    setTime(_ms: number): void {
      // 2MRS/6dFGS positions are heliocentric J2000 — recession
      // velocities don't precess on year/decade timescales. No-op.
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      ac.abort();
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

/** Narrow the public mode union down to the field's internal type. */
function toFieldMode(m: LayerMode): GalaxyFieldMode {
  // Both members of LayerMode currently overlap with GalaxyFieldMode,
  // but we keep the explicit conversion so that if the public union
  // ever broadens (e.g. adds "sky"), the type system forces a
  // decision here instead of silently passing through.
  return m;
}

export { GalaxyField } from "./galaxy-field";
export { STRUCTURES, type Structure } from "./structures";
export { loadGalaxyCatalog, type GalaxyCatalog, type GalaxyRow } from "./loader";

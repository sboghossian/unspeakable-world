/**
 * Gaia DR3 stars layer — public entry point.
 *
 * Exports the layer metadata + `mountLayer` factory the host viewer
 * uses to wire this module into the scene without reaching inside.
 *
 * Source: ESA Gaia Data Release 3 (CC-BY 4.0), filtered to G < 11.
 * MIT-licensed glue code is in this directory; the data file
 * `gaia-1m.bin` / `gaia-100k.bin` lives at `public/data/`.
 */

import type { Group } from "three";
import { GaiaField } from "./gaia-field";
import { resolveGaiaSource } from "./loader";
import { log } from "../../lib/logger";
import { getActivePreset } from "../../lib/quality";

export const LAYER_META = {
  id: "gaia-stars",
  label: "Gaia DR3 (1M stars)",
  icon: "✦",
  attribution: "Gaia DR3 · ESA · CC-BY 4.0",
  modes: ["sky", "galactic", "universe"] as const,
  defaultEnabled: false,
  description: "1M parallax-derived stars from Gaia Data Release 3.",
};

export type LayerMode = "sky" | "galactic" | "universe";

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
  /** Override LOD bucket. Falls back to "auto" (full file). */
  density?: 100_000 | 500_000 | 1_000_000;
};

/**
 * Build a GaiaField, attach to `parent` group, and return a small
 * handle the caller drives. Loading happens lazily on first enable
 * so disabled-by-default doesn't pay the network cost.
 */
export function mountLayer(opts: MountOpts): LayerHandle {
  // Caller-supplied density wins; otherwise fall back to whichever bucket
  // the active quality preset asks for. Hard upper bound is 1M (file size).
  const density = opts.density ?? getActivePreset().gaiaDensityBucket;
  const field = new GaiaField({ density });
  field.setMode(opts.mode);
  opts.parent.add(field.group);
  field.group.visible = opts.enabled;

  let loaded = false;
  let disposed = false;

  const ensureLoaded = (): void => {
    if (loaded || disposed) return;
    loaded = true;
    const { url } = resolveGaiaSource();
    field.load(url).catch((err: unknown) => {
      log.warn("[gaia-stars]", "load failed", err);
    });
  };

  if (opts.enabled) ensureLoaded();

  return {
    setEnabled(v: boolean): void {
      if (disposed) return;
      field.group.visible = v;
      if (v) ensureLoaded();
    },
    setMode(m: LayerMode): void {
      if (disposed) return;
      field.setMode(m);
    },
    setTime(_ms: number): void {
      // Gaia positions are J2016.0; proper motion is < 1 px for the
      // far majority of stars over a human lifespan. We accept the
      // ~10-year drift instead of paying for pm * dt every frame.
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

export { GaiaField } from "./gaia-field";

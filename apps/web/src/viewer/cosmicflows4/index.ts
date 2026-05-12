/**
 * 🌊 cosmicflows4 — federation module.
 *
 * Per-galaxy peculiar-velocity arrow field upgrade to the existing
 * curated `cosmicflows/` streamlines. Visible in `galactic` and
 * `universe` modes (the large-scale-structure scenes).
 *
 * Data file: /data/cosmicflows4.json — baked by
 * `scripts/bake-cosmicflows4.ts`.
 *
 * Attribution: "Tully+ 2023 — Cosmicflows-4 (open with citation)".
 */
import type { Group } from "three";
import { log } from "../../lib/logger";
import { parseCf4Json } from "./cf4-data";
import { CF4FlowField } from "./cf4-field";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "cosmicflows4",
  label: "Cosmicflows-4 vectors",
  icon: "🌊",
  attribution:
    "Tully et al. 2023 — Cosmicflows-4 (open, please cite ApJ 944 94)",
  modes: ["galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "~10 000 nearby galaxies plotted with their measured peculiar-velocity vectors in the supergalactic frame.",
} as const;

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
  /** Anchor for the Local Group in world LY. Defaults to (0,0,0). */
  anchorLY?: { x: number; y: number; z: number };
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  dispose(): void;
};

export function mountLayer(opts: MountOptions): MountedLayer {
  const anchor = opts.anchorLY ?? { x: 0, y: 0, z: 0 };
  const field = new CF4FlowField(anchor);
  opts.parent.add(field.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let loaded = false;
  let cancelled = false;

  const isModeSupported = (m: LayerMode): boolean =>
    m === "galactic" || m === "universe";

  const applyVisibility = (): void => {
    field.setVisible(enabled && isModeSupported(currentMode) && loaded);
  };

  const load = async (): Promise<void> => {
    try {
      const res = await fetch("/data/cosmicflows4.json");
      if (!res.ok) {
        log.warn("[cosmicflows4]", "fetch HTTP", res.status);
        return;
      }
      const raw: unknown = await res.json();
      const parsed = parseCf4Json(raw);
      if (!parsed) {
        log.warn("[cosmicflows4]", "invalid JSON shape");
        return;
      }
      if (cancelled) return;
      field.build(parsed.galaxies);
      loaded = true;
      applyVisibility();
    } catch (err) {
      log.warn("[cosmicflows4]", "load failed", err);
    }
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

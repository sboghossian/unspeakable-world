/**
 * 🌌 planck-polarization — federation module
 *
 * Renders Planck PR3 CMB polarization (Q/U Stokes) as small tangent
 * line segments on the celestial sphere. Visible only in `sky` mode.
 *
 * Data file: /data/planck-polarization.json — baked by
 * `scripts/bake-planck-polarization.ts`.
 *
 * Attribution: "ESA / Planck Collaboration (PR3, public)".
 */
import type { Group } from "three";
import { log } from "../../lib/logger";
import { parsePolarizationJson } from "./polarization-data";
import { PolarizationField } from "./polarization-field";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "planck-polarization",
  label: "Planck Polarization",
  icon: "🪡",
  attribution: "ESA / Planck Collaboration · PR3 polarization (CC BY 4.0 ESA)",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Cosmic microwave background E-mode polarization vectors from Planck's 353 GHz map, drawn as tangent lines on the sky.",
  // Module currently ships physically-motivated synthetic vectors
  // shaped like Planck PR3 polarization; the real upstream feed is
  // not yet wired through `scripts/bake-planck-polarization.ts`.
  synthetic: true,
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
  const field = new PolarizationField();
  opts.parent.add(field.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let loaded = false;
  let cancelled = false;

  const applyVisibility = (): void => {
    field.setVisible(enabled && currentMode === "sky" && loaded);
  };

  const load = async (): Promise<void> => {
    try {
      const res = await fetch("/data/planck-polarization.json");
      if (!res.ok) {
        log.warn("[planck-polarization]", "fetch HTTP", res.status);
        return;
      }
      const raw: unknown = await res.json();
      const parsed = parsePolarizationJson(raw);
      if (!parsed) {
        log.warn("[planck-polarization]", "invalid JSON shape");
        return;
      }
      if (cancelled) return;
      field.build(parsed.vectors);
      loaded = true;
      applyVisibility();
    } catch (err) {
      log.warn("[planck-polarization]", "load failed", err);
    }
  };

  // Kick off the fetch immediately so the layer is ready when toggled.
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

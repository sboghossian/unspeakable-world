/**
 * 🕸 cosmic-web — federation module.
 *
 * Renders 10-15 named cosmic-web superstructures (Local Group, Local
 * Sheet, Virgo Supercluster, Laniakea + Great Attractor, Pisces-Cetus
 * SCC, Shapley Concentration, CfA2 Great Wall, Sloan Great Wall,
 * Hercules-Corona Borealis, and the Local + Boötes + KBC voids) as
 * labelled 3D particle clouds in the supergalactic frame.
 *
 * Coexists with `galaxy-cone` (~80K real catalogue galaxies) and
 * `cosmicflows4` (velocity arrows) — this layer does NOT replicate
 * those datasets. It exists so the user can toggle on a navigation
 * overlay: "here is Laniakea, and at its centre, the Great Attractor
 * pulling on us all."
 *
 * Attribution: Tully+ 2014 (Laniakea), Pomarède+ 2017 (V-PCSC),
 * Geller & Huchra 1989 (CfA2 Great Wall), Gott+ 2005 (Sloan Great
 * Wall), and other sources cited per-structure in `structures.ts`.
 */

import type { Group } from "three";
import { Vector3 } from "three";
import { CosmicWebField, type FieldMode } from "./cosmic-web-field";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "cosmic-web",
  label: "Cosmic web structures",
  icon: "🕸",
  attribution: "Tully+ 2014 (Laniakea), Pomarède+ 2017 · CC-BY",
  modes: ["galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "10-15 named superstructures rendered as labeled 3D particle clouds — Laniakea, Great Attractor, Shapley, CfA2 Great Wall, Bootes Void, and more. Distances and core bodies cited from published catalogs.",
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
  /** Optional per-frame camera hook used by the host scene to drive
   *  the scale-tier fade. Safe to call from a RAF loop. */
  updateForCamera?(cameraWorld: Vector3): void;
};

export function mountLayer(opts: MountOptions): MountedLayer {
  const field = new CosmicWebField();
  // Synchronous build — particle cloud generation is purely numerical
  // and runs in well under 50 ms for ~50K particles on a modern laptop.
  field.build();
  field.setMode(toFieldMode(opts.mode));
  opts.parent.add(field.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;

  const isModeSupported = (m: LayerMode): boolean =>
    m === "galactic" || m === "universe";

  const applyVisibility = (): void => {
    field.setVisible(enabled && isModeSupported(currentMode));
  };

  applyVisibility();

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      applyVisibility();
    },
    setMode(m: LayerMode): void {
      currentMode = m;
      if (isModeSupported(m)) field.setMode(toFieldMode(m));
      applyVisibility();
    },
    updateForCamera(cameraWorld: Vector3): void {
      field.updateForCamera(cameraWorld);
    },
    dispose(): void {
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

function toFieldMode(m: LayerMode): FieldMode {
  return m === "galactic" ? "galactic" : "universe";
}

export { CosmicWebField } from "./cosmic-web-field";
export { COSMIC_STRUCTURES, type CosmicStructure } from "./structures";

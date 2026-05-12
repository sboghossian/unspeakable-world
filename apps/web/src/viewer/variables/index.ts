import type { Group } from "three";
import { log } from "../../lib/logger";
import { loadToi, loadVsx } from "./loader";
import { ToiField } from "./toi-field";
import { VariablesField } from "./variables-field";

/**
 * Public entry point for the variable-star overlay.
 *
 * Two related catalogs are mounted side-by-side under one logical layer:
 *
 *   • AAVSO / VSX bright variables — pulsating dots, color-coded by type
 *     (Cepheid, δ-Scuti, Mira, eclipsing binary, …).
 *   • NASA TESS TOI planet candidates — target reticle markers,
 *     color-coded by TFOPWG disposition (CP / KP / PC / FP / …).
 *
 * Both render against the celestial sphere in Sky mode and as faint 3D
 * points on the same unit sphere in Galactic/Universe modes (no parallax
 * available for the bulk of these targets).
 */

const VSX_URL = "/data/vsx-bright.json";
const TOI_URL = "/data/tess-toi.json";

export const LAYER_META = {
  id: "variables",
  label: "Variables & TOIs",
  icon: "wave",
  attribution:
    "AAVSO International Variable Star Index (VSX, CC BY 4.0) and NASA Exoplanet Archive TESS TOI (public domain)",
  modes: ["sky", "galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "Bright variable stars from the AAVSO VSX (Cepheids, Mira, δ-Scuti, eclipsing binaries, …) and TESS Objects of Interest planet candidates. Pulsating circles and small target reticles.",
} as const;

export type LayerMode = (typeof LAYER_META.modes)[number];

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setTime?(ms: number): void;
  dispose(): void;
};

export function mountLayer(opts: {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
}): LayerHandle {
  const variables = new VariablesField();
  const toi = new ToiField();
  opts.parent.add(variables.group);
  opts.parent.add(toi.group);
  variables.setMode(opts.mode);
  toi.setMode(opts.mode);
  variables.setVisible(opts.enabled);
  toi.setVisible(opts.enabled);

  let disposed = false;

  void Promise.all([loadVsx(VSX_URL), loadToi(TOI_URL)]).then(
    ([vsxItems, toiItems]) => {
      if (disposed) return;
      variables.setData(vsxItems);
      toi.setData(toiItems);
      log.info(
        "[variables]",
        `loaded ${vsxItems.length} VSX + ${toiItems.length} TOI (${LAYER_META.attribution})`,
      );
    },
  );

  return {
    setEnabled(v: boolean): void {
      variables.setVisible(v);
      toi.setVisible(v);
    },
    setMode(m: LayerMode): void {
      variables.setMode(m);
      toi.setMode(m);
    },
    setTime(ms: number): void {
      variables.setTime(ms);
    },
    dispose(): void {
      disposed = true;
      opts.parent.remove(variables.group);
      opts.parent.remove(toi.group);
      variables.dispose();
      toi.dispose();
    },
  };
}

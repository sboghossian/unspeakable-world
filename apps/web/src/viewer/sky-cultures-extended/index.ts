/**
 * 🌐 sky-cultures-extended — federation module.
 *
 * Twelve non-Western sky cultures from the Stellarium project, additive
 * to the existing `viewer/constellations/` module (Western, Chinese,
 * Polynesian, Lakota). Sky-mode only.
 *
 * Cultures shipped: Arab, Inuit, Egyptian, Maya, Boorong, Norse, Maori,
 * Japanese, Korean, Sami, Tongan, Tukano.
 *
 * Data: bundled inline (curated, ~12 cultures × ~5 figures each — under
 * 30 KB after tree-shake). Optionally a JSON dump is produced by
 * `scripts/bake-sky-cultures-extended.ts` for offline use.
 *
 * License: lines + names are CC BY-SA 4.0 from
 * https://github.com/Stellarium/stellarium-skycultures — attribution
 * is shown on every culture and surfaced via `LAYER_META.attribution`.
 */
import type { Group } from "three";
import {
  EXTENDED_CULTURE_LIST,
  EXTENDED_SKY_CULTURES,
  type ExtendedSkyCultureId,
} from "./cultures-data";
import { ExtendedSkyCulturesRenderer } from "./cultures-renderer";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "sky-cultures-extended",
  label: "Sky Cultures (extended)",
  icon: "🌐",
  attribution:
    "Stellarium sky-cultures (cultural data CC BY-SA 4.0) · attributed in-app per culture",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Twelve additional sky cultures (Arab, Inuit, Egyptian, Maya, Boorong, Norse, Maori, Japanese, Korean, Sami, Tongan, Tukano) drawn as constellation line-figures with native star names.",
} as const;

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
  /** Which culture to render. `null` hides the layer. */
  cultureId?: ExtendedSkyCultureId | null;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setCulture(id: ExtendedSkyCultureId | null): void;
  dispose(): void;
};

export { EXTENDED_CULTURE_LIST, EXTENDED_SKY_CULTURES };
export type { ExtendedSkyCultureId };

export function mountLayer(opts: MountOptions): MountedLayer {
  const renderer = new ExtendedSkyCulturesRenderer();
  opts.parent.add(renderer.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  // Default to the first culture in the list so the layer renders
  // immediately when toggled.
  let cultureId: ExtendedSkyCultureId | null =
    opts.cultureId ?? EXTENDED_CULTURE_LIST[0] ?? null;
  renderer.setCulture(cultureId);

  const applyVisibility = (): void => {
    renderer.setVisible(enabled && currentMode === "sky" && cultureId !== null);
  };
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
    setCulture(id: ExtendedSkyCultureId | null): void {
      cultureId = id;
      renderer.setCulture(id);
      applyVisibility();
    },
    dispose(): void {
      opts.parent.remove(renderer.group);
      renderer.dispose();
    },
  };
}

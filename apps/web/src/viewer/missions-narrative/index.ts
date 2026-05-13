/**
 * Missions Narrative — content provider for in-product mission profiles.
 *
 * This module is intentionally NOT a 3D extra-layer: it does not render
 * geometry into the scene. It exists to ship the long-form mission
 * narrative content that the existing Missions Catalog panel hyperlinks
 * into via the new MissionNarrativePanel modal.
 *
 * We still export a `LAYER_META`-like manifest so any UI that wants to
 * discover this content provider can do so without importing the bulky
 * narrative data eagerly. The actual data lives in `missions-data.ts`
 * and is imported only by the React panel on first open.
 */

import {
  MISSIONS_NARRATIVE,
  findMissionNarrative,
  narrativeForCatalogId,
  type MissionNarrative,
} from "./missions-data";

export type { MissionNarrative };
export { MISSIONS_NARRATIVE, findMissionNarrative, narrativeForCatalogId };

/**
 * Lightweight manifest, in the spirit of `extra-layers/registry.ts`
 * `LayerMeta`, but without any of the 3D-rendering hooks. Surfaced so a
 * future "content layers" panel could list this provider alongside the
 * spatial layers without loading any of the actual mission text.
 */
export const LAYER_META = {
  id: "missions-narrative",
  label: "Mission Profiles",
  icon: "📖",
  attribution:
    "Mission profiles compiled from NASA (public domain), ESA / JAXA / CNSA / ISRO mission pages, and peer-reviewed papers.",
  description:
    "Wikipedia-quality, in-product profiles of 15 significant spacecraft — narrative, key facts, stats, timeline, and primary sources. Opens from the Missions Catalog panel.",
  contentOnly: true,
  count: MISSIONS_NARRATIVE.length,
} as const;

/**
 * No-op mount: this provider has no scene-graph footprint. Kept as a
 * compatible signature so any future generic loader that iterates
 * extra-layer-style modules doesn't need a special case.
 */
export function mountLayer(): {
  setEnabled: () => void;
  dispose: () => void;
} {
  return {
    setEnabled: () => {
      /* content-only provider: nothing to toggle */
    },
    dispose: () => {
      /* content-only provider: nothing to dispose */
    },
  };
}

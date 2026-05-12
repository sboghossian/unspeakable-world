import type { Group } from "three";
import { log } from "../../lib/logger";
import { ChandraField } from "./chandra-field";

/**
 * Public entry point for the Chandra X-ray catalog overlay.
 *
 * Renders a tiny diamond marker at each source's ICRS position, colored
 * by hardness ratio (blue=hard, red=soft, violet=mid). The dataset is a
 * curated subset of bright Chandra Source Catalog 2.0 entries and
 * historically important X-ray sources.
 */

const DATA_URL = "/data/chandra-bright.json";

export const LAYER_META = {
  id: "chandra",
  label: "Chandra X-ray",
  icon: "x-ray",
  attribution:
    "Chandra X-ray Observatory / NASA & SAO — Chandra Source Catalog 2.0 (public domain)",
  modes: ["sky", "galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "Bright X-ray sources from the Chandra Source Catalog 2.0 — XRBs, AGN, SNRs, magnetars, clusters, stellar coronae. Diamond markers colored by hardness ratio.",
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
  const field = new ChandraField();
  opts.parent.add(field.group);
  field.setMode(opts.mode);
  field.setVisible(opts.enabled);

  let disposed = false;

  // Fire-and-forget load — the field handles its own errors via logger.
  void field.load(DATA_URL).then(() => {
    if (disposed) return;
    log.info(
      "[chandra]",
      `loaded ${field.count()} X-ray sources (${LAYER_META.attribution})`,
    );
  });

  return {
    setEnabled(v: boolean): void {
      field.setVisible(v);
    },
    setMode(m: LayerMode): void {
      field.setMode(m);
    },
    dispose(): void {
      disposed = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

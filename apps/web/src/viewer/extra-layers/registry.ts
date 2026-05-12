/**
 * Central registry of "extra" federated data layers added by the
 * 2026-05 swarm. Each module exposes a `LAYER_META` describing its UI
 * surface, and a `mountLayer()` function that attaches a Three.js
 * `Group` to a parent and returns a handle for enable/mode/dispose.
 *
 * Modules are imported as namespaces so that the registry stays a
 * pure data structure — no side effects until `mountExtrasInto()`
 * is called.
 */

import type { Object3D } from "three";

import * as chandra from "../chandra";
import * as cosmicflows4 from "../cosmicflows4";
import * as exoplanetsFull from "../exoplanets";
import * as gaiaStars from "../gaia-stars";
import * as galaxyCone from "../galaxy-cone";
import * as globeAtNight from "../globe-at-night";
import * as marsRoverIotd from "../mars-rover-iotd";
import * as multimessenger from "../multimessenger";
import * as neocpRisk from "../neocp-risk";
import * as opalGiants from "../opal-giants";
import * as planckPolarization from "../planck-polarization";
import * as skyCulturesExtended from "../sky-cultures-extended";
import * as starlinkOptin from "../starlink-optin";
import * as variables from "../variables";
import * as ztfAlerts from "../ztf-alerts";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export type SubLayerDef = {
  readonly id: string;
  readonly label: string;
  readonly color: string;
};

export type LayerMeta = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly attribution: string;
  readonly modes: readonly string[];
  readonly defaultEnabled: boolean;
  readonly description: string;
  readonly subLayers?: ReadonlyArray<SubLayerDef>;
  readonly warning?: string;
};

export type LayerHandle = {
  setEnabled(enabled: boolean): void;
  setMode?(mode: string): void;
  setTime?(ms: number): void;
  setSubLayer?(id: string, on: boolean): void;
  dispose(): void;
};

export type MountOpts = {
  parent: Object3D;
  mode: string;
  enabled: boolean;
};

export type ExtraLayerModule = {
  readonly LAYER_META: LayerMeta;
  mountLayer(opts: MountOpts): LayerHandle;
};

/**
 * Order here is the order shown in the UI toggle panel. Keep visually
 * loudest layers near the top, more niche at the bottom.
 */
export const EXTRA_LAYERS: readonly ExtraLayerModule[] = [
  // Sky / catalog overlays
  gaiaStars as unknown as ExtraLayerModule,
  exoplanetsFull as unknown as ExtraLayerModule,
  chandra as unknown as ExtraLayerModule,
  variables as unknown as ExtraLayerModule,
  multimessenger as unknown as ExtraLayerModule,
  ztfAlerts as unknown as ExtraLayerModule,
  planckPolarization as unknown as ExtraLayerModule,
  skyCulturesExtended as unknown as ExtraLayerModule,

  // Galactic / universe 3D structure
  galaxyCone as unknown as ExtraLayerModule,
  cosmicflows4 as unknown as ExtraLayerModule,

  // Solar / Earth-orbit
  neocpRisk as unknown as ExtraLayerModule,
  starlinkOptin as unknown as ExtraLayerModule,
  globeAtNight as unknown as ExtraLayerModule,
  opalGiants as unknown as ExtraLayerModule,
  marsRoverIotd as unknown as ExtraLayerModule,
];

export function listExtras(mode: LayerMode): LayerMeta[] {
  return EXTRA_LAYERS.filter((m) => m.LAYER_META.modes.includes(mode)).map(
    (m) => m.LAYER_META,
  );
}

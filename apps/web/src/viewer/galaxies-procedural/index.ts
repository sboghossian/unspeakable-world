/**
 * galaxies-procedural — procedural 3D galaxy morphology rendering.
 *
 * Closes the single biggest first-10-seconds gap vs. VelonSpace: when
 * a user flies near M31, M51, M104, NGC 891 etc. they see an actual
 * 3D galaxy with spiral arms / dust lanes / bulge / disc, not a
 * billboarded sprite or a HiPS tile that goes mush at close range.
 *
 * Design constraints:
 *   • One mesh per catalogued galaxy. PlaneGeometry + ShaderMaterial.
 *   • Positioned in the galactic world frame (same SUN_LY anchor as
 *     galaxy-cone / milky-way-real / universe-scene).
 *   • Far-distance fade is baked into each shader so the procedural
 *     galaxies don't fight the 80K-point cone overlay at large camera
 *     distance.
 *   • The morphology shaders are "synthetic-on-real-positions":
 *     real galaxy positions + types, procedural pixels. We mark the
 *     layer's `synthetic` flag accordingly (false — the morphology is
 *     stylised but the catalog is real).
 */

import { Group } from "three";
import type { Object3D } from "three";

import { log } from "../../lib/logger";
import { GALAXY_CATALOG, type GalaxyRow } from "./data/galaxy-catalog";
import { GalaxyMesh } from "./galaxy-mesh";

/** Public layer modes the registry advertises this module for. */
export const LAYER_META = {
  id: "galaxies-procedural",
  label: "Procedural galaxies",
  icon: "🌀",
  attribution: "procedural shaders · catalog distances from SIMBAD/NED",
  modes: ["galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "30-50 named galaxies rendered as 3D shaped meshes — spiral / " +
    "elliptical / edge-on / irregular / sombrero — using shaders " +
    "parameterized by inclination, arm count, dust-lane strength, " +
    "and Sersic index.",
  synthetic: false,
};

export type LayerMode = (typeof LAYER_META.modes)[number];

export type MountOpts = {
  parent: Object3D;
  mode: string;
  enabled: boolean;
};

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode?(m: string): void;
  setTime?(ms: number): void;
  dispose(): void;
};

/** 1 Mpc → light-years. */
const LY_PER_MPC = 3_261_564;
/** Galactic-frame Sun anchor used by every other 3D layer. */
const SUN_LY = { x: 26000, y: 0, z: 0 } as const;

/* ─── world-frame conversion ─────────────────────────────────────── */

/**
 * Convert (RA deg, Dec deg, distance Mpc) → world LY in the galactic
 * frame that universe-scene, galaxy-cone and dark-matter-field share.
 * We follow `galaxy-cone/structures.ts` exactly so labels and meshes
 * land on the same coordinates.
 */
function equatorialDegMpcToWorldLY(
  raDeg: number,
  decDeg: number,
  distanceMpc: number,
): { x: number; y: number; z: number } {
  const raRad = (raDeg * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const r = distanceMpc * LY_PER_MPC;
  const cosDec = Math.cos(decRad);
  const x = r * cosDec * Math.cos(raRad);
  const y = r * Math.sin(decRad);
  const z = r * cosDec * Math.sin(raRad);
  return { x: SUN_LY.x + x, y, z: SUN_LY.z + z };
}

/* ─── field class ────────────────────────────────────────────────── */

class GalaxyMorphologyField {
  readonly group = new Group();
  private meshes: GalaxyMesh[] = [];
  private startTime = 0;

  constructor() {
    this.group.name = "GalaxyMorphologyField";
    this.group.visible = false;
    this.group.renderOrder = 2;
    this.startTime =
      typeof performance !== "undefined" ? performance.now() : 0;
  }

  build(catalog: ReadonlyArray<GalaxyRow>): void {
    for (const row of catalog) {
      try {
        const gm = new GalaxyMesh(row);
        const pos = equatorialDegMpcToWorldLY(
          row.raDeg,
          row.decDeg,
          row.distanceMpc,
        );
        gm.mesh.position.set(pos.x, pos.y, pos.z);
        this.group.add(gm.mesh);
        this.meshes.push(gm);
      } catch (err) {
        log.warn(
          "[galaxies-procedural]",
          `failed to build mesh for ${row.id}`,
          err,
        );
      }
    }
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /** Advance the slow HII-region twinkle. */
  setTime(ms: number): void {
    const seconds = (ms - this.startTime) / 1000;
    for (const gm of this.meshes) gm.setTime(seconds);
  }

  dispose(): void {
    for (const gm of this.meshes) gm.dispose();
    this.meshes = [];
    this.group.clear();
  }
}

/* ─── mount ──────────────────────────────────────────────────────── */

export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new GalaxyMorphologyField();
  opts.parent.add(field.group);

  // Catalogue is static, no async fetch — build immediately.
  try {
    field.build(GALAXY_CATALOG);
    log.info(
      "[galaxies-procedural]",
      `built ${GALAXY_CATALOG.length} procedural galaxy meshes`,
    );
  } catch (err) {
    log.warn("[galaxies-procedural]", "build failed", err);
  }

  field.setVisible(opts.enabled && isSupportedMode(opts.mode));

  let currentMode = opts.mode;
  let enabled = opts.enabled;
  let disposed = false;

  const applyVisibility = (): void => {
    if (disposed) return;
    field.setVisible(enabled && isSupportedMode(currentMode));
  };

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      applyVisibility();
    },
    setMode(m: string): void {
      currentMode = m;
      applyVisibility();
    },
    setTime(ms: number): void {
      field.setTime(ms);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

function isSupportedMode(m: string): boolean {
  return m === "galactic" || m === "universe";
}

export { GalaxyMesh } from "./galaxy-mesh";
export { GALAXY_CATALOG } from "./data/galaxy-catalog";
export type { GalaxyRow, GalaxyType } from "./data/galaxy-catalog";

/**
 * nebulae-volumetric — volumetric 3D nebulae for the famous DSOs.
 *
 * When the user toggles this layer and flies near Orion, they see Orion
 * as an actual 3D volume of pink-blue HII glow with dark Bok-globule
 * bites — not a flat HiPS tile and not a label. The shader raymarches
 * 32 samples through a per-nebula fBm density volume; eight catalogue
 * rows ship with hand-tuned shape primitives (fan / pillars / violet
 * filaments / bifurcated / Veil filaments / Crab bipolar / Helix torus
 * / M57 ring).
 *
 * Three modes:
 *   • sky        — box placed on the unit celestial sphere at the
 *                  nebula's RA/Dec. Box size = angular extent ×
 *                  SKY_VOLUME_SCALE so the volume occupies its naked-eye
 *                  patch of sky.
 *   • galactic   — box placed at heliocentric (RA, Dec, distance) in LY,
 *                  in the same world frame used by `galaxies-procedural`
 *                  and `milky-way-real` (Sun at SUN_LY=26000 from
 *                  galactic centre on +x). Box size = physical extent
 *                  in LY × GAL_SIZE_MULT so the volume reads as a
 *                  3D structure at fly-by distance.
 *   • universe   — same as galactic. Universe-mode camera is much
 *                  further out so the per-volume fade kicks in and the
 *                  nebulae shrink to invisible.
 *
 * Coordinate source per nebula: see `data/nebulae-catalog.ts`.
 *
 * Performance: at most 8 cubes in the frustum at once. Each cube is
 * shaded by a 32-sample raymarch (early-out at transmittance < 0.01)
 * → typically 2-15 active samples per pixel. Worst-case full-screen
 * Orion (camera inside the cube): ~1.5 ms/frame on M2.
 */

import { Group, type Object3D, Vector3 } from "three";

import { raDecToVec3 } from "../stars/coords";
import { log } from "../../lib/logger";
import {
  NEBULAE_CATALOG,
  type NebulaRow,
} from "./data/nebulae-catalog";
import { NebulaMesh, type NebulaPlacementMode } from "./nebula-mesh";

/** Public LAYER_META mirrored verbatim into extra-layers/registry.ts. */
export const LAYER_META = {
  id: "nebulae-volumetric",
  label: "Volumetric nebulae",
  icon: "🌫",
  attribution:
    "Volumetric raymarch · positions SIMBAD/NED · The Unspeakable World (MIT)",
  modes: ["sky", "galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "Eight famous nebulae rendered as 3D volumes via fragment raymarching: " +
    "Orion (HII fan), Eagle (pillars), Tarantula (violet filaments), Carina " +
    "(bifurcated), Veil (SNR filaments), Crab (bipolar pulsar wind), Helix " +
    "(planetary torus), Ring M57 (donut).",
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

/* ─── frame constants matched to galaxies-procedural ─────────────── */

const LY_PER_PC = 3.261_563_777;
const SUN_LY = { x: 26000, y: 0, z: 0 } as const;

/** Sky-mode volume: how much of the unit sphere a 60' diameter nebula
 * should cover. The Moon is ~30' so this lets Orion (~65') read at the
 * "size of two moons" we all remember from binoculars. */
const SKY_VOLUME_SCALE = 0.0016;

/** Galactic-mode size multiplier so a 24 ly Orion is visible from a few
 * hundred LY out (the natural fly-by distance). 8× → 192 LY box for
 * Orion, but the density profile shrinks back to the inner 60%. */
const GAL_SIZE_MULT = 6;

/** Sky-mode radius: just inside the DSO ring (0.997). */
const SKY_SHELL_RADIUS = 0.991;

/* ─── per-mode placement ─────────────────────────────────────────── */

function placeNebulaForMode(
  row: NebulaRow,
  mode: NebulaPlacementMode,
): { pos: Vector3; size: number } {
  if (mode === "sky") {
    const [x, y, z] = raDecToVec3(row.raDeg, row.decDeg, SKY_SHELL_RADIUS);
    // Sky-mode box size: angular diameter in arcmin → unit-sphere chord
    // length × SKY_VOLUME_SCALE. 1' ≈ 2.91e-4 rad on the unit sphere.
    const angularRad = (row.angularArcmin / 60) * (Math.PI / 180);
    const size = Math.max(angularRad * 0.5, 0.005) * 4 + SKY_VOLUME_SCALE * row.angularArcmin;
    return { pos: new Vector3(x, y, z), size };
  }
  // galactic / universe: place at heliocentric (ra, dec, distance) in
  // world LY, anchored on the +x Sun position so the volume sits at the
  // same world coords other galactic-mode layers expect.
  const raRad = (row.raDeg * Math.PI) / 180;
  const decRad = (row.decDeg * Math.PI) / 180;
  const distLy = row.distancePc * LY_PER_PC;
  const cosDec = Math.cos(decRad);
  const x = SUN_LY.x + distLy * cosDec * Math.cos(raRad);
  const y = distLy * Math.sin(decRad);
  const z = SUN_LY.z + distLy * cosDec * Math.sin(raRad);
  // Galactic-mode box size: physical extent in LY × GAL_SIZE_MULT. We
  // floor at 5 LY so very tiny planetary nebulae (Helix is 2.9 LY) are
  // still visible at fly-by range.
  const size = Math.max(row.physicalLy, 4) * GAL_SIZE_MULT;
  return { pos: new Vector3(x, y, z), size };
}

/* ─── field class ────────────────────────────────────────────────── */

class NebulaeField {
  readonly group = new Group();
  private meshes: NebulaMesh[] = [];
  private mode: NebulaPlacementMode = "sky";
  private startTime = 0;

  constructor() {
    this.group.name = "NebulaeVolumetricField";
    this.group.visible = false;
    // Sky-mode rotation: same -π/2 X applied to constellations/DSO so
    // RA/Dec coords line up with the rest of the celestial sphere. We
    // toggle this on `setMode("sky")` and zero it otherwise.
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 1;
    this.startTime =
      typeof performance !== "undefined" ? performance.now() : 0;
  }

  build(catalog: ReadonlyArray<NebulaRow>, mode: NebulaPlacementMode): void {
    this.mode = mode;
    this.group.rotation.x = mode === "sky" ? -Math.PI / 2 : 0;
    for (const row of catalog) {
      try {
        const mesh = new NebulaMesh(row);
        const { pos, size } = placeNebulaForMode(row, mode);
        mesh.setWorldTransform(pos, size, mode);
        this.group.add(mesh.mesh);
        this.meshes.push(mesh);
      } catch (err) {
        log.warn(
          "[nebulae-volumetric]",
          `failed to build mesh for ${row.id}`,
          err,
        );
      }
    }
  }

  setMode(mode: NebulaPlacementMode): void {
    if (mode === this.mode) {
      // Mode unchanged, but rotation may need a refresh on first frame.
      this.group.rotation.x = mode === "sky" ? -Math.PI / 2 : 0;
      return;
    }
    this.mode = mode;
    this.group.rotation.x = mode === "sky" ? -Math.PI / 2 : 0;
    for (let i = 0; i < this.meshes.length; i++) {
      const row = NEBULAE_CATALOG[i];
      const mesh = this.meshes[i];
      if (!row || !mesh) continue;
      const { pos, size } = placeNebulaForMode(row, mode);
      mesh.setWorldTransform(pos, size, mode);
    }
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /** Advance the slow internal turbulence. */
  setTime(ms: number): void {
    const seconds = (ms - this.startTime) / 1000;
    for (const m of this.meshes) m.setTime(seconds);
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    this.meshes = [];
    this.group.clear();
  }
}

/* ─── mount ──────────────────────────────────────────────────────── */

export function mountLayer(opts: MountOpts): LayerHandle {
  const supportedMode = coerceMode(opts.mode);
  const field = new NebulaeField();
  opts.parent.add(field.group);

  try {
    field.build(NEBULAE_CATALOG, supportedMode);
    log.info(
      "[nebulae-volumetric]",
      `built ${NEBULAE_CATALOG.length} volumetric nebula meshes (mode=${supportedMode})`,
    );
  } catch (err) {
    log.warn("[nebulae-volumetric]", "build failed", err);
  }

  let currentMode: NebulaPlacementMode = supportedMode;
  let enabled = opts.enabled;
  let disposed = false;

  const applyVisibility = (): void => {
    if (disposed) return;
    field.setVisible(enabled);
  };

  field.setVisible(enabled);

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      applyVisibility();
    },
    setMode(m: string): void {
      const next = coerceMode(m);
      if (next !== currentMode) {
        currentMode = next;
        field.setMode(next);
      }
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

function coerceMode(m: string): NebulaPlacementMode {
  if (m === "galactic") return "galactic";
  if (m === "universe") return "universe";
  return "sky";
}

export { NEBULAE_CATALOG } from "./data/nebulae-catalog";
export type { NebulaRow, NebulaShape } from "./data/nebulae-catalog";
export { NebulaMesh } from "./nebula-mesh";

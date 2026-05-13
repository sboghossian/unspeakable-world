/**
 * galaxy-mesh — per-galaxy procedural mesh.
 *
 * One PlaneGeometry quad per galaxy, with the correct shader
 * (spiral / elliptical / edge-on / sombrero / irregular variants) wired
 * up via `ShaderMaterial`. The quad is oriented in the galaxy's local
 * frame; the host code positions + rotates it in world space.
 *
 * Sizing:
 *   • A galaxy's D25 isophotal diameter (kpc) → world LY via the
 *     standard 1 kpc = 3261.564 LY constant, then multiplied by a
 *     `sizeMultiplier` so users can clearly see M31's spiral arms long
 *     before the camera is one Mpc out. The default multiplier is 25×
 *     for spirals/edge-ons and 18× for compact ellipticals — purely a
 *     visualisation tradeoff (we want the galaxies to read as galaxies
 *     before the camera is on top of them).
 *
 * Inclination:
 *   • For "spiral", "barred-spiral", "irregular", and "ring", the host
 *     mesh sits on the local XZ plane (normal = +Y), then is tilted by
 *     `inclinationDeg` around the local X axis. This keeps face-on at
 *     inclination=0 and edge-on at 90°.
 *   • For "edge-on" and "sombrero", the quad is rendered in the XY
 *     plane (so the shader's vertical-axis dust lane reads correctly
 *     across the disc) — the host does NOT tilt these because the
 *     shader bakes in the edge-on geometry.
 *   • For "elliptical", inclination is meaningless (axisymmetric, or
 *     E0-E7 oblate). We let the host pass `axisRatio` to the shader and
 *     leave the mesh face-on.
 *
 * Picking / hover:
 *   • Each mesh exposes `.userData.galaxyId` so the host can implement
 *     a raycast hit-test later. Default `frustumCulled = true` because
 *     these meshes are bounded — Three.js can skip ones outside the
 *     view.
 */

import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";

import type { GalaxyRow, GalaxyType } from "./data/galaxy-catalog";
import { ELLIPTICAL_FRAG, ELLIPTICAL_VERT } from "./shaders/elliptical.glsl";
import { EDGE_ON_FRAG, EDGE_ON_VERT } from "./shaders/edge-on.glsl";
import { SOMBRERO_FRAG, SOMBRERO_VERT } from "./shaders/sombrero.glsl";
import { SPIRAL_FRAG, SPIRAL_VERT } from "./shaders/spiral.glsl";

/** 1 kiloparsec → light-years (shared with milky-way-real). */
export const LY_PER_KPC = 3261.564;

/** Cosmetic boost so galaxies read as galaxies long before fly-over. */
const SPIRAL_SIZE_MULT = 25;
const ELLIPTICAL_SIZE_MULT = 18;

/** Fade defaults: galaxies are full-strength inside ~5 Mpc, gone by ~50 Mpc. */
const LY_PER_MPC = 3_261_564;
const FADE_START_LY = 5 * LY_PER_MPC;
const FADE_END_LY = 60 * LY_PER_MPC;

/** Public handle. */
export class GalaxyMesh {
  readonly mesh: Mesh;
  private material: ShaderMaterial;
  private geometry: PlaneGeometry;

  constructor(row: GalaxyRow) {
    const built = buildMaterial(row);
    this.material = built.material;

    const quadSizeLy = quadSizeForRow(row);
    this.geometry = new PlaneGeometry(quadSizeLy, quadSizeLy);
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = `galaxy:${row.id}`;
    this.mesh.userData["galaxyId"] = row.id;
    this.mesh.userData["galaxyType"] = row.galaxyType;
    this.mesh.userData["galaxyName"] = row.name;
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = true;

    applyOrientation(this.mesh, row);
  }

  /** Drive the slow HII twinkle on spirals (no-op on other types). */
  setTime(seconds: number): void {
    const u = this.material.uniforms["uTime"];
    if (u) u.value = seconds;
  }

  /** Place the mesh at a world-space position. */
  setPosition(worldLY: Vector3): void {
    this.mesh.position.copy(worldLY);
  }

  /** Toggle visibility. */
  setVisible(v: boolean): void {
    this.mesh.visible = v;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* ─── geometry sizing ────────────────────────────────────────────── */

function quadSizeForRow(row: GalaxyRow): number {
  const mult =
    row.galaxyType === "elliptical" ? ELLIPTICAL_SIZE_MULT : SPIRAL_SIZE_MULT;
  // Quad spans the full D25 diameter; the shader's disc fades to 0
  // before the quad edge so there's no hard cutoff.
  const diameterLy = row.sizeKpc * LY_PER_KPC * mult;
  // Floor: ridiculously tiny dwarfs (sizeKpc < 2) still need to be
  // visible at a distance. 80 kly is the minimum readable size.
  return Math.max(diameterLy, 80_000);
}

/* ─── orientation ────────────────────────────────────────────────── */

function applyOrientation(mesh: Mesh, row: GalaxyRow): void {
  // PlaneGeometry's default normal is +Z. For all of our galaxy types,
  // we want the local "up" (disc normal) to be +Y in the galaxy's
  // local frame — easier to reason about. So we always rotate the
  // base plane by -90° around X to flip its normal from +Z to +Y.
  mesh.rotation.x = -Math.PI / 2;

  const incRad = (row.inclinationDeg * Math.PI) / 180;

  if (row.galaxyType === "edge-on" || row.galaxyType === "sombrero") {
    // Shader bakes the edge-on geometry — keep the quad facing the
    // camera at the equator. We undo the -90° flip so the quad sits
    // in the local XY plane again.
    mesh.rotation.x = 0;
    return;
  }

  if (row.galaxyType === "elliptical") {
    // Axisymmetric. We still slightly tilt for visual variety so the
    // Virgo Cluster doesn't look like a sticker sheet — but only a
    // tiny amount since real ellipticals have small projected
    // ellipticities (E0-E5).
    const ellipticalTilt = (row.inclinationDeg * Math.PI) / 180;
    mesh.rotation.x = -Math.PI / 2 + ellipticalTilt * 0.2;
    return;
  }

  // Spirals / barred spirals / irregulars / rings: tilt around local X
  // by the catalogued inclination so we get the projected oval.
  // We add a deterministic rotation around Y so that random spirals
  // don't all face the same way.
  const yaw = pseudoRandom(row.id) * Math.PI * 2;
  mesh.rotation.x = -Math.PI / 2 + incRad;
  mesh.rotation.y = yaw;
}

/** Deterministic [0,1) hash from a string. */
function pseudoRandom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 100000) / 100000;
}

/* ─── shader material wiring ─────────────────────────────────────── */

type BuiltMaterial = {
  material: ShaderMaterial;
};

function buildMaterial(row: GalaxyRow): BuiltMaterial {
  switch (row.galaxyType) {
    case "spiral":
    case "barred-spiral":
    case "irregular":
    case "ring":
    case "peculiar":
      return { material: buildSpiralMaterial(row) };
    case "elliptical":
      return { material: buildEllipticalMaterial(row) };
    case "edge-on":
      return { material: buildEdgeOnMaterial(row) };
    case "sombrero":
      return { material: buildSombreroMaterial(row) };
    default: {
      // Exhaustiveness guard — TypeScript will flag unhandled GalaxyType.
      const _exhaustive: never = row.galaxyType;
      void _exhaustive;
      return { material: buildSpiralMaterial(row) };
    }
  }
}

function buildSpiralMaterial(row: GalaxyRow): ShaderMaterial {
  // Spirals tilt their quad via Object3D rotation; the shader's
  // `uAxisRatio` we then leave at 1.0 so the quad stays circular in
  // its own frame and projection does the foreshortening.
  // For "irregular" / "ring" / "peculiar" buckets we re-use the
  // spiral shader with degraded arms (low arm count, large width)
  // since they share the same disc + bulge skeleton.
  const armCount = pickArmCount(row);
  const pitchDeg = pickPitch(row);
  const armWidth = pickArmWidth(row);
  const bulgeStrength = pickBulgeStrength(row.galaxyType);
  const dustStrength = pickDustStrength(row.galaxyType);
  const hiiStrength = pickHiiStrength(row.galaxyType);

  return new ShaderMaterial({
    uniforms: {
      uArmCount: { value: armCount },
      uPitchRad: { value: (pitchDeg * Math.PI) / 180 },
      uAxisRatio: { value: 1.0 },
      uArmWidth: { value: armWidth },
      uDustStrength: { value: dustStrength },
      uBulgeStrength: { value: bulgeStrength },
      uBulgeSize: { value: pickBulgeSize(row.galaxyType) },
      uHiiStrength: { value: hiiStrength },
      uArmColor: { value: [0.75, 0.85, 1.0] },
      uBulgeColor: { value: [1.0, 0.85, 0.6] },
      uDustColor: { value: [0.45, 0.22, 0.18] },
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
      uFadeStart: { value: FADE_START_LY },
      uFadeEnd: { value: FADE_END_LY },
    },
    vertexShader: SPIRAL_VERT,
    fragmentShader: SPIRAL_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

function buildEllipticalMaterial(row: GalaxyRow): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uAxisRatio: { value: row.axisRatio },
      uSersicN: { value: 4 },
      uCoreColor: { value: [1.0, 0.92, 0.78] },
      uHaloColor: { value: [0.9, 0.6, 0.45] },
      uOpacity: { value: 1.0 },
      uFadeStart: { value: FADE_START_LY },
      uFadeEnd: { value: FADE_END_LY },
    },
    vertexShader: ELLIPTICAL_VERT,
    fragmentShader: ELLIPTICAL_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

function buildEdgeOnMaterial(row: GalaxyRow): ShaderMaterial {
  // Cen A has a very different dust geometry from NGC 891 — its
  // dust lane is fatter and tilted. We surface that as a wider lane
  // when the row's axisRatio is high (Cen A is 0.78; NGC 891 is 0.18).
  const isThick = row.axisRatio > 0.4;
  return new ShaderMaterial({
    uniforms: {
      uDiscScaleX: { value: 0.25 },
      uDiscScaleY: { value: isThick ? 0.09 : 0.04 },
      uBulgeSize: { value: isThick ? 0.18 : 0.1 },
      uBulgeStrength: { value: isThick ? 0.85 : 0.55 },
      uDustWidth: { value: isThick ? 0.04 : 0.012 },
      uDustStrength: { value: 0.9 },
      uDustOffset: { value: isThick ? 0.0 : 0.008 },
      uDiscColor: { value: [1.0, 0.92, 0.78] },
      uBulgeColor: { value: [1.0, 0.87, 0.65] },
      uDustColor: { value: [0.35, 0.17, 0.13] },
      uOpacity: { value: 1.0 },
      uFadeStart: { value: FADE_START_LY },
      uFadeEnd: { value: FADE_END_LY },
    },
    vertexShader: EDGE_ON_VERT,
    fragmentShader: EDGE_ON_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

function buildSombreroMaterial(_row: GalaxyRow): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uBulgeColor: { value: [1.0, 0.88, 0.65] },
      uDiscColor: { value: [1.0, 0.93, 0.78] },
      uDustColor: { value: [0.3, 0.13, 0.1] },
      uOpacity: { value: 1.0 },
      uFadeStart: { value: FADE_START_LY },
      uFadeEnd: { value: FADE_END_LY },
    },
    vertexShader: SOMBRERO_VERT,
    fragmentShader: SOMBRERO_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

/* ─── per-type parameter pickers ─────────────────────────────────── */

function pickArmCount(row: GalaxyRow): number {
  if (row.galaxyType === "ring") return 0; // no arms — ring shader (we degrade
  // by using very wide arms; below we set armWidth large to wash out)
  if (row.galaxyType === "irregular") return Math.max(1, row.armCount);
  if (row.galaxyType === "peculiar") return Math.max(1, row.armCount || 1);
  return Math.max(1, row.armCount);
}

function pickPitch(row: GalaxyRow): number {
  // Spiral pitch in degrees. Catalog provides a real number for spirals;
  // for non-spirals we use a default so the shader's log-spiral term is
  // still defined.
  if (row.spiralPitchDeg > 0.5) return row.spiralPitchDeg;
  return 20;
}

function pickArmWidth(row: GalaxyRow): number {
  // Tightly-wound, grand-design spirals → narrow arms (0.06 rad).
  // Flocculent / loose multi-arm → wider (0.13 rad).
  // Ring / peculiar → very wide so the arm pattern washes into a disc.
  if (row.galaxyType === "ring") return 0.35;
  if (row.galaxyType === "peculiar") return 0.22;
  if (row.galaxyType === "irregular") return 0.25;
  if (row.armCount >= 4) return 0.13;
  // grand-design 2-arm
  return 0.085;
}

function pickBulgeStrength(t: GalaxyType): number {
  switch (t) {
    case "spiral":
      return 0.85;
    case "barred-spiral":
      return 0.75;
    case "irregular":
      return 0.18;
    case "ring":
      return 0.5;
    case "peculiar":
      return 0.7;
    default:
      return 0.5;
  }
}

function pickBulgeSize(t: GalaxyType): number {
  switch (t) {
    case "spiral":
      return 0.1;
    case "barred-spiral":
      return 0.08;
    case "irregular":
      return 0.18;
    case "ring":
      return 0.07;
    case "peculiar":
      return 0.16;
    default:
      return 0.1;
  }
}

function pickDustStrength(t: GalaxyType): number {
  switch (t) {
    case "spiral":
    case "barred-spiral":
      return 0.6;
    case "peculiar":
      return 0.75;
    case "ring":
      return 0.2;
    case "irregular":
      return 0.35;
    default:
      return 0.4;
  }
}

function pickHiiStrength(t: GalaxyType): number {
  switch (t) {
    case "spiral":
    case "barred-spiral":
      return 0.55;
    case "irregular":
      return 0.7;
    case "ring":
      return 0.4;
    case "peculiar":
      return 0.3;
    default:
      return 0.3;
  }
}

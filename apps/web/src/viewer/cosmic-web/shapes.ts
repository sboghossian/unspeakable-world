/**
 * cosmic-web/shapes.ts — procedural particle-cloud generators.
 *
 * Each generator produces a Float32Array of XYZ positions in the host
 * structure's local frame (Mpc, centred at origin). The cosmic-web
 * renderer then translates+rotates the cloud into supergalactic space.
 *
 * Density profile shaping:
 *   • All generators write a *companion* Float32Array of overdensity
 *     values in [0..1] used by the renderer for colour blending and
 *     size. Higher value = brighter, closer-to-filament-axis particle.
 *
 * Determinism:
 *   • Each generator takes a seed so the same structure resamples to
 *     the same cloud across reloads — important so the labels never
 *     drift over their associated overdensities.
 *
 * No fancy noise libs — we lean on a small mulberry32 PRNG so the
 * module ships zero new deps.
 */

import type { Morphology } from "./structures";

export type CloudGeometry = {
  /** Flat XYZ Mpc positions (length = 3 × particle count). */
  positions: Float32Array;
  /** Overdensity [0..1] per particle (length = particle count). */
  densities: Float32Array;
};

/** Mulberry32 — small, fast, deterministic PRNG. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample via Box–Muller. */
function gauss(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export type ShapeParams = {
  count: number;
  /** Half-extents (Mpc) in the local x/y/z. */
  extent: { x: number; y: number; z: number };
  /** PRNG seed (any 32-bit int). */
  seed: number;
};

export type ShapeFn = (params: ShapeParams) => CloudGeometry;

/* ─── Generators ─────────────────────────────────────────────────── */

/**
 * Group dumbbell — two clusters joined by a thin filament. Local Group
 * morphology (Milky Way ↔ Andromeda + a sparse stream of dwarfs).
 */
export const groupDumbbell: ShapeFn = ({ count, extent, seed }) => {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const densities = new Float32Array(count);
  const lobeRadius = Math.min(extent.y, extent.z) * 0.45;
  const sep = extent.x; // half-distance between lobes
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const u = rng();
    // 80% of particles in the lobes, 20% along the bridge.
    if (u < 0.4) {
      // Milky Way lobe
      positions[o] = -sep + gauss(rng) * lobeRadius * 0.5;
      positions[o + 1] = gauss(rng) * lobeRadius * 0.4;
      positions[o + 2] = gauss(rng) * lobeRadius * 0.4;
      densities[i] = 0.7 + rng() * 0.3;
    } else if (u < 0.8) {
      positions[o] = sep + gauss(rng) * lobeRadius * 0.5;
      positions[o + 1] = gauss(rng) * lobeRadius * 0.4;
      positions[o + 2] = gauss(rng) * lobeRadius * 0.4;
      densities[i] = 0.7 + rng() * 0.3;
    } else {
      // Bridge of dwarfs
      positions[o] = (rng() * 2 - 1) * sep;
      positions[o + 1] = gauss(rng) * lobeRadius * 0.25;
      positions[o + 2] = gauss(rng) * lobeRadius * 0.25;
      densities[i] = 0.2 + rng() * 0.3;
    }
  }
  return { positions, densities };
};

/**
 * Sheet — thin planar slab with anisotropic clumping. Used for the
 * Local Sheet.
 */
export const sheet: ShapeFn = ({ count, extent, seed }) => {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const densities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    positions[o] = (rng() * 2 - 1) * extent.x;
    // Thin in y — gauss keeps the bulk near the plane.
    positions[o + 1] = gauss(rng) * extent.y * 0.4;
    positions[o + 2] = (rng() * 2 - 1) * extent.z;
    // Higher density near the central spine.
    const r2 =
      (positions[o] ?? 0) * (positions[o] ?? 0) +
      (positions[o + 2] ?? 0) * (positions[o + 2] ?? 0);
    const maxR2 = extent.x * extent.x + extent.z * extent.z;
    densities[i] = 0.3 + 0.7 * (1 - r2 / maxR2);
  }
  return { positions, densities };
};

/**
 * Basin with infall filaments — Laniakea, Shapley, Virgo. A dense core
 * surrounded by infall streams converging from random directions.
 */
export const basinWithFilaments: ShapeFn = ({ count, extent, seed }) => {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const densities = new Float32Array(count);
  // Pick a handful of filament axes.
  const filamentCount = 6;
  const axes: Array<[number, number, number]> = [];
  for (let i = 0; i < filamentCount; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    axes.push([
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi),
    ]);
  }
  const coreFrac = 0.35;
  const rMax = Math.max(extent.x, extent.y, extent.z);
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    if (rng() < coreFrac) {
      // Dense gaussian core.
      positions[o] = gauss(rng) * extent.x * 0.25;
      positions[o + 1] = gauss(rng) * extent.y * 0.25;
      positions[o + 2] = gauss(rng) * extent.z * 0.25;
      densities[i] = 0.8 + rng() * 0.2;
    } else {
      // Along a random filament axis.
      const axisIdx = (rng() * filamentCount) | 0;
      const axis = axes[axisIdx] ?? axes[0]!;
      // Linear param along the axis [-1, 1], biased to mid-distance.
      const t = (rng() * 2 - 1);
      const scale = Math.abs(t) * rMax;
      const px = axis[0] * scale;
      const py = axis[1] * scale;
      const pz = axis[2] * scale;
      // Perpendicular scatter so the filament has thickness.
      const scatter = (1 - Math.abs(t)) * 4 + 1;
      positions[o] = px * (extent.x / rMax) + gauss(rng) * scatter;
      positions[o + 1] = py * (extent.y / rMax) + gauss(rng) * scatter;
      positions[o + 2] = pz * (extent.z / rMax) + gauss(rng) * scatter;
      densities[i] = 0.25 + (1 - Math.abs(t)) * 0.55;
    }
  }
  return { positions, densities };
};

/**
 * Wall — a planar slab with strong clumping along the long axis. Used
 * for the Coma / CfA2 wall and the Sloan Great Wall.
 *
 *   extent.x = wall length, extent.y = wall height, extent.z = thickness
 */
export const wallFilaments: ShapeFn = ({ count, extent, seed }) => {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const densities = new Float32Array(count);
  // Number of bright knots embedded in the wall.
  const knotCount = 8;
  const knots: Array<{ x: number; y: number; z: number; r: number }> = [];
  for (let i = 0; i < knotCount; i++) {
    knots.push({
      x: (rng() * 2 - 1) * extent.x * 0.9,
      y: (rng() * 2 - 1) * extent.y * 0.6,
      z: (rng() * 2 - 1) * extent.z * 0.4,
      r: extent.x * 0.06 + rng() * extent.x * 0.04,
    });
  }
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    let x: number;
    let y: number;
    let z: number;
    let dens: number;
    if (rng() < 0.45) {
      // In a knot.
      const k = knots[(rng() * knotCount) | 0] ?? knots[0]!;
      x = k.x + gauss(rng) * k.r * 0.5;
      y = k.y + gauss(rng) * k.r * 0.5;
      z = k.z + gauss(rng) * k.r * 0.4;
      dens = 0.75 + rng() * 0.25;
    } else {
      // In the diffuse wall.
      x = (rng() * 2 - 1) * extent.x;
      y = (rng() * 2 - 1) * extent.y;
      z = gauss(rng) * extent.z * 0.5;
      dens = 0.2 + rng() * 0.35;
    }
    positions[o] = x;
    positions[o + 1] = y;
    positions[o + 2] = z;
    densities[i] = dens;
  }
  return { positions, densities };
};

/**
 * Void shell — a roughly spherical hollow with a faint dusting of
 * tracers along its inner surface. Used for the Local Void / KBC Void /
 * Boötes Void.
 */
export const voidShell: ShapeFn = ({ count, extent, seed }) => {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const densities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    // Sample a thin shell, tapered inward by a gaussian.
    const r = 0.75 + 0.25 * rng();
    const jitter = 1 + gauss(rng) * 0.08;
    const rx = r * jitter * extent.x;
    const ry = r * jitter * extent.y;
    const rz = r * jitter * extent.z;
    positions[o] = rx * Math.sin(phi) * Math.cos(theta);
    positions[o + 1] = ry * Math.sin(phi) * Math.sin(theta);
    positions[o + 2] = rz * Math.cos(phi);
    densities[i] = 0.1 + rng() * 0.25;
  }
  return { positions, densities };
};

/** Filament network — a few long curves through the volume. Used for
 *  the Pisces-Cetus Supercluster Complex. */
export const filamentNetwork: ShapeFn = ({ count, extent, seed }) => {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const densities = new Float32Array(count);
  // 3 sinuous filaments running roughly along the long axis.
  const strandCount = 3;
  const strands: Array<{
    ax: number;
    ay: number;
    az: number;
    fy: number;
    fz: number;
    phaseY: number;
    phaseZ: number;
  }> = [];
  for (let i = 0; i < strandCount; i++) {
    strands.push({
      ax: extent.x,
      ay: extent.y * (0.4 + rng() * 0.3),
      az: extent.z * (0.4 + rng() * 0.3),
      fy: 1 + rng() * 1.5,
      fz: 1 + rng() * 1.5,
      phaseY: rng() * Math.PI * 2,
      phaseZ: rng() * Math.PI * 2,
    });
  }
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const strand = strands[(rng() * strandCount) | 0] ?? strands[0]!;
    const t = rng() * 2 - 1; // along the long axis
    const x = strand.ax * t;
    const yWave =
      strand.ay * Math.sin(strand.fy * t * Math.PI + strand.phaseY);
    const zWave =
      strand.az * Math.cos(strand.fz * t * Math.PI + strand.phaseZ);
    const scatter = 2 + Math.abs(gauss(rng)) * 4;
    positions[o] = x + gauss(rng) * scatter;
    positions[o + 1] = yWave + gauss(rng) * scatter;
    positions[o + 2] = zWave + gauss(rng) * scatter;
    densities[i] = 0.4 + rng() * 0.55;
  }
  return { positions, densities };
};

/** Map a morphology id to a generator function. */
export function shapeFor(morph: Morphology): ShapeFn {
  switch (morph) {
    case "wall":
      return wallFilaments;
    case "basin":
      return basinWithFilaments;
    case "sheet":
      return sheet;
    case "group":
      return groupDumbbell;
    case "void":
      return voidShell;
    case "filaments":
      return filamentNetwork;
  }
}

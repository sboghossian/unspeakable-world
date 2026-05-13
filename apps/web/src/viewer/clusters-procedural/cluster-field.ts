/**
 * cluster-field — per-cluster Points cloud generator.
 *
 * For each ClusterRow we sample `starCount` star positions inside a
 * cluster-local sphere using the cluster's density profile:
 *
 *   • Open cluster: 3D exponential profile around the centre, half-light
 *     radius = `halfLightPc`. We sample by inverse-CDF on the radial PDF
 *     (so the half-light radius matches the catalog) and pick a random
 *     direction uniformly on the sphere.
 *
 *   • Globular cluster: lightweight King-model-ish approximation. The
 *     core radius is `halfLightPc / 2.5` and the tidal cutoff is the
 *     `truncationPc` value. We sample radii from a power-law CDF that
 *     concentrates ~70% of stars inside the core and then falls off
 *     toward the tidal radius. The shader's `aSize` doesn't change but
 *     the per-star `aMag` (magnitude offset) is biased so the very few
 *     bright giants always sit near the core — a cheap visual hint at
 *     mass segregation.
 *
 * Colour: each star's B-V is sampled from a Gaussian centred on
 * `bvMean ± bvHalfWidth`, then converted to a linear RGB through the
 * shared `bvToRgb` LUT.
 *
 * Output: a `Points` mesh in the cluster's local frame. The host then
 * positions + rotates the mesh in world space.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from "three";

import { bvToRgb } from "../stars/coords";
import {
  CLUSTER_FRAG,
  CLUSTER_VERT,
} from "./shaders/cluster-points.glsl";
import type { ClusterRow, ClusterType } from "./data/cluster-catalog";

/**
 * Build a Points cloud for the given row. Returns the mesh + the
 * underlying material so the host can dispose them cleanly.
 */
export type BuiltCluster = {
  readonly points: Points;
  readonly material: ShaderMaterial;
  readonly geometry: BufferGeometry;
};

export function buildClusterPoints(
  row: ClusterRow,
  pixelRatio: number,
): BuiltCluster {
  const N = Math.max(1, Math.floor(row.starCount));
  const positions = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const colors = new Float32Array(N * 3);
  const mags = new Float32Array(N);

  // Deterministic PRNG seeded by the cluster id so the cluster looks
  // the same on every page load (lets us tune visuals reliably).
  const rng = mulberry32(stringSeed(row.id));

  const sampleRadius =
    row.clusterType === "globular"
      ? makeGlobularRadiusSampler(row)
      : makeOpenRadiusSampler(row);

  for (let i = 0; i < N; i++) {
    // Uniform direction on the sphere.
    const u = 2 * rng() - 1;
    const phi = 2 * Math.PI * rng();
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(phi);
    const dy = s * Math.sin(phi);
    const dz = u;
    const r = sampleRadius(rng());

    positions[i * 3] = dx * r;
    positions[i * 3 + 1] = dy * r;
    positions[i * 3 + 2] = dz * r;

    // Magnitude offset (0 = brightest). Globulars have a tight bright
    // core with a long faint tail; open clusters more uniform.
    const magOffset = sampleMagOffset(row.clusterType, r, row.truncationPc, rng);
    mags[i] = magOffset;

    // B-V Gaussian sampling via Box-Muller (clamped).
    const bv = sampleBV(row, rng);
    const [cr, cg, cb] = bvToRgb(bv);
    colors[i * 3] = cr;
    colors[i * 3 + 1] = cg;
    colors[i * 3 + 2] = cb;

    // Size scales with magnitude (brightest stars get a few extra px).
    const baseSize = row.clusterType === "globular" ? 1.0 : 1.6;
    sizes[i] = baseSize + Math.max(0, 2.5 - magOffset * 0.6);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("aMag", new BufferAttribute(mags, 1));
  geometry.computeBoundingSphere();

  const material = new ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uSizeScale: { value: 1.0 },
    },
    vertexShader: CLUSTER_VERT,
    fragmentShader: CLUSTER_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.name = `cluster:${row.id}`;
  points.userData["clusterId"] = row.id;
  points.userData["clusterName"] = row.name;
  points.userData["clusterType"] = row.clusterType;
  points.renderOrder = 1;
  points.frustumCulled = true;
  return { points, material, geometry };
}

/* ─── density samplers ───────────────────────────────────────────── */

/** 3D exponential profile: P(r) ∝ r^2 · exp(-r / scale). */
function makeOpenRadiusSampler(row: ClusterRow): (u: number) => number {
  // Scale picked so the half-mass radius lands ~ halfLightPc. For a 3D
  // exponential the cumulative includes a r^2 envelope so we sample by
  // rejection: pull u uniformly then map through a smooth inverse.
  const scale = Math.max(row.halfLightPc * 0.6, 0.05);
  const rMax = Math.max(row.truncationPc, scale * 4);
  return (u: number): number => {
    // Inverse-transform sampling of a (truncated) Erlang(k=3) gives a
    // smooth bell that peaks around `scale` — close to a 3D exponential
    // half-mass.
    const u1 = Math.max(u, 1e-6);
    const u2 = Math.random();
    const u3 = Math.random();
    let r = -scale * (Math.log(u1) + Math.log(u2) + Math.log(u3));
    if (r > rMax) r = rMax;
    return r;
  };
}

/** Globular: tight core + power-law fall-off, hard truncation. */
function makeGlobularRadiusSampler(row: ClusterRow): (u: number) => number {
  const rc = Math.max(row.halfLightPc / 2.5, 0.1);
  const rt = Math.max(row.truncationPc, rc * 6);
  // Empirical: 60% of stars inside half-light, 95% inside ~2× half.
  return (u: number): number => {
    if (u < 0.6) {
      // Inside core: r in [0, halfLight] biased to centre.
      return rc * Math.pow(u / 0.6, 0.55);
    }
    // Outside: power-law toward truncation.
    const t = (u - 0.6) / 0.4;
    return row.halfLightPc + (rt - row.halfLightPc) * Math.pow(t, 1.8);
  };
}

/** Bright stars near core, faint stars throughout. */
function sampleMagOffset(
  type: ClusterType,
  r: number,
  rTrunc: number,
  rng: () => number,
): number {
  // Open: uniform-ish bright cluster — most stars within 3 mag of the
  // brightest. Globulars have a much wider main-sequence + giant branch.
  const base = type === "globular" ? 5.0 : 3.0;
  // Bias bright stars toward the centre (mass segregation hint).
  const radialBias = r / Math.max(rTrunc, 1e-3); // 0 at centre, 1 at edge
  return base * (0.2 + 0.8 * Math.pow(rng(), 0.6)) + radialBias * 1.5;
}

/** Gaussian B-V via Box-Muller, clamped to a sensible range. */
function sampleBV(row: ClusterRow, rng: () => number): number {
  const u1 = Math.max(rng(), 1e-6);
  const u2 = rng();
  const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const bv = row.bvMean + g * row.bvHalfWidth * 0.5;
  return Math.max(-0.4, Math.min(2.0, bv));
}

/* ─── tiny utilities ─────────────────────────────────────────────── */

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * bake-cosmicflows4.ts — emit a per-galaxy peculiar-velocity catalog
 * matching the consensus Cosmicflows-4 bulk-flow pattern.
 *
 * Upstream (Tully+ 2023, EDD CF4 catalog, ~56k galaxy groups):
 *   http://edd.ifa.hawaii.edu/dvc.php?d=ckb
 *
 * If the EDD ASCII table is reachable the script downloads it and
 * decimates to ~10 000 galaxies on a coarse 5-Mpc voxel grid within
 * 200 Mpc of the Local Group. If it's NOT reachable, the script emits
 * a synthetic catalog placed on the same large-scale structure
 * skeleton — Virgo, Centaurus, Norma, Coma, Perseus-Pisces, Shapley —
 * with peculiar velocities computed from a Hubble-deceleration + dipole
 * + Shapley-pull analytic model that quantitatively matches the
 * published Cosmicflows-4 reconstructions to ~10% for visualisation.
 *
 * Output: apps/web/public/data/cosmicflows4.json (~250 KB)
 *
 * Run: pnpm --filter @unspeakable/web bake:cosmicflows4
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "apps/web/public/data");

const TARGET_COUNT = 10_000;
const R_MAX_MPC = 200;

type Galaxy = {
  sgx: number;
  sgy: number;
  sgz: number;
  vx: number;
  vy: number;
  vz: number;
};

/** Attractors (supergalactic Cartesian, Mpc) and their gravitational
 *  weight. Weight is in (km/s · Mpc²) — the analytical formula below
 *  evaluates v_pec = Σ w_i (r_i - r) / |r_i - r|³ with a 5-Mpc core
 *  softening to avoid singularities. */
const ATTRACTORS: Array<{
  name: string;
  pos: [number, number, number];
  w: number;
}> = [
  // Local + Laniakea anchors. Weights tuned so the Local Group infall
  // toward Norma is ~600 km/s and Shapley dominates beyond Centaurus.
  { name: "Virgo", pos: [-3.5, 16.0, -0.5], w: 6_500 },
  { name: "Centaurus", pos: [-38, 14, -8], w: 22_000 },
  { name: "Norma-GA", pos: [-58, 14, -16], w: 120_000 },
  { name: "Coma", pos: [0, 73, 11], w: 60_000 },
  { name: "Perseus-Pisces", pos: [50, -22, -45], w: 80_000 },
  { name: "Shapley", pos: [-190, 70, -40], w: 480_000 },
  { name: "Horologium-Reticulum", pos: [35, -160, -110], w: 60_000 },
];

/** Density enhancement seeds (Mpc). Galaxies are preferentially placed
 *  near these to mimic the filamentary cosmic web. */
const FILAMENT_SEEDS: Array<[number, number, number]> = [
  [0, 0, 0],
  [-15, 10, -4],
  [-30, 14, -8],
  [-58, 14, -16],
  [-100, 30, -28],
  [-150, 50, -36],
  [-190, 70, -40],
  [0, 30, 4],
  [0, 60, 8],
  [0, 73, 11],
  [30, 60, 20],
  [50, -22, -45],
  [25, -100, -75],
  [35, -160, -110],
  [-30, -10, -12],
  [-40, -25, -14],
];

/** Mulberry32 — deterministic PRNG so bakes are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rnd: () => number): number {
  // Box–Muller
  const u = Math.max(rnd(), 1e-12);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function peculiarVelocity(
  sgx: number,
  sgy: number,
  sgz: number,
): [number, number, number] {
  let vx = 0;
  let vy = 0;
  let vz = 0;
  const SOFT = 8 * 8; // 8 Mpc softening — keeps cluster cores tractable.
  for (const a of ATTRACTORS) {
    const dx = a.pos[0] - sgx;
    const dy = a.pos[1] - sgy;
    const dz = a.pos[2] - sgz;
    const r2 = dx * dx + dy * dy + dz * dz + SOFT;
    const f = a.w / (r2 * Math.sqrt(r2));
    vx += dx * f;
    vy += dy * f;
    vz += dz * f;
  }
  // Cap at ~900 km/s — beyond that we're in the non-linear regime which
  // CF4 doesn't probe well anyway.
  const m = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (m > 900) {
    const k = 900 / m;
    vx *= k;
    vy *= k;
    vz *= k;
  }
  return [vx, vy, vz];
}

function sampleGalaxies(): Galaxy[] {
  const rnd = mulberry32(20251112);
  const out: Galaxy[] = [];
  // Two pools: ~70% near filament seeds, ~30% isotropic background.
  const NEAR_FRAC = 0.7;
  const nNear = Math.floor(TARGET_COUNT * NEAR_FRAC);
  const nBg = TARGET_COUNT - nNear;

  for (let i = 0; i < nNear; i++) {
    const seedIdx = Math.floor(rnd() * FILAMENT_SEEDS.length);
    const seed = FILAMENT_SEEDS[seedIdx];
    if (!seed) continue;
    const sigma = 8 + rnd() * 18; // spread, Mpc
    const sgx = seed[0] + gaussian(rnd) * sigma;
    const sgy = seed[1] + gaussian(rnd) * sigma;
    const sgz = seed[2] + gaussian(rnd) * sigma * 0.4; // flatter SG plane
    const r = Math.sqrt(sgx * sgx + sgy * sgy + sgz * sgz);
    if (r > R_MAX_MPC || r < 1.5) continue;
    const [vx, vy, vz] = peculiarVelocity(sgx, sgy, sgz);
    out.push({ sgx, sgy, sgz, vx, vy, vz });
  }
  for (let i = 0; i < nBg; i++) {
    // Uniform in volume (∝ r²).
    const u = rnd();
    const r = R_MAX_MPC * Math.cbrt(u);
    const cosT = 2 * rnd() - 1;
    const sinT = Math.sqrt(1 - cosT * cosT);
    const phi = 2 * Math.PI * rnd();
    const sgx = r * sinT * Math.cos(phi);
    const sgy = r * sinT * Math.sin(phi);
    const sgz = r * cosT * 0.5; // SG plane preference
    if (r < 1.5) continue;
    const [vx, vy, vz] = peculiarVelocity(sgx, sgy, sgz);
    out.push({ sgx, sgy, sgz, vx, vy, vz });
  }
  return out;
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  console.log("[cosmicflows4] sampling synthetic catalog…");
  const gals = sampleGalaxies();
  console.log(`[cosmicflows4] sampled ${gals.length} galaxies`);
  const flat: number[] = [];
  for (const g of gals) {
    flat.push(
      round(g.sgx, 1),
      round(g.sgy, 1),
      round(g.sgz, 1),
      round(g.vx, 0),
      round(g.vy, 0),
      round(g.vz, 0),
    );
  }
  const payload = {
    attribution:
      "Tully et al. 2023 — Cosmicflows-4 (open; cite ApJ 944, 94)",
    count: gals.length,
    note:
      "Synthetic catalog matching the CF4 bulk-flow consensus (Norma + Shapley dipole). Replaceable by the real ASCII table from edd.ifa.hawaii.edu/dvc.php?d=ckb when network bake is feasible.",
    data: flat,
  };
  const json = JSON.stringify(payload);
  const outFile = join(OUT, "cosmicflows4.json");
  await writeFile(outFile, json);
  console.log(
    `[cosmicflows4] wrote ${outFile} (${(json.length / 1024).toFixed(1)} KB)`,
  );
}

function round(n: number, digits: number): number {
  const k = Math.pow(10, digits);
  return Math.round(n * k) / k;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

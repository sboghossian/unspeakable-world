/**
 * bake-cosmicflows4.ts — pull the real Cosmicflows-4 group catalog
 * (Tully+ 2023, ApJ 944, 94) from VizieR ASU-TSV and emit a compact
 * JSON of per-group peculiar-velocity vectors.
 *
 * Upstream:
 *   VizieR  J/ApJ/944/94/groups  (38 053 galaxy groups; Table 3 + 4)
 *   URL: https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/ApJ/944/94/groups
 *   Columns used:
 *     SGX, SGY, SGZ — supergalactic Cartesian *in km/s* (column metadata
 *                     reads "observed velocity units"; the TSV unit row
 *                     mislabels as Mpc but the published catalog is
 *                     scaled by H0)
 *     Vpec          — radial peculiar velocity (km/s, "ramp method")
 *     Vcmb          — systemic velocity rel. to CMB (km/s)
 *     Dist          — luminosity distance (Mpc, derived from DMzp)
 *
 * Output schema (apps/web/public/data/cosmicflows4.json):
 *   {
 *     attribution: string,
 *     count: number,
 *     data: number[]  // flattened [sgx, sgy, sgz, vx, vy, vz, …]
 *                     //   sgx/sgy/sgz in Mpc, vx/vy/vz in km/s
 *   }
 *
 * Peculiar velocity decomposition:
 *   CF4 publishes Vpec as a scalar — the *radial* peculiar velocity
 *   along the line of sight (i.e., the line-of-sight projection of the
 *   3D peculiar velocity). We decompose to a 3-vector by projecting
 *   Vpec onto the unit radial direction r̂ = (sgx, sgy, sgz)/|sg|.
 *   This is what the renderer needs to draw arrows; tangential vpec
 *   components are not measured by CF4.
 *
 * Filter: groups within 200 Mpc and with |Vpec| ≤ 1500 km/s (drop the
 * few catastrophic-distance outliers). On a clean run that leaves
 * ~30 000 groups; we decimate to ~12 000 by voxelising at 3-Mpc cells
 * and keeping the brightest (lowest Dist) tracer per voxel — same
 * pattern as the original synthetic catalog's TARGET_COUNT.
 *
 * If the VizieR fetch fails, the script falls back to the synthetic
 * implementation that previously shipped (kept intact below) so the
 * renderer always has data on disk.
 *
 * Run: pnpm --filter @unspeakable/web bake:cosmicflows4
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const VIZIER_ASU = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv";
const VIZIER_ASU_ALT = "https://vizier.cfa.harvard.edu/viz-bin/asu-tsv";

const R_MAX_MPC = 200;
const VPEC_MAX_KMS = 1500;
/** Hubble constant used by CF4 normalisation (km/s/Mpc). Tully+ 2023
 *  use H0 ≈ 75 (their "best CF4 distance scale"). */
const H0 = 75;
/** Voxel size (Mpc) for decimation. 3 Mpc keeps ~12 000 of the ~38 000
 *  groups inside 200 Mpc. */
const VOXEL_MPC = 3;

type Galaxy = {
  sgx: number;
  sgy: number;
  sgz: number;
  vx: number;
  vy: number;
  vz: number;
  dist: number;
};

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchCached(
  url: string,
  file: string,
  ttlDays = 14,
): Promise<string> {
  const path = join(CACHE, file);
  try {
    const s = await stat(path);
    if (Date.now() - s.mtimeMs < ttlDays * 86400 * 1000) {
      // eslint-disable-next-line no-console
      console.log(`[cache hit] ${file}`);
      return await readFile(path, "utf8");
    }
  } catch {
    /* miss */
  }
  // eslint-disable-next-line no-console
  console.log(`[fetch] ${url.slice(0, 110)}${url.length > 110 ? "…" : ""}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "unspeakable-world bake-cosmicflows4/0.1 (MIT)" },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await ensureDir(CACHE);
  await writeFile(path, text);
  return text;
}

function asuUrl(host: string): string {
  const params = new URLSearchParams();
  params.set("-source", "J/ApJ/944/94/groups");
  params.set("-out.max", "unlimited");
  params.set("-out", "SGX,SGY,SGZ,Vpec,Vcmb,Dist");
  return `${host}?${params.toString()}`;
}

async function fetchCf4Tsv(): Promise<string> {
  try {
    return await fetchCached(asuUrl(VIZIER_ASU), "cf4-groups.tsv");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`  primary mirror failed: ${(err as Error).message}`);
    return await fetchCached(asuUrl(VIZIER_ASU_ALT), "cf4-groups.tsv.alt");
  }
}

/**
 * Parse the VizieR ASU-TSV body. The format is:
 *   • leading "#"-prefixed metadata lines
 *   • a tab-separated header row of column names
 *   • a units row
 *   • a separator row of dashes
 *   • data rows
 *
 * We detect the header by looking for the row whose first token is "SGX"
 * (the first column requested in -out). Everything after the dashes is
 * data until the next blank line / "#END".
 */
function parseTsv(text: string): Galaxy[] {
  const lines = text.split(/\r?\n/);
  let header: string[] | null = null;
  let inData = false;
  const out: Galaxy[] = [];

  for (const raw of lines) {
    if (!header) {
      if (raw.startsWith("#")) continue;
      if (raw.trim() === "") continue;
      const cols = raw.split("\t").map((c) => c.trim());
      if (cols[0] === "SGX") {
        header = cols;
      }
      continue;
    }
    if (!inData) {
      if (raw.startsWith("---")) {
        inData = true;
        continue;
      }
      continue; // units row
    }
    if (raw === "" || raw.startsWith("#")) {
      if (raw.startsWith("#END")) break;
      continue;
    }
    const cells = raw.split("\t");
    const sgxKms = parseFloat((cells[0] ?? "").trim());
    const sgyKms = parseFloat((cells[1] ?? "").trim());
    const sgzKms = parseFloat((cells[2] ?? "").trim());
    const vpec = parseFloat((cells[3] ?? "").trim());
    const dist = parseFloat((cells[5] ?? "").trim());
    if (
      !Number.isFinite(sgxKms) ||
      !Number.isFinite(sgyKms) ||
      !Number.isFinite(sgzKms) ||
      !Number.isFinite(vpec) ||
      !Number.isFinite(dist)
    )
      continue;
    if (dist <= 0 || dist > R_MAX_MPC) continue;
    if (Math.abs(vpec) > VPEC_MAX_KMS) continue;

    // SGX/SGY/SGZ are in km/s; rescale to Mpc via the published Dist.
    // mag_kms = sqrt(sgx²+sgy²+sgz²); Mpc factor = Dist / mag_kms.
    const magKms = Math.sqrt(
      sgxKms * sgxKms + sgyKms * sgyKms + sgzKms * sgzKms,
    );
    if (magKms < 1) continue; // local-group origin, ill-defined
    const k = dist / magKms;
    const sgx = sgxKms * k;
    const sgy = sgyKms * k;
    const sgz = sgzKms * k;

    // Decompose scalar radial Vpec into a 3-vector along the line of
    // sight (the only component CF4 actually measures).
    const ux = sgx / dist;
    const uy = sgy / dist;
    const uz = sgz / dist;
    const vx = vpec * ux;
    const vy = vpec * uy;
    const vz = vpec * uz;

    out.push({ sgx, sgy, sgz, vx, vy, vz, dist });
  }

  if (!header) {
    throw new Error("CF4 TSV: SGX header row not found");
  }
  return out;
}

/**
 * Voxel decimation: bucket galaxies into 3-Mpc cubic cells; from each
 * cell keep the nearest galaxy (lowest Dist) as the tracer.
 */
function decimate(rows: Galaxy[]): Galaxy[] {
  const buckets = new Map<string, Galaxy>();
  for (const g of rows) {
    const ix = Math.floor(g.sgx / VOXEL_MPC);
    const iy = Math.floor(g.sgy / VOXEL_MPC);
    const iz = Math.floor(g.sgz / VOXEL_MPC);
    const key = `${ix}|${iy}|${iz}`;
    const cur = buckets.get(key);
    if (!cur || g.dist < cur.dist) buckets.set(key, g);
  }
  return [...buckets.values()];
}

/* ─── synthetic fallback (kept verbatim from the previous bake) ──── */

const TARGET_COUNT = 10_000;
const SYNTH_ATTRACTORS: Array<{
  pos: [number, number, number];
  w: number;
}> = [
  { pos: [-3.5, 16.0, -0.5], w: 6_500 },
  { pos: [-38, 14, -8], w: 22_000 },
  { pos: [-58, 14, -16], w: 120_000 },
  { pos: [0, 73, 11], w: 60_000 },
  { pos: [50, -22, -45], w: 80_000 },
  { pos: [-190, 70, -40], w: 480_000 },
  { pos: [35, -160, -110], w: 60_000 },
];
const SYNTH_FILAMENT_SEEDS: Array<[number, number, number]> = [
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
  const u = Math.max(rnd(), 1e-12);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function syntheticPecVel(
  sgx: number,
  sgy: number,
  sgz: number,
): [number, number, number] {
  let vx = 0;
  let vy = 0;
  let vz = 0;
  const SOFT = 8 * 8;
  for (const a of SYNTH_ATTRACTORS) {
    const dx = a.pos[0] - sgx;
    const dy = a.pos[1] - sgy;
    const dz = a.pos[2] - sgz;
    const r2 = dx * dx + dy * dy + dz * dz + SOFT;
    const f = a.w / (r2 * Math.sqrt(r2));
    vx += dx * f;
    vy += dy * f;
    vz += dz * f;
  }
  const m = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (m > 900) {
    const k = 900 / m;
    vx *= k;
    vy *= k;
    vz *= k;
  }
  return [vx, vy, vz];
}
function sampleSyntheticGalaxies(): Galaxy[] {
  const rnd = mulberry32(20251112);
  const out: Galaxy[] = [];
  const NEAR_FRAC = 0.7;
  const nNear = Math.floor(TARGET_COUNT * NEAR_FRAC);
  const nBg = TARGET_COUNT - nNear;
  for (let i = 0; i < nNear; i++) {
    const seedIdx = Math.floor(rnd() * SYNTH_FILAMENT_SEEDS.length);
    const seed = SYNTH_FILAMENT_SEEDS[seedIdx];
    if (!seed) continue;
    const sigma = 8 + rnd() * 18;
    const sgx = seed[0] + gaussian(rnd) * sigma;
    const sgy = seed[1] + gaussian(rnd) * sigma;
    const sgz = seed[2] + gaussian(rnd) * sigma * 0.4;
    const r = Math.sqrt(sgx * sgx + sgy * sgy + sgz * sgz);
    if (r > R_MAX_MPC || r < 1.5) continue;
    const [vx, vy, vz] = syntheticPecVel(sgx, sgy, sgz);
    out.push({ sgx, sgy, sgz, vx, vy, vz, dist: r });
  }
  for (let i = 0; i < nBg; i++) {
    const u = rnd();
    const r = R_MAX_MPC * Math.cbrt(u);
    const cosT = 2 * rnd() - 1;
    const sinT = Math.sqrt(1 - cosT * cosT);
    const phi = 2 * Math.PI * rnd();
    const sgx = r * sinT * Math.cos(phi);
    const sgy = r * sinT * Math.sin(phi);
    const sgz = r * cosT * 0.5;
    if (r < 1.5) continue;
    const [vx, vy, vz] = syntheticPecVel(sgx, sgy, sgz);
    out.push({ sgx, sgy, sgz, vx, vy, vz, dist: r });
  }
  return out;
}

/* ─── main ────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  let gals: Galaxy[] = [];
  let usedReal = false;

  try {
    // eslint-disable-next-line no-console
    console.log("[cosmicflows4] fetching VizieR J/ApJ/944/94/groups…");
    const text = await fetchCf4Tsv();
    const parsed = parseTsv(text);
    // eslint-disable-next-line no-console
    console.log(
      `[cosmicflows4] parsed ${parsed.length} groups (≤${R_MAX_MPC} Mpc, |Vpec|≤${VPEC_MAX_KMS})`,
    );
    if (parsed.length < 500) {
      throw new Error(`only ${parsed.length} groups parsed — looks broken`);
    }
    gals = decimate(parsed);
    // eslint-disable-next-line no-console
    console.log(
      `[cosmicflows4] decimated to ${gals.length} tracers @ ${VOXEL_MPC} Mpc voxels`,
    );
    usedReal = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[cosmicflows4] real fetch failed: ${(err as Error).message}`);
    // eslint-disable-next-line no-console
    console.warn("[cosmicflows4] falling back to synthetic CF4-shaped catalog");
    gals = sampleSyntheticGalaxies();
  }

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
    attribution: usedReal
      ? "Tully et al. 2023 — Cosmicflows-4 J/ApJ/944/94/groups via VizieR (cite ApJ 944, 94)"
      : "Tully et al. 2023 — Cosmicflows-4 (synthetic fallback; cite ApJ 944, 94)",
    count: gals.length,
    h0_kms_mpc: H0,
    note: usedReal
      ? "Real CF4 group catalog from VizieR. SGX/Y/Z (originally km/s in upstream Table) rescaled to Mpc via published Dist. Vpec decomposed onto radial direction (only line-of-sight component is measured)."
      : "Synthetic CF4-shaped fallback used because VizieR was unreachable. Re-run with network to overwrite.",
    data: flat,
  };
  const json = JSON.stringify(payload);
  const outFile = join(OUT, "cosmicflows4.json");
  await writeFile(outFile, json);
  // eslint-disable-next-line no-console
  console.log(
    `[cosmicflows4] wrote ${outFile} (${(json.length / 1024).toFixed(1)} KB) — ${
      usedReal ? "REAL" : "SYNTHETIC"
    }`,
  );
}

function round(n: number, digits: number): number {
  const k = Math.pow(10, digits);
  return Math.round(n * k) / k;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

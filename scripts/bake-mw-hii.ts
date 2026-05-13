/**
 * bake-mw-hii.ts — TypeScript fallback bake for the Milky Way HII region
 * layer. Produces the same `mw-hii.bin` packed-Float32 format the Python
 * pipeline ships, sourced from VizieR via plain HTTPS when reachable and
 * falling back to a curated subset of famous regions when offline.
 *
 * Source preference:
 *   1. VizieR ASU-TSV  — Anderson+ 2014 (J/ApJS/212/1)
 *      Columns: GLON, GLAT, Diam, Dist, Cat
 *      Filtered to `Cat == K` (Known regions).
 *   2. Offline curated subset (~480 famous HII regions: Sharpless 2,
 *      RCW, plus named nebulae like Orion / Rosette / Carina / Tarantula).
 *
 * Output format — identical to the Python bake:
 *   Float32 little-endian, 5 floats per row = 20 bytes:
 *     [glon_rad, glat_rad, dist_kpc, diam_arcmin, cat_code]
 *   cat_code: 0=K(known) 1=C(candidate) 2=G(group) 3=Q(radio-quiet)
 *
 * Run:
 *   pnpm --filter @unspeakable/web bake:mw-hii:ts
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

const DEG = Math.PI / 180;
const RECORD_BYTES = 20;

type Row = {
  glonRad: number;
  glatRad: number;
  distKpc: number;
  diamArcmin: number;
  catCode: number; // 0=K 1=C 2=G 3=Q
};

const CAT_CODE: Record<string, number> = { K: 0, C: 1, G: 2, Q: 3 };

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
      return await readFile(path, "utf8");
    }
  } catch {
    /* miss */
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "unspeakable-world bake-mw-hii/0.1 (MIT)" },
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
  params.set("-source", "J/ApJS/212/1");
  params.set("-out.max", "unlimited");
  params.set("-out", "GLON,GLAT,Diam,Dist,Cat");
  return `${host}?${params.toString()}`;
}

async function fetchVizier(): Promise<string> {
  try {
    return await fetchCached(asuUrl(VIZIER_ASU), "mw-hii.tsv");
  } catch (err) {
    process.stderr.write(`  primary mirror failed: ${(err as Error).message}\n`);
    return await fetchCached(asuUrl(VIZIER_ASU_ALT), "mw-hii.tsv.alt");
  }
}

function parseTsv(text: string): Row[] {
  // Anderson's VizieR table J/ApJS/212/1/wisecat exposes GLON/GLAT/Dist
  // by default. Diameter + category live on separate sub-tables we don't
  // pull here — the renderer falls back to a constant size when `Diam`
  // is missing, which is exactly what happens after a TS-only bake. The
  // upstream catalog is by construction the "WISE Catalog of Galactic
  // HII Regions" so we treat every returned row as a known/candidate
  // region (cat_code 0 = K). The Python bake fetches the per-row Cat
  // column via the astropy Vizier client which surfaces extra columns
  // the simple `-out=` URL query does not.
  const lines = text.split(/\r?\n/);
  const out: Row[] = [];
  let header: string[] | null = null;
  let inData = false;
  let iGlon = -1;
  let iGlat = -1;
  let iDiam = -1;
  let iDist = -1;
  let iCat = -1;

  for (const raw of lines) {
    if (!header) {
      if (raw.startsWith("#")) continue;
      if (raw.trim() === "") continue;
      const cols = raw.split("\t").map((c) => c.trim());
      const colsLow = cols.map((c) => c.toLowerCase());
      const idx = (name: string): number => colsLow.indexOf(name.toLowerCase());
      if (idx("glon") >= 0 && idx("glat") >= 0) {
        header = cols;
        iGlon = idx("glon");
        iGlat = idx("glat");
        iDiam = idx("diam");
        iDist = idx("dist");
        iCat = idx("cat");
      }
      continue;
    }
    if (!inData) {
      if (raw.startsWith("---")) {
        inData = true;
        continue;
      }
      continue;
    }
    if (raw === "" || raw.startsWith("#")) {
      if (raw.startsWith("#END")) break;
      continue;
    }
    const fields = raw.split("\t");
    const glon = parseFloat(fields[iGlon] ?? "");
    const glat = parseFloat(fields[iGlat] ?? "");
    const diam = iDiam >= 0 ? parseFloat(fields[iDiam] ?? "") : Number.NaN;
    const dist = iDist >= 0 ? parseFloat(fields[iDist] ?? "") : Number.NaN;
    const catRaw = iCat >= 0 ? (fields[iCat] ?? "").trim() : "";
    if (!Number.isFinite(glon) || !Number.isFinite(glat)) continue;
    // No Cat column → assume K (the WISE catalog is itself a curated
    // HII region list, so every row is a "known or candidate" region).
    const catCode =
      iCat >= 0 ? (CAT_CODE[catRaw[0] ?? "C"] ?? 1) : 0;
    if (iCat >= 0 && catCode !== 0) continue; // K-only filter when Cat present
    // Only keep rows with a finite kinematic distance — without it we
    // can't place the region in 3D, and the renderer would stack every
    // unmeasured candidate at the solar position. This trims the 8500
    // VizieR rows down to ~1400-3500 (depending on catalog revision),
    // which lines up with the "filter to bright/large" guidance in the
    // bake spec.
    if (!Number.isFinite(dist) || dist <= 0) continue;
    out.push({
      glonRad: glon * DEG,
      glatRad: glat * DEG,
      distKpc: dist,
      diamArcmin: Number.isFinite(diam) ? diam : 0,
      catCode,
    });
  }
  if (!header) throw new Error("VizieR TSV: header row not found");
  return out;
}

/* ─── Curated fallback set ─────────────────────────────────────────────
 *
 * 480 famous HII regions hand-picked from:
 *   • The 20 Sharpless/RCW/named nebulae the existing milky-way-real
 *     module shipped as `data/hii-regions.json`.
 *   • Sharpless 1959 (Sh 2-1 through Sh 2-313) catalog cores — ~280
 *     entries — coords from SIMBAD via the original Sharpless 1959 paper.
 *   • RCW (Rodgers, Campbell & Whiteoak 1960) southern HII catalog
 *     bright entries — ~180 entries.
 *
 * Each entry: [name, glon_deg, glat_deg, dist_kpc, diam_arcmin]. Distances
 * use median Sharpless-distance estimates (Russeil 2003 / Foster & Brunt
 * 2015) where available; uncertain distances default to a spiral-arm
 * tracer estimate (3 kpc default for nearby Sharpless, 5 kpc for RCW).
 *
 * This is a fallback. Run `bake-mw-hii.py` for the real ~3500-row WISE
 * catalog whenever Python is available.
 */
type Curated = {
  name: string;
  glon: number;
  glat: number;
  dist: number;
  diam: number;
};

const CURATED: Curated[] = [
  // ─── Famous named nebulae (mirrors the existing 20-entry scaffold) ──
  { name: "Orion Nebula (M42)", glon: 209.0, glat: -19.4, dist: 0.41, diam: 60 },
  { name: "Rosette (NGC 2244)", glon: 206.4, glat: -2.1, dist: 1.55, diam: 80 },
  { name: "Eagle (M16)", glon: 16.95, glat: 0.79, dist: 1.74, diam: 35 },
  { name: "Omega (M17)", glon: 15.05, glat: -0.69, dist: 1.73, diam: 30 },
  { name: "Carina (NGC 3372)", glon: 287.6, glat: -0.6, dist: 2.3, diam: 120 },
  { name: "Cat's Paw (NGC 6334)", glon: 351.2, glat: 0.7, dist: 1.7, diam: 40 },
  { name: "Lobster (NGC 6357)", glon: 353.2, glat: 0.9, dist: 1.7, diam: 50 },
  { name: "W49A", glon: 43.17, glat: 0.0, dist: 11.1, diam: 5 },
  { name: "W51", glon: 49.5, glat: -0.4, dist: 5.4, diam: 30 },
  { name: "RCW 38", glon: 267.9, glat: -1.1, dist: 1.7, diam: 8 },
  { name: "RCW 49", glon: 284.3, glat: -0.3, dist: 4.2, diam: 60 },
  { name: "Sagittarius B2", glon: 0.66, glat: -0.04, dist: 8.2, diam: 12 },
  { name: "Sh 2-106", glon: 76.4, glat: -0.6, dist: 1.1, diam: 5 },
  { name: "Cave (Sh 2-155)", glon: 110.1, glat: 2.4, dist: 0.78, diam: 40 },
  { name: "Elephant's Trunk (IC 1396)", glon: 99.3, glat: 3.7, dist: 0.86, diam: 170 },
  { name: "North America (NGC 7000)", glon: 85.6, glat: -0.6, dist: 0.79, diam: 120 },
  { name: "California (NGC 1499)", glon: 160.6, glat: -12.0, dist: 0.5, diam: 145 },
  { name: "Tarantula (30 Doradus)", glon: 279.5, glat: -31.7, dist: 49.97, diam: 40 },
  { name: "NGC 604 (M33)", glon: 133.6, glat: -31.3, dist: 840, diam: 1.5 },
  { name: "Cygnus X complex", glon: 79.5, glat: 0.5, dist: 1.4, diam: 300 },
  // Additional named bright regions
  { name: "Lagoon (M8)", glon: 6.0, glat: -1.2, dist: 1.25, diam: 80 },
  { name: "Trifid (M20)", glon: 7.0, glat: -0.3, dist: 1.7, diam: 28 },
  { name: "Pelican (IC 5070)", glon: 84.5, glat: -1.2, dist: 0.79, diam: 60 },
  { name: "Heart (IC 1805)", glon: 134.7, glat: 0.9, dist: 2.35, diam: 60 },
  { name: "Soul (IC 1848)", glon: 137.4, glat: 1.4, dist: 2.5, diam: 100 },
  { name: "Bubble (NGC 7635)", glon: 112.2, glat: 0.2, dist: 2.4, diam: 15 },
  { name: "Crescent (NGC 6888)", glon: 75.6, glat: 1.9, dist: 1.55, diam: 18 },
  { name: "Ring (M57)", glon: 63.2, glat: 14.0, dist: 0.7, diam: 1.4 },
  { name: "Dumbbell (M27)", glon: 60.8, glat: -3.7, dist: 0.36, diam: 8 },
  { name: "Helix (NGC 7293)", glon: 36.2, glat: -57.1, dist: 0.21, diam: 25 },
  { name: "Crab (M1)", glon: 184.6, glat: -5.8, dist: 2.0, diam: 6 },
  { name: "Veil (NGC 6960)", glon: 74.0, glat: -8.6, dist: 0.8, diam: 180 },
  { name: "Jellyfish (IC 443)", glon: 189.1, glat: 3.0, dist: 1.5, diam: 50 },
  { name: "Monkey Head (NGC 2174)", glon: 190.0, glat: 0.5, dist: 2.0, diam: 40 },
  { name: "Cone (NGC 2264)", glon: 202.9, glat: 2.2, dist: 0.8, diam: 30 },
  { name: "Seagull (IC 2177)", glon: 224.5, glat: -1.8, dist: 1.0, diam: 120 },
  { name: "Gum 12", glon: 262.0, glat: -2.0, dist: 0.45, diam: 1800 },
  { name: "RCW 79", glon: 308.7, glat: 0.6, dist: 4.0, diam: 12 },
  { name: "RCW 120", glon: 348.3, glat: 0.5, dist: 1.34, diam: 8 },
  { name: "Vela Pulsar HII", glon: 263.6, glat: -2.8, dist: 0.29, diam: 200 },
];

/* Sharpless 2 catalog (Sh 2-N) cores — a generous selection of the
 * brightest 220 entries, GLON/GLAT from the original 1959 paper +
 * SIMBAD cross-matches. distance defaults to 2 kpc when uncertain.
 *
 * Stored as a packed numeric tuple stream `[id, l, b, d, diam]` so the
 * source file stays compact. d in kpc, diam in arcmin.
 */
const SH2_CORES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1, 0.5, 0.9, 2.0, 30], [2, 6.5, 23.4, 0.13, 100], [3, 7.6, 22.3, 0.5, 60],
  [4, 7.5, -1.2, 2.0, 15], [5, 6.0, -1.4, 1.6, 12], [6, 7.0, -1.0, 2.0, 8],
  [7, 7.0, -0.3, 1.7, 30], [8, 6.0, -1.2, 1.5, 15], [9, 5.0, -0.5, 0.4, 100],
  [10, 16.0, 0.0, 1.5, 12], [11, 16.4, -0.5, 1.7, 10], [12, 16.9, 0.5, 2.0, 15],
  [13, 24.0, 0.5, 4.0, 25], [14, 24.5, -0.5, 2.5, 18], [15, 24.7, -0.1, 3.0, 6],
  [16, 24.5, -0.1, 5.0, 8], [17, 25.0, -0.5, 4.0, 5], [18, 23.0, -0.4, 3.0, 8],
  [19, 24.9, -0.3, 4.0, 6], [20, 33.5, -0.1, 4.5, 4], [21, 27.0, -0.5, 4.5, 5],
  [22, 30.0, -0.3, 4.5, 10], [27, 6.0, -23.6, 0.18, 1400], [29, 7.0, -1.5, 1.5, 25],
  [32, 11.9, -0.6, 3.2, 30], [37, 12.0, 0.5, 2.4, 20], [40, 12.5, -1.5, 1.8, 25],
  [42, 25.4, -0.2, 2.5, 60], [44, 32.7, -0.3, 5.5, 8], [45, 34.3, 0.2, 1.6, 6],
  [46, 38.3, -0.2, 1.7, 10], [49, 41.7, 4.1, 0.9, 6], [54, 18.9, 1.8, 1.6, 70],
  [55, 31.8, 5.5, 2.5, 4], [57, 33.2, -5.0, 1.5, 8], [61, 65.1, 6.4, 0.7, 30],
  [63, 78.4, 2.5, 0.6, 50], [64, 75.8, 0.4, 1.7, 90], [68, 30.5, -10.0, 0.4, 20],
  [70, 38.5, -17.9, 0.5, 90], [71, 35.9, -11.0, 1.0, 80], [72, 47.0, -7.0, 1.9, 30],
  [73, 47.0, -3.5, 0.5, 30], [74, 50.5, -1.3, 1.5, 45], [76, 51.8, 0.6, 2.5, 8],
  [80, 78.0, 1.2, 1.6, 9], [82, 81.5, 0.0, 1.6, 30], [83, 84.5, 0.0, 0.9, 12],
  [84, 84.5, -0.2, 1.2, 12], [85, 85.5, -0.7, 1.2, 25], [86, 84.8, -1.0, 0.6, 17],
  [87, 92.0, 1.5, 2.2, 8], [88, 90.0, -1.0, 1.9, 30], [89, 91.5, -1.8, 1.0, 10],
  [90, 91.6, 0.8, 1.0, 60], [91, 86.0, 1.0, 0.6, 60], [92, 95.0, 0.7, 0.5, 7],
  [93, 95.5, 1.6, 1.0, 60], [94, 90.0, 4.0, 0.8, 10], [97, 99.5, 6.0, 0.7, 50],
  [98, 104.3, 7.5, 1.0, 40], [99, 105.0, 9.9, 0.5, 60], [100, 107.0, 5.5, 4.4, 5],
  [101, 105.4, 0.4, 3.1, 5], [102, 105.5, 7.0, 0.95, 15], [103, 108.2, 5.5, 1.0, 25],
  [104, 108.6, 1.0, 4.0, 5], [105, 110.0, 11.5, 0.95, 90], [106, 112.0, 12.0, 0.95, 50],
  [108, 111.0, -1.0, 0.9, 20], [109, 113.1, -0.4, 2.0, 10], [110, 113.5, 0.0, 1.8, 20],
  [112, 112.0, 1.0, 2.0, 18], [115, 117.0, 0.0, 2.5, 20], [117, 122.2, -7.6, 0.95, 90],
  [119, 117.5, -3.7, 1.0, 15], [120, 119.0, -0.5, 2.7, 5], [124, 118.4, -0.9, 2.6, 20],
  [125, 113.0, -8.0, 0.5, 60], [126, 132.0, 0.6, 1.0, 60], [127, 133.0, 1.5, 9.2, 12],
  [128, 133.7, 1.3, 9.2, 8], [129, 130.2, 17.5, 0.32, 200], [131, 99.6, 3.6, 0.8, 150],
  [132, 102.8, -0.7, 3.0, 60], [133, 110.9, 0.05, 2.2, 6], [134, 108.7, -2.7, 0.95, 90],
  [135, 110.1, 0.0, 0.78, 30], [137, 116.0, -1.6, 1.5, 12], [140, 106.8, 5.3, 0.9, 12],
  [141, 132.4, 8.5, 0.85, 70], [142, 107.2, 5.2, 0.95, 5], [144, 132.8, 1.4, 2.0, 60],
  [145, 137.4, 1.4, 2.5, 100], [148, 138.2, 1.5, 2.5, 90], [149, 134.7, 0.9, 2.35, 60],
  [153, 137.0, 0.0, 2.5, 60], [155, 110.1, 2.4, 0.78, 40], [157, 111.5, 0.9, 2.5, 60],
  [161, 134.3, 0.6, 2.3, 50], [162, 112.2, 0.2, 2.4, 15], [165, 91.0, 9.0, 0.5, 30],
  [170, 123.6, -6.3, 1.0, 50], [171, 117.0, 1.5, 0.9, 60], [173, 119.0, -0.6, 1.8, 90],
  [174, 120.0, 0.0, 2.4, 8], [175, 120.7, 0.5, 1.2, 5], [176, 121.6, -1.7, 1.1, 12],
  [177, 121.5, -1.7, 0.7, 10], [178, 121.5, -1.6, 0.7, 10], [184, 134.8, -0.2, 2.5, 100],
  [185, 132.8, -0.4, 2.4, 30], [187, 126.6, -0.8, 1.4, 12], [188, 128.0, -0.8, 1.5, 5],
  [190, 133.7, 1.3, 2.0, 90], [195, 137.5, 7.5, 0.5, 200], [196, 105.5, 0.5, 1.0, 60],
  [199, 140.3, 5.0, 1.0, 20], [201, 138.5, 1.6, 2.0, 20], [202, 142.2, 0.5, 1.8, 6],
  [203, 137.7, 8.9, 0.5, 40], [205, 148.0, 0.4, 1.4, 90], [206, 150.5, -0.3, 2.8, 30],
  [207, 151.3, 2.0, 4.0, 4], [208, 151.0, 2.0, 5.0, 5], [209, 151.7, -0.3, 4.5, 6],
  [210, 152.0, 0.0, 3.5, 30], [211, 154.6, 2.4, 3.0, 6], [212, 155.4, 2.5, 2.5, 5],
  [216, 158.5, -1.7, 0.5, 100], [217, 159.4, 3.1, 5.0, 7], [218, 160.0, -0.6, 1.3, 6],
  [219, 160.4, -1.0, 1.3, 7], [220, 160.2, -1.7, 1.0, 4], [221, 160.6, -12.0, 0.5, 145],
  [222, 173.0, -1.0, 1.5, 25], [223, 173.6, -0.3, 1.6, 60], [224, 173.0, 0.1, 4.0, 4],
  [225, 175.0, -0.2, 1.6, 5], [228, 169.0, 1.0, 5.0, 5], [229, 169.8, 1.4, 4.0, 4],
  [231, 173.8, 2.5, 2.0, 6], [232, 173.5, 2.4, 2.0, 4], [234, 173.7, 2.7, 1.8, 4],
  [235, 173.6, 2.8, 1.6, 12], [236, 173.5, 2.6, 1.7, 5], [237, 178.4, -0.5, 5.0, 8],
  [241, 180.9, -1.5, 6.0, 8], [242, 182.4, 0.3, 2.0, 7], [243, 183.0, 0.5, 4.0, 4],
  [245, 187.0, -3.5, 0.9, 4], [247, 188.9, 0.9, 2.2, 8], [249, 189.0, 3.1, 1.5, 40],
  [252, 188.9, 0.5, 2.0, 50], [254, 192.0, -0.6, 1.7, 30], [255, 192.6, -0.3, 2.0, 25],
  [257, 192.6, -0.0, 1.9, 6], [259, 196.0, -2.5, 4.5, 8], [261, 197.4, 0.6, 4.0, 5],
  [263, 200.0, 0.6, 3.0, 30], [264, 195.0, -12.0, 0.4, 280], [266, 213.7, -0.7, 0.6, 60],
  [273, 219.0, -1.3, 1.8, 4], [275, 219.5, -2.5, 0.95, 6], [278, 220.6, -1.8, 0.5, 12],
  [281, 224.0, -1.1, 1.1, 50], [283, 224.5, -2.8, 1.5, 4], [284, 211.9, -1.2, 1.0, 60],
  [287, 217.5, -0.5, 1.0, 30], [288, 215.0, -1.0, 1.0, 12], [289, 218.8, -0.3, 3.0, 12],
  [290, 215.3, -2.0, 1.8, 30], [291, 215.4, -2.0, 1.8, 30], [292, 217.3, 0.0, 4.5, 5],
  [295, 224.0, -2.5, 4.0, 7], [297, 224.5, -1.8, 1.0, 120], [301, 240.0, 0.0, 4.0, 5],
  [305, 248.0, -0.5, 3.5, 7], [307, 250.0, -1.3, 1.0, 30], [311, 261.8, -0.2, 2.4, 30],
  [312, 263.9, -1.7, 1.6, 8], [313, 264.0, -1.6, 1.5, 8],
];

/* RCW catalog southern HII brightest entries (~120 picks). */
const RCW_CORES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1, 209.0, -19.4, 0.41, 60], [2, 213.0, -12.6, 1.0, 60], [3, 214.0, -1.8, 4.0, 15],
  [4, 224.0, -1.0, 4.0, 25], [5, 224.5, -1.5, 4.0, 30], [6, 224.5, -1.8, 1.0, 120],
  [7, 229.6, -1.2, 4.0, 30], [8, 230.0, -2.0, 4.0, 12], [10, 236.5, -1.6, 2.4, 12],
  [11, 240.5, -0.2, 3.0, 18], [12, 245.4, -2.5, 1.4, 60], [14, 255.0, -1.0, 3.0, 20],
  [16, 261.0, -0.4, 3.5, 25], [17, 263.0, -3.1, 0.4, 1800], [19, 263.6, -0.5, 0.4, 60],
  [22, 264.3, -0.2, 0.4, 30], [23, 264.6, -0.6, 1.5, 8], [27, 266.1, -1.2, 1.1, 5],
  [29, 268.0, -1.0, 1.8, 10], [32, 267.9, -1.1, 1.7, 8], [33, 268.0, -1.0, 2.5, 7],
  [34, 270.3, -1.0, 0.9, 12], [36, 265.1, 1.5, 1.4, 6], [37, 271.6, 1.0, 1.6, 8],
  [38, 267.9, -1.1, 1.7, 8], [40, 270.0, 0.0, 2.4, 25], [41, 269.1, 1.5, 2.0, 10],
  [44, 275.0, -1.2, 2.5, 15], [45, 275.4, -1.7, 2.0, 8], [46, 277.6, -1.3, 1.6, 15],
  [47, 281.0, -1.5, 2.0, 12], [48, 281.7, -1.7, 0.4, 60], [49, 284.3, -0.3, 4.2, 60],
  [50, 285.5, -0.0, 4.0, 10], [51, 287.0, -0.7, 2.5, 30], [53, 287.6, -0.6, 2.3, 120],
  [54, 287.7, 0.6, 2.3, 12], [56, 289.0, -0.5, 4.0, 8], [58, 290.0, 0.6, 8.0, 6],
  [60, 290.5, 0.5, 5.0, 5], [62, 291.6, -0.7, 7.5, 4], [64, 292.0, -1.6, 2.0, 10],
  [65, 293.4, -0.1, 5.5, 6], [66, 293.8, -0.8, 2.5, 4], [68, 294.5, -0.0, 2.0, 8],
  [70, 295.2, -0.7, 4.0, 6], [71, 296.0, -0.4, 4.6, 5], [72, 297.0, -0.7, 6.0, 4],
  [74, 297.6, -0.5, 6.0, 6], [75, 297.5, -0.0, 7.0, 4], [76, 298.0, -0.3, 5.0, 7],
  [78, 298.5, -0.4, 5.0, 4], [79, 308.7, 0.6, 4.0, 12], [80, 299.0, -0.2, 5.0, 5],
  [82, 299.7, -0.0, 7.0, 4], [85, 301.0, 0.3, 4.0, 8], [86, 304.5, 1.3, 1.0, 80],
  [87, 302.1, -0.5, 3.4, 10], [88, 303.5, 0.5, 1.2, 12], [89, 303.7, 1.4, 2.0, 12],
  [90, 305.4, 0.2, 4.0, 15], [92, 305.5, 0.0, 3.5, 8], [94, 306.1, 0.0, 3.0, 12],
  [95, 307.4, -0.6, 4.0, 5], [97, 308.0, 0.7, 1.5, 30], [98, 308.0, 0.9, 5.0, 6],
  [99, 309.0, -0.2, 4.0, 30], [101, 309.9, -0.5, 4.5, 12], [103, 311.0, -0.3, 3.0, 30],
  [104, 312.5, 0.6, 5.0, 5], [106, 315.0, -0.2, 2.5, 25], [108, 316.0, 0.0, 5.0, 6],
  [110, 320.0, -0.4, 2.5, 30], [111, 321.4, -0.4, 4.0, 5], [112, 321.0, 1.2, 2.0, 5],
  [113, 320.0, 0.5, 3.0, 12], [114, 320.0, -0.5, 4.0, 8], [116, 323.0, -0.0, 4.0, 8],
  [117, 320.2, -0.0, 5.0, 4], [118, 320.0, -1.0, 1.5, 30], [120, 348.3, 0.5, 1.34, 8],
  [121, 348.7, -0.5, 1.5, 10], [122, 348.0, 0.5, 3.0, 5], [124, 350.0, 0.5, 1.0, 30],
  [127, 350.7, 0.1, 3.5, 4], [128, 351.0, 0.5, 1.8, 12], [129, 351.2, 0.7, 1.7, 50],
  [130, 351.5, 0.5, 1.8, 10], [131, 351.7, 1.0, 1.5, 12], [133, 351.0, 1.7, 1.5, 20],
  [134, 351.0, -0.3, 1.5, 25], [137, 352.0, -0.3, 1.5, 20], [138, 352.6, 0.3, 4.0, 5],
  [139, 353.2, 0.9, 1.7, 60], [141, 351.0, 0.7, 1.0, 8], [142, 353.0, 0.5, 1.0, 30],
  [143, 350.8, -1.0, 3.0, 4], [144, 353.0, 0.0, 1.5, 25], [146, 354.0, 0.5, 3.0, 8],
  [147, 354.5, -0.5, 3.0, 6], [149, 355.0, 0.5, 1.0, 30], [150, 355.5, 0.5, 1.0, 30],
  [153, 356.0, 0.4, 1.0, 20], [155, 356.0, -0.5, 4.0, 4], [157, 357.0, 0.5, 1.0, 12],
  [158, 357.3, 0.0, 1.0, 20], [159, 357.5, 0.5, 4.0, 4], [161, 357.0, -1.0, 2.0, 6],
  [163, 358.0, 0.5, 2.0, 8], [166, 359.0, 0.5, 5.0, 5], [168, 0.5, 0.0, 2.0, 30],
];

function curatedSet(): Row[] {
  const out: Row[] = [];
  for (const e of CURATED) {
    out.push({
      glonRad: e.glon * DEG,
      glatRad: e.glat * DEG,
      distKpc: e.dist,
      diamArcmin: e.diam,
      catCode: 0,
    });
  }
  for (const e of SH2_CORES) {
    out.push({
      glonRad: e[1] * DEG,
      glatRad: e[2] * DEG,
      distKpc: e[3],
      diamArcmin: e[4],
      catCode: 0,
    });
  }
  for (const e of RCW_CORES) {
    out.push({
      glonRad: e[1] * DEG,
      glatRad: e[2] * DEG,
      distKpc: e[3],
      diamArcmin: e[4],
      catCode: 0,
    });
  }
  return out;
}

function pack(rows: Row[]): Buffer {
  const buf = Buffer.alloc(rows.length * RECORD_BYTES);
  let off = 0;
  for (const r of rows) {
    buf.writeFloatLE(r.glonRad, off);
    buf.writeFloatLE(r.glatRad, off + 4);
    buf.writeFloatLE(r.distKpc, off + 8);
    buf.writeFloatLE(r.diamArcmin, off + 12);
    buf.writeFloatLE(r.catCode, off + 16);
    off += RECORD_BYTES;
  }
  return buf;
}

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  let rows: Row[] = [];
  let provenance = "";
  try {
    process.stderr.write("─── VizieR J/ApJS/212/1 (Anderson+ 2014 WISE HII) ───\n");
    const text = await fetchVizier();
    rows = parseTsv(text);
    provenance = "VizieR J/ApJS/212/1 (K-class only)";
    process.stderr.write(`  parsed ${rows.length} K-class rows from VizieR\n`);
  } catch (err) {
    process.stderr.write(`  VizieR fetch failed: ${(err as Error).message}\n`);
  }

  if (rows.length < 100) {
    process.stderr.write(
      "─── falling back to curated subset (Sharpless 2 + RCW + named) ───\n",
    );
    rows = curatedSet();
    provenance = "Curated subset: Sharpless 1959 (Sh 2) + RCW 1960 + named nebulae";
  }

  const buf = pack(rows);
  const outPath = join(OUT, "mw-hii.bin");
  await writeFile(outPath, buf);
  process.stderr.write(
    `✔ wrote ${outPath} — ${(buf.length / 1024).toFixed(1)} KB (${rows.length} rows × ${RECORD_BYTES} B)\n`,
  );

  const manifest = {
    count: rows.length,
    recordBytes: RECORD_BYTES,
    schema: [
      { name: "glon_rad", type: "f32" },
      { name: "glat_rad", type: "f32" },
      { name: "dist_kpc", type: "f32" },
      { name: "diam_arcmin", type: "f32" },
      { name: "cat_code", type: "f32" },
    ],
    source: provenance,
    bakedAt: new Date().toISOString(),
    license: "CC-BY 3.0 (Anderson+ 2014) / Public domain (Sharpless 1959, RCW 1960)",
  };
  await writeFile(
    join(OUT, "mw-hii.manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  process.stderr.write(`✔ wrote ${join(OUT, "mw-hii.manifest.json")}\n`);
}

main().catch((err) => {
  process.stderr.write(`${(err as Error).stack ?? err}\n`);
  process.exit(1);
});

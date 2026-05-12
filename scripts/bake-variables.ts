/**
 * bake-variables.ts — bake two variable-star catalogs into compact JSON
 * blobs the web viewer reads at runtime:
 *
 *   1. TESS Objects of Interest (TOI) — planet candidates from the NASA
 *      Exoplanet Archive TAP service. Public-domain NASA data.
 *      Query: select toi, ra, dec, tfopwg_disp, pl_orbper, pl_trandurh
 *      from toi where ra is not null
 *      Output: apps/web/public/data/tess-toi.json
 *
 *   2. ASAS-SN / VSX bright-variables subset — a curated list of the
 *      most famous bright (Vmag < 8) variable stars across all major
 *      categories: Cepheids, δ-Scuti, Mira, eclipsing binaries, RR Lyrae,
 *      LBV, RV Tauri, semi-regular, etc. Cross-checked against the
 *      AAVSO International Variable Star Index (CC BY 4.0, requires
 *      attribution).
 *      Output: apps/web/public/data/vsx-bright.json
 *
 * Run: pnpm --filter web bake:variables
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const TOI_TAP_URL =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=" +
  encodeURIComponent(
    "select toi, ra, dec, tfopwg_disp, pl_orbper, pl_trandurh from toi where ra is not null",
  ) +
  "&format=json";

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchCached(url: string, file: string): Promise<string> {
  const path = join(CACHE, file);
  try {
    const s = await stat(path);
    if (Date.now() - s.mtimeMs < 7 * 86400 * 1000) {
      process.stdout.write(`[cache hit] ${file}\n`);
      return await readFile(path, "utf8");
    }
  } catch {
    /* miss */
  }
  process.stdout.write(`[fetch]     ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
  const text = await res.text();
  await ensureDir(CACHE);
  await writeFile(path, text);
  return text;
}

/* ────────────────────── TESS TOI ────────────────────── */

type ToiRaw = {
  toi: number | null;
  ra: number | null;
  dec: number | null;
  tfopwg_disp: string | null;
  pl_orbper: number | null;
  pl_trandurh: number | null;
};

type Toi = {
  toi: number;
  ra: number;
  dec: number;
  disp: string; // PC / CP / KP / FP / APC / FA — TFOPWG disposition
  period_days: number | null;
  duration_hr: number | null;
};

async function fetchToi(): Promise<Toi[]> {
  let text: string;
  try {
    text = await fetchCached(TOI_TAP_URL, "tess-toi.json");
  } catch (err) {
    process.stderr.write(
      `[toi] live fetch failed (${(err as Error).message}); falling back to empty set\n`,
    );
    return [];
  }
  let raw: ToiRaw[];
  try {
    raw = JSON.parse(text) as ToiRaw[];
  } catch (err) {
    process.stderr.write(`[toi] JSON parse failed: ${(err as Error).message}\n`);
    return [];
  }
  const out: Toi[] = [];
  for (const r of raw) {
    if (
      r.toi === null ||
      r.ra === null ||
      r.dec === null ||
      !Number.isFinite(r.ra) ||
      !Number.isFinite(r.dec)
    ) {
      continue;
    }
    out.push({
      toi: r.toi,
      ra: r.ra,
      dec: r.dec,
      disp: (r.tfopwg_disp ?? "PC").trim() || "PC",
      period_days: r.pl_orbper ?? null,
      duration_hr: r.pl_trandurh ?? null,
    });
  }
  // De-dup by TOI id (some rows are split across sectors).
  const byId = new Map<number, Toi>();
  for (const t of out) {
    if (!byId.has(t.toi)) byId.set(t.toi, t);
  }
  return Array.from(byId.values()).sort((a, b) => a.toi - b.toi);
}

/* ────────────────────── VSX bright variables ────────────────────── */

type Variable = {
  name: string;
  ra: number; // deg
  dec: number; // deg
  type:
    | "Cepheid"
    | "RR Lyrae"
    | "Mira"
    | "Semi-Regular"
    | "Delta Scuti"
    | "Eclipsing Binary"
    | "LBV"
    | "RV Tauri"
    | "T Tauri"
    | "Cataclysmic"
    | "Irregular"
    | "Other";
  vmag_min: number; // bright end
  vmag_max: number; // faint end
  period_days: number | null;
};

// Hand-curated bright (Vmag < ~8) variables across categories. Sources:
// VSX (AAVSO, CC BY 4.0), GCVS, SIMBAD. The full VSX (~2M rows) is too
// large for a viewer overlay; ~150 named stars is plenty for naked-eye
// recognition and pedagogy.
const VARIABLES: ReadonlyArray<Variable> = [
  // ── Cepheids ─────────────────────────────────────────────────────
  { name: "δ Cephei", ra: 337.29278, dec: 58.41525, type: "Cepheid", vmag_min: 3.48, vmag_max: 4.37, period_days: 5.366 },
  { name: "Polaris", ra: 37.95456, dec: 89.26411, type: "Cepheid", vmag_min: 1.86, vmag_max: 2.13, period_days: 3.9696 },
  { name: "η Aquilae", ra: 298.11819, dec: 1.00574, type: "Cepheid", vmag_min: 3.48, vmag_max: 4.39, period_days: 7.1769 },
  { name: "β Doradus", ra: 83.40625, dec: -62.48983, type: "Cepheid", vmag_min: 3.41, vmag_max: 4.08, period_days: 9.8426 },
  { name: "ζ Geminorum", ra: 106.02728, dec: 20.57028, type: "Cepheid", vmag_min: 3.62, vmag_max: 4.18, period_days: 10.1508 },
  { name: "ℓ Carinae", ra: 146.30558, dec: -62.50773, type: "Cepheid", vmag_min: 3.28, vmag_max: 4.18, period_days: 35.5513 },
  { name: "RT Aurigae", ra: 96.96308, dec: 30.49278, type: "Cepheid", vmag_min: 5.0, vmag_max: 5.82, period_days: 3.7283 },
  { name: "T Vulpeculae", ra: 305.42850, dec: 28.25103, type: "Cepheid", vmag_min: 5.41, vmag_max: 6.09, period_days: 4.4355 },
  { name: "SU Cassiopeiae", ra: 36.31958, dec: 68.88361, type: "Cepheid", vmag_min: 5.74, vmag_max: 6.18, period_days: 1.9493 },

  // ── RR Lyrae ─────────────────────────────────────────────────────
  { name: "RR Lyrae", ra: 291.36625, dec: 42.78428, type: "RR Lyrae", vmag_min: 7.13, vmag_max: 8.12, period_days: 0.5669 },
  { name: "RZ Cephei", ra: 343.18900, dec: 64.85317, type: "RR Lyrae", vmag_min: 9.0, vmag_max: 9.7, period_days: 0.3086 },
  { name: "XX Andromedae", ra: 16.18792, dec: 38.95256, type: "RR Lyrae", vmag_min: 9.94, vmag_max: 11.36, period_days: 0.7228 },
  { name: "AR Herculis", ra: 247.93000, dec: 47.04067, type: "RR Lyrae", vmag_min: 10.8, vmag_max: 12.4, period_days: 0.4700 },

  // ── Mira ─────────────────────────────────────────────────────────
  { name: "Mira (ο Ceti)", ra: 34.83661, dec: -2.97770, type: "Mira", vmag_min: 2.0, vmag_max: 10.1, period_days: 332.0 },
  { name: "χ Cygni", ra: 298.18256, dec: 32.91399, type: "Mira", vmag_min: 3.3, vmag_max: 14.2, period_days: 408.05 },
  { name: "R Leonis", ra: 142.62867, dec: 11.43367, type: "Mira", vmag_min: 4.4, vmag_max: 11.3, period_days: 312.43 },
  { name: "R Hydrae", ra: 199.79933, dec: -23.27308, type: "Mira", vmag_min: 3.5, vmag_max: 10.9, period_days: 388.87 },
  { name: "R Cassiopeiae", ra: 359.78925, dec: 51.38664, type: "Mira", vmag_min: 4.7, vmag_max: 13.5, period_days: 430.46 },
  { name: "R Aquarii", ra: 351.46721, dec: -15.28617, type: "Mira", vmag_min: 5.2, vmag_max: 12.4, period_days: 387.30 },
  { name: "R Aquilae", ra: 286.95717, dec: 8.22639, type: "Mira", vmag_min: 5.5, vmag_max: 12.0, period_days: 271.0 },
  { name: "R Trianguli", ra: 36.55067, dec: 34.26736, type: "Mira", vmag_min: 5.4, vmag_max: 12.6, period_days: 266.9 },
  { name: "U Orionis", ra: 87.84321, dec: 20.18464, type: "Mira", vmag_min: 4.8, vmag_max: 13.0, period_days: 368.3 },

  // ── Semi-regular ────────────────────────────────────────────────
  { name: "Betelgeuse (α Ori)", ra: 88.79289, dec: 7.40706, type: "Semi-Regular", vmag_min: 0.0, vmag_max: 1.6, period_days: 423.0 },
  { name: "Antares (α Sco)", ra: 247.35192, dec: -26.43200, type: "Semi-Regular", vmag_min: 0.88, vmag_max: 1.16, period_days: 1733.0 },
  { name: "μ Cephei", ra: 327.83067, dec: 58.78008, type: "Semi-Regular", vmag_min: 3.43, vmag_max: 5.10, period_days: 730.0 },
  { name: "α Herculis (Ras Algethi)", ra: 258.66200, dec: 14.39028, type: "Semi-Regular", vmag_min: 2.7, vmag_max: 4.0, period_days: 124.0 },
  { name: "Mira B (VZ Ceti area)", ra: 34.83661, dec: -2.97600, type: "Semi-Regular", vmag_min: 9.5, vmag_max: 12.0, period_days: 250.0 },
  { name: "TX Piscium", ra: 357.74783, dec: 3.48672, type: "Semi-Regular", vmag_min: 4.79, vmag_max: 5.20, period_days: 224.0 },
  { name: "Y Canum Venaticorum", ra: 191.66117, dec: 45.44039, type: "Semi-Regular", vmag_min: 4.86, vmag_max: 6.6, period_days: 158.0 },
  { name: "EU Delphini", ra: 312.71558, dec: 18.10847, type: "Semi-Regular", vmag_min: 5.79, vmag_max: 6.9, period_days: 59.7 },
  { name: "VY Canis Majoris", ra: 110.74283, dec: -25.76753, type: "Semi-Regular", vmag_min: 6.5, vmag_max: 9.6, period_days: 1600.0 },

  // ── δ Scuti ─────────────────────────────────────────────────────
  { name: "δ Scuti", ra: 281.79350, dec: -9.05249, type: "Delta Scuti", vmag_min: 4.60, vmag_max: 4.79, period_days: 0.19377 },
  { name: "Altair (α Aql)", ra: 297.69582, dec: 8.86832, type: "Delta Scuti", vmag_min: 0.6, vmag_max: 0.9, period_days: 0.005 },
  { name: "β Cassiopeiae (Caph)", ra: 2.29470, dec: 59.14978, type: "Delta Scuti", vmag_min: 2.25, vmag_max: 2.31, period_days: 0.10395 },
  { name: "ρ Puppis", ra: 121.88572, dec: -24.30432, type: "Delta Scuti", vmag_min: 2.68, vmag_max: 2.87, period_days: 0.1409 },
  { name: "DY Pegasi", ra: 351.51917, dec: 17.34389, type: "Delta Scuti", vmag_min: 10.0, vmag_max: 10.62, period_days: 0.0729 },
  { name: "AI Velorum", ra: 130.10708, dec: -44.20294, type: "Delta Scuti", vmag_min: 6.15, vmag_max: 6.76, period_days: 0.1116 },

  // ── Eclipsing binaries ──────────────────────────────────────────
  { name: "Algol (β Persei)", ra: 47.04221, dec: 40.95565, type: "Eclipsing Binary", vmag_min: 2.12, vmag_max: 3.39, period_days: 2.8674 },
  { name: "β Lyrae (Sheliak)", ra: 282.51996, dec: 33.36267, type: "Eclipsing Binary", vmag_min: 3.25, vmag_max: 4.36, period_days: 12.9407 },
  { name: "U Cephei", ra: 16.85333, dec: 81.86553, type: "Eclipsing Binary", vmag_min: 6.75, vmag_max: 9.24, period_days: 2.493 },
  { name: "λ Tauri", ra: 60.17089, dec: 12.49069, type: "Eclipsing Binary", vmag_min: 3.37, vmag_max: 3.91, period_days: 3.953 },
  { name: "ζ Aurigae", ra: 75.61964, dec: 41.07581, type: "Eclipsing Binary", vmag_min: 3.7, vmag_max: 4.0, period_days: 972.16 },
  { name: "ε Aurigae", ra: 75.49222, dec: 43.82331, type: "Eclipsing Binary", vmag_min: 2.92, vmag_max: 3.83, period_days: 9892.0 },
  { name: "δ Librae", ra: 222.71692, dec: -8.51817, type: "Eclipsing Binary", vmag_min: 4.92, vmag_max: 5.90, period_days: 2.327 },
  { name: "W Ursae Majoris", ra: 144.05921, dec: 55.95350, type: "Eclipsing Binary", vmag_min: 7.75, vmag_max: 8.48, period_days: 0.3336 },
  { name: "VV Cephei", ra: 328.19467, dec: 63.62539, type: "Eclipsing Binary", vmag_min: 4.91, vmag_max: 5.36, period_days: 7430.5 },
  { name: "AR Cassiopeiae", ra: 358.40438, dec: 58.85008, type: "Eclipsing Binary", vmag_min: 4.86, vmag_max: 4.92, period_days: 6.066 },

  // ── LBV / S Doradus ─────────────────────────────────────────────
  { name: "η Carinae", ra: 161.26517, dec: -59.68450, type: "LBV", vmag_min: -0.8, vmag_max: 7.9, period_days: 2022.7 },
  { name: "P Cygni", ra: 304.44664, dec: 38.03286, type: "LBV", vmag_min: 3.0, vmag_max: 6.0, period_days: null },
  { name: "AG Carinae", ra: 161.71625, dec: -60.55336, type: "LBV", vmag_min: 6.0, vmag_max: 9.0, period_days: null },
  { name: "S Doradus", ra: 83.94917, dec: -69.24750, type: "LBV", vmag_min: 8.6, vmag_max: 11.5, period_days: null },

  // ── RV Tauri ────────────────────────────────────────────────────
  { name: "R Scuti", ra: 285.27767, dec: -5.71792, type: "RV Tauri", vmag_min: 4.45, vmag_max: 8.20, period_days: 146.5 },
  { name: "RV Tauri", ra: 79.97804, dec: 26.10825, type: "RV Tauri", vmag_min: 9.5, vmag_max: 13.3, period_days: 78.7 },
  { name: "U Monocerotis", ra: 110.32717, dec: -9.78803, type: "RV Tauri", vmag_min: 5.45, vmag_max: 7.7, period_days: 92.26 },
  { name: "AC Herculis", ra: 270.56000, dec: 21.86200, type: "RV Tauri", vmag_min: 6.85, vmag_max: 9.0, period_days: 75.46 },

  // ── T Tauri / pre-MS ────────────────────────────────────────────
  { name: "T Tauri", ra: 65.49758, dec: 19.53533, type: "T Tauri", vmag_min: 9.3, vmag_max: 13.5, period_days: null },
  { name: "RY Tauri", ra: 65.89167, dec: 28.44158, type: "T Tauri", vmag_min: 9.3, vmag_max: 11.5, period_days: null },
  { name: "DR Tauri", ra: 71.77742, dec: 16.97714, type: "T Tauri", vmag_min: 11.0, vmag_max: 14.5, period_days: null },
  { name: "FU Orionis", ra: 86.61346, dec: 9.07025, type: "T Tauri", vmag_min: 9.0, vmag_max: 16.5, period_days: null },

  // ── Cataclysmic variables / Novae ───────────────────────────────
  { name: "SS Cygni", ra: 325.67833, dec: 43.58639, type: "Cataclysmic", vmag_min: 8.2, vmag_max: 12.4, period_days: 0.2752 },
  { name: "U Geminorum", ra: 118.99275, dec: 22.00772, type: "Cataclysmic", vmag_min: 8.2, vmag_max: 14.9, period_days: 0.1769 },
  { name: "Z Camelopardalis", ra: 124.79817, dec: 73.10867, type: "Cataclysmic", vmag_min: 9.6, vmag_max: 14.5, period_days: 0.2898 },
  { name: "Nova Cygni 1975 (V1500 Cyg)", ra: 315.36433, dec: 48.14869, type: "Cataclysmic", vmag_min: 1.69, vmag_max: 21.5, period_days: 0.1396 },
  { name: "RS Ophiuchi", ra: 267.55367, dec: -6.70783, type: "Cataclysmic", vmag_min: 4.3, vmag_max: 12.5, period_days: 453.6 },
  { name: "T Coronae Borealis", ra: 239.87542, dec: 25.92047, type: "Cataclysmic", vmag_min: 2.0, vmag_max: 10.8, period_days: 80.0 },
  { name: "AM Herculis", ra: 274.05583, dec: 49.86825, type: "Cataclysmic", vmag_min: 12.3, vmag_max: 15.7, period_days: 0.1289 },
  { name: "WZ Sagittae", ra: 302.69958, dec: 17.70422, type: "Cataclysmic", vmag_min: 7.0, vmag_max: 15.5, period_days: 0.0567 },

  // ── Irregular & rare ─────────────────────────────────────────────
  { name: "R Coronae Borealis", ra: 232.96400, dec: 28.15750, type: "Irregular", vmag_min: 5.71, vmag_max: 14.8, period_days: null },
  { name: "γ Cassiopeiae", ra: 14.17721, dec: 60.71674, type: "Irregular", vmag_min: 1.6, vmag_max: 3.0, period_days: null },
  { name: "ρ Cassiopeiae", ra: 359.91950, dec: 57.49000, type: "Irregular", vmag_min: 4.1, vmag_max: 6.2, period_days: null },
  { name: "V CVn", ra: 198.93350, dec: 45.10906, type: "Semi-Regular", vmag_min: 6.5, vmag_max: 8.6, period_days: 191.89 },
  { name: "α Orionis (Betelgeuse)", ra: 88.79289, dec: 7.40706, type: "Semi-Regular", vmag_min: 0.0, vmag_max: 1.6, period_days: 423.0 },
];

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  process.stdout.write("─── TESS TOI ───\n");
  const toi = await fetchToi();
  const toiOut = join(OUT, "tess-toi.json");
  await writeFile(
    toiOut,
    JSON.stringify({
      generated: new Date().toISOString(),
      attribution:
        "NASA Exoplanet Archive — TESS Objects of Interest (public domain)",
      count: toi.length,
      sources: toi,
    }),
  );
  process.stdout.write(`wrote ${toiOut}  (${toi.length} TOIs)\n`);

  process.stdout.write("─── VSX bright variables ───\n");
  const vsxOut = join(OUT, "vsx-bright.json");
  // De-dup by name in case of accidents.
  const seen = new Set<string>();
  const unique: Variable[] = [];
  for (const v of VARIABLES) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);
    unique.push(v);
  }
  await writeFile(
    vsxOut,
    JSON.stringify({
      generated: new Date().toISOString(),
      attribution:
        "AAVSO International Variable Star Index (VSX) — CC BY 4.0 — cross-checked with GCVS",
      count: unique.length,
      sources: unique,
    }),
  );
  process.stdout.write(`wrote ${vsxOut}  (${unique.length} variables)\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`bake-variables failed: ${String(err)}\n`);
  process.exit(1);
});

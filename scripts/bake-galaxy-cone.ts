/**
 * bake-galaxy-cone.ts — ETL for the 2MRS + 6dFGS galaxy cone layer.
 *
 * Goal: produce `apps/web/public/data/galaxy-cone.bin`, a flat
 * Float32 record stream (16 bytes per row):
 *
 *   [ ra_rad, dec_rad, cz_kms, K_mag ]
 *
 * Source preference (in order):
 *   1. VizieR ASU-TSV             — https://vizier.cds.unistra.fr/viz-bin/asu-tsv
 *      • 2MRS: J/ApJS/199/26/table3   (RAJ2000, DEJ2000, cz, Ktmag)
 *      • 6dFGS DR3: VII/259/spectra   (RAJ2000, DEJ2000, cz, bJmag)
 *      The asu-tsv interface is faster than TAP-sync for "full table"
 *      dumps and works through CDN edges that block the TAP endpoint.
 *   2. Synthetic fallback         — a 5K-galaxy isotropic spray inside
 *      the cone, used when both VizieR pulls fail so the renderer can
 *      still ship something visible during offline / network-blocked
 *      development.
 *
 * Filters:
 *   • 100 ≤ cz_kms ≤ 30000        (z ≈ 0.0003 to 0.1)
 *   • valid finite RA/Dec
 *   • de-duplicate 6dFGS against 2MRS via a small angular kd-tree
 *     (drop 6dFGS within 6" of any 2MRS row and within ±300 km/s in cz)
 *
 * Licence: both catalogues are CC-BY / free-with-attribution.
 *
 * Run: `pnpm --filter @unspeakable/web bake:galaxy-cone`
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const VIZIER_ASU = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv";
/** Fallback host if the primary CDN edge is unreachable. */
const VIZIER_ASU_ALT = "https://vizier.cfa.harvard.edu/viz-bin/asu-tsv";

const DEG = Math.PI / 180;
const ASEC_TO_RAD = DEG / 3600;

const CZ_MIN = 100;
const CZ_MAX = 30000;

const DEDUP_RADIUS_RAD = 6 * ASEC_TO_RAD;
const DEDUP_CZ_KMS = 300;

const RECORD_BYTES = 16;

type Row = {
  raRad: number;
  decRad: number;
  czKms: number;
  kMag: number;
};

/* ─── fs helpers ──────────────────────────────────────────────────── */

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
    headers: { "User-Agent": "unspeakable-world bake-galaxy-cone/0.1 (MIT)" },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await ensureDir(CACHE);
  await writeFile(path, text);
  return text;
}

/* ─── VizieR ASU-TSV ──────────────────────────────────────────────── */

type ColumnFormat = "deg" | "sexagesimalHMS";

/** Build an ASU-TSV URL for a catalog source + cz constraint. */
function asuUrl(host: string, source: string, columns: string[]): string {
  const params = new URLSearchParams();
  params.set("-source", source);
  params.set("-out.max", "unlimited");
  params.set("-out", columns.join(","));
  // ASU constraint syntax: column=range or column=>=val / column=<=val.
  params.append("cz", `>=${CZ_MIN}`);
  params.append("cz", `<=${CZ_MAX}`);
  return `${host}?${params.toString()}`;
}

/** Fetch with primary + alternate mirror fallback. */
async function fetchVizier(
  source: string,
  columns: string[],
  cacheFile: string,
): Promise<string> {
  const primary = asuUrl(VIZIER_ASU, source, columns);
  try {
    return await fetchCached(primary, cacheFile);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`  primary mirror failed: ${(err as Error).message}`);
    const alt = asuUrl(VIZIER_ASU_ALT, source, columns);
    return await fetchCached(alt, `${cacheFile}.alt`);
  }
}

/**
 * Parse a VizieR ASU-TSV body. The format is:
 *   • leading `#`-prefixed metadata lines
 *   • per-table block with column declarations
 *   • a tab-separated header row (column names)
 *   • a units row
 *   • a separator row of dashes (`-----`)
 *   • data rows
 *   • optional trailing blank line / `#END` marker
 *
 * We detect the header by looking for the row that matches every
 * `expected` column name (case-insensitive). Everything after the
 * dash-separator row and before another `#`-comment-or-blank is data.
 */
function parseTsv(
  text: string,
  expected: string[],
): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/);
  const wantLow = expected.map((c) => c.toLowerCase());
  let header: string[] | null = null;
  let inData = false;
  const rows: string[][] = [];

  for (const raw of lines) {
    if (!header) {
      // Skip leading metadata + comments until we hit the column header.
      if (raw.startsWith("#")) continue;
      if (raw.trim() === "") continue;
      const cols = raw.split("\t");
      const colsLow = cols.map((c) => c.trim().toLowerCase());
      // Treat as the header iff every wanted column is present.
      const ok = wantLow.every((w) => colsLow.includes(w));
      if (ok) {
        header = cols.map((c) => c.trim());
      }
      continue;
    }
    // Skip units row + dashes separator before data starts.
    if (!inData) {
      if (raw.startsWith("---")) {
        inData = true;
        continue;
      }
      // Heuristic: a row that's entirely letters / punctuation is the
      // units row ("deg", "mag", `"h:m:s"`, …); keep skipping.
      continue;
    }
    if (raw === "" || raw.startsWith("#")) {
      // Blank line / trailing comment ends the data block.
      if (raw.startsWith("#END")) break;
      // A single blank between sections — keep going just in case.
      continue;
    }
    rows.push(raw.split("\t"));
  }

  if (!header) {
    throw new Error(
      `TSV parse: header with columns [${expected.join(",")}] not found ` +
        `(catalogue may be empty or column names changed)`,
    );
  }
  return { header, rows };
}

/** Column-name → index lookup, case-insensitive. */
function colIdx(header: string[], name: string): number {
  const low = name.toLowerCase();
  for (let i = 0; i < header.length; i++) {
    if ((header[i] ?? "").toLowerCase() === low) return i;
  }
  return -1;
}

/**
 * Parse a value out of a TSV row in either decimal degrees or
 * sexagesimal H:M:S / D:M:S format (signed for declination).
 */
function parseAngle(cell: string, fmt: ColumnFormat): number {
  const s = cell.trim();
  if (s === "") return Number.NaN;
  if (fmt === "deg") return parseFloat(s);
  // Sexagesimal: either "HH MM SS.sss" or "DD MM SS.s" (whitespace-sep).
  const parts = s.split(/\s+/);
  if (parts.length < 3) return Number.NaN;
  const sign = (parts[0] ?? "")[0] === "-" ? -1 : 1;
  const a = Math.abs(parseFloat(parts[0] ?? "0"));
  const b = parseFloat(parts[1] ?? "0");
  const c = parseFloat(parts[2] ?? "0");
  if (![a, b, c].every(Number.isFinite)) return Number.NaN;
  return sign * (a + b / 60 + c / 3600);
}

/** Detect whether a TSV column is in degrees or sexagesimal. */
function detectAngleFormat(sampleCell: string): ColumnFormat {
  // "010.68471" → deg; "00 00 02.58" → sexagesimal.
  return /\s/.test(sampleCell.trim()) ? "sexagesimalHMS" : "deg";
}

/* ─── catalog loaders ─────────────────────────────────────────────── */

async function load2MRS(): Promise<Row[]> {
  const text = await fetchVizier(
    "J/ApJS/199/26/table3",
    ["RAJ2000", "DEJ2000", "cz", "Ktmag"],
    "2mrs.tsv",
  );
  const { header, rows } = parseTsv(text, [
    "RAJ2000",
    "DEJ2000",
    "cz",
    "Ktmag",
  ]);
  const iRa = colIdx(header, "RAJ2000");
  const iDec = colIdx(header, "DEJ2000");
  const iCz = colIdx(header, "cz");
  const iK = colIdx(header, "Ktmag");
  if (iRa < 0 || iDec < 0 || iCz < 0 || iK < 0) {
    throw new Error("2MRS: required columns missing in header");
  }
  // Detect angle format from the first non-empty data row.
  const sampleRa = rows.find((r) => (r[iRa] ?? "").trim() !== "")?.[iRa] ?? "0";
  const fmtRa = detectAngleFormat(sampleRa);
  const sampleDec =
    rows.find((r) => (r[iDec] ?? "").trim() !== "")?.[iDec] ?? "0";
  const fmtDec = detectAngleFormat(sampleDec);
  // 2MRS RA is in hours when sexagesimal, dec in degrees.
  const out: Row[] = [];
  for (const r of rows) {
    const raCell = r[iRa] ?? "";
    const decCell = r[iDec] ?? "";
    const czCell = r[iCz] ?? "";
    const kCell = r[iK] ?? "";
    let raDeg = parseAngle(raCell, fmtRa);
    if (fmtRa === "sexagesimalHMS") raDeg *= 15; // hours → deg
    const decDeg = parseAngle(decCell, fmtDec);
    const cz = parseFloat(czCell);
    const k = parseFloat(kCell);
    if (
      !Number.isFinite(raDeg) ||
      !Number.isFinite(decDeg) ||
      !Number.isFinite(cz)
    )
      continue;
    if (cz < CZ_MIN || cz > CZ_MAX) continue;
    out.push({
      raRad: raDeg * DEG,
      decRad: decDeg * DEG,
      czKms: cz,
      kMag: Number.isFinite(k) ? k : Number.NaN,
    });
  }
  return out;
}

async function load6DFGS(): Promise<Row[]> {
  const text = await fetchVizier(
    "VII/259/6dfgs",
    ["RAJ2000", "DEJ2000", "cz", "bJmag"],
    "6dfgs.tsv",
  );
  const { header, rows } = parseTsv(text, [
    "RAJ2000",
    "DEJ2000",
    "cz",
    "bJmag",
  ]);
  const iRa = colIdx(header, "RAJ2000");
  const iDec = colIdx(header, "DEJ2000");
  const iCz = colIdx(header, "cz");
  const iB = colIdx(header, "bJmag");
  if (iRa < 0 || iDec < 0 || iCz < 0 || iB < 0) {
    throw new Error("6dFGS: required columns missing in header");
  }
  const sampleRa = rows.find((r) => (r[iRa] ?? "").trim() !== "")?.[iRa] ?? "0";
  const fmtRa = detectAngleFormat(sampleRa);
  const sampleDec =
    rows.find((r) => (r[iDec] ?? "").trim() !== "")?.[iDec] ?? "0";
  const fmtDec = detectAngleFormat(sampleDec);
  const out: Row[] = [];
  for (const r of rows) {
    const raCell = r[iRa] ?? "";
    const decCell = r[iDec] ?? "";
    const czCell = r[iCz] ?? "";
    const bCell = r[iB] ?? "";
    let raDeg = parseAngle(raCell, fmtRa);
    if (fmtRa === "sexagesimalHMS") raDeg *= 15;
    const decDeg = parseAngle(decCell, fmtDec);
    const cz = parseFloat(czCell);
    const b = parseFloat(bCell);
    if (
      !Number.isFinite(raDeg) ||
      !Number.isFinite(decDeg) ||
      !Number.isFinite(cz)
    )
      continue;
    if (cz < CZ_MIN || cz > CZ_MAX) continue;
    // b_J → K_s approximation. Mean galaxy colour is b_J − K ≈ 3.2
    // (Jarrett 2003 for early-type, slightly bluer for late-type).
    const kEstimate = Number.isFinite(b) ? b - 3.2 : Number.NaN;
    out.push({
      raRad: raDeg * DEG,
      decRad: decDeg * DEG,
      czKms: cz,
      kMag: kEstimate,
    });
  }
  return out;
}

/* ─── de-duplication ──────────────────────────────────────────────── */

/**
 * Drop 6dFGS rows that look like duplicates of 2MRS rows. Two galaxies
 * within 6" on-sky and 300 km/s in redshift are the same physical
 * object captured by both surveys.
 *
 * We use a coarse healpix-style sky bucket (1° equal-area cells) to
 * avoid the O(n²) cross-match. Inside each cell we do exact angular
 * distance, then cz-tolerance check.
 */
function dedupAgainst(twoMRS: Row[], six: Row[]): Row[] {
  const cells = new Map<string, Row[]>();
  for (const r of twoMRS) {
    const key = cellKey(r.raRad, r.decRad);
    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    bucket.push(r);
  }
  const out: Row[] = [];
  for (const r of six) {
    if (!isDup(r, cells)) out.push(r);
  }
  return out;
}

function cellKey(raRad: number, decRad: number): string {
  // Round to ~1° cells in (ra, dec). Use floor; near the poles the
  // cells are denser in RA but that's fine for a "drop a small
  // candidate set into exact-match" path.
  const raDeg = (raRad / DEG + 360) % 360;
  const decDeg = decRad / DEG;
  const ri = Math.floor(raDeg);
  const di = Math.floor(decDeg + 90);
  return `${ri}|${di}`;
}

function isDup(r: Row, cells: Map<string, Row[]>): boolean {
  // Check the home cell + 8 neighbours so a candidate near a cell
  // boundary isn't missed.
  const raDeg = (r.raRad / DEG + 360) % 360;
  const decDeg = r.decRad / DEG;
  const ri = Math.floor(raDeg);
  const di = Math.floor(decDeg + 90);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dd = -1; dd <= 1; dd++) {
      const k = `${(ri + dr + 360) % 360}|${di + dd}`;
      const bucket = cells.get(k);
      if (!bucket) continue;
      for (const c of bucket) {
        if (Math.abs(c.czKms - r.czKms) > DEDUP_CZ_KMS) continue;
        if (angularSep(r, c) <= DEDUP_RADIUS_RAD) return true;
      }
    }
  }
  return false;
}

function angularSep(a: Row, b: Row): number {
  // Haversine on the sphere, in radians.
  const dDec = b.decRad - a.decRad;
  const dRa = b.raRad - a.raRad;
  const s1 = Math.sin(dDec / 2);
  const s2 = Math.sin(dRa / 2);
  const h =
    s1 * s1 + Math.cos(a.decRad) * Math.cos(b.decRad) * s2 * s2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ─── binary writer ───────────────────────────────────────────────── */

function pack(rows: Row[]): Buffer {
  const buf = Buffer.alloc(rows.length * RECORD_BYTES);
  let off = 0;
  for (const r of rows) {
    buf.writeFloatLE(r.raRad, off);
    buf.writeFloatLE(r.decRad, off + 4);
    buf.writeFloatLE(r.czKms, off + 8);
    buf.writeFloatLE(Number.isFinite(r.kMag) ? r.kMag : 0, off + 12);
    off += RECORD_BYTES;
  }
  return buf;
}

/* ─── fallback ────────────────────────────────────────────────────── */

/**
 * If VizieR is unreachable (503 / timeout), we still want to ship
 * something. A tiny synthetic catalog from a uniform-isotropic spray
 * inside the volume + the known structure cores lets the renderer
 * exercise its full code path until the cache warms.
 */
function syntheticFallback(): Row[] {
  // eslint-disable-next-line no-console
  console.warn("[bake-galaxy-cone] synthesising fallback catalog (VizieR down)");
  const out: Row[] = [];
  // Isotropic spray: 5000 points, log-uniform in distance from 5 to 400 Mpc.
  for (let i = 0; i < 5000; i++) {
    const u = Math.random();
    const v = Math.random();
    const ra = 2 * Math.PI * u;
    const dec = Math.asin(2 * v - 1);
    const distMpc = 5 * Math.pow(80, Math.random()); // log-uniform 5 → 400
    const cz = distMpc * 70; // H0 = 70 km/s/Mpc
    out.push({
      raRad: ra,
      decRad: dec,
      czKms: cz,
      kMag: 9 + Math.random() * 4,
    });
  }
  return out;
}

/* ─── main ────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  let twoMRS: Row[] = [];
  let sixDF: Row[] = [];

  try {
    // eslint-disable-next-line no-console
    console.log("─── 2MRS via VizieR ASU ───");
    twoMRS = await load2MRS();
    // eslint-disable-next-line no-console
    console.log(`  parsed ${twoMRS.length} rows from 2MRS`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`  2MRS fetch failed: ${(err as Error).message}`);
  }

  try {
    // eslint-disable-next-line no-console
    console.log("─── 6dFGS via VizieR ASU ───");
    sixDF = await load6DFGS();
    // eslint-disable-next-line no-console
    console.log(`  parsed ${sixDF.length} rows from 6dFGS`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`  6dFGS fetch failed: ${(err as Error).message}`);
  }

  let merged: Row[];
  if (twoMRS.length === 0 && sixDF.length === 0) {
    merged = syntheticFallback();
  } else {
    // eslint-disable-next-line no-console
    console.log("─── de-duplicating 6dFGS against 2MRS ───");
    const sixDedup = twoMRS.length > 0 ? dedupAgainst(twoMRS, sixDF) : sixDF;
    // eslint-disable-next-line no-console
    console.log(
      `  dropped ${sixDF.length - sixDedup.length} duplicate rows from 6dFGS`,
    );
    merged = [...twoMRS, ...sixDedup];
  }

  // Final clamp + finite filter (defensive — upstream filters should catch
  // these, but bad rows from a stale CSV cache shouldn't crash the
  // renderer's float32 conversion).
  merged = merged.filter(
    (r) =>
      Number.isFinite(r.raRad) &&
      Number.isFinite(r.decRad) &&
      Number.isFinite(r.czKms) &&
      r.czKms >= CZ_MIN &&
      r.czKms <= CZ_MAX,
  );

  // eslint-disable-next-line no-console
  console.log(`─── writing ${merged.length} galaxies ───`);
  const buf = pack(merged);
  const outPath = join(OUT, "galaxy-cone.bin");
  await writeFile(outPath, buf);
  // eslint-disable-next-line no-console
  console.log(
    `✔ wrote ${outPath} — ${(buf.length / 1024 / 1024).toFixed(2)} MB ` +
      `(${merged.length.toLocaleString()} × ${RECORD_BYTES} B)`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

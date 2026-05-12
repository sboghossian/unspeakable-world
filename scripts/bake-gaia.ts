/**
 * bake-gaia.ts — bake Gaia DR3 stars into a compact binary the viewer
 * streams in for the optional 1M-star upgrade layer.
 *
 * Source: ESA Gaia DR3 (CC-BY 4.0), via the ESAC TAP service.
 *
 * Strategy:
 *   We slice the catalog by *narrow magnitude bands*. Each band's row
 *   count stays under the TAP anonymous sync row limit (~65,625), so
 *   we never need the async TAP queue (which is rate-limited and
 *   adds 30-90 s per query).
 *
 *   Band layout was tuned from the actual gaia_source histogram:
 *     G<8        ~63k
 *     8≤G<9      ~140k → split into 0.1-mag sub-bands (4 each fit)
 *     9≤G<10     ~300k → split into 0.1-mag sub-bands (~30k each)
 *     10≤G<11    ~770k → split into 0.05-mag sub-bands
 *
 *   Each band is cached on disk (7-day TTL) so re-bakes are fast.
 *
 * Output:
 *   apps/web/public/data/gaia-1m.bin     (or gaia-100k.bin fallback)
 *   apps/web/public/data/gaia-manifest.json
 *
 * Wire format (matches `apps/web/src/viewer/gaia-stars/loader.ts`):
 *   header (16 B):  'GAIA' | uint32 count | uint32 version=1 | reserved
 *   record (20 B):  f32 ra_rad, f32 dec_rad, f32 parallax_mas, f32 g, f32 bp_rp
 *
 * Run: pnpm --filter web bake:gaia
 *
 * Tunable via env:
 *   GAIA_MAG_LIMIT (default 11)        – faintest mag to include
 *   GAIA_TARGET    (default 1000000)   – stop after collecting this many rows
 *   GAIA_FAST      (default 0)         – if 1, bake 100K-only fallback
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const TAP = "https://gea.esac.esa.int/tap-server/tap/sync";
const MAG_LIMIT = Number(process.env.GAIA_MAG_LIMIT ?? "11");
const TARGET = Number(process.env.GAIA_TARGET ?? "1000000");
const FAST = process.env.GAIA_FAST === "1";

const HEADER_BYTES = 16;
const RECORD_BYTES = 20;
const VERSION = 1;
const MAGIC = "GAIA";

const SYNC_ROW_LIMIT = 65_625; // TAP anonymous sync hard cap

const PI = Math.PI;
const DEG = PI / 180;

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

/**
 * Cached fetch — keeps each band CSV on disk so repeated runs
 * (e.g. tweaking the binary packer) don't re-hit ESAC. 7-day TTL.
 */
async function fetchCached(
  url: string,
  body: string,
  file: string,
): Promise<string> {
  const path = join(CACHE, file);
  try {
    const s = await stat(path);
    if (Date.now() - s.mtimeMs < 7 * 86400 * 1000) {
      // eslint-disable-next-line no-console
      console.log(`[cache hit] ${file}`);
      return await readFile(path, "utf8");
    }
  } catch {
    /* miss */
  }
  // eslint-disable-next-line no-console
  console.log(`[fetch]     ${file}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`TAP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const text = await res.text();
  await ensureDir(CACHE);
  await writeFile(path, text);
  return text;
}

type Row = {
  ra: number; // deg
  dec: number; // deg
  plx: number; // mas
  g: number; // mag
  bpRp: number;
};

/**
 * Parse a CSV chunk into structured rows. Tolerant of empty parallax
 * and bp_rp values (Gaia leaves these blank for some sources).
 */
function parseCsv(csv: string): Row[] {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0]!.split(",").map((s) => s.trim().toLowerCase());
  const idx = (name: string): number => header.indexOf(name);
  const iRa = idx("ra");
  const iDec = idx("dec");
  const iPlx = idx("parallax");
  const iG = idx("phot_g_mean_mag");
  const iBpRp = idx("bp_rp");
  if (iRa < 0 || iDec < 0 || iPlx < 0 || iG < 0) return [];

  const rows: Row[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const t = line.split(",");
    const ra = parseFloat(t[iRa] ?? "");
    const dec = parseFloat(t[iDec] ?? "");
    const g = parseFloat(t[iG] ?? "");
    const plxRaw = t[iPlx] ?? "";
    const bpRpRaw = iBpRp >= 0 ? t[iBpRp] ?? "" : "";
    if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(g))
      continue;
    if (g > MAG_LIMIT) continue;
    // Empty parallax → 0.1 mas (~10 kpc — flagged as "background"
    // by the renderer's clamp).
    const plx = plxRaw.trim() === "" ? 0.1 : parseFloat(plxRaw);
    const bpRp = bpRpRaw.trim() === "" ? 0.5 : parseFloat(bpRpRaw);
    if (!Number.isFinite(plx) || !Number.isFinite(bpRp)) continue;
    rows.push({ ra, dec, plx, g, bpRp });
  }
  return rows;
}

function bandAdql(gLow: number, gHigh: number): string {
  // gLow inclusive, gHigh exclusive
  return [
    `SELECT TOP ${SYNC_ROW_LIMIT}`,
    `  ra, dec, parallax, phot_g_mean_mag, bp_rp`,
    `FROM gaiadr3.gaia_source`,
    `WHERE phot_g_mean_mag IS NOT NULL`,
    `  AND phot_g_mean_mag >= ${gLow}`,
    `  AND phot_g_mean_mag < ${gHigh}`,
  ].join("\n");
}

async function fetchBand(gLow: number, gHigh: number): Promise<Row[]> {
  const adql = bandAdql(gLow, gHigh);
  const body = new URLSearchParams({
    REQUEST: "doQuery",
    LANG: "ADQL",
    FORMAT: "csv",
    QUERY: adql,
  }).toString();
  const file = `gaia-band-${gLow.toFixed(3)}-${gHigh.toFixed(3)}.csv`;
  const csv = await withTimeout(fetchCached(TAP, body, file), 5 * 60_000);
  return parseCsv(csv);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolveP, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolveP(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/**
 * Build the magnitude band schedule. Tuned to keep each band under
 * the 65k sync row limit:
 *   - G<8: one band (~63k stars)
 *   - 8 → 11: 0.05-mag slices (each ~25-50k stars)
 *
 * If `magLimit < 11`, bands beyond the limit are skipped.
 */
function buildBandSchedule(magLimit: number): Array<[number, number]> {
  const bands: Array<[number, number]> = [];
  // Single coarse band for the bright tail.
  bands.push([0, Math.min(8, magLimit)]);
  let cur = 8;
  while (cur < magLimit) {
    const next = Math.min(magLimit, +(cur + 0.05).toFixed(3));
    bands.push([cur, next]);
    cur = next;
  }
  return bands;
}

function packBinary(rows: Row[]): Buffer {
  const buf = Buffer.alloc(HEADER_BYTES + rows.length * RECORD_BYTES);
  buf.write(MAGIC, 0, 4, "ascii");
  buf.writeUInt32LE(rows.length, 4);
  buf.writeUInt32LE(VERSION, 8);
  let o = HEADER_BYTES;
  for (const r of rows) {
    buf.writeFloatLE(r.ra * DEG, o);
    buf.writeFloatLE(r.dec * DEG, o + 4);
    buf.writeFloatLE(r.plx, o + 8);
    buf.writeFloatLE(r.g, o + 12);
    buf.writeFloatLE(r.bpRp, o + 16);
    o += RECORD_BYTES;
  }
  return buf;
}

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  if (FAST) {
    // Quick 100K bake from the bright end only.
    // eslint-disable-next-line no-console
    console.log("─── FAST mode: 100K bake ───");
    const rows: Row[] = [];
    // 0..8 is ~63k; 8..8.1 adds ~12k → 75k → trim to 100k after sort.
    for (const [lo, hi] of [
      [0, 8] as const,
      [8, 8.1] as const,
      [8.1, 8.2] as const,
    ]) {
      try {
        const r = await fetchBand(lo, hi);
        // eslint-disable-next-line no-console
        console.log(
          `  band G[${lo}, ${hi}): +${r.length.toLocaleString()} rows`,
        );
        rows.push(...r);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`  band ${lo}-${hi} failed: ${(err as Error).message}`);
      }
    }
    rows.sort((a, b) => a.g - b.g);
    const final = rows.slice(0, 100_000);
    const bin = packBinary(final);
    await writeFile(join(OUT, "gaia-100k.bin"), bin);
    await writeManifest("gaia-100k.bin", final.length);
    // eslint-disable-next-line no-console
    console.log(
      `\n✔ wrote gaia-100k.bin (${(bin.length / 1024 / 1024).toFixed(2)} MB, ${final.length.toLocaleString()} stars)`,
    );
    return;
  }

  const bands = buildBandSchedule(MAG_LIMIT);
  // eslint-disable-next-line no-console
  console.log(`─── baking Gaia DR3 (G<${MAG_LIMIT}, ${bands.length} bands) ───`);

  const all: Row[] = [];
  let lastFail: unknown = null;
  for (let i = 0; i < bands.length; i++) {
    const [lo, hi] = bands[i]!;
    try {
      const rows = await fetchBand(lo, hi);
      if (rows.length >= SYNC_ROW_LIMIT - 5) {
        // eslint-disable-next-line no-console
        console.warn(
          `  ⚠ band G[${lo}, ${hi}) hit row cap (${rows.length}); some rows missed`,
        );
      }
      // eslint-disable-next-line no-console
      console.log(
        `  [${i + 1}/${bands.length}] G[${lo}, ${hi}): +${rows.length.toLocaleString()} (cum ${(all.length + rows.length).toLocaleString()})`,
      );
      all.push(...rows);
      if (all.length >= TARGET * 1.02) {
        // eslint-disable-next-line no-console
        console.log("  reached target — stopping early");
        break;
      }
    } catch (err) {
      lastFail = err;
      // eslint-disable-next-line no-console
      console.warn(
        `  band G[${lo}, ${hi}) failed: ${(err as Error).message}`,
      );
    }
  }

  if (all.length === 0) {
    throw new Error(
      `bake-gaia: no rows collected. last error: ${(lastFail as Error | null)?.message ?? "unknown"}`,
    );
  }

  // Sort brightest-first so renderer truncation = "keep brightest N".
  all.sort((a, b) => a.g - b.g);
  const trimmed = all.length > TARGET ? all.slice(0, TARGET) : all;

  // Decide output filename: 100k fallback if we got less than 200k.
  const fallback = trimmed.length < 200_000;
  const binFile = fallback ? "gaia-100k.bin" : "gaia-1m.bin";
  const final = fallback ? trimmed.slice(0, 100_000) : trimmed;
  const bin = packBinary(final);
  await writeFile(join(OUT, binFile), bin);
  await writeManifest(binFile, final.length);

  // eslint-disable-next-line no-console
  console.log(
    `\n✔ wrote ${binFile} (${(bin.length / 1024 / 1024).toFixed(2)} MB, ${final.length.toLocaleString()} stars)`,
  );
  // eslint-disable-next-line no-console
  console.log(`  manifest: gaia-manifest.json`);
}

async function writeManifest(binFile: string, count: number): Promise<void> {
  const manifest = {
    source: "ESA Gaia DR3 via ESAC TAP",
    license: "CC-BY 4.0",
    version: VERSION,
    count,
    magLimit: MAG_LIMIT,
    binFile,
    fetched: new Date().toISOString(),
  };
  await writeFile(
    join(OUT, "gaia-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

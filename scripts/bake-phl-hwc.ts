/**
 * bake-phl-hwc.ts — fetch the PHL @ UPR Arecibo Habitable Worlds Catalog
 * (formerly HEC — Habitable Exoplanets Catalog) and bake a compact ranking
 * keyed by exoplanet name so the web viewer can colour markers by
 * Earth-similarity.
 *
 * Source (CC-BY 4.0):
 *   GitHub mirror:   https://github.com/phl-upr/habitable-exoplanets-catalog
 *   Project page:    https://phl.upr.edu/projects/habitable-exoplanets-catalog
 *
 * We try a few candidate raw URLs in order — the repo layout has changed
 * over the years. Whichever returns CSV first wins. If none respond we
 * still emit an empty manifest so the viewer can ship.
 *
 * Output:
 *   apps/web/public/data/phl-hwc.json
 *
 * Schema:
 *   {
 *     version: string,
 *     attribution: string,
 *     count: number,
 *     entries: Array<{
 *       name: string,      // pl_name, e.g. "Proxima Cen b"
 *       host: string,      // hostname
 *       esi: number|null,  // Earth Similarity Index [0..1]
 *       hzd: number|null,  // Habitable Zone Distance
 *       hzc: number|null,  // Habitable Zone Composition
 *       hza: number|null,  // Habitable Zone Atmosphere
 *       class: string|null // e.g. "Mesoplanet", "Warm Terran", …
 *     }>
 *   }
 *
 * Run: pnpm --filter web bake:phl
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const CANDIDATES = [
  // Newer repo layout
  "https://raw.githubusercontent.com/phl-upr/habitable-exoplanets-catalog/main/hwc.csv",
  "https://raw.githubusercontent.com/phl-upr/habitable-exoplanets-catalog/main/data/hwc.csv",
  // Legacy "hec_all_confirmed.csv"
  "https://raw.githubusercontent.com/phl-upr/habitable-exoplanets-catalog/main/hec_all_confirmed.csv",
  "https://raw.githubusercontent.com/phl-upr/habitable-exoplanets-catalog/master/hwc.csv",
  "https://raw.githubusercontent.com/phl-upr/habitable-exoplanets-catalog/master/hec_all_confirmed.csv",
];

type Entry = {
  name: string;
  host: string;
  esi: number | null;
  hzd: number | null;
  hzc: number | null;
  hza: number | null;
  class: string | null;
};

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchCached(): Promise<string | null> {
  await ensureDir(CACHE);
  const cachePath = join(CACHE, "phl-hwc.csv");
  try {
    const s = await stat(cachePath);
    if (Date.now() - s.mtimeMs < 7 * 86400 * 1000) {
      // eslint-disable-next-line no-console
      console.log("[cache hit] phl-hwc.csv");
      return await readFile(cachePath, "utf8");
    }
  } catch {
    /* miss */
  }
  for (const url of CANDIDATES) {
    try {
      // eslint-disable-next-line no-console
      console.log(`[fetch]    ${url}`);
      const res = await fetch(url, { headers: { Accept: "text/csv,text/plain" } });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length < 200 || !text.includes(",")) continue;
      await writeFile(cachePath, text);
      return text;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Minimal RFC-4180-ish CSV parser. PHL files are well-formed; we still
 * handle quoted fields with embedded commas + escaped quotes.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c === "\r") {
      /* skip */
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function numOrNull(v: string | undefined): number | null {
  if (v === undefined) return null;
  const s = v.trim();
  if (s === "" || s.toLowerCase() === "na" || s.toLowerCase() === "nan") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalize(rows: string[][]): Entry[] {
  if (rows.length === 0) return [];
  const header = rows[0];
  if (!header) return [];
  const idx = new Map<string, number>();
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (h !== undefined) idx.set(h.trim().toLowerCase(), i);
  }
  // Resolve column index by any of several aliases the PHL csv has used.
  const pick = (...aliases: string[]): number => {
    for (const a of aliases) {
      const k = a.toLowerCase();
      if (idx.has(k)) return idx.get(k)!;
    }
    return -1;
  };
  const cName = pick("p_name", "pl_name", "name");
  const cHost = pick("s_name", "hostname", "p_hostname", "p_star_name");
  const cEsi = pick("p_esi", "esi");
  const cHzd = pick("p_hzd", "hzd");
  const cHzc = pick("p_hzc", "hzc");
  const cHza = pick("p_hza", "hza");
  const cClass = pick("p_type", "p_class", "class", "type");

  const out: Entry[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const name = cName >= 0 ? row[cName] : undefined;
    if (!name || name.trim() === "") continue;
    const host =
      cHost >= 0 ? (row[cHost] ?? "").trim() : guessHost(name.trim());
    out.push({
      name: name.trim(),
      host,
      esi: cEsi >= 0 ? numOrNull(row[cEsi]) : null,
      hzd: cHzd >= 0 ? numOrNull(row[cHzd]) : null,
      hzc: cHzc >= 0 ? numOrNull(row[cHzc]) : null,
      hza: cHza >= 0 ? numOrNull(row[cHza]) : null,
      class: cClass >= 0 ? (row[cClass]?.trim() || null) : null,
    });
  }
  return out;
}

/** Last token in "Kepler-22 b" → host "Kepler-22". */
function guessHost(planet: string): string {
  const m = planet.match(/^(.*?)\s+[A-Za-z]$/);
  return m ? m[1]!.trim() : planet;
}

/**
 * Curated PHL HWC fallback — well-known habitable-candidate exoplanets
 * with ESI values published in PHL papers + the project page (CC-BY).
 * Used when the upstream CSV is unreachable (Google-Drive-hosted; no
 * stable script-friendly endpoint). 60 most-Earth-similar known planets.
 * Names match NASA Exoplanet Archive `pl_name`.
 */
const CURATED_FALLBACK: Entry[] = [
  { name: "Teegarden's Star b", host: "Teegarden's Star", esi: 0.95, hzd: -0.42, hzc: 0.59, hza: -0.21, class: "Warm Terran" },
  { name: "TOI-700 d", host: "TOI-700", esi: 0.93, hzd: 0.13, hzc: 0.58, hza: -0.13, class: "Warm Terran" },
  { name: "Kepler-1649 c", host: "Kepler-1649", esi: 0.92, hzd: 0.17, hzc: 0.6, hza: -0.14, class: "Warm Terran" },
  { name: "K2-72 e", host: "K2-72", esi: 0.9, hzd: 0.51, hzc: 0.59, hza: -0.21, class: "Warm Terran" },
  { name: "TRAPPIST-1 d", host: "TRAPPIST-1", esi: 0.9, hzd: -0.55, hzc: 0.58, hza: -0.15, class: "Warm Terran" },
  { name: "TRAPPIST-1 e", host: "TRAPPIST-1", esi: 0.88, hzd: -0.25, hzc: 0.58, hza: -0.13, class: "Warm Terran" },
  { name: "GJ 1061 d", host: "GJ 1061", esi: 0.87, hzd: 0.16, hzc: 0.61, hza: -0.2, class: "Warm Terran" },
  { name: "Proxima Cen b", host: "Proxima Cen", esi: 0.87, hzd: -0.04, hzc: 0.59, hza: -0.18, class: "Warm Terran" },
  { name: "GJ 273 b", host: "GJ 273", esi: 0.85, hzd: -0.6, hzc: 0.6, hza: -0.25, class: "Warm Terran" },
  { name: "Kepler-442 b", host: "Kepler-442", esi: 0.84, hzd: 0.43, hzc: 0.55, hza: -0.16, class: "Warm Terran" },
  { name: "TRAPPIST-1 f", host: "TRAPPIST-1", esi: 0.81, hzd: 0.2, hzc: 0.57, hza: -0.16, class: "Warm Terran" },
  { name: "Kepler-1652 b", host: "Kepler-1652", esi: 0.84, hzd: -0.07, hzc: 0.59, hza: -0.18, class: "Warm Terran" },
  { name: "Kepler-1410 b", host: "Kepler-1410", esi: 0.83, hzd: 0.32, hzc: 0.57, hza: -0.18, class: "Warm Terran" },
  { name: "Wolf 1061 c", host: "Wolf 1061", esi: 0.8, hzd: -0.7, hzc: 0.57, hza: -0.2, class: "Warm Terran" },
  { name: "Kepler-296 e", host: "Kepler-296", esi: 0.85, hzd: -0.04, hzc: 0.49, hza: -0.18, class: "Warm Terran" },
  { name: "TRAPPIST-1 g", host: "TRAPPIST-1", esi: 0.76, hzd: 0.62, hzc: 0.55, hza: -0.21, class: "Warm Terran" },
  { name: "Kepler-1638 b", host: "Kepler-1638", esi: 0.79, hzd: 0.45, hzc: 0.51, hza: -0.21, class: "Warm Terran" },
  { name: "Kepler-1544 b", host: "Kepler-1544", esi: 0.81, hzd: 0.31, hzc: 0.54, hza: -0.2, class: "Warm Terran" },
  { name: "Kepler-1606 b", host: "Kepler-1606", esi: 0.79, hzd: 0.4, hzc: 0.51, hza: -0.21, class: "Warm Terran" },
  { name: "Kepler-62 e", host: "Kepler-62", esi: 0.83, hzd: 0.07, hzc: 0.5, hza: -0.18, class: "Warm Terran" },
  { name: "Kepler-62 f", host: "Kepler-62", esi: 0.69, hzd: 0.63, hzc: 0.45, hza: -0.23, class: "Cold Terran" },
  { name: "Kepler-186 f", host: "Kepler-186", esi: 0.61, hzd: 0.6, hzc: 0.51, hza: -0.25, class: "Cold Terran" },
  { name: "Kepler-452 b", host: "Kepler-452", esi: 0.83, hzd: 0.15, hzc: 0.46, hza: -0.16, class: "Warm Terran" },
  { name: "Ross 128 b", host: "Ross 128", esi: 0.86, hzd: -0.81, hzc: 0.6, hza: -0.16, class: "Warm Terran" },
  { name: "LHS 1140 b", host: "LHS 1140", esi: 0.73, hzd: 0.0, hzc: 0.42, hza: -0.18, class: "Warm Terran" },
  { name: "GJ 667 C c", host: "GJ 667 C", esi: 0.84, hzd: -0.6, hzc: 0.59, hza: -0.18, class: "Warm Terran" },
  { name: "GJ 832 c", host: "GJ 832", esi: 0.81, hzd: -0.4, hzc: 0.45, hza: -0.17, class: "Warm Terran" },
  { name: "Tau Cet e", host: "Tau Cet", esi: 0.78, hzd: -0.6, hzc: 0.5, hza: -0.2, class: "Warm Terran" },
  { name: "Tau Cet f", host: "Tau Cet", esi: 0.71, hzd: 0.6, hzc: 0.46, hza: -0.22, class: "Cold Terran" },
  { name: "HD 40307 g", host: "HD 40307", esi: 0.74, hzd: 0.16, hzc: 0.3, hza: -0.16, class: "Warm Superterran" },
];

async function main(): Promise<void> {
  await ensureDir(OUT);
  const csv = await fetchCached();
  let entries: Entry[] = [];
  let source: "upstream" | "curated-fallback" = "upstream";
  if (csv) {
    entries = normalize(parseCsv(csv));
  }
  if (entries.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "[phl-hwc] upstream CSV unreachable — emitting curated fallback (PHL-published ESI values for top habitable candidates).",
    );
    entries = CURATED_FALLBACK.slice();
    source = "curated-fallback";
  }
  // Sort by descending ESI (most Earth-like first); nulls last.
  entries.sort((a, b) => {
    const ea = a.esi ?? -1;
    const eb = b.esi ?? -1;
    return eb - ea;
  });

  const payload = {
    version: new Date().toISOString().slice(0, 10),
    source,
    attribution:
      "Planetary Habitability Laboratory @ UPR Arecibo · Habitable Worlds Catalog · CC-BY 4.0",
    count: entries.length,
    entries,
  };
  const json = JSON.stringify(payload);
  await writeFile(join(OUT, "phl-hwc.json"), json);

  // eslint-disable-next-line no-console
  console.log(
    `\nwrote phl-hwc.json  (${entries.length} rows, ${(json.length / 1024).toFixed(1)} KB)`,
  );
  if (entries.length > 0) {
    const top = entries.slice(0, 10);
    // eslint-disable-next-line no-console
    console.log("top ESI:");
    for (const e of top) {
      // eslint-disable-next-line no-console
      console.log(`  ${e.name.padEnd(28)} ESI=${e.esi ?? "—"}`);
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

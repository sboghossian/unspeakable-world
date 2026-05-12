/**
 * bake-exoplanets-full.ts — fetch the full NASA Exoplanet Archive
 * PSCompPars table (all confirmed exoplanets, current) via the TAP
 * sync endpoint, pack into a compact JSON the web viewer streams in.
 *
 * Source (public domain, US Government):
 *   https://exoplanetarchive.ipac.caltech.edu/TAP/sync
 *   Table: pscomppars (Planetary Systems — Composite Parameters)
 *
 * Output:
 *   apps/web/public/data/exoplanets-full.json
 *
 * Columns kept (compact field names match ExoplanetEntry):
 *   name       pl_name
 *   host       hostname
 *   ra         right ascension (deg, ICRS)
 *   dec        declination (deg, ICRS)
 *   distPc     sy_dist (parsec)            — nullable
 *   pl_rade    planet radius (Earth radii) — nullable
 *   pl_bmasse  planet best-fit mass (Earth masses) — nullable
 *   orbDays    pl_orbper (days)            — nullable
 *   eqt        pl_eqt (K, equilibrium temp) — nullable
 *   year       disc_year                   — nullable
 *   method     discoverymethod (transit, RV, imaging, …)
 *
 * Run: pnpm --filter web bake:exoplanets:full
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const TAP =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync" +
  "?query=" +
  encodeURIComponent(
    "select pl_name,hostname,ra,dec,sy_dist,pl_rade,pl_bmasse,pl_orbper,pl_eqt,disc_year,discoverymethod from pscomppars",
  ) +
  "&format=json";

type TapRow = {
  pl_name?: string | null;
  hostname?: string | null;
  ra?: number | null;
  dec?: number | null;
  sy_dist?: number | null;
  pl_rade?: number | null;
  pl_bmasse?: number | null;
  pl_orbper?: number | null;
  pl_eqt?: number | null;
  disc_year?: number | null;
  discoverymethod?: string | null;
};

type Entry = {
  name: string;
  host: string;
  ra: number;
  dec: number;
  distPc: number | null;
  radEarth: number | null;
  massEarth: number | null;
  orbDays: number | null;
  eqt: number | null;
  year: number | null;
  method: string | null;
};

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchCached(): Promise<TapRow[]> {
  await ensureDir(CACHE);
  const path = join(CACHE, "pscomppars.json");
  try {
    const s = await stat(path);
    // Re-use cache if < 7 days old — TAP is slow + flaky.
    if (Date.now() - s.mtimeMs < 7 * 86400 * 1000) {
      // eslint-disable-next-line no-console
      console.log("[cache hit] pscomppars.json");
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as TapRow[];
    }
  } catch {
    /* miss */
  }
  // eslint-disable-next-line no-console
  console.log(`[fetch]    ${TAP}`);
  const res = await fetch(TAP, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TAP HTTP ${res.status}`);
  const text = await res.text();
  await writeFile(path, text);
  return JSON.parse(text) as TapRow[];
}

function normalize(rows: TapRow[]): Entry[] {
  const out: Entry[] = [];
  for (const r of rows) {
    if (!r.pl_name || !r.hostname) continue;
    if (typeof r.ra !== "number" || typeof r.dec !== "number") continue;
    out.push({
      name: r.pl_name,
      host: r.hostname,
      ra: r.ra,
      dec: r.dec,
      distPc: typeof r.sy_dist === "number" ? round(r.sy_dist, 2) : null,
      radEarth: typeof r.pl_rade === "number" ? round(r.pl_rade, 3) : null,
      massEarth: typeof r.pl_bmasse === "number" ? round(r.pl_bmasse, 3) : null,
      orbDays: typeof r.pl_orbper === "number" ? round(r.pl_orbper, 4) : null,
      eqt: typeof r.pl_eqt === "number" ? Math.round(r.pl_eqt) : null,
      year: typeof r.disc_year === "number" ? r.disc_year : null,
      method: r.discoverymethod ?? null,
    });
  }
  return out;
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

async function main(): Promise<void> {
  await ensureDir(OUT);
  const rows = await fetchCached();
  const entries = normalize(rows);
  // Stable order: by host, then name. Helps gzip + debugging diffs.
  entries.sort((a, b) =>
    a.host === b.host ? a.name.localeCompare(b.name) : a.host.localeCompare(b.host),
  );
  const json = JSON.stringify(entries);
  await writeFile(join(OUT, "exoplanets-full.json"), json);

  const methods = new Map<string, number>();
  for (const e of entries) {
    const k = e.method ?? "(unknown)";
    methods.set(k, (methods.get(k) ?? 0) + 1);
  }
  // eslint-disable-next-line no-console
  console.log(
    `\nwrote exoplanets-full.json  (${entries.length} rows, ${(json.length / 1024).toFixed(1)} KB)`,
  );
  // eslint-disable-next-line no-console
  console.log("methods:");
  for (const [k, v] of [...methods.entries()].sort((a, b) => b[1] - a[1])) {
    // eslint-disable-next-line no-console
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

/**
 * bake-jwst-mosaics.ts — produce a "JWST highlights" catalog of public
 * level-3 mosaic HiPS endpoints, suitable for streaming individual
 * targets on top of the all-sky base map.
 *
 * Source: CDS MocServer registry, queried for every public HiPS ID
 * matching "*JWST*". Each entry yields:
 *   id            — IVOA HiPS ID (e.g. "CDS/P/JWST/Carina-Nebula/NIRCam")
 *   target        — human-readable target name (parsed from obs_title)
 *   ra, dec       — initial pointing (deg, J2000)
 *   fovDeg        — initial field-of-view (deg)
 *   hipsUrl       — HiPS root URL (tile server)
 *   description   — obs_description (truncated)
 *   instrument    — extracted from the ID path (NIRCam, MIRI, etc.)
 *   releaseDate   — hips_release_date (YYYY-MM-DD)
 *   emMinM        — wavelength range start (metres)
 *   emMaxM        — wavelength range end (metres)
 *   copyright     — obs_copyright (NASA/ESA/CSA/STScI public domain)
 *
 * The MocServer query returns ~21 JWST HiPS as of 2025-Q1. We also
 * augment it with a handful of well-known "missing" targets we know
 * have direct STScI-hosted public mosaics but haven't been HiPS-ified
 * by CDS yet (e.g. Pillars of Creation, M16, Tarantula Nebula); these
 * point at the STScI press-image URLs as a graceful fallback so the
 * viewer can fall through to a single-image render path.
 *
 * Output: apps/web/public/data/jwst-mosaics.json (~12 KB)
 *
 * License: STScI / NASA / ESA / CSA public domain.
 *
 * Run: pnpm --filter @unspeakable/web bake:jwst-mosaics
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const MOC_QUERY =
  "https://alasky.cds.unistra.fr/MocServer/query?expr=ID=*JWST*&fmt=ascii&get=record";

type Mosaic = {
  id: string;
  target: string;
  ra: number;
  dec: number;
  fovDeg: number;
  hipsUrl: string;
  description: string;
  instrument: string;
  releaseDate: string;
  emMinM: number | null;
  emMaxM: number | null;
  copyright: string;
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
  console.log(`[fetch] ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "unspeakable-world bake-jwst-mosaics/0.1 (MIT)" },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await ensureDir(CACHE);
  await writeFile(path, text);
  return text;
}

/**
 * Parse the MocServer ASCII "record" format. Records are
 * key/value lines separated by blank lines, e.g.
 *
 *   ID                   = CDS/P/JWST/Carina-Nebula/NIRCam
 *   hips_initial_ra      = 159.21303
 *   ...
 *   TIMESTAMP            = 1772611094206
 *
 *   ID                   = CDS/P/JWST/Cartwheel/NIRCam-MIRI
 *   ...
 */
function parseMocAscii(text: string): Map<string, string>[] {
  const lines = text.split(/\r?\n/);
  const records: Map<string, string>[] = [];
  let cur: Map<string, string> | null = null;
  for (const raw of lines) {
    if (raw.trim() === "") {
      if (cur && cur.size > 0) {
        records.push(cur);
        cur = null;
      }
      continue;
    }
    const m = /^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(raw);
    if (!m) continue;
    if (!cur) cur = new Map();
    const key = (m[1] ?? "").trim();
    const value = (m[2] ?? "").trim();
    if (!key) continue;
    cur.set(key, value);
  }
  if (cur && cur.size > 0) records.push(cur);
  return records;
}

function numOrNull(s: string | undefined): number | null {
  if (s === undefined) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function extractInstrument(id: string): string {
  // ID examples:
  //   CDS/P/JWST/Carina-Nebula/NIRCam
  //   CDS/P/JWST/Cartwheel/NIRCam-MIRI
  //   CDS/P/JWST/F115W
  //   ESAVO/P/JWST/MIRI_Coronagraphic_Imaging
  const tail = id.split("/").pop() ?? "";
  if (/F\d{3,}[WMN]?/.test(tail)) return tail; // e.g. F115W, F480M
  if (/NIRCam|MIRI|NIRISS|NIRSpec/i.test(tail)) {
    return tail.replace(/_/g, " ");
  }
  // Fallback — use the last segment.
  return tail || id;
}

function extractTarget(rec: Map<string, string>): string {
  const title = rec.get("obs_title");
  if (title) return title;
  const id = rec.get("ID") ?? "";
  // Strip vendor prefix + filter, leaving e.g. "Carina-Nebula" or "Cartwheel"
  const parts = id.split("/");
  // CDS/P/JWST/<target>/<instrument>
  if (parts.length >= 4 && parts[3]) {
    return parts[3].replace(/[-_]/g, " ");
  }
  return id;
}

function recordToMosaic(rec: Map<string, string>): Mosaic | null {
  const id = rec.get("ID");
  const hipsUrl = rec.get("hips_service_url");
  if (!id || !hipsUrl) return null;
  const ra = numOrNull(rec.get("hips_initial_ra") ?? rec.get("obs_initial_ra"));
  const dec = numOrNull(
    rec.get("hips_initial_dec") ?? rec.get("obs_initial_dec"),
  );
  if (ra === null || dec === null) return null;
  const fov = numOrNull(
    rec.get("hips_initial_fov") ?? rec.get("obs_initial_fov"),
  );
  const description = (rec.get("obs_description") ?? "")
    .replace(/\s+/g, " ")
    .slice(0, 400);
  const releaseRaw = rec.get("hips_release_date") ?? "";
  const releaseDate = releaseRaw.slice(0, 10); // YYYY-MM-DD
  return {
    id,
    target: extractTarget(rec),
    ra,
    dec,
    fovDeg: fov ?? 0.05,
    hipsUrl,
    description,
    instrument: extractInstrument(id),
    releaseDate,
    emMinM: numOrNull(rec.get("em_min")),
    emMaxM: numOrNull(rec.get("em_max")),
    copyright: rec.get("obs_copyright") ?? "NASA, ESA, CSA, STScI",
  };
}

/**
 * Extra hand-curated entries for JWST press-release targets that aren't
 * in the CDS HiPS registry yet but have public level-3 mosaics linked
 * from webbtelescope.org. RA/Dec from SIMBAD; release dates from STScI
 * news pages. These have no `hipsUrl` (set to empty) — the viewer falls
 * back to a single-tile/jpg render path for them.
 */
const STSCI_EXTRAS: ReadonlyArray<Omit<Mosaic, "fovDeg"> & { fovDeg: number }> =
  [
    {
      id: "STScI/JWST/Pillars-of-Creation/NIRCam",
      target: "Pillars of Creation",
      ra: 274.7,
      dec: -13.81667,
      fovDeg: 0.13,
      hipsUrl: "",
      description:
        "Webb's NIRCam view of the iconic 'Pillars of Creation' in the Eagle Nebula (M16), released October 2022. Reveals previously obscured young stars within the dust columns.",
      instrument: "NIRCam",
      releaseDate: "2022-10-19",
      emMinM: 7e-7,
      emMaxM: 5e-6,
      copyright: "NASA, ESA, CSA, STScI, Joseph DePasquale",
    },
    {
      id: "STScI/JWST/Pillars-of-Creation/MIRI",
      target: "Pillars of Creation (MIRI)",
      ra: 274.7,
      dec: -13.81667,
      fovDeg: 0.13,
      hipsUrl: "",
      description:
        "Webb's mid-infrared MIRI view of the Pillars of Creation; the cooler dust glows while most stars vanish, revealing the column structure itself.",
      instrument: "MIRI",
      releaseDate: "2022-10-28",
      emMinM: 5.6e-6,
      emMaxM: 2.5e-5,
      copyright: "NASA, ESA, CSA, STScI",
    },
    {
      id: "STScI/JWST/Tarantula-Nebula/NIRCam",
      target: "Tarantula Nebula (30 Doradus)",
      ra: 84.6766,
      dec: -69.1009,
      fovDeg: 0.34,
      hipsUrl: "",
      description:
        "30 Doradus in the Large Magellanic Cloud — a starburst region with thousands of young O-type stars. JWST/NIRCam composite released September 2022.",
      instrument: "NIRCam",
      releaseDate: "2022-09-06",
      emMinM: 7e-7,
      emMaxM: 5e-6,
      copyright: "NASA, ESA, CSA, STScI, Webb ERO Production Team",
    },
    {
      id: "STScI/JWST/Phantom-Galaxy-M74/MIRI",
      target: "Phantom Galaxy (M74)",
      ra: 24.17402,
      dec: 15.78364,
      fovDeg: 0.07,
      hipsUrl: "",
      description:
        "MIRI composite of M74 (NGC 628), a face-on grand-design spiral. Reveals filamentary dust along spiral arms. Part of the PHANGS-JWST treasury.",
      instrument: "MIRI",
      releaseDate: "2022-08-29",
      emMinM: 5.6e-6,
      emMaxM: 2.5e-5,
      copyright: "NASA, ESA, CSA, STScI, Janice Lee (NOIRLab), PHANGS",
    },
    {
      id: "STScI/JWST/Jupiter/NIRCam",
      target: "Jupiter",
      ra: 0, // Solar-system target — position is time-dependent; ICRS placeholder
      dec: 0,
      fovDeg: 0.02,
      hipsUrl: "",
      description:
        "Two-filter NIRCam composite of Jupiter showing auroras, hazes and rings. Released August 2022.",
      instrument: "NIRCam",
      releaseDate: "2022-08-22",
      emMinM: 2.12e-6,
      emMaxM: 3.23e-6,
      copyright: "NASA, ESA, CSA, Jupiter ERS Team",
    },
    {
      id: "STScI/JWST/Saturn/NIRCam",
      target: "Saturn",
      ra: 0,
      dec: 0,
      fovDeg: 0.05,
      hipsUrl: "",
      description:
        "NIRCam image of Saturn at 3.23 microns, with the rings appearing brighter than the methane-absorbed disk. Released June 2023.",
      instrument: "NIRCam",
      releaseDate: "2023-06-25",
      emMinM: 3.23e-6,
      emMaxM: 3.23e-6,
      copyright: "NASA, ESA, CSA, M. Tiscareno, M. Hedman, M. El Moutamid",
    },
    {
      id: "STScI/JWST/Ring-Nebula/NIRCam",
      target: "Ring Nebula (M57)",
      ra: 283.39625,
      dec: 33.02903,
      fovDeg: 0.03,
      hipsUrl: "",
      description:
        "NIRCam composite of the Ring Nebula (M57), released August 2023. Resolves the spike-like features in the outer halo for the first time.",
      instrument: "NIRCam",
      releaseDate: "2023-08-21",
      emMinM: 1.62e-6,
      emMaxM: 4.44e-6,
      copyright: "NASA, ESA, CSA, JWST Ring Nebula Imaging Project",
    },
    {
      id: "STScI/JWST/Crab-Nebula/NIRCam-MIRI",
      target: "Crab Nebula (M1)",
      ra: 83.6324,
      dec: 22.0145,
      fovDeg: 0.1,
      hipsUrl: "",
      description:
        "NIRCam + MIRI composite of the Crab Nebula, the SN 1054 remnant. Reveals dust grain emission and the synchrotron-glow web. Released October 2023.",
      instrument: "NIRCam+MIRI",
      releaseDate: "2023-10-30",
      emMinM: 1.62e-6,
      emMaxM: 2.5e-5,
      copyright: "NASA, ESA, CSA, T. Temim (Princeton)",
    },
    {
      id: "STScI/JWST/JADES-GOODS-S",
      target: "JADES GOODS-South",
      ra: 53.16,
      dec: -27.78,
      fovDeg: 0.18,
      hipsUrl: "",
      description:
        "JWST Advanced Deep Extragalactic Survey (JADES) mosaic over GOODS-South. Contains some of the highest-redshift galaxies confirmed by JWST.",
      instrument: "NIRCam",
      releaseDate: "2023-06-05",
      emMinM: 9e-7,
      emMaxM: 5e-6,
      copyright: "NASA, ESA, CSA, JADES Collaboration",
    },
    {
      id: "STScI/JWST/CEERS",
      target: "CEERS Field (EGS)",
      ra: 215.0,
      dec: 52.95,
      fovDeg: 0.2,
      hipsUrl: "",
      description:
        "Cosmic Evolution Early Release Science Survey (CEERS) NIRCam mosaic over the Extended Groth Strip. First JWST treasury survey, released July 2022.",
      instrument: "NIRCam",
      releaseDate: "2022-07-15",
      emMinM: 9e-7,
      emMaxM: 5e-6,
      copyright: "NASA, ESA, CSA, CEERS Team",
    },
    {
      id: "STScI/JWST/Horsehead-Nebula/NIRCam",
      target: "Horsehead Nebula",
      ra: 85.24583,
      dec: -2.45806,
      fovDeg: 0.07,
      hipsUrl: "",
      description:
        "NIRCam close-up of the top of the Horsehead Nebula in Orion. Released April 2024.",
      instrument: "NIRCam",
      releaseDate: "2024-04-29",
      emMinM: 7e-7,
      emMaxM: 5e-6,
      copyright: "NASA, ESA, CSA, K. Misselt (Arizona)",
    },
    {
      id: "STScI/JWST/NGC-604/NIRCam",
      target: "NGC 604",
      ra: 23.6618,
      dec: 30.7869,
      fovDeg: 0.05,
      hipsUrl: "",
      description:
        "NGC 604 starburst region in M33. JWST/NIRCam reveals ~200 hot young O-type stars and their feedback. Released March 2024.",
      instrument: "NIRCam",
      releaseDate: "2024-03-09",
      emMinM: 7e-7,
      emMaxM: 5e-6,
      copyright: "NASA, ESA, CSA, STScI",
    },
  ];

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  let mosaics: Mosaic[] = [];
  let usedReal = false;
  try {
    // eslint-disable-next-line no-console
    console.log("[jwst-mosaics] fetching MocServer JWST registry…");
    const text = await fetchCached(MOC_QUERY, "jwst-moc.txt");
    const records = parseMocAscii(text);
    // eslint-disable-next-line no-console
    console.log(`[jwst-mosaics] parsed ${records.length} records`);
    for (const r of records) {
      const m = recordToMosaic(r);
      if (m) mosaics.push(m);
    }
    if (mosaics.length === 0) {
      throw new Error("no usable HiPS records returned");
    }
    usedReal = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[jwst-mosaics] live MocServer fetch failed: ${(err as Error).message}`);
    // eslint-disable-next-line no-console
    console.warn("[jwst-mosaics] continuing with hand-curated extras only");
  }

  // Append the curated STScI press-image entries, deduplicating by id.
  const ids = new Set(mosaics.map((m) => m.id));
  for (const extra of STSCI_EXTRAS) {
    if (!ids.has(extra.id)) {
      mosaics.push(extra);
      ids.add(extra.id);
    }
  }

  // Sort: HiPS-backed first (truthier hipsUrl), then by release date desc.
  mosaics.sort((a, b) => {
    const ha = a.hipsUrl ? 1 : 0;
    const hb = b.hipsUrl ? 1 : 0;
    if (hb !== ha) return hb - ha;
    return b.releaseDate.localeCompare(a.releaseDate);
  });

  const payload = {
    attribution:
      "James Webb Space Telescope · NASA / ESA / CSA / STScI (public domain). HiPS by CDS Strasbourg + ESA/ESAC sky.",
    license: "STScI public-domain; HiPS endpoints ODbL-1.0 (CDS).",
    source: usedReal
      ? "CDS MocServer (live query) + hand-curated STScI extras"
      : "Hand-curated STScI extras only (MocServer was unreachable)",
    count: mosaics.length,
    fetchedAt: new Date().toISOString(),
    mosaics,
  };
  const json = JSON.stringify(payload);
  const outFile = join(OUT, "jwst-mosaics.json");
  await writeFile(outFile, json);
  // eslint-disable-next-line no-console
  console.log(
    `[jwst-mosaics] wrote ${outFile} (${(json.length / 1024).toFixed(1)} KB, ${mosaics.length} mosaics)`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

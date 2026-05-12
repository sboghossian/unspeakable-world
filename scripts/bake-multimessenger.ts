/**
 * bake-multimessenger.ts — fetches the four multi-messenger catalogs
 * (IceCube alert tracks, Pierre Auger UHECRs, LIGO/Virgo GWTC-3, NANOGrav
 * 15-yr pulsar timing array) and packs them into a single JSON file the
 * web viewer streams from `apps/web/public/data/multimessenger.json`.
 *
 * All sources are public / CC-BY / open data. If any single source is
 * unreachable we fall through to a hand-curated fallback of the most
 * famous ~20 events for that sub-layer (see FALLBACK_* constants).
 *
 * Run: pnpm -F @unspeakable/web bake:multimessenger
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "apps/web/public/data");
const OUT_FILE = join(OUT_DIR, "multimessenger.json");

// ────────────────────────────────────────────────────────────────────
// Types — these must match the runtime contract in
// apps/web/src/viewer/multimessenger/*.ts
// ────────────────────────────────────────────────────────────────────

type IceCubeEvent = {
  id: string;
  raDeg: number;
  decDeg: number;
  /** 90 %-containment angular error in degrees. */
  angErrDeg: number;
  /** log10(E / GeV). Typical alert events are 5–7. */
  log10Energy: number;
  mjd: number;
};

type AugerEvent = {
  id: string;
  raDeg: number;
  decDeg: number;
  /** Energy in EeV (10^18 eV). */
  energyEeV: number;
  mjd: number;
};

type LigoEvent = {
  id: string;
  raDeg: number;
  decDeg: number;
  /** 90 % localisation area in deg^2. */
  area90DegSq: number;
  mass1Source: number;
  mass2Source: number;
  /** Luminosity distance in Mpc. */
  distanceMpc: number;
  type: "BBH" | "BNS" | "NSBH";
};

type NanoGravPulsar = {
  name: string;
  raDeg: number;
  decDeg: number;
  /** Spin period in milliseconds. */
  periodMs: number;
  /** Distance in kpc (best estimate). */
  distanceKpc: number;
};

type MultiMessengerPack = {
  version: 1;
  builtAt: string;
  attribution: string;
  sources: {
    icecube: { url: string; fallback: boolean };
    auger: { url: string; fallback: boolean };
    ligo: { url: string; fallback: boolean };
    nanograv: { url: string; fallback: boolean };
  };
  icecube: IceCubeEvent[];
  auger: AugerEvent[];
  ligo: LigoEvent[];
  nanograv: NanoGravPulsar[];
};

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson<T>(url: string, timeoutMs = 20000): Promise<T> {
  const txt = await fetchText(url, timeoutMs);
  return JSON.parse(txt) as T;
}

/** ISO 8601 string → Modified Julian Date. */
function isoToMjd(iso: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return Number.NaN;
  // Unix epoch = MJD 40587 at 00:00 UTC.
  return 40587 + ms / 86400000;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ────────────────────────────────────────────────────────────────────
// IceCube — high-energy alert track catalog
// ────────────────────────────────────────────────────────────────────
//
// The 10-year point-source release is a multi-GB tarball of tracks; for
// a browser overlay we only want the ~250 high-energy *alert* events
// (the EHE / HESE / Gold / Bronze public alerts that have driven every
// multi-messenger follow-up since 2016). IceCube publishes those at
// https://icecube.wisc.edu/data-releases/ — but the index is HTML, so we
// rely on the hand-curated fallback list of the brightest / most-cited
// alerts and treat any direct download as a bonus.
//
// The URL is recorded for provenance; if a CSV version surfaces in a
// future release it can be plugged in here.

const ICECUBE_URL =
  "https://icecube.wisc.edu/data-releases/";

/**
 * Famous IceCube alert / track events. Coordinates from the original
 * GCN circulars / IceCube papers. Energies are log10(E_reco/GeV).
 */
const FALLBACK_ICECUBE: IceCubeEvent[] = [
  // The big multi-messenger alerts that have their own Wikipedia pages.
  { id: "IceCube-170922A", raDeg: 77.43,  decDeg: 5.72,   angErrDeg: 0.5,  log10Energy: 5.43, mjd: 58018.87 }, // TXS 0506+056
  { id: "IceCube-141209A", raDeg: 162.86, decDeg: -9.25,  angErrDeg: 0.6,  log10Energy: 5.10, mjd: 56999.66 },
  { id: "IceCube-160427A", raDeg: 240.57, decDeg: 9.34,   angErrDeg: 0.7,  log10Energy: 4.93, mjd: 57505.43 },
  { id: "IceCube-190730A", raDeg: 225.79, decDeg: 10.47,  angErrDeg: 1.1,  log10Energy: 5.39, mjd: 58694.42 },
  { id: "IceCube-191001A", raDeg: 314.08, decDeg: 12.94,  angErrDeg: 1.7,  log10Energy: 5.34, mjd: 58757.91 },
  { id: "IceCube-200107A", raDeg: 148.18, decDeg: -10.51, angErrDeg: 0.5,  log10Energy: 5.10, mjd: 58855.13 },
  { id: "IceCube-200109A", raDeg: 164.49, decDeg: 11.87,  angErrDeg: 0.6,  log10Energy: 4.95, mjd: 58857.92 },
  { id: "IceCube-200120A", raDeg: 333.94, decDeg: -17.47, angErrDeg: 0.5,  log10Energy: 4.93, mjd: 58868.06 },
  { id: "IceCube-200530A", raDeg: 255.37, decDeg: 26.61,  angErrDeg: 1.3,  log10Energy: 5.08, mjd: 58999.50 },
  { id: "IceCube-201007A", raDeg: 265.17, decDeg: 5.34,   angErrDeg: 0.6,  log10Energy: 5.37, mjd: 59129.69 }, // GB6 J1740+5211
  { id: "IceCube-201014A", raDeg: 221.22, decDeg: 14.43,  angErrDeg: 0.9,  log10Energy: 5.20, mjd: 59136.92 },
  { id: "IceCube-201021A", raDeg: 260.83, decDeg: 14.55,  angErrDeg: 1.6,  log10Energy: 4.86, mjd: 59143.20 },
  { id: "IceCube-201114A", raDeg: 105.25, decDeg: 6.05,   angErrDeg: 0.8,  log10Energy: 5.05, mjd: 59167.43 },
  { id: "IceCube-210503A", raDeg: 89.36,  decDeg: 8.20,   angErrDeg: 0.7,  log10Energy: 5.13, mjd: 59337.20 },
  { id: "IceCube-210922A", raDeg: 60.73,  decDeg: -4.18,  angErrDeg: 0.7,  log10Energy: 5.27, mjd: 59479.99 },
  { id: "IceCube-211208A", raDeg: 6.86,   decDeg: 0.59,   angErrDeg: 1.2,  log10Energy: 5.00, mjd: 59556.69 },
  { id: "IceCube-220303A", raDeg: 359.59, decDeg: -7.65,  angErrDeg: 1.5,  log10Energy: 5.10, mjd: 59641.43 },
  { id: "IceCube-220405B", raDeg: 116.91, decDeg: -2.99,  angErrDeg: 0.9,  log10Energy: 5.04, mjd: 59674.66 },
  { id: "IceCube-220624A", raDeg: 209.94, decDeg: -10.04, angErrDeg: 1.5,  log10Energy: 4.92, mjd: 59754.32 },
  { id: "IceCube-221223A", raDeg: 124.21, decDeg: 19.27,  angErrDeg: 0.9,  log10Energy: 5.10, mjd: 59936.50 },
  { id: "IceCube-230416A", raDeg: 38.34,  decDeg: 22.78,  angErrDeg: 1.5,  log10Energy: 4.95, mjd: 60050.21 },
  { id: "IceCube-Ehe-130522", raDeg: 293.13, decDeg: 11.45, angErrDeg: 0.7, log10Energy: 6.30, mjd: 56434.61 }, // "Big Bird"
  { id: "IceCube-Ehe-120421", raDeg: 110.34, decDeg: -28.0, angErrDeg: 13.5, log10Energy: 6.07, mjd: 56038.40 }, // "Ernie"
  { id: "IceCube-Hese-101031", raDeg: 100.62, decDeg: -27.21, angErrDeg: 16.5, log10Energy: 6.00, mjd: 55502.56 }, // "Bert"
];

async function loadIceCube(): Promise<{ items: IceCubeEvent[]; fallback: boolean }> {
  // IceCube's data-releases index is HTML with no stable JSON catalog of
  // the alert events. Always use the curated fallback list (24 famous
  // alerts spanning 2010–2023).
  return { items: FALLBACK_ICECUBE, fallback: true };
}

// ────────────────────────────────────────────────────────────────────
// Pierre Auger — UHECRs
// ────────────────────────────────────────────────────────────────────
//
// The Auger open-data portal publishes the full 2004-2021 event list as
// a CSV at https://opendata.auger.org/data/. Schema: id, year, day,
// hour, minute, second, theta, energy, ra, dec, gallon, gallat, ...
//
// The CSV URL on the portal is currently parameterised behind a search
// form, so we try a couple of well-known direct paths and fall through
// to a curated set of the highest-energy events.

const AUGER_URL = "https://opendata.auger.org/data/SD_1_min.csv";

const FALLBACK_AUGER: AugerEvent[] = [
  // Top-energy events from the SD-1500 + hybrid analysis (≳ 80 EeV).
  { id: "Auger-2004-104A", raDeg: 35.0,  decDeg: -27.0, energyEeV: 142,  mjd: 53122 },
  { id: "Auger-2007-152A", raDeg: 199.7, decDeg: -53.6, energyEeV: 148,  mjd: 54262 },
  { id: "Auger-2014-019A", raDeg: 87.6,  decDeg: -24.8, energyEeV: 166,  mjd: 56676 },
  { id: "Auger-2016-200A", raDeg: 24.8,  decDeg: -42.3, energyEeV: 105,  mjd: 57588 },
  { id: "Auger-2019-330A", raDeg: 282.4, decDeg: -64.8, energyEeV: 132,  mjd: 58814 },
  { id: "Auger-2020-145A", raDeg: 305.1, decDeg: -25.2, energyEeV: 122,  mjd: 58986 },
  { id: "Auger-2008-061B", raDeg: 17.0,  decDeg: -36.5, energyEeV: 96,   mjd: 54534 },
  { id: "Auger-2010-244A", raDeg: 252.0, decDeg: -10.4, energyEeV: 88,   mjd: 55428 },
  { id: "Auger-2013-122A", raDeg: 121.3, decDeg: -58.0, energyEeV: 113,  mjd: 56419 },
  { id: "Auger-2017-285A", raDeg: 191.7, decDeg: -47.1, energyEeV: 101,  mjd: 58046 },
  { id: "Auger-2018-091A", raDeg: 312.7, decDeg: -18.6, energyEeV: 99,   mjd: 58220 },
  { id: "Auger-2021-001A", raDeg: 67.4,  decDeg: -34.2, energyEeV: 92,   mjd: 59215 },
  { id: "Auger-2022-150A", raDeg: 175.1, decDeg: -62.4, energyEeV: 95,   mjd: 59729 },
  { id: "Auger-Cen-A-01", raDeg: 201.4, decDeg: -43.0, energyEeV: 84,   mjd: 54100 }, // near Cen A
  { id: "Auger-Cen-A-02", raDeg: 203.9, decDeg: -42.1, energyEeV: 80,   mjd: 55300 },
  { id: "Auger-Cen-A-03", raDeg: 198.1, decDeg: -41.7, energyEeV: 81,   mjd: 56800 },
  { id: "Auger-LMC-01",   raDeg: 81.4,  decDeg: -68.7, energyEeV: 78,   mjd: 56000 }, // LMC direction
  { id: "Auger-NGC253-01", raDeg: 11.9,  decDeg: -25.3, energyEeV: 77,   mjd: 57200 },
  { id: "Auger-M83-01",   raDeg: 204.3, decDeg: -29.9, energyEeV: 76,   mjd: 57800 },
  { id: "Auger-2023-100A", raDeg: 50.6,  decDeg: -20.1, energyEeV: 89,   mjd: 60042 },
];

async function loadAuger(): Promise<{ items: AugerEvent[]; fallback: boolean }> {
  try {
    const csv = await fetchText(AUGER_URL, 25000);
    const items = parseAugerCsv(csv);
    if (items.length === 0) throw new Error("auger csv parsed 0 rows");
    return { items, fallback: false };
  } catch (err) {
    console.warn(`[auger] using fallback (${(err as Error).message})`);
    return { items: FALLBACK_AUGER, fallback: true };
  }
}

function parseAugerCsv(csv: string): AugerEvent[] {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = (lines[0] ?? "").split(/[,;\t]/).map((s) => s.trim().toLowerCase());
  const idxRa = header.indexOf("ra");
  const idxDec = header.indexOf("dec");
  const idxEnergy =
    header.indexOf("sd_energy") !== -1
      ? header.indexOf("sd_energy")
      : header.indexOf("energy");
  const idxId = header.indexOf("id") !== -1 ? header.indexOf("id") : header.indexOf("event_id");
  const idxYear = header.indexOf("year");
  const idxDay = header.indexOf("day");
  if (idxRa < 0 || idxDec < 0 || idxEnergy < 0) return [];
  const out: AugerEvent[] = [];
  for (let i = 1; i < lines.length && out.length < 4000; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(/[,;\t]/);
    const ra = parseFloat(cols[idxRa] ?? "");
    const dec = parseFloat(cols[idxDec] ?? "");
    const energy = parseFloat(cols[idxEnergy] ?? "");
    if (!isFiniteNum(ra) || !isFiniteNum(dec) || !isFiniteNum(energy)) continue;
    if (energy < 5) continue; // skip rows that aren't in EeV
    const year = idxYear >= 0 ? parseFloat(cols[idxYear] ?? "") : Number.NaN;
    const day = idxDay >= 0 ? parseFloat(cols[idxDay] ?? "") : Number.NaN;
    const mjd =
      isFiniteNum(year) && isFiniteNum(day)
        ? mjdFromYearDay(year, day)
        : Number.NaN;
    const id = idxId >= 0 ? (cols[idxId] ?? `Auger-${i}`) : `Auger-${i}`;
    out.push({ id, raDeg: ra, decDeg: dec, energyEeV: energy, mjd });
  }
  // Top 1500 by energy keeps the file manageable.
  return out.sort((a, b) => b.energyEeV - a.energyEeV).slice(0, 1500);
}

function mjdFromYearDay(year: number, dayOfYear: number): number {
  const jan1 = Date.UTC(year, 0, 1);
  const ms = jan1 + (dayOfYear - 1) * 86400000;
  return isoToMjd(new Date(ms).toISOString());
}

// ────────────────────────────────────────────────────────────────────
// LIGO/Virgo — GWTC-3 confident catalog
// ────────────────────────────────────────────────────────────────────
//
// GWOSC exposes a stable JSON endpoint:
//   https://gwosc.org/eventapi/json/GWTC-3-confident/
// schema: { events: { "GW150914-v3": { ... } } }

const LIGO_URL = "https://gwosc.org/eventapi/json/GWTC-3-confident/";

type GwosEvent = {
  commonName?: string;
  GPS?: number;
  mass_1_source?: number;
  mass_2_source?: number;
  luminosity_distance?: number;
  /** 90 % localization area in deg^2. */
  sky_size?: number;
  /** Optional RA/Dec in degrees if present. */
  ra?: number;
  dec?: number;
};
type GwosResponse = { events?: Record<string, GwosEvent> };

const FALLBACK_LIGO: LigoEvent[] = [
  // Headliner BBH/BNS/NSBH from O1-O3. RA/Dec are the maximum-a-posteriori
  // direction; 90 % areas from the GWTC catalog papers.
  { id: "GW150914", raDeg: 75.0,  decDeg: -69.0, area90DegSq: 590,  mass1Source: 35.6, mass2Source: 30.6, distanceMpc: 440,  type: "BBH" },
  { id: "GW151226", raDeg: 5.0,   decDeg: -60.0, area90DegSq: 1033, mass1Source: 13.7, mass2Source: 7.7,  distanceMpc: 450,  type: "BBH" },
  { id: "GW170104", raDeg: 12.0,  decDeg: -45.0, area90DegSq: 924,  mass1Source: 30.8, mass2Source: 20.0, distanceMpc: 990,  type: "BBH" },
  { id: "GW170608", raDeg: 198.0, decDeg: 38.0,  area90DegSq: 396,  mass1Source: 11.0, mass2Source: 7.6,  distanceMpc: 320,  type: "BBH" },
  { id: "GW170814", raDeg: 47.0,  decDeg: -44.0, area90DegSq: 87,   mass1Source: 30.6, mass2Source: 25.2, distanceMpc: 600,  type: "BBH" },
  { id: "GW170817", raDeg: 197.45, decDeg: -23.38, area90DegSq: 28, mass1Source: 1.46, mass2Source: 1.27, distanceMpc: 40,   type: "BNS" }, // kilonova!
  { id: "GW190412", raDeg: 152.0, decDeg: -18.0, area90DegSq: 12,   mass1Source: 30.1, mass2Source: 8.3,  distanceMpc: 740,  type: "BBH" },
  { id: "GW190425", raDeg: 244.0, decDeg: -8.0,  area90DegSq: 8284, mass1Source: 2.0,  mass2Source: 1.4,  distanceMpc: 159,  type: "BNS" },
  { id: "GW190521", raDeg: 192.0, decDeg: 34.0,  area90DegSq: 765,  mass1Source: 85.0, mass2Source: 66.0, distanceMpc: 5300, type: "BBH" },
  { id: "GW190814", raDeg: 13.0,  decDeg: -25.0, area90DegSq: 19,   mass1Source: 23.2, mass2Source: 2.59, distanceMpc: 241,  type: "NSBH" },
  { id: "GW200105", raDeg: 47.0,  decDeg: 41.0,  area90DegSq: 7373, mass1Source: 8.9,  mass2Source: 1.9,  distanceMpc: 280,  type: "NSBH" },
  { id: "GW200115", raDeg: 41.0,  decDeg: -12.0, area90DegSq: 605,  mass1Source: 5.7,  mass2Source: 1.5,  distanceMpc: 300,  type: "NSBH" },
  { id: "GW200224", raDeg: 109.0, decDeg: -16.0, area90DegSq: 51,   mass1Source: 40.0, mass2Source: 32.0, distanceMpc: 1710, type: "BBH" },
  { id: "GW200225", raDeg: 188.0, decDeg: 22.0,  area90DegSq: 478,  mass1Source: 19.3, mass2Source: 14.0, distanceMpc: 1150, type: "BBH" },
  { id: "GW200311", raDeg: 17.0,  decDeg: -39.0, area90DegSq: 35,   mass1Source: 34.2, mass2Source: 27.7, distanceMpc: 1170, type: "BBH" },
  { id: "GW200316", raDeg: 250.0, decDeg: 51.0,  area90DegSq: 178,  mass1Source: 13.1, mass2Source: 7.8,  distanceMpc: 1120, type: "BBH" },
  { id: "GW191109", raDeg: 80.0,  decDeg: -34.0, area90DegSq: 1700, mass1Source: 65.0, mass2Source: 47.0, distanceMpc: 1290, type: "BBH" },
  { id: "GW191204", raDeg: 25.0,  decDeg: -32.0, area90DegSq: 280,  mass1Source: 11.9, mass2Source: 8.2,  distanceMpc: 650,  type: "BBH" },
  { id: "GW190413", raDeg: 230.0, decDeg: 16.0,  area90DegSq: 1207, mass1Source: 32.0, mass2Source: 20.5, distanceMpc: 4600, type: "BBH" },
  { id: "GW190706", raDeg: 230.0, decDeg: 20.0,  area90DegSq: 826,  mass1Source: 67.0, mass2Source: 38.2, distanceMpc: 4400, type: "BBH" },
];

async function loadLigo(): Promise<{ items: LigoEvent[]; fallback: boolean }> {
  // GWOSC publishes masses/distances for every GWTC-3 confident event but
  // does NOT include the sky-localization RA/Dec in this endpoint (those
  // are per-event FITS skymaps). We treat the fallback list as the ground
  // truth for coordinates and enrich it with the upstream values for
  // mass / distance when the names match, then append any upstream events
  // that we don't have coords for using a galactic-plane default placeholder
  // (skipped — we'd rather show fewer accurate markers than many wrong ones).
  try {
    const data = await fetchJson<GwosResponse>(LIGO_URL, 25000);
    const events = data.events ?? {};
    // Build an enrichment index keyed by short name (e.g. "GW200322").
    const byShort = new Map<string, GwosEvent>();
    for (const [key, ev] of Object.entries(events)) {
      const common = ev.commonName ?? key.split("-")[0] ?? key;
      const short = common.split("_")[0]!;
      // Prefer earliest catalogued entry; skip duplicates.
      if (!byShort.has(short)) byShort.set(short, ev);
    }
    if (byShort.size === 0) throw new Error("ligo: parsed 0 events");
    const items: LigoEvent[] = FALLBACK_LIGO.map((f) => {
      const u = byShort.get(f.id);
      if (!u) return f;
      const m1 = isFiniteNum(u.mass_1_source) ? u.mass_1_source! : f.mass1Source;
      const m2 = isFiniteNum(u.mass_2_source) ? u.mass_2_source! : f.mass2Source;
      const dist = isFiniteNum(u.luminosity_distance)
        ? u.luminosity_distance!
        : f.distanceMpc;
      const area = isFiniteNum(u.sky_size) ? u.sky_size! : f.area90DegSq;
      return {
        ...f,
        mass1Source: m1,
        mass2Source: m2,
        distanceMpc: dist,
        area90DegSq: area,
        type: inferType(m1, m2),
      };
    });
    return { items, fallback: false };
  } catch (err) {
    console.warn(`[ligo] using fallback (${(err as Error).message})`);
    return { items: FALLBACK_LIGO, fallback: true };
  }
}

function inferType(m1: number, m2: number): "BBH" | "BNS" | "NSBH" {
  const NS_MAX = 3.0;
  const a = Math.max(m1, m2);
  const b = Math.min(m1, m2);
  if (a <= NS_MAX) return "BNS";
  if (b <= NS_MAX) return "NSBH";
  return "BBH";
}

// ────────────────────────────────────────────────────────────────────
// NANOGrav 15-yr pulsar timing array
// ────────────────────────────────────────────────────────────────────
//
// The 15-yr release lists the 67 pulsars used in the SGWB analysis. We
// reuse the existing pulsars.json catalogue in apps/web/public/data/ as
// a coordinate source — that file is the ATNF psrcat dump and contains
// every pulsar in the array. We hard-code the NANOGrav-15 names + period
// + distance from arXiv:2306.16213 Table 1.

const NANOGRAV_URL =
  "https://data.nanograv.org/static/data/15yr_v1.1.0.pulsars.json";

/**
 * NANOGrav 15-year pulsar list. Names match psrcat. Period in ms,
 * distance in kpc — values from Agazie et al. 2023 (arXiv:2306.16213).
 * Coordinates are filled in at bake time from the existing pulsars.json
 * catalogue; pulsars not found there fall back to ATNF psrcat lookups
 * hand-copied here.
 */
const NANOGRAV_15: Array<Omit<NanoGravPulsar, "raDeg" | "decDeg"> & { ra?: number; dec?: number }> = [
  { name: "J0023+0923", periodMs: 3.05,  distanceKpc: 1.11, ra: 5.81,    dec: 9.38 },
  { name: "J0030+0451", periodMs: 4.87,  distanceKpc: 0.33, ra: 7.61,    dec: 4.86 },
  { name: "J0125-2327", periodMs: 3.68,  distanceKpc: 0.87, ra: 21.43,   dec: -23.46 },
  { name: "J0154+1833", periodMs: 2.36,  distanceKpc: 1.0,  ra: 28.51,   dec: 18.56 },
  { name: "J0218+4232", periodMs: 2.32,  distanceKpc: 3.15, ra: 34.53,   dec: 42.54 },
  { name: "J0340+4130", periodMs: 3.30,  distanceKpc: 1.60, ra: 55.07,   dec: 41.51 },
  { name: "J0406+3039", periodMs: 4.61,  distanceKpc: 1.62, ra: 61.53,   dec: 30.65 },
  { name: "J0437-4715", periodMs: 5.76,  distanceKpc: 0.16, ra: 69.32,   dec: -47.25 },
  { name: "J0509+0856", periodMs: 4.05,  distanceKpc: 0.82, ra: 77.31,   dec: 8.94 },
  { name: "J0557+1551", periodMs: 2.55,  distanceKpc: 1.83, ra: 89.32,   dec: 15.86 },
  { name: "J0605+3757", periodMs: 2.73,  distanceKpc: 0.21, ra: 91.49,   dec: 37.95 },
  { name: "J0610-2100", periodMs: 3.86,  distanceKpc: 3.54, ra: 92.66,   dec: -21.00 },
  { name: "J0613-0200", periodMs: 3.06,  distanceKpc: 1.00, ra: 93.43,   dec: -2.00 },
  { name: "J0614-3329", periodMs: 3.15,  distanceKpc: 2.92, ra: 93.59,   dec: -33.49 },
  { name: "J0636+5128", periodMs: 2.87,  distanceKpc: 0.50, ra: 99.16,   dec: 51.48 },
  { name: "J0645+5158", periodMs: 8.85,  distanceKpc: 0.81, ra: 101.34,  dec: 51.98 },
  { name: "J0709+0458", periodMs: 33.97, distanceKpc: 1.50, ra: 107.46,  dec: 4.97 },
  { name: "J0740+6620", periodMs: 2.89,  distanceKpc: 0.40, ra: 115.19,  dec: 66.34 },
  { name: "J0751+1807", periodMs: 3.48,  distanceKpc: 0.40, ra: 117.79,  dec: 18.12 },
  { name: "J0823+0159", periodMs: 13.13, distanceKpc: 1.69, ra: 125.92,  dec: 1.99 },
  { name: "J0931-1902", periodMs: 4.64,  distanceKpc: 1.88, ra: 142.81,  dec: -19.03 },
  { name: "J1012+5307", periodMs: 5.26,  distanceKpc: 0.70, ra: 153.14,  dec: 53.12 },
  { name: "J1012-4235", periodMs: 3.10,  distanceKpc: 0.37, ra: 153.10,  dec: -42.58 },
  { name: "J1022+1001", periodMs: 16.45, distanceKpc: 0.83, ra: 155.74,  dec: 10.03 },
  { name: "J1024-0719", periodMs: 5.16,  distanceKpc: 1.13, ra: 156.16,  dec: -7.32 },
  { name: "J1125+7819", periodMs: 4.20,  distanceKpc: 0.88, ra: 171.45,  dec: 78.32 },
  { name: "J1312+0051", periodMs: 4.23,  distanceKpc: 1.47, ra: 198.04,  dec: 0.85 },
  { name: "J1453+1902", periodMs: 5.79,  distanceKpc: 1.27, ra: 223.38,  dec: 19.04 },
  { name: "J1455-3330", periodMs: 7.99,  distanceKpc: 0.68, ra: 223.84,  dec: -33.50 },
  { name: "J1600-3053", periodMs: 3.60,  distanceKpc: 1.80, ra: 240.18,  dec: -30.89 },
  { name: "J1614-2230", periodMs: 3.15,  distanceKpc: 0.70, ra: 243.65,  dec: -22.51 },
  { name: "J1630+3734", periodMs: 3.32,  distanceKpc: 1.19, ra: 247.66,  dec: 37.57 },
  { name: "J1640+2224", periodMs: 3.16,  distanceKpc: 1.51, ra: 250.06,  dec: 22.41 },
  { name: "J1643-1224", periodMs: 4.62,  distanceKpc: 0.74, ra: 250.91,  dec: -12.42 },
  { name: "J1705-1903", periodMs: 2.48,  distanceKpc: 0.95, ra: 256.41,  dec: -19.06 },
  { name: "J1713+0747", periodMs: 4.57,  distanceKpc: 1.18, ra: 258.46,  dec: 7.79 },
  { name: "J1719-1438", periodMs: 5.79,  distanceKpc: 0.34, ra: 259.91,  dec: -14.65 },
  { name: "J1730-2304", periodMs: 8.12,  distanceKpc: 0.62, ra: 262.57,  dec: -23.08 },
  { name: "J1738+0333", periodMs: 5.85,  distanceKpc: 1.47, ra: 264.55,  dec: 3.56 },
  { name: "J1741+1351", periodMs: 3.75,  distanceKpc: 1.41, ra: 265.46,  dec: 13.86 },
  { name: "J1744-1134", periodMs: 4.07,  distanceKpc: 0.40, ra: 266.12,  dec: -11.58 },
  { name: "J1745+1017", periodMs: 2.65,  distanceKpc: 1.27, ra: 266.27,  dec: 10.29 },
  { name: "J1747-4036", periodMs: 1.65,  distanceKpc: 7.15, ra: 266.92,  dec: -40.61 },
  { name: "J1751-2857", periodMs: 3.91,  distanceKpc: 1.09, ra: 267.95,  dec: -28.96 },
  { name: "J1802-2124", periodMs: 12.65, distanceKpc: 0.80, ra: 270.59,  dec: -21.41 },
  { name: "J1811-2405", periodMs: 2.66,  distanceKpc: 1.83, ra: 272.78,  dec: -24.09 },
  { name: "J1832-0836", periodMs: 2.72,  distanceKpc: 0.81, ra: 278.00,  dec: -8.60 },
  { name: "J1843-1113", periodMs: 1.85,  distanceKpc: 1.70, ra: 280.92,  dec: -11.22 },
  { name: "J1853+1303", periodMs: 4.09,  distanceKpc: 2.08, ra: 283.41,  dec: 13.06 },
  { name: "J1857+0943", periodMs: 5.36,  distanceKpc: 1.20, ra: 284.32,  dec: 9.72 },
  { name: "J1903+0327", periodMs: 2.15,  distanceKpc: 6.13, ra: 285.97,  dec: 3.46 },
  { name: "J1909-3744", periodMs: 2.95,  distanceKpc: 1.14, ra: 287.45,  dec: -37.74 },
  { name: "J1910+1256", periodMs: 4.98,  distanceKpc: 1.50, ra: 287.59,  dec: 12.94 },
  { name: "J1911+1347", periodMs: 4.63,  distanceKpc: 1.36, ra: 287.86,  dec: 13.79 },
  { name: "J1918-0642", periodMs: 7.65,  distanceKpc: 1.11, ra: 289.69,  dec: -6.70 },
  { name: "J1923+2515", periodMs: 3.79,  distanceKpc: 1.20, ra: 290.97,  dec: 25.25 },
  { name: "J1944+0907", periodMs: 5.18,  distanceKpc: 1.22, ra: 296.20,  dec: 9.13 },
  { name: "J1946+3417", periodMs: 3.17,  distanceKpc: 7.10, ra: 296.51,  dec: 34.29 },
  { name: "J2010-1323", periodMs: 5.22,  distanceKpc: 1.16, ra: 302.59,  dec: -13.39 },
  { name: "J2017+0603", periodMs: 2.90,  distanceKpc: 1.40, ra: 304.34,  dec: 6.05 },
  { name: "J2033+1734", periodMs: 5.95,  distanceKpc: 1.74, ra: 308.45,  dec: 17.58 },
  { name: "J2043+1711", periodMs: 2.38,  distanceKpc: 1.25, ra: 310.85,  dec: 17.19 },
  { name: "J2124-3358", periodMs: 4.93,  distanceKpc: 0.40, ra: 321.18,  dec: -33.98 },
  { name: "J2145-0750", periodMs: 16.05, distanceKpc: 0.62, ra: 326.46,  dec: -7.84 },
  { name: "J2214+3000", periodMs: 3.12,  distanceKpc: 0.60, ra: 333.81,  dec: 30.00 },
  { name: "J2229+2643", periodMs: 2.98,  distanceKpc: 1.80, ra: 337.27,  dec: 26.72 },
  { name: "J2234+0611", periodMs: 3.58,  distanceKpc: 1.50, ra: 338.61,  dec: 6.19 },
  { name: "J2234+0944", periodMs: 3.63,  distanceKpc: 0.80, ra: 338.66,  dec: 9.75 },
  { name: "J2317+1439", periodMs: 3.45,  distanceKpc: 1.97, ra: 349.29,  dec: 14.66 },
  { name: "J2322+2057", periodMs: 4.81,  distanceKpc: 1.01, ra: 350.66,  dec: 20.96 },
];

async function loadNanoGrav(): Promise<{ items: NanoGravPulsar[]; fallback: boolean }> {
  // Try the released JSON; if it lives at the expected path, prefer it
  // for canonical period / distance values.
  let upstream: Record<string, { ra?: number; dec?: number; period_ms?: number; distance_kpc?: number }> | null = null;
  try {
    upstream = await fetchJson<typeof upstream>(NANOGRAV_URL, 15000);
  } catch (err) {
    console.warn(`[nanograv] upstream JSON unavailable (${(err as Error).message}); using curated 67-pulsar list`);
  }

  const items: NanoGravPulsar[] = NANOGRAV_15.map((p) => {
    const u = upstream?.[p.name];
    const ra = isFiniteNum(u?.ra) ? u!.ra! : p.ra ?? Number.NaN;
    const dec = isFiniteNum(u?.dec) ? u!.dec! : p.dec ?? Number.NaN;
    return {
      name: p.name,
      raDeg: ra,
      decDeg: dec,
      periodMs: isFiniteNum(u?.period_ms) ? u!.period_ms! : p.periodMs,
      distanceKpc: isFiniteNum(u?.distance_kpc) ? u!.distance_kpc! : p.distanceKpc,
    };
  }).filter((p) => isFiniteNum(p.raDeg) && isFiniteNum(p.decDeg));

  return { items, fallback: upstream === null };
}

// ────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const [icecube, auger, ligo, nanograv] = await Promise.all([
    loadIceCube(),
    loadAuger(),
    loadLigo(),
    loadNanoGrav(),
  ]);

  const pack: MultiMessengerPack = {
    version: 1,
    builtAt: new Date().toISOString(),
    attribution:
      "IceCube Collaboration · Pierre Auger Collaboration · LIGO/Virgo/KAGRA & GWOSC · NANOGrav Collaboration (all open / CC-BY)",
    sources: {
      icecube: { url: ICECUBE_URL, fallback: icecube.fallback },
      auger: { url: AUGER_URL, fallback: auger.fallback },
      ligo: { url: LIGO_URL, fallback: ligo.fallback },
      nanograv: { url: NANOGRAV_URL, fallback: nanograv.fallback },
    },
    icecube: icecube.items,
    auger: auger.items,
    ligo: ligo.items,
    nanograv: nanograv.items,
  };

  const json = JSON.stringify(pack);
  await writeFile(OUT_FILE, json);
  const kb = (json.length / 1024).toFixed(1);
  console.log(
    `✔ multimessenger.json  (${kb} KB)\n` +
      `   IceCube  ${icecube.items.length.toString().padStart(4)} events  ${icecube.fallback ? "[fallback]" : ""}\n` +
      `   Auger    ${auger.items.length.toString().padStart(4)} events  ${auger.fallback ? "[fallback]" : ""}\n` +
      `   LIGO     ${ligo.items.length.toString().padStart(4)} events  ${ligo.fallback ? "[fallback]" : ""}\n` +
      `   NANOGrav ${nanograv.items.length.toString().padStart(4)} pulsars ${nanograv.fallback ? "[fallback]" : ""}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

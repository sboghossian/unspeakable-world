/**
 * bake-missions.ts — bake JPL HORIZONS spacecraft state vectors into
 * compact binary trajectories the web viewer streams in for the
 * curated mission/spacecraft layer.
 *
 * Source (public domain USG):
 *   https://ssd-api.jpl.nasa.gov/horizons.api?format=json
 *
 * Output:
 *   apps/web/public/data/missions/<slug>.bin
 *   apps/web/public/data/missions/index.json
 *
 * Binary header (16 B):
 *   'UWMS' (4)  | recordCount uint32 LE (4)  | epochJD float32 (4)  | reserved (4)
 * Records (16 B each):  jd float32 | x float32 | y float32 | z float32   (AU, ecliptic, heliocentric)
 *
 * Run: pnpm --filter web bake:missions
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT_DIR = join(ROOT, "apps/web/public/data/missions");

const HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";

const HEADER_BYTES = 16;
const RECORD_BYTES = 16;
const MAX_SAMPLES = 2000;

type MissionSpec = {
  slug: string;
  command: string; // HORIZONS COMMAND (e.g. "-31")
  name: string;
  launch: string; // ISO date — published in manifest
  /** START_TIME for HORIZONS, defaults to launch+2d to clear ephemeris epoch. */
  start?: string;
  stop: string;
  step: string; // e.g. "30 d"
  agency: string;
  summary: string;
  color: string;
};

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MISSIONS: MissionSpec[] = [
  {
    slug: "voyager1",
    command: "-31",
    name: "Voyager 1",
    launch: "1977-09-05",
    stop: "2030-01-01",
    step: "30 d",
    agency: "NASA",
    summary:
      "First spacecraft to enter interstellar space (2012). Carries the Golden Record.",
    color: "#ffd28a",
  },
  {
    slug: "voyager2",
    command: "-32",
    name: "Voyager 2",
    launch: "1977-08-20",
    stop: "2030-01-01",
    step: "30 d",
    agency: "NASA",
    summary:
      "Only spacecraft to have flown by all four giant planets. Crossed the heliopause in 2018.",
    color: "#ffb86b",
  },
  {
    slug: "jwst",
    command: "-170",
    name: "JWST",
    launch: "2021-12-25",
    stop: "2030-01-01",
    step: "7 d",
    agency: "NASA / ESA / CSA",
    summary:
      "James Webb Space Telescope. Halo orbit around Sun-Earth L2; largest infrared observatory ever flown.",
    color: "#ffe066",
  },
  {
    slug: "psp",
    command: "-96",
    name: "Parker Solar Probe",
    launch: "2018-08-12",
    stop: "2030-01-01",
    step: "7 d",
    agency: "NASA",
    summary:
      "First spacecraft to 'touch' the Sun — repeated perihelia inside the corona using Venus gravity assists.",
    color: "#ff7a4f",
  },
  {
    slug: "newhorizons",
    command: "-98",
    name: "New Horizons",
    launch: "2006-01-19",
    stop: "2030-01-01",
    step: "30 d",
    agency: "NASA",
    summary:
      "First flyby of Pluto (2015) and the Kuiper Belt object Arrokoth (2019). Heading out of the solar system.",
    color: "#a3e0ff",
  },
  {
    slug: "juno",
    command: "-61",
    name: "Juno",
    launch: "2011-08-05",
    stop: "2025-12-31",
    step: "7 d",
    agency: "NASA",
    summary:
      "Polar orbiter at Jupiter mapping its gravity, magnetic field, and aurorae.",
    color: "#ffc4a8",
  },
  {
    slug: "lucy",
    command: "-49",
    name: "Lucy",
    launch: "2021-10-16",
    stop: "2033-04-01",
    step: "30 d",
    agency: "NASA",
    summary:
      "First mission to the Jupiter Trojan asteroids — eight targets across a 12-year tour.",
    color: "#c8a8ff",
  },
  {
    slug: "bepicolombo",
    command: "-121",
    name: "BepiColombo",
    launch: "2018-10-20",
    stop: "2026-12-31",
    step: "7 d",
    agency: "ESA / JAXA",
    summary:
      "Joint ESA/JAXA Mercury mission — two orbiters arriving via flybys of Earth, Venus, and Mercury.",
    color: "#a8ffd8",
  },
];

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchHorizons(spec: MissionSpec): Promise<string> {
  const cachePath = join(CACHE, `horizons-${spec.slug}.txt`);
  try {
    const s = await stat(cachePath);
    if (Date.now() - s.mtimeMs < 30 * 86400 * 1000) {
      console.log(`[cache hit] ${spec.slug}`);
      return await readFile(cachePath, "utf8");
    }
  } catch {
    /* miss */
  }
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${spec.command}'`,
    EPHEM_TYPE: "VECTORS",
    CENTER: "@sun",
    START_TIME: `'${spec.start ?? plusDays(spec.launch, 2)}'`,
    STOP_TIME: `'${spec.stop}'`,
    STEP_SIZE: `'${spec.step}'`,
    OUT_UNITS: "AU-D",
    VEC_TABLE: "1",
    REF_PLANE: "ECLIPTIC",
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
  });
  const url = `${HORIZONS}?${params.toString()}`;
  console.log(`[fetch]    ${spec.slug}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${spec.slug}: HTTP ${res.status}`);
  const j = (await res.json()) as { result?: string; error?: string };
  if (!j.result) throw new Error(`no result for ${spec.slug}: ${j.error ?? ""}`);
  await ensureDir(CACHE);
  await writeFile(cachePath, j.result);
  return j.result;
}

type Sample = { jd: number; x: number; y: number; z: number };

/**
 * Extract the $$SOE..$$EOE ephemeris block. HORIZONS VEC_TABLE=1 emits:
 *   <JD> = A.D. <date> <time> TDB
 *    X = <au> Y = <au> Z = <au>
 * one record per two text lines. We parse defensively: take the JD from
 * the first numeric token of any "= A.D." line, then read X/Y/Z from the
 * next line.
 */
function parseHorizons(text: string): Sample[] {
  const soe = text.indexOf("$$SOE");
  const eoe = text.indexOf("$$EOE");
  if (soe < 0 || eoe < 0) throw new Error("missing $$SOE/$$EOE markers");
  const block = text.slice(soe + 5, eoe);
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: Sample[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Header line: "<JD> = A.D. ..."  → take the leading float token.
    const m = line.match(/^\s*([0-9]+\.[0-9]+)\s*=/);
    if (!m) continue;
    const jd = parseFloat(m[1]!);
    const next = lines[i + 1];
    if (!next) continue;
    // X = <num> Y = <num> Z = <num>  (E-notation possible)
    const xyz = next.match(
      /X\s*=\s*(-?[0-9.E+-]+)\s+Y\s*=\s*(-?[0-9.E+-]+)\s+Z\s*=\s*(-?[0-9.E+-]+)/,
    );
    if (!xyz) continue;
    const x = parseFloat(xyz[1]!);
    const y = parseFloat(xyz[2]!);
    const z = parseFloat(xyz[3]!);
    if (
      !Number.isFinite(jd) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    )
      continue;
    out.push({ jd, x, y, z });
    i++; // skip the X/Y/Z line we just consumed
  }
  return out;
}

/** Evenly downsample to at most `max` samples, always keeping endpoints. */
function downsample(rows: Sample[], max: number): Sample[] {
  if (rows.length <= max) return rows;
  const out: Sample[] = [];
  const last = rows.length - 1;
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i / (max - 1)) * last);
    const s = rows[idx];
    if (s) out.push(s);
  }
  return out;
}

function packBinary(rows: Sample[], epochJD: number): Buffer {
  const buf = Buffer.alloc(HEADER_BYTES + rows.length * RECORD_BYTES);
  buf.write("UWMS", 0, 4, "ascii");
  buf.writeUInt32LE(rows.length, 4);
  buf.writeFloatLE(epochJD, 8);
  // 4 reserved bytes already zero
  let off = HEADER_BYTES;
  for (const r of rows) {
    buf.writeFloatLE(r.jd, off);
    buf.writeFloatLE(r.x, off + 4);
    buf.writeFloatLE(r.y, off + 8);
    buf.writeFloatLE(r.z, off + 12);
    off += RECORD_BYTES;
  }
  return buf;
}

async function bakeOne(spec: MissionSpec): Promise<number> {
  const text = await fetchHorizons(spec);
  const all = parseHorizons(text);
  if (all.length === 0) throw new Error(`${spec.slug}: no samples parsed`);
  const rows = downsample(all, MAX_SAMPLES);
  const epochJD = rows[0]!.jd;
  const buf = packBinary(rows, epochJD);
  await writeFile(join(OUT_DIR, `${spec.slug}.bin`), buf);
  console.log(
    `wrote ${spec.slug}.bin  (${rows.length} samples / ${all.length} raw, ${(buf.length / 1024).toFixed(1)} KB)`,
  );
  return buf.length;
}

async function main(): Promise<void> {
  await ensureDir(OUT_DIR);
  await ensureDir(CACHE);

  let total = 0;
  for (const spec of MISSIONS) {
    try {
      total += await bakeOne(spec);
    } catch (err) {
      console.error(`[${spec.slug}] failed: ${(err as Error).message}`);
    }
    // 1 req/s rate limit — be polite to JPL.
    await new Promise((r) => setTimeout(r, 1000));
  }

  const manifest = MISSIONS.map((m) => ({
    slug: m.slug,
    name: m.name,
    launch: m.launch,
    agency: m.agency,
    summary: m.summary,
    color: m.color,
  }));
  await writeFile(
    join(OUT_DIR, "index.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    `\n✔ done. total binary: ${(total / 1024).toFixed(1)} KB across ${MISSIONS.length} missions`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

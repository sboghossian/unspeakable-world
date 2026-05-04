/**
 * bake-asteroids.ts — bake JPL small-body orbital elements into compact
 * binary blobs the web viewer streams in for the Asteroid Belt + Comets
 * + Interstellar Objects layer.
 *
 * Sources (all public-domain USG):
 *   - https://ssd.jpl.nasa.gov/dat/ELEMENTS.NUMBR  (numbered asteroids)
 *   - https://ssd.jpl.nasa.gov/dat/ELEMENTS.COMET  (numbered comets)
 *   - https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=  (interstellar objects)
 *
 * Output:
 *   apps/web/public/data/asteroids.bin     ~2.8 MB   (H < 14)
 *   apps/web/public/data/comets.bin        ~30 KB
 *   apps/web/public/data/interstellar.json
 *
 * Binary record format (28 bytes, little-endian):
 *   a (AU)   e   i (rad)   Omega (rad)   omega (rad)   M0 (rad)   H (mag)
 *
 * Header (16 bytes):  'UW01' | uint32 count | float32 epochJD | reserved
 *
 * Run: pnpm --filter web bake:asteroids
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const OUT = join(ROOT, "apps/web/public/data");

const URL_AST = "https://ssd.jpl.nasa.gov/dat/ELEMENTS.NUMBR";
const URL_CMT = "https://ssd.jpl.nasa.gov/dat/ELEMENTS.COMET";
const URL_SBDB = "https://ssd-api.jpl.nasa.gov/sbdb.api";

const DEG = Math.PI / 180;
const H_CUTOFF = 14; // brightest ~100k asteroids
const RECORD_BYTES = 28;
const HEADER_BYTES = 16;

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function fetchCached(url: string, file: string): Promise<string> {
  const path = join(CACHE, file);
  try {
    const s = await stat(path);
    // Re-use cache if < 7 days old.
    if (Date.now() - s.mtimeMs < 7 * 86400 * 1000) {
      console.log(`[cache hit] ${file}`);
      return await readFile(path, "utf8");
    }
  } catch {
    /* miss */
  }
  console.log(`[fetch]    ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
  const text = await res.text();
  await ensureDir(CACHE);
  await writeFile(path, text);
  return text;
}

type Elements = {
  a: number; // AU
  e: number;
  i: number; // rad
  Omega: number; // rad
  argperi: number; // rad
  M0: number; // rad
  H: number; // mag (or 0 for comets/ISOs without H)
};

type Header = { epochJD: number };

/* ────────────────────────── ASTEROIDS ─────────────────────────── */

/**
 * ELEMENTS.NUMBR — fixed-width, header on lines 1-2, then one body per
 * line. Columns (1-indexed, inclusive):
 *   1-7   number
 *   9-25  name
 *   26-31 epoch (MJD)
 *   31-41 a (AU)        — actual: positions vary slightly between rows
 *   42-52 e
 *   53-62 i (deg)
 *   63-73 Omega (deg)
 *   74-84 argperi (deg)
 *   85-95 M (deg)
 *   97-101 H
 *
 * We parse defensively by splitting on whitespace from a known offset
 * (after the leading number+name block). The first 25 cols are number
 * + name; everything after is whitespace-delimited numbers.
 */
function parseAsteroids(text: string): { rows: Elements[]; epochJD: number } {
  const lines = text.split("\n");
  let epochJD = 0;
  const rows: Elements[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 90) continue;
    if (i < 2) continue; // header rows
    // Skip if leading 7 chars aren't a number (header dashes etc).
    const numStr = line.slice(0, 7).trim();
    if (!/^\d+$/.test(numStr)) continue;
    // Tail = everything after column 25 (skip name).
    const tail = line.slice(25).trim();
    const tok = tail.split(/\s+/);
    if (tok.length < 8) continue;
    // tok[0] = epoch (MJD), tok[1] = a, tok[2] = e, tok[3] = i, tok[4] = node,
    // tok[5] = argperi, tok[6] = M, tok[7] = H. (G is tok[8], unused.)
    const epochMJD = parseFloat(tok[0]!);
    const a = parseFloat(tok[1]!);
    const e = parseFloat(tok[2]!);
    const inc = parseFloat(tok[3]!);
    const node = parseFloat(tok[4]!);
    const argp = parseFloat(tok[5]!);
    const M = parseFloat(tok[6]!);
    const H = parseFloat(tok[7]!);
    if (
      !Number.isFinite(a) ||
      !Number.isFinite(e) ||
      !Number.isFinite(H) ||
      !Number.isFinite(epochMJD)
    )
      continue;
    if (H >= H_CUTOFF) continue;
    if (a <= 0 || e < 0 || e >= 1) continue;
    if (epochJD === 0) epochJD = epochMJD + 2400000.5;
    rows.push({
      a,
      e,
      i: inc * DEG,
      Omega: node * DEG,
      argperi: argp * DEG,
      M0: M * DEG,
      H,
    });
  }
  return { rows, epochJD };
}

/* ────────────────────────── COMETS ────────────────────────────── */

/**
 * ELEMENTS.COMET — fixed-width. Header on lines 1-2. Per row:
 *   number/name   epoch(JD)  q(AU)   e   i(deg)   w(deg)   node(deg)  Tp(JDTDB)  Ref
 *
 * For e < 1 we have a/q via a = q/(1-e); for parabolic/hyperbolic we
 * encode `a = -q` (negative sentinel) so the renderer knows to switch
 * to the conic-section path. M0 is set to 0 (use Tp + simTime → M from
 * mean motion at runtime). For simplicity we approximate M0 from
 * (epoch - Tp) * n where n = sqrt(GM/a^3); when e>=1 we use M=0 and
 * propagate position around perihelion in the shader using a conic
 * approximation centered on Tp.
 */
function parseComets(text: string): { rows: Elements[]; epochJD: number } {
  const lines = text.split("\n");
  const rows: Elements[] = [];
  let epochJD = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 80) continue;
    if (i < 2) continue;
    // Tail after column 44 (skip designation block).
    const tail = line.slice(44).trim();
    const tok = tail.split(/\s+/);
    if (tok.length < 7) continue;
    // tok[0]=epoch(MJD), tok[1]=q, tok[2]=e, tok[3]=i, tok[4]=w,
    // tok[5]=node, tok[6]=Tp(YYYYMMDD.fff)
    const epMJD = parseFloat(tok[0]!);
    const ep = epMJD + 2400000.5; // MJD → JD
    const q = parseFloat(tok[1]!);
    const e = parseFloat(tok[2]!);
    const inc = parseFloat(tok[3]!);
    const w = parseFloat(tok[4]!);
    const node = parseFloat(tok[5]!);
    const TpYMD = parseFloat(tok[6]!);
    // Convert YYYYMMDD.fff → JD via Date.UTC.
    const Y = Math.floor(TpYMD / 10000);
    const M = Math.floor((TpYMD - Y * 10000) / 100);
    const Dfrac = TpYMD - Y * 10000 - M * 100;
    const D = Math.floor(Dfrac);
    const dayFrac = Dfrac - D;
    const TpMs = Date.UTC(Y, Math.max(0, M - 1), Math.max(1, D));
    const Tp = TpMs / 86400000 + 2440587.5 + dayFrac;
    if (
      !Number.isFinite(q) ||
      !Number.isFinite(e) ||
      !Number.isFinite(epMJD) ||
      !Number.isFinite(TpYMD)
    )
      continue;
    if (q <= 0) continue;
    if (epochJD === 0) epochJD = ep;
    // a-encoding: store +a for elliptical, -q for parabolic/hyperbolic.
    const aEnc = e < 1 ? q / (1 - e) : -q;
    // Mean anomaly at the file's epoch: M = n * (epoch - Tp), n in rad/day.
    let M0 = 0;
    if (e < 1) {
      const a = q / (1 - e);
      const n = Math.sqrt(2.959122082855911e-4 / (a * a * a)); // GM_sun in AU^3/day^2
      M0 = n * (ep - Tp);
      // Wrap to [-π, π].
      M0 = ((M0 + Math.PI) % (2 * Math.PI)) - Math.PI;
    }
    rows.push({
      a: aEnc,
      e,
      i: inc * DEG,
      Omega: node * DEG,
      argperi: w * DEG,
      M0,
      H: Tp - ep, // pack: time-since-epoch-to-perihelion (days). Renderer reads as "extra".
    });
  }
  return { rows, epochJD };
}

/* ───────────────────────── INTERSTELLAR ───────────────────────── */

type IsoEntry = {
  id: string;
  name: string;
  a: number;
  e: number;
  i: number;
  Omega: number;
  argperi: number;
  M0: number;
  epochJD: number;
};

const ISO_IDS = [
  { sstr: "1I", name: "1I/'Oumuamua" },
  { sstr: "2I", name: "2I/Borisov" },
  { sstr: "3I", name: "3I/ATLAS" },
];

// Hand-coded fallback osculating elements (in case the SBDB API is
// unreachable at bake time). Sources: JPL SBDB pages, ~2024 epochs.
const ISO_FALLBACK: IsoEntry[] = [
  {
    id: "1I",
    name: "1I/'Oumuamua",
    a: -1.2723, // hyperbolic — encoded as -q below
    e: 1.20113,
    i: 122.7417 * DEG,
    Omega: 24.5996 * DEG,
    argperi: 241.7011 * DEG,
    M0: 0,
    epochJD: 2458006.0,
  },
  {
    id: "2I",
    name: "2I/Borisov",
    a: -0.8514,
    e: 3.35642,
    i: 44.0526 * DEG,
    Omega: 308.149 * DEG,
    argperi: 209.121 * DEG,
    M0: 0,
    epochJD: 2458800.5,
  },
  {
    id: "3I",
    name: "3I/ATLAS",
    a: -1.34,
    e: 6.14,
    i: 175.1 * DEG,
    Omega: 322.2 * DEG,
    argperi: 127.5 * DEG,
    M0: 0,
    epochJD: 2460700.5,
  },
];

async function fetchInterstellar(): Promise<IsoEntry[]> {
  const out: IsoEntry[] = [];
  for (const { sstr, name } of ISO_IDS) {
    try {
      const url = `${URL_SBDB}?sstr=${encodeURIComponent(sstr)}&full-prec=true`;
      const txt = await fetchCached(url, `iso-${sstr}.json`);
      const j = JSON.parse(txt) as {
        orbit?: {
          epoch?: string;
          elements?: Array<{ name: string; value: string }>;
        };
      };
      const els = j.orbit?.elements ?? [];
      const get = (n: string): number => {
        const r = els.find((x) => x.name === n);
        return r ? parseFloat(r.value) : NaN;
      };
      const e = get("e");
      const q = get("q");
      const inc = get("i");
      const node = get("om");
      const w = get("w");
      const M = get("ma");
      const epochJD = parseFloat(j.orbit?.epoch ?? "0");
      const aEnc = e < 1 ? q / (1 - e) : -q;
      out.push({
        id: sstr,
        name,
        a: aEnc,
        e,
        i: inc * DEG,
        Omega: node * DEG,
        argperi: w * DEG,
        M0: Number.isFinite(M) ? M * DEG : 0,
        epochJD,
      });
    } catch (err) {
      console.warn(`[iso ${sstr}] using fallback (${(err as Error).message})`);
      const fb = ISO_FALLBACK.find((f) => f.id === sstr);
      if (fb) out.push(fb);
    }
  }
  return out;
}

/* ───────────────────────── BINARY WRITE ───────────────────────── */

function packBinary(rows: Elements[], header: Header): Buffer {
  const buf = Buffer.alloc(HEADER_BYTES + rows.length * RECORD_BYTES);
  // Magic 'UW01'
  buf.write("UW01", 0, 4, "ascii");
  buf.writeUInt32LE(rows.length, 4);
  buf.writeFloatLE(header.epochJD, 8);
  // 4 reserved bytes already zero
  let off = HEADER_BYTES;
  for (const r of rows) {
    buf.writeFloatLE(r.a, off);
    buf.writeFloatLE(r.e, off + 4);
    buf.writeFloatLE(r.i, off + 8);
    buf.writeFloatLE(r.Omega, off + 12);
    buf.writeFloatLE(r.argperi, off + 16);
    buf.writeFloatLE(r.M0, off + 20);
    buf.writeFloatLE(r.H, off + 24);
    off += RECORD_BYTES;
  }
  return buf;
}

/* ───────────────────────────── MAIN ────────────────────────────── */

async function main(): Promise<void> {
  await ensureDir(OUT);
  await ensureDir(CACHE);

  console.log("─── asteroids ───");
  const astText = await fetchCached(URL_AST, "ELEMENTS.NUMBR");
  const ast = parseAsteroids(astText);
  console.log(`parsed ${ast.rows.length} (H<${H_CUTOFF}), epochJD=${ast.epochJD}`);
  const astBuf = packBinary(ast.rows, { epochJD: ast.epochJD });
  await writeFile(join(OUT, "asteroids.bin"), astBuf);
  console.log(`wrote asteroids.bin (${(astBuf.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log("─── comets ───");
  const cmtText = await fetchCached(URL_CMT, "ELEMENTS.COMET");
  const cmt = parseComets(cmtText);
  console.log(`parsed ${cmt.rows.length} comets, epochJD=${cmt.epochJD}`);
  const cmtBuf = packBinary(cmt.rows, { epochJD: cmt.epochJD });
  await writeFile(join(OUT, "comets.bin"), cmtBuf);
  console.log(`wrote comets.bin (${(cmtBuf.length / 1024).toFixed(1)} KB)`);

  console.log("─── interstellar ───");
  const iso = await fetchInterstellar();
  console.log(`parsed ${iso.length} interstellar objects`);
  await writeFile(
    join(OUT, "interstellar.json"),
    JSON.stringify(iso, null, 2),
  );

  const total = astBuf.length + cmtBuf.length;
  console.log(
    `\n✔ done. total binary: ${(total / 1024 / 1024).toFixed(2)} MB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

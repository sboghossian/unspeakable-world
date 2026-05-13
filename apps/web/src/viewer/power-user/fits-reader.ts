/**
 * Minimal FITS reader (power-user feature B).
 *
 * Parses ONLY the primary HDU. Skips all extensions for v1. The FITS spec
 * is enormous; we handle the slice every astro-imaging workflow needs:
 *   • 80-byte card-image header in 2880-byte blocks, big-endian on disk
 *   • BITPIX = {8, 16, 32, -32, -64} → Float32Array (we promote everything)
 *   • NAXIS / NAXIS1 / NAXIS2 — 2D primary array only (NAXIS3+ ignored)
 *   • BSCALE / BZERO linear correction
 *   • WCS keywords: CRVAL1/2, CRPIX1/2, CDELT1/2, CTYPE1/2 (TAN + SIN)
 *
 * NOT supported in v1:
 *   • Multi-extension FITS (xtension HDUs)
 *   • PC/CD matrix rotation (we read CROTA2 if present as a fallback)
 *   • Compressed FITS (RICE, GZIP, HCOMPRESS — needs a real decompressor)
 *   • 64-bit integer BITPIX 64 (rare in imaging)
 *   • Anything other than TAN / SIN projection — others throw.
 *
 * References (read, don't copy — all are MIT-friendly):
 *   • FITS Standard 4.0 §3.3 (header) and §4.4 (WCS)
 *   • Greisen & Calabretta 2002 (WCS paper II) for projection equations
 */

const BLOCK = 2880;
const CARD = 80;

export type FitsHeader = {
  /** Original (key, value, comment) cards in document order. */
  cards: ReadonlyArray<{ key: string; value: string; comment: string }>;
  /** Indexed view, last wins (FITS allows duplicate HISTORY/COMMENT cards). */
  map: ReadonlyMap<string, string>;
};

export type FitsWcs = {
  /** Reference world coordinate longitude (RA, degrees). */
  crval1: number;
  /** Reference world coordinate latitude (Dec, degrees). */
  crval2: number;
  /** Reference pixel (1-based per FITS convention). */
  crpix1: number;
  crpix2: number;
  /** Pixel scale, degrees/pixel. */
  cdelt1: number;
  cdelt2: number;
  /** Projection code stripped from CTYPE1/2 (last 3 chars), e.g. "TAN". */
  projection: "TAN" | "SIN";
  /** Rotation around the reference pixel (degrees) — CROTA2 if present, else 0. */
  crota2: number;
};

export type FitsImage = {
  header: FitsHeader;
  /** Row-major, top-row-first pixel data, BSCALE/BZERO applied. */
  data: Float32Array;
  width: number;
  height: number;
  /** Null if the header lacks the minimal WCS keys or projection unsupported. */
  wcs: FitsWcs | null;
  /** BITPIX from the source — preserved for the UI to display. */
  bitpix: number;
  /** Auto-computed data range for thumbnail stretch. */
  min: number;
  max: number;
};

/** ASCII decoder used everywhere for header card parsing. */
const ASCII = new TextDecoder("ascii");

/**
 * Parse FITS bytes (Uint8Array or ArrayBuffer) and return the primary HDU
 * as a fully-cooked image. Throws on any non-recoverable error.
 */
export function readFits(input: ArrayBuffer | Uint8Array): FitsImage {
  const bytes =
    input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < BLOCK) {
    throw new Error("FITS file shorter than one 2880-byte block");
  }

  // Sanity: the first card must start with "SIMPLE  =".
  const firstCard = ASCII.decode(bytes.subarray(0, CARD));
  if (!/^SIMPLE\s*=/.test(firstCard)) {
    throw new Error("Not a FITS file (missing SIMPLE= card)");
  }

  // Read the header — keep consuming 2880-byte blocks until we hit END.
  const cards: Array<{ key: string; value: string; comment: string }> = [];
  let offset = 0;
  let endSeen = false;
  while (!endSeen) {
    if (offset + BLOCK > bytes.byteLength) {
      throw new Error("Truncated FITS header (no END card)");
    }
    for (let i = 0; i < BLOCK; i += CARD) {
      const raw = ASCII.decode(bytes.subarray(offset + i, offset + i + CARD));
      const key = raw.slice(0, 8).trim();
      if (key === "END") {
        endSeen = true;
        break;
      }
      if (!key) continue;
      // Value cards have `= ` in columns 9-10.
      const hasEq = raw[8] === "=";
      if (!hasEq) {
        // COMMENT / HISTORY / blank — keep as-is, value empty.
        cards.push({ key, value: "", comment: raw.slice(8).trim() });
        continue;
      }
      const rest = raw.slice(10);
      const parsed = splitValueAndComment(rest);
      cards.push({ key, value: parsed.value, comment: parsed.comment });
    }
    offset += BLOCK;
  }

  const map = new Map<string, string>();
  for (const c of cards) {
    if (c.key && c.value) map.set(c.key, c.value);
  }

  const bitpix = parseIntCard(map, "BITPIX");
  const naxis = parseIntCard(map, "NAXIS");
  if (naxis < 2) {
    throw new Error(`Primary HDU has NAXIS=${naxis}; need a 2D image`);
  }
  const width = parseIntCard(map, "NAXIS1");
  const height = parseIntCard(map, "NAXIS2");
  // Higher-NAXIS cubes: we take the first plane only.
  let depth = 1;
  for (let i = 3; i <= naxis; i++) {
    const dim = Number.parseInt(map.get(`NAXIS${i}`) ?? "1", 10);
    depth *= Number.isFinite(dim) && dim > 0 ? dim : 1;
  }

  const bscale = parseFloatCardOr(map, "BSCALE", 1);
  const bzero = parseFloatCardOr(map, "BZERO", 0);

  const dataStart = offset;
  const bytesPerPx = Math.abs(bitpix) / 8;
  const totalPixels = width * height * depth;
  const expected = totalPixels * bytesPerPx;
  if (dataStart + expected > bytes.byteLength) {
    throw new Error(
      `Truncated FITS data: header advertises ${expected} bytes, file has ${bytes.byteLength - dataStart}`,
    );
  }
  const planePixels = width * height;
  const data = readPlane(
    bytes,
    dataStart,
    planePixels,
    bitpix,
    bscale,
    bzero,
  );

  // FITS convention: row 0 is at the BOTTOM of the image when displayed in
  // sky orientation. We flip rows here so a naive canvas-render shows the
  // image right-side-up.
  flipRowsInPlace(data, width, height);

  // Compute min/max in one pass (skipping NaN which our int branches won't
  // produce but float branches can).
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 1;
  }

  const wcs = parseWcs(map);

  return {
    header: { cards, map },
    data,
    width,
    height,
    wcs,
    bitpix,
    min,
    max,
  };
}

function splitValueAndComment(rest: string): { value: string; comment: string } {
  // FITS strings start with `'` and may contain `''` as an escaped quote.
  // Numbers / bools end at the first `/` not inside a string.
  let i = 0;
  while (i < rest.length && rest[i] === " ") i++;
  if (rest[i] === "'") {
    // String literal.
    let j = i + 1;
    let buf = "";
    while (j < rest.length) {
      if (rest[j] === "'" && rest[j + 1] === "'") {
        buf += "'";
        j += 2;
        continue;
      }
      if (rest[j] === "'") {
        j++;
        break;
      }
      buf += rest[j];
      j++;
    }
    // Skip to comment delimiter.
    let k = j;
    while (k < rest.length && rest[k] !== "/") k++;
    return {
      value: buf.replace(/\s+$/, ""),
      comment: rest.slice(k + 1).trim(),
    };
  }
  // Non-string value.
  const slash = rest.indexOf("/");
  if (slash < 0) return { value: rest.trim(), comment: "" };
  return {
    value: rest.slice(0, slash).trim(),
    comment: rest.slice(slash + 1).trim(),
  };
}

function parseIntCard(map: ReadonlyMap<string, string>, key: string): number {
  const raw = map.get(key);
  if (raw === undefined) throw new Error(`Missing FITS card: ${key}`);
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`Non-integer ${key}: "${raw}"`);
  return n;
}

function parseFloatCardOr(
  map: ReadonlyMap<string, string>,
  key: string,
  fallback: number,
): number {
  const raw = map.get(key);
  if (raw === undefined) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Read a single 2D plane out of the raw FITS data block. We always return
 * Float32Array — promoting ints lets the rest of the pipeline (thumbnail
 * stretch, WebGL texture upload) treat all data uniformly.
 */
function readPlane(
  bytes: Uint8Array,
  start: number,
  pixels: number,
  bitpix: number,
  bscale: number,
  bzero: number,
): Float32Array {
  const out = new Float32Array(pixels);
  const dv = new DataView(
    bytes.buffer,
    bytes.byteOffset + start,
    pixels * (Math.abs(bitpix) / 8),
  );

  switch (bitpix) {
    case 8: {
      for (let i = 0; i < pixels; i++) {
        out[i] = dv.getUint8(i) * bscale + bzero;
      }
      break;
    }
    case 16: {
      for (let i = 0; i < pixels; i++) {
        out[i] = dv.getInt16(i * 2, false) * bscale + bzero;
      }
      break;
    }
    case 32: {
      for (let i = 0; i < pixels; i++) {
        out[i] = dv.getInt32(i * 4, false) * bscale + bzero;
      }
      break;
    }
    case -32: {
      for (let i = 0; i < pixels; i++) {
        out[i] = dv.getFloat32(i * 4, false) * bscale + bzero;
      }
      break;
    }
    case -64: {
      for (let i = 0; i < pixels; i++) {
        out[i] = dv.getFloat64(i * 8, false) * bscale + bzero;
      }
      break;
    }
    default:
      throw new Error(`Unsupported BITPIX ${bitpix}`);
  }
  return out;
}

function flipRowsInPlace(
  data: Float32Array,
  width: number,
  height: number,
): void {
  const tmp = new Float32Array(width);
  for (let y = 0; y < Math.floor(height / 2); y++) {
    const top = y * width;
    const bot = (height - 1 - y) * width;
    tmp.set(data.subarray(top, top + width));
    data.copyWithin(top, bot, bot + width);
    data.set(tmp, bot);
  }
}

function parseWcs(map: ReadonlyMap<string, string>): FitsWcs | null {
  const crval1 = parseFloatCardOr(map, "CRVAL1", Number.NaN);
  const crval2 = parseFloatCardOr(map, "CRVAL2", Number.NaN);
  const crpix1 = parseFloatCardOr(map, "CRPIX1", Number.NaN);
  const crpix2 = parseFloatCardOr(map, "CRPIX2", Number.NaN);
  if (
    !Number.isFinite(crval1) ||
    !Number.isFinite(crval2) ||
    !Number.isFinite(crpix1) ||
    !Number.isFinite(crpix2)
  ) {
    return null;
  }

  // CDELT or — if missing — derive from a CD/PC matrix diagonal. For v1 we
  // only support pure CDELT; rotated matrices fall through with cdelt=NaN.
  let cdelt1 = parseFloatCardOr(map, "CDELT1", Number.NaN);
  let cdelt2 = parseFloatCardOr(map, "CDELT2", Number.NaN);
  if (!Number.isFinite(cdelt1) || !Number.isFinite(cdelt2)) {
    const cd11 = parseFloatCardOr(map, "CD1_1", Number.NaN);
    const cd22 = parseFloatCardOr(map, "CD2_2", Number.NaN);
    if (Number.isFinite(cd11) && Number.isFinite(cd22)) {
      cdelt1 = cd11;
      cdelt2 = cd22;
    } else {
      return null;
    }
  }

  const ctype1 = (map.get("CTYPE1") ?? "").toUpperCase();
  const ctype2 = (map.get("CTYPE2") ?? "").toUpperCase();
  // CTYPE strings look like "RA---TAN" / "DEC--TAN". Strip to the last
  // 3 non-dash chars.
  const proj = ctype1.replace(/-+$/, "").slice(-3) ||
    ctype2.replace(/-+$/, "").slice(-3);
  if (proj !== "TAN" && proj !== "SIN") {
    // Header is otherwise WCS-valid; we just can't project it.
    return null;
  }

  const crota2 = parseFloatCardOr(map, "CROTA2", 0);

  return {
    crval1,
    crval2,
    crpix1,
    crpix2,
    cdelt1,
    cdelt2,
    projection: proj,
    crota2,
  };
}

/**
 * Convert one image pixel (1-based, FITS convention) to (RA, Dec) degrees
 * using a TAN or SIN gnomonic projection around (CRVAL1, CRVAL2). Returns
 * NaNs if the point is on the far side of the celestial sphere for SIN.
 */
export function pixelToRaDec(
  wcs: FitsWcs,
  px: number,
  py: number,
): { raDeg: number; decDeg: number } {
  // Intermediate world coords (degrees) — relative offsets from CRPIX,
  // rotated by CROTA2 if present, scaled by CDELT.
  const dx = px - wcs.crpix1;
  const dy = py - wcs.crpix2;
  const rot = (wcs.crota2 * Math.PI) / 180;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const xi = (cr * dx + sr * dy) * wcs.cdelt1;
  const eta = (-sr * dx + cr * dy) * wcs.cdelt2;

  // Native spherical coords (radians).
  const xiR = (xi * Math.PI) / 180;
  const etaR = (eta * Math.PI) / 180;

  let phi: number;
  let theta: number;

  if (wcs.projection === "TAN") {
    const r = Math.hypot(xiR, etaR);
    phi = Math.atan2(xiR, -etaR);
    theta = Math.atan2(1, r);
  } else {
    // SIN
    const r2 = xiR * xiR + etaR * etaR;
    if (r2 >= 1) return { raDeg: Number.NaN, decDeg: Number.NaN };
    phi = Math.atan2(xiR, -etaR);
    theta = Math.acos(Math.sqrt(r2));
  }

  // Rotate native → celestial using CRVAL as the reference pole.
  const ra0 = (wcs.crval1 * Math.PI) / 180;
  const dec0 = (wcs.crval2 * Math.PI) / 180;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const sinD0 = Math.sin(dec0);
  const cosD0 = Math.cos(dec0);

  const dec = Math.asin(sinT * sinD0 + cosT * cosD0 * Math.cos(phi));
  const ra =
    ra0 +
    Math.atan2(
      -cosT * Math.sin(phi),
      sinT * cosD0 - cosT * sinD0 * Math.cos(phi),
    );

  let raDeg = (ra * 180) / Math.PI;
  raDeg = ((raDeg % 360) + 360) % 360;
  return { raDeg, decDeg: (dec * 180) / Math.PI };
}

/**
 * Linear-stretch the float data into 8-bit greyscale RGBA for a quick
 * thumbnail. Caller provides a target ImageData (so the canvas size and
 * image size match). Percentile clipping at 2/98 makes faint sources
 * visible without saturating bright stars.
 */
export function stretchToImageData(
  data: Float32Array,
  width: number,
  height: number,
  target: ImageData,
): void {
  if (target.width !== width || target.height !== height) {
    throw new Error("stretchToImageData: size mismatch");
  }
  // 2/98 percentile via 256-bin histogram on a 0..1 normalisation.
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || max === min) {
    min = 0;
    max = 1;
  }
  const bins = new Uint32Array(256);
  const inv = 255 / (max - min);
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    if (!Number.isFinite(v)) continue;
    const b = Math.max(0, Math.min(255, Math.floor((v - min) * inv)));
    bins[b] = (bins[b] ?? 0) + 1;
  }
  const total = data.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  const loCut = total * 0.02;
  const hiCut = total * 0.98;
  for (let i = 0; i < 256; i++) {
    acc += bins[i] ?? 0;
    if (acc <= loCut) lo = i;
    if (acc <= hiCut) hi = i;
  }
  const loVal = min + lo / inv;
  const hiVal = min + hi / inv;
  const span = hiVal - loVal || 1;

  const buf = target.data;
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    let g = ((v - loVal) / span) * 255;
    if (!Number.isFinite(g)) g = 0;
    if (g < 0) g = 0;
    else if (g > 255) g = 255;
    const idx = i * 4;
    buf[idx] = g;
    buf[idx + 1] = g;
    buf[idx + 2] = g;
    buf[idx + 3] = 255;
  }
}

/**
 * One-shot helper: parse a File from a drop zone and resolve when the
 * primary HDU is fully decoded.
 */
export async function readFitsFromFile(file: File): Promise<FitsImage> {
  const buf = await file.arrayBuffer();
  return readFits(buf);
}

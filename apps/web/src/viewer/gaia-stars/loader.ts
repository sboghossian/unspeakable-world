/**
 * Binary loader for the baked Gaia DR3 catalog.
 *
 * Wire format (little-endian):
 *
 *   header (16 bytes)
 *     0..4   magic   "GAIA"
 *     4..8   uint32  record count
 *     8..12  uint32  version (1)
 *     12..16 reserved
 *
 *   record (20 bytes × count)
 *     0..4   float32 ra_rad
 *     4..8   float32 dec_rad
 *     8..12  float32 parallax_mas
 *     12..16 float32 g_mag
 *     16..20 float32 bp_rp
 *
 * The bake script writes ra/dec in *radians* (not degrees) so the
 * renderer can skip a per-vertex conversion. The file is sorted by
 * G magnitude ascending — that way truncating to N points always
 * keeps the brightest stars.
 */

import { log } from "../../lib/logger";

export const RECORD_BYTES = 20;
export const HEADER_BYTES = 16;
export const MAGIC = "GAIA";

export type GaiaRecord = {
  raRad: number;
  decRad: number;
  parallaxMas: number;
  gMag: number;
  bpRp: number;
};

export type DecodedCatalog = {
  count: number;
  version: number;
  /** Flat Float32Array, 5 floats per record. Same layout as the file. */
  buffer: Float32Array;
};

/**
 * Decide which baked file to fetch. The build pipeline writes
 * either `gaia-1m.bin` (full bake) or `gaia-100k.bin` (fallback);
 * we probe at runtime via a tiny manifest so the renderer doesn't
 * need to hard-code the count.
 */
export function resolveGaiaSource(): { url: string; manifestUrl: string } {
  return {
    url: "/data/gaia-1m.bin",
    manifestUrl: "/data/gaia-manifest.json",
  };
}

export type GaiaManifest = {
  source: string;
  version: number;
  count: number;
  magLimit: number;
  binFile: string;
  fetched: string;
};

/**
 * Fetch the manifest, then the binary, then decode. Falls back to
 * the 100K file if the 1M file 404s — keeps the layer alive when
 * the ETL was run in fast mode.
 */
export async function loadGaiaCatalog(
  primaryUrl: string,
  manifestUrl: string,
): Promise<DecodedCatalog> {
  let manifest: GaiaManifest | null = null;
  try {
    const m = await fetch(manifestUrl);
    if (m.ok) manifest = (await m.json()) as GaiaManifest;
  } catch (err) {
    log.warn("[gaia-stars]", "manifest fetch failed", err);
  }

  const url = manifest ? `/data/${manifest.binFile}` : primaryUrl;
  const res = await fetch(url);
  if (!res.ok) {
    // 100k fallback
    const fb = await fetch("/data/gaia-100k.bin");
    if (!fb.ok) {
      throw new Error(
        `gaia-stars: no catalog file available (tried ${url} and gaia-100k.bin)`,
      );
    }
    return decode(await fb.arrayBuffer());
  }
  return decode(await res.arrayBuffer());
}

function decode(buf: ArrayBuffer): DecodedCatalog {
  if (buf.byteLength < HEADER_BYTES) {
    throw new Error("gaia-stars: file too short for header");
  }
  const dv = new DataView(buf);
  const magic =
    String.fromCharCode(dv.getUint8(0)) +
    String.fromCharCode(dv.getUint8(1)) +
    String.fromCharCode(dv.getUint8(2)) +
    String.fromCharCode(dv.getUint8(3));
  if (magic !== MAGIC) {
    throw new Error(`gaia-stars: bad magic '${magic}', expected '${MAGIC}'`);
  }
  const count = dv.getUint32(4, true);
  const version = dv.getUint32(8, true);
  const expectedBytes = HEADER_BYTES + count * RECORD_BYTES;
  if (buf.byteLength < expectedBytes) {
    throw new Error(
      `gaia-stars: truncated file (${buf.byteLength} < ${expectedBytes})`,
    );
  }
  // Float32Array view directly over the record region — zero-copy.
  const buffer = new Float32Array(buf, HEADER_BYTES, count * 5);
  return { count, version, buffer };
}

/**
 * Convert (ra, dec, parallax) → galactic XYZ in parsecs.
 *
 * Note: we treat ra/dec as equatorial J2000 and emit XYZ in the same
 * frame the HYG `raDecToVec3` uses (Z = celestial north), so the
 * containing `Group` rotation (-π/2 around X) makes Y the up axis
 * in three.js space. That's the convention every other viewer
 * layer in this repo follows.
 *
 * `distancePc` is clamped to [10, 10000]: parallax errors near zero
 * blow up to ~10kpc nonsense and would otherwise place a halo of
 * "stars" beyond the galaxy.
 */
export function recordToXyzPc(rec: GaiaRecord): [number, number, number] {
  const distPc = Math.min(
    10_000,
    Math.max(10, 1000 / Math.max(rec.parallaxMas, 0.1)),
  );
  const cosDec = Math.cos(rec.decRad);
  const x = distPc * cosDec * Math.cos(rec.raRad);
  const y = distPc * cosDec * Math.sin(rec.raRad);
  const z = distPc * Math.sin(rec.decRad);
  return [x, y, z];
}

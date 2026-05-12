/**
 * Planck CMB polarization — Q/U Stokes parameters at HEALPix NSIDE 16
 * (3072 pixels), downgraded from the SMICA thermal-dust polarization map
 * (the strongest polarized signal on the sky at 353 GHz).
 *
 * Source upstream (NOT bundled — ~384 MB FITS at full NSIDE 2048):
 *   https://irsa.ipac.caltech.edu/data/Planck/release_3/all-sky-maps/
 *     maps/component-maps/foregrounds/
 *     COM_CompMap_QU-thermaldust-smica_2048_R3.00_full.fits
 *
 * Bake pipeline (`scripts/bake-planck-real.py`):
 *   • `hp.read_map(...)` → Q, U at NSIDE 2048 in mK_RJ
 *   • `hp.ud_grade(..., nside_out=16)` averages each high-resolution
 *     pixel's children
 *   • mK_RJ → µK_CMB conversion at 353 GHz (factor 3.30, Planck 2018 IX)
 *   • Galactic → ICRS pixel-centre conversion via `astropy.SkyCoord`
 *
 * A pure-TypeScript fallback (`scripts/bake-planck-polarization.ts`)
 * emits a synthetic field with the same JSON shape — kept for
 * environments without Python + healpy.
 *
 * Output JSON (apps/web/public/data/planck-polarization.json):
 *   {
 *     attribution: string;
 *     nside: number;            // HEALPix NSIDE used
 *     nVectors: number;
 *     // Flattened: [ra0, dec0, Q0, U0, ra1, dec1, Q1, U1, …] (µK_CMB)
 *     data: number[];
 *   }
 *
 * `Q` and `U` follow the IAU convention (psi measured from north toward
 * east). Polarization angle ψ = ½ atan2(U, Q), magnitude P = √(Q² + U²).
 */

export type PolarizationVector = {
  /** Right ascension, degrees, J2000. */
  raDeg: number;
  /** Declination, degrees, J2000. */
  decDeg: number;
  /** Stokes Q (µK_CMB), IAU convention. */
  Q: number;
  /** Stokes U (µK_CMB), IAU convention. */
  U: number;
};

export type PolarizationDataset = {
  attribution: string;
  nside: number;
  vectors: PolarizationVector[];
};

/** Parse the flat-array JSON written by the bake script into typed
 *  vectors. Caller is responsible for fetching the JSON itself. */
export function parsePolarizationJson(
  raw: unknown,
): PolarizationDataset | null {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("data" in raw) ||
    !Array.isArray((raw as { data: unknown }).data)
  ) {
    return null;
  }
  const obj = raw as {
    attribution?: unknown;
    nside?: unknown;
    data: number[];
  };
  if (obj.data.length % 4 !== 0) return null;
  const attribution =
    typeof obj.attribution === "string"
      ? obj.attribution
      : "Planck Collaboration / ESA";
  const nside = typeof obj.nside === "number" ? obj.nside : 16;
  const vectors: PolarizationVector[] = [];
  for (let i = 0; i < obj.data.length; i += 4) {
    const raDeg = obj.data[i];
    const decDeg = obj.data[i + 1];
    const Q = obj.data[i + 2];
    const U = obj.data[i + 3];
    if (
      typeof raDeg !== "number" ||
      typeof decDeg !== "number" ||
      typeof Q !== "number" ||
      typeof U !== "number"
    )
      continue;
    if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) continue;
    vectors.push({ raDeg, decDeg, Q, U });
  }
  return { attribution, nside, vectors };
}

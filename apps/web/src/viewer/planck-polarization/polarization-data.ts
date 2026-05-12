/**
 * Planck CMB polarization — Q/U Stokes parameters subsampled from the
 * 353 GHz HFI PR3 polarization map.
 *
 * Source upstream (NOT bundled — too large at ~600 MB full sky):
 *   http://pla.esac.esa.int/pla/
 *   HFI_SkyMap_353_2048_R3.01_full.fits  (Q, U columns, HEALPix NSIDE 2048)
 *
 * The bake script `scripts/bake-planck-polarization.ts` either downloads
 * + degrades the full map to NSIDE 16 (~3072 pixels) or, if the FITS
 * data isn't reachable, emits a synthetic field matching the well-known
 * Planck large-scale polarization morphology:
 *
 *   • Strong horizontal alignment along the galactic plane (b ≈ 0°),
 *     amplitude ramps with sin²(2b) modulation
 *   • Vertical "puddle" features around the north galactic pole
 *   • Random small-scale noise floor at the ~3 µK level
 *
 * Both real and synthetic outputs follow the same JSON shape so the
 * renderer code path is identical.
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

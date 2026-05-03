/**
 * Equatorial → cartesian on a unit sphere.
 *
 *   ra ∈ [0, 360°)  — right ascension, equatorial
 *   dec ∈ [-90°, +90°] — declination
 *
 * Returns a vector that points outward from origin to the (ra, dec) on
 * the celestial sphere — same orientation HEALPix's `corners_nest` uses.
 */
export function raDecToVec3(
  raDeg: number,
  decDeg: number,
  radius = 1,
): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  const x = radius * cosDec * Math.cos(ra);
  const y = radius * cosDec * Math.sin(ra);
  const z = radius * Math.sin(dec);
  return [x, y, z];
}

/**
 * B-V color index → linear RGB.
 *
 * Approximation of black-body color, good enough for visual rendering at
 * naked-eye magnitudes. -0.4 = blue O/B; 0.0 = white A; +0.6 = yellow G;
 * +1.5 = red M.
 */
export function bvToRgb(bv: number): [number, number, number] {
  // Clamp to a reasonable range so the lookup doesn't blow up on weird values.
  const t = Math.max(-0.4, Math.min(2.0, bv));
  let r: number;
  let g: number;
  let b: number;
  if (t < 0.0) {
    r = 0.61 + 0.11 * t + 0.1 * t * t;
    g = 0.7 + 0.07 * t + 0.1 * t * t;
    b = 1.0;
  } else if (t < 0.4) {
    r = 0.83 + 0.17 * t;
    g = 0.87 + 0.11 * t;
    b = 1.0;
  } else if (t < 1.6) {
    const u = (t - 0.4) / 1.2;
    r = 1.0;
    g = 0.98 - 0.16 * u;
    b = 1.0 - 0.47 * u - 0.18 * u * u;
  } else {
    r = 1.0;
    g = 0.82 - 0.5 * (t - 1.6);
    b = 0.35 - 0.1 * (t - 1.6);
  }
  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

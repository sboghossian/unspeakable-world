import { Vector3 } from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Tonight's-sky observer math.
 *
 * The user's zenith — the point directly above their head — points to
 * equatorial coordinates (RA = LST, Dec = lat), where LST is the local
 * sidereal time. Looking at that direction means looking straight up
 * from the user's location at the given time.
 */

/**
 * Compute Local Sidereal Time (LST) in degrees [0, 360) for a longitude
 * (east positive, in degrees) at a given UTC time.
 *
 * Uses the IAU GMST formula (Meeus 1998, ch. 12, eq. 12.4) at midnight
 * plus the diurnal rotation up to the requested moment. Accuracy ~1 arcsec
 * for any time within the next century — far more than we need for a
 * casual "look up" framing.
 */
export function localSiderealTimeDeg(time: Date, lonDeg: number): number {
  const jd = toJulianDate(time);
  const t = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000
  // GMST in degrees (Meeus eq. 12.4)
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000.0;
  // East longitude = positive offset from Greenwich.
  let lst = gmst + lonDeg;
  lst = ((lst % 360) + 360) % 360;
  return lst;
}

/**
 * Equatorial direction the user's zenith points at, given their location
 * and the current simulation time. Returned as a world-space unit vector
 * already rotated by the same Z-up → Y-up rotation our astronomy groups
 * apply, so it can be handed straight to `controls.setForward` or
 * `scene.flyTo`.
 */
export function zenithWorldDirection(
  lat: number,
  lonEast: number,
  time: Date,
): Vector3 {
  const lstDeg = localSiderealTimeDeg(time, lonEast);
  // RA = LST, Dec = latitude. Get vec3 in celestial-Z-up coords.
  const [x, y, z] = raDecToVec3(lstDeg, lat, 1);
  // Apply the same rotation our astronomy groups apply: rotation.x = -π/2
  // takes (x, y, z) → (x, z, -y) so celestial +Z lands on world +Y.
  return new Vector3(x, z, -y).normalize();
}

/** Convert a Date to Julian Date (UT). */
function toJulianDate(d: Date): number {
  const ms = d.getTime();
  return ms / 86400000 + 2440587.5;
}

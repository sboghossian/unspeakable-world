import { localSiderealTimeDeg } from "./zenith";

/**
 * Rise / transit / set times for an arbitrary equatorial point, given an
 * observer location and a reference moment ("now"). Returns the next
 * occurrences after `from`, or a circumpolar / never-rises classification.
 *
 * Pure analytical solve via local sidereal time and hour-angle geometry —
 * no integration, no numerical sampling, accurate to ~30s for stars and
 * static deep-sky targets which is far better than the ±a-minute
 * uncertainty the user can perceive in a casual "tonight" panel.
 *
 * For Solar System bodies (Sun, Moon, planets), proper motion across a day
 * matters and these times will drift by a few minutes. v2 should special-
 * case those by sampling, but the current consumer is the SIMBAD info
 * panel which only shows static targets.
 */

const REFRACTION_DEG = -0.5667; // standard atmospheric refraction at horizon

export type RiseSet =
  | {
      kind: "transits";
      rise: Date;
      transit: Date;
      set: Date;
      currentlyUp: boolean;
    }
  | { kind: "circumpolar"; transit: Date; currentlyUp: true }
  | { kind: "never"; currentlyUp: false };

export function computeRiseSet(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  from: Date = new Date(),
): RiseSet {
  const lat = (latDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const h0 = (REFRACTION_DEG * Math.PI) / 180;

  // cos(H) = (sin(h0) - sin(lat) sin(dec)) / (cos(lat) cos(dec))
  const cosH =
    (Math.sin(h0) - Math.sin(lat) * Math.sin(dec)) /
    (Math.cos(lat) * Math.cos(dec));

  // Current altitude — needed to colour "currently up" badge.
  const alt = currentAltitude(raDeg, decDeg, latDeg, lonDeg, from);
  const currentlyUp = alt > REFRACTION_DEG;

  if (cosH < -1) {
    // Always above horizon at this latitude.
    return {
      kind: "circumpolar",
      transit: nextTransit(raDeg, lonDeg, from),
      currentlyUp: true,
    };
  }
  if (cosH > 1) {
    // Always below horizon — never rises tonight (or ever, here).
    return { kind: "never", currentlyUp: false };
  }

  const Hdeg = (Math.acos(cosH) * 180) / Math.PI;
  const transit = nextTransit(raDeg, lonDeg, from);
  // Hour-angle covers Hdeg of sky, sidereal day ≈ 360.985647°/day, so
  // converting degrees of HA → milliseconds:
  const haMs = (Hdeg / 360.98564736629) * 86400000;
  let rise = new Date(transit.getTime() - haMs);
  let set = new Date(transit.getTime() + haMs);

  // We want the *next* rise and *next* set after `from`. Step backward by
  // a sidereal day if needed so we don't show times in the past.
  const SIDEREAL_DAY_MS = (86400000 * 360) / 360.98564736629;
  if (rise.getTime() < from.getTime()) {
    // Rise has passed; the relevant rise is one sidereal day later only
    // if the set has *also* passed. Otherwise the object is currently up
    // and the next set is what matters (but we still report the *next*
    // rise, which is one sidereal day from this one).
    if (set.getTime() < from.getTime()) {
      rise = new Date(rise.getTime() + SIDEREAL_DAY_MS);
      set = new Date(set.getTime() + SIDEREAL_DAY_MS);
    } else {
      rise = new Date(rise.getTime() + SIDEREAL_DAY_MS);
    }
  }

  return { kind: "transits", rise, transit, set, currentlyUp };
}

/** Next transit (HA = 0) at or after `from`. */
function nextTransit(raDeg: number, lonDeg: number, from: Date): Date {
  const lst = localSiderealTimeDeg(from, lonDeg);
  // Want LST = RA. Sidereal time advances at 360.98564736629°/day.
  let deltaDeg = (((raDeg - lst) % 360) + 360) % 360; // [0, 360)
  if (deltaDeg === 0) deltaDeg = 360; // strictly "next", not "now"
  const ms = (deltaDeg / 360.98564736629) * 86400000;
  return new Date(from.getTime() + ms);
}

/** Current altitude in degrees (positive = above horizon). */
export function currentAltitude(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  time: Date,
): number {
  const lst = localSiderealTimeDeg(time, lonDeg);
  const HA = ((lst - raDeg) * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) +
    Math.cos(lat) * Math.cos(dec) * Math.cos(HA);
  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

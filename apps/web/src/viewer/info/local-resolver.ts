import { Vector3 } from "three";
import type { ViewerScene } from "../scene/scene";
import { type SimbadHit, worldDirectionToRaDec } from "./simbad";

/**
 * Local-first click resolver: before going to SIMBAD, check whether the
 * click landed on a Solar System body or the ISS. SIMBAD doesn't track
 * those (they aren't fixed RA/Dec sources), so without this short-
 * circuit the inspector returns "nothing within 10 arcmin" or worse,
 * the wrong static catalog match.
 *
 * Returns a synthetic SimbadHit so the rest of the inspector code path
 * (Wikipedia chaining, "Fly here", favorites toggle) Just Works.
 */

const SOLAR_LABELS = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
];

const SPACECRAFT_DETAIL: Record<string, string> = {
  "Voyager 1":
    "Spacecraft · launched 1977-09-05 · ~166 AU · interstellar (since 2012)",
  "Voyager 2":
    "Spacecraft · launched 1977-08-20 · ~138 AU · interstellar (since 2018)",
  "Pioneer 10":
    "Spacecraft · launched 1972-03-03 · last signal 2003 · → Aldebaran",
  "Pioneer 11":
    "Spacecraft · launched 1973-04-06 · last signal 1995 · → Aquila",
  "New Horizons":
    "Spacecraft · launched 2006-01-19 · post-Pluto · KBO survey",
  JWST: "Spacecraft · James Webb Space Telescope · Earth-Sun L2 · 1.5M km anti-solar",
};

/** Tap-tolerance in degrees, scaled by current FOV. */
function hitRadiusDeg(fov: number): number {
  // At 60° FOV we accept ±2°, at 1° FOV we accept ±0.05°. Scales with FOV.
  return Math.max(0.05, Math.min(3.0, fov * 0.04));
}

export function resolveLocalHit(
  scene: ViewerScene,
  clickDir: Vector3,
  fov: number,
): SimbadHit | null {
  const tol = hitRadiusDeg(fov);
  // Sort candidates by angular distance, take the closest within tolerance.
  type Cand = { label: string; angle: number; dir: Vector3 };
  const cands: Cand[] = [];

  for (const label of SOLAR_LABELS) {
    const d = scene.bodyDirection(label);
    if (!d) continue;
    const a =
      (Math.acos(Math.max(-1, Math.min(1, d.dot(clickDir)))) * 180) / Math.PI;
    cands.push({ label, angle: a, dir: d });
  }
  // ISS is small but worth catching when zoomed in.
  const iss = scene.bodyDirection("ISS");
  if (iss) {
    const a =
      (Math.acos(Math.max(-1, Math.min(1, iss.dot(clickDir)))) * 180) / Math.PI;
    cands.push({ label: "ISS", angle: a, dir: iss });
  }
  // Spacecraft markers — only when the layer is visible. We skip them when
  // hidden so a click in empty sky doesn't accidentally match a Voyager
  // sitting in the background.
  const list = scene.spacecraftList();
  if (list.length > 0 && scene.spacecraftLayerVisible()) {
    for (const c of list) {
      const dir = new Vector3(c.direction.x, c.direction.y, c.direction.z);
      const a =
        (Math.acos(Math.max(-1, Math.min(1, dir.dot(clickDir)))) * 180) /
        Math.PI;
      cands.push({ label: c.name, angle: a, dir });
    }
  }
  cands.sort((a, b) => a.angle - b.angle);
  const best = cands[0];
  if (!best || best.angle > tol) return null;

  const { ra, dec } = worldDirectionToRaDec(best.dir);
  return synthesizeHit(best.label, ra, dec);
}

function synthesizeHit(
  label: string,
  raDeg: number,
  decDeg: number,
): SimbadHit {
  const isSun = label === "Sun";
  const isMoon = label === "Moon";
  const isIss = label === "ISS";
  const isCraft = label in SPACECRAFT_DETAIL;
  const type = isCraft
    ? "Sat"
    : isSun
      ? "*"
      : isIss
        ? "Sat"
        : isMoon
          ? "Moo"
          : "Pl";
  const description = isCraft
    ? SPACECRAFT_DETAIL[label]!
    : isIss
      ? "Spacecraft · International Space Station · Earth orbit"
      : isSun
        ? "G-type main-sequence star"
        : isMoon
          ? "Earth's natural satellite"
          : "Solar System planet";
  return {
    name: label,
    type,
    vMag: null,
    raDeg,
    decDeg,
    radialVelocity: null,
    redshift: null,
    spectralType: isSun ? "G2V" : null,
    identifiers: [description],
    raw: `local-resolver: ${label}`,
  };
}

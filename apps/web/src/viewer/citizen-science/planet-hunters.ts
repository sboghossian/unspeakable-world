/**
 * Planet Hunters TESS — Zooniverse project metadata.
 *
 * Surfaces a "help classify this TOI" prompt in the inspector when the
 * clicked object is a TESS Object of Interest or a star with a known
 * candidate signal. Planet Hunters volunteers have co-authored multiple
 * confirmed-planet papers, so this is a real contribution path.
 */
import { PROJECTS, buildLink, type ZooniverseProject } from "./index";

const PROJECT: ZooniverseProject = (() => {
  const p = PROJECTS.find((x) => x.id === "planet-hunters");
  if (!p) throw new Error("planet-hunters project missing from PROJECTS");
  return p;
})();

export const PLANET_HUNTERS = PROJECT;

/**
 * True if this SIMBAD type / catalog id should surface the Planet
 * Hunters card. The project takes TESS Objects of Interest and any
 * exoplanet-host candidate — we accept SIMBAD "TOI", "exo", and the
 * star types "*" / "**" since the user might click a host star
 * directly.
 */
export function isPlanetHuntersEligible(typeOrId: string): boolean {
  const t = typeOrId.trim();
  if (!t) return false;
  for (const accept of PROJECT.accepts) {
    if (t.startsWith(accept)) return true;
  }
  return false;
}

export function planetHuntersLink(targetId: string): string {
  return buildLink(PROJECT, targetId);
}

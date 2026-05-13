/**
 * Galaxy Zoo — Zooniverse project metadata + helper to test whether a
 * SIMBAD type code should surface the "help classify" prompt for a
 * galaxy / AGN / cluster.
 *
 * We don't iframe Galaxy Zoo (the project's classification UI is best
 * served at zooniverse.org, and they explicitly ask third-party
 * embeds not to undercut their analytics + onboarding). Instead the
 * inspector shows a compact card and links out.
 */
import { PROJECTS, buildLink, type ZooniverseProject } from "./index";

const PROJECT: ZooniverseProject = (() => {
  const p = PROJECTS.find((x) => x.id === "galaxy-zoo");
  if (!p) throw new Error("galaxy-zoo project missing from PROJECTS");
  return p;
})();

export const GALAXY_ZOO = PROJECT;

/**
 * True if this SIMBAD object type makes sense for Galaxy Zoo. The
 * project wants galaxies and galaxy-adjacent extragalactic objects;
 * we deliberately keep this list permissive — a false positive just
 * means the user sees the card and ignores it.
 */
export function isGalaxyZooEligible(simbadType: string): boolean {
  const t = simbadType.trim();
  if (!t) return false;
  for (const accept of PROJECT.accepts) {
    if (t.startsWith(accept)) return true;
  }
  return false;
}

export function galaxyZooLink(targetId: string): string {
  return buildLink(PROJECT, targetId);
}

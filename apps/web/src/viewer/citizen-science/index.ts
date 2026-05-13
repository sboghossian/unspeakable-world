/**
 * citizen-science — invitation cards that link the inspector to live
 * Zooniverse projects.
 *
 * We deliberately do NOT iframe Zooniverse in-app: their UI doesn't
 * pass clicks back cleanly, breaks on small viewports, and most
 * importantly we shouldn't take credit for their classification UX.
 * Instead we show a small "help classify this" card that deep-links
 * out to the relevant project, prefilled with the target ID where the
 * project supports it.
 *
 * Public API:
 *   - matchProject(typeOrId): pick which Zooniverse project (if any)
 *     fits the SIMBAD object type / catalog ID under the inspector.
 *   - buildLink(project, target): build the deep-link URL.
 *   - PROJECTS — readonly project metadata used by the UI card.
 */

export type ZooniverseProject = {
  readonly id: "galaxy-zoo" | "planet-hunters";
  readonly label: string;
  readonly url: string;
  readonly blurb: string;
  /** Object kinds (loose SIMBAD type-code prefixes) this project wants. */
  readonly accepts: readonly string[];
};

export const PROJECTS: readonly ZooniverseProject[] = [
  {
    id: "galaxy-zoo",
    label: "Galaxy Zoo",
    url: "https://www.zooniverse.org/projects/zookeeper/galaxy-zoo/",
    blurb:
      "Classify the morphology of this galaxy. Volunteers like you " +
      "produced the training set that powers modern galaxy-shape ML.",
    // Galaxies, AGN, quasars, galaxy clusters — broad accept list.
    accepts: ["G", "AGN", "QSO", "BLLac", "Seyf", "GCl", "GroupG"],
  },
  {
    id: "planet-hunters",
    label: "Planet Hunters TESS",
    url: "https://www.zooniverse.org/projects/nora-eisner/planet-hunters-tess/",
    blurb:
      "Spot transit signals TESS's pipeline missed. Citizen-discovered " +
      "candidates have a great track record of becoming confirmed planets.",
    // TESS TOIs + general stellar lightcurve candidates.
    accepts: ["TOI", "exo", "**", "*"],
  },
];

/**
 * Best-effort match: returns the first project whose `accepts` list
 * contains a prefix of the given SIMBAD type code or catalog id-prefix.
 * Returns null if nothing matches.
 *
 * Examples:
 *   matchProject("G")     → galaxy-zoo
 *   matchProject("AGN_C") → galaxy-zoo  (prefix match on "AGN")
 *   matchProject("TOI")   → planet-hunters
 *   matchProject("ISM")   → null
 */
export function matchProject(typeOrId: string): ZooniverseProject | null {
  const t = typeOrId.trim();
  if (!t) return null;
  for (const project of PROJECTS) {
    for (const accept of project.accepts) {
      if (t.startsWith(accept)) return project;
    }
  }
  return null;
}

/**
 * Build a project URL pre-filled with a target identifier where the
 * project supports it. Most Zooniverse projects don't expose a "load
 * subject X" deep-link query param publicly, so for now we just append
 * a `#unspeakable-<targetId>` fragment for analytics — the project
 * landing page ignores it but lets us trace clicks.
 */
export function buildLink(project: ZooniverseProject, targetId: string): string {
  const tag = targetId.replace(/\s+/g, "-").toLowerCase();
  return `${project.url}#unspeakable-${encodeURIComponent(tag)}`;
}

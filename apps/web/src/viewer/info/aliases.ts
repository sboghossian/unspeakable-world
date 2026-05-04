/**
 * Famous-object aliases.
 *
 * Bridges SIMBAD catalogue codes ("M 31") to the names Wikipedia knows them
 * by ("Andromeda Galaxy") and that humans search for. Used by:
 *   - The Wikipedia summary fetcher (after the SIMBAD candidates fail)
 *   - The local search index (so "Crab" finds M1)
 *
 * Hand-curated from the most-asked-about Messier objects — comprehensive
 * coverage isn't necessary; the long tail goes through SIMBAD identifiers.
 */

export const MESSIER_ALIASES: Record<string, string> = {
  M1: "Crab Nebula",
  M8: "Lagoon Nebula",
  M11: "Wild Duck Cluster",
  M13: "Great Globular Cluster in Hercules",
  M16: "Eagle Nebula",
  M17: "Omega Nebula",
  M20: "Trifid Nebula",
  M27: "Dumbbell Nebula",
  M31: "Andromeda Galaxy",
  M32: "Messier 32",
  M33: "Triangulum Galaxy",
  M42: "Orion Nebula",
  M44: "Beehive Cluster",
  M45: "Pleiades",
  M51: "Whirlpool Galaxy",
  M57: "Ring Nebula",
  M64: "Black Eye Galaxy",
  M81: "Bode Galaxy",
  M82: "Cigar Galaxy",
  M83: "Southern Pinwheel Galaxy",
  M87: "Messier 87", // E0 supergiant; Wikipedia article is "Messier 87"
  M97: "Owl Nebula",
  M101: "Pinwheel Galaxy",
  M104: "Sombrero Galaxy",
  M106: "Messier 106",
};

/** Returns the famous name for "M 31" / "M31", or null. */
export function aliasForMessier(messierToken: string): string | null {
  const key = messierToken.replace(/\s+/g, "").toUpperCase();
  return MESSIER_ALIASES[key] ?? null;
}

/**
 * Walk arbitrary text for "M N" patterns and return any famous-name aliases
 * that match. Useful when SIMBAD returns a sub-object like "Ford M 31 332"
 * and we want to pull the parent galaxy's article.
 */
export function aliasesInText(text: string): string[] {
  const out: string[] = [];
  const matches = text.match(/M\s*\d+/g);
  if (!matches) return out;
  for (const m of matches) {
    const alias = aliasForMessier(m);
    if (alias && !out.includes(alias)) out.push(alias);
  }
  return out;
}

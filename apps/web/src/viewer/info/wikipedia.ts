/**
 * Wikipedia REST summary fetcher for the info panel.
 *
 * The MediaWiki summary API is CORS-open (`Access-Control-Allow-Origin: *`)
 * and returns a clean JSON shape — no scraping required.
 */

export type WikiSummary = {
  title: string;
  extract: string;
  thumbnail: { source: string; width: number; height: number } | null;
  url: string;
};

const ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary";

/**
 * Try a list of candidate titles; return the first 200 OK with a usable
 * extract. SIMBAD names are usually catalogue codes ("HD 39801") and won't
 * have a Wikipedia article — but the *common* name often does. So we
 * search broadly.
 */
export async function wikipediaSummary(
  candidates: string[],
): Promise<WikiSummary | null> {
  for (const raw of candidates) {
    if (!raw) continue;
    const title = encodeURIComponent(raw.replace(/\s+/g, "_"));
    try {
      const res = await fetch(`${ENDPOINT}/${title}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        type?: string;
        title?: string;
        extract?: string;
        thumbnail?: { source: string; width: number; height: number };
        content_urls?: { desktop?: { page?: string } };
      };
      if (json.type === "disambiguation") continue;
      if (!json.extract || json.extract.length < 30) continue;
      return {
        title: json.title ?? raw,
        extract: json.extract,
        thumbnail: json.thumbnail ?? null,
        url:
          json.content_urls?.desktop?.page ??
          `https://en.wikipedia.org/wiki/${title}`,
      };
    } catch {
      // Try the next candidate
    }
  }
  return null;
}

/**
 * Build a list of search candidates for a SIMBAD hit. We try the canonical
 * name first, then strip catalogue prefixes, then any common identifiers.
 */
export function candidatesFromSimbad(
  name: string,
  identifiers: string[],
): string[] {
  const list = [name];
  if (/^M\s*\d+$/.test(name)) list.push(name.replace(/\s+/g, ""));
  for (const id of identifiers) {
    if (!id) continue;
    list.push(id);
    list.push(id.replace(/\s+/g, "_"));
  }
  // Sub-objects of famous parents (e.g. "Ford M 31 332" → also try "M 31"
  // and "M31" so the user gets the parent galaxy's article).
  const allText = [name, ...identifiers].join(" ");
  const messierMatches = allText.match(/M\s*\d+/g);
  if (messierMatches) {
    for (const m of messierMatches) {
      list.push(m.replace(/\s+/g, ""));
      list.push(m);
    }
  }
  const ngcMatches = allText.match(/NGC\s*\d+/gi);
  if (ngcMatches) {
    for (const m of ngcMatches) list.push(m.replace(/\s+/g, " ").toUpperCase());
  }
  // Deduplicate while preserving order.
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = c.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

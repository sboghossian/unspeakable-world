/**
 * Citation extraction + rendering helpers.
 *
 * LLMs answer with prose. To match the rest of the viewer's "always show
 * the source" UX, we sweep the final text for things that look like
 * citations and turn them into clickable links:
 *
 *   - Bare URLs (https://...)
 *   - [SIMBAD: <name>] -> links to SIMBAD's name-resolver
 *   - [Wikipedia: <Title>] -> links to the matching English Wikipedia page
 *
 * The panel renders an "Sources" footer using these. We don't strip them
 * from the prose — duplication is fine and reading the citation inline
 * is sometimes useful.
 */

import type { Citation } from "./types";

const URL_RE = /\bhttps?:\/\/[^\s<>)\]]+/g;
const SIMBAD_RE = /\[SIMBAD:\s*([^\]]+)\]/g;
const WIKI_RE = /\[Wikipedia:\s*([^\]]+)\]/gi;

/** Pull citations out of an LLM answer. De-duplicates by URL. */
export function extractCitations(text: string): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();

  for (const m of text.matchAll(URL_RE)) {
    const url = m[0]?.replace(/[.,;:!?)]+$/, "") ?? "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ label: prettyHost(url), url });
  }

  for (const m of text.matchAll(SIMBAD_RE)) {
    const name = m[1]?.trim() ?? "";
    if (!name) continue;
    const url = `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(name)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ label: `SIMBAD: ${name}`, url });
  }

  for (const m of text.matchAll(WIKI_RE)) {
    const title = m[1]?.trim() ?? "";
    if (!title) continue;
    const slug = title.replace(/\s+/g, "_");
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ label: `Wikipedia: ${title}`, url });
  }

  return out;
}

/** "https://en.wikipedia.org/wiki/Foo" -> "en.wikipedia.org" */
function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Grounded summary — a deterministic concatenation of public-archive blurbs.
 *
 * v1: NO LLM call. We stitch:
 *   1. Wikipedia REST `/page/summary` lead (~100 words)
 *   2. SIMBAD object type / spectral / V-mag, when we already have a hit
 *
 * NASA ADS is intentionally skipped in v1 (requires an API key).
 *
 * The output is rendered in InfoPanel as a collapsible section with a
 * "Sources:" list and a small disclaimer footer.
 */

import { idb } from "../../lib/idb-cache";
import { describeType, type SimbadHit } from "./simbad";
import { wikipediaSummary } from "./wikipedia";

export type GroundedSource = { label: string; url: string };

export type GroundedSummary = {
  summary: string;
  sources: GroundedSource[];
};

const TTL_SEC = 7 * 24 * 60 * 60; // mirrors wikipedia TTL

/** Trim Wikipedia extract to ~`maxWords` words, breaking on the last sentence. */
function trimToWords(text: string, maxWords = 100): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  const slice = words.slice(0, maxWords).join(" ");
  // Try to end on a period — only if there is one in the trimmed slice.
  const lastPeriod = slice.lastIndexOf(".");
  if (lastPeriod > slice.length * 0.5) return slice.slice(0, lastPeriod + 1);
  return `${slice}…`;
}

function simbadSentence(hit: SimbadHit): string {
  const parts: string[] = [];
  const t = describeType(hit.type) || hit.type;
  if (t) parts.push(t);
  if (hit.spectralType) parts.push(`spectral type ${hit.spectralType}`);
  if (hit.vMag !== null) parts.push(`V ${hit.vMag.toFixed(2)} mag`);
  if (hit.redshift !== null) parts.push(`z = ${hit.redshift.toFixed(4)}`);
  if (parts.length === 0) return "";
  return `SIMBAD classifies this object as ${parts.join(", ")}.`;
}

/**
 * Fetch a grounded summary for the given object name. Caller may pass an
 * existing SIMBAD hit to avoid a second cone-search; otherwise we skip the
 * SIMBAD sentence (the existing inspector path already attaches one).
 */
export async function fetchGroundedSummary(
  name: string,
  candidates: string[] = [name],
  simbadHit: SimbadHit | null = null,
): Promise<GroundedSummary | null> {
  const cacheKey = `grounded:${name.toLowerCase()}`;
  const cached = await idb.get<GroundedSummary | "miss">(
    "wikipedia",
    cacheKey,
  );
  if (cached === "miss") return null;
  if (cached) return cached;

  const wiki = await wikipediaSummary(candidates);
  if (!wiki) {
    await idb.put("wikipedia", cacheKey, "miss", TTL_SEC);
    return null;
  }
  const lead = trimToWords(wiki.extract, 100);
  const simbadLine = simbadHit ? simbadSentence(simbadHit) : "";
  const summary = simbadLine ? `${lead}\n\n${simbadLine}` : lead;
  const sources: GroundedSource[] = [{ label: "Wikipedia", url: wiki.url }];
  if (simbadHit) {
    sources.push({
      label: "SIMBAD",
      url: `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(
        simbadHit.name,
      )}`,
    });
  }
  const out: GroundedSummary = { summary, sources };
  await idb.put("wikipedia", cacheKey, out, TTL_SEC);
  return out;
}

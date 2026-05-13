/**
 * Unit coverage for the Copilot citation extractor.
 *
 * `extractCitations()` parses LLM prose for bare URLs and bracketed
 * `[SIMBAD: …]` / `[Wikipedia: …]` markers, turning them into clickable
 * Source chips. There are two regressions worth pinning: (1) the happy
 * path produces well-formed SIMBAD + Wikipedia URLs, and (2) duplicates
 * collapse so the chip rail doesn't show the same source twice. Note:
 * this test file replaces the suggested `sgp4-wrapper.test.ts` — there
 * is no pure SGP4 wrapper to test today; the propagation lives inside
 * the class-based `SatelliteField`. See per-brief fallback clause.
 */

import { describe, expect, it } from "vitest";

import { extractCitations } from "../../src/viewer/copilot/citations";

describe("extractCitations", () => {
  it("turns SIMBAD + Wikipedia markers and bare URLs into citations (happy path)", () => {
    const text =
      "Andromeda is the nearest spiral [Wikipedia: Andromeda Galaxy] " +
      "and resolves as [SIMBAD: M31]. See also https://en.wikipedia.org/wiki/M31 for more.";
    const cites = extractCitations(text);
    const urls = cites.map((c) => c.url);
    expect(urls).toContain(
      "https://simbad.cds.unistra.fr/simbad/sim-id?Ident=M31",
    );
    expect(urls).toContain(
      "https://en.wikipedia.org/wiki/Andromeda_Galaxy",
    );
    expect(urls).toContain("https://en.wikipedia.org/wiki/M31");
    expect(cites.find((c) => c.url.includes("simbad"))?.label).toBe(
      "SIMBAD: M31",
    );
  });

  it("dedupes repeated URLs and yields an empty list for empty text (edge case)", () => {
    expect(extractCitations("")).toEqual([]);
    const repeated =
      "see https://example.com and again https://example.com please";
    const cites = extractCitations(repeated);
    expect(cites).toHaveLength(1);
    expect(cites[0]?.url).toBe("https://example.com");
  });
});

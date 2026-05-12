/**
 * Starlink TLE feed from Celestrak.
 *
 *   Upstream:  https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle
 *   Local:     /api/celestrak?GROUP=starlink&FORMAT=tle  (dev + prod proxy)
 *
 * Celestrak generally serves CORS-friendly responses, but we route
 * through the edge anyway so the (~600 KB plain-text) payload is cached
 * once per Cloudflare colo and our origin doesn't hammer Celestrak's
 * rate limit. TLE files are ~6000 satellites × 3 lines = ~18000 lines.
 *
 * Refresh: 6 hours. SGP4 stays accurate for ≥1 day past its epoch, so
 * a 6-hour cadence is comfortably above the noise floor while still
 * picking up new launches within a working day.
 *
 * License: Celestrak data is free for any use; surface "Data: Celestrak"
 * in the panel.
 */

import { log } from "../../lib/logger";

const ENDPOINT = "/api/celestrak?GROUP=starlink&FORMAT=tle";
const CACHE_KEY = "uw:starlink-optin:tles:v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type Tle = {
  name: string;
  l1: string;
  l2: string;
};

type CacheEntry = { ts: number; tles: Tle[] };

function readCache(): CacheEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      typeof parsed?.ts !== "number" ||
      !Array.isArray(parsed.tles) ||
      Date.now() - parsed.ts > CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(tles: Tle[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), tles } satisfies CacheEntry),
    );
  } catch {
    /* quota — silent. Starlink TLE blob is ~600 KB, just under the 5 MB
       per-origin localStorage limit on every browser we care about, but
       we degrade silently if writing fails. */
  }
}

/**
 * Parse a Celestrak 3-line-element text blob into Tle records.
 *
 * Lines come in blocks of three:
 *   "STARLINK-12345"
 *   "1 12345U ..."
 *   "2 12345 ..."
 *
 * Trailing CR/LF and blank lines are tolerated. Malformed groups are
 * skipped silently.
 */
export function parseTleText(text: string): Tle[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const s = raw.replace(/\s+$/g, "");
    if (s.length > 0) lines.push(s);
  }
  const out: Tle[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (
      typeof name !== "string" ||
      typeof l1 !== "string" ||
      typeof l2 !== "string"
    ) {
      continue;
    }
    if (!l1.startsWith("1 ") || !l2.startsWith("2 ")) {
      // misaligned block — advance one line and try again
      i -= 2;
      continue;
    }
    out.push({ name: name.trim(), l1, l2 });
  }
  return out;
}

export type FetchOpts = {
  /** Skip cache and force a network fetch. */
  force?: boolean;
};

/**
 * Fetch the Starlink TLE catalog via the edge proxy, parse, cache.
 *
 * Returns the previous cache on failure (silently). Empty array if the
 * upstream is unreachable and nothing was previously cached.
 */
export async function fetchStarlinkTles(
  opts: FetchOpts = {},
): Promise<Tle[]> {
  if (!opts.force) {
    const cached = readCache();
    if (cached) return cached.tles;
  }
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`Celestrak HTTP ${res.status}`);
    const text = await res.text();
    const tles = parseTleText(text);
    if (tles.length === 0) throw new Error("Celestrak returned no TLEs");
    writeCache(tles);
    return tles;
  } catch (err) {
    log.warn("[starlink-optin] Celestrak fetch failed", err);
    const cached = readCache();
    return cached?.tles ?? [];
  }
}

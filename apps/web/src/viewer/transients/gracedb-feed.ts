/**
 * 〰️ GraceDB superevent feed — LIGO/Virgo/KAGRA gravitational-wave alerts.
 *
 * Public REST endpoint, CORS-friendly, no auth:
 *   GET https://gracedb.ligo.org/api/superevents/?count=N&format=json
 *
 * Schema (verified May 2026):
 *   {
 *     numRows: number,
 *     superevents: [{
 *       superevent_id: string,            // e.g. "S260512az" or "MS260512o"
 *       gw_id: string | null,             // populated for confirmed GW events
 *       category: "Production" | "MDC" | "Test",
 *       created: "YYYY-MM-DD HH:MM:SS UTC",
 *       t_0: number,                      // GPS seconds
 *       far: number,                      // false-alarm rate (Hz)
 *       labels: string[],
 *       preferred_event_data: {
 *         group: "CBC" | "Burst" | ...,
 *         pipeline: string,
 *         search: string,
 *         ...
 *       },
 *       links: { self: string, ... }
 *     }]
 *   }
 *
 * Notes / caveats:
 *   - The listing endpoint does NOT include sky-localization RA/Dec — those
 *     live in a per-event skymap FITS file. We surface RA/Dec as NaN; the
 *     UI / TransientField skip markers without coords. v1 is fine.
 *   - The API ignores `category=` and `query=` filters that aren't a valid
 *     superevent ID. We pull a page of recent items and filter
 *     client-side, preferring `Production` superevents when present.
 *   - We treat the front of the feed as "current observing run" (O4 as of
 *     2026). No explicit run filter — the API returns chronologically.
 *
 * Cache: 5 min localStorage. Silent on error.
 */

import { log } from "../../lib/logger";

export type GwAlert = {
  id: string;
  /** ISO UTC string derived from `created`. */
  t0: string;
  labels: string[];
  /** Most-likely-direction RA in degrees. NaN if no skymap exposed yet. */
  raDeg: number;
  /** Most-likely-direction Dec in degrees. NaN if no skymap exposed yet. */
  decDeg: number;
  /** Headline class (CBC / Burst / …) from the preferred event. */
  classification: string;
  /** False-alarm rate in Hz. Lower = more significant. */
  far: number;
  /** Public detail page for the superevent. */
  link: string;
};

const CACHE_KEY = "uw:transients:gracedb:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const ENDPOINT = "https://gracedb.ligo.org/api/superevents/";
const PUBLIC_BASE = "https://gracedb.ligo.org/superevents/";

type GraceSuperevent = {
  superevent_id?: string;
  gw_id?: string | null;
  category?: string;
  created?: string;
  t_0?: number;
  far?: number;
  labels?: string[];
  preferred_event_data?: {
    group?: string;
    pipeline?: string;
    search?: string;
  } | null;
  links?: { self?: string } | null;
};

type GraceResponse = { superevents?: GraceSuperevent[] };

type CacheEntry = { ts: number; items: GwAlert[] };

function readCache(): CacheEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      typeof parsed?.ts !== "number" ||
      !Array.isArray(parsed.items) ||
      Date.now() - parsed.ts > CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(items: GwAlert[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items } satisfies CacheEntry),
    );
  } catch {
    /* quota / disabled — silent */
  }
}

/**
 * GraceDB returns `created` as a non-ISO "YYYY-MM-DD HH:MM:SS UTC" string.
 * Patch it to a real ISO so Date.parse / Intl handle it.
 */
function parseGraceTime(s: string | undefined): string {
  if (!s) return new Date().toISOString();
  const t = Date.parse(s.replace(" UTC", "Z").replace(" ", "T"));
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function toAlert(s: GraceSuperevent): GwAlert | null {
  const id = s.superevent_id;
  if (!id) return null;
  const pe = s.preferred_event_data ?? {};
  return {
    id,
    t0: parseGraceTime(s.created),
    labels: Array.isArray(s.labels) ? s.labels : [],
    raDeg: Number.NaN,
    decDeg: Number.NaN,
    classification: pe.group ?? "GW",
    far: typeof s.far === "number" ? s.far : Number.NaN,
    link: `${PUBLIC_BASE}${id}/view/`,
  };
}

/**
 * Fetch recent superevents.
 *
 * We pull a page of `limit * 4` raw items, then prefer:
 *   1. category === "Production" (real GW candidates)
 *   2. anything with a `gw_id` (confirmed GW)
 *   3. anything else (typically MDC mocks — useful for demos when O4 is quiet)
 *
 * Result is truncated to `limit` (default 50) and cached for 5 min.
 */
export async function fetchGraceDbAlerts(limit = 50): Promise<GwAlert[]> {
  const cached = readCache();
  if (cached !== null) return cached.items.slice(0, limit);

  const params = new URLSearchParams({
    count: String(Math.max(limit * 4, 100)),
    format: "json",
  });
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      credentials: "omit",
    });
    if (!res.ok) throw new Error(`GraceDB HTTP ${res.status}`);
    const data = (await res.json()) as GraceResponse;
    const raw = Array.isArray(data.superevents) ? data.superevents : [];

    const production: GwAlert[] = [];
    const confirmed: GwAlert[] = [];
    const other: GwAlert[] = [];
    for (const s of raw) {
      const a = toAlert(s);
      if (!a) continue;
      if (s.category === "Production") production.push(a);
      else if (s.gw_id) confirmed.push(a);
      else other.push(a);
    }
    // Prefer real GW candidates; fall through to MDC so the panel isn't
    // empty during a quiet observing window.
    const merged: GwAlert[] = [...production, ...confirmed, ...other];
    const seen = new Set<string>();
    const dedup: GwAlert[] = [];
    for (const a of merged) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      dedup.push(a);
    }
    const out = dedup.slice(0, limit);
    writeCache(out);
    return out;
  } catch (err) {
    log.warn("[transients] gracedb fetch failed", err);
    // cached was null at the top guard; nothing to fall back to.
    return [];
  }
}

/**
 * 📡 GCN circulars feed — multi-messenger alerts.
 *
 * NASA's new General Coordinates Network ships a JSON API. The brief
 * specified `/circulars/api/circulars?limit=20` but that path 404s as of
 * May 2026; the actual JSON endpoint is the Remix loader on the public
 * archive page:
 *
 *   GET https://gcn.nasa.gov/circulars?limit=N&_data=routes/circulars._archive._index
 *
 * Response (verified May 2026):
 *   {
 *     page: number,
 *     items: [{ circularId: string, subject: string }],
 *     totalItems: number,
 *     totalPages: number,
 *     limit: number,
 *     ...
 *   }
 *
 * The listing has only `circularId` + `subject`. For full body / submitter /
 * createdOn we hit the per-circular loader in parallel:
 *
 *   GET https://gcn.nasa.gov/circulars/{id}?_data=routes/circulars.$circularId.($version)
 *
 * Detail response:
 *   {
 *     circularId: number,
 *     subject: string,
 *     body: string,
 *     submitter: string,
 *     eventId?: string,        // e.g. "GRB 260511B"
 *     createdOn: number,       // epoch ms
 *     format?: "text/plain" | "text/markdown",
 *     ...
 *   }
 *
 * No CORS or auth issues observed. 10-min localStorage cache.
 */

import { log } from "../../lib/logger";

export type GcnCircular = {
  id: number;
  subject: string;
  /** Submitter line (free-form: "Name (Institution) <email>"). */
  from: string;
  /** First ~280 chars of the body, stripped of newlines. */
  bodyExcerpt: string;
  /** ISO timestamp. */
  createdOn: string;
  /** Parsed event name (e.g. "GRB 260511B", "EP260507a", "S260512az"). */
  eventName?: string;
  /** RA in degrees — rarely present; populated when body-parse succeeds. */
  raDeg?: number;
  /** Dec in degrees — rarely present; populated when body-parse succeeds. */
  decDeg?: number;
  link: string;
};

const CACHE_KEY = "uw:transients:gcn:v1";
const CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_URL = "https://gcn.nasa.gov/circulars";
const LIST_DATA = "routes/circulars._archive._index";
const DETAIL_DATA = "routes/circulars.$circularId.($version)";

type CacheEntry = { ts: number; items: GcnCircular[] };

type GcnListResponse = {
  items?: Array<{ circularId?: string | number; subject?: string }>;
};

type GcnDetailResponse = {
  circularId?: number;
  subject?: string;
  body?: string;
  submitter?: string;
  eventId?: string;
  createdOn?: number;
};

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

function writeCache(items: GcnCircular[]): void {
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
 * Heuristic event-name extraction from a circular subject.
 *
 * Matches common prefixes used in GCN traffic:
 *   GRB 260511B, GRB260511B, EP260507a, IceCube-260504A, S260512az,
 *   AT2024abc, SN 2024xyz, BOAT.
 *
 * Returns the first cleaned match, or undefined.
 */
function extractEventName(subject: string): string | undefined {
  const patterns = [
    /\b(GRB)\s*(\d{6,8}[A-Z]?)/i,
    /\b(EP)\s*(\d{6,8}[a-z]?)/i,
    /\b(IceCube)[-\s](\d{6,8}[A-Z]?)/i,
    /\b(S|MS|TS|GW)(\d{6}[a-z]+)/,
    /\b(AT|SN)\s*(\d{4}[a-z]+)/i,
  ];
  for (const re of patterns) {
    const m = subject.match(re);
    if (m) {
      const a = m[1] ?? "";
      const b = m[2] ?? "";
      // Restore the typical separator: "GRB 260511B" but "S260512az".
      const sep = /^[A-Z]+$/.test(a) && a.length <= 3 && b.length > 0 &&
                  !/^\d/.test(a) && a !== "S" && a !== "MS" && a !== "TS" && a !== "GW"
        ? " " : "";
      return `${a}${sep}${b}`;
    }
  }
  return undefined;
}

/**
 * Pull RA/Dec out of a circular body if present in common formats.
 * We look for "RA = 12h 34m 56.7s, Dec = +12d 34' 56\"" and decimal
 * variants like "RA(J2000)=12.345 Dec(J2000)=-67.890". Returns undefined
 * when nothing matches — most GCNs don't include coords in the body.
 */
function extractCoords(body: string): { raDeg?: number; decDeg?: number } {
  // Decimal degrees first (common in modern circulars).
  const dec = body.match(
    /R\.?A\.?(?:\s*\([A-Z0-9]+\))?\s*[=:]\s*(-?\d+\.\d+)\s*[°,;\s]+\s*(?:Dec|DEC|Decl)\.?(?:\s*\([A-Z0-9]+\))?\s*[=:]\s*([-+]?\d+\.\d+)/,
  );
  if (dec) {
    const ra = Number.parseFloat(dec[1]!);
    const de = Number.parseFloat(dec[2]!);
    if (Number.isFinite(ra) && Number.isFinite(de)) {
      return { raDeg: ra, decDeg: de };
    }
  }
  // Sexagesimal: "12h 34m 56.7s" and "+12d 34m 56s"
  const sex = body.match(
    /(\d{1,2})[h:\s]\s*(\d{1,2})[m':\s]\s*(\d{1,2}(?:\.\d+)?)[s"]?\s*[,;\s]+([+-]?\d{1,2})[d°:\s]\s*(\d{1,2})['m:\s]\s*(\d{1,2}(?:\.\d+)?)/,
  );
  if (sex) {
    const h = +sex[1]!,
      mm = +sex[2]!,
      ss = +sex[3]!,
      d = +sex[4]!,
      dm = +sex[5]!,
      ds = +sex[6]!;
    const raDeg = (h + mm / 60 + ss / 3600) * 15;
    const sign = d < 0 || sex[4]!.startsWith("-") ? -1 : 1;
    const decDeg = sign * (Math.abs(d) + dm / 60 + ds / 3600);
    if (Number.isFinite(raDeg) && Number.isFinite(decDeg)) {
      return { raDeg, decDeg };
    }
  }
  return {};
}

async function fetchDetail(id: number): Promise<GcnCircular | null> {
  const url = `${LIST_URL}/${id}?_data=${encodeURIComponent(DETAIL_DATA)}`;
  try {
    const res = await fetch(url, {
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as GcnDetailResponse;
    if (typeof d.circularId !== "number" || !d.subject) return null;
    const body = d.body ?? "";
    const excerpt = body.replace(/\s+/g, " ").trim().slice(0, 280);
    const coords = extractCoords(body);
    return {
      id: d.circularId,
      subject: d.subject,
      from: d.submitter ?? "",
      bodyExcerpt: excerpt,
      createdOn:
        typeof d.createdOn === "number"
          ? new Date(d.createdOn).toISOString()
          : new Date().toISOString(),
      eventName: d.eventId || extractEventName(d.subject),
      raDeg: coords.raDeg,
      decDeg: coords.decDeg,
      link: `${LIST_URL}/${d.circularId}`,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch recent GCN circulars with full body + metadata.
 *
 * Two-step:
 *   1. One listing call to enumerate the latest `limit` circular IDs.
 *   2. Parallel detail calls (Promise.allSettled) to get body / submitter /
 *      createdOn / coords.
 *
 * The detail fan-out is bounded by `limit` (default 30) so worst case is
 * ~31 HTTP requests. Cache TTL of 10 min keeps repeat cost negligible.
 *
 * Silent on error: returns the previous cache (if any) or an empty array.
 */
export async function fetchGcnCirculars(limit = 30): Promise<GcnCircular[]> {
  const cached = readCache();
  if (cached !== null) return cached.items.slice(0, limit);

  try {
    const listUrl = `${LIST_URL}?limit=${limit}&_data=${encodeURIComponent(LIST_DATA)}`;
    const res = await fetch(listUrl, {
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`GCN HTTP ${res.status}`);
    const data = (await res.json()) as GcnListResponse;
    const rows = Array.isArray(data.items) ? data.items : [];
    const ids: number[] = [];
    for (const r of rows) {
      const n = typeof r.circularId === "string"
        ? Number.parseInt(r.circularId, 10)
        : (r.circularId as number | undefined);
      if (typeof n === "number" && Number.isFinite(n)) ids.push(n);
      if (ids.length >= limit) break;
    }
    const settled = await Promise.allSettled(ids.map((id) => fetchDetail(id)));
    const out: GcnCircular[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled" || !r.value) continue;
      out.push(r.value);
    }
    // Preserve listing order (newest first).
    out.sort((a, b) => b.id - a.id);
    writeCache(out);
    return out;
  } catch (err) {
    log.warn("[transients] gcn fetch failed", err);
    // cached was null at the top guard; nothing to fall back to.
    return [];
  }
}

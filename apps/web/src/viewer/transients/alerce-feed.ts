/**
 * 💫 ALeRCE live-transient feed.
 *
 * Pulls the most recent ZTF alerts classified by ALeRCE
 * (https://alerce.online/) and surfaces the headline classes — supernova
 * candidates, AGN flares, periodic variables, cataclysmic variables.
 *
 * The public REST endpoint is CORS-friendly and requires no auth:
 *   GET https://api.alerce.online/ztf/v1/objects/
 *
 * Query schema actually shipping (verified May 2026):
 *   classifier=lc_classifier  → light-curve random forest (preferred)
 *   classifier=stamp_classifier → image classifier (more coverage, less precise)
 *   class=SNIa | SNIbc | SNII | AGN | Blazar | CV/Nova | LPV | …
 *   order_by=lastmjd & order_mode=DESC
 *   ndet=N (minimum number of detections)
 *
 * Response items expose `oid`, `meanra`, `meandec`, `class`,
 * `classifier`, `probability`, `firstmjd`, `lastmjd`. `magpsf` is not in
 * the objects endpoint — we don't try to fetch it per-object (that would
 * be N+1). We rank by `lastmjd` (most recent) instead.
 *
 * Results are cached in localStorage for 30 minutes; the panel calls
 * `fetchRecentTransients` again on user-driven refresh.
 */

import { log } from "../../lib/logger";

export type Transient = {
  oid: string;
  raDeg: number;
  decDeg: number;
  classifier: string;
  classProb: number;
  /** Latest measured magnitude — not exposed by the ALeRCE objects
   *  endpoint, so we leave NaN when unknown. The panel hides the column
   *  in that case. */
  magpsf: number;
  /** ISO discovery date (from firstmjd). */
  discoveryDate: string;
  /** ISO last detection (from lastmjd). */
  lastDetection: string;
  /** ALeRCE detail page. */
  href: string;
  /** Headline class label (e.g. "SNIa"). */
  className: string;
};

export type ClassGroup = "supernova" | "agn" | "variable" | "cv";

/**
 * Headline classes we surface, grouped for color coding.
 *
 * The `lc_classifier` taxonomy uses these class strings:
 *   SNe: SNIa, SNIbc, SNII, SNIIn, SLSN
 *   AGN: AGN, Blazar, QSO
 *   variables: LPV, EA, EB, DSCT, RRL, CEP, Periodic
 *   CV / nova: CV/Nova, Nova
 *
 * `stamp_classifier` uses coarser labels (SN, AGN, VS, asteroid, bogus).
 * We map both into our internal `ClassGroup` for visual coding.
 */
export const CLASS_GROUPS: Record<string, ClassGroup> = {
  SNIa: "supernova",
  SNIbc: "supernova",
  SNII: "supernova",
  SNIIn: "supernova",
  SLSN: "supernova",
  SN: "supernova",
  AGN: "agn",
  Blazar: "agn",
  QSO: "agn",
  LPV: "variable",
  EA: "variable",
  EB: "variable",
  DSCT: "variable",
  RRL: "variable",
  CEP: "variable",
  Periodic: "variable",
  VS: "variable",
  "CV/Nova": "cv",
  Nova: "cv",
};

export type FetchOpts = {
  /** Max items to return. Default 100. */
  limit?: number;
  /** Look-back window in days. Default 14 (ALeRCE recency varies). */
  daysBack?: number;
  /** Skip cache and force a network fetch. */
  force?: boolean;
};

const CACHE_KEY = "uw:transients:alerce:v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const ENDPOINT = "https://api.alerce.online/ztf/v1/objects/";
const DETAIL_BASE = "https://alerce.online/object/";

type CacheEntry = { ts: number; items: Transient[] };

type AlerceItem = {
  oid: string;
  meanra: number;
  meandec: number;
  classifier: string | null;
  class: string | null;
  probability: number | null;
  firstmjd: number | null;
  lastmjd: number | null;
};

type AlerceResponse = { items?: AlerceItem[] };

/** MJD → JavaScript Date. MJD = JD - 2400000.5; JD epoch is -4713-11-24. */
function mjdToDate(mjd: number): Date {
  // Unix epoch is JD 2440587.5 → MJD 40587. So unix days = mjd - 40587.
  return new Date((mjd - 40587) * 86400 * 1000);
}

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

function writeCache(items: Transient[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items } satisfies CacheEntry),
    );
  } catch {
    /* localStorage quota / disabled — silent */
  }
}

/**
 * Fetch a page of objects from a given classifier and optional class.
 * Returns the parsed items array (possibly empty).
 */
async function fetchPage(opts: {
  classifier: string;
  className?: string;
  pageSize: number;
}): Promise<AlerceItem[]> {
  const params = new URLSearchParams({
    page_size: String(opts.pageSize),
    classifier: opts.classifier,
    order_by: "lastmjd",
    order_mode: "DESC",
  });
  if (opts.className) params.set("class", opts.className);
  const url = `${ENDPOINT}?${params.toString()}`;
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) {
    throw new Error(`ALeRCE HTTP ${res.status}`);
  }
  const data = (await res.json()) as AlerceResponse;
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Convert an ALeRCE API item to our local Transient shape. Returns null
 * if any required field is missing or out of range.
 */
function toTransient(item: AlerceItem): Transient | null {
  if (
    typeof item.meanra !== "number" ||
    typeof item.meandec !== "number" ||
    typeof item.lastmjd !== "number" ||
    typeof item.firstmjd !== "number" ||
    !item.oid
  ) {
    return null;
  }
  const className = item.class ?? "Unknown";
  return {
    oid: item.oid,
    raDeg: item.meanra,
    decDeg: item.meandec,
    classifier: item.classifier ?? "unknown",
    classProb: item.probability ?? 0,
    magpsf: Number.NaN,
    discoveryDate: mjdToDate(item.firstmjd).toISOString(),
    lastDetection: mjdToDate(item.lastmjd).toISOString(),
    href: `${DETAIL_BASE}${item.oid}`,
    className,
  };
}

/**
 * Pull recent classified transients from ALeRCE.
 *
 * Strategy:
 *   1. Hit `lc_classifier` once per headline class (parallel) — these
 *      come with reliable taxonomy + probabilities.
 *   2. If that returns very few items (e.g. an outage), fall back to a
 *      single page of `stamp_classifier` results.
 *   3. Dedupe by `oid`, sort by most recent detection, truncate to
 *      `limit` (default 100).
 *
 * Silent on error — returns the previous cache (if any) or an empty array.
 */
export async function fetchRecentTransients(
  opts: FetchOpts = {},
): Promise<Transient[]> {
  const limit = opts.limit ?? 100;
  if (!opts.force) {
    const cached = readCache();
    if (cached) return cached.items.slice(0, limit);
  }

  const headlineClasses = [
    "SNIa",
    "SNIbc",
    "SNII",
    "AGN",
    "Blazar",
    "CV/Nova",
    "Periodic",
  ];
  const perClassPage = Math.max(15, Math.ceil(limit / headlineClasses.length));

  try {
    const settled = await Promise.allSettled(
      headlineClasses.map((cls) =>
        fetchPage({
          classifier: "lc_classifier",
          className: cls,
          pageSize: perClassPage,
        }),
      ),
    );
    const seen = new Set<string>();
    const merged: Transient[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        if (seen.has(item.oid)) continue;
        const t = toTransient(item);
        if (!t) continue;
        seen.add(t.oid);
        merged.push(t);
      }
    }

    let out = merged;
    if (out.length < Math.min(20, limit)) {
      // Fallback: pull stamp_classifier when lc_classifier is sparse.
      try {
        const stamp = await fetchPage({
          classifier: "stamp_classifier",
          pageSize: limit,
        });
        for (const item of stamp) {
          if (seen.has(item.oid)) continue;
          const t = toTransient(item);
          if (!t) continue;
          // Skip junk and asteroids from the image classifier — they're
          // not "transients" in the discovery sense and we don't want to
          // pollute the panel.
          if (t.className === "asteroid" || t.className === "bogus") {
            continue;
          }
          seen.add(t.oid);
          out.push(t);
        }
      } catch (err) {
        log.warn("[transients] stamp fallback failed", err);
      }
    }

    out.sort((a, b) => b.lastDetection.localeCompare(a.lastDetection));
    out = out.slice(0, limit);
    writeCache(out);
    return out;
  } catch (err) {
    log.warn("[transients] fetch failed", err);
    const cached = readCache();
    return cached?.items.slice(0, limit) ?? [];
  }
}

/**
 * Map an ALeRCE class string to its visual group (drives sprite color
 * and panel badge). Returns null for unknown classes.
 */
export function classGroup(className: string): ClassGroup | null {
  return CLASS_GROUPS[className] ?? null;
}

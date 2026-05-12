/**
 * ZTF supernova-candidate feed via Lasair (UK ZTF broker).
 *
 *   Upstream:  https://lasair-ztf.lsst.ac.uk/api/objects/
 *   Local:     /api/lasair?endpoint=objects&… (dev + prod proxy)
 *
 * Lasair surfaces ZTF alerts after running the public Sherlock crossmatch
 * and the Lasair classifier. We pull the most recent supernova candidates
 * (class "SN"; configurable to all SN-* subclasses) with classifier
 * confidence > 0.5 within the last 30 days.
 *
 * The Lasair `objects` endpoint accepts a handful of filters; we use
 * `objectClass`, `daysAgo`, and `limit`. Some Lasair deployments respond
 * with `objects: [...]`, others with a bare array — both are handled.
 *
 * License: Lasair is open with attribution. Surface "Lasair / ZTF" in
 * the panel + tooltip.
 */

import { log } from "../../lib/logger";

const ENDPOINT = "/api/lasair";
const CACHE_KEY = "uw:ztf-alerts:lasair:v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — matches refresh cadence

const DETAIL_BASE = "https://lasair-ztf.lsst.ac.uk/objects/";

export type ZtfAlert = {
  /** ZTF object id, e.g. "ZTF24abcdefg". */
  oid: string;
  raDeg: number;
  decDeg: number;
  /** Classifier label as returned by Lasair (e.g. "SN", "SNIa"). */
  className: string;
  /** Confidence ∈ [0,1]. NaN when unknown. */
  classProb: number;
  /** First detection (ISO 8601). */
  discoveryDate: string;
  /** Most recent detection (ISO 8601). */
  lastDetection: string;
  /** Sherlock-resolved host galaxy, if any. */
  hostGalaxy: string | null;
  /** Up to ~30 (mjd, magnitude) pairs for a tooltip sparkline. */
  lightcurve: ReadonlyArray<readonly [number, number]>;
  /** Lasair detail page URL. */
  href: string;
};

export type FetchOpts = {
  /** Max alerts to return. Default 150. */
  limit?: number;
  /** Look-back window in days. Default 30. */
  daysBack?: number;
  /** Minimum classifier probability. Default 0.5. */
  minProb?: number;
  /** Skip cache and force a network fetch. */
  force?: boolean;
};

type LasairItem = {
  objectId?: string;
  ramean?: number;
  decmean?: number;
  ra?: number;
  dec?: number;
  classification?: string;
  objectClass?: string;
  classifier?: string;
  classProb?: number;
  jdmin?: number;
  jdmax?: number;
  mjdmin?: number;
  mjdmax?: number;
  sherlock_class?: string;
  sherlock_classifier?: string;
  hostgal?: string;
  host_galaxy?: string;
  lightcurve?: ReadonlyArray<{ mjd?: number; magpsf?: number }>;
};

type LasairResponse = { objects?: LasairItem[] } | LasairItem[];

type CacheEntry = { ts: number; items: ZtfAlert[] };

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

function writeCache(items: ZtfAlert[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items } satisfies CacheEntry),
    );
  } catch {
    /* quota / private window — silent */
  }
}

/** JD → MJD. JD = MJD + 2400000.5. */
function jdToMjd(jd: number): number {
  return jd - 2400000.5;
}
/** MJD → Date. Unix epoch is MJD 40587. */
function mjdToDate(mjd: number): Date {
  return new Date((mjd - 40587) * 86400 * 1000);
}

function toAlert(item: LasairItem): ZtfAlert | null {
  const oid = item.objectId;
  if (!oid) return null;
  const ra = item.ramean ?? item.ra;
  const dec = item.decmean ?? item.dec;
  if (typeof ra !== "number" || typeof dec !== "number") return null;
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;

  const className =
    item.classification ?? item.objectClass ?? item.classifier ?? "SN";
  const classProb =
    typeof item.classProb === "number" && Number.isFinite(item.classProb)
      ? item.classProb
      : Number.NaN;

  let firstMjd: number | null = null;
  let lastMjd: number | null = null;
  if (typeof item.mjdmin === "number") firstMjd = item.mjdmin;
  else if (typeof item.jdmin === "number") firstMjd = jdToMjd(item.jdmin);
  if (typeof item.mjdmax === "number") lastMjd = item.mjdmax;
  else if (typeof item.jdmax === "number") lastMjd = jdToMjd(item.jdmax);

  const discoveryDate =
    firstMjd !== null ? mjdToDate(firstMjd).toISOString() : "";
  const lastDetection =
    lastMjd !== null
      ? mjdToDate(lastMjd).toISOString()
      : discoveryDate || new Date().toISOString();

  const hostGalaxy = item.host_galaxy ?? item.hostgal ?? null;

  const lightcurve: Array<[number, number]> = [];
  if (Array.isArray(item.lightcurve)) {
    for (const pt of item.lightcurve) {
      const mjd = pt?.mjd;
      const mag = pt?.magpsf;
      if (
        typeof mjd === "number" &&
        typeof mag === "number" &&
        Number.isFinite(mjd) &&
        Number.isFinite(mag)
      ) {
        lightcurve.push([mjd, mag]);
      }
    }
    lightcurve.sort((a, b) => a[0] - b[0]);
    if (lightcurve.length > 30) {
      // Decimate evenly so the sparkline stays light.
      const step = Math.ceil(lightcurve.length / 30);
      const decimated: Array<[number, number]> = [];
      for (let i = 0; i < lightcurve.length; i += step) {
        const p = lightcurve[i];
        if (p) decimated.push(p);
      }
      lightcurve.length = 0;
      lightcurve.push(...decimated);
    }
  }

  return {
    oid,
    raDeg: ra,
    decDeg: dec,
    className,
    classProb,
    discoveryDate: discoveryDate || lastDetection,
    lastDetection,
    hostGalaxy,
    lightcurve,
    href: `${DETAIL_BASE}${encodeURIComponent(oid)}/`,
  };
}

/**
 * Pull recent ZTF supernova-candidate alerts from Lasair via our edge proxy.
 *
 * Strategy:
 *   1. Query the `objects/` endpoint with `objectClass=SN`, `daysAgo`,
 *      `limit`, sorted by most recent.
 *   2. Filter client-side on `classProb ≥ minProb`.
 *   3. Deduplicate by `objectId`, cap at `limit`, cache 5 minutes.
 *
 * On any network/parse failure we return the previous cache (if any),
 * else an empty list.
 */
export async function fetchRecentZtfAlerts(
  opts: FetchOpts = {},
): Promise<ZtfAlert[]> {
  const limit = opts.limit ?? 150;
  const daysBack = opts.daysBack ?? 30;
  const minProb = opts.minProb ?? 0.5;

  if (!opts.force) {
    const cached = readCache();
    if (cached) return cached.items.slice(0, limit);
  }

  const params = new URLSearchParams({
    endpoint: "objects",
    objectClass: "SN",
    daysAgo: String(daysBack),
    limit: String(Math.max(limit, 50)),
    sortBy: "jdmax",
    descending: "true",
  });
  const url = `${ENDPOINT}?${params.toString()}`;

  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`Lasair HTTP ${res.status}`);
    const data = (await res.json()) as LasairResponse;
    const rawList = Array.isArray(data) ? data : (data.objects ?? []);
    const seen = new Set<string>();
    const out: ZtfAlert[] = [];
    for (const item of rawList) {
      const a = toAlert(item);
      if (!a) continue;
      if (seen.has(a.oid)) continue;
      if (Number.isFinite(a.classProb) && a.classProb < minProb) continue;
      seen.add(a.oid);
      out.push(a);
    }
    out.sort((a, b) => b.lastDetection.localeCompare(a.lastDetection));
    const trimmed = out.slice(0, limit);
    writeCache(trimmed);
    return trimmed;
  } catch (err) {
    log.warn("[ztf-alerts] Lasair fetch failed", err);
    const cached = readCache();
    return cached?.items.slice(0, limit) ?? [];
  }
}

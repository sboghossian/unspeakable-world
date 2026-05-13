/**
 * 🔭 JWST live status — client-side feed.
 *
 * The schedule is parsed server-side by `functions/api/jwst-status.ts`
 * (CORS-blocked from the browser, weekly cadence). This module wraps
 * the proxy with a 30-minute localStorage cache so navigation between
 * scenes doesn't re-hit the edge.
 *
 * Returns `null` when nothing is known (offline, schedule parse failed,
 * STScI changed the column order). All consumers must be null-safe.
 */

import { log } from "../../lib/logger";

const PROXY = "/api/jwst-status";
const CACHE_KEY = "uw:jwst-live:v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export type JwstScheduleRow = {
  visitId: string;
  startUtc: string;
  endUtc?: string;
  target: string;
  instrument: string;
  keyword: string;
  category: string;
  /** Augmented by the proxy from a small target dictionary. */
  raDeg?: number;
  decDeg?: number;
};

export type JwstStatus = {
  generatedAt: string;
  scheduleUrl: string | null;
  current: JwstScheduleRow | null;
  next: JwstScheduleRow | null;
  cachedUntil: string;
};

type CacheEntry = { ts: number; data: JwstStatus };

function readCache(): JwstStatus | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (typeof parsed?.ts !== "number" || !parsed.data) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: JwstStatus): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data } satisfies CacheEntry),
    );
  } catch {
    /* quota / private mode — silent */
  }
}

export async function fetchJwstStatus(
  force = false,
): Promise<JwstStatus | null> {
  if (!force) {
    const cached = readCache();
    if (cached !== null) return cached;
  }
  try {
    const res = await fetch(PROXY, { credentials: "omit" });
    if (!res.ok) {
      log.warn("[jwst-live] proxy HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as JwstStatus;
    if (!data || typeof data !== "object") return null;
    writeCache(data);
    return data;
  } catch (err) {
    log.warn("[jwst-live] fetch failed", err);
    return null;
  }
}

/** Subscribe to status updates. Fires immediately, then every 30 minutes. */
export function subscribeJwstStatus(
  cb: (status: JwstStatus | null) => void,
): () => void {
  let cancelled = false;
  void fetchJwstStatus().then((s) => {
    if (!cancelled) cb(s);
  });
  const id = window.setInterval(() => {
    if (cancelled) return;
    void fetchJwstStatus(true).then((s) => {
      if (!cancelled) cb(s);
    });
  }, CACHE_TTL_MS);
  return () => {
    cancelled = true;
    window.clearInterval(id);
  };
}

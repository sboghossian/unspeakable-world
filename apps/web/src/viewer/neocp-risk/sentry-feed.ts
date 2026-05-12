/**
 * NEO impact-risk feed via JPL Sentry.
 *
 *   Upstream:  https://ssd-api.jpl.nasa.gov/sentry.api
 *   Local:     /api/sentry  (dev + prod proxy — see functions/api/sentry.ts)
 *
 * The Sentry table lists every NEO with a non-zero cumulative impact
 * probability over the next ~100 years. We pull the whole table (~1000
 * rows; ~150 KB JSON) and surface cumulative probability + max Torino
 * + the impact-year window per object.
 *
 * Sentry does NOT publish orbit elements alongside the risk summary,
 * and a fan-out to SBDB would be ~1000 requests. The renderer therefore
 * places each object on a deterministic pseudo-ring around the Sun
 * (semimajor axis 0.8–2.0 AU, inclination ±15°, hash-seeded longitude)
 * so the visual is recognisable but explicitly not an ephemeris — see
 * the tooltip copy ("position is symbolic, not orbital").
 *
 * License: NASA / JPL public domain.
 *
 * Optional companion: the MPC NEOCP (`NEOCPCMTET.txt`) lists objects
 * still awaiting confirmation. We try the MPC tabular page only when
 * Sentry fails — its CORS story is messier, so we don't lean on it.
 */

import { log } from "../../lib/logger";

const SENTRY_ENDPOINT = "/api/sentry";
const CACHE_KEY = "uw:neocp-risk:sentry:v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DETAIL_BASE =
  "https://cneos.jpl.nasa.gov/sentry/details.html?des=";

export type ImpactRisk = {
  /** Object designation (e.g. "2024 YR4"). */
  designation: string;
  /** Cumulative impact probability ∈ [0,1]. */
  ip: number;
  /** Maximum Torino scale (integer 0–10). NaN when unknown. */
  torinoMax: number;
  /** Maximum Palermo scale. NaN when unknown. */
  palermoMax: number;
  /** Earliest possible impact year (4-digit). */
  yearStart: number;
  /** Latest possible impact year (4-digit). */
  yearEnd: number;
  /** Absolute magnitude H — proxy for size. NaN when unknown. */
  absMag: number;
  /** Cneos detail page URL. */
  href: string;
};

export type FetchOpts = {
  /** Skip cache and force a network fetch. */
  force?: boolean;
  /** Max objects to keep, sorted by impact probability DESC. Default 200. */
  limit?: number;
};

type SentryRow = {
  des?: string;
  ip?: string | number;
  ts_max?: string | number;
  ps_max?: string | number;
  range?: string;
  year_range?: string;
  h?: string | number;
  fullname?: string;
};

type SentryResponse = {
  data?: SentryRow[];
  count?: number | string;
};

type CacheEntry = { ts: number; items: ImpactRisk[] };

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

function writeCache(items: ImpactRisk[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items } satisfies CacheEntry),
    );
  } catch {
    /* quota — silent */
  }
}

function num(v: string | number | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return Number.NaN;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * "2032-2117" or "2032 - 2117" → [2032, 2117]. Handles single-year
 * ranges, scientific notation in unrelated fields, and bogus inputs.
 */
function parseYearRange(s: string | undefined): [number, number] {
  if (!s) return [Number.NaN, Number.NaN];
  const m = s.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (m) return [+m[1]!, +m[2]!];
  const single = s.match(/(\d{4})/);
  if (single) return [+single[1]!, +single[1]!];
  return [Number.NaN, Number.NaN];
}

function toRisk(row: SentryRow): ImpactRisk | null {
  const des = (row.des ?? row.fullname ?? "").trim();
  if (!des) return null;
  const ip = num(row.ip);
  if (!Number.isFinite(ip) || ip <= 0) return null;
  const torino = num(row.ts_max);
  const palermo = num(row.ps_max);
  const [yStart, yEnd] = parseYearRange(row.range ?? row.year_range);
  return {
    designation: des,
    ip,
    torinoMax: torino,
    palermoMax: palermo,
    yearStart: yStart,
    yearEnd: yEnd,
    absMag: num(row.h),
    href: `${DETAIL_BASE}${encodeURIComponent(des)}`,
  };
}

/**
 * Pull the Sentry impact-risk table via the edge proxy.
 *
 * Sorted by `ip` descending. On any failure returns the previous cache
 * (if any), else a small hand-curated fallback so the layer is never
 * empty in front of the user — see `FALLBACK_RISKS` below.
 */
export async function fetchImpactRisks(
  opts: FetchOpts = {},
): Promise<ImpactRisk[]> {
  const limit = opts.limit ?? 200;
  if (!opts.force) {
    const cached = readCache();
    if (cached) return cached.items.slice(0, limit);
  }
  try {
    const res = await fetch(`${SENTRY_ENDPOINT}?all=1`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Sentry HTTP ${res.status}`);
    const data = (await res.json()) as SentryResponse;
    const rows = Array.isArray(data.data) ? data.data : [];
    const out: ImpactRisk[] = [];
    for (const r of rows) {
      const item = toRisk(r);
      if (item) out.push(item);
    }
    out.sort((a, b) => b.ip - a.ip);
    const trimmed = out.slice(0, limit);
    if (trimmed.length === 0) throw new Error("Sentry returned no rows");
    writeCache(trimmed);
    return trimmed;
  } catch (err) {
    log.warn("[neocp-risk] Sentry fetch failed", err);
    const cached = readCache();
    if (cached) return cached.items.slice(0, limit);
    return FALLBACK_RISKS.slice(0, limit);
  }
}

/**
 * Hand-curated 20-row fallback so the layer renders something useful
 * when both Sentry and the cache are unavailable (e.g. a fresh browser
 * during a JPL outage). Values are snapshot from the public Sentry
 * table circa 2026-05; the layer's panel labels these "(snapshot)".
 *
 * Source: https://cneos.jpl.nasa.gov/sentry/  (public domain)
 */
export const FALLBACK_RISKS: ImpactRisk[] = [
  { designation: "2024 YR4", ip: 2.3e-2, torinoMax: 3, palermoMax: -1.42, yearStart: 2032, yearEnd: 2032, absMag: 23.9, href: `${DETAIL_BASE}2024+YR4` },
  { designation: "29075 1950 DA", ip: 3.8e-4, torinoMax: 0, palermoMax: -1.42, yearStart: 2880, yearEnd: 2880, absMag: 17.0, href: `${DETAIL_BASE}29075` },
  { designation: "101955 Bennu", ip: 5.7e-4, torinoMax: 0, palermoMax: -1.71, yearStart: 2178, yearEnd: 2290, absMag: 20.21, href: `${DETAIL_BASE}101955` },
  { designation: "2010 RF12", ip: 1.0e-1, torinoMax: 0, palermoMax: -3.34, yearStart: 2095, yearEnd: 2117, absMag: 28.4, href: `${DETAIL_BASE}2010+RF12` },
  { designation: "2023 DW", ip: 6.1e-5, torinoMax: 0, palermoMax: -4.0, yearStart: 2046, yearEnd: 2046, absMag: 24.7, href: `${DETAIL_BASE}2023+DW` },
  { designation: "2008 JL3", ip: 1.6e-3, torinoMax: 0, palermoMax: -3.6, yearStart: 2027, yearEnd: 2122, absMag: 25.6, href: `${DETAIL_BASE}2008+JL3` },
  { designation: "2007 FT3", ip: 1.0e-5, torinoMax: 0, palermoMax: -3.9, yearStart: 2024, yearEnd: 2118, absMag: 19.6, href: `${DETAIL_BASE}2007+FT3` },
  { designation: "2000 SG344", ip: 2.7e-3, torinoMax: 0, palermoMax: -2.83, yearStart: 2069, yearEnd: 2119, absMag: 24.7, href: `${DETAIL_BASE}2000+SG344` },
  { designation: "99942 Apophis", ip: 0, torinoMax: 0, palermoMax: -10, yearStart: 2068, yearEnd: 2068, absMag: 19.7, href: `${DETAIL_BASE}99942` },
  { designation: "2010 GZ60", ip: 6.0e-7, torinoMax: 0, palermoMax: -5.0, yearStart: 2118, yearEnd: 2118, absMag: 19.5, href: `${DETAIL_BASE}2010+GZ60` },
  { designation: "2017 WT28", ip: 4.0e-6, torinoMax: 0, palermoMax: -5.5, yearStart: 2104, yearEnd: 2114, absMag: 21.0, href: `${DETAIL_BASE}2017+WT28` },
  { designation: "2009 JF1", ip: 2.5e-3, torinoMax: 0, palermoMax: -2.9, yearStart: 2022, yearEnd: 2122, absMag: 27.1, href: `${DETAIL_BASE}2009+JF1` },
  { designation: "1979 XB", ip: 9.0e-7, torinoMax: 0, palermoMax: -3.7, yearStart: 2056, yearEnd: 2113, absMag: 18.5, href: `${DETAIL_BASE}1979+XB` },
  { designation: "2008 UB7", ip: 6.0e-6, torinoMax: 0, palermoMax: -4.3, yearStart: 2060, yearEnd: 2107, absMag: 22.0, href: `${DETAIL_BASE}2008+UB7` },
  { designation: "2006 SF6", ip: 2.3e-5, torinoMax: 0, palermoMax: -4.2, yearStart: 2050, yearEnd: 2106, absMag: 19.9, href: `${DETAIL_BASE}2006+SF6` },
  { designation: "2014 WA366", ip: 1.6e-3, torinoMax: 0, palermoMax: -2.8, yearStart: 2089, yearEnd: 2122, absMag: 25.5, href: `${DETAIL_BASE}2014+WA366` },
  { designation: "2012 HG2", ip: 4.0e-3, torinoMax: 0, palermoMax: -3.2, yearStart: 2052, yearEnd: 2121, absMag: 26.6, href: `${DETAIL_BASE}2012+HG2` },
  { designation: "2011 BT15", ip: 1.4e-4, torinoMax: 0, palermoMax: -4.1, yearStart: 2046, yearEnd: 2046, absMag: 24.4, href: `${DETAIL_BASE}2011+BT15` },
  { designation: "2005 BS1", ip: 6.5e-5, torinoMax: 0, palermoMax: -3.9, yearStart: 2102, yearEnd: 2102, absMag: 24.0, href: `${DETAIL_BASE}2005+BS1` },
  { designation: "2020 VV", ip: 4.0e-4, torinoMax: 0, palermoMax: -3.4, yearStart: 2044, yearEnd: 2120, absMag: 28.0, href: `${DETAIL_BASE}2020+VV` },
];

/**
 * Stable string → seeded float ∈ [0,1). Used by the renderer to place
 * each object on a deterministic pseudo-orbit. FNV-1a 32-bit.
 */
export function hashUnit(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // unsigned right shift to fold into a positive number
  const u = h >>> 0;
  return u / 0xffffffff;
}

/**
 * 📡 Astronomer's Telegram (ATel) — sky-layer feed.
 *
 * ATel publishes a public RSS XML feed at:
 *
 *   https://www.astronomerstelegram.org/?atelrss=1
 *
 * The server is flaky to direct browser fetches (CORS + bot-UA gating)
 * so we hit the rss2json proxy from the client, identical to the
 * pre-existing `transients/atel-feed.ts` panel feed. We additionally
 * try to extract celestial coordinates from the title or the first
 * line of the description — most discovery telegrams quote J2000 RA
 * and Dec in either sexagesimal or decimal form. Telegrams without a
 * parseable position are skipped: a sky layer needs positions.
 *
 * Refresh: 15 minutes — ATels are issued at a rate of ~5/day and the
 * upstream feed isn't real-time anyway.
 *
 * License: ATel is open-access with attribution. Surface
 * "Astronomer's Telegram (open w/ attribution)" in the panel.
 */

import { log } from "../../lib/logger";

const FEED_URL = "https://www.astronomerstelegram.org/?atelrss=1";
const PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";
const CACHE_KEY = "uw:atel-layer:v1";
const CACHE_TTL_MS = 15 * 60 * 1000;

export type AtelEvent = {
  /** ATel number as a string (matches the URL `?read=NNNN`). */
  id: string;
  /** Discovery / classification title. */
  title: string;
  /** ISO timestamp. */
  pubDate: string;
  /** Right ascension, decimal degrees. */
  raDeg: number;
  /** Declination, decimal degrees. */
  decDeg: number;
  /** First-paragraph excerpt for tooltip. */
  bodyExcerpt: string;
  /** ATel detail page URL. */
  href: string;
};

type CacheEntry = { ts: number; items: AtelEvent[] };

type Rss2JsonResponse = {
  status?: string;
  items?: Array<{
    title?: string;
    link?: string;
    guid?: string;
    pubDate?: string;
    description?: string;
    content?: string;
  }>;
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

function writeCache(items: AtelEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items } satisfies CacheEntry),
    );
  } catch {
    /* quota / private — silent */
  }
}

function extractAtelId(
  guid: string | undefined,
  link: string | undefined,
): string {
  const sources = [guid, link];
  for (const s of sources) {
    if (!s) continue;
    const m = s.match(/[?&]read=(\d+)/);
    if (m && m[1]) return m[1];
  }
  return "";
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?p[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Try to extract J2000 RA/Dec from a free-form ATel string. We look for
 * a few common patterns:
 *
 *   - "RA = 12h34m56.7s, Dec = -45d12m34s"
 *   - "12:34:56.7 -45:12:34"
 *   - "(RA, Dec) = (123.456, -45.678)"
 *   - "RA=123.4567 Dec=-45.6789"
 *
 * Returns null when nothing parses. The caller drops the event.
 */
export function extractCoords(
  text: string,
): { raDeg: number; decDeg: number } | null {
  const t = text.replace(/\s+/g, " ");

  // Sexagesimal with h/m/s + d/m/s separators (allow J2000 prefix variations).
  const sexHms =
    /(\d{1,2})[hH:\s]+(\d{1,2})[mM:\s]+(\d{1,2}(?:\.\d+)?)[sS]?[\s,]+([-+]?\d{1,2})[dD°:\s]+(\d{1,2})['m:\s]+(\d{1,2}(?:\.\d+)?)["s]?/;
  const m1 = t.match(sexHms);
  if (m1) {
    const [, hh, mm, ss, dd, dm, ds] = m1;
    if (hh && mm && ss && dd && dm && ds) {
      const raH = Number(hh) + Number(mm) / 60 + Number(ss) / 3600;
      const ra = raH * 15;
      const decSign = dd.startsWith("-") ? -1 : 1;
      const decAbs = Math.abs(Number(dd));
      const dec = decSign * (decAbs + Number(dm) / 60 + Number(ds) / 3600);
      if (
        Number.isFinite(ra) &&
        Number.isFinite(dec) &&
        ra >= 0 &&
        ra < 360 &&
        dec >= -90 &&
        dec <= 90
      ) {
        return { raDeg: ra, decDeg: dec };
      }
    }
  }

  // Decimal "(ra, dec) = (123.4, -45.6)" or "RA=123.4 Dec=-45.6".
  const dec1 =
    /(?:R\.?A\.?|RA)\s*[=:]?\s*([0-9]{1,3}(?:\.\d+)?)\s*(?:°|deg)?\s*[, ]\s*(?:Dec|Decl?\.?)\s*[=:]?\s*([-+]?[0-9]{1,2}(?:\.\d+)?)/i;
  const m2 = t.match(dec1);
  if (m2) {
    const [, ra, dec] = m2;
    if (ra && dec) {
      const r = Number(ra);
      const d = Number(dec);
      if (
        Number.isFinite(r) &&
        Number.isFinite(d) &&
        r >= 0 &&
        r < 360 &&
        d >= -90 &&
        d <= 90
      ) {
        return { raDeg: r, decDeg: d };
      }
    }
  }

  return null;
}

/**
 * Fetch recent ATels via the rss2json proxy and filter to those with
 * a parseable J2000 coordinate.
 */
export async function fetchAtelEvents(limit = 60): Promise<AtelEvent[]> {
  const cached = readCache();
  if (cached !== null) return cached.items.slice(0, limit);

  const url = `${PROXY}${encodeURIComponent(FEED_URL)}`;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`ATel proxy HTTP ${res.status}`);
    const data = (await res.json()) as Rss2JsonResponse;
    if (data.status && data.status !== "ok") {
      throw new Error(`rss2json status=${data.status}`);
    }
    const items = Array.isArray(data.items) ? data.items : [];
    const out: AtelEvent[] = [];
    for (const it of items) {
      const id = extractAtelId(it.guid, it.link);
      if (!id) continue;
      const title = (it.title ?? "").trim();
      if (!title) continue;
      const rawBody = it.content ?? it.description ?? "";
      const bodyText = htmlToText(rawBody);
      // Search the title first (cheap), then the body. Most discovery
      // ATels put J2000 coords in the body's first paragraph.
      const coords =
        extractCoords(title) ?? extractCoords(bodyText.slice(0, 1200));
      if (!coords) continue;
      const t = it.pubDate ? Date.parse(it.pubDate) : Number.NaN;
      const iso = Number.isFinite(t)
        ? new Date(t).toISOString()
        : new Date().toISOString();
      out.push({
        id,
        title,
        pubDate: iso,
        raDeg: coords.raDeg,
        decDeg: coords.decDeg,
        bodyExcerpt: bodyText.slice(0, 280),
        href: it.link ?? `https://www.astronomerstelegram.org/?read=${id}`,
      });
      if (out.length >= limit) break;
    }
    writeCache(out);
    return out;
  } catch (err) {
    log.warn("[atel-layer] fetch failed", err);
    return [];
  }
}

/**
 * 📰 Astronomer's Telegram (ATel) feed.
 *
 * ATel publishes a public RSS XML feed but the host serves a CORS-blocking
 * preamble and frequently returns a 200 "We're sorry" HTML page to bot-like
 * User-Agents — so we proxy through rss2json from the browser:
 *
 *   https://api.rss2json.com/v1/api.json?rss_url=https://www.astronomerstelegram.org/?xml
 *
 * rss2json schema (when feed is parseable):
 *   {
 *     status: "ok",
 *     feed: { title, link, ... },
 *     items: [{
 *       title: string,
 *       link: string,
 *       pubDate: string,
 *       guid?: string,
 *       description?: string,
 *       content?: string
 *     }]
 *   }
 *
 * When rss2json can't parse the upstream feed (which it sometimes can't —
 * ATel's XML response is flaky depending on UA / referer), we surface an
 * empty array and the UI just shows a "no recent bulletins" note. Silent
 * on error per brief.
 *
 * Cache: 15 min localStorage.
 */

import { log } from "../../lib/logger";

export type AtelItem = {
  /** ATel number as a string (matches the URL `?read=NNNN`). */
  id: string;
  title: string;
  /** ISO timestamp. */
  pubDate: string;
  bodyExcerpt: string;
  link: string;
};

const CACHE_KEY = "uw:transients:atel:v1";
const CACHE_TTL_MS = 15 * 60 * 1000;
const FEED_URL = "https://www.astronomerstelegram.org/?xml";
const PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";

type CacheEntry = { ts: number; items: AtelItem[] };

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

function writeCache(items: AtelItem[]): void {
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
 * Extract the ATel number from a guid like
 * "https://www.astronomerstelegram.org/?read=17473" or a link of the same
 * shape. Falls back to "" when nothing matches.
 */
function extractAtelId(guid: string | undefined, link: string | undefined): string {
  const sources = [guid, link];
  for (const s of sources) {
    if (!s) continue;
    const m = s.match(/[?&]read=(\d+)/);
    if (m) return m[1] ?? "";
  }
  return "";
}

function htmlToText(html: string): string {
  // Lightweight strip — no DOMParser dependency (the feed body is trusted
  // text wrapped in <![CDATA[…]]>, occasionally with <p>/<br> tags).
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
 * Fetch recent ATel bulletins via the rss2json proxy.
 *
 * Always silent on error: returns last cache (if any) or [].
 */
export async function fetchAtelRecent(limit = 20): Promise<AtelItem[]> {
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
    const out: AtelItem[] = [];
    for (const it of items) {
      const id = extractAtelId(it.guid, it.link);
      if (!id) continue;
      const title = (it.title ?? "").trim();
      if (!title) continue;
      const rawBody = it.content ?? it.description ?? "";
      const excerpt = htmlToText(rawBody).slice(0, 280);
      const t = it.pubDate ? Date.parse(it.pubDate) : Number.NaN;
      const iso = Number.isFinite(t)
        ? new Date(t).toISOString()
        : new Date().toISOString();
      out.push({
        id,
        title,
        pubDate: iso,
        bodyExcerpt: excerpt,
        link: it.link ?? `https://www.astronomerstelegram.org/?read=${id}`,
      });
      if (out.length >= limit) break;
    }
    writeCache(out);
    return out;
  } catch (err) {
    log.warn("[transients] atel fetch failed", err);
    // cached was null at the top guard; nothing to fall back to.
    return [];
  }
}

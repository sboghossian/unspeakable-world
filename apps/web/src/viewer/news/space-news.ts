/**
 * Space-news feed backed by Spaceflight News API v4
 * (api.spaceflightnewsapi.net). Same caching contract as
 * `launch-feed.ts`: 30-minute TTL in `localStorage`, silent on error.
 */

export type NewsItem = {
  id: number;
  title: string;
  url: string;
  summary: string;
  imageUrl?: string;
  newsSite: string;
  publishedAt: string;
};

const CACHE_KEY = "uw:news:articles:v1";
const TTL_MS = 30 * 60 * 1000;

type CacheEnvelope = {
  at: number;
  data: NewsItem[];
};

type SNApiArticle = {
  id?: number;
  title?: string;
  url?: string;
  summary?: string;
  image_url?: string;
  news_site?: string;
  published_at?: string;
};

function readCache(): NewsItem[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope;
    if (!env || typeof env.at !== "number" || !Array.isArray(env.data)) {
      return null;
    }
    if (Date.now() - env.at > TTL_MS) return null;
    return env.data;
  } catch {
    return null;
  }
}

function writeCache(data: NewsItem[]): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), data } satisfies CacheEnvelope),
    );
  } catch {
    /* silently swallow quota errors */
  }
}

function normalize(raw: SNApiArticle): NewsItem | null {
  if (
    !raw ||
    typeof raw.id !== "number" ||
    !raw.title ||
    !raw.url ||
    !raw.published_at
  ) {
    return null;
  }
  return {
    id: raw.id,
    title: raw.title,
    url: raw.url,
    summary: raw.summary ?? "",
    imageUrl: raw.image_url,
    newsSite: raw.news_site ?? "Unknown",
    publishedAt: raw.published_at,
  };
}

export async function fetchSpaceNews(limit = 10): Promise<NewsItem[]> {
  const cached = readCache();
  if (cached) return cached;
  try {
    const url = `https://api.spaceflightnewsapi.net/v4/articles/?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return cached ?? [];
    const body = (await res.json()) as { results?: SNApiArticle[] };
    const list = Array.isArray(body?.results) ? body.results : [];
    const out = list
      .map(normalize)
      .filter((x): x is NewsItem => x !== null)
      .slice(0, limit);
    if (out.length > 0) writeCache(out);
    return out;
  } catch {
    return cached ?? [];
  }
}

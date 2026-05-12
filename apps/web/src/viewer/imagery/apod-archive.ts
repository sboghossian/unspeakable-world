/**
 * NASA APOD archive — last N days of Astronomy Pictures of the Day.
 *
 * Uses the planetary/apod endpoint with start_date/end_date so the
 * results come back chronologically. DEMO_KEY is fine for the
 * mid-double-digit traffic this panel sees; we cache the response
 * in localStorage for 6 hours under `uw:apod-archive:v1` so a
 * page reload doesn't burn a request.
 *
 * Silent on every error path — callers always get an array.
 */
import { log } from "../../lib/logger";

export type ApodEntry = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  mediaType: "image" | "video";
  copyright?: string;
};

type ApiEntry = {
  date?: string;
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
  copyright?: string;
};

type CacheEnvelope = {
  at: number;
  days: number;
  data: ApodEntry[];
};

const CACHE_KEY = "uw:apod-archive:v1";
const TTL_MS = 6 * 60 * 60 * 1000;
const API_KEY = "DEMO_KEY";

function readCache(days: number): ApodEntry[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope;
    if (
      !env ||
      typeof env.at !== "number" ||
      env.days !== days ||
      !Array.isArray(env.data)
    ) {
      return null;
    }
    if (Date.now() - env.at > TTL_MS) return null;
    return env.data;
  } catch {
    return null;
  }
}

function writeCache(days: number, data: ApodEntry[]): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), days, data } satisfies CacheEnvelope),
    );
  } catch {
    /* quota — silent */
  }
}

function isoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalize(raw: ApiEntry): ApodEntry | null {
  if (
    !raw ||
    typeof raw.date !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.explanation !== "string" ||
    typeof raw.url !== "string" ||
    typeof raw.media_type !== "string"
  ) {
    return null;
  }
  if (raw.media_type !== "image" && raw.media_type !== "video") return null;
  const out: ApodEntry = {
    date: raw.date,
    title: raw.title,
    explanation: raw.explanation,
    url: raw.url,
    mediaType: raw.media_type,
  };
  if (typeof raw.hdurl === "string") out.hdurl = raw.hdurl;
  if (typeof raw.copyright === "string") out.copyright = raw.copyright.trim();
  return out;
}

export async function fetchApodArchive(days = 14): Promise<ApodEntry[]> {
  const safeDays = Math.max(1, Math.min(30, Math.floor(days)));
  const cached = readCache(safeDays);
  if (cached) return cached;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - (safeDays - 1) * 86400000);
    const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&start_date=${isoDate(start)}&end_date=${isoDate(end)}`;
    const res = await fetch(url);
    if (!res.ok) {
      log.warn("[apod-archive]", "non-OK response", res.status);
      return [];
    }
    const body = (await res.json()) as ApiEntry[] | ApiEntry;
    const list = Array.isArray(body) ? body : [body];
    // APOD returns ascending by date; flip so newest is first.
    const out = list
      .map(normalize)
      .filter((e): e is ApodEntry => e !== null)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    if (out.length > 0) writeCache(safeDays, out);
    return out;
  } catch (err) {
    log.warn("[apod-archive]", "fetch failed", err);
    return [];
  }
}

export function apodNasaPageUrl(date: string): string {
  // APOD daily page slug is `apYYMMDD.html`.
  return `https://apod.nasa.gov/apod/ap${date.slice(2).replace(/-/g, "")}.html`;
}

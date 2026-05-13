import { useEffect, useState } from "react";

/**
 * NASA Astronomy Picture of the Day card for the landing page.
 *
 * Fetches today's APOD from `api.nasa.gov` on mount and caches the
 * result in localStorage keyed by today's date (`uw:apod:YYYY-MM-DD`)
 * so subsequent visits the same day hit the cache. Renders nothing on
 * fetch failure or missing required fields — strictly additive.
 */

type ApodPayload = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
};

function todayKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function readCache(key: string): ApodPayload | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApodPayload>;
    if (
      typeof parsed.title === "string" &&
      typeof parsed.explanation === "string" &&
      typeof parsed.url === "string" &&
      typeof parsed.media_type === "string" &&
      typeof parsed.date === "string"
    ) {
      return parsed as ApodPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(key: string, payload: ApodPayload): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota or disabled storage — silently ignore.
  }
}

function truncate(text: string, max = 180): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 80 ? lastSpace : max).trimEnd()}…`;
}

export function ApodCard() {
  const [apod, setApod] = useState<ApodPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `uw:apod:${todayKey()}`;
    const cached = readCache(key);
    if (cached) {
      setApod(cached);
      return;
    }

    const ctrl = new AbortController();
    // Proxy through `/api/apod` (Pages Function): NASA's DEMO_KEY is
    // capped at 30/hr/IP globally, so direct calls silently fail.
    fetch("/api/apod", {
      signal: ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Partial<ApodPayload>) => {
        if (cancelled) return;
        if (
          typeof data.title !== "string" ||
          typeof data.explanation !== "string" ||
          typeof data.url !== "string" ||
          typeof data.media_type !== "string" ||
          typeof data.date !== "string"
        ) {
          return;
        }
        const payload: ApodPayload = {
          date: data.date,
          title: data.title,
          explanation: data.explanation,
          url: data.url,
          media_type: data.media_type,
          ...(typeof data.hdurl === "string" ? { hdurl: data.hdurl } : {}),
          ...(typeof data.copyright === "string"
            ? { copyright: data.copyright }
            : {}),
        };
        writeCache(key, payload);
        setApod(payload);
      })
      .catch(() => {
        // Graceful failure — render nothing.
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  if (!apod) return null;
  // Only render image-type APODs; video days simply render nothing
  // rather than swap to an embed (keeps the card visual idiom tight).
  if (apod.media_type !== "image") return null;

  const linkHref = `https://apod.nasa.gov/apod/ap${apod.date.slice(2).replace(/-/g, "")}.html`;

  return (
    <a
      href={linkHref}
      target="_blank"
      rel="noreferrer noopener"
      className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-white/25 hover:bg-white/[0.06]"
      aria-label={`NASA Astronomy Picture of the Day: ${apod.title}`}
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-space-900">
        <img
          src={apod.url}
          alt={apod.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            NASA · {apod.date}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 transition group-hover:text-white/60">
            view on NASA ↗
          </span>
        </div>
        <div className="mt-2 font-display text-base text-white/90">
          {apod.title}
        </div>
        <div className="mt-1 text-[12px] leading-snug text-white/55">
          {truncate(apod.explanation)}
        </div>
        {apod.copyright && (
          <div className="mt-2 font-mono text-[10px] text-white/35">
            © {apod.copyright.trim()}
          </div>
        )}
      </div>
    </a>
  );
}

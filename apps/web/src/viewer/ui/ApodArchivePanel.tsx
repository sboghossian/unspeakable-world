import { useEffect, useState } from "react";
import {
  apodNasaPageUrl,
  fetchApodArchive,
  type ApodEntry,
} from "../imagery/apod-archive";

/**
 * 📅 APOD archive panel — last 14 days of NASA Astronomy Pictures of
 * the Day in a scrollable thumbnail list. Click a row to pop the
 * full-resolution image (or video embed) into a lightbox with the
 * full explanation text and a "view on NASA" link.
 *
 * Cache lives in `apod-archive.ts`; this component just renders.
 */

function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 60 ? lastSpace : max).trimEnd()}…`;
}

export function ApodArchivePanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ApodEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<ApodEntry | null>(null);

  useEffect(() => {
    if (!open) return;
    if (entries !== null) return;
    let cancelled = false;
    setLoading(true);
    void fetchApodArchive(14)
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entries]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="APOD archive — last 14 days of NASA's Astronomy Picture of the Day"
        aria-label="APOD archive"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>📅</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          apod
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(420px,94vw)] max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base" aria-hidden>
                📅
              </span>
              <div className="font-display text-sm text-white/90">
                APOD archive
              </div>
              {loading && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                  · syncing
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[calc(80vh-3.5rem)] overflow-y-auto">
            {entries === null && loading && (
              <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
                loading archive…
              </div>
            )}
            {entries !== null && entries.length === 0 && (
              <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
                couldn't reach NASA APOD, try again later
              </div>
            )}
            {entries !== null && entries.length > 0 && (
              <ul className="divide-y divide-white/5">
                {entries.map((e) => (
                  <li key={e.date}>
                    <button
                      type="button"
                      onClick={() => setActive(e)}
                      className="flex w-full gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/5">
                        {e.mediaType === "image" ? (
                          <img
                            src={e.url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className="flex h-full w-full items-center justify-center text-lg"
                          >
                            🎞
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 font-display text-[12.5px] leading-snug text-white/90">
                          {e.title}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] leading-snug text-white/45">
                          {truncate(e.explanation, 110)}
                        </div>
                        <div className="mt-1 font-mono text-[9.5px] uppercase tracking-widest text-white/35">
                          {e.date}
                          {e.mediaType === "video" && (
                            <span className="ml-2 text-amber-200/70">
                              · video
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {active && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
        >
          <div
            className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full border border-white/20 bg-space-950/90 px-2.5 py-1 font-mono text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
            <div className="mb-3 overflow-hidden rounded-lg border border-white/10 bg-space-900">
              {active.mediaType === "image" ? (
                <img
                  src={active.hdurl ?? active.url}
                  alt={active.title}
                  className="max-h-[60vh] w-full object-contain"
                />
              ) : (
                <div className="aspect-video w-full">
                  <iframe
                    src={active.url}
                    title={active.title}
                    className="h-full w-full"
                    allow="encrypted-media; fullscreen"
                  />
                </div>
              )}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              NASA APOD · {active.date}
            </div>
            <div className="mt-1 font-display text-lg text-white/95">
              {active.title}
            </div>
            {active.copyright && (
              <div className="mt-1 font-mono text-[10px] text-white/50">
                © {active.copyright}
              </div>
            )}
            <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-white/75">
              {active.explanation}
            </p>
            <div className="mt-4">
              <a
                href={apodNasaPageUrl(active.date)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white"
              >
                open on NASA ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

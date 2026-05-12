import { useEffect, useState } from "react";
import {
  fetchLatestRoverPhotos,
  type RoverName,
  type RoverPhoto,
} from "../imagery/mars-rovers";

/**
 * 🔴 Mars-cam panel — top-bar popover surfacing the latest images
 * from active NASA rovers (Curiosity + Perseverance). Click any
 * thumbnail to open a full-screen lightbox.
 *
 * The fetch is silently tolerant of DEMO_KEY rate-limits and the
 * Mars Rover Photos API's occasional 4xx hiccups. On any failure
 * we fall through to an "no recent photos" empty state.
 */

type Tab = Extract<RoverName, "curiosity" | "perseverance">;

const TABS: { id: Tab; label: string }[] = [
  { id: "curiosity", label: "Curiosity" },
  { id: "perseverance", label: "Perseverance" },
];

export function MarsPhotosPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("curiosity");
  const [photos, setPhotos] = useState<Record<Tab, RoverPhoto[] | null>>({
    curiosity: null,
    perseverance: null,
  });
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<RoverPhoto | null>(null);

  // Lazy-load each tab the first time it's shown.
  useEffect(() => {
    if (!open) return;
    if (photos[tab] !== null) return;
    let cancelled = false;
    setLoading(true);
    void fetchLatestRoverPhotos(tab)
      .then((data) => {
        if (cancelled) return;
        setPhotos((prev) => ({ ...prev, [tab]: data }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, photos]);

  // Esc closes the lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const list = photos[tab];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Mars rover cameras — latest photos from Curiosity & Perseverance"
        aria-label="Mars rover photos"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>🔴</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          mars cam
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(460px,94vw)] max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base" aria-hidden>
                🔴
              </span>
              <div className="font-display text-sm text-white/90">Mars cam</div>
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

          <div className="flex border-b border-white/5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition ${
                  tab === t.id
                    ? "border-b-2 border-rose-300/70 text-white"
                    : "border-b-2 border-transparent text-white/45 hover:text-white/80"
                }`}
              >
                {t.label}
                {photos[t.id] !== null && (
                  <span className="ml-1.5 text-white/30">
                    {photos[t.id]?.length ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="max-h-[calc(80vh-6.5rem)] overflow-y-auto p-3">
            {list === null && loading && (
              <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
                loading rover dispatch…
              </div>
            )}
            {list !== null && list.length === 0 && (
              <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
                no recent photos — try again later
              </div>
            )}
            {list !== null && list.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightbox(p)}
                    className="group flex flex-col overflow-hidden rounded-md border border-white/10 bg-white/[0.03] text-left transition hover:border-white/30 hover:bg-white/[0.06]"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-space-900">
                      <img
                        src={p.src}
                        alt={`${p.camera.fullName} on sol ${p.sol}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-2">
                      <div className="truncate font-display text-[11px] text-white/85">
                        {p.camera.fullName || p.camera.name}
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between font-mono text-[9.5px] uppercase tracking-widest text-white/40">
                        <span>sol {p.sol}</span>
                        <span>{p.earthDate}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo from ${lightbox.camera.fullName}`}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.camera.fullName}
              className="max-h-[80vh] w-auto rounded-lg border border-white/10"
            />
            <div className="mt-3 flex items-baseline justify-between gap-3 font-mono text-[11px] text-white/70">
              <div>
                <span className="text-white/90">
                  {lightbox.camera.fullName || lightbox.camera.name}
                </span>
                <span className="ml-2 text-white/45">
                  · {lightbox.rover}
                </span>
              </div>
              <div className="uppercase tracking-widest text-white/45">
                sol {lightbox.sol} · {lightbox.earthDate}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute -top-3 -right-3 rounded-full border border-white/20 bg-space-950/90 px-2.5 py-1 font-mono text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

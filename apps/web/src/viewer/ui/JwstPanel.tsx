import { useEffect, useState } from "react";
import { JWST_HIGHLIGHTS, type JwstImage } from "../imagery/jwst-highlights";

/**
 * 🔭 JWST highlights panel — popover grid of the most famous public
 * JWST images. Click any thumbnail to open a lightbox with the
 * full image, description, and a "fly to coordinates" jump that
 * deep-links into the sky-atlas viewer.
 *
 * Catalog data is static (see `imagery/jwst-highlights.ts`); this
 * panel ships even when the live NASA APIs are down.
 */

export function JwstPanel() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<JwstImage | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const flyTo = (img: JwstImage): void => {
    if (img.raDeg === undefined || img.decDeg === undefined) return;
    const params = new URLSearchParams();
    params.set("ra", img.raDeg.toFixed(4));
    params.set("dec", img.decDeg.toFixed(4));
    params.set("fov", "2");
    window.location.hash = `#viewer?${params.toString()}`;
    setActive(null);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="JWST highlights — most famous James Webb Space Telescope images"
        aria-label="JWST highlights"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>🔭</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          jwst
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(480px,94vw)] max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base" aria-hidden>
                🔭
              </span>
              <div className="font-display text-sm text-white/90">
                JWST highlights
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                {JWST_HIGHLIGHTS.length}
              </span>
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

          <div className="max-h-[calc(80vh-3.5rem)] overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-2">
              {JWST_HIGHLIGHTS.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(img)}
                  className="group flex flex-col overflow-hidden rounded-md border border-white/10 bg-white/[0.03] text-left transition hover:border-amber-400/40 hover:bg-white/[0.06]"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-space-900">
                    <img
                      src={img.thumbnailUrl ?? img.imageUrl}
                      alt={img.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-2">
                    <div className="truncate font-display text-[11.5px] text-white/90">
                      {img.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-widest text-white/40">
                      {img.instrumentMode} · {img.releaseDate}
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
            className="relative max-h-full w-full max-w-4xl overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-4"
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
              <img
                src={active.imageUrl}
                alt={active.title}
                className="max-h-[60vh] w-full object-contain"
              />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/60">
              JWST · {active.instrumentMode} · {active.releaseDate}
            </div>
            <div className="mt-1 font-display text-lg text-white/95">
              {active.title}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/75">
              {active.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {active.raDeg !== undefined && active.decDeg !== undefined && (
                <button
                  type="button"
                  onClick={() => flyTo(active)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 hover:bg-amber-400/25"
                >
                  ↗ fly to coordinates
                </button>
              )}
              <a
                href={active.pressReleaseUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white"
              >
                press release ↗
              </a>
              {active.raDeg !== undefined && active.decDeg !== undefined && (
                <div className="ml-auto font-mono text-[10px] text-white/40">
                  RA {active.raDeg.toFixed(2)}° · Dec {active.decDeg.toFixed(2)}°
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

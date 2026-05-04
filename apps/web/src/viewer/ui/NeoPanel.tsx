import { useEffect, useState } from "react";
import {
  approxDiameterMeters,
  fetchNeoApproaches,
  type NeoApproach,
} from "../neo/neo-feed";

/**
 * 🪨 NEOs button + dropdown panel — upcoming Earth close-approaches.
 *
 * Pulls live from JPL SBDB CAD API on first open, then refreshes every
 * 30 minutes while the panel stays open. Shows next 12 approaches within
 * 0.1 AU over a 14-day window.
 */

export function NeoPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NeoApproach[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch on first open + refresh every 30 min while open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer = 0;

    const load = () => {
      void fetchNeoApproaches()
        .then((rows) => {
          if (!cancelled) {
            setData(rows);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
    };

    load();
    timer = window.setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open]);

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          open
            ? "border-orange-400/50 bg-orange-400/15 text-orange-300"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-orange-300"
        }`}
        title="Upcoming Earth close approaches"
      >
        <span className="md:hidden">🪨</span>
        <span className="hidden md:inline">🪨 NEOs</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(380px,92vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            close approaches · next 14 days · ≤ 0.1 AU · live from JPL
          </div>
          {data === null && !error && (
            <div className="px-3 py-4 font-mono text-xs text-white/50">
              querying JPL…
            </div>
          )}
          {error && (
            <div className="px-3 py-3 text-xs text-amber-300/80">
              JPL CAD: {error}
            </div>
          )}
          {data !== null && data.length === 0 && (
            <div className="px-3 py-4 text-xs text-white/40">
              No close approaches in the next 14 days within 0.1 AU.
            </div>
          )}
          {data !== null && data.length > 0 && (
            <ul className="max-h-[60vh] overflow-y-auto">
              {data.map((n, i) => {
                const days = (n.date.getTime() - Date.now()) / 86400_000;
                const when =
                  days < 1
                    ? `${(days * 24).toFixed(1)} h`
                    : `${days.toFixed(1)} d`;
                const diameter =
                  n.absMag !== null ? approxDiameterMeters(n.absMag) : null;
                const sizeLabel =
                  diameter !== null
                    ? diameter < 30
                      ? "~10 m"
                      : diameter < 100
                        ? `~${Math.round(diameter / 10) * 10} m`
                        : diameter < 1000
                          ? `~${Math.round(diameter / 100) * 100} m`
                          : `~${(diameter / 1000).toFixed(1)} km`
                    : null;
                return (
                  <li
                    key={`${n.designation}-${i}`}
                    className="flex items-baseline justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm text-white">
                        {n.designation}
                      </div>
                      <div className="truncate font-mono text-[10px] text-white/45">
                        {n.date.toISOString().slice(0, 16).replace("T", " ")}Z ·
                        in {when}
                        {sizeLabel ? ` · ${sizeLabel}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs text-white/85">
                        {n.distLD.toFixed(2)} LD
                      </div>
                      <div className="font-mono text-[10px] text-white/40">
                        {n.velKmS.toFixed(1)} km/s
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-white/5 px-3 py-1.5 text-[10px] text-white/30">
            via NASA / JPL · 1 LD = 384,400 km
          </div>
        </div>
      )}
    </div>
  );
}

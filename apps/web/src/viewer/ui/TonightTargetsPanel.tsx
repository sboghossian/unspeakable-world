import { useEffect, useMemo, useState } from "react";
import type { Vector3 } from "three";
import { currentAltitude } from "../observer/rise-set";
import type { SearchEntry } from "../search/search-index";

/**
 * 🔭 Tonight's targets — what's actually up right now from the observer's
 * location, ranked by altitude × brightness. Pure compute, no fetch.
 *
 * Sources the user's full SearchIndex (named stars + Messier/NGC DSOs +
 * constellations), filters to entries currently > 15° above the horizon,
 * sorts by a (mag, alt) score, and offers click-to-fly. Refreshes every
 * 60s while open so the list stays current as the sky rotates.
 */

type Props = {
  entries: SearchEntry[];
  observer: { lat: number; lon: number } | null;
  onSelect: (dir: Vector3) => void;
};

const MIN_ALT_DEG = 15; // hide objects too low to observe through atmosphere
const LIMIT = 15;

export function TonightTargetsPanel({ entries, observer, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Keep the list fresh while open — Earth rotates fast at zenith.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const ranked = useMemo(() => {
    if (!observer) return [];
    void tick; // force recompute on each tick
    const now = new Date();
    const scored: { e: SearchEntry; alt: number; score: number }[] = [];
    for (const e of entries) {
      if (e.raDeg === undefined || e.decDeg === undefined) continue;
      // Skip constellations — too diffuse to be a "target".
      if (e.kind === "constellation") continue;
      const alt = currentAltitude(
        e.raDeg,
        e.decDeg,
        observer.lat,
        observer.lon,
        now,
      );
      if (alt < MIN_ALT_DEG) continue;
      // Brighter = lower mag = better. Default mag 8 if unknown so it
      // sinks below stars/Messier with measured magnitudes.
      const mag = e.mag ?? 8;
      // Score: higher altitude wins (atmospheric extinction), bright wins.
      // Treat altitudes above 60° as equally premium.
      const altWeight = Math.min(alt, 60) / 60;
      const score = -mag + altWeight * 1.5;
      scored.push({ e, alt, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, LIMIT);
  }, [entries, observer, tick]);

  if (!observer) return null;

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Tonight's targets — what's up right now"
        className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          open
            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-emerald-300"
        }`}
      >
        <span className="md:hidden">🔭</span>
        <span className="hidden md:inline">🔭 tonight</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(380px,92vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            up now · ≥{MIN_ALT_DEG}° · top {LIMIT} by brightness × altitude
          </div>
          {ranked.length === 0 ? (
            <div className="px-3 py-4 text-xs text-white/40">
              Nothing bright above {MIN_ALT_DEG}° at your location right now.
              Try again later — the sky rotates 15°/hour.
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {ranked.map(({ e, alt }) => (
                <li
                  key={e.id}
                  className="border-b border-white/5 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(e.direction);
                      setOpen(false);
                    }}
                    className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm text-white">
                        {e.label}
                      </div>
                      <div className="truncate font-mono text-[10px] text-white/45">
                        {e.detail}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs text-emerald-300/85">
                        {alt.toFixed(0)}°
                      </div>
                      <div className="font-mono text-[10px] text-white/40">
                        {compass(e.direction)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-white/5 px-3 py-1.5 text-[10px] text-white/30">
            local sky · auto-refresh 60s · click to fly
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Cardinal-ish compass label from a world-Y-up direction. The horizontal
 * bearing is approximate (we ignore observer latitude for this UI hint —
 * the real azimuth would require rotating into the local frame), but the
 * coarse N/E/S/W readout is plenty for "where do I look".
 */
function compass(dir: Vector3): string {
  // World coords: +X = vernal equinox, +Y = celestial north, -Z = equinox-90°
  // For a casual hint, use sign of x and z only.
  const x = dir.x;
  const z = dir.z;
  const r = Math.hypot(x, z);
  if (r < 0.1) return "↑";
  const ang = (Math.atan2(-z, x) * 180) / Math.PI; // 0 = +X
  const labels = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];
  const idx = Math.round(((ang + 360) % 360) / 45) % 8;
  return labels[idx] ?? "?";
}

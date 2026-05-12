import { useEffect, useState } from "react";
import type { SpacecraftStatus } from "../spacecraft/trajectory-field";
import type { SpacecraftSlug } from "../spacecraft/trajectories-data";
import { SPACECRAFT_CATALOG } from "../spacecraft/trajectories-data";

/**
 * 🚀 Spacecraft popover — lists every iconic mission whose trajectory
 * we render in solar-flight (Voyager 1, Voyager 2, New Horizons,
 * JWST, Parker Solar Probe), with live heliocentric distance + speed
 * read out from the active `SolarFlightScene`. Each row exposes a
 * "fly to" button that hands focus over to the scene to frame that
 * spacecraft in the heliocentric camera.
 *
 * The toggle at the top flips the entire trajectory layer on/off.
 */

type Props = {
  /** Currently-on flag — true when the trajectory layer is visible. */
  active: boolean;
  /** Toggle the trajectory layer. */
  onToggle: (next: boolean) => void;
  /** Read the current live status; returns [] until the field loads. */
  getStatus: () => SpacecraftStatus[];
  /** Frame the camera on the given spacecraft. */
  onFlyTo: (slug: SpacecraftSlug) => void;
};

export function SpacecraftPanel({
  active,
  onToggle,
  getStatus,
  onFlyTo,
}: Props) {
  const [open, setOpen] = useState(false);
  // Polled live status — re-read every 500 ms while the panel is open
  // so the speed/distance readout matches the running scene.
  const [statuses, setStatuses] = useState<SpacecraftStatus[]>(() =>
    getStatus(),
  );

  useEffect(() => {
    if (!open) return;
    setStatuses(getStatus());
    const id = window.setInterval(() => {
      setStatuses(getStatus());
    }, 500);
    return () => window.clearInterval(id);
  }, [open, getStatus]);

  // Fallback rows when the field is still loading — show launch info
  // without distance/speed so the catalog isn't blank on first open.
  const rows: Array<
    | SpacecraftStatus
    | {
        slug: SpacecraftSlug;
        name: string;
        color: string;
        distanceAU: number;
        speedKmS: number;
        summary: string;
        loading: true;
      }
  > = statuses.length
    ? statuses
    : SPACECRAFT_CATALOG.map((s) => ({
        slug: s.slug,
        name: s.name,
        color: s.color,
        distanceAU: 0,
        speedKmS: 0,
        summary: s.summary,
        loading: true,
      }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Spacecraft trajectories — Voyager 1, Voyager 2, New Horizons, JWST, Parker Solar Probe"
        aria-label="Spacecraft trajectories"
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] backdrop-blur transition ${
          active
            ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>🚀</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          craft
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(420px,94vw)] max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base" aria-hidden>
                🚀
              </span>
              <div className="font-display text-sm text-white/90">
                Spacecraft trajectories
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                {rows.length}
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

          <div className="border-b border-white/5 px-3 py-2">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/70">
                show trajectories
              </span>
              <button
                type="button"
                onClick={() => onToggle(!active)}
                aria-pressed={active}
                className={`relative h-5 w-10 rounded-full border transition ${
                  active
                    ? "border-amber-400/60 bg-amber-400/30"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    active ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/40">
              Solid line = flown path · dashed = projected through ~2030. 1 AU
              ≈ 150 million km.
            </p>
          </div>

          <div className="max-h-[calc(80vh-7rem)] overflow-y-auto p-3">
            <ul className="flex flex-col gap-2">
              {rows.map((r) => {
                const loading = "loading" in r;
                return (
                  <li
                    key={r.slug}
                    className="rounded-md border border-white/10 bg-white/[0.03] p-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="font-display text-[13px] text-white/95">
                          {r.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onFlyTo(r.slug)}
                        disabled={loading}
                        className="rounded border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↗ fly to
                      </button>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px]">
                      <div className="text-white/40">heliocentric</div>
                      <div className="text-right text-white/85">
                        {loading
                          ? "—"
                          : `${r.distanceAU.toFixed(2)} AU`}
                      </div>
                      <div className="text-white/40">speed</div>
                      <div className="text-right text-white/85">
                        {loading || !Number.isFinite(r.speedKmS)
                          ? "—"
                          : `${r.speedKmS.toFixed(1)} km/s`}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                      {r.summary}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

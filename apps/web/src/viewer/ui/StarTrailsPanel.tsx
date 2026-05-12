import { useState } from "react";
import type { UniverseScene } from "../universe/universe-scene";

/**
 * ✨ Star trails panel — toggles the long-exposure overlay on the sky
 * atlas and exposes a duration slider (15 min → 12 h). Looks closest
 * to a real night-sky photographer's polar-aligned exposure.
 */

type Props = {
  scene: UniverseScene | null;
};

const DURATIONS: { label: string; hours: number }[] = [
  { label: "15 min", hours: 0.25 },
  { label: "1 h", hours: 1 },
  { label: "2 h", hours: 2 },
  { label: "4 h", hours: 4 },
  { label: "8 h", hours: 8 },
];

export function StarTrailsPanel({ scene }: Props) {
  const [on, setOn] = useState(false);
  const [hours, setHours] = useState(2);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const next = !on;
          setOn(next);
          scene?.setStarTrails(next);
        }}
        title="Long-exposure star trails — circular arcs centred on the celestial pole"
        aria-label="Star trails"
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
          on
            ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>✨</span>
        <span>trails</span>
      </button>
      {on && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(320px,92vw)] rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 font-display text-sm text-white/90">
            Star trails
          </div>
          <p className="mb-2 font-mono text-[10.5px] leading-snug text-white/55">
            Simulated long-exposure photograph. Each star sweeps a
            constant-Dec arc as the Earth rotates — tight near the pole,
            wide near the equator.
          </p>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
            Exposure
          </div>
          <div className="flex flex-wrap gap-1">
            {DURATIONS.map((d) => (
              <button
                key={d.hours}
                type="button"
                onClick={() => {
                  setHours(d.hours);
                  scene?.setStarTrailsDuration(d.hours);
                }}
                className={`rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                  Math.abs(hours - d.hours) < 0.01
                    ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import { type ReactElement } from "react";

/**
 * 🌐 Light cone controls — top-right floating panel that drives the
 * UniverseScene `LightCone` overlay. Activated when the user clicks
 * "start light cone here" inside the InfoPanel.
 *
 * Two sliders (years log-scaled 0–1,000,000; opacity 0–1), three curated
 * presets (SN 1987A, GW170817, GRB 221009A), and a stop button. A live
 * radius readout chooses between km / AU / LY / Mly based on size so the
 * user can read all five orders of magnitude at once.
 */

const LY_TO_AU = 63241.077;
const LY_TO_KM = 9.461e12;

export type LightConePreset = {
  /** Display label, shown on the chip. */
  label: string;
  /** Current age in years — value pre-loaded into the years slider. */
  ageYears: number;
  /** Distance from Earth in LY (used for the HUD blurb only). */
  distanceLY: number;
};

export const LIGHT_CONE_PRESETS: LightConePreset[] = [
  { label: "SN 1987A", ageYears: 39, distanceLY: 168_000 },
  { label: "GW170817", ageYears: 9, distanceLY: 130_000_000 },
  { label: "GRB 221009A", ageYears: 3.5, distanceLY: 2_400_000_000 },
];

type Props = {
  open: boolean;
  /** Display name of the current center, shown in the header. */
  targetName: string | null;
  years: number;
  opacity: number;
  onYearsChange: (years: number) => void;
  onOpacityChange: (opacity: number) => void;
  onPreset: (preset: LightConePreset) => void;
  onStop: () => void;
};

const YEARS_MIN = 1;
const YEARS_MAX = 1_000_000;

export function LightConeControls({
  open,
  targetName,
  years,
  opacity,
  onYearsChange,
  onOpacityChange,
  onPreset,
  onStop,
}: Props): ReactElement | null {
  if (!open) return null;
  const sliderValue = yearsToSlider(years);
  return (
    <div className="pointer-events-auto absolute right-3 top-32 z-30 w-[min(320px,90vw)] rounded-xl border border-cyan-400/30 bg-space-950/90 p-3 backdrop-blur">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">
          ◎ light cone
        </div>
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop light cone"
          className="rounded-md border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-200 hover:bg-rose-400/20"
        >
          stop
        </button>
      </div>
      {targetName && (
        <div className="mb-2 font-mono text-[11px] text-white/65">
          centered on <span className="text-cyan-200">{targetName}</span>
        </div>
      )}

      <div className="mb-3">
        <div className="mb-1 flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            years since event
          </div>
          <div className="font-mono text-[10px] text-white/65">
            {fmtYears(years)}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={sliderValue}
          onChange={(e) => onYearsChange(sliderToYears(parseFloat(e.target.value)))}
          className="h-1 w-full accent-cyan-400"
          aria-label="years since event"
        />
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            opacity
          </div>
          <div className="font-mono text-[10px] text-white/65">
            {opacity.toFixed(2)}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity}
          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
          className="h-1 w-full accent-cyan-400"
          aria-label="light cone opacity"
        />
      </div>

      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
        presets
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1">
        {LIGHT_CONE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPreset(p)}
            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 font-mono text-[10px] text-white/75 hover:bg-cyan-400/15 hover:text-cyan-200"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-2 rounded-md border border-white/5 bg-black/30 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200">
        radius {fmtRadius(years)}
      </div>
    </div>
  );
}

function yearsToSlider(y: number): number {
  // Log-scale [YEARS_MIN, YEARS_MAX] → [0, 1].
  const clamped = Math.max(YEARS_MIN, Math.min(YEARS_MAX, y));
  const lo = Math.log10(YEARS_MIN);
  const hi = Math.log10(YEARS_MAX);
  return (Math.log10(clamped) - lo) / (hi - lo);
}

function sliderToYears(v: number): number {
  const lo = Math.log10(YEARS_MIN);
  const hi = Math.log10(YEARS_MAX);
  return Math.pow(10, lo + (hi - lo) * Math.max(0, Math.min(1, v)));
}

function fmtYears(y: number): string {
  if (y < 10) return `${y.toFixed(2)} yr`;
  if (y < 1000) return `${y.toFixed(0)} yr`;
  if (y < 1_000_000) return `${(y / 1000).toFixed(2)} kyr`;
  return `${(y / 1_000_000).toFixed(2)} Myr`;
}

function fmtRadius(years: number): string {
  // 1 ly per year of c · t.
  const ly = years;
  if (ly < 1e-6) {
    return `${(ly * LY_TO_KM).toFixed(0)} km`;
  }
  if (ly < 1) {
    const au = ly * LY_TO_AU;
    if (au < 100_000) return `${au.toFixed(1)} AU`;
    return `${ly.toFixed(3)} ly`;
  }
  if (ly < 1_000_000) return `${ly.toFixed(0)} ly`;
  if (ly < 1_000_000_000) return `${(ly / 1_000_000).toFixed(2)} Mly`;
  return `${(ly / 1_000_000_000).toFixed(2)} Gly`;
}

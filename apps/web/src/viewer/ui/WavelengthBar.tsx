/**
 * Multi-wavelength toggle.
 *
 * Bottom-sheet pattern: chips for each available wavelength, a cross-fade
 * slider when an overlay is active, plus toggles for the 88 IAU
 * constellation lines and the equatorial / ecliptic / galactic grid.
 */

const LAYERS = [
  { id: "halpha" as const, label: "Hα", sub: "Finkbeiner H-alpha", accent: "rose" },
  { id: "2mass" as const, label: "2MASS", sub: "near-IR", accent: "orange" },
  { id: "allwise" as const, label: "WISE", sub: "mid-IR", accent: "red" },
  { id: "galex" as const, label: "UV", sub: "GALEX AIS", accent: "blue" },
  {
    id: "integral" as const,
    label: "X-ray",
    sub: "INTEGRAL hard X-ray",
    accent: "purple",
  },
  { id: "nvss" as const, label: "Radio", sub: "NVSS 1.4 GHz", accent: "teal" },
];

const ACCENT: Record<string, { active: string; idle: string }> = {
  orange: {
    active: "border-orange-400/40 bg-orange-400/15 text-orange-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  red: {
    active: "border-red-400/40 bg-red-400/15 text-red-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  rose: {
    active: "border-rose-400/40 bg-rose-400/15 text-rose-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  blue: {
    active: "border-sky-400/40 bg-sky-400/15 text-sky-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  purple: {
    active: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  teal: {
    active: "border-teal-400/40 bg-teal-400/15 text-teal-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
};

type Props = {
  overlayId: string | null;
  overlayMix: number;
  onSetOverlay: (id: string | null) => void;
  onSetMix: (mix: number) => void;
  constellationsVisible: boolean;
  onToggleConstellations: () => void;
  coordGridVisible: boolean;
  onToggleCoordGrid: () => void;
};

export function WavelengthBar({
  overlayId,
  overlayMix,
  onSetOverlay,
  onSetMix,
  constellationsVisible,
  onToggleConstellations,
  coordGridVisible,
  onToggleCoordGrid,
}: Props) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-space-950/80 px-3 py-2 backdrop-blur md:flex-row">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        wavelength
      </span>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onSetOverlay(null)}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            overlayId === null
              ? "border-plasma-500/40 bg-plasma-500/15 text-plasma-400"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          visible
        </button>
        {LAYERS.map((l) => {
          const active = overlayId === l.id;
          const cls = ACCENT[l.accent] ?? ACCENT.orange!;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSetOverlay(active ? null : l.id)}
              className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
                active ? cls.active : cls.idle
              }`}
              title={`${l.label} ${l.sub}`}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      {overlayId && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            mix
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={overlayMix}
            onChange={(e) => onSetMix(parseFloat(e.target.value))}
            className="h-1 w-32 accent-plasma-500"
            aria-label="Wavelength cross-fade"
          />
          <span className="font-mono text-[10px] text-white/50 w-8 text-right">
            {Math.round(overlayMix * 100)}%
          </span>
        </div>
      )}

      <div className="hidden md:block h-4 w-px bg-white/10" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleConstellations}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            constellationsVisible
              ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle 88 IAU constellation lines (c)"
        >
          ✦ lines
        </button>
        <button
          type="button"
          onClick={onToggleCoordGrid}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            coordGridVisible
              ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle equatorial / ecliptic / galactic grid (g)"
        >
          ⌖ grid
        </button>
      </div>
    </div>
  );
}

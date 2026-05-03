/**
 * Multi-wavelength toggle.
 *
 * Bottom-sheet pattern: chips for each available wavelength, plus a
 * cross-fade slider when an overlay is active.
 *
 * Day 6 cut: only Visible (always on) + 2MASS (near-IR) + AllWISE (mid-IR).
 * Day 7+ adds X-ray, radio, gamma, microwave.
 */

const LAYERS = [
  { id: "2mass" as const, label: "2MASS", sub: "near-IR", accent: "orange" },
  { id: "allwise" as const, label: "WISE", sub: "mid-IR", accent: "red" },
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
};

type Props = {
  overlayId: string | null;
  overlayMix: number;
  onSetOverlay: (id: string | null) => void;
  onSetMix: (mix: number) => void;
};

export function WavelengthBar({
  overlayId,
  overlayMix,
  onSetOverlay,
  onSetMix,
}: Props) {
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-space-950/80 px-3 py-2 backdrop-blur md:flex-row">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        wavelength
      </span>

      <div className="flex items-center gap-1">
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
    </div>
  );
}

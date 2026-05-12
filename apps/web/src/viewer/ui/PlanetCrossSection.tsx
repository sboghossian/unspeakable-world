import { useMemo, useState } from "react";
import { interiorFor, type InteriorLayer } from "../data/planet-interiors";

/**
 * 🧬 Planet cross-section panel — opens a hemisphere SVG of the focused
 * body with concentric coloured shells. Hover or tap a layer to see its
 * caption. Closed by default; toggles via the top-bar button.
 *
 * The button is rendered only when the focused body has interior data
 * defined (the 9 solar bodies + Moon). For other foci (galaxies, DSOs)
 * the button quietly hides itself.
 */

type Props = {
  focus: string;
};

const SVG_RADIUS = 110;
const PADDING = 16;

export function PlanetCrossSection({ focus }: Props) {
  const interior = useMemo(() => interiorFor(focus), [focus]);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<InteriorLayer | null>(null);

  if (!interior) return null;

  // Highlighted layer = whichever one the cursor / focus is on. Falls
  // back to the outermost layer so the caption isn't empty.
  const focused = hover ?? interior.layers[interior.layers.length - 1]!;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Cross-section of ${interior.body}`}
        aria-label={`Cross-section of ${interior.body}`}
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
          open
            ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>🧬</span>
        <span>interior</span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(360px,92vw)] rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              {interior.body} · cross-section
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              R={formatRadius(interior.radiusKm)}
            </div>
          </div>
          <p className="mb-2 font-mono text-[10.5px] leading-snug text-white/55">
            {interior.summary}
          </p>
          <div className="mb-2 flex items-center justify-center rounded-lg border border-white/5 bg-black/30 p-2">
            <CrossSectionSvg
              layers={interior.layers}
              hovered={hover}
              onHover={setHover}
            />
          </div>
          <div className="mb-1 font-display text-[12px] text-amber-200/90">
            {focused.name}
          </div>
          <div className="font-mono text-[10.5px] leading-snug text-white/60">
            {focused.detail}
          </div>
          <ul className="mt-2 space-y-0.5">
            {interior.layers.map((l) => (
              <li
                key={l.name}
                onMouseEnter={() => setHover(l)}
                onMouseLeave={() => setHover(null)}
                className={`flex items-center gap-2 rounded px-1.5 py-1 font-mono text-[10.5px] transition ${
                  hover?.name === l.name ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/15"
                  style={{ background: l.color }}
                />
                <span className="flex-1 text-white/80">{l.name}</span>
                <span className="text-white/35">
                  {Math.round(l.outer * 100)}% R
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

type SvgProps = {
  layers: InteriorLayer[];
  hovered: InteriorLayer | null;
  onHover: (l: InteriorLayer | null) => void;
};

function CrossSectionSvg({ layers, hovered, onHover }: SvgProps) {
  const size = SVG_RADIUS * 2 + PADDING * 2;
  const cx = size / 2;
  const cy = size / 2;

  // Draw outermost layer first (it's the background disc) and overlay
  // inner ones — this naturally produces the concentric look without
  // having to compute donut arcs.
  const sorted = [...layers].sort((a, b) => b.outer - a.outer);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Planet interior cross-section"
      onMouseLeave={() => onHover(null)}
    >
      {/* Outer glow ring for a touch of atmosphere */}
      <defs>
        <radialGradient id="planet-glow" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(120,160,255,0.18)" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={SVG_RADIUS + 4} fill="url(#planet-glow)" />
      {sorted.map((layer) => {
        const r = layer.outer * SVG_RADIUS;
        const isHover = hovered?.name === layer.name;
        return (
          <circle
            key={layer.name}
            cx={cx}
            cy={cy}
            r={r}
            fill={layer.color}
            stroke={isHover ? "#fff" : "rgba(0,0,0,0.35)"}
            strokeWidth={isHover ? 1.5 : 0.5}
            onMouseEnter={() => onHover(layer)}
            style={{ cursor: "pointer" }}
          />
        );
      })}
      {/* Cutaway pie slice — gives the cross-section feel by removing a wedge */}
      <path
        d={cutawayWedge(cx, cy, SVG_RADIUS, -20, 40)}
        fill="rgba(0,0,0,0.55)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.5}
      />
      {/* Surface highlight for depth */}
      <circle
        cx={cx - SVG_RADIUS * 0.35}
        cy={cy - SVG_RADIUS * 0.35}
        r={SVG_RADIUS * 0.18}
        fill="rgba(255,255,255,0.08)"
      />
    </svg>
  );
}

function cutawayWedge(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function formatRadius(km: number): string {
  if (km >= 10_000) return `${(km / 1000).toFixed(0)},${pad3(km % 1000)} km`;
  return `${km.toLocaleString()} km`;
}

function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}

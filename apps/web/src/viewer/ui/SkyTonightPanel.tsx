import { useMemo, useState } from "react";
import { tonightSummary, type TonightSummary } from "../observer/tonight";

/**
 * 🌙 Sky-tonight button — the "is tonight worth setting up the scope?"
 * answer in a single dropdown.
 *
 * Pure compute via AstronomyEngine. No fetch. No API key. Re-runs on each
 * open so the values stay aligned with the user's current time. Inline
 * SVG moon glyph reflects the current phase.
 */

type Props = {
  observer: { lat: number; lon: number } | null;
};

export function SkyTonightPanel({ observer }: Props) {
  const [open, setOpen] = useState(false);
  const summary = useMemo<TonightSummary | null>(() => {
    if (!observer) return null;
    return tonightSummary(observer.lat, observer.lon);
    // Recompute on every open so the user sees current values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observer, open]);

  if (!observer) return null;

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Sky tonight — moon, twilight, dark-sky window"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          open
            ? "border-indigo-400/50 bg-indigo-400/15 text-indigo-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-indigo-200"
        }`}
      >
        {summary ? (
          <MoonGlyph phaseAngle={summary.moon.phaseAngle} size={14} />
        ) : (
          <span>🌙</span>
        )}
        {summary && (
          <span className="hidden md:inline">
            {(summary.moon.illumination * 100).toFixed(0)}%
          </span>
        )}
      </button>

      {open && summary && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(360px,92vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            sky tonight · your location
          </div>

          {/* Verdict band */}
          <div
            className={`border-b border-white/5 px-3 py-2 text-xs ${
              summary.verdict.tone === "great"
                ? "text-emerald-300"
                : summary.verdict.tone === "ok"
                  ? "text-amber-300"
                  : "text-rose-300/85"
            }`}
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              verdict
            </span>{" "}
            <span className="font-display">{summary.verdict.label}</span>
          </div>

          {/* Moon block */}
          <div className="flex items-start gap-3 border-b border-white/5 px-3 py-3">
            <MoonGlyph phaseAngle={summary.moon.phaseAngle} size={48} />
            <div className="flex-1">
              <div className="font-display text-sm text-white">
                {summary.moon.phaseName}
              </div>
              <div className="font-mono text-[10px] text-white/45">
                {(summary.moon.illumination * 100).toFixed(0)}% illuminated ·{" "}
                {summary.moon.waxing ? "waxing" : "waning"}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] text-white/65">
                <Tile label="rise" value={fmtTime(summary.moon.rise)} />
                <Tile label="set" value={fmtTime(summary.moon.set)} />
              </dl>
            </div>
          </div>

          {/* Sun + twilight block */}
          <div className="border-b border-white/5 px-3 py-3">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
              sun · twilight
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] text-white/65">
              <Tile label="sunset" value={fmtTime(summary.sun.set)} />
              <Tile label="sunrise" value={fmtTime(summary.sun.rise)} />
              <Tile
                label="dark from"
                value={fmtTime(summary.twilight.duskAstronomical)}
              />
              <Tile
                label="dark until"
                value={fmtTime(summary.twilight.dawnAstronomical)}
              />
            </dl>
            <div className="mt-1.5 text-[10px] text-white/35">
              "dark" = sun &lt; -18° (astronomical twilight)
            </div>
          </div>

          <div className="px-3 py-1.5 text-[10px] text-white/30">
            via AstronomyEngine · pure compute · no network
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-white/40">{label}</dt>
      <dd className="text-white/85">{value}</dd>
    </>
  );
}

function fmtTime(d: Date | null): string {
  if (!d) return "—";
  const sameDay = d.toDateString() === new Date().toDateString();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return sameDay ? `${hh}:${mm}` : `${hh}:${mm} +1d`;
}

/**
 * SVG moon-phase glyph. Renders a circle with a shadow patch whose width
 * is driven by the current phase angle. 0=new (full shadow), 90=first
 * quarter (right half lit), 180=full (no shadow), 270=last quarter
 * (left half lit). Subtle rim highlight for legibility on dark UI.
 */
function MoonGlyph({ phaseAngle, size }: { phaseAngle: number; size: number }) {
  const r = size / 2 - 0.5;
  const cx = size / 2;
  const cy = size / 2;
  const a = ((phaseAngle % 360) + 360) % 360;
  // Compute illuminated fraction and which side is lit.
  // Illumination fraction k = (1 - cos(a)) / 2 (a in radians)
  const aRad = (a * Math.PI) / 180;
  const k = (1 - Math.cos(aRad)) / 2; // 0..1
  const waxing = a < 180;
  const lightedFromLeft = !waxing; // waning → light on left side

  // The terminator is an ellipse with x-radius = r * |1 - 2k|.
  // When k = 0.5 (quarter) the terminator is a straight line (rx = 0).
  const termRx = r * Math.abs(1 - 2 * k);
  // SVG path: full disk lit, then either subtract a darker patch for
  // < half-illuminated phases, or add a darker patch on the *unlit* side.
  // Simplest readable approach: draw full disk dark, then arc-path the
  // lit area on top.

  // Build the lit-area path:
  // - For < half phase (k < 0.5): lit area is a crescent on one side.
  //   Outer edge is the disk's near-side semicircle; inner edge is an
  //   ellipse arc bulging *away* from the lit side.
  // - For > half phase (k > 0.5): lit area is the full near-side
  //   semicircle plus a "bite" extending past the terminator.
  const lit = buildLitPath(cx, cy, r, k, lightedFromLeft);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-label={`Moon phase ${(k * 100).toFixed(0)}% illuminated`}
    >
      {/* Shadowed disk */}
      <circle cx={cx} cy={cy} r={r} fill="#1a1c2a" />
      {/* Lit crescent / gibbous */}
      <path d={lit} fill="#f8edc8" />
      {/* Rim */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.7}
      />
      {/* Suppress unused — kept for future ellipse decoration */}
      <g opacity={0}>
        <ellipse cx={cx} cy={cy} rx={termRx} ry={r} />
      </g>
    </svg>
  );
}

/**
 * Construct the SVG path for the moon's illuminated area.
 *
 * Geometry: the lit region is bounded by
 *   • an outer half-circle on the lit limb (top → bottom of disk)
 *   • a half-ellipse terminator (bottom → top of disk) with
 *     rx = r·|1 − 2k|, ry = r.
 *
 * The terminator bulges into the *lit* side for crescents (k < 0.5) and
 * into the *dark* side for gibbous (k > 0.5). Since SVG's sweep-flag
 * with y-down is "1 = clockwise", and bot→top CW goes through the right
 * limb, the inner sweep flag is determined by the four-way truth table
 * below.
 */
function buildLitPath(
  cx: number,
  cy: number,
  r: number,
  k: number,
  lightedFromLeft: boolean,
): string {
  if (k <= 0) return "";
  if (k >= 1) {
    return `M ${cx - r},${cy} A ${r},${r} 0 1 1 ${cx + r},${cy} A ${r},${r} 0 1 1 ${cx - r},${cy} Z`;
  }
  const top = `${cx},${cy - r}`;
  const bot = `${cx},${cy + r}`;
  const ellipseRx = r * Math.abs(1 - 2 * k);

  // Outer half-circle on the lit limb. Lit on right → CW from top through
  // (cx+r, cy) to bot, sweep=1. Lit on left → CCW, sweep=0.
  const outerSweep = lightedFromLeft ? 0 : 1;

  // Inner terminator. From bot back to top via the half-ellipse.
  // (lit-on-left)  ⊕ (k<0.5 crescent)  → terminator bulges left  → bot→top through left  → sweep=0
  // (lit-on-left)  ⊕ (k>0.5 gibbous)   → terminator bulges right → bot→top through right → sweep=1
  // (lit-on-right) ⊕ (k<0.5 crescent)  → terminator bulges right → sweep=1
  // (lit-on-right) ⊕ (k>0.5 gibbous)   → terminator bulges left  → sweep=0
  const innerSweep = lightedFromLeft === k < 0.5 ? 0 : 1;

  return `M ${top} A ${r},${r} 0 0 ${outerSweep} ${bot} A ${ellipseRx},${r} 0 0 ${innerSweep} ${top} Z`;
}

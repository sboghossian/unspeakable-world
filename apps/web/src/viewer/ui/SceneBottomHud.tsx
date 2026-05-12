/**
 * Cinematic bottom-center readout that mirrors the AstroGrid pattern:
 *
 *     DISTANCE FROM SUN
 *     1.07 AU                  (big)
 *     EARTH VICINITY           (vicinity label)
 *     ← SCREEN SCALE →
 *     2.26 AU                  (how wide the viewport is, in scene units)
 *
 * Works for every scene (solar flight, universe, galactic) — the parent
 * passes the formatted strings, this component owns the layout + styling.
 */

type Props = {
  /** "DISTANCE FROM SUN" — copy varies between scenes. */
  topLabel: string;
  /** Big foreground value, e.g. "1.07 AU" or "5.22 LY" or "108.3 Mkm". */
  distance: string;
  /** Named vicinity zone, e.g. "EARTH VICINITY". */
  vicinity: string;
  /** On-screen horizontal extent, e.g. "2.26 AU". */
  screenScale: string;
  /** Hide the entire HUD (focus mode). */
  hidden?: boolean;
};

export function SceneBottomHud({
  topLabel,
  distance,
  vicinity,
  screenScale,
  hidden,
}: Props) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-3 z-[6] flex flex-col items-center text-center transition-opacity ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={hidden}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
        {topLabel}
      </div>
      <div className="mt-0.5 font-display text-xl font-semibold text-emerald-200 drop-shadow-[0_0_8px_rgba(74,209,156,0.35)]">
        {distance}
      </div>
      <div className="mt-1 font-display text-[11px] uppercase tracking-[0.45em] text-white/75">
        {vicinity}
      </div>
      <div className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">
        <span aria-hidden>←</span>
        <span>Screen Scale</span>
        <span aria-hidden>→</span>
      </div>
      <div className="font-mono text-[11px] text-emerald-200/80">
        {screenScale}
      </div>
    </div>
  );
}

/**
 * Format a distance in scene-aware units. Inputs in **astronomical units**.
 * Picks the most readable unit for the magnitude:
 *   < 0.01 AU → km
 *   < 0.7 AU → Mkm  (millions of km)
 *   < 10 AU → AU
 *   < 50 kAU → AU
 *   ≥ 50 kAU → LY
 */
export function formatDistanceAU(au: number): string {
  if (!Number.isFinite(au) || au <= 0) return "0 AU";
  const km = au * 149_597_870.7;
  if (au < 0.01) return `${km.toFixed(0)} km`;
  if (au < 0.7) return `${(km / 1_000_000).toFixed(2)} Mkm`;
  if (au < 10) return `${au.toFixed(2)} AU`;
  if (au < 50_000) return `${au.toFixed(1)} AU`;
  const ly = au / 63_241.077;
  if (ly < 100) return `${ly.toFixed(2)} LY`;
  if (ly < 1000) return `${ly.toFixed(1)} LY`;
  if (ly < 1_000_000) return `${(ly / 1000).toFixed(2)} kly`;
  return `${(ly / 1_000_000).toFixed(2)} Mly`;
}

/** Same logic but input in LY directly. */
export function formatDistanceLY(ly: number): string {
  if (!Number.isFinite(ly) || ly <= 0) return "0 LY";
  const au = ly * 63_241.077;
  if (ly < 0.001) return formatDistanceAU(au);
  if (ly < 100) return `${ly.toFixed(2)} LY`;
  if (ly < 1000) return `${ly.toFixed(1)} LY`;
  if (ly < 1_000_000) return `${(ly / 1000).toFixed(2)} kly`;
  if (ly < 1_000_000_000) return `${(ly / 1_000_000).toFixed(2)} Mly`;
  return `${(ly / 1_000_000_000).toFixed(2)} Gly`;
}

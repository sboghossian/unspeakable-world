import { useEffect, useState } from "react";
import type { UniverseScene } from "../universe/universe-scene";
import { angularEquivalents, formatRaDec } from "../measure/measure-tool";

/**
 * 📐 Distance-scale measurement panel.
 *
 * Two-state UI:
 *   - Off: a small button in the top bar that activates the tool.
 *   - On:  a popover floating below the button shows live measurement
 *          state (0/1/2 points placed + angular distance + RA/Dec for
 *          each endpoint). Two more clicks anywhere on the sky drop
 *          markers; a third click resets and restarts.
 *
 * The actual marker + great-circle arc are rendered by the
 * `MeasureTool` inside the scene's hipsGroup — this React panel just
 * reads + displays the live state.
 */

type Props = {
  scene: UniverseScene | null;
};

export function MeasurePanel({ scene }: Props) {
  const [on, setOn] = useState(false);
  // Force re-render whenever the scene's measure state changes.
  const [, bump] = useState(0);

  useEffect(() => {
    if (!scene) return;
    scene.setOnMeasureChange(() => bump((v) => v + 1));
  }, [scene]);

  const angular = scene?.measureAngularDeg() ?? 0;
  const points = scene?.measurePoints() ?? [];
  const hasTwo = points.length === 2;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const next = !on;
          setOn(next);
          scene?.setMeasureMode(next);
        }}
        title="Distance-scale ruler — click two sky points to measure their angular separation"
        aria-label="Distance ruler"
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
          on
            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>📐</span>
        <span>ruler</span>
      </button>
      {on && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(360px,92vw)] rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              Distance ruler
            </div>
            <button
              type="button"
              onClick={() => scene?.measureClear()}
              className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/55 hover:bg-white/10 hover:text-white"
            >
              clear
            </button>
          </div>
          <p className="mb-2 font-mono text-[10.5px] leading-snug text-white/55">
            Click anywhere on the sky to drop a marker. After two clicks
            the great-circle separation is computed. A third click resets.
          </p>
          {points.length === 0 && (
            <div className="rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-center font-mono text-[11px] text-white/45">
              awaiting first click…
            </div>
          )}
          {points.length === 1 && (
            <div className="space-y-2">
              <div className="font-mono text-[10.5px] text-white/55">
                <span className="text-emerald-300/80">A:</span>{" "}
                {formatRaDec(points[0]!.raDeg, points[0]!.decDeg)}
              </div>
              <div className="rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-center font-mono text-[11px] text-white/45">
                click anywhere for second point…
              </div>
            </div>
          )}
          {hasTwo && (
            <div className="space-y-2">
              <div className="font-mono text-[10.5px] leading-tight text-white/55">
                <span className="text-emerald-300/80">A:</span>{" "}
                {formatRaDec(points[0]!.raDeg, points[0]!.decDeg)}
              </div>
              <div className="font-mono text-[10.5px] leading-tight text-white/55">
                <span className="text-emerald-300/80">B:</span>{" "}
                {formatRaDec(points[1]!.raDeg, points[1]!.decDeg)}
              </div>
              <div className="rounded-md border border-emerald-400/30 bg-emerald-400/5 px-3 py-2">
                <div className="font-display text-base text-emerald-200">
                  {angular.toFixed(2)}°
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] text-white/60">
                  {angularEquivalents(angular)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

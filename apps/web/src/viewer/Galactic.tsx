import { useEffect, useRef, useState } from "react";
import { GalacticScene, type GalacticState } from "./galactic/galactic-scene";

/**
 * 🌌 Galactic Mode — Milky Way + Local Group + WASD free flight.
 */

type Props = {
  onExit: () => void;
};

const DEFAULT_STATE: GalacticState = {
  cameraDistance: 50,
  scaleLabel: "Galactic Disk",
  arms: true,
  starHalo: true,
};

export function Galactic({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GalacticScene | null>(null);
  const [state, setState] = useState<GalacticState>(DEFAULT_STATE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new GalacticScene(canvas);
    sceneRef.current = scene;
    const unsubscribe = scene.subscribe(setState);
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-[#020415]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 h-full w-full focus:outline-none"
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ← solar
          </button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-violet-200/80 backdrop-blur">
            🌌 galactic — milky way
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            fly to
          </span>
          {(
            ["Sun", "Galactic Center", "M31", "Local Group"] as const
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => sceneRef.current?.flyTo(t)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/65 transition hover:bg-white/10 hover:text-violet-200"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Layer toggles (top-left, below the back button row) */}
      <div className="pointer-events-auto absolute left-3 top-16 z-10 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-space-950/70 p-2 backdrop-blur">
        <div className="px-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          layers
        </div>
        <Toggle
          label="Spiral arms"
          on={state.arms}
          onClick={() => sceneRef.current?.setArmsVisible(!state.arms)}
        />
        <Toggle
          label="Star halo"
          on={state.starHalo}
          onClick={() => sceneRef.current?.setHaloVisible(!state.starHalo)}
        />
      </div>

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip label="vicinity" value={state.scaleLabel} accent />
          <Chip
            label="distance from Sun"
            value={
              state.cameraDistance < 1000
                ? `${state.cameraDistance.toFixed(1)} kly`
                : `${(state.cameraDistance / 1000).toFixed(2)} Mly`
            }
          />
        </div>
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          W A S D · move · drag · look · wheel · adjust speed · Q/E · up/down
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-left font-mono text-[11px] transition ${
        on
          ? "border-violet-400/50 bg-violet-400/15 text-violet-200"
          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
      }`}
    >
      {on ? "◉" : "○"} {label}
    </button>
  );
}

function Chip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const cls = accent
    ? "border-violet-400/40 bg-violet-400/10 text-violet-200"
    : "border-white/10 bg-space-950/70 text-white/80";
  return (
    <div
      className={`flex items-baseline gap-1.5 rounded-lg border px-3 py-1.5 backdrop-blur ${cls}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

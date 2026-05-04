import { useEffect, useRef, useState } from "react";
// Using useState below.
import {
  SolarFlightScene,
  type SolarFlightState,
} from "./solar/solar-flight";
import { TimeStrip } from "./ui/TimeStrip";

/**
 * 🚀 Solar System Flight Mode component.
 *
 * Owns its own canvas + Three.js scene. Renders heliocentric planet
 * positions in 3D, drawn orbital paths, a giant background star sphere,
 * and a hand-rolled orbit-around-target camera.
 *
 * Two callbacks let it integrate with the rest of the viewer:
 *   • onExit — switch back to the celestial-sphere mode
 *   • onFlyToFocus(dir) — handed the geocentric direction to the focused
 *     body when the user clicks "view from Earth", so the sky-mode
 *     camera lands on the same target.
 */

type Props = {
  onExit: () => void;
  onFlyToSky: (dir: { x: number; y: number; z: number }) => void;
};

const DEFAULT_STATE: SolarFlightState = {
  time: new Date(),
  playing: true,
  timeRate: 86400,
  focus: "Sun",
  cameraDistance: 4,
  yaw: 0,
  pitch: 0.4,
  tracking: true,
  vicinity: "Inner Solar System",
};

export function SolarFlight({ onExit, onFlyToSky }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SolarFlightScene | null>(null);
  const [state, setState] = useState<SolarFlightState>(DEFAULT_STATE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new SolarFlightScene(canvas);
    sceneRef.current = scene;
    const unsubscribe = scene.subscribe(setState);
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const targets = sceneRef.current?.targets() ?? [
    "Sun",
    "Mercury",
    "Venus",
    "Earth",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
  ];
  const [zonesOn, setZonesOn] = (() => {
    // Local-state replacement using useState — but to keep this small we
    // hold the bit on a ref-attached state. Importing useState explicitly:
    return useState(false);
  })();

  return (
    <div className="relative h-full w-full bg-[#000208]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Top bar — back button + focus picker */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ← sky view
          </button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-200/80 backdrop-blur">
            🚀 solar system flight
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            focus
          </span>
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => sceneRef.current?.setFocus(t)}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                state.focus === t
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom bar — chips + time strip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip label="focus" value={state.focus} accent />
          <Chip label="vicinity" value={state.vicinity} />
          <Chip
            label="distance"
            value={
              state.cameraDistance >= 1
                ? `${state.cameraDistance.toFixed(2)} AU`
                : `${(state.cameraDistance * 149.6).toFixed(2)} M km`
            }
          />
          <button
            type="button"
            onClick={() => sceneRef.current?.setTracking(!state.tracking)}
            title="Tracking — keep camera glued to the focus body as time advances"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              state.tracking
                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⊙ tracking {state.tracking ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => sceneRef.current?.resetNow()}
            title="Reset simulation time to the current wall-clock moment"
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/75 backdrop-blur transition hover:bg-white/10"
          >
            ⟲ now
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !zonesOn;
              setZonesOn(next);
              sceneRef.current?.setSolarZones(next);
            }}
            title="Toggle named solar-system zones — habitable zone, frost line, asteroid belt, Kuiper belt"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              zonesOn
                ? "border-teal-400/50 bg-teal-400/15 text-teal-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ◉ zones
          </button>
          <button
            type="button"
            onClick={() => {
              const dir = sceneRef.current?.geocentricDirOfFocus();
              if (dir) onFlyToSky(dir);
            }}
            className="rounded-lg border border-violet-400/40 bg-violet-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/25"
          >
            ↗ view from Earth
          </button>
        </div>

        <TimeStrip
          time={state.time}
          playing={state.playing}
          rate={state.timeRate}
          onPlayToggle={() =>
            sceneRef.current?.setPlaying(!state.playing)
          }
          onRateChange={(r) => sceneRef.current?.setTimeRate(r)}
          onTimeChange={(t) => sceneRef.current?.setTime(t)}
        />
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-32 z-10 flex justify-center">
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          drag to orbit · wheel to zoom · pick a focus body above
        </div>
      </div>
    </div>
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
    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
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

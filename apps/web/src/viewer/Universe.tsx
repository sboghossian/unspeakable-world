import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import {
  UniverseScene,
  type UniverseState,
} from "./universe/universe-scene";
import { TimeStrip } from "./ui/TimeStrip";
import { EventsPanel } from "./ui/EventsPanel";
import { SkyTonightPanel } from "./ui/SkyTonightPanel";
import { SpaceWeatherPanel } from "./ui/SpaceWeatherPanel";
import { NeoPanel } from "./ui/NeoPanel";
import { TonightSky } from "./ui/TonightSky";

/**
 * 🌌 Universe Mode — single seamless scene from Earth to the Cosmic Web.
 *
 * One Three.js scene with two coordinate frames (Solar in AU, Galactic
 * in LY). The camera lives at world-origin and the frames re-anchor each
 * tick. Layer visibility cross-fades based on distance from the Sun, so
 * zooming out from a planet smoothly hands off to the Milky Way disk and
 * then to the cosmic web.
 */

type Props = {
  onExit: () => void;
};

const DEFAULT_STATE: UniverseState = {
  cameraLogicalPos: { x: 26000, y: 0.0001, z: 0.0002 },
  distFromSunLY: 0.0001,
  speedLY: 1e-5,
  yaw: Math.PI,
  pitch: -0.05,
  scaleLabel: "Earth Vicinity",
  time: new Date(),
  tier: "Solar",
  skyTilesVisible: true,
  overlayId: null,
  overlayMix: 0,
};

const FLY_TARGETS = [
  "Sun",
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Galactic Center",
  "M31",
  "Local Group",
] as const;

export function Universe({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<UniverseScene | null>(null);
  const [state, setState] = useState<UniverseState>(DEFAULT_STATE);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [observer, setObserver] = useState<{ lat: number; lon: number } | null>(
    () => {
      try {
        const raw = localStorage.getItem("uw:observer");
        if (raw) {
          const parsed = JSON.parse(raw) as { lat: number; lon: number };
          if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon))
            return parsed;
        }
      } catch {
        /* ignore */
      }
      return null;
    },
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new UniverseScene(canvas);
    sceneRef.current = scene;
    const unsubscribe = scene.subscribe(setState);
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Suppress unused-import warnings until we wire panels into all tiers.
  void Vector3;
  void useMemo;

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
            ← exit
          </button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-200/80 backdrop-blur">
            🌌 universe — {state.tier}
          </div>
        </div>

        <div className="pointer-events-auto flex max-w-[60vw] flex-wrap items-center justify-end gap-1.5">
          <EventsPanel
            open={eventsOpen}
            onOpenChange={setEventsOpen}
            onFlyToBody={(name) => sceneRef.current?.flyTo(name)}
          />
          <NeoPanel />
          <SkyTonightPanel observer={observer} />
          <SpaceWeatherPanel observer={observer} />
          <TonightSky
            location={observer}
            onLocationFix={(lat, lon) => {
              setObserver({ lat, lon });
              try {
                localStorage.setItem(
                  "uw:observer",
                  JSON.stringify({ lat, lon }),
                );
              } catch {
                /* ignore */
              }
            }}
            onZenith={() => sceneRef.current?.flyTo("Sun")}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            fly
          </span>
          {FLY_TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => sceneRef.current?.flyTo(t)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/65 transition hover:bg-white/10 hover:text-emerald-200"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Wavelength bar — only visible when sky tiles dominate (Solar tier) */}
      {state.skyTilesVisible && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-3">
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-space-950/80 px-3 py-2 backdrop-blur">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              wavelength
            </span>
            <button
              type="button"
              onClick={() => sceneRef.current?.setOverlay(null)}
              className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
                state.overlayId === null
                  ? "border-plasma-500/40 bg-plasma-500/15 text-plasma-400"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              visible
            </button>
            {(
              [
                ["halpha", "Hα"],
                ["2mass", "2MASS"],
                ["allwise", "WISE"],
                ["galex", "UV"],
                ["integral", "X-ray"],
                ["nvss", "Radio"],
                ["fermi", "γ-ray"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  sceneRef.current?.setOverlay(
                    state.overlayId === id ? null : id,
                  )
                }
                className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
                  state.overlayId === id
                    ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
            {state.overlayId && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={state.overlayMix}
                onChange={(e) =>
                  sceneRef.current?.setOverlayMix(parseFloat(e.target.value))
                }
                className="ml-2 h-1 w-24 accent-amber-400"
                aria-label="Wavelength cross-fade"
              />
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip label="vicinity" value={state.scaleLabel} accent />
          <Chip label="distance from Sun" value={fmtDist(state.distFromSunLY)} />
          <Chip label="speed" value={`${fmtDist(state.speedLY)}/s`} />
        </div>
        <TimeStrip
          time={state.time}
          playing={true}
          rate={86400}
          onPlayToggle={() => sceneRef.current?.setPlaying(false)}
          onRateChange={(r) => sceneRef.current?.setTimeRate(r)}
          onTimeChange={(t) => sceneRef.current?.setTime(t)}
        />
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          W A S D · move · drag · look · wheel · adjust speed · 1-8 · planet ·
          ` home · B galactic center · N M31 · Q/E · up/down
        </div>
      </div>
    </div>
  );
}

function fmtDist(distLY: number): string {
  if (distLY < 1.5e-5) {
    const m = distLY * 9.461e15; // LY → m
    if (m < 1000) return `${m.toFixed(0)} m`;
    if (m < 1e6) return `${(m / 1000).toFixed(1)} km`;
    return `${(m / 1.496e11).toFixed(3)} AU`;
  }
  if (distLY < 1) return `${(distLY * 63241).toFixed(0)} AU`;
  if (distLY < 1000) return `${distLY.toFixed(2)} LY`;
  if (distLY < 1_000_000) return `${(distLY / 1000).toFixed(2)} kly`;
  if (distLY < 1_000_000_000) return `${(distLY / 1_000_000).toFixed(2)} Mly`;
  return `${(distLY / 1_000_000_000).toFixed(2)} Gly`;
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
    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
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

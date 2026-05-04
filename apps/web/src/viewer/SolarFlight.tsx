import { useEffect, useRef, useState } from "react";
// Using useState below.
import {
  SolarFlightScene,
  type SolarFlightHit,
  type SolarFlightState,
} from "./solar/solar-flight";
import { TimeStrip } from "./ui/TimeStrip";
import { InfoPanel } from "./ui/InfoPanel";

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
  realScale: false,
  orbitOpacity: 0.45,
  starBrightness: 1.0,
};

export function SolarFlight({ onExit, onFlyToSky }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SolarFlightScene | null>(null);
  const [state, setState] = useState<SolarFlightState>(DEFAULT_STATE);
  const [inspect, setInspect] = useState<SolarFlightHit | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new SolarFlightScene(canvas);
    sceneRef.current = scene;
    scene.setOnClick((hit) => setInspect(hit));
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
  const [zonesOn, setZonesOn] = useState(false);
  const [satellitesOn, setSatellitesOn] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // AstroGrid-style keyboard shortcuts: ` home, 1-8 planet jump, F focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "`") {
        sceneRef.current?.setFocus("Sun");
        return;
      }
      if (e.key === "f" || e.key === "F") {
        setFocusMode((v) => !v);
        return;
      }
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= 8) {
        const planets = [
          "Mercury",
          "Venus",
          "Earth",
          "Mars",
          "Jupiter",
          "Saturn",
          "Uranus",
          "Neptune",
        ];
        sceneRef.current?.setFocus(planets[n - 1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [sandboxKind, setSandboxKind] = useState<
    "Comet" | "Earth-class" | "Jupiter-class" | "Brown Dwarf" | "White Dwarf" | "Neutron Star" | "Black Hole"
  >("Comet");
  const [sandboxSpeed, setSandboxSpeed] = useState(30);

  return (
    <div className="relative h-full w-full bg-[#000208]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Top bar — back button + focus picker (hidden in focus mode) */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 transition-opacity ${
          focusMode ? "opacity-0" : "opacity-100"
        }`}
      >
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
          <a
            href="#galactic"
            title="Zoom out to the Milky Way galaxy + Local Group + Cosmic Web"
            className="rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/20"
          >
            🌌 galactic →
          </a>
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

      {/* Bottom bar — chips + time strip (hidden in focus mode) */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3 transition-opacity ${
          focusMode ? "opacity-0" : "opacity-100"
        }`}
      >
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
            onClick={() => setSettingsOpen((v) => !v)}
            title="Settings: real-scale toggle, opacity sliders, star brightness"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              settingsOpen
                ? "border-white/30 bg-white/15 text-white"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⚙ settings
          </button>
          <button
            type="button"
            onClick={() => setSandboxOpen((v) => !v)}
            title="Open the Gravity Sandbox — launch projectiles and watch them interact with the Sun + giants"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              sandboxOpen
                ? "border-orange-400/50 bg-orange-400/15 text-orange-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⚛ sandbox
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !satellitesOn;
              setSatellitesOn(next);
              sceneRef.current?.setSatellites(next);
            }}
            title="Toggle real satellites around Earth — TLE-driven, propagated live (SGP4)"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              satellitesOn
                ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            🛰 sats
          </button>
          {(state.focus === "Earth" ||
            state.focus === "Mars" ||
            // Moon isn't in the focus targets but the chip still surfaces in
            // sky view; only enable for the real solar-flight focus list.
            state.focus === "Moon") && (
            <a
              href={`#surface/${state.focus.toLowerCase()}`}
              title={`Open the surface of ${state.focus} — high-detail textured 3D body`}
              className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-amber-200 backdrop-blur transition hover:bg-amber-400/25"
            >
              🪐 land on {state.focus}
            </a>
          )}
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

      {/* Settings panel — Real Scale + sliders */}
      {settingsOpen && (
        <div className="pointer-events-auto absolute bottom-44 right-3 z-20 w-[min(320px,90vw)] rounded-xl border border-white/15 bg-space-950/90 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
              ⚙ settings
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            onClick={() => sceneRef.current?.setRealScale(!state.realScale)}
            className={`mb-3 w-full rounded-md border px-2.5 py-1.5 text-left font-mono text-[11px] transition ${
              state.realScale
                ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
            }`}
            title="Real Scale — shrink planets to ~6% of cosmetic size, the educational 'planets are pinpricks' mode"
          >
            ◉ real-scale planets {state.realScale ? "on" : "off"}
            <div className="mt-0.5 font-mono text-[9px] text-white/35">
              {state.realScale
                ? "planets shown at physical proportion vs Sun"
                : "cosmetic sizing — easier to see + click"}
            </div>
          </button>

          <Slider
            label="orbit opacity"
            value={state.orbitOpacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => sceneRef.current?.setOrbitOpacity(v)}
          />
          <Slider
            label="star brightness"
            value={state.starBrightness}
            min={0}
            max={2}
            step={0.1}
            onChange={(v) => sceneRef.current?.setStarBrightness(v)}
          />
          <div className="mt-2 font-mono text-[10px] text-white/35">
            applies live · settings persist for this session only
          </div>
        </div>
      )}

      {/* Gravity Sandbox panel */}
      {sandboxOpen && (
        <div className="pointer-events-auto absolute bottom-44 left-3 z-20 w-[min(320px,90vw)] rounded-xl border border-orange-400/30 bg-space-950/90 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-300/80">
              ⚛ gravity sandbox
            </div>
            <button
              type="button"
              onClick={() => setSandboxOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            select projectile
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {(
              [
                "Comet",
                "Earth-class",
                "Jupiter-class",
                "Brown Dwarf",
                "White Dwarf",
                "Neutron Star",
                "Black Hole",
              ] as const
            ).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSandboxKind(k)}
                className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                  sandboxKind === k
                    ? "border-orange-400/50 bg-orange-400/15 text-orange-200"
                    : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mb-1 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              launch speed
            </div>
            <div className="font-mono text-[10px] text-white/65">
              {sandboxSpeed} km/s
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            step={1}
            value={sandboxSpeed}
            onChange={(e) => setSandboxSpeed(parseInt(e.target.value, 10))}
            className="mb-3 h-1 w-full accent-orange-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                sceneRef.current?.launchProjectile(sandboxKind, sandboxSpeed)
              }
              className="flex-1 rounded-md border border-orange-400/40 bg-orange-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-orange-200 hover:bg-orange-400/25"
            >
              ▶ launch
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.clearProjectiles()}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/65 hover:bg-white/10"
            >
              clear
            </button>
          </div>
          <div className="mt-2 font-mono text-[10px] text-white/35">
            n-body integration: leapfrog under Sun + 4 gas giants. Up to 15
            projectiles at a time.
          </div>
        </div>
      )}

      {/* Inspector card — unified InfoPanel */}
      {inspect && (
        <InfoPanel
          payload={inspect.payload}
          onClose={() => setInspect(null)}
          onFlyHere={() => {
            sceneRef.current?.setFocus(inspect.name);
            setInspect(null);
          }}
          onSurface={
            inspect.name === "Earth" || inspect.name === "Mars"
              ? () => {
                  window.location.hash = `#surface/${inspect.name.toLowerCase()}`;
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {label}
        </div>
        <div className="font-mono text-[10px] text-white/65">
          {value.toFixed(2)}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full accent-white/70"
      />
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

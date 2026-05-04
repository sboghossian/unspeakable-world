import { useEffect, useRef, useState } from "react";
import {
  PlanetSurfaceScene,
  type SurfacePlanet,
  type SurfaceState,
} from "./surface/planet-surface";

/**
 * 🪐 Planetary Surface Mode component.
 *
 * Owns its own canvas + Three.js scene. Renders one of Earth, Mars, Moon
 * as a textured 3D body the user can rotate around. The texture is
 * procedural at first (so the page is never blank) and silently upgrades
 * to a real photographic texture (Wikimedia Commons hosting NASA imagery)
 * when CORS allows.
 */

type Props = {
  planet: SurfacePlanet;
  onExit: () => void;
};

const DEFAULT_STATE: SurfaceState = {
  planet: "Earth",
  cameraRadius: 2.4,
  yaw: 0,
  pitch: 0.2,
  autoRotate: true,
  realTextureLoaded: false,
};

const PLANET_FACTS: Record<
  SurfacePlanet,
  { radiusKm: number; gravityG: number; dayHours: number; yearDays: number; tagline: string }
> = {
  Earth: {
    radiusKm: 6371,
    gravityG: 1.0,
    dayHours: 24.0,
    yearDays: 365.25,
    tagline: "The pale blue dot. 71% ocean, 1 moon, 8 billion cellular consensus.",
  },
  Mars: {
    radiusKm: 3389,
    gravityG: 0.38,
    dayHours: 24.6,
    yearDays: 687,
    tagline: "Olympus Mons rises 21.9 km above the datum. Two potato moons.",
  },
  Moon: {
    radiusKm: 1737,
    gravityG: 0.166,
    dayHours: 708.7,
    yearDays: 27.3,
    tagline: "Tidally locked. Permanent dust, no atmosphere, 12 humans walked here.",
  },
};

export function PlanetSurface({ planet, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<PlanetSurfaceScene | null>(null);
  const [state, setState] = useState<SurfaceState>({
    ...DEFAULT_STATE,
    planet,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new PlanetSurfaceScene(canvas, planet);
    sceneRef.current = scene;
    const unsubscribe = scene.subscribe(setState);
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [planet]);

  const facts = PLANET_FACTS[planet];

  return (
    <div className="relative h-full w-full bg-[#000208]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ← back
          </button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-200/80 backdrop-blur">
            🪐 surface — {planet}
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1">
          {(["Earth", "Mars", "Moon"] as const).map((p) => (
            <a
              key={p}
              href={`#surface/${p.toLowerCase()}`}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                state.planet === p
                  ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
                  : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      </div>

      {/* Right-side facts panel */}
      <div className="pointer-events-auto absolute right-3 top-20 z-10 w-[min(320px,90vw)] rounded-xl border border-white/10 bg-space-950/85 p-3 backdrop-blur">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
          {planet}
        </div>
        <p className="mb-3 font-display text-sm text-white/85">
          {facts.tagline}
        </p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
          <dt className="text-white/40">Radius</dt>
          <dd className="text-white/80">{facts.radiusKm.toLocaleString()} km</dd>
          <dt className="text-white/40">Surface g</dt>
          <dd className="text-white/80">{facts.gravityG.toFixed(2)} ×g</dd>
          <dt className="text-white/40">Day</dt>
          <dd className="text-white/80">{facts.dayHours} h</dd>
          <dt className="text-white/40">Year / period</dt>
          <dd className="text-white/80">{facts.yearDays} d</dd>
        </dl>
        <div className="mt-3 border-t border-white/5 pt-2 font-mono text-[10px] text-white/35">
          {state.realTextureLoaded
            ? "real surface texture · NASA / public domain via Wikimedia"
            : "procedural texture · NASA photo loading…"}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip
            label="distance"
            value={`${state.cameraRadius.toFixed(2)} R`}
          />
          <Chip
            label="texture"
            value={state.realTextureLoaded ? "photo" : "procedural"}
            accent={state.realTextureLoaded}
          />
          <button
            type="button"
            onClick={() =>
              sceneRef.current?.setAutoRotate(!state.autoRotate)
            }
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              state.autoRotate
                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⟲ auto-rotate {state.autoRotate ? "on" : "off"}
          </button>
        </div>
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          drag to look around · wheel to zoom
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

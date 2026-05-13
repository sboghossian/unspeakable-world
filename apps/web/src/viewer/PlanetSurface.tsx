import { useEffect, useRef, useState } from "react";
import {
  PlanetSurfaceScene,
  type SurfacePlanet,
  type SurfaceState,
} from "./surface/planet-surface";
import { ShareButton } from "./ui/ShareButton";
import { BookmarksPanel } from "./ui/BookmarksPanel";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { LoadingSkeleton, useFakeProgress } from "./ui/LoadingSkeleton";
import { MobileMenuDrawer } from "./ui/MobileMenuDrawer";
import { Button } from "./ui/primitives/Button";
import {
  TutorialOverlayV2,
  type TutorialActions,
} from "./ui/TutorialOverlayV2";
import { navigate } from "../router";
import { useCopilotStore } from "../lib/copilot-store";
import { useTutorialAutoOpen } from "../lib/use-tutorial-auto-open";
import { useEscClose } from "../lib/use-esc-close";

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

export function PlanetSurface({ planet, onExit: _onExit }: Props) {
  // Always navigate back to `#universe` — see Galactic/Sandbox for the
  // rationale; parent-provided onExit is kept in the signature for API
  // compatibility with App.tsx.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<PlanetSurfaceScene | null>(null);
  const [state, setState] = useState<SurfaceState>({
    ...DEFAULT_STATE,
    planet,
  });
  const [tutorialOpen, setTutorialOpen] = useState(false);
  useTutorialAutoOpen(setTutorialOpen);
  const openCopilot = useCopilotStore((s) => s.setOpen);
  const [factsOpen, setFactsOpen] = useState(true);
  const [sceneAlive, setSceneAlive] = useState(false);
  const loadProgress = useFakeProgress(sceneAlive);
  useEscClose(factsOpen, () => setFactsOpen(false));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new PlanetSurfaceScene(canvas, planet);
    sceneRef.current = scene;
    const unsubscribe = scene.subscribe((next) => {
      setState(next);
      setSceneAlive(true);
    });
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [planet]);

  const facts = PLANET_FACTS[planet];

  return (
    <div className="relative h-full w-full bg-[#000208]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D Planetary Surface viewer — drag to look, scroll to zoom"
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
      />

      <LoadingSkeleton progress={loadProgress} />

      <ErrorBoundary scope="panel" label="Planet surface chrome">

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("universe")}
            className="min-h-[44px] rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 uppercase tracking-widest text-white/80 backdrop-blur hover:bg-white/10 hover:text-white"
          >
            ← universe
          </Button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-200/80 backdrop-blur">
            🪐 surface — {planet}
          </div>
          <ShareButton
            onPrepare={() => `surface/${planet.toLowerCase()}`}
          />
          <BookmarksPanel />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openCopilot(true)}
            title="Cosmic Copilot — ask anything"
            aria-label="Open the Cosmic Copilot chat"
            className="min-h-[44px] gap-1 rounded-lg border border-violet-400/40 bg-violet-400/10 px-2.5 py-1.5 uppercase tracking-widest text-violet-200 backdrop-blur hover:bg-violet-400/20"
          >
            <span aria-hidden>🧠</span>
            <span className="hidden sm:inline">copilot</span>
          </Button>
          <a
            href="#guide"
            title="Open the User Guide — every feature + every keyboard shortcut"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            📖 user guide
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTutorialOpen(true)}
            title="📖 Show me how — 12-step tutorial"
            aria-label="Show me how — open the 12-step tutorial"
            className="min-h-[44px] gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 uppercase tracking-widest text-emerald-200 backdrop-blur hover:bg-emerald-400/20"
          >
            <span aria-hidden>📖</span>
            <span className="hidden sm:inline">show me how</span>
          </Button>
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

      {/* Right-side facts panel — dismissible (Esc or ✕). */}
      {factsOpen && (
        <div className="pointer-events-auto absolute right-3 top-20 z-10 w-[min(320px,90vw)] rounded-xl border border-white/10 bg-space-950/85 p-3 backdrop-blur">
          <div className="mb-1 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
              {planet}
            </div>
            <button
              type="button"
              onClick={() => setFactsOpen(false)}
              aria-label="Close planet facts"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/10 bg-white/5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
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
      )}

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
            className={`inline-flex min-h-[44px] items-center rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
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

      {tutorialOpen && (
        <TutorialOverlayV2
          onClose={() => setTutorialOpen(false)}
          actions={
            {
              switchMode: (mode) => {
                if (mode === "viewer") window.location.hash = "#viewer";
                else if (mode === "solar") window.location.hash = "#solar";
                else if (mode === "galactic") window.location.hash = "#galactic";
                else window.location.hash = "#universe";
              },
            } satisfies TutorialActions
          }
        />
      )}
      </ErrorBoundary>

      {/* Mobile-only hamburger drawer. */}
      <div className="pointer-events-auto absolute right-3 top-3 z-30 md:hidden">
        <MobileMenuDrawer
          mode="surface"
          onShowTutorial={() => setTutorialOpen(true)}
        />
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

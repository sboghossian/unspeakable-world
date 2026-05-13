import { useEffect, useRef, useState } from "react";
import { GalacticScene, type GalacticState } from "./galactic/galactic-scene";
import { SceneBottomHud } from "./ui/SceneBottomHud";
import { SnapshotButton } from "./ui/SnapshotButton";
import { ShareButton } from "./ui/ShareButton";
import { BookmarksPanel } from "./ui/BookmarksPanel";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { ExtraLayersPanel } from "./ui/ExtraLayersPanel";
import {
  TutorialOverlayV2,
  type TutorialActions,
} from "./ui/TutorialOverlayV2";
import { LoadingSkeleton, useFakeProgress } from "./ui/LoadingSkeleton";
import { MobileMenuDrawer } from "./ui/MobileMenuDrawer";
import { Button } from "./ui/primitives/Button";
import { Toggle } from "./ui/primitives/Toggle";
import { addBookmark } from "../lib/bookmarks";
import { navigate } from "../router";
import { useCopilotStore } from "../lib/copilot-store";
import { useTutorialAutoOpen } from "../lib/use-tutorial-auto-open";

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

export function Galactic({ onExit: _onExit }: Props) {
  // We deliberately ignore the parent-provided onExit and route every
  // back action to `#universe` instead — that's the front door now, and
  // the prior behaviour stranded users on `#solar` (which itself is a
  // legacy redirect target). Kept in the props for ABI compatibility.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GalacticScene | null>(null);
  const [state, setState] = useState<GalacticState>(DEFAULT_STATE);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  useTutorialAutoOpen(setTutorialOpen);
  const openCopilot = useCopilotStore((s) => s.setOpen);
  // Track scene readiness so the loading skeleton can fade out the
  // moment GalacticScene's first state callback fires.
  const [sceneAlive, setSceneAlive] = useState(false);
  const loadProgress = useFakeProgress(sceneAlive);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new GalacticScene(canvas);
    sceneRef.current = scene;
    // Restore camera + layer params from hash if present.
    const params = parseGalacticHash(window.location.hash);
    if (params.dist !== null) scene.setCameraDistance(params.dist);
    if (params.arms !== null) scene.setArmsVisible(params.arms);
    if (params.halo !== null) scene.setHaloVisible(params.halo);
    const unsubscribe = scene.subscribe((next) => {
      setState(next);
      setSceneAlive(true);
    });
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Write camera state to hash on change (debounced via interval).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const hash = buildGalacticHash(state);
      if (window.location.hash !== `#${hash}`) {
        window.history.replaceState(null, "", `#${hash}`);
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [state]);

  return (
    <div className="relative h-full w-full bg-[#020415]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D Galactic viewer — drag to orbit the Milky Way, scroll to zoom"
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
      />

      {/* Staged loading skeleton — fades out the moment the scene's
          first state callback fires. */}
      <LoadingSkeleton progress={loadProgress} />

      {/* Panel-scope boundary: protect the canvas from chrome crashes. */}
      <ErrorBoundary scope="panel" label="Galactic chrome">

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
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-violet-200/80 backdrop-blur">
            🌌 galactic — milky way
          </div>
          <SnapshotButton
            onCapture={() => {
              const c = canvasRef.current;
              return c ? c.toDataURL("image/png") : null;
            }}
          />
          <ShareButton onPrepare={() => buildGalacticHash(state)} />
          <BookmarksPanel />
          <ExtraLayersPanel scene={sceneRef.current} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const hash = buildGalacticHash(state);
              window.history.replaceState(null, "", `#${hash}`);
              addBookmark({
                title: state.scaleLabel,
                url: window.location.href,
                mode: "galactic",
              });
            }}
            title="Save the current view as a bookmark"
            className="min-h-[44px] rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
          >
            ★ save
          </Button>
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
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            fly to
          </span>
          {(
            [
              "Sun",
              "Galactic Center",
              "Galactic Warp",
              "M31",
              "Local Group",
            ] as const
          ).map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => sceneRef.current?.flyTo(target)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/65 transition hover:bg-white/10 hover:text-violet-200"
            >
              {target}
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
          compact
          onChange={(next) => sceneRef.current?.setArmsVisible(next)}
        />
        <Toggle
          label="Star halo"
          on={state.starHalo}
          compact
          onChange={(next) => sceneRef.current?.setHaloVisible(next)}
        />
      </div>

      {/* Cinematic readout */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[6] flex justify-center">
        <SceneBottomHud
          topLabel="Distance from Sun"
          distance={
            state.cameraDistance < 1000
              ? `${state.cameraDistance.toFixed(1)} kly`
              : `${(state.cameraDistance / 1000).toFixed(2)} Mly`
          }
          vicinity={state.scaleLabel}
          screenScale={
            state.cameraDistance < 1000
              ? `${(state.cameraDistance * 0.933).toFixed(1)} kly`
              : `${((state.cameraDistance * 0.933) / 1000).toFixed(2)} Mly`
          }
        />
      </div>

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        </div>
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          W A S D · move · drag · look · wheel · adjust speed · Q/E · up/down
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

      {/* Mobile-only hamburger drawer. Hidden on ≥ md (ModeRail wins). */}
      <div className="pointer-events-auto absolute right-3 top-3 z-30 md:hidden">
        <MobileMenuDrawer
          mode="galactic"
          onShowTutorial={() => setTutorialOpen(true)}
        />
      </div>
    </div>
  );
}

type GalacticHashParams = {
  dist: number | null;
  label: string | null;
  arms: boolean | null;
  halo: boolean | null;
};

function parseGalacticHash(hash: string): GalacticHashParams {
  const empty: GalacticHashParams = {
    dist: null,
    label: null,
    arms: null,
    halo: null,
  };
  const m = hash.match(/^#galactic\?(.+)$/);
  if (!m || !m[1]) return empty;
  const p = new URLSearchParams(m[1]);
  const distRaw = p.get("dist");
  const dist = distRaw !== null && Number.isFinite(parseFloat(distRaw))
    ? parseFloat(distRaw)
    : null;
  const armsRaw = p.get("arms");
  const haloRaw = p.get("halo");
  return {
    dist,
    label: p.get("label"),
    arms: armsRaw === "true" ? true : armsRaw === "false" ? false : null,
    halo: haloRaw === "true" ? true : haloRaw === "false" ? false : null,
  };
}

function buildGalacticHash(state: GalacticState): string {
  const p = new URLSearchParams();
  p.set("dist", state.cameraDistance.toFixed(3));
  p.set("label", state.scaleLabel);
  p.set("arms", String(state.arms));
  p.set("halo", String(state.starHalo));
  return `galactic?${p.toString()}`;
}

import { useEffect, useRef, useState } from "react";
import { SandboxScene } from "./sandbox/sandbox-scene";
import type {
  LaunchSpeed,
  ProjectileKind,
  SandboxScenePreset,
  SandboxState,
  SimSpeedKey,
} from "./sandbox/types";
import {
  LAUNCH_SPEED_LABEL,
  PROJECTILE_ORDER,
  PROJECTILES,
} from "./sandbox/projectiles";
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

type Props = {
  onExit: () => void;
};

const SIM_SPEEDS: Array<{ key: SimSpeedKey; label: string }> = [
  { key: "1d", label: "1 d/s" },
  { key: "7d", label: "7 d/s" },
  { key: "30d", label: "30 d/s" },
  { key: "6mo", label: "6 mo/s" },
  { key: "1y", label: "1 yr/s" },
];

const LAUNCH_SPEEDS: LaunchSpeed[] = [
  "slow",
  "normal",
  "fast",
  "extreme",
  "near-light",
];

const SCENES: Array<{ key: SandboxScenePreset; label: string }> = [
  { key: "inner-solar", label: "Inner Solar" },
  { key: "sun-earth", label: "Sun + Earth" },
  { key: "empty", label: "Just Sun" },
  { key: "binary", label: "Binary" },
];

const PROJECTILE_GLYPH: Record<ProjectileKind, string> = {
  comet: "☄",
  earth: "🌍",
  jupiter: "🪐",
  "brown-dwarf": "●",
  "white-dwarf": "◉",
  "neutron-star": "✦",
  "black-hole": "⬤",
};

const DEFAULT_STATE: SandboxState = {
  bodyCount: 0,
  selectedKind: "comet",
  launchSpeed: "normal",
  simSpeed: "30d",
  scenePreset: "inner-solar",
  paused: false,
  fps: 60,
};

export function Sandbox({ onExit: _onExit }: Props) {
  // Route back to `#universe` instead of the parent-provided exit so
  // users always have a clear front-door to return to. Kept in the
  // signature for ABI compatibility with App.tsx.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SandboxScene | null>(null);
  const [state, setState] = useState<SandboxState>(DEFAULT_STATE);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  useTutorialAutoOpen(setTutorialOpen);
  const openCopilot = useCopilotStore((s) => s.setOpen);
  const [sceneAlive, setSceneAlive] = useState(false);
  const loadProgress = useFakeProgress(sceneAlive);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new SandboxScene(canvas);
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
  }, []);

  const projectileLabel = PROJECTILES[state.selectedKind]?.label ?? "";

  return (
    <div className="relative h-full w-full bg-[#020415]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
      />

      <LoadingSkeleton progress={loadProgress} />

      {/* Panel-scope boundary: a chrome crash here mustn't blow up the
          canvas. Matches Galactic.tsx pattern. */}
      <ErrorBoundary scope="panel" label="Sandbox chrome">

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("universe")}
              className="min-h-[44px] rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 uppercase tracking-widest text-white/80 backdrop-blur hover:bg-white/10 hover:text-white"
            >
              ← universe
            </Button>
            <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-orange-200/80 backdrop-blur">
              🪐 gravity sandbox
            </div>
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

          <ProjectilePicker
            selected={state.selectedKind}
            onPick={(k) => sceneRef.current?.setSelectedKind(k)}
          />

          <SpeedRow
            label="Launch speed"
            options={LAUNCH_SPEEDS}
            value={state.launchSpeed}
            getLabel={(k) => LAUNCH_SPEED_LABEL[k]}
            onChange={(k) => sceneRef.current?.setLaunchSpeed(k)}
          />

          <SpeedRow
            label="Sim speed"
            options={SIM_SPEEDS.map((s) => s.key)}
            value={state.simSpeed}
            getLabel={(k) => SIM_SPEEDS.find((s) => s.key === k)?.label ?? k}
            onChange={(k) => sceneRef.current?.setSimSpeed(k)}
          />
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              scene
            </span>
            {SCENES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => sceneRef.current?.setScenePreset(s.key)}
                className={
                  "rounded-md border px-2 py-1 font-mono text-[11px] transition " +
                  (state.scenePreset === s.key
                    ? "border-orange-300/60 bg-orange-300/15 text-orange-100"
                    : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-orange-200")
                }
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => sceneRef.current?.togglePaused()}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {state.paused ? "▶ play" : "⏸ pause"}
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.reset()}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              ⟳ reset
            </button>
          </div>
          <div className="rounded-md border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/50 backdrop-blur">
            {state.bodyCount} bodies · {state.fps} fps
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
        <div className="rounded-md border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 backdrop-blur">
          drag to orbit · wheel to zoom · right-click (or shift-click) to launch{" "}
          {projectileLabel} · space to pause · r to reset
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
          mode="sandbox"
          onShowTutorial={() => setTutorialOpen(true)}
        />
      </div>
    </div>
  );
}

function ProjectilePicker({
  selected,
  onPick,
}: {
  selected: ProjectileKind;
  onPick: (k: ProjectileKind) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-space-950/70 p-1.5 backdrop-blur">
      {PROJECTILE_ORDER.map((k) => {
        const preset = PROJECTILES[k];
        const isSelected = selected === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            title={`${preset.label} · ${preset.mass.toExponential(1)} M⊕`}
            className={
              "flex h-9 w-9 items-center justify-center rounded-md font-mono text-base transition " +
              (isSelected
                ? "border border-orange-300/60 bg-orange-300/15 text-orange-100"
                : "border border-white/5 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-orange-200")
            }
          >
            {PROJECTILE_GLYPH[k]}
          </button>
        );
      })}
    </div>
  );
}

function SpeedRow<T extends string>({
  label,
  options,
  value,
  getLabel,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  getLabel: (k: T) => string;
  onChange: (k: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={
            "rounded-md border px-2 py-1 font-mono text-[11px] transition " +
            (value === opt
              ? "border-orange-300/60 bg-orange-300/15 text-orange-100"
              : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-orange-200")
          }
        >
          {getLabel(opt)}
        </button>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useT } from "../../i18n/hooks";

/**
 * 🪐 LoadingSkeleton — full-screen overlay shown during initial scene
 * boot. Fades out once the scene is interactive.
 *
 * Five staged checkpoints with active-glow / dimmed-on-complete styling.
 * Each scene mode wires up whichever progress signals it has access to:
 *
 *   • Viewer.tsx (sky atlas) — feeds `baseTilesLoaded / baseTilesTotal`
 *     from ViewerScene plus `starCount` / `dsoCount` from the bright-
 *     star + OpenNGC fetches.
 *   • Universe.tsx + SolarFlight.tsx — only have the "scene mounted"
 *     signal, so they advance stages on a short timer so the skeleton
 *     still feels alive (rather than skipping straight to "Ready").
 *
 * If anything stalls > 5 s, a "Continue with partial data →" CTA fades
 * in so the user can dismiss and keep going on a flaky connection.
 *
 * The skeleton is intentionally framework-light — no zustand, no extra
 * scene-state — just props in, callback out.
 */

export type LoadingProgress = {
  /** HiPS base tiles loaded so far (0..total). */
  baseTilesLoaded: number;
  /** Expected HiPS base tiles (12 for HEALPix N0). */
  baseTilesTotal: number;
  /** Bright-star catalog size, 0 until fetch completes. */
  starCount: number;
  /** Deep-sky object count, 0 until fetch completes. */
  dsoCount: number;
  /** True once the scene is interactive — the skeleton can fade out. */
  ready: boolean;
};

type Stage = {
  label: string;
  done: boolean;
};

type Props = {
  progress: LoadingProgress;
  /** Optional manual-dismiss callback fired by the "continue anyway" CTA. */
  onDismiss?: () => void;
};

const SLOW_THRESHOLD_MS = 5_000;
const FADE_OUT_MS = 600;

export function LoadingSkeleton({ progress, onDismiss }: Props) {
  const t = useT();
  // Track whether we've passed the "this is taking too long" threshold so
  // the CTA can fade in. Reset on mount; we don't want it from a prior view.
  const [slow, setSlow] = useState(false);
  // Once `ready` flips true (or the user dismisses manually) we keep the
  // component mounted for a short duration so the fade-out transition
  // has time to play. After that we unmount ourselves.
  const [exiting, setExiting] = useState(false);
  const [unmount, setUnmount] = useState(false);
  /** User clicked the "continue anyway" CTA — force-exits regardless of
   *  whether the scene reports ready. */
  const [forceDismissed, setForceDismissed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!(progress.ready || forceDismissed) || exiting) return;
    setExiting(true);
    const t = window.setTimeout(() => setUnmount(true), FADE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [progress.ready, forceDismissed, exiting]);

  if (unmount) return null;

  const tilesDone =
    progress.baseTilesTotal > 0 &&
    progress.baseTilesLoaded >= progress.baseTilesTotal;
  // Stage 1 ("connecting") is marked done as soon as the *first* tile lands.
  const connected = progress.baseTilesLoaded > 0 || tilesDone;
  const starsDone = progress.starCount > 0;
  const dsoDone = progress.dsoCount > 0;
  // Stage 4 ("calibrating ephemerides") doesn't have its own signal — we
  // treat it as done once tiles + stars + DSO have all landed, since the
  // AstronomyEngine module is statically imported by the scene and thus
  // ready by then.
  const calibrationDone = tilesDone && starsDone && dsoDone;
  const allDone = calibrationDone || progress.ready;

  const stages: ReadonlyArray<Stage> = [
    {
      label: connected
        ? "Connected to CDS Strasbourg."
        : "Connecting to CDS Strasbourg…",
      done: connected && tilesDone,
    },
    {
      label: starsDone
        ? `Loaded ${progress.starCount.toLocaleString()} bright stars.`
        : "Loading 8,921 bright stars…",
      done: starsDone,
    },
    {
      label: dsoDone
        ? `Loaded ${progress.dsoCount.toLocaleString()} deep-sky objects.`
        : "Loading 879 deep-sky objects…",
      done: dsoDone,
    },
    {
      label: calibrationDone
        ? "Ephemerides calibrated."
        : "Calibrating ephemerides…",
      done: calibrationDone,
    },
    {
      label: allDone ? "Ready." : "Almost there…",
      done: allDone,
    },
  ];

  // First not-yet-done stage glows; subsequent ones are dimmed pending;
  // completed ones are dim-and-checked.
  const firstPending = stages.findIndex((s) => !s.done);
  const tilePct =
    progress.baseTilesTotal > 0
      ? Math.min(1, progress.baseTilesLoaded / progress.baseTilesTotal)
      : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading the scene"
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-space-950/90 px-6 backdrop-blur transition-opacity duration-500 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-5 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
        the unspeakable world
      </div>
      <div className="mb-6 font-display text-2xl text-white/90">
        {t("loading.title")}
      </div>

      <ol className="flex w-full max-w-sm flex-col gap-2">
        {stages.map((stage, idx) => {
          const isActive = idx === firstPending;
          const isDone = stage.done;
          return (
            <li
              key={idx}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 font-mono text-[11px] transition ${
                isDone
                  ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200/70"
                  : isActive
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                    : "border-white/5 bg-white/[0.02] text-white/30"
              }`}
            >
              <span
                aria-hidden
                className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                  isDone
                    ? "bg-emerald-400/70"
                    : isActive
                      ? "animate-pulse bg-cyan-300"
                      : "bg-white/15"
                }`}
              />
              <span className="flex-1">{stage.label}</span>
              {isDone && (
                <span aria-hidden className="text-emerald-300/70">
                  ✓
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Base-tile mini progress bar — reflects HiPS tile fetch progress so
          a long initial connection feels animated even before the stars +
          DSO fetches kick off. */}
      <div className="mt-5 h-0.5 w-56 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-cyan-300/70 transition-all duration-300"
          style={{ width: `${(tilePct * 100).toFixed(1)}%` }}
        />
      </div>

      {/* Slow-connection escape hatch — only appears if we're still here
          after 5 s and the user is OK skipping ahead with whatever has
          loaded so far. */}
      {slow && !allDone && (
        <button
          type="button"
          onClick={() => {
            setForceDismissed(true);
            onDismiss?.();
          }}
          className="mt-6 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 backdrop-blur transition hover:bg-amber-400/20"
        >
          Slow connection? Continue with partial data →
        </button>
      )}
    </div>
  );
}

/**
 * 🌀 Inline panel skeleton — tiny spinner used as the Suspense fallback
 * while a lazy-loaded UI panel's JS chunk is in flight.
 *
 * Sized to match a closed-trigger button (the typical case: a popover
 * trigger that loads its body on first open) so the layout doesn't
 * shift when the real panel hydrates. When `inline` is false the
 * fallback fills its parent — useful for absolute-positioned panels.
 */
export function PanelSkeleton({ inline = true }: { inline?: boolean } = {}) {
  return (
    <div
      role="status"
      aria-label="Loading panel"
      className={
        inline
          ? "inline-flex items-center gap-2 rounded-lg border border-white/10 bg-space-950/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40 backdrop-blur"
          : "absolute inset-0 flex items-center justify-center bg-space-950/30 font-mono text-[10px] uppercase tracking-widest text-white/40 backdrop-blur"
      }
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-300/70"
      />
      <span>loading…</span>
    </div>
  );
}

/**
 * Helper for scenes that don't expose granular load progress (Universe,
 * SolarFlight). Returns a {@link LoadingProgress} that advances each
 * stage on a short staggered timer, then flips `ready` once the scene
 * reports a non-zero mount signal.
 *
 * `sceneAlive` should be `true` once the scene constructor has run + the
 * first state callback has fired. The hook gates the "ready" stage on
 * that so the skeleton doesn't pretend to be done before the canvas is
 * actually painting.
 */
export function useFakeProgress(sceneAlive: boolean): LoadingProgress {
  const [progress, setProgress] = useState<LoadingProgress>({
    baseTilesLoaded: 0,
    baseTilesTotal: 12,
    starCount: 0,
    dsoCount: 0,
    ready: false,
  });

  useEffect(() => {
    // Staggered advance — first tile after 400 ms, all tiles by ~1.2 s,
    // stars by ~1.6 s, DSO by ~2 s. These numbers are tuned to feel
    // active for typical (~2-3 s) scene mounts.
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        setProgress((p) => ({ ...p, baseTilesLoaded: 4 }));
      }, 400),
    );
    timers.push(
      window.setTimeout(() => {
        setProgress((p) => ({ ...p, baseTilesLoaded: 12 }));
      }, 1_200),
    );
    timers.push(
      window.setTimeout(() => {
        setProgress((p) => ({ ...p, starCount: 8_921 }));
      }, 1_600),
    );
    timers.push(
      window.setTimeout(() => {
        setProgress((p) => ({ ...p, dsoCount: 879 }));
      }, 2_000),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!sceneAlive) return;
    // Hold "ready" until our minimum visible duration has elapsed so the
    // skeleton doesn't flash off before the user can read it.
    const t = window.setTimeout(() => {
      setProgress((p) => ({ ...p, ready: true }));
    }, 2_400);
    return () => window.clearTimeout(t);
  }, [sceneAlive]);

  return progress;
}

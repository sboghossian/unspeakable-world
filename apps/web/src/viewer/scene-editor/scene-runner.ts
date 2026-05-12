/**
 * Drives playback of a {@link SavedScene}: lerps the active keyframe's
 * camera state per rAF tick and fires `onTick` with the interpolated
 * blob + a small {@link RunnerState} progress descriptor.
 *
 * Interpolation rules:
 *   - Numeric fields → linear lerp.
 *   - Date / ISO-string time fields (`simTime`, `time`) → lerp by ms,
 *     emit ISO string again.
 *   - Plain object fields whose children are all numeric → recurse
 *     (so `{ x, y, z }` position vectors interpolate component-wise).
 *   - Everything else (booleans, strings — e.g. `focus`, `trackingTarget`,
 *     `overlayId`) → step-change at the START of the transition, since the
 *     underlying scenes don't support smooth blending of those fields.
 *
 * After arriving at a keyframe the runner freezes on it for
 * `holdMs` before advancing. End-of-scene either loops (default) or
 * stops, controlled by the scene's `loop` flag.
 */
import { clampTimings, type SavedScene } from "../../lib/scene-editor";

export type RunnerState = {
  playing: boolean;
  paused: boolean;
  /** Index of the keyframe we're currently transitioning INTO or holding ON. */
  stepIdx: number;
  /** 0..1 within current step (transition + hold combined). */
  progress: number;
  /** Sub-phase: are we tweening into the keyframe or holding on it? */
  phase: "transition" | "hold" | "stopped";
};

export type RunnerTick = (
  camera: Record<string, unknown>,
  state: RunnerState,
) => void;

type Phase =
  | { kind: "transition"; startMs: number; durationMs: number }
  | { kind: "hold"; startMs: number; durationMs: number };

const STOPPED: RunnerState = {
  playing: false,
  paused: false,
  stepIdx: 0,
  progress: 0,
  phase: "stopped",
};

export class SceneRunner {
  private scene: SavedScene | null = null;
  private onTick: RunnerTick | null = null;
  private rafHandle = 0;
  private stepIdx = 0;
  private phase: Phase | null = null;
  private pausedAtMs: number | null = null;
  /** Cached "from" camera used by the active transition. Captured at the
   *  moment we begin a transition so the lerp is deterministic even if
   *  the caller mutates the previous keyframe. */
  private fromCamera: Record<string, unknown> | null = null;
  private internalState: RunnerState = { ...STOPPED };

  start(scene: SavedScene, onTick: RunnerTick): void {
    this.stop();
    if (scene.keyframes.length === 0) return;
    this.scene = scene;
    this.onTick = onTick;
    this.stepIdx = 0;
    this.fromCamera = null;
    this.beginStep(0, performance.now());
    this.internalState = {
      playing: true,
      paused: false,
      stepIdx: 0,
      progress: 0,
      phase: this.phase?.kind === "hold" ? "hold" : "transition",
    };
    this.loop();
  }

  pause(): void {
    if (!this.scene || this.internalState.paused) return;
    this.internalState = { ...this.internalState, paused: true, playing: false };
    this.pausedAtMs = performance.now();
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
  }

  resume(): void {
    if (!this.scene || !this.internalState.paused) return;
    // Shift the active phase's startMs forward by the pause duration so
    // playback resumes exactly where it left off.
    if (this.phase && this.pausedAtMs !== null) {
      const shift = performance.now() - this.pausedAtMs;
      this.phase = { ...this.phase, startMs: this.phase.startMs + shift };
    }
    this.pausedAtMs = null;
    this.internalState = { ...this.internalState, paused: false, playing: true };
    this.loop();
  }

  stop(): void {
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = 0;
    this.scene = null;
    this.onTick = null;
    this.phase = null;
    this.pausedAtMs = null;
    this.fromCamera = null;
    this.stepIdx = 0;
    this.internalState = { ...STOPPED };
  }

  state(): RunnerState {
    return this.internalState;
  }

  private beginStep(idx: number, now: number): void {
    if (!this.scene) return;
    const kf = this.scene.keyframes[idx];
    if (!kf) return;
    const clamped = clampTimings(kf);
    // Capture a snapshot of the "from" camera for the transition. The
    // first keyframe has no prior state, so it snaps with a 0ms tween.
    if (idx === 0) {
      this.fromCamera = { ...clamped.camera };
      // Skip the transition phase on the very first keyframe.
      this.phase = { kind: "hold", startMs: now, durationMs: Math.max(clamped.holdMs, 200) };
      return;
    }
    const prev = this.scene.keyframes[idx - 1];
    this.fromCamera = prev ? { ...prev.camera } : { ...clamped.camera };
    if (clamped.transitionMs <= 0) {
      this.phase = { kind: "hold", startMs: now, durationMs: Math.max(clamped.holdMs, 200) };
    } else {
      this.phase = { kind: "transition", startMs: now, durationMs: clamped.transitionMs };
    }
  }

  private loop = (): void => {
    if (!this.scene || !this.onTick || !this.phase) return;
    const now = performance.now();
    const kf = this.scene.keyframes[this.stepIdx];
    if (!kf) {
      this.stop();
      return;
    }
    const clamped = clampTimings(kf);
    const elapsed = now - this.phase.startMs;
    const durationMs = Math.max(1, this.phase.durationMs);
    const localProgress = Math.min(1, Math.max(0, elapsed / durationMs));

    let camera: Record<string, unknown>;
    if (this.phase.kind === "transition") {
      const eased = easeInOutCubic(localProgress);
      camera = lerpCamera(this.fromCamera ?? clamped.camera, clamped.camera, eased);
    } else {
      // Hold phase — the target camera is the keyframe's own state.
      camera = { ...clamped.camera };
    }

    // Compute combined progress 0..1 spanning transition + hold for HUD.
    const totalMs = Math.max(1, clamped.transitionMs + clamped.holdMs);
    const stepElapsedMs =
      this.phase.kind === "transition"
        ? elapsed
        : clamped.transitionMs + elapsed;
    const combinedProgress = Math.min(1, Math.max(0, stepElapsedMs / totalMs));

    this.internalState = {
      playing: true,
      paused: false,
      stepIdx: this.stepIdx,
      progress: combinedProgress,
      phase: this.phase.kind === "transition" ? "transition" : "hold",
    };

    this.onTick(camera, this.internalState);

    // Phase done? Advance or loop.
    if (elapsed >= durationMs) {
      if (this.phase.kind === "transition") {
        // Transition complete → enter hold.
        this.phase = {
          kind: "hold",
          startMs: now,
          durationMs: Math.max(clamped.holdMs, 200),
        };
      } else {
        // Hold complete → advance to next keyframe (or loop).
        const nextIdx = this.stepIdx + 1;
        if (nextIdx >= this.scene.keyframes.length) {
          if (this.scene.loop !== false) {
            this.stepIdx = 0;
            this.beginStep(0, now);
          } else {
            // Stop on last keyframe — final tick already fired.
            this.internalState = {
              playing: false,
              paused: false,
              stepIdx: this.stepIdx,
              progress: 1,
              phase: "stopped",
            };
            this.onTick(camera, this.internalState);
            this.stop();
            return;
          }
        } else {
          this.stepIdx = nextIdx;
          this.beginStep(nextIdx, now);
        }
      }
    }

    this.rafHandle = requestAnimationFrame(this.loop);
  };
}

/** Cubic ease-in-out — gives the camera that cinematic settle. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Recursively lerp two camera blobs. See file header for rules. */
export function lerpCamera(
  from: Record<string, unknown>,
  to: Record<string, unknown>,
  t: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  for (const k of keys) {
    const a = from[k];
    const b = to[k];
    // Step-change targets: prefer `to` once we're past the transition
    // midpoint, otherwise keep `from` — avoids strobing focus mid-tween.
    if (a === undefined) {
      out[k] = b;
      continue;
    }
    if (b === undefined) {
      out[k] = a;
      continue;
    }
    if (typeof a === "number" && typeof b === "number") {
      out[k] = a + (b - a) * t;
      continue;
    }
    if (isIsoDate(a) && isIsoDate(b)) {
      const ta = new Date(a).getTime();
      const tb = new Date(b).getTime();
      const lerped = ta + (tb - ta) * t;
      out[k] = new Date(lerped).toISOString();
      continue;
    }
    if (isNumericObject(a) && isNumericObject(b)) {
      out[k] = lerpCamera(
        a as Record<string, unknown>,
        b as Record<string, unknown>,
        t,
      );
      continue;
    }
    // Non-numeric (boolean, string, null) — step-change at midpoint so
    // the tween at least feels intentional rather than strobing.
    out[k] = t < 0.5 ? a : b;
  }
  return out;
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  // Cheap heuristic — full ISO-8601 with a 'T'.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) return false;
  return !Number.isNaN(new Date(v).getTime());
}

function isNumericObject(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  const vals = Object.values(obj);
  if (vals.length === 0) return false;
  return vals.every((x) => typeof x === "number");
}

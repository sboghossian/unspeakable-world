/**
 * 🎬 Tour v2 runner — orchestrates Grand Tour v2 inside Universe Mode.
 *
 * Responsibilities:
 *   • Move the camera per step (`scene.flyTo` for named/preset targets,
 *     `scene.setCameraLogical` for raw frame positions).
 *   • Toggle federated extra-layers via the existing zustand store
 *     (`useExtraLayersStore`). The scene's `ExtrasController` already
 *     subscribes — toggles propagate without any extra wiring.
 *   • Auto-advance after each step's `duration_ms`, or wait for manual
 *     next/prev clicks.
 *   • Restore layer state on exit so the tour leaves no residue.
 *
 * Intentionally framework-agnostic: holds no React state. The TourCard
 * subscribes via the tiny `subscribe()` listener pattern so we can drive
 * this from anywhere (Universe.tsx, future LessonRunner reuse, etc.).
 */
import type { UniverseScene } from "../universe/universe-scene";
import { useExtraLayersStore } from "../extra-layers/state";
import {
  GRAND_TOUR_V2,
  WAVELENGTH_OVERLAY,
  type TourStepV2,
  type TourTargetV2,
} from "./tour-v2";

export type TourRunnerState = {
  /** Current step index, or null when the tour is not active. */
  readonly index: number | null;
  /** Total number of steps (constant — exposed for the card). */
  readonly total: number;
  /** Snapshot of the active step, or null when inactive. */
  readonly step: TourStepV2 | null;
};

type RunnerListener = (s: TourRunnerState) => void;

/**
 * Toggle layers via the zustand store. We snapshot the prior `enabled`
 * value the first time we touch each id so `restore()` can put it back.
 */
class LayerSnapshot {
  private readonly prior = new Map<string, boolean>();

  setEnabled(id: string, on: boolean): void {
    const store = useExtraLayersStore.getState();
    const before = store.enabled[id] === true;
    if (!this.prior.has(id)) this.prior.set(id, before);
    if (before !== on) store.set(id, on);
  }

  restore(): void {
    const store = useExtraLayersStore.getState();
    for (const [id, was] of this.prior) {
      const now = store.enabled[id] === true;
      if (now !== was) store.set(id, was);
    }
    this.prior.clear();
  }
}

export class TourRunnerV2 {
  private readonly scene: UniverseScene;
  private readonly steps: readonly TourStepV2[];
  private index: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly layers = new LayerSnapshot();
  private readonly listeners = new Set<RunnerListener>();
  /** Remember the HiPS overlay we found on start so we can put it back. */
  private priorOverlay: { id: string | null; mix: number } | null = null;

  constructor(scene: UniverseScene, steps: readonly TourStepV2[] = GRAND_TOUR_V2) {
    this.scene = scene;
    this.steps = steps;
  }

  get total(): number {
    return this.steps.length;
  }

  subscribe(listener: RunnerListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Start the tour at index 0 (or `from` if given). Safe to re-call. */
  start(from = 0): void {
    if (this.index === null) {
      // Snapshot the current overlay so exit() can restore it. The
      // scene publishes the current state synchronously to a fresh
      // subscriber — we use that one-shot to grab the values.
      const unsub = this.scene.subscribe((s) => {
        this.priorOverlay = { id: s.overlayId, mix: s.overlayMix };
      });
      unsub();
    }
    this.go(Math.max(0, Math.min(this.steps.length - 1, from)));
  }

  next(): void {
    if (this.index === null) return;
    const n = this.index + 1;
    if (n >= this.steps.length) {
      this.exit();
      return;
    }
    this.go(n);
  }

  prev(): void {
    if (this.index === null || this.index === 0) return;
    this.go(this.index - 1);
  }

  /** Jump to an arbitrary step (used by the timeline dots). */
  jump(to: number): void {
    if (to < 0 || to >= this.steps.length) return;
    if (this.index === null) {
      this.start(to);
      return;
    }
    this.go(to);
  }

  /** Tear down: clear timer, restore layers + overlay, fire listeners. */
  exit(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.layers.restore();
    if (this.priorOverlay) {
      this.scene.setOverlay(this.priorOverlay.id);
      this.scene.setOverlayMix(this.priorOverlay.mix);
      this.priorOverlay = null;
    }
    this.index = null;
    this.publish();
  }

  /** Read-only snapshot — also fed to listeners on each transition. */
  snapshot(): TourRunnerState {
    const idx = this.index;
    const step = idx === null ? null : this.steps[idx] ?? null;
    return { index: idx, total: this.steps.length, step };
  }

  // — internals —

  private go(to: number): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.index = to;
    const step = this.steps[to];
    if (!step) {
      this.exit();
      return;
    }
    this.applyTarget(step.target);
    this.applyLayers(step);
    this.applyOverlay(step);
    this.publish();
    if (step.duration_ms > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.next();
      }, step.duration_ms);
    }
  }

  private applyTarget(t: TourTargetV2): void {
    if (t.kind === "preset" || t.kind === "named") {
      // Both go through scene.flyTo — preset/named distinction is only
      // for documentation today. If a named target isn't resolvable, the
      // scene falls back to its default branch (Sun).
      this.scene.flyTo(t.kind === "named" && t.fallback ? t.name : t.name);
      return;
    }
    // logicalPos: raw camera placement in the active logical frame. We
    // re-use setCameraLogical (which already finite-checks every arg).
    const yaw = t.yaw ?? Math.PI;
    const pitch = t.pitch ?? -0.55;
    this.scene.setCameraLogical(t.x, t.y, t.z, yaw, pitch);
  }

  private applyLayers(step: TourStepV2): void {
    for (const id of step.disable_layers ?? []) this.layers.setEnabled(id, false);
    for (const id of step.enable_layers ?? []) this.layers.setEnabled(id, true);
  }

  private applyOverlay(step: TourStepV2): void {
    if (!step.wavelengthHint) return;
    const cfg = WAVELENGTH_OVERLAY[step.wavelengthHint];
    this.scene.setOverlay(cfg.survey);
    if (cfg.survey) this.scene.setOverlayMix(cfg.mix);
  }

  private publish(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }
}

/**
 * Universe Mode v2 — adaptive WASD + mouse-drag + wheel controller.
 *
 * One `Vector3 logicalPos` tracks the camera's "true" position in galactic
 * units (LY from galactic centre). The universe scene's per-tick rendering
 * code drives both frames off this single vector.
 *
 * Adaptive speed: WASD moves at `speedFactor * distanceFromSun`, clamped
 * so we can still drift near a planet and still cross the cosmic web in
 * reasonable time. The wheel multiplies `speedFactor` logarithmically.
 *
 * Mouse drag changes yaw + pitch only — no roll. The camera always sits at
 * world (0,0,0) so the scene's frames re-anchor around it.
 *
 * Hotkeys are surfaced as callbacks rather than executed inline so the
 * caller (UniverseScene) can route them through its existing `flyTo`
 * tween + focus-mode UI.
 */

import { Vector3 } from "three";
import { SUN_LY, adaptiveSpeedLY } from "./tiers";

export type ControlsCallbacks = {
  /** Fired when the user presses a digit 1-8 (planet jumps). */
  onPlanetJump?: (index1to8: number) => void;
  /** Fired on `B` — jump to galactic centre. */
  onGalacticCenter?: () => void;
  /** Fired on `N` — jump to nearest galaxy (M31). */
  onNearestGalaxy?: () => void;
  /** Fired on backtick — home / inner solar system. */
  onHome?: () => void;
  /** Fired on `F` — toggle focus mode (hide UI). */
  onFocusToggle?: () => void;
  /** Fired whenever the user does anything (used for idle/standby timers). */
  onInteraction?: () => void;
};

type Vec3Like = { x: number; y: number; z: number };

export class UniverseControlsV2 {
  /** Camera's "true" position in galactic-frame LY units. */
  readonly logicalPos = new Vector3(SUN_LY.x, 0, SUN_LY.z);
  /** Yaw in radians (rotation around world-up Y). */
  yaw = 0;
  /** Pitch in radians, clamped to ±π/2 to avoid gimbal flip. */
  pitch = 0;
  /**
   * Manual speed-factor override. WASD step = factor * dist from Sun
   * (with sane clamps). Mouse wheel adjusts this logarithmically.
   */
  speedFactor = 0.05;

  private heldKeys = new Set<string>();
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private dragStart = { x: 0, y: 0 };
  private dragMaxDist = 0;

  private canvas: HTMLCanvasElement;
  private cb: ControlsCallbacks;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: ControlsCallbacks = {}) {
    this.canvas = canvas;
    this.cb = callbacks;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  /** Set the camera's logical position + orientation in one call. */
  setLogical(pos: Vec3Like, yaw: number, pitch: number): void {
    this.logicalPos.set(pos.x, pos.y, pos.z);
    if (Number.isFinite(yaw)) this.yaw = yaw;
    if (Number.isFinite(pitch)) {
      this.pitch = clampPitch(pitch);
    }
  }

  /** True if the user is currently mid-drag (caller pauses inertia). */
  isDragging(): boolean {
    return this.dragging;
  }

  /** True if the last pointer-up was a click (not a drag). */
  wasClickRelease(): boolean {
    return this.dragMaxDist < 4;
  }

  /** Distance from the Sun in LY — for adaptive speed + tier picking. */
  distanceFromSunLY(): number {
    return this.logicalPos.distanceTo(
      new Vector3(SUN_LY.x, SUN_LY.y, SUN_LY.z),
    );
  }

  /** Forward unit vector derived from yaw + pitch. */
  forwardVec(): Vector3 {
    return new Vector3(
      Math.cos(this.pitch) * Math.sin(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.cos(this.yaw),
    );
  }

  /** Right unit vector (orthogonal to forward in the horizontal plane). */
  rightVec(forward: Vector3): Vector3 {
    return new Vector3(forward.z, 0, -forward.x).normalize();
  }

  /**
   * Step the camera by elapsed `dt` seconds. Caller invokes this every
   * tick (the controller doesn't own its own rAF loop).
   */
  step(dt: number): void {
    if (this.heldKeys.size === 0) return;
    const fwd = this.forwardVec();
    const right = this.rightVec(fwd);
    const dist = this.distanceFromSunLY();
    const baseSpeed = adaptiveSpeedLY(dist, this.speedFactor);
    const boost = this.heldKeys.has("shift") ? 8 : 1;
    const stepLY = baseSpeed * boost * dt;

    if (this.heldKeys.has("w")) this.logicalPos.addScaledVector(fwd, stepLY);
    if (this.heldKeys.has("s")) this.logicalPos.addScaledVector(fwd, -stepLY);
    if (this.heldKeys.has("a")) this.logicalPos.addScaledVector(right, -stepLY);
    if (this.heldKeys.has("d")) this.logicalPos.addScaledVector(right, stepLY);
    if (this.heldKeys.has("q")) this.logicalPos.y -= stepLY;
    if (this.heldKeys.has("e")) this.logicalPos.y += stepLY;
    this.cb.onInteraction?.();
  }

  /** Current effective WASD speed (LY/sec) at this distance. */
  effectiveSpeedLY(): number {
    return adaptiveSpeedLY(this.distanceFromSunLY(), this.speedFactor);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.heldKeys.clear();
  }

  // ─── Input handlers ──────────────────────────────────────────────

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragMaxDist = 0;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.style.cursor = "grabbing";
    this.cb.onInteraction?.();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const total = Math.hypot(
      e.clientX - this.dragStart.x,
      e.clientY - this.dragStart.y,
    );
    if (total > this.dragMaxDist) this.dragMaxDist = total;
    this.yaw -= dx * 0.005;
    this.pitch = clampPitch(this.pitch - dy * 0.005);
    this.cb.onInteraction?.();
  };

  private onPointerUp = (e: PointerEvent) => {
    this.dragging = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.canvas.style.cursor = "grab";
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Logarithmic speed-factor adjust — same notch feels right at every zoom.
    const factor = Math.exp(-e.deltaY * 0.0008);
    this.speedFactor = Math.max(
      1e-4,
      Math.min(100, this.speedFactor * factor),
    );
    this.cb.onInteraction?.();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
    this.heldKeys.add(e.key.toLowerCase());
    if (e.shiftKey) this.heldKeys.add("shift");
    this.cb.onInteraction?.();

    if (e.key === "`") {
      this.cb.onHome?.();
      return;
    }
    if (e.key === "b" || e.key === "B") {
      this.cb.onGalacticCenter?.();
      return;
    }
    if (e.key === "n" || e.key === "N") {
      this.cb.onNearestGalaxy?.();
      return;
    }
    if (e.key === "f" || e.key === "F") {
      this.cb.onFocusToggle?.();
      return;
    }
    const n = parseInt(e.key, 10);
    if (!isNaN(n) && n >= 1 && n <= 8) {
      this.cb.onPlanetJump?.(n);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.key.toLowerCase());
    if (!e.shiftKey) this.heldKeys.delete("shift");
  };
}

function clampPitch(p: number): number {
  const limit = Math.PI / 2 - 0.05;
  if (p > limit) return limit;
  if (p < -limit) return -limit;
  return p;
}

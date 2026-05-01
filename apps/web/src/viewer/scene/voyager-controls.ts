import { MathUtils, PerspectiveCamera, Vector2, Vector3 } from "three";

/**
 * Voyager camera, Day 3 cut.
 *
 * Camera sits at origin (we're inside the celestial sphere looking outward).
 * - One-finger drag / left-click drag → yaw + pitch
 * - Two-finger pinch → zoom FOV (logarithmic)
 * - Wheel → zoom FOV (logarithmic)
 * - Damped inertia after release
 * - `setForward(dir)` for tap-to-fly programmatic camera moves
 *
 * Day 3+ TODO: tilt-to-look on mobile (DeviceOrientation), velocity tap-fly.
 */

const MIN_FOV = 6;
const MAX_FOV = 100;
const ROT_SPEED = 0.0035;
const ZOOM_SPEED = 0.06;
const INERTIA_DAMPING = 0.92;
const INERTIA_THRESHOLD = 0.00005;
const PINCH_STEP = 0.3;

export class VoyagerControls {
  yaw = 0;
  pitch = 0;
  fov = 60;
  drifting = false;

  /** Called when the camera state changes (drag, wheel, pinch, programmatic). */
  onChange: (() => void) | null = null;

  private active = true;
  private dragging = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private last = new Vector2();
  private velYaw = 0;
  private velPitch = 0;
  private lastPinchDist = 0;

  constructor(
    readonly camera: PerspectiveCamera,
    readonly element: HTMLElement,
  ) {
    this.bind();
    this.applyToCamera();
  }

  setForward(dir: Vector3): void {
    // Convert the unit forward vector to YXZ Euler so we keep our (yaw, pitch).
    // forward = (sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch))   [YXZ, no roll]
    const v = dir.clone().normalize();
    this.pitch = Math.asin(MathUtils.clamp(v.y, -1, 1));
    this.yaw = Math.atan2(v.x, -v.z);
    this.velYaw = 0;
    this.velPitch = 0;
    this.applyToCamera();
    this.onChange?.();
  }

  /** Called once per frame by the scene. Drives inertial drift. */
  tickInertia(): void {
    if (!this.active) return;
    if (this.dragging) {
      this.drifting = false;
      return;
    }
    if (
      Math.abs(this.velYaw) < INERTIA_THRESHOLD &&
      Math.abs(this.velPitch) < INERTIA_THRESHOLD
    ) {
      this.drifting = false;
      return;
    }
    this.drifting = true;
    this.yaw += this.velYaw;
    this.pitch += this.velPitch;
    this.pitch = MathUtils.clamp(
      this.pitch,
      -Math.PI / 2 + 0.01,
      Math.PI / 2 - 0.01,
    );
    this.velYaw *= INERTIA_DAMPING;
    this.velPitch *= INERTIA_DAMPING;
    this.applyToCamera();
    this.onChange?.();
  }

  private bind(): void {
    this.element.addEventListener("pointerdown", this.onDown);
    this.element.addEventListener("pointermove", this.onMove);
    this.element.addEventListener("pointerup", this.onUp);
    this.element.addEventListener("pointercancel", this.onUp);
    this.element.addEventListener("pointerleave", this.onUp);
    this.element.addEventListener("wheel", this.onWheel, { passive: false });
  }

  dispose(): void {
    this.active = false;
    this.element.removeEventListener("pointerdown", this.onDown);
    this.element.removeEventListener("pointermove", this.onMove);
    this.element.removeEventListener("pointerup", this.onUp);
    this.element.removeEventListener("pointercancel", this.onUp);
    this.element.removeEventListener("pointerleave", this.onUp);
    this.element.removeEventListener("wheel", this.onWheel);
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.active) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.element.setPointerCapture(e.pointerId);
    this.dragging = true;
    this.velYaw = 0;
    this.velPitch = 0;

    if (this.pointers.size === 1) {
      this.last.set(e.clientX, e.clientY);
    } else if (this.pointers.size === 2) {
      this.lastPinchDist = this.pinchDistance();
    }
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (this.pointers.size === 1) {
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.last.set(e.clientX, e.clientY);
      const k = ROT_SPEED * (this.fov / 60);
      const dyaw = -dx * k;
      const dpitch = -dy * k;
      this.yaw += dyaw;
      this.pitch += dpitch;
      this.pitch = MathUtils.clamp(
        this.pitch,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01,
      );
      // Track velocity for post-release inertia.
      this.velYaw = dyaw * 0.4;
      this.velPitch = dpitch * 0.4;
      this.applyToCamera();
      this.onChange?.();
    } else if (this.pointers.size === 2) {
      const d = this.pinchDistance();
      if (this.lastPinchDist > 0) {
        const ratio = d / this.lastPinchDist;
        // Pinch out (ratio > 1) zooms in (smaller FOV)
        this.fov = MathUtils.clamp(
          this.fov / Math.pow(ratio, PINCH_STEP * 4),
          MIN_FOV,
          MAX_FOV,
        );
        this.applyToCamera();
        this.onChange?.();
      }
      this.lastPinchDist = d;
    }
  };

  private onUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
    if (this.pointers.size === 0) {
      this.dragging = false;
    }
    this.lastPinchDist = 0;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    this.fov = MathUtils.clamp(
      this.fov * (1 + dir * ZOOM_SPEED),
      MIN_FOV,
      MAX_FOV,
    );
    this.applyToCamera();
    this.onChange?.();
  };

  private pinchDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    const a = pts[0]!;
    const b = pts[1]!;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private applyToCamera(): void {
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}

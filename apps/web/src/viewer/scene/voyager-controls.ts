import { MathUtils, PerspectiveCamera, Vector2 } from "three";

/**
 * Voyager camera, Day 2 cut.
 *
 * The camera sits at the origin (we are inside the celestial sphere, looking
 * outward). Drag rotates the look direction (yaw + pitch). Wheel/pinch zooms
 * the FOV (logarithmic) — that is the 6DOF-friendly alternative to dolly.
 *
 * Day 3 adds:
 * - touch pinch zoom + two-finger pan
 * - tap-to-fly with eased Catmull-Rom path
 * - log-scale chip readout
 * - inertial damping
 */

const MIN_FOV = 6;
const MAX_FOV = 100;
const ROT_SPEED = 0.0035;
const ZOOM_SPEED = 0.06;

export class VoyagerControls {
  /** Yaw around world Y (radians). */
  yaw = 0;
  /** Pitch around local X (radians). Clamped to ±89° to avoid gimbal flip. */
  pitch = 0;
  /** Field of view (degrees). */
  fov = 60;

  private dragging = false;
  private last = new Vector2();
  private active = true;

  constructor(
    readonly camera: PerspectiveCamera,
    readonly element: HTMLElement,
  ) {
    this.bind();
    this.applyToCamera();
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
    this.dragging = true;
    this.last.set(e.clientX, e.clientY);
    this.element.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.last.x;
    const dy = e.clientY - this.last.y;
    this.last.set(e.clientX, e.clientY);
    // Drag-rate scales with FOV — higher zoom = slower pixel movement
    const k = ROT_SPEED * (this.fov / 60);
    this.yaw -= dx * k;
    this.pitch -= dy * k;
    this.pitch = MathUtils.clamp(
      this.pitch,
      -Math.PI / 2 + 0.01,
      Math.PI / 2 - 0.01,
    );
    this.applyToCamera();
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    // Logarithmic FOV step
    this.fov = MathUtils.clamp(
      this.fov * (1 + dir * ZOOM_SPEED),
      MIN_FOV,
      MAX_FOV,
    );
    this.applyToCamera();
  };

  private applyToCamera(): void {
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    // Rotate the camera by yaw (world Y) then pitch (local X). Order matters:
    // we set Euler in YXZ order so yaw applies first, then pitch on the new
    // local X axis, then no roll.
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }
}

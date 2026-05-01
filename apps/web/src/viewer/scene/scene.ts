import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { SURVEYS } from "../hips/surveys";
import { HipsSphere } from "./hips-sphere";
import { VoyagerControls } from "./voyager-controls";

/**
 * Top-level Three.js scene for the viewer.
 *
 * Render-on-demand: we only run a frame when the camera changed since last
 * draw, or when a tile texture finished loading. Pauses entirely when the
 * tab is hidden. This is mandatory — continuous rAF on a Three.js scene
 * burns 10-25% mobile battery per 5 minutes (per our Day 0 research).
 */
export class ViewerScene {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene = new Scene();
  private sphere: HipsSphere;
  private controls: VoyagerControls;

  private dirty = true;
  private rafHandle = 0;
  private resizeObs: ResizeObserver | null = null;
  private disposed = false;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x03050a, 1);

    this.camera = new PerspectiveCamera(60, 1, 0.001, 100);
    this.camera.position.set(0, 0, 0);

    this.sphere = new HipsSphere(SURVEYS.dss2!);
    this.scene.add(this.sphere.group);

    this.controls = new VoyagerControls(this.camera, canvas);
    // Mark dirty whenever the user interacts with the controls.
    canvas.addEventListener("pointermove", this.markDirty);
    canvas.addEventListener("wheel", this.markDirty, { passive: true });
    canvas.addEventListener("pointerdown", this.markDirty);

    // Re-render when each base tile lands.
    for (const t of this.sphere.tiles) {
      t.ready.finally(() => this.markDirty());
    }

    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(canvas);
    this.handleResize();

    this.tick();
  }

  private markDirty = (): void => {
    this.dirty = true;
  };

  private tick = (): void => {
    if (this.disposed) return;
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private handleResize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.markDirty();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    this.resizeObs?.disconnect();
    this.controls.dispose();
    this.canvas.removeEventListener("pointermove", this.markDirty);
    this.canvas.removeEventListener("wheel", this.markDirty);
    this.canvas.removeEventListener("pointerdown", this.markDirty);
    this.sphere.dispose();
    this.renderer.dispose();
  }
}

import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import { rasterise } from "./light-pollution-data";

/**
 * Light-pollution glow shell. A thin sphere mesh rendered just outside
 * the Earth body, additively blended, with a procedurally generated
 * texture from the Globe at Night aggregated grid.
 *
 * Intended to sit at radius slightly > Earth body radius so it reads as
 * a glow layer rather than a coat of paint. The owning module is
 * responsible for placing this group at Earth's world position when
 * Earth is focused in solar mode.
 */

const TEX_W = 1024;
const TEX_H = 512;
/** Glow shell radius multiplier — Earth's body sits at 1.0. The host
 *  scene's planet body uses a unit sphere scaled by per-planet `size`;
 *  the caller sets this group's `scale` to that planet size. */
const SHELL_RADIUS = 1.012;

export class LightPollutionLayer {
  readonly group = new Group();
  private mesh: Mesh | null = null;
  private texture: CanvasTexture | null = null;
  private material: MeshBasicMaterial | null = null;

  constructor() {
    this.group.name = "LightPollutionGlow";
    this.group.visible = false;
    this.group.renderOrder = 4;
    this.build();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /** Set the shell's world position (typically Earth's body centre). */
  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  /** Match the underlying Earth body size. */
  setRadius(r: number): void {
    this.group.scale.set(r, r, r);
  }

  /** Optional time hook — slowly modulates the glow brightness to
   *  suggest the daily/seasonal seeing variation. */
  setTime(ms: number): void {
    if (!this.material) return;
    const phase = ((ms / (1000 * 60 * 60 * 24)) % 1 + 1) % 1;
    // 0.85–1.0 amplitude range across the day.
    this.material.opacity = 0.7 + 0.15 * Math.sin(phase * Math.PI * 2);
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.group.remove(this.mesh);
      this.mesh = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }

  private build(): void {
    const raster = rasterise(TEX_W, TEX_H);
    const canvas =
      typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!canvas) return; // SSR / Node — silently no-op.
    canvas.width = raster.width;
    canvas.height = raster.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(raster.width, raster.height);
    img.data.set(raster.data);
    ctx.putImageData(img, 0, 0);
    this.texture = new CanvasTexture(canvas);
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;

    this.material = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      opacity: 0.85,
    });
    const geom = new SphereGeometry(SHELL_RADIUS, 96, 48);
    this.mesh = new Mesh(geom, this.material);
    this.mesh.renderOrder = 4;
    this.group.add(this.mesh);
  }
}

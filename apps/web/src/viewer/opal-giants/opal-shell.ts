import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TextureLoader,
  type Texture,
} from "three";
import { log } from "../../lib/logger";
import { mapsForPlanet, type GiantTarget, type OpalMap } from "./opal-catalog";

/**
 * One textured cylindrical-projection sphere per OPAL year, swappable
 * by the host UI. Lives just outside the planet body so it reads as a
 * temporary cloud overlay rather than replacing the base planet skin.
 *
 * The shell defaults to invisible. The caller positions it via
 * `setPosition` and sizes it via `setRadius` (matching the host
 * scene's planet body radius).
 */

const SHELL_FACTOR = 1.001; // tiny offset so z-fighting doesn't flicker

export class OpalShell {
  readonly group = new Group();
  readonly target: GiantTarget;
  private mesh: Mesh | null = null;
  private material: MeshBasicMaterial | null = null;
  private texture: Texture | null = null;
  private currentYear: number | null = null;

  constructor(target: GiantTarget) {
    this.target = target;
    this.group.name = `OpalShell:${target}`;
    this.group.visible = false;
    this.group.renderOrder = 4;
    this.buildPlaceholder();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setRadius(r: number): void {
    this.group.scale.set(r * SHELL_FACTOR, r * SHELL_FACTOR, r * SHELL_FACTOR);
  }

  /** Swap the visible map to the closest available OPAL year ≤ given. */
  setYear(year: number): void {
    const list = mapsForPlanet(this.target);
    if (list.length === 0) return;
    const sorted = [...list].sort((a, b) => a.year - b.year);
    let pick: OpalMap | null = null;
    for (const m of sorted) {
      if (m.year <= year) pick = m;
    }
    if (!pick) pick = sorted[0] ?? null;
    if (!pick) return;
    if (this.currentYear === pick.year) return;
    this.currentYear = pick.year;
    this.loadTexture(pick.url);
  }

  year(): number | null {
    return this.currentYear;
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

  /** A neutral pale-amber/grey shell texture rendered procedurally so
   *  the layer is non-empty even when OPAL CDN URLs aren't reachable. */
  private buildPlaceholder(): void {
    const canvas =
      typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (!canvas) return;
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Banded gradient mimicking gas-giant zones/belts.
    for (let y = 0; y < canvas.height; y++) {
      const lat = (y / canvas.height) * 180 - 90;
      const band = 0.5 + 0.5 * Math.sin((lat / 10) * Math.PI);
      const r = Math.round(this.target === "jupiter" ? 235 - band * 60 : 230 - band * 30);
      const g = Math.round(this.target === "jupiter" ? 200 - band * 80 : 210 - band * 25);
      const b = Math.round(this.target === "jupiter" ? 160 - band * 90 : 170 - band * 30);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
      ctx.fillRect(0, y, canvas.width, 1);
    }
    this.texture = new CanvasTexture(canvas);
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.material = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const geom = new SphereGeometry(1, 96, 48);
    this.mesh = new Mesh(geom, this.material);
    this.mesh.renderOrder = 4;
    this.group.add(this.mesh);
  }

  private loadTexture(url: string): void {
    if (!this.material) return;
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        if (!this.material) {
          tex.dispose();
          return;
        }
        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        const old = this.texture;
        this.texture = tex;
        this.material.map = tex;
        this.material.needsUpdate = true;
        if (old) old.dispose();
      },
      undefined,
      (err) => {
        log.warn("[opal-giants]", "texture load failed", url, err);
        // Keep placeholder texture — never break the scene.
      },
    );
  }
}

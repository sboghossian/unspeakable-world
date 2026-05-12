import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Sprite,
  SpriteMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";
import {
  EXTENDED_SKY_CULTURES,
  type ExtendedSkyCulture,
  type ExtendedSkyCultureId,
} from "./cultures-data";

/**
 * Renderer for the extended sky cultures. Mirrors the structure of
 * `viewer/constellations/SkyCultureLines` so the layer reads as a
 * natural sibling of the existing module — same RA/Dec frame, same
 * tangent label sprites, same sphere radius.
 *
 * Only one culture is rendered at a time. `setCulture(null)` hides
 * the layer entirely.
 */

const RADIUS = 0.997;

export class ExtendedSkyCulturesRenderer {
  readonly group = new Group();
  private mesh: LineSegments | null = null;
  private material: LineBasicMaterial | null = null;
  private labels: Sprite[] = [];
  private starLabels: Sprite[] = [];
  private activeId: ExtendedSkyCultureId | null = null;
  private color: number;

  constructor(color = 0xa0ffe0) {
    this.color = color;
    this.group.name = "ExtendedSkyCultures";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 3;
    this.group.visible = false;
  }

  setCulture(id: ExtendedSkyCultureId | null): void {
    if (id === this.activeId) {
      this.group.visible = id !== null;
      return;
    }
    this.clearMeshes();
    this.activeId = id;
    if (id === null) {
      this.group.visible = false;
      return;
    }
    const culture = EXTENDED_SKY_CULTURES[id];
    if (!culture) {
      this.group.visible = false;
      return;
    }
    this.build(culture);
    this.group.visible = true;
  }

  setVisible(v: boolean): void {
    if (this.activeId === null) {
      this.group.visible = false;
      return;
    }
    this.group.visible = v;
  }

  dispose(): void {
    this.clearMeshes();
  }

  private clearMeshes(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.group.remove(this.mesh);
      this.mesh = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    for (const s of this.labels) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(s);
    }
    for (const s of this.starLabels) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(s);
    }
    this.labels = [];
    this.starLabels = [];
  }

  private build(culture: ExtendedSkyCulture): void {
    const positions: number[] = [];
    for (const fig of culture.figures) {
      let sumLon = 0;
      let sumLat = 0;
      let n = 0;
      for (const poly of fig.lines) {
        for (const pt of poly) {
          sumLon += pt[0];
          sumLat += pt[1];
          n++;
        }
        for (let i = 0; i < poly.length - 1; i++) {
          const a = poly[i];
          const b = poly[i + 1];
          if (!a || !b) continue;
          const [ax, ay, az] = raDecToVec3(a[0], a[1], RADIUS);
          const [bx, by, bz] = raDecToVec3(b[0], b[1], RADIUS);
          positions.push(ax, ay, az, bx, by, bz);
        }
      }
      if (n > 0) {
        const lonC = sumLon / n;
        const latC = sumLat / n;
        this.labels.push(
          this.spawnLabel(fig.name, lonC, latC, "rgba(180, 255, 230, 0.92)", 11, 0.024),
        );
      }
    }

    // Star names: subtle, tucked beside the bright star.
    for (const star of culture.stars) {
      this.starLabels.push(
        this.spawnLabel(
          star.name,
          star.raDeg,
          star.decDeg,
          "rgba(255, 230, 180, 0.85)",
          9,
          0.018,
        ),
      );
    }

    const geom = new BufferGeometry();
    geom.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    this.material = new LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      depthTest: false,
    });
    this.mesh = new LineSegments(geom, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.group.add(this.mesh);
  }

  private spawnLabel(
    text: string,
    raDeg: number,
    decDeg: number,
    color: string,
    fontPx: number,
    heightWorld: number,
  ): Sprite {
    const tex = makeLabelTexture(text, color, fontPx);
    const mat = new SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.92,
    });
    const sprite = new Sprite(mat);
    const aspect = tex.image.width / tex.image.height;
    sprite.scale.set(heightWorld * aspect, heightWorld, 1);
    const [x, y, z] = raDecToVec3(raDeg, decDeg, RADIUS);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 4;
    this.group.add(sprite);
    return sprite;
  }
}

function makeLabelTexture(
  text: string,
  color: string,
  fontPx: number,
): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
  const fontSize = fontPx * dpr;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("2d context unavailable");
  measure.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

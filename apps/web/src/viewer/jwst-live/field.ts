/**
 * 🔭 JWST live field — cyan reticle + label sprite at the current JWST
 * target. Reticle is a thin ring of line segments (16 sides) plus four
 * tick marks, drawn additively so it pops on a dark sky background.
 *
 * The label sits just below the reticle and reads "JWST: <target>".
 * Both pieces share a Group rotated −π/2 around X so RA/Dec coords land
 * Y-up alongside the rest of the celestial sphere.
 */

import {
  AdditiveBlending,
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

const RADIUS = 0.9958;
const RETICLE_ANGLE_DEG = 1.2;
const TICK_LENGTH = 0.0015;
const CYAN = 0x4ec9ff;

export type JwstReticleData = {
  raDeg: number;
  decDeg: number;
  label: string;
};

export class JwstLiveField {
  readonly group = new Group();
  private lines: LineSegments | null = null;
  private linesMaterial: LineBasicMaterial | null = null;
  private sprite: Sprite | null = null;
  private spriteTexture: CanvasTexture | null = null;
  private spriteMaterial: SpriteMaterial | null = null;

  constructor() {
    this.group.name = "JwstLiveField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 6;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  setData(data: JwstReticleData | null): void {
    this.clear();
    if (!data) return;
    this.buildReticle(data.raDeg, data.decDeg);
    this.buildLabel(data.raDeg, data.decDeg, data.label);
  }

  private clear(): void {
    if (this.lines) {
      this.lines.geometry.dispose();
      this.group.remove(this.lines);
      this.lines = null;
    }
    if (this.linesMaterial) {
      this.linesMaterial.dispose();
      this.linesMaterial = null;
    }
    if (this.sprite) {
      this.group.remove(this.sprite);
      this.sprite = null;
    }
    if (this.spriteMaterial) {
      this.spriteMaterial.dispose();
      this.spriteMaterial = null;
    }
    if (this.spriteTexture) {
      this.spriteTexture.dispose();
      this.spriteTexture = null;
    }
  }

  private buildReticle(raDeg: number, decDeg: number): void {
    // Build a 16-sided polygon ring + 4 tick marks centred at (ra, dec).
    // We construct the ring in a local tangent plane then rotate it into
    // place by simply nudging RA/Dec — for a small reticle (~1°) the
    // tangent approximation is visually indistinguishable.
    const sides = 16;
    const rDeg = RETICLE_ANGLE_DEG;
    const positions: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      const ra0 =
        raDeg + (rDeg * Math.cos(a0)) / Math.cos((decDeg * Math.PI) / 180);
      const dec0 = decDeg + rDeg * Math.sin(a0);
      const ra1 =
        raDeg + (rDeg * Math.cos(a1)) / Math.cos((decDeg * Math.PI) / 180);
      const dec1 = decDeg + rDeg * Math.sin(a1);
      const [x0, y0, z0] = raDecToVec3(ra0, dec0, RADIUS);
      const [x1, y1, z1] = raDecToVec3(ra1, dec1, RADIUS);
      positions.push(x0, y0, z0, x1, y1, z1);
    }
    // Four tick marks (N, E, S, W in sky frame).
    const tickAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const a of tickAngles) {
      const cosDec = Math.cos((decDeg * Math.PI) / 180);
      const raI =
        raDeg + ((rDeg + TICK_LENGTH * 90) * Math.cos(a)) / cosDec;
      const decI = decDeg + (rDeg + TICK_LENGTH * 90) * Math.sin(a);
      const raO =
        raDeg + ((rDeg * 1.45 + TICK_LENGTH * 90) * Math.cos(a)) / cosDec;
      const decO = decDeg + (rDeg * 1.45 + TICK_LENGTH * 90) * Math.sin(a);
      const [x0, y0, z0] = raDecToVec3(raI, decI, RADIUS);
      const [x1, y1, z1] = raDecToVec3(raO, decO, RADIUS);
      positions.push(x0, y0, z0, x1, y1, z1);
    }
    const arr = new Float32Array(positions);
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(arr, 3));
    this.linesMaterial = new LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.lines = new LineSegments(geom, this.linesMaterial);
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
  }

  private buildLabel(raDeg: number, decDeg: number, text: string): void {
    const tex = makeLabelTexture(text);
    this.spriteTexture = tex;
    this.spriteMaterial = new SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.95,
    });
    const sprite = new Sprite(this.spriteMaterial);
    const aspect = tex.image.width / tex.image.height;
    const h = 0.012;
    sprite.scale.set(h * aspect, h, 1);
    const [x, y, z] = raDecToVec3(
      raDeg,
      decDeg - RETICLE_ANGLE_DEG - 0.8,
      RADIUS,
    );
    sprite.position.set(x, y, z);
    sprite.renderOrder = 7;
    this.sprite = sprite;
    this.group.add(sprite);
  }

  dispose(): void {
    this.clear();
  }
}

function makeLabelTexture(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const fontPx = 13 * dpr;
  const padX = 8 * dpr;
  const padY = 4 * dpr;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("2d context unavailable");
  measure.font = `${fontPx}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const w = Math.ceil(metrics.width + padX * 2);
  const h = Math.ceil(fontPx + padY * 2);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  // Translucent backdrop pill for readability.
  ctx.fillStyle = "rgba(8, 12, 18, 0.65)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(78, 201, 255, 0.55)";
  ctx.lineWidth = 1 * dpr;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.font = `${fontPx}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#bfe8ff";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 3 * dpr;
  ctx.fillText(text, w / 2, h / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

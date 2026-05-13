/**
 * cosmic-web/core-bodies.ts — bright point markers for known cluster
 * cores referenced inside the named structures.
 *
 * Why a separate module? Each core body has its own citation + a
 * distinct render style (cross-hair sprite + small label) that doesn't
 * belong in the bulk particle cloud. Centroid offsets are given in
 * supergalactic-Mpc relative to the host structure centre — they
 * resolve to world LY once the renderer attaches them.
 *
 * Citations (all NED / SIMBAD):
 *   • Great Attractor      — Lynden-Bell+ 1988, ApJ 326:19
 *   • Shapley Centre A3558 — Bardelli+ 1998 MNRAS 296:599
 *   • Virgo Cluster (M87)  — Mei+ 2007 ApJ 655:144 (16.5 Mpc)
 *   • Coma Cluster NGC 4889 — Carter+ 2008 ApJS 176:424 (100 Mpc)
 */

import {
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { COSMIC_STRUCTURES, LY_PER_MPC, type CoreBody } from "./structures";

export type CoreBodyMarker = {
  /** The host structure id, e.g. "laniakea". */
  hostId: string;
  /** Description copied from the structure catalogue. */
  body: CoreBody;
  /** World-space position once mounted (LY, supergalactic→world frame). */
  worldLY: Vector3;
};

/** Build a Group with one labelled sprite per known core body. */
export class CoreBodyLayer {
  readonly group = new Group();
  private sprites: Sprite[] = [];
  private textures: CanvasTexture[] = [];
  private materials: SpriteMaterial[] = [];

  constructor() {
    this.group.name = "CosmicWebCoreBodies";
    this.group.renderOrder = 6;
  }

  build(): void {
    for (const s of COSMIC_STRUCTURES) {
      if (!s.coreBodies) continue;
      for (const body of s.coreBodies) {
        // SG → world axis remap: (sgx, sgy, sgz) → world (x, z, y).
        const sgx = s.centerMpc.x + body.offsetMpc.x;
        const sgy = s.centerMpc.y + body.offsetMpc.y;
        const sgz = s.centerMpc.z + body.offsetMpc.z;
        const worldX = sgx * LY_PER_MPC;
        const worldY = sgz * LY_PER_MPC;
        const worldZ = sgy * LY_PER_MPC;

        const tex = makeCoreLabel(body.name, body.note);
        const mat = new SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.95,
        });
        const sprite = new Sprite(mat);
        // Marker scaling: about 4 Mpc tall in world LY.
        const baseH = 4 * LY_PER_MPC;
        const aspect =
          tex.image && tex.image.height > 0
            ? tex.image.width / tex.image.height
            : 4;
        sprite.scale.set(baseH * aspect, baseH, 1);
        sprite.position.set(worldX, worldY, worldZ);
        sprite.renderOrder = 6;
        sprite.name = `core-body:${body.id}`;
        this.group.add(sprite);
        this.sprites.push(sprite);
        this.textures.push(tex);
        this.materials.push(mat);
      }
    }
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  dispose(): void {
    for (const m of this.materials) {
      m.map?.dispose();
      m.dispose();
    }
    for (const t of this.textures) t.dispose();
    for (const s of this.sprites) this.group.remove(s);
    this.sprites = [];
    this.materials = [];
    this.textures = [];
  }
}

/** Render a small label with a leading cross-hair glyph. */
function makeCoreLabel(name: string, note: string): CanvasTexture {
  const dpr = typicalDpr();
  const padX = 8;
  const padY = 5;
  const titlePx = 12;
  const notePx = 9;
  const titleSize = titlePx * dpr;
  const noteSize = notePx * dpr;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("cosmic-web: 2d context unavailable");
  measure.font = `600 ${titleSize}px "Space Grotesk", system-ui, sans-serif`;
  const titleMetrics = measure.measureText(`◇ ${name}`);
  measure.font = `${noteSize}px "Space Grotesk", system-ui, sans-serif`;
  const noteMetrics = measure.measureText(note);
  const contentWidth = Math.max(titleMetrics.width, noteMetrics.width);
  const width = Math.ceil(contentWidth + padX * 2 * dpr);
  const height = Math.ceil(titleSize + noteSize + padY * 3 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cosmic-web: 2d context unavailable");

  const radius = 5 * dpr;
  ctx.fillStyle = "rgba(20, 12, 36, 0.86)";
  ctx.strokeStyle = "rgba(180, 150, 255, 0.55)";
  ctx.lineWidth = 1 * dpr;
  roundedRect(ctx, 0, 0, width, height, radius);
  ctx.fill();
  ctx.stroke();

  ctx.font = `600 ${titleSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(255, 240, 200, 1.0)";
  ctx.fillText(`◇ ${name}`, padX * dpr, padY * dpr);

  ctx.font = `${noteSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(200, 200, 230, 0.92)";
  ctx.fillText(note, padX * dpr, padY * dpr + titleSize + padY * dpr * 0.5);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function typicalDpr(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Re-exported so the renderer can tint core-body Points by structure. */
export function coreBodyColor(): Color {
  return new Color(1.0, 0.92, 0.6);
}

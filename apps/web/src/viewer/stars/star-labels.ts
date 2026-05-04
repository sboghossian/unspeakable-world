import {
  CanvasTexture,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
} from "three";
import { raDecToVec3 } from "./coords";

/**
 * Bright-star name labels.
 *
 * One sprite per named star from `/data/hyg-named.json`. We hard-cap at the
 * brightest N (default 60) so the screen doesn't fill with text — Sirius,
 * Vega, Betelgeuse, Polaris, Rigel, Capella, Arcturus, etc. are what people
 * actually want to see labelled.
 *
 * Toggle on/off via the same UI affordance as constellation lines.
 */

const RADIUS = 0.9975; // just inside StarField (0.998) so labels render in front
const DEFAULT_LIMIT = 60;

type NamedStar = { name: string; ra: number; dec: number; mag: number };

export class StarLabels {
  readonly group = new Group();
  private sprites: Sprite[] = [];

  constructor() {
    this.group.name = "StarLabels";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up like everything else on the sphere
    this.group.renderOrder = 4.5;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  async load(url: string, limit = DEFAULT_LIMIT): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`star-labels HTTP ${res.status}`);
    const stars = (await res.json()) as NamedStar[];
    // Skip "Sol" (the Sun has its own label via the planet system).
    const ranked = stars
      .filter((s) => s.name !== "Sol")
      .sort((a, b) => a.mag - b.mag)
      .slice(0, limit);
    this.build(ranked);
  }

  private build(stars: NamedStar[]): void {
    for (const s of stars) {
      const tex = makeStarLabel(s.name);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.9,
      });
      const sprite = new Sprite(mat);
      const aspect = tex.image.width / tex.image.height;
      const h = 0.018;
      sprite.scale.set(h * aspect, h, 1);
      const [x, y, z] = raDecToVec3(s.ra, s.dec, RADIUS); // hyg-named.json `ra` is in degrees
      sprite.position.set(x, y, z);
      sprite.renderOrder = 4.5;
      this.sprites.push(sprite);
      this.group.add(sprite);
    }
  }

  count(): number {
    return this.sprites.length;
  }

  dispose(): void {
    for (const s of this.sprites) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(s);
    }
    this.sprites = [];
  }
}

/** Build a small label texture for a single star name. */
function makeStarLabel(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 4;
  const padY = 2;
  const fontSize = 11 * dpr;
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
  // Faint glow halo so the label reads on top of bright HiPS regions.
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 6 * dpr;
  ctx.fillStyle = "rgba(245, 240, 220, 0.95)";
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

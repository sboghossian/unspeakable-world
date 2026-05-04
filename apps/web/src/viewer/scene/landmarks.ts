import {
  CanvasTexture,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Sky landmarks: galactic center / poles + the four ecliptic cardinal
 * points (vernal / autumnal equinoxes, summer / winter solstices).
 *
 * These give the coordinate-grid layer something to anchor against —
 * without them, the violet galactic-plane line and the warm ecliptic
 * are pretty colours pointing at nothing in particular. Toggling the
 * grid on now also turns these labels on; toggling it off hides them.
 */

const RADIUS = 0.997;

type Landmark = {
  name: string;
  raDeg: number;
  decDeg: number;
  tone: "violet" | "amber" | "sky";
};

const LANDMARKS: Landmark[] = [
  // Galactic — pole / anti-pole / center / anticenter.
  // Galactic center is RA 17h45m40.04s, Dec -29°00'28.1" (Sgr A*).
  { name: "Sgr A* (GC)", raDeg: 266.4168, decDeg: -29.0078, tone: "violet" },
  // Galactic anticenter (in Auriga/Taurus, opposite Sgr A*).
  { name: "Galactic Anticenter", raDeg: 86.4168, decDeg: 28.9362, tone: "violet" },
  // North galactic pole (in Coma Berenices).
  { name: "North Galactic Pole", raDeg: 192.8595, decDeg: 27.1283, tone: "violet" },
  // South galactic pole (in Sculptor).
  { name: "South Galactic Pole", raDeg: 12.8595, decDeg: -27.1283, tone: "violet" },

  // Ecliptic — vernal point at RA 0, Dec 0; ecliptic poles, solstices.
  { name: "Vernal Equinox ♈", raDeg: 0, decDeg: 0, tone: "amber" },
  { name: "Autumnal Equinox ♎", raDeg: 180, decDeg: 0, tone: "amber" },
  // Summer solstice ~RA 6h, Dec +23.4366°
  { name: "Summer Solstice ♋", raDeg: 90, decDeg: 23.4366, tone: "amber" },
  { name: "Winter Solstice ♑", raDeg: 270, decDeg: -23.4366, tone: "amber" },
];

export class Landmarks {
  readonly group = new Group();
  private sprites: Sprite[] = [];

  constructor() {
    this.group.name = "Landmarks";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up
    this.group.renderOrder = 4;
    this.group.visible = false;
    this.build();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  private build(): void {
    for (const lm of LANDMARKS) {
      const tex = makeLabel(lm.name, lm.tone);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.9,
      });
      const sprite = new Sprite(mat);
      const aspect = tex.image.width / tex.image.height;
      const h = 0.022;
      sprite.scale.set(h * aspect, h, 1);
      const [x, y, z] = raDecToVec3(lm.raDeg, lm.decDeg, RADIUS);
      sprite.position.set(x, y, z);
      sprite.renderOrder = 4;
      this.sprites.push(sprite);
      this.group.add(sprite);
    }
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

function makeLabel(text: string, tone: "violet" | "amber" | "sky"): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
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

  const palette: Record<typeof tone, { fg: string; chip: string }> = {
    violet: { fg: "rgba(195, 175, 255, 0.95)", chip: "rgba(70, 50, 120, 0.55)" },
    amber: { fg: "rgba(255, 220, 145, 0.95)", chip: "rgba(110, 80, 30, 0.55)" },
    sky: { fg: "rgba(170, 210, 255, 0.95)", chip: "rgba(40, 70, 120, 0.55)" },
  };
  const { fg, chip } = palette[tone];

  // Soft chip so labels read on bright HiPS regions
  const radius = 4 * dpr;
  ctx.fillStyle = chip;
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.fill();

  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = fg;
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function roundRect(
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

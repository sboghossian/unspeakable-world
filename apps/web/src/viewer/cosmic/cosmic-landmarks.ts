import {
  CanvasTexture,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * 🕳 Cosmic landmarks — a curated catalog of named exotic objects that
 * deserve a labelled marker rather than a faint dot:
 *
 *   • Famous black holes (Sgr A*, M87*, Cygnus X-1, …)
 *   • Famous pulsars (Crab, Vela, Geminga, …)
 *   • Famous supernova remnants (Cassiopeia A, Tycho, Kepler, …)
 *   • Famous quasars (3C 273, …)
 *   • Famous active galactic nuclei (M87, Cen A, …)
 *
 * Hand-curated and short — twenty-something entries — so each label is
 * worth reading instead of dissolving into chrome.
 */

const RADIUS = 0.9965;

type LandmarkKind =
  | "black-hole"
  | "pulsar"
  | "supernova-remnant"
  | "quasar"
  | "agn"
  | "exotic";

export type CosmicLandmark = {
  name: string;
  kind: LandmarkKind;
  raDeg: number;
  decDeg: number;
  detail: string;
};

export const COSMIC_LANDMARKS: CosmicLandmark[] = [
  // Black holes
  {
    name: "Sgr A*",
    kind: "black-hole",
    raDeg: 266.4168,
    decDeg: -29.0078,
    detail: "Supermassive black hole · 4.1 M☉ · 26,000 ly · galactic center",
  },
  {
    name: "M87*",
    kind: "black-hole",
    raDeg: 187.7059,
    decDeg: 12.3911,
    detail: "Supermassive black hole · 6.5 B☉ · 53.5 Mly · first BH imaged (EHT 2019)",
  },
  {
    name: "Cygnus X-1",
    kind: "black-hole",
    raDeg: 299.5904,
    decDeg: 35.2016,
    detail: "Stellar-mass black hole · 21 M☉ · 7,200 ly · X-ray binary",
  },
  // Pulsars
  {
    name: "Crab Pulsar (PSR B0531+21)",
    kind: "pulsar",
    raDeg: 83.6331,
    decDeg: 22.0145,
    detail: "Pulsar · spin period 33 ms · Crab Nebula remnant of SN 1054",
  },
  {
    name: "Vela Pulsar (PSR B0833-45)",
    kind: "pulsar",
    raDeg: 128.8366,
    decDeg: -45.1764,
    detail: "Pulsar · spin period 89 ms · brightest persistent γ-ray source",
  },
  {
    name: "Geminga (PSR J0633+1746)",
    kind: "pulsar",
    raDeg: 98.4756,
    decDeg: 17.7708,
    detail: "Pulsar · spin period 237 ms · ~250 pc · radio-quiet γ-ray",
  },
  {
    name: "PSR B1919+21",
    kind: "pulsar",
    raDeg: 290.4233,
    decDeg: 21.8836,
    detail: "First pulsar discovered · Bell + Hewish 1967 · 'LGM-1'",
  },
  // Supernova remnants
  {
    name: "Cassiopeia A",
    kind: "supernova-remnant",
    raDeg: 350.85,
    decDeg: 58.815,
    detail: "Supernova remnant · ~1680 explosion · brightest radio source outside the Sun",
  },
  {
    name: "Tycho's Supernova (SN 1572)",
    kind: "supernova-remnant",
    raDeg: 6.3083,
    decDeg: 64.135,
    detail: "Type Ia supernova remnant · observed by Tycho Brahe Nov 1572",
  },
  {
    name: "Kepler's Supernova (SN 1604)",
    kind: "supernova-remnant",
    raDeg: 262.6708,
    decDeg: -21.4861,
    detail: "Type Ia supernova remnant · observed by Kepler Oct 1604",
  },
  {
    name: "SN 1006",
    kind: "supernova-remnant",
    raDeg: 225.5917,
    decDeg: -41.95,
    detail: "Brightest supernova in recorded history · Type Ia · -7.5 mag at peak",
  },
  // Quasars
  {
    name: "3C 273",
    kind: "quasar",
    raDeg: 187.2779,
    decDeg: 2.0524,
    detail: "Quasar · z=0.158 · first identified quasar · brightest at visual",
  },
  {
    name: "3C 279",
    kind: "quasar",
    raDeg: 194.0466,
    decDeg: -5.7893,
    detail: "Blazar · z=0.536 · superluminal jets · imaged by EHT",
  },
  // Active galactic nuclei
  {
    name: "Centaurus A (NGC 5128)",
    kind: "agn",
    raDeg: 201.3651,
    decDeg: -43.0191,
    detail: "Active galaxy · brightest radio AGN in southern sky · ~13 Mly",
  },
  {
    name: "Markarian 421",
    kind: "agn",
    raDeg: 166.1138,
    decDeg: 38.2088,
    detail: "Blazar · variable TeV γ-ray source · z=0.030",
  },
  // Exotic / fast radio burst host
  {
    name: "FRB 121102 host",
    kind: "exotic",
    raDeg: 82.9947,
    decDeg: 33.1479,
    detail: "First localized repeating fast radio burst · z=0.193",
  },
  {
    name: "GW170817 (NGC 4993)",
    kind: "exotic",
    raDeg: 197.4488,
    decDeg: -23.3839,
    detail: "Binary neutron-star merger · first multi-messenger event · 2017",
  },
];

type Placed = {
  data: CosmicLandmark;
  sprite: Sprite;
};

const COLOR_BY_KIND: Record<LandmarkKind, string> = {
  "black-hole": "rgba(255, 130, 130, 0.95)",
  pulsar: "rgba(255, 200, 90, 0.95)",
  "supernova-remnant": "rgba(255, 110, 200, 0.95)",
  quasar: "rgba(190, 220, 255, 0.95)",
  agn: "rgba(120, 220, 255, 0.95)",
  exotic: "rgba(220, 180, 255, 0.95)",
};

export class CosmicLandmarks {
  readonly group = new Group();
  private placed: Placed[] = [];

  constructor() {
    this.group.name = "CosmicLandmarks";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 4;
    this.group.visible = false;
    this.build();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  list(): CosmicLandmark[] {
    return COSMIC_LANDMARKS;
  }

  private build(): void {
    for (const lm of COSMIC_LANDMARKS) {
      const tex = makeLabel(lm.name, COLOR_BY_KIND[lm.kind]);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.92,
      });
      const sprite = new Sprite(mat);
      const aspect = tex.image.width / tex.image.height;
      const h = 0.02;
      sprite.scale.set(h * aspect, h, 1);
      const [x, y, z] = raDecToVec3(lm.raDeg, lm.decDeg, RADIUS);
      sprite.position.set(x, y, z);
      sprite.renderOrder = 4;
      this.placed.push({ data: lm, sprite });
      this.group.add(sprite);
    }
  }

  dispose(): void {
    for (const p of this.placed) {
      const m = p.sprite.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(p.sprite);
    }
    this.placed = [];
  }
}

function makeLabel(text: string, color: string): CanvasTexture {
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

  // chip
  const radius = 4 * dpr;
  ctx.fillStyle = "rgba(20, 20, 35, 0.7)";
  roundRect(ctx, 0, 0, width, height, radius);
  ctx.fill();

  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = color;
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

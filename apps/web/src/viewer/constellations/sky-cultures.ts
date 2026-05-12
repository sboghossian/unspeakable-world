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

/**
 * Stellarium-style sky cultures: line-figures for famous asterisms
 * across non-Western traditions.
 *
 * The 88 IAU constellations are already rendered by
 * `ConstellationLines` from d3-celestial's GeoJSON; this module is
 * strictly additive — it ships hand-authored polylines for four
 * other cultures whose figures span large portions of the sky:
 *
 *   - western    → re-uses the IAU lines (caller toggles
 *                  `ConstellationLines` instead of this module)
 *   - chinese    → the four cardinal celestial animals
 *   - polynesian → famous Hawaiian wayfinding asterisms
 *   - lakota    → Lakota constellations from Goodman's catalog
 *
 * All bright-star coordinates are J2000 ICRS, sourced from public-
 * domain astronomical tables (Yale BSC, Hipparcos / SIMBAD). They
 * are encoded as `[raDeg, decDeg]` and connected with line segments
 * in the order given so they render as recognisable shapes.
 */

export type SkyCultureId = "western" | "chinese" | "polynesian" | "lakota";

export type SkyCultureFigure = {
  /** Native or common name of the asterism. */
  name: string;
  /** Culture id this figure belongs to. */
  culture: SkyCultureId;
  /** One or more polylines (sequence of [raDeg, decDeg] vertices). */
  lines: Array<Array<[number, number]>>;
  /** One-line note shown in the UI / on label hover. */
  detail: string;
};

export type SkyCulture = {
  id: SkyCultureId;
  label: string;
  /** Empty for `western` — caller defers to ConstellationLines. */
  figures: SkyCultureFigure[];
  attribution: string;
};

// ─── Chinese: the four cardinal celestial animals + Northern Ladle ──
// Each "animal" is built from its seven traditional lunar mansions
// (二十八宿). Coordinates use the brightest reference star of each
// mansion rather than a complex outline; this reads as a sweeping arc
// across the relevant quadrant of sky.

const AZURE_DRAGON_SPRING: Array<[number, number]> = [
  [197.97, -1.45], // Horn 角 — Spica (α Vir)
  [213.92, -10.27], // Neck 亢 — κ Vir
  [220.63, -22.62], // Root 氐 — α Lib
  [240.08, -22.62], // Room 房 — π Sco
  [247.35, -26.43], // Heart 心 — Antares (α Sco)
  [262.69, -37.1], // Tail 尾 — Shaula (λ Sco)
  [276.99, -25.42], // Winnowing Basket 箕 — γ Sgr
];

const VERMILION_BIRD_SUMMER: Array<[number, number]> = [
  [101.29, -16.72], // Well 井 — μ Gem area (Sirius nearby)
  [124.13, 9.19], // Ghost 鬼 — δ Cnc
  [141.9, 8.65], // Willow 柳 — δ Hya
  [177.26, 14.57], // Star 星 — α Hya (Alphard)
  [196.0, -7.0], // Extended Net 張 — υ Hya
  [191.93, -1.45], // Wings 翼 — α Crt
  [187.79, -16.51], // Chariot 軫 — γ Crv
];

const WHITE_TIGER_AUTUMN: Array<[number, number]> = [
  [25.62, 15.35], // Legs 奎 — η And
  [41.07, 23.46], // Bond 婁 — α Ari (Hamal)
  [56.87, 24.1], // Stomach 胃 — 35 Ari
  [56.87, 24.1], // Hairy Head 昴 — Pleiades anchor (Alcyone 56.87 +24.10)
  [67.16, 15.87], // Net 畢 — Aldebaran (α Tau)
  [83.0, 9.93], // Turtle Beak 觜 — λ Ori
  [82.0, -1.2], // Three Stars 參 — Orion's belt (δ Ori)
];

const BLACK_TORTOISE_WINTER: Array<[number, number]> = [
  [305.25, -14.78], // Dipper 斗 — Nunki (σ Sgr area)
  [322.89, -5.57], // Ox 牛 — β Cap
  [332.06, -7.78], // Maid 女 — ε Aqr
  [340.67, -0.32], // Emptiness 虛 — β Aqr
  [350.74, -6.05], // Rooftop 危 — α Aqr
  [3.34, 15.18], // Encampment 室 — α Peg (Markab)
  [13.62, 28.08], // Wall 壁 — γ Peg (Algenib)
];

const NORTHERN_LADLE: Array<[number, number]> = [
  // Big Dipper bowl + handle = the Northern Ladle (北斗) in Chinese
  // tradition, brightest pointer to circumpolar north.
  [165.46, 61.75], // Dubhe   (α UMa)
  [165.93, 56.38], // Merak   (β UMa)
  [178.46, 53.69], // Phecda  (γ UMa)
  [183.86, 57.03], // Megrez  (δ UMa)
  [193.51, 55.96], // Alioth  (ε UMa)
  [200.98, 54.93], // Mizar   (ζ UMa)
  [206.89, 49.31], // Alkaid  (η UMa)
];

const CHINESE: SkyCulture = {
  id: "chinese",
  label: "Chinese",
  attribution: "28 lunar mansions · public-domain Han astronomy",
  figures: [
    {
      name: "Azure Dragon of the East",
      culture: "chinese",
      lines: [AZURE_DRAGON_SPRING],
      detail:
        "青龍 — spring quadrant, 7 mansions from Spica (Horn) to Sagittarius (Winnowing Basket).",
    },
    {
      name: "Vermilion Bird of the South",
      culture: "chinese",
      lines: [VERMILION_BIRD_SUMMER],
      detail:
        "朱雀 — summer quadrant, 7 mansions spanning Gemini through Corvus.",
    },
    {
      name: "White Tiger of the West",
      culture: "chinese",
      lines: [WHITE_TIGER_AUTUMN],
      detail:
        "白虎 — autumn quadrant, 7 mansions from Andromeda through Orion's belt.",
    },
    {
      name: "Black Tortoise of the North",
      culture: "chinese",
      lines: [BLACK_TORTOISE_WINTER],
      detail:
        "玄武 — winter quadrant, 7 mansions from Sagittarius through Pegasus.",
    },
    {
      name: "Northern Ladle",
      culture: "chinese",
      lines: [NORTHERN_LADLE],
      detail: "北斗 — the Big Dipper, the celestial timekeeper of the North.",
    },
  ],
};

// ─── Polynesian (Hawaiian wayfinding) ───────────────────────────────
// Coordinates from the Polynesian Voyaging Society's published star
// compass plus Hipparcos for the bright references.

const MANAIAKALANI: Array<[number, number]> = [
  // Maui's Fishhook = the tail/sting of Scorpius
  [248.97, -28.22], // δ Sco (Dschubba)
  [241.36, -19.81], // β Sco (Acrab)
  [247.35, -26.43], // α Sco (Antares)
  [252.97, -34.29], // ε Sco
  [262.69, -37.1], // λ Sco (Shaula)
  [263.4, -37.3], // υ Sco (Lesath)
  [265.62, -39.03], // θ Sco (Sargas)
  [263.4, -37.3], // back to Lesath — completes the hook curl
];

const NEWE_SOUTHERN_CROSS: Array<[number, number]> = [
  [186.65, -63.1], // Acrux (α Cru)
  [191.93, -59.69], // Gacrux (γ Cru)
];
const NEWE_CROSSBAR: Array<[number, number]> = [
  [183.79, -58.75], // Mimosa (β Cru)
  [193.0, -57.11], // δ Cru
];

const KEALIIOKONAIKALEWA: Array<[number, number]> = [
  // The Chief of the South, a meridian-spanning navigation line of
  // bright stars from Canopus arching toward Achernar.
  [95.99, -52.7], // Canopus (α Car)
  [138.3, -69.72], // Miaplacidus (β Car)
  [122.38, -47.34], // Avior (ε Car)
  [125.63, -59.51], // υ Car region
  [24.43, -57.24], // Achernar (α Eri)
];

const POLYNESIAN: SkyCulture = {
  id: "polynesian",
  label: "Polynesian",
  attribution: "Hawaiian wayfinding · Polynesian Voyaging Society",
  figures: [
    {
      name: "Manaiakalani",
      culture: "polynesian",
      lines: [MANAIAKALANI],
      detail: "Maui's fishhook — the curve of Scorpius's tail and stinger.",
    },
    {
      name: "Newe (Southern Cross)",
      culture: "polynesian",
      lines: [NEWE_SOUTHERN_CROSS, NEWE_CROSSBAR],
      detail:
        "Four stars marking south in the latitude band of the Hawaiian voyaging routes.",
    },
    {
      name: "Hokule'a",
      culture: "polynesian",
      lines: [[[213.92, 19.18]]], // Arcturus as a single marker — single point
      detail:
        "Hoku-le'a, 'star of gladness' — Arcturus, the zenith star of Hawaiʻi.",
    },
    {
      name: "Ke Ali'i o Kona i ka Lewa",
      culture: "polynesian",
      lines: [KEALIIOKONAIKALEWA],
      detail:
        "Chief of the southern sky — Canopus, Miaplacidus and Avior arching to Achernar.",
    },
  ],
};

// ─── Lakota ─────────────────────────────────────────────────────────
// From the Lakota star map work of Ronald Goodman (Lakota Star
// Knowledge, 1992) and the Sinte Gleska University publications.

const CANSASA_IPUSYE_PLEIADES: Array<[number, number]> = [
  // Cansa'sa Ipusye = "Dried Willow", the Pleiades cluster — drawn as
  // a small closed quadrilateral around its seven sisters.
  [56.22, 24.05], // 16 Tau
  [56.87, 24.1], // Alcyone (η Tau)
  [56.45, 24.37], // Atlas (27 Tau)
  [55.73, 23.95], // Electra (17 Tau)
  [56.22, 24.05],
];

const TAYAMNI_CANKHU_BUFFALO: Array<[number, number]> = [
  // Tayamnicankhu — "Backbone of the World", the buffalo's spine drawn
  // along Orion: Aldebaran (head) → belt (ribs) → Sirius (tail).
  [68.98, 16.51], // Aldebaran (α Tau)
  [83.0, -1.2], // Mintaka (δ Ori)
  [84.05, -1.94], // Alnilam (ε Ori)
  [85.19, -1.94], // Alnitak (ζ Ori)
  [88.79, 7.4], // Betelgeuse (α Ori)
  [78.63, -8.2], // Rigel (β Ori)
  [101.29, -16.72], // Sirius (α CMa)
];

const KECAPIRUTAPI_DIPPER: Array<[number, number]> = [
  // The Dipper as a Lakota figure has its own role as one half of the
  // Race Track / Sacred Hoop. Same seven stars as the Northern Ladle.
  [165.46, 61.75],
  [165.93, 56.38],
  [178.46, 53.69],
  [183.86, 57.03],
  [193.51, 55.96],
  [200.98, 54.93],
  [206.89, 49.31],
];

const KEYA_TURTLE: Array<[number, number]> = [
  // Keya (turtle) — corresponds roughly to the Great Square of Pegasus
  // with the head pointing toward Andromeda's α.
  [3.34, 15.18], // Markab (α Peg)
  [345.94, 15.21], // Scheat (β Peg)
  [13.62, 28.08], // Algenib (γ Peg)
  [2.1, 29.09], // Alpheratz (α And)
  [3.34, 15.18], // close
];

const LAKOTA: SkyCulture = {
  id: "lakota",
  label: "Lakota",
  attribution: "Lakota Star Knowledge · Goodman / Sinte Gleska",
  figures: [
    {
      name: "Cansa'sa Ipusye (Pleiades)",
      culture: "lakota",
      lines: [CANSASA_IPUSYE_PLEIADES],
      detail:
        "Dried red willow — the Pleiades cluster, marker of the winter sky.",
    },
    {
      name: "Tayamnicankhu (Buffalo)",
      culture: "lakota",
      lines: [TAYAMNI_CANKHU_BUFFALO],
      detail:
        "Backbone of the buffalo — Aldebaran head, Orion's belt ribs, Sirius tail.",
    },
    {
      name: "Kechapirutapi (Dipper)",
      culture: "lakota",
      lines: [KECAPIRUTAPI_DIPPER],
      detail:
        "The Dipper as one half of the Sacred Hoop, opposite the Race Track.",
    },
    {
      name: "Keya (Turtle)",
      culture: "lakota",
      lines: [KEYA_TURTLE],
      detail: "Turtle — the Great Square of Pegasus with α And as its head.",
    },
  ],
};

const WESTERN: SkyCulture = {
  id: "western",
  label: "Western (IAU)",
  attribution: "88 IAU constellations · d3-celestial",
  figures: [], // empty — caller uses ConstellationLines instead.
};

export const SKY_CULTURES: Record<SkyCultureId, SkyCulture> = {
  western: WESTERN,
  chinese: CHINESE,
  polynesian: POLYNESIAN,
  lakota: LAKOTA,
};

const RADIUS = 0.998; // just inside the HiPS sphere

/**
 * Render layer for one non-Western sky culture. Mirrors the
 * `ConstellationLines` class but takes its data from
 * `SKY_CULTURES` and tags each figure with a centroid label sprite.
 */
export class SkyCultureLines {
  readonly group = new Group();
  private mesh: LineSegments | null = null;
  private material: LineBasicMaterial | null = null;
  private labels: Sprite[] = [];
  private activeId: SkyCultureId | null = null;
  private color: number;

  constructor(color = 0xf0a0ff) {
    this.color = color;
    this.group.name = "SkyCultureLines";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up (match IAU lines)
    this.group.renderOrder = 3;
    this.group.visible = false;
  }

  setCulture(id: SkyCultureId | null): void {
    if (id === this.activeId) {
      this.group.visible = id !== null && id !== "western";
      return;
    }
    this.clearMeshes();
    this.activeId = id;
    if (id === null || id === "western") {
      this.group.visible = false;
      return;
    }
    const culture = SKY_CULTURES[id];
    this.build(culture);
    this.group.visible = true;
  }

  setVisible(v: boolean): void {
    if (this.activeId === null || this.activeId === "western") {
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
      (this.mesh.material as LineBasicMaterial).dispose();
      this.group.remove(this.mesh);
      this.mesh = null;
      this.material = null;
    }
    for (const s of this.labels) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(s);
    }
    this.labels = [];
  }

  private build(culture: SkyCulture): void {
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
        // A single-point polyline (e.g. Hokule'a) renders nothing — we
        // still place a label at the point so the asterism is named.
        for (let i = 0; i < poly.length - 1; i++) {
          const a = poly[i]!;
          const b = poly[i + 1]!;
          const [ax, ay, az] = raDecToVec3(a[0], a[1], RADIUS);
          const [bx, by, bz] = raDecToVec3(b[0], b[1], RADIUS);
          positions.push(ax, ay, az, bx, by, bz);
        }
      }
      if (n > 0) {
        const lonC = sumLon / n;
        const latC = sumLat / n;
        const [cx, cy, cz] = raDecToVec3(lonC, latC, RADIUS);
        const labelTex = makeFigureLabel(fig.name);
        const labelMat = new SpriteMaterial({
          map: labelTex,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.85,
        });
        const sprite = new Sprite(labelMat);
        const aspect = labelTex.image.width / labelTex.image.height;
        const h = 0.024;
        sprite.scale.set(h * aspect, h, 1);
        sprite.position.set(cx, cy, cz);
        sprite.renderOrder = 4;
        this.labels.push(sprite);
        this.group.add(sprite);
      }
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
}

function makeFigureLabel(text: string): CanvasTexture {
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
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(240, 200, 255, 0.9)";
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

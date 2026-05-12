import {
  AdditiveBlending,
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
  // ─── Stellar-mass black holes (X-ray binaries) ─────────────────────
  {
    name: "Cygnus X-1",
    kind: "black-hole",
    raDeg: 299.5904,
    decDeg: 35.2016,
    detail: "Stellar-mass black hole · 21 M☉ · 7,200 ly · first confirmed BH",
  },
  {
    name: "V404 Cygni",
    kind: "black-hole",
    raDeg: 306.0157,
    decDeg: 33.8672,
    detail: "Stellar-mass BH · 9 M☉ · 8,000 ly · X-ray nova 1989/2015",
  },
  {
    name: "GRO J1655-40",
    kind: "black-hole",
    raDeg: 253.5006,
    decDeg: -39.8458,
    detail: "Stellar-mass BH · 6.3 M☉ · 11,000 ly · superluminal microquasar",
  },
  {
    name: "GRS 1915+105",
    kind: "black-hole",
    raDeg: 288.7977,
    decDeg: 10.9456,
    detail: "Stellar-mass BH · 12 M☉ · 36,000 ly · most massive Galactic BH",
  },
  {
    name: "GX 339-4",
    kind: "black-hole",
    raDeg: 255.7058,
    decDeg: -48.7896,
    detail: "Stellar-mass BH · ~6 M☉ · ~26,000 ly · recurring X-ray nova",
  },
  {
    name: "4U 1543-475",
    kind: "black-hole",
    raDeg: 236.7858,
    decDeg: -47.6692,
    detail: "Stellar-mass BH · 9 M☉ · 24,000 ly · X-ray transient",
  },
  {
    name: "A0620-00 (V616 Mon)",
    kind: "black-hole",
    raDeg: 95.6792,
    decDeg: -0.3499,
    detail: "Stellar-mass BH · 6.6 M☉ · 3,500 ly · nearest BH X-ray binary",
  },
  {
    name: "LMC X-1",
    kind: "black-hole",
    raDeg: 84.9133,
    decDeg: -69.7433,
    detail: "Stellar-mass BH · 11 M☉ · LMC · persistent X-ray binary",
  },
  {
    name: "LMC X-3",
    kind: "black-hole",
    raDeg: 84.7378,
    decDeg: -64.0833,
    detail: "Stellar-mass BH · 7 M☉ · LMC · soft X-ray spectrum",
  },
  {
    name: "Gaia BH1",
    kind: "black-hole",
    raDeg: 264.5717,
    decDeg: -0.5808,
    detail: "Dormant BH · 9.6 M☉ · 1,560 ly · nearest known black hole (2022)",
  },
  // ─── Supermassive black holes (galactic centers) ───────────────────
  {
    name: "Sgr A*",
    kind: "black-hole",
    raDeg: 266.4168,
    decDeg: -29.0078,
    detail: "SMBH · 4.1 M☉ million · 26,000 ly · Milky Way center · imaged 2022",
  },
  {
    name: "M87*",
    kind: "black-hole",
    raDeg: 187.7059,
    decDeg: 12.3911,
    detail: "SMBH · 6.5 billion M☉ · 53.5 Mly · first BH imaged (EHT 2019)",
  },
  {
    name: "M31 SMBH",
    kind: "black-hole",
    raDeg: 10.6847,
    decDeg: 41.2691,
    detail: "Andromeda SMBH · 100 M M☉ · 2.5 Mly · binary candidate",
  },
  {
    name: "NGC 4258 SMBH",
    kind: "black-hole",
    raDeg: 184.7396,
    decDeg: 47.3039,
    detail: "SMBH · 39 M M☉ · 23 Mly · gold-standard maser distance",
  },
  {
    name: "NGC 1277 SMBH",
    kind: "black-hole",
    raDeg: 49.9648,
    decDeg: 41.5733,
    detail: "Ultra-massive SMBH · 17 B M☉ · 220 Mly · 14% of host bulge mass",
  },
  {
    name: "Holmberg 15A SMBH",
    kind: "black-hole",
    raDeg: 9.5,
    decDeg: -15.65,
    detail: "Ultramassive SMBH · 40 B M☉ · 700 Mly · cD galaxy core",
  },
  {
    name: "TON 618",
    kind: "black-hole",
    raDeg: 184.3784,
    decDeg: 31.7515,
    detail: "Ultramassive SMBH · 66 B M☉ · z=2.219 · among most massive known",
  },
  {
    name: "Centaurus A SMBH (NGC 5128)",
    kind: "black-hole",
    raDeg: 201.3651,
    decDeg: -43.0191,
    detail: "SMBH · 55 M M☉ · 13 Mly · radio-loud AGN with relativistic jet",
  },
  {
    name: "M81 SMBH",
    kind: "black-hole",
    raDeg: 148.8882,
    decDeg: 69.0653,
    detail: "SMBH · 70 M M☉ · 11.7 Mly · LINER-type AGN",
  },
  {
    name: "M82 SMBH",
    kind: "black-hole",
    raDeg: 148.9696,
    decDeg: 69.6797,
    detail: "SMBH · 30 M M☉ · 11.5 Mly · starburst galaxy",
  },
  {
    name: "M104 (Sombrero) SMBH",
    kind: "black-hole",
    raDeg: 189.9976,
    decDeg: -11.6231,
    detail: "SMBH · 1 B M☉ · 31 Mly · classic edge-on galaxy",
  },

  // ─── Pulsars ───────────────────────────────────────────────────────
  {
    name: "Crab Pulsar (B0531+21)",
    kind: "pulsar",
    raDeg: 83.6331,
    decDeg: 22.0145,
    detail: "Pulsar · 33 ms · Crab Nebula · remnant of SN 1054 · 6,500 ly",
  },
  {
    name: "Vela Pulsar (B0833-45)",
    kind: "pulsar",
    raDeg: 128.8366,
    decDeg: -45.1764,
    detail: "Pulsar · 89 ms · brightest persistent γ-ray source · 1,000 ly",
  },
  {
    name: "Geminga (J0633+1746)",
    kind: "pulsar",
    raDeg: 98.4756,
    decDeg: 17.7708,
    detail: "Pulsar · 237 ms · radio-quiet γ-ray pulsar · ~800 ly",
  },
  {
    name: "PSR B1919+21",
    kind: "pulsar",
    raDeg: 290.4233,
    decDeg: 21.8836,
    detail: "First pulsar discovered · Bell + Hewish 1967 · 'LGM-1'",
  },
  {
    name: "PSR J0437-4715",
    kind: "pulsar",
    raDeg: 69.3163,
    decDeg: -47.2525,
    detail: "Millisecond pulsar · 5.76 ms · 510 ly · nearest known MSP",
  },
  {
    name: "PSR B1257+12",
    kind: "pulsar",
    raDeg: 195.0083,
    decDeg: 12.6839,
    detail: "Pulsar · 6.22 ms · first to host exoplanets (1992)",
  },
  {
    name: "PSR J0740+6620",
    kind: "pulsar",
    raDeg: 115.1942,
    decDeg: 66.3417,
    detail: "Most massive known neutron star · 2.08 M☉ · NICER",
  },
  {
    name: "PSR B0329+54",
    kind: "pulsar",
    raDeg: 53.2425,
    decDeg: 54.5786,
    detail: "Bright pulsar · 714 ms · 3,460 ly · easy amateur radio target",
  },

  // ─── Supernova remnants ────────────────────────────────────────────
  {
    name: "Cassiopeia A",
    kind: "supernova-remnant",
    raDeg: 350.85,
    decDeg: 58.815,
    detail: "SNR · ~1680 explosion · brightest extra-solar radio source · 11 kly",
  },
  {
    name: "Tycho's SNR (SN 1572)",
    kind: "supernova-remnant",
    raDeg: 6.3083,
    decDeg: 64.135,
    detail: "Type Ia SNR · observed by Tycho Brahe Nov 1572 · 8-10 kly",
  },
  {
    name: "Kepler's SNR (SN 1604)",
    kind: "supernova-remnant",
    raDeg: 262.6708,
    decDeg: -21.4861,
    detail: "Type Ia SNR · observed by Kepler Oct 1604 · ~20 kly",
  },
  {
    name: "SN 1006",
    kind: "supernova-remnant",
    raDeg: 225.5917,
    decDeg: -41.95,
    detail: "Brightest SN in recorded history · -7.5 mag at peak · 7 kly",
  },
  {
    name: "SN 1054 (Crab)",
    kind: "supernova-remnant",
    raDeg: 83.6331,
    decDeg: 22.0145,
    detail: "Type II SNR · observed by Chinese astronomers 1054 · 6.5 kly",
  },
  {
    name: "SN 1987A",
    kind: "supernova-remnant",
    raDeg: 83.8669,
    decDeg: -69.2697,
    detail: "Type II SN in LMC · 1987 · first naked-eye SN since Kepler",
  },
  {
    name: "Veil Nebula",
    kind: "supernova-remnant",
    raDeg: 312.75,
    decDeg: 30.7,
    detail: "Cygnus Loop SNR · 8,000 yr · 2,400 ly · 3° on sky",
  },

  // ─── Quasars ───────────────────────────────────────────────────────
  {
    name: "3C 273",
    kind: "quasar",
    raDeg: 187.2779,
    decDeg: 2.0524,
    detail: "Quasar · z=0.158 · first identified quasar · v=12.9 · 2.4 Gly",
  },
  {
    name: "3C 279",
    kind: "quasar",
    raDeg: 194.0466,
    decDeg: -5.7893,
    detail: "Blazar · z=0.536 · superluminal jets · imaged by EHT 2017",
  },
  {
    name: "ULAS J1342+0928",
    kind: "quasar",
    raDeg: 205.5333,
    decDeg: 9.4742,
    detail: "Quasar · z=7.54 · most distant z>7 quasar (when discovered)",
  },
  {
    name: "J0313–1806",
    kind: "quasar",
    raDeg: 48.4625,
    decDeg: -18.1131,
    detail: "Quasar · z=7.64 · current most-distant known quasar",
  },

  // ─── Active galactic nuclei / blazars ──────────────────────────────
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
  {
    name: "Markarian 501",
    kind: "agn",
    raDeg: 253.4675,
    decDeg: 39.7603,
    detail: "Blazar · TeV γ-ray · z=0.034 · ~450 Mly",
  },
  {
    name: "Cygnus A",
    kind: "agn",
    raDeg: 299.8682,
    decDeg: 40.7339,
    detail: "Radio galaxy · brightest extragalactic radio source · z=0.056",
  },

  // ─── Exotic / multi-messenger ──────────────────────────────────────
  {
    name: "FRB 121102",
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
    detail: "Binary neutron-star merger · first multi-messenger event (2017)",
  },
  {
    name: "GW150914",
    kind: "exotic",
    raDeg: 119.0,
    decDeg: -69.0,
    detail: "First gravitational-wave detection · 36+29 M☉ BH-BH merger · 1.3 Gly",
  },
  {
    name: "Stephan's Quintet",
    kind: "exotic",
    raDeg: 339.0083,
    decDeg: 33.9633,
    detail: "Compact galaxy group · 290 Mly · JWST early-release target",
  },
  {
    name: "Hubble Deep Field",
    kind: "exotic",
    raDeg: 189.2058,
    decDeg: 62.2161,
    detail: "Original 1995 HDF · ~3,000 galaxies · z up to ~6",
  },
  {
    name: "Hubble Ultra Deep Field",
    kind: "exotic",
    raDeg: 53.1625,
    decDeg: -27.7917,
    detail: "2003 UDF · ~10,000 galaxies · earliest galaxies known until JWST",
  },
  {
    name: "JWST eXtreme Deep Field (XDF)",
    kind: "exotic",
    raDeg: 53.1574,
    decDeg: -27.7873,
    detail: "Webb-era successor to HUDF · z up to ~14 · 2022+",
  },
  {
    name: "JWST CEERS Field",
    kind: "exotic",
    raDeg: 215.0,
    decDeg: 53.0,
    detail: "Cosmic Evolution Early Release Science · early Webb survey",
  },

  // ─── Galaxy clusters (rich, named) ─────────────────────────────────
  {
    name: "Virgo Cluster (M87)",
    kind: "agn",
    raDeg: 187.7059,
    decDeg: 12.3911,
    detail: "Galaxy cluster · ~1,300 members · 53 Mly · centered on M87",
  },
  {
    name: "Coma Cluster",
    kind: "agn",
    raDeg: 194.953,
    decDeg: 27.981,
    detail: "Galaxy cluster · ~1,000 members · 320 Mly · NGC 4889 + 4874",
  },
  {
    name: "Perseus Cluster (Abell 426)",
    kind: "agn",
    raDeg: 49.945,
    decDeg: 41.514,
    detail: "Galaxy cluster · X-ray brightest cluster · 240 Mly",
  },
  {
    name: "Hercules Cluster (Abell 2151)",
    kind: "agn",
    raDeg: 241.3,
    decDeg: 17.75,
    detail: "Galaxy cluster · 500 Mly · part of Hercules Supercluster",
  },
  {
    name: "Norma Cluster (Abell 3627)",
    kind: "agn",
    raDeg: 243.55,
    decDeg: -60.91,
    detail: "Galaxy cluster · core of the Great Attractor · 220 Mly",
  },
  {
    name: "Bullet Cluster (1E 0657-558)",
    kind: "agn",
    raDeg: 104.6583,
    decDeg: -55.9436,
    detail: "Merging galaxy cluster · direct evidence of dark matter · 3.7 Gly",
  },

  // ─── Superclusters / large-scale structure ────────────────────────
  {
    name: "Laniakea Supercluster",
    kind: "exotic",
    raDeg: 158.0,
    decDeg: -46.0,
    detail: "Our home supercluster · 100,000 galaxies · 520 Mly across",
  },
  {
    name: "Great Attractor",
    kind: "exotic",
    raDeg: 244.5,
    decDeg: -62.0,
    detail: "Gravitational anomaly · 250 Mly · pulls Local Group toward Norma",
  },
  {
    name: "Shapley Supercluster",
    kind: "exotic",
    raDeg: 202.0,
    decDeg: -31.5,
    detail: "Largest known concentration of galaxies · 650 Mly",
  },
  {
    name: "Sloan Great Wall",
    kind: "exotic",
    raDeg: 199.0,
    decDeg: 10.0,
    detail: "Galaxy filament · 1.37 Gly long · one of the largest structures",
  },
  {
    name: "Boötes Void",
    kind: "exotic",
    raDeg: 222.0,
    decDeg: 26.0,
    detail: "Cosmic void · 330 Mly diameter · ~700 Mly distant",
  },
  {
    name: "Local Group barycenter",
    kind: "exotic",
    raDeg: 11.0,
    decDeg: 41.0,
    detail: "~30 galaxies · centered between Milky Way & Andromeda",
  },

  // ─── More gravitational-wave events (LIGO/Virgo, well-localized) ──
  {
    name: "GW190521",
    kind: "exotic",
    raDeg: 86.16,
    decDeg: 27.46,
    detail: "Most massive BH-BH merger · 142 M☉ remnant · z=0.82",
  },
  {
    name: "GW190425",
    kind: "exotic",
    raDeg: 245.0,
    decDeg: 0.0,
    detail: "Binary neutron-star merger candidate · 159 Mpc",
  },
  {
    name: "GW230529",
    kind: "exotic",
    raDeg: 181.0,
    decDeg: 6.0,
    detail: "Lower-mass-gap BH + NS merger · 197 Mpc · 2023",
  },

  // ─── Famous emission / planetary nebulae ──────────────────────────
  {
    name: "Eagle Nebula (M16) · Pillars of Creation",
    kind: "supernova-remnant",
    raDeg: 274.7,
    decDeg: -13.78,
    detail: "Star-forming region · 7,000 ly · iconic Hubble image",
  },
  {
    name: "Carina Nebula (NGC 3372)",
    kind: "supernova-remnant",
    raDeg: 161.265,
    decDeg: -59.867,
    detail: "Massive star-forming region · 8,500 ly · η Carinae host",
  },
  {
    name: "Ring Nebula (M57)",
    kind: "supernova-remnant",
    raDeg: 283.396,
    decDeg: 33.029,
    detail: "Planetary nebula · 2,300 ly · classic amateur target",
  },
  {
    name: "Helix Nebula (NGC 7293)",
    kind: "supernova-remnant",
    raDeg: 337.411,
    decDeg: -20.838,
    detail: "Planetary nebula · 700 ly · nearest known PN",
  },
  {
    name: "Cat's Eye Nebula (NGC 6543)",
    kind: "supernova-remnant",
    raDeg: 269.639,
    decDeg: 66.633,
    detail: "Planetary nebula · 3,000 ly · complex shell structure",
  },
  {
    name: "Dumbbell Nebula (M27)",
    kind: "supernova-remnant",
    raDeg: 299.901,
    decDeg: 22.721,
    detail: "Planetary nebula · 1,360 ly · first PN ever discovered (1764)",
  },
];

export type Placed = {
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

  /** Sprites + their backing data, for raycaster picking. */
  pickables(): ReadonlyArray<Placed> {
    return this.placed;
  }

  private build(): void {
    const accretionTex = makeAccretionDiskTexture();
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

      // Black-hole landmarks get an extra glyph: a small accretion-disk
      // sprite stacked behind the label so each BH reads as more than a
      // line of text. Photon-ring centre, warm orange disk, fades out
      // toward the rim — matches the EHT M87* / Sgr A* visual idiom.
      if (lm.kind === "black-hole") {
        const diskMat = new SpriteMaterial({
          map: accretionTex,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.85,
          blending: AdditiveBlending,
        });
        const disk = new Sprite(diskMat);
        const dh = 0.018;
        disk.scale.set(dh, dh, 1);
        disk.position.set(x, y, z);
        disk.renderOrder = 3; // behind the label sprite
        this.group.add(disk);
      }
    }
  }

  /** Procedural accretion-disk texture: dark photon-ring centre, warm
   *  orange annulus, fading to transparent at the rim. Shared across
   *  every BH marker — one texture, many sprites. */
  // Note: this is a method-local helper as a defensive measure if the
  // module is ever side-imported without the constructor running.
  // It's defined as a free function below.

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

/** Procedural accretion-disk: dark photon-ring core surrounded by a
 *  warm orange annulus that fades out to transparent at the rim.
 *  Reads as the EHT silhouette idiom (M87*, Sgr A*). One texture
 *  shared across every BH sprite. */
function makeAccretionDiskTexture(): CanvasTexture {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  // Transparent base — we want the BH to read against the sky.
  ctx.clearRect(0, 0, SIZE, SIZE);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  // Outer warm ring → photon-ring darkening → black core.
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE / 2);
  grad.addColorStop(0.0, "rgba(0,0,0,0.95)"); // event-horizon shadow
  grad.addColorStop(0.18, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.22, "rgba(255,210,140,0.95)"); // photon ring bright edge
  grad.addColorStop(0.32, "rgba(255,160,80,0.85)");
  grad.addColorStop(0.55, "rgba(220,110,40,0.55)");
  grad.addColorStop(0.85, "rgba(140,60,20,0.18)");
  grad.addColorStop(1.0, "rgba(140,60,20,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

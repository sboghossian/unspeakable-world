import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
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
  | "exotic"
  | "open-cluster"
  | "globular-cluster";

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

  // ─── Solar neighborhood — the gas we're flying through ────────────
  {
    name: "Local Interstellar Cloud",
    kind: "exotic",
    // Apex of the Sun's motion through the LIC — roughly RA 271°, Dec
    // +25° (Hercules), per Lallement et al. (2003) and Frisch (2006).
    raDeg: 271.0,
    decDeg: 25.0,
    detail:
      "The wispy ~30-ly cloud of warm partially-ionized hydrogen + helium the Sun has been traversing for ~60,000 years",
  },
  {
    name: "G-cloud",
    kind: "exotic",
    raDeg: 224.0,
    decDeg: -15.0,
    detail:
      "Neighbouring interstellar cloud · the Sun will cross into it in a few thousand years",
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

  // ─── Open star clusters (young, loose, in the galactic disk) ─────
  {
    name: "Pleiades (M45)",
    kind: "open-cluster",
    raDeg: 56.75,
    decDeg: 24.117,
    detail: "Open cluster · 1,000+ stars · 444 ly · Subaru / Seven Sisters",
  },
  {
    name: "Hyades",
    kind: "open-cluster",
    raDeg: 66.75,
    decDeg: 15.867,
    detail: "Open cluster · nearest at 153 ly · forms the V of Taurus",
  },
  {
    name: "Praesepe (M44)",
    kind: "open-cluster",
    raDeg: 130.05,
    decDeg: 19.683,
    detail: "Open cluster · Beehive · 1,000 stars · 577 ly · in Cancer",
  },
  {
    name: "Coma Berenices Cluster",
    kind: "open-cluster",
    raDeg: 186.0,
    decDeg: 26.0,
    detail: "Open cluster · 280 ly · close + sparse",
  },
  {
    name: "Double Cluster (NGC 869 / 884)",
    kind: "open-cluster",
    raDeg: 35.5,
    decDeg: 57.133,
    detail: "Two open clusters · ~7,500 ly · h + χ Persei",
  },
  {
    name: "Wild Duck Cluster (M11)",
    kind: "open-cluster",
    raDeg: 282.77,
    decDeg: -6.27,
    detail: "Open cluster · ~6,200 ly · 2,900 stars · in Scutum",
  },

  // ─── Globular clusters (old, dense, in the galactic halo) ────────
  {
    name: "M13 (Great Hercules Cluster)",
    kind: "globular-cluster",
    raDeg: 250.42,
    decDeg: 36.46,
    detail: "Globular cluster · 145,000 stars · 22,200 ly · 11.65 Gyr",
  },
  {
    name: "M22 (Sagittarius Cluster)",
    kind: "globular-cluster",
    raDeg: 279.1,
    decDeg: -23.9,
    detail: "Globular cluster · 70,000 stars · 10,400 ly · nearest big globular",
  },
  {
    name: "Omega Centauri (NGC 5139)",
    kind: "globular-cluster",
    raDeg: 201.7,
    decDeg: -47.48,
    detail: "Largest Milky Way globular · 10M stars · 17,090 ly · ex-dwarf-galaxy core",
  },
  {
    name: "47 Tucanae",
    kind: "globular-cluster",
    raDeg: 6.024,
    decDeg: -72.083,
    detail: "Globular cluster · 13,000 ly · second-brightest in the sky",
  },
  {
    name: "M3",
    kind: "globular-cluster",
    raDeg: 205.55,
    decDeg: 28.38,
    detail: "Globular cluster · 500,000 stars · 33,900 ly · in Canes Venatici",
  },
  {
    name: "M5",
    kind: "globular-cluster",
    raDeg: 229.64,
    decDeg: 2.08,
    detail: "Globular cluster · 100,000 stars · 24,500 ly · in Serpens",
  },
  {
    name: "M15",
    kind: "globular-cluster",
    raDeg: 322.49,
    decDeg: 12.17,
    detail: "Globular cluster · core-collapse · 33,600 ly · in Pegasus",
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

/**
 * Per-cluster visual profile for the 3D point field. Apparent angular
 * diameters from SEDS / SIMBAD. Open clusters render uniformly across
 * a small disk; globulars concentrate toward their core via a Gaussian
 * radial profile. The point colour is a tint applied to a soft round
 * sprite so the stars don't look like flat squares at any zoom.
 */
type ClusterProfile = {
  apparentDiameterDeg: number;
  starCount: number;
  /** Disk (open) vs ball with Gaussian-density (globular). */
  profile: "disk" | "ball";
  /** Tint applied to every star in the cluster. */
  tint: string;
};

const CLUSTER_PROFILES: Record<string, ClusterProfile> = {
  // Open clusters — young + loose. Tints lean blue-white.
  "Pleiades (M45)": {
    apparentDiameterDeg: 1.83,
    starCount: 280,
    profile: "disk",
    tint: "#cfe4ff",
  },
  Hyades: {
    apparentDiameterDeg: 5.5,
    starCount: 320,
    profile: "disk",
    tint: "#ffd9b0",
  },
  "Praesepe (M44)": {
    apparentDiameterDeg: 1.58,
    starCount: 220,
    profile: "disk",
    tint: "#fff1c8",
  },
  "Coma Berenices Cluster": {
    apparentDiameterDeg: 7.5,
    starCount: 200,
    profile: "disk",
    tint: "#fff5dc",
  },
  "Double Cluster (NGC 869 / 884)": {
    apparentDiameterDeg: 1.5,
    starCount: 380,
    profile: "disk",
    tint: "#d6e2ff",
  },
  "Wild Duck Cluster (M11)": {
    apparentDiameterDeg: 0.23,
    starCount: 320,
    profile: "disk",
    tint: "#ffe8b8",
  },
  // Globulars — old + dense. Yellow-orange tints, Gaussian profile.
  "M13 (Great Hercules Cluster)": {
    apparentDiameterDeg: 0.33,
    starCount: 600,
    profile: "ball",
    tint: "#ffd180",
  },
  "M22 (Sagittarius Cluster)": {
    apparentDiameterDeg: 0.53,
    starCount: 500,
    profile: "ball",
    tint: "#ffce72",
  },
  "Omega Centauri (NGC 5139)": {
    apparentDiameterDeg: 0.6,
    starCount: 800,
    profile: "ball",
    tint: "#ffd28a",
  },
  "47 Tucanae": {
    apparentDiameterDeg: 0.5,
    starCount: 700,
    profile: "ball",
    tint: "#ffd896",
  },
  M3: {
    apparentDiameterDeg: 0.3,
    starCount: 480,
    profile: "ball",
    tint: "#ffd182",
  },
  M5: {
    apparentDiameterDeg: 0.38,
    starCount: 500,
    profile: "ball",
    tint: "#ffd99c",
  },
  M15: {
    apparentDiameterDeg: 0.3,
    starCount: 520,
    profile: "ball",
    tint: "#ffd07a",
  },
};

const COLOR_BY_KIND: Record<LandmarkKind, string> = {
  "black-hole": "rgba(255, 130, 130, 0.95)",
  pulsar: "rgba(255, 200, 90, 0.95)",
  "supernova-remnant": "rgba(255, 110, 200, 0.95)",
  quasar: "rgba(190, 220, 255, 0.95)",
  agn: "rgba(120, 220, 255, 0.95)",
  exotic: "rgba(220, 180, 255, 0.95)",
  "open-cluster": "rgba(255, 235, 180, 0.95)",
  "globular-cluster": "rgba(255, 215, 130, 0.95)",
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
    const starSpriteTex = makeStarSpriteTexture();
    for (const lm of COSMIC_LANDMARKS) {
      // 3D point fields for star clusters — these go BEHIND the label
      // sprite so the label always reads on top. Each cluster gets
      // ~200-800 points scattered in a small angular patch, tinted by
      // the cluster's intrinsic colour.
      if (lm.kind === "open-cluster" || lm.kind === "globular-cluster") {
        const profile = CLUSTER_PROFILES[lm.name];
        if (profile) {
          const pts = buildClusterPoints(lm, profile, starSpriteTex);
          this.group.add(pts);
        }
      }
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
        // Bumped from 0.018 → 0.026 so the lensing halo + Doppler-beamed
        // accretion disk read at sky-view zoom without being too tiny.
        const dh = 0.026;
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
  const SIZE = 512;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.clearRect(0, 0, SIZE, SIZE);
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Layer 1 — outer gravitationally-lensed halo. Light from background
  // stars bent around the BH appears as a soft warm ring at ~150%
  // the Einstein-ring radius. We render it as a wider gradient so it
  // fades cleanly into the sky.
  const halo = ctx.createRadialGradient(cx, cy, SIZE * 0.32, cx, cy, SIZE * 0.5);
  halo.addColorStop(0.0, "rgba(255,200,140,0.0)");
  halo.addColorStop(0.55, "rgba(255,180,120,0.18)");
  halo.addColorStop(0.85, "rgba(220,140,80,0.08)");
  halo.addColorStop(1.0, "rgba(220,140,80,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Layer 2 — accretion disk + photon ring. Sharper than the previous
  // version so the Einstein ring reads cleanly. Inner ~20% radius is
  // pitch-black (event-horizon shadow).
  const disk = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE * 0.32);
  disk.addColorStop(0.0, "rgba(0,0,0,1.0)");
  disk.addColorStop(0.4, "rgba(0,0,0,0.96)");
  disk.addColorStop(0.5, "rgba(0,0,0,0.92)");
  disk.addColorStop(0.55, "rgba(255,230,170,1.0)"); // sharp photon ring peak
  disk.addColorStop(0.62, "rgba(255,180,90,0.92)");
  disk.addColorStop(0.78, "rgba(220,110,40,0.55)");
  disk.addColorStop(1.0, "rgba(180,80,30,0)");
  ctx.fillStyle = disk;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Layer 3 — relativistic Doppler beaming. The approaching side of the
  // disk is brighter (blueshifted + boosted intensity); the receding
  // side dimmer (redshifted). We paint the left half with a brightening
  // wedge so the disk reads as physically rotating, not just glowing.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(0, cy, SIZE, cy);
  beam.addColorStop(0.0, "rgba(255,240,200,0.45)");
  beam.addColorStop(0.45, "rgba(255,200,140,0.12)");
  beam.addColorStop(0.5, "rgba(0,0,0,0)");
  beam.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = beam;
  // Constrain the beaming to the disk annulus only (not the central shadow
  // or the outer halo) via a clipped ring.
  ctx.beginPath();
  ctx.arc(cx, cy, SIZE * 0.38, 0, Math.PI * 2);
  ctx.arc(cx, cy, SIZE * 0.18, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  // Layer 4 — wispy lensed-star arcs above and below the disk. Two
  // faint horizontal streaks at ~y = cy ± 8px simulating background
  // starlight bent into "secondary images" near the photon ring.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const arc1 = ctx.createLinearGradient(cx - SIZE * 0.28, 0, cx + SIZE * 0.28, 0);
  arc1.addColorStop(0.0, "rgba(255,220,180,0)");
  arc1.addColorStop(0.5, "rgba(255,220,180,0.45)");
  arc1.addColorStop(1.0, "rgba(255,220,180,0)");
  ctx.fillStyle = arc1;
  ctx.fillRect(cx - SIZE * 0.28, cy - SIZE * 0.08, SIZE * 0.56, 2);
  ctx.fillRect(cx - SIZE * 0.28, cy + SIZE * 0.08, SIZE * 0.56, 2);
  ctx.restore();

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/**
 * Soft round star sprite — radial gradient from a bright core to a
 * transparent rim. Shared across every cluster point so the point cloud
 * reads as actual stars rather than flat squares (the default Three.js
 * Points appearance).
 */
function makeStarSpriteTexture(): CanvasTexture {
  const SIZE = 64;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE / 2);
  grad.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.85)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.18)");
  grad.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/**
 * Build a Points cloud for a single cluster. We start with a frame whose
 * Z axis points toward the cluster's RA/Dec direction, scatter stars in
 * that frame's tangent plane (open clusters: uniform disk) or in a small
 * ball around the centre (globulars: Gaussian density), then rotate the
 * whole patch back into world coordinates.
 *
 * The resulting points sit at radii slightly less than 1.0 so they're
 * just inside the celestial-sphere shell where the labels live — that
 * keeps depth-order intuitive and makes the cluster read as a group
 * sitting "in front of" the chip label.
 */
function buildClusterPoints(
  lm: CosmicLandmark,
  profile: ClusterProfile,
  sprite: CanvasTexture,
): Points {
  const [cx, cy, cz] = raDecToVec3(lm.raDeg, lm.decDeg, 1);
  const center = new Vector3(cx, cy, cz);

  // Pick any vector not parallel to center, then build an orthonormal
  // basis (u, v, center) so we can scatter points in (u, v) and rotate
  // into world space.
  const ref =
    Math.abs(center.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const u = new Vector3().crossVectors(ref, center).normalize();
  const v = new Vector3().crossVectors(center, u).normalize();

  const halfAngleRad = (profile.apparentDiameterDeg * 0.5 * Math.PI) / 180;
  const angularRadius = Math.tan(halfAngleRad); // small-angle tan ≈ rad

  const positions = new Float32Array(profile.starCount * 3);
  const sizes = new Float32Array(profile.starCount);
  const tint = new Color(profile.tint);
  const colors = new Float32Array(profile.starCount * 3);

  // Use a tiny linear-congruential RNG so the layout is deterministic
  // across reloads (same cluster, same shape) but still hand-tuned per
  // cluster by the name string.
  let seed = hashString(lm.name);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < profile.starCount; i++) {
    let r: number;
    if (profile.profile === "ball") {
      // Gaussian-ish via Box-Muller, clamped to angularRadius.
      const u1 = Math.max(rand(), 1e-6);
      const u2 = rand();
      const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      r = Math.min(Math.abs(g) * angularRadius * 0.45, angularRadius);
    } else {
      // Open clusters: uniform disk with √ for area-fair sampling.
      r = Math.sqrt(rand()) * angularRadius;
    }
    const theta = rand() * 2 * Math.PI;
    const offsetU = r * Math.cos(theta);
    const offsetV = r * Math.sin(theta);

    // For globulars we also nudge stars along the line-of-sight to give
    // the ball some thickness. For open clusters we keep it flat — they
    // ARE flatter on the sky than they are deep.
    const radial =
      profile.profile === "ball" ? (rand() - 0.5) * angularRadius * 0.6 : 0;

    const x = center.x + u.x * offsetU + v.x * offsetV + center.x * radial;
    const y = center.y + u.y * offsetU + v.y * offsetV + center.y * radial;
    const z = center.z + u.z * offsetU + v.z * offsetV + center.z * radial;

    // Renormalize back to the celestial-sphere shell (a hair inside so
    // the cluster sits slightly behind labels).
    const norm = Math.hypot(x, y, z);
    const k = 0.9955 / norm;
    positions[i * 3] = x * k;
    positions[i * 3 + 1] = y * k;
    positions[i * 3 + 2] = z * k;

    // Slight per-star size variation so the cluster isn't uniform.
    sizes[i] = 0.0018 + rand() * 0.0028;
    // Slight per-star tint variation around the cluster's baseline.
    const jitter = 0.7 + rand() * 0.3;
    colors[i * 3] = tint.r * jitter;
    colors[i * 3 + 1] = tint.g * jitter;
    colors[i * 3 + 2] = tint.b * jitter;
  }

  const geom = new BufferGeometry();
  geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new Float32BufferAttribute(colors, 3));

  // We use PointsMaterial with vertexColors — per-star sizing would need
  // a custom shader and we want the LOWEST possible bundle hit. The
  // texture's soft falloff already gives the "real star" feel.
  const mat = new PointsMaterial({
    map: sprite,
    size: 0.0035,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    vertexColors: true,
    opacity: 0.95,
  });

  const points = new Points(geom, mat);
  points.renderOrder = 2; // behind labels (renderOrder 4) and BH disks (3)
  points.name = `cluster:${lm.name}`;
  return points;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * nebulae-catalog — hand-curated set of eight famous Deep-Sky-Object
 * nebulae rendered as volumetric raymarched boxes.
 *
 * Each row captures:
 *   • SIMBAD-resolvable id + display name
 *   • ICRS J2000 RA/Dec (degrees) for the sky-mode placement
 *   • Distance (parsecs) for the galactic/universe-mode placement, so the
 *     volume sits at the catalog's 3D position once the user flies into
 *     the galaxy. Distances are best-estimate values from Gaia DR3 +
 *     literature consensus (citations below).
 *   • Apparent angular diameter (arcminutes) — drives the sky-mode quad
 *     size.
 *   • Physical size (light-years) — drives the galactic-mode volume box.
 *   • A `shape` token consumed by the raymarch fragment shader to switch
 *     between bipolar-lobe, ring/torus, fan, bifurcated, filament and
 *     blob morphologies.
 *   • A 3-stop colour palette (core, mid, dust). The shader linearly
 *     blends these by density to produce HII pink-blue, dust-lane brown,
 *     planetary-nebula red+blue etc.
 *   • Tunable scalars (densityScale, dustStrength, glowStrength) so each
 *     nebula reads "right" without a per-shader rewrite.
 *
 * Distance references:
 *   • Orion M42: Menten+ 2007, Kounkel+ 2017 → 412 pc
 *   • Eagle M16: Bonatto+ 2006 → 1740 pc
 *   • Tarantula 30 Dor in LMC: Pietrzyński+ 2019 → 49 970 pc
 *   • Carina NGC 3372: Smith 2006 → 2300 pc
 *   • Veil NGC 6960: Fesen+ 2018 (Gaia DR2) → 735 pc
 *   • Crab M1: Trimble 1973 / Kaplan+ 2008 → 2000 pc
 *   • Helix NGC 7293: Harris+ 2007 (Hipparcos) → 200 pc
 *   • Ring M57: O'Dell+ 2007 → 700 pc
 *
 * Numbers are "good enough for visualisation"; the shaders are stylised,
 * not photometric.
 */

export type NebulaShape =
  | "fan"
  | "pillars"
  | "filaments-violet"
  | "bifurcated"
  | "veil-filaments"
  | "bipolar-pulsar"
  | "ring-torus"
  | "ring";

export type NebulaRow = {
  /** Stable id (used in mesh names + userData). */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** SIMBAD canonical id. */
  readonly simbadId: string;
  /** ICRS J2000 right ascension, degrees. */
  readonly raDeg: number;
  /** ICRS J2000 declination, degrees. */
  readonly decDeg: number;
  /** Distance, parsecs. */
  readonly distancePc: number;
  /** Apparent angular diameter, arcminutes (greatest extent). */
  readonly angularArcmin: number;
  /** Physical diameter, light-years (used for the volume box edge). */
  readonly physicalLy: number;
  /** Morphology bucket. */
  readonly shape: NebulaShape;
  /** Core / bright RGB (0..1, linear). */
  readonly coreColor: readonly [number, number, number];
  /** Mid-density RGB (the "body" colour). */
  readonly midColor: readonly [number, number, number];
  /** Dust / dark RGB (subtracted from disc as extinction reddening). */
  readonly dustColor: readonly [number, number, number];
  /** Overall density multiplier; 1.0 = baseline. */
  readonly densityScale: number;
  /** Dust-lane strength 0..1. */
  readonly dustStrength: number;
  /** Emission glow strength 0..2. */
  readonly glowStrength: number;
  /** Short hover-card blurb. */
  readonly note: string;
};

/* eslint-disable @typescript-eslint/no-magic-numbers */
export const NEBULAE_CATALOG: ReadonlyArray<NebulaRow> = [
  {
    id: "m42",
    name: "Orion Nebula (M42)",
    simbadId: "M 42",
    raDeg: 83.8221, // 5h35m17s
    decDeg: -5.3911, // -5°23'28"
    distancePc: 412,
    angularArcmin: 65,
    physicalLy: 24,
    shape: "fan",
    coreColor: [1.0, 0.55, 0.85], // HII pink-magenta
    midColor: [0.55, 0.65, 1.0], // ionised blue
    dustColor: [0.18, 0.09, 0.07], // dark Bok-globule brown
    densityScale: 1.0,
    dustStrength: 0.65,
    glowStrength: 1.4,
    note: "Nearest large star-forming region · 1344 ly · Trapezium ionising cluster.",
  },
  {
    id: "m16",
    name: "Eagle Nebula (M16)",
    simbadId: "M 16",
    raDeg: 274.7, // 18h18m48s
    decDeg: -13.7833, // -13°47'
    distancePc: 1740,
    angularArcmin: 35,
    physicalLy: 70,
    shape: "pillars",
    coreColor: [1.0, 0.75, 0.45], // Hubble-tan
    midColor: [0.85, 0.55, 0.35],
    dustColor: [0.35, 0.18, 0.12],
    densityScale: 1.05,
    dustStrength: 0.85,
    glowStrength: 0.95,
    note: "Pillars of Creation · towering dust columns lit from above by NGC 6611.",
  },
  {
    id: "ngc2070",
    name: "Tarantula Nebula (30 Doradus)",
    simbadId: "NGC 2070",
    raDeg: 84.6767, // 5h38m43s
    decDeg: -69.1011, // -69°06'
    distancePc: 49970, // in the Large Magellanic Cloud
    angularArcmin: 40,
    physicalLy: 650,
    shape: "filaments-violet",
    coreColor: [0.95, 0.6, 1.0], // violet-pink core
    midColor: [0.55, 0.4, 0.95], // deep violet filaments
    dustColor: [0.18, 0.1, 0.22],
    densityScale: 1.1,
    dustStrength: 0.35,
    glowStrength: 1.6,
    note: "Largest H II region in the Local Group · R136 super star cluster at its heart.",
  },
  {
    id: "ngc3372",
    name: "Carina Nebula",
    simbadId: "NGC 3372",
    raDeg: 161.265, // 10h45m
    decDeg: -59.8667, // -59°52'
    distancePc: 2300,
    angularArcmin: 120,
    physicalLy: 230,
    shape: "bifurcated",
    coreColor: [1.0, 0.75, 0.45], // eta Carinae orange
    midColor: [0.45, 0.75, 1.0], // ionised blue lobes
    dustColor: [0.22, 0.1, 0.07],
    densityScale: 1.0,
    dustStrength: 0.75,
    glowStrength: 1.55,
    note: "Eta Carinae · Keyhole dark cloud · brightest naked-eye southern nebula.",
  },
  {
    id: "ngc6960",
    name: "Veil Nebula",
    simbadId: "NGC 6960",
    raDeg: 311.25, // 20h45m
    decDeg: 30.7167, // +30°43'
    distancePc: 735,
    angularArcmin: 180,
    physicalLy: 110,
    shape: "veil-filaments",
    coreColor: [0.45, 1.0, 0.85], // cyan
    midColor: [0.3, 0.85, 1.0], // OIII teal
    dustColor: [0.06, 0.18, 0.16],
    densityScale: 0.85,
    dustStrength: 0.2,
    glowStrength: 1.3,
    note: "Cygnus Loop · supernova remnant · 10-20 kyr old · filaments at 170 km/s.",
  },
  {
    id: "m1",
    name: "Crab Nebula (M1)",
    simbadId: "M 1",
    raDeg: 83.6333, // 5h34m32s
    decDeg: 22.0144, // +22°00'52"
    distancePc: 2000,
    angularArcmin: 7,
    physicalLy: 11,
    shape: "bipolar-pulsar",
    coreColor: [1.0, 0.95, 1.0], // pulsar wind nebula white-blue
    midColor: [1.0, 0.45, 0.85], // synchrotron magenta
    dustColor: [0.25, 0.08, 0.18],
    densityScale: 0.95,
    dustStrength: 0.3,
    glowStrength: 1.7,
    note: "SN 1054 remnant · 30 Hz pulsar PSR B0531+21 powers the synchrotron glow.",
  },
  {
    id: "ngc7293",
    name: "Helix Nebula",
    simbadId: "NGC 7293",
    raDeg: 337.4108, // 22h29m38s
    decDeg: -20.8369, // -20°50'
    distancePc: 200,
    angularArcmin: 25,
    physicalLy: 2.9,
    shape: "ring-torus",
    coreColor: [0.45, 0.75, 1.0], // central blue OIII
    midColor: [1.0, 0.45, 0.45], // outer red Hα ring
    dustColor: [0.18, 0.06, 0.06],
    densityScale: 1.0,
    dustStrength: 0.25,
    glowStrength: 1.45,
    note: "Eye of God · closest planetary nebula · central white dwarf at 120 000 K.",
  },
  {
    id: "m57",
    name: "Ring Nebula (M57)",
    simbadId: "M 57",
    raDeg: 283.396, // 18h53m35s
    decDeg: 33.0292, // +33°01'45"
    distancePc: 700,
    angularArcmin: 1.4,
    physicalLy: 1.3,
    shape: "ring",
    coreColor: [0.6, 0.85, 1.0], // inner blue
    midColor: [1.0, 0.55, 0.35], // outer red
    dustColor: [0.18, 0.08, 0.06],
    densityScale: 1.05,
    dustStrength: 0.2,
    glowStrength: 1.4,
    note: "Donut planetary nebula in Lyra · 7 000 yr old · central white dwarf 100 000 K.",
  },
];
/* eslint-enable @typescript-eslint/no-magic-numbers */

/** Map shape token → small integer the raymarch shader switches on. */
export const SHAPE_INDEX: Readonly<Record<NebulaShape, number>> = {
  fan: 0,
  pillars: 1,
  "filaments-violet": 2,
  bifurcated: 3,
  "veil-filaments": 4,
  "bipolar-pulsar": 5,
  "ring-torus": 6,
  ring: 7,
};

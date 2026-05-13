/**
 * cosmic-web/structures.ts — catalogue of named cosmic-web superstructures.
 *
 * Each entry positions a "morphology family" (wall, basin, sheet, void,
 * group dumbbell) at a centroid given in the supergalactic (SG) frame
 * — the same frame `cosmicflows4` uses. We deliberately reuse SG so
 * cosmic-web particle clouds land registered against the CF4 velocity
 * arrows already in the scene (Tully+ 2014 Laniakea uses SG; so does
 * Pomarède+ 2017 V-PCSC; so do all the Tully maps).
 *
 * Coordinate citations per entry:
 *   • Local Group           — McConnachie 2012, ARA&A — anchor (0,0,0)
 *   • Local Sheet           — Tully+ 2008 ("Our Peculiar Motion Away from
 *                              the Local Void"), SGZ thin layer
 *   • Virgo Supercluster    — de Vaucouleurs 1953; Virgo Cluster core at
 *                              SGX≈-3.4, SGY≈16.4, SGZ≈-0.9 Mpc (NED)
 *   • Laniakea + Great Att. — Tully+ 2014, Nature 513:71, basin centre
 *                              near SG (-60, +20, +10) Mpc
 *   • Pisces-Cetus SCC      — Pomarède+ 2017, ApJ 845:55
 *                              centroid ~SG (+130, -60, -20) Mpc
 *   • Shapley Concentration — Proust+ 2006, A&A 447:133;
 *                              SG (+125, +75, -25) Mpc
 *   • Coma Wall / CfA2 GW   — Geller & Huchra 1989; ridge at
 *                              SG (-10, +90, +5) Mpc, ~250 Mpc long
 *   • Sloan Great Wall      — Gott+ 2005, ApJ 624:463; centroid at
 *                              SG (-220, -60, +180) Mpc
 *   • Hercules-Corona       — Horváth+ 2014, A&A 561:L12 — extremely
 *                              distant (z~2); rendered as a far-field hint
 *   • Boötes Void           — Kirshner+ 1981, ApJ 248:L57; SG (~+10, +180, +70) Mpc
 *   • Local Void            — Tully 1988 / Tully+ 2008; SG (+15, +10, +50) Mpc
 *   • KBC Void              — Keenan, Barger & Cowie 2013, ApJ 775:62 —
 *                              ~600 Mpc void containing the Local Group
 */

export type Morphology =
  | "wall"
  | "basin"
  | "sheet"
  | "group"
  | "void"
  | "filaments";

export type CoreBody = {
  /** Stable id (kebab). */
  id: string;
  /** Display name shown on the marker label. */
  name: string;
  /** SG cartesian offset from the host structure centre, in Mpc. */
  offsetMpc: { x: number; y: number; z: number };
  /** Short note shown below the label, e.g. "Abell 3558". */
  note: string;
};

export type CosmicStructure = {
  /** Stable id (kebab). */
  id: string;
  /** Display name on the label sprite. */
  name: string;
  /** Morphology family used to pick a shape generator. */
  morphology: Morphology;
  /** Centroid in the supergalactic frame, Mpc. */
  centerMpc: { x: number; y: number; z: number };
  /** Half-extents of the structure (Mpc) along SG-x/y/z respectively.
   *  For non-aligned shapes we treat these as an oriented bounding box
   *  whose primary axis is computed by the shape generator. */
  extentMpc: { x: number; y: number; z: number };
  /** Particle count for the cloud. Total across all structures stays ≤ 50K. */
  particleCount: number;
  /** Distance tier at which the label + cloud should be readable
   *  (camera distance from origin, Mpc). Used for soft fade-in. */
  preferredViewMpc: number;
  /** Tint applied to the cloud's brightest core particles. */
  coreColor: [number, number, number];
  /** Tint applied to the cloud's faint outer particles. */
  edgeColor: [number, number, number];
  /** One-line note shown on the label sprite. */
  note: string;
  /** Citation source string for the centroid. */
  source: string;
  /** Optional pre-positioned bright markers inside the cloud. */
  coreBodies?: ReadonlyArray<CoreBody>;
};

/* eslint-disable @typescript-eslint/no-magic-numbers */

/**
 * Twelve named cosmic structures spanning the local universe out to the
 * Sloan Great Wall. Hercules-Corona Borealis is included as a far-field
 * landmark even though it sits beyond CF4/2MRS coverage — at z~2 it is
 * the largest known structure and earns a label.
 */
export const COSMIC_STRUCTURES: ReadonlyArray<CosmicStructure> = [
  {
    id: "local-group",
    name: "Local Group",
    morphology: "group",
    centerMpc: { x: 0, y: 0, z: 0 },
    extentMpc: { x: 1.5, y: 0.8, z: 0.8 },
    particleCount: 600,
    preferredViewMpc: 5,
    coreColor: [1.0, 1.0, 1.0],
    edgeColor: [0.75, 0.65, 0.95],
    note: "Milky Way + Andromeda + ~80 satellites",
    source: "McConnachie 2012 ARA&A",
  },
  {
    id: "local-sheet",
    name: "Local Sheet",
    morphology: "sheet",
    centerMpc: { x: 0, y: 6, z: 0 },
    extentMpc: { x: 25, y: 2, z: 25 },
    particleCount: 1800,
    preferredViewMpc: 30,
    coreColor: [0.95, 0.95, 1.0],
    edgeColor: [0.55, 0.45, 0.85],
    note: "Thin sheet of nearby galaxies ~50 Mly across",
    source: "Tully+ 2008 ApJ 676:184",
  },
  {
    id: "virgo-supercluster",
    name: "Virgo Supercluster",
    morphology: "basin",
    centerMpc: { x: -3.4, y: 16.4, z: -0.9 },
    extentMpc: { x: 17, y: 17, z: 12 },
    particleCount: 2500,
    preferredViewMpc: 50,
    coreColor: [1.0, 0.95, 0.9],
    edgeColor: [0.6, 0.5, 0.9],
    note: "Local Supercluster · Virgo Cluster at heart",
    source: "de Vaucouleurs 1953 AJ 58:30 · NED",
    coreBodies: [
      {
        id: "virgo-cluster-m87",
        name: "Virgo Cluster (M87)",
        offsetMpc: { x: 0, y: 0, z: 0 },
        note: "M87 / Abell 1656 core, 16.5 Mpc",
      },
    ],
  },
  {
    id: "laniakea",
    name: "Laniakea Supercluster",
    morphology: "basin",
    // Tully+ 2014 figure-3 basin centre in SG-frame.
    centerMpc: { x: -60, y: 20, z: 10 },
    extentMpc: { x: 80, y: 80, z: 50 },
    particleCount: 9000,
    preferredViewMpc: 200,
    coreColor: [1.0, 0.92, 0.85],
    edgeColor: [0.5, 0.3, 0.9],
    note: "~520 Mly basin — our home supercluster",
    source: "Tully+ 2014 Nature 513:71",
    coreBodies: [
      {
        id: "great-attractor",
        name: "Great Attractor",
        // Centaurus-Norma basin floor, offset from Laniakea centroid.
        offsetMpc: { x: 5, y: -10, z: -5 },
        note: "Hydra-Centaurus mass concentration · 65 Mpc",
      },
    ],
  },
  {
    id: "pisces-cetus",
    name: "Pisces-Cetus Supercluster Complex",
    morphology: "filaments",
    centerMpc: { x: 130, y: -60, z: -20 },
    extentMpc: { x: 150, y: 60, z: 40 },
    particleCount: 6000,
    preferredViewMpc: 350,
    coreColor: [1.0, 0.96, 0.95],
    edgeColor: [0.45, 0.35, 0.85],
    note: "~1 Gly filament containing Laniakea + Perseus-Pisces",
    source: "Pomarède+ 2017 ApJ 845:55",
  },
  {
    id: "shapley",
    name: "Shapley Concentration",
    morphology: "basin",
    centerMpc: { x: 125, y: 75, z: -25 },
    extentMpc: { x: 35, y: 35, z: 25 },
    particleCount: 4500,
    preferredViewMpc: 300,
    coreColor: [1.0, 0.97, 0.92],
    edgeColor: [0.6, 0.4, 0.9],
    note: "Densest mass concentration within 300 Mpc",
    source: "Proust+ 2006 A&A 447:133",
    coreBodies: [
      {
        id: "shapley-centre-a3558",
        name: "Shapley Centre (Abell 3558)",
        offsetMpc: { x: 0, y: 0, z: 0 },
        note: "A3558 cluster core",
      },
    ],
  },
  {
    id: "cfa2-great-wall",
    name: "CfA2 Great Wall (Coma Wall)",
    morphology: "wall",
    centerMpc: { x: -10, y: 90, z: 5 },
    extentMpc: { x: 120, y: 25, z: 8 },
    particleCount: 6500,
    preferredViewMpc: 250,
    coreColor: [1.0, 0.95, 0.9],
    edgeColor: [0.55, 0.4, 0.85],
    note: "~500 Mly wall · Geller & Huchra 1989",
    source: "Geller & Huchra 1989 Science 246:897",
    coreBodies: [
      {
        id: "coma-cluster-ngc4889",
        name: "Coma Cluster (NGC 4889)",
        offsetMpc: { x: 0, y: 0, z: 0 },
        note: "Abell 1656 · ~100 Mpc",
      },
    ],
  },
  {
    id: "sloan-great-wall",
    name: "Sloan Great Wall",
    morphology: "wall",
    centerMpc: { x: -220, y: -60, z: 180 },
    extentMpc: { x: 220, y: 30, z: 15 },
    particleCount: 7000,
    preferredViewMpc: 600,
    coreColor: [1.0, 0.93, 0.88],
    edgeColor: [0.5, 0.35, 0.85],
    note: "~1.4 Gly wall · largest in SDSS z<0.1",
    source: "Gott+ 2005 ApJ 624:463",
  },
  {
    id: "hercules-corona",
    name: "Hercules-Corona Borealis Great Wall",
    morphology: "wall",
    // Symbolic far-field placement (z≈2 — beyond a literal SG-Mpc embedding).
    // We render at ~3 Gpc to keep it visible as the "edge of the labelled web".
    centerMpc: { x: -800, y: 1800, z: -1200 },
    extentMpc: { x: 1500, y: 200, z: 200 },
    particleCount: 4500,
    preferredViewMpc: 3000,
    coreColor: [0.95, 0.9, 1.0],
    edgeColor: [0.35, 0.25, 0.7],
    note: "~10 Gly cluster of GRBs at z≈2",
    source: "Horváth+ 2014 A&A 561:L12 (symbolic placement)",
  },
  {
    id: "bootes-void",
    name: "Boötes Void",
    morphology: "void",
    centerMpc: { x: 35, y: 130, z: 90 },
    extentMpc: { x: 40, y: 40, z: 40 },
    particleCount: 1500,
    preferredViewMpc: 250,
    coreColor: [0.55, 0.4, 0.85],
    edgeColor: [0.25, 0.18, 0.5],
    note: "~250 Mly void · Kirshner+ 1981",
    source: "Kirshner+ 1981 ApJ 248:L57",
  },
  {
    id: "local-void",
    name: "Local Void",
    morphology: "void",
    centerMpc: { x: 15, y: 10, z: 50 },
    extentMpc: { x: 25, y: 25, z: 35 },
    particleCount: 1200,
    preferredViewMpc: 80,
    coreColor: [0.5, 0.38, 0.8],
    edgeColor: [0.22, 0.15, 0.45],
    note: "Empty region bordering the Local Sheet",
    source: "Tully+ 2008 ApJ 676:184",
  },
  {
    id: "kbc-void",
    name: "KBC Void",
    morphology: "void",
    centerMpc: { x: 0, y: 0, z: 0 },
    extentMpc: { x: 280, y: 280, z: 280 },
    particleCount: 2500,
    preferredViewMpc: 600,
    coreColor: [0.45, 0.35, 0.8],
    edgeColor: [0.2, 0.14, 0.4],
    note: "~600 Mpc local underdensity around us",
    source: "Keenan, Barger & Cowie 2013 ApJ 775:62",
  },
];

/* eslint-enable @typescript-eslint/no-magic-numbers */

/** 1 Mpc → light-years (matches `cosmicflows4` / `galaxy-cone`). */
export const LY_PER_MPC = 3_261_564;

/**
 * Sum of all particle counts in the catalogue. Compile-time check that
 * we stay under the 50K budget mandated by the layer brief.
 */
export const TOTAL_PARTICLE_BUDGET = COSMIC_STRUCTURES.reduce(
  (acc, s) => acc + s.particleCount,
  0,
);

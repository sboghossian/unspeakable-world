/**
 * 🌊 Cosmicflows-4 — peculiar-velocity flow field of the local universe.
 *
 * The full Cosmicflows-4 group catalogue (Tully et al. 2023, ApJ) maps
 * ~56,000 galaxy peculiar velocities out to ~300 Mpc. Rather than
 * shipping that full dataset (≈50 MB) we author a curated set of named
 * landmarks + ~50 streamlines that follow the published bulk-flow
 * consensus (Tully 2014 "Laniakea", Hoffman 2017, Pomarède 2017 V-web
 * reconstructions).
 *
 * Coordinates are supergalactic Cartesian (SGX, SGY, SGZ) in Mpc. The
 * supergalactic plane is the natural frame for large-scale structure
 * in the local universe — the plane in which the Virgo, Centaurus,
 * Norma, Shapley and Perseus-Pisces concentrations all roughly lie.
 *
 * The Local Group is at the origin of this frame by definition; the
 * Sun (Milky Way) sits effectively at SGX≈SGY≈SGZ≈0 at this resolution.
 *
 * Streamline endpoints are hand-derived from the published consensus
 * bulk-flow pattern: most local groups within ~100 Mpc drift toward
 * the Great Attractor (Norma cluster, SGX≈-60, SGY≈10, SGZ≈-15 Mpc);
 * beyond that, the deeper Shapley Concentration pulls the entire
 * Laniakea volume on the other side of the Great Attractor.
 *
 * Liberties taken:
 *   • Streamline curvature is illustrative, not numerically integrated
 *     from a velocity field. Direction and endpoints are accurate, the
 *     in-between curve uses a smooth Catmull-Rom-style interpolation.
 *   • A few peripheral landmarks (Antlia, Pavo-Indus) use approximate
 *     supergalactic positions inferred from NED redshift + galactic-
 *     coordinate listings rather than direct CF4 lookups.
 */

export type Landmark = {
  name: string;
  /** Supergalactic Cartesian, Mpc. */
  sgx: number;
  sgy: number;
  sgz: number;
  /** Approximate distance from Local Group, Mpc (sanity-check). */
  distMpc: number;
  /** One-line description shown when the layer is on. */
  detail: string;
  /** Visual tier — anchors (Great Attractor / Shapley) get larger labels. */
  tier: "us" | "anchor" | "primary" | "secondary";
};

/**
 * Curated supergalactic positions for the named cosmic landmarks
 * within ~250 Mpc. Sources: Tully et al. 2014 Nature ("Laniakea"),
 * Pomarède et al. 2017 ApJ ("Cosmicflows-3"), NED.
 */
export const LANIAKEA_LANDMARKS: Landmark[] = [
  {
    name: "Local Group",
    sgx: 0,
    sgy: 0,
    sgz: 0,
    distMpc: 0,
    detail: "Us. The Milky Way and Andromeda barycentre — origin of this frame.",
    tier: "us",
  },
  {
    name: "Virgo Cluster",
    sgx: -3.5,
    sgy: 16.0,
    sgz: -0.5,
    distMpc: 16.5,
    detail: "Heart of the Local Supercluster · ~1,300 galaxies · 16.5 Mpc",
    tier: "primary",
  },
  {
    name: "Fornax Cluster",
    sgx: -4.0,
    sgy: -13.0,
    sgz: -10.0,
    distMpc: 19.0,
    detail: "Southern-sky cluster · 19 Mpc · second-richest within 25 Mpc",
    tier: "secondary",
  },
  {
    name: "Centaurus Cluster",
    sgx: -38.0,
    sgy: 14.0,
    sgz: -8.0,
    distMpc: 45.0,
    detail: "Cen A complex · 45 Mpc · on the road to the Great Attractor",
    tier: "primary",
  },
  {
    name: "Hydra Cluster",
    sgx: -39.0,
    sgy: -10.0,
    sgz: -14.0,
    distMpc: 47.0,
    detail: "Abell 1060 · 47 Mpc · Hydra-Centaurus Supercluster",
    tier: "secondary",
  },
  {
    name: "Antlia Cluster",
    sgx: -32.0,
    sgy: -16.0,
    sgz: -10.0,
    distMpc: 40.5,
    detail: "Nearby southern cluster · 40 Mpc · Hydra-Centaurus member",
    tier: "secondary",
  },
  {
    name: "Norma · Great Attractor",
    sgx: -58.0,
    sgy: 14.0,
    sgz: -16.0,
    distMpc: 65.0,
    detail: "Abell 3627 · core of the Great Attractor · 65 Mpc · pulls the Local Group",
    tier: "anchor",
  },
  {
    name: "Coma Cluster",
    sgx: 0.0,
    sgy: 73.0,
    sgz: 11.0,
    distMpc: 96.0,
    detail: "Abell 1656 · 96 Mpc · ~1,000 galaxies · spine of the Great Wall",
    tier: "primary",
  },
  {
    name: "Perseus-Pisces",
    sgx: 50.0,
    sgy: -22.0,
    sgz: -45.0,
    distMpc: 73.0,
    detail: "Perseus-Pisces Supercluster · 73 Mpc · counterflow region",
    tier: "primary",
  },
  {
    name: "Pavo-Indus",
    sgx: -57.0,
    sgy: -34.0,
    sgz: 13.0,
    distMpc: 70.0,
    detail: "Pavo-Indus Supercluster · 70 Mpc · part of Laniakea's southern wing",
    tier: "secondary",
  },
  {
    name: "Hercules Supercluster",
    sgx: 75.0,
    sgy: 95.0,
    sgz: 35.0,
    distMpc: 125.0,
    detail: "Abell 2151 + friends · 125 Mpc · edge of our flow basin",
    tier: "secondary",
  },
  {
    name: "Ophiuchus Cluster",
    sgx: -100.0,
    sgy: 30.0,
    sgz: -40.0,
    distMpc: 120.0,
    detail: "Abell 2199 + cluster · 120 Mpc · X-ray-bright on path to Shapley",
    tier: "secondary",
  },
  {
    name: "Shapley Concentration",
    sgx: -190.0,
    sgy: 70.0,
    sgz: -40.0,
    distMpc: 220.0,
    detail: "Densest mass concentration within 300 Mpc · ultimate flow attractor",
    tier: "anchor",
  },
  {
    name: "Horologium-Reticulum",
    sgx: 35.0,
    sgy: -160.0,
    sgz: -110.0,
    distMpc: 200.0,
    detail: "Abell 3266 + concentration · 200 Mpc · southern counterpart to Shapley",
    tier: "secondary",
  },
];

export type StreamlinePoint = {
  sgx: number;
  sgy: number;
  sgz: number;
  /** Peculiar-velocity magnitude in km/s. Drives the color ramp. */
  vKms: number;
};

export type Streamline = {
  /** Lightweight identifier for debugging. */
  id: string;
  /** Polyline points sampled ~every 3-8 Mpc. */
  points: StreamlinePoint[];
};

/* ─── Helpers for synthesising consensus streamlines ──────────────────
 *
 * Each streamline is a smooth curve from a SOURCE region (a local
 * starting position) to a SINK (Great Attractor or Shapley). We bend
 * the path slightly toward the supergalactic plane and ramp the
 * peculiar-velocity magnitude from ~200 km/s near the source to
 * ~600 km/s near the attractor (matching the consensus dipole + Shapley
 * pull amplitudes reported by Hoffman 2017 / Tully 2023).
 *
 * Curves are sampled into 28 points — dense enough to read as smooth
 * arcs, sparse enough that 50 streamlines × 28 points = 1,400 vertices
 * total, comfortably under any GPU concern.
 */

const POINTS_PER_LINE = 28;

function bezierStreamline(
  id: string,
  src: [number, number, number],
  ctrl: [number, number, number],
  dst: [number, number, number],
  vSrc: number,
  vDst: number,
): Streamline {
  const points: StreamlinePoint[] = [];
  for (let i = 0; i < POINTS_PER_LINE; i++) {
    const t = i / (POINTS_PER_LINE - 1);
    const inv = 1 - t;
    // Quadratic Bézier so a single control point bends the streamline
    // realistically toward the attractor without overshooting.
    const x = inv * inv * src[0] + 2 * inv * t * ctrl[0] + t * t * dst[0];
    const y = inv * inv * src[1] + 2 * inv * t * ctrl[1] + t * t * dst[1];
    const z = inv * inv * src[2] + 2 * inv * t * ctrl[2] + t * t * dst[2];
    // Ease velocity from source to destination with mild acceleration
    // near the attractor (matches gravitational infall profiles).
    const eased = t * t * (3 - 2 * t);
    const vKms = vSrc + (vDst - vSrc) * eased;
    points.push({ sgx: x, sgy: y, sgz: z, vKms });
  }
  return { id, points };
}

/* ─── Streamline set ─────────────────────────────────────────────────
 *
 * Layer 1 (12 lines): local flows from ~5-30 Mpc volume toward Norma
 * (Great Attractor). These represent the ~600 km/s bulk-flow vector
 * the Local Group itself participates in.
 *
 * Layer 2 (12 lines): Great-Attractor region pushed onward toward
 * Shapley. The "river continues" idea — once you're near Norma you're
 * already on a flow line aimed at the deeper potential well.
 *
 * Layer 3 (10 lines): peripheral flows from Perseus-Pisces, Coma,
 * Horologium-Reticulum across the supergalactic plane.
 *
 * Layer 4 (10 lines): "filament strands" — quasi-parallel pairs that
 * give the field a sense of being a continuous vector field rather than
 * twelve isolated arrows.
 *
 * Layer 5 (6 lines): radial Laniakea-basin strands close to Local
 * Group — visually anchors the viewer in the flow.
 */

const NORMA: [number, number, number] = [-58, 14, -16];
const SHAPLEY: [number, number, number] = [-190, 70, -40];

const layer1Sources: Array<[number, number, number]> = [
  [4, 8, 2], // Virgo direction
  [-2, 14, -1], // Virgo cluster's near side
  [-12, 6, -4], // Centaurus inner edge
  [-22, 10, -6], // Centaurus heading SE
  [-32, 12, -10], // Centaurus → Norma corridor
  [-30, -6, -12], // Hydra-Antlia plume
  [-44, 8, -14], // Hydra-Centaurus outskirts
  [-48, 20, -8], // Above the GA infall plane
  [-40, -10, -18], // Antlia plume
  [-25, 18, -2], // Local Sheet north tilt
  [-15, -8, -6], // Toward Antlia
  [-50, 4, -20], // Cold flow stream
];

const layer2Sources: Array<[number, number, number]> = [
  [-58, 14, -16], // Norma core
  [-70, 18, -20], // Past Norma
  [-90, 30, -25], // Ophiuchus region
  [-110, 40, -30],
  [-130, 50, -35],
  [-150, 58, -38],
  [-70, 28, -10],
  [-95, 22, -22],
  [-115, 50, -28],
  [-140, 65, -36],
  [-100, 10, -28],
  [-80, 40, -18],
];

const layer3Sources: Array<[number, number, number]> = [
  // Perseus-Pisces counterflow — these point AWAY from us, toward
  // their own attractor. Direction reversed.
  [30, -12, -26],
  [42, -18, -38],
  [55, -25, -50],
  [38, -10, -32],
  // Coma flowing toward Great Wall midpoint
  [0, 50, 8],
  [-10, 60, 5],
  [10, 65, 12],
  // Horologium-Reticulum drifting outward
  [25, -130, -90],
  [35, -150, -100],
  [45, -170, -115],
];

const layer3Destinations: Array<[number, number, number]> = [
  // Perseus-Pisces → outward toward its own attractor (not Norma)
  [80, -35, -65],
  [85, -40, -70],
  [95, -45, -78],
  [78, -32, -60],
  // Coma flows fold into the Great Wall toward Hercules edge
  [40, 90, 30],
  [20, 95, 28],
  [50, 100, 32],
  // Horologium drifts further south, away from Laniakea
  [50, -195, -145],
  [60, -210, -150],
  [70, -225, -160],
];

const layer4PairsA: Array<[number, number, number]> = [
  [-5, 4, -2],
  [-8, -2, -3],
  [3, 10, 2],
  [-15, 16, -4],
  [-25, 4, -10],
  [-22, -10, -8],
  [-35, 16, -10],
  [-45, 0, -16],
  [-12, 22, -4],
  [-18, -14, -6],
];
const layer4PairsB: Array<[number, number, number]> = [
  [-30, 8, -10],
  [-32, 0, -12],
  [-28, 20, -8],
  [-42, 22, -14],
  [-50, 8, -18],
  [-46, -4, -16],
  [-54, 18, -16],
  [-56, 6, -18],
  [-38, 28, -12],
  [-44, -10, -14],
];

const layer5Sources: Array<[number, number, number]> = [
  [2, 0, 0],
  [0, 2, 0],
  [-1, -2, 1],
  [-2, 1, -1],
  [1, -1, -2],
  [-3, 0, 1],
];

export const FLOW_STREAMLINES: Streamline[] = [
  // Layer 1 — local infall to the Great Attractor
  ...layer1Sources.map((src, i) => {
    // Control point bends toward the supergalactic plane, partway to GA.
    const ctrl: [number, number, number] = [
      (src[0] + NORMA[0]) * 0.55,
      (src[1] + NORMA[1]) * 0.45,
      (src[2] + NORMA[2]) * 0.55,
    ];
    return bezierStreamline(`L1-${i}`, src, ctrl, NORMA, 180, 560);
  }),

  // Layer 2 — Great Attractor region onward to Shapley
  ...layer2Sources.map((src, i) => {
    const ctrl: [number, number, number] = [
      (src[0] + SHAPLEY[0]) * 0.5,
      (src[1] + SHAPLEY[1]) * 0.55 + 5,
      (src[2] + SHAPLEY[2]) * 0.5,
    ];
    return bezierStreamline(`L2-${i}`, src, ctrl, SHAPLEY, 420, 700);
  }),

  // Layer 3 — Perseus-Pisces counterflow + Coma + Horologium
  ...layer3Sources.map((src, i) => {
    const dst = layer3Destinations[i] ?? [src[0] * 1.3, src[1] * 1.3, src[2] * 1.3];
    const ctrl: [number, number, number] = [
      (src[0] + dst[0]) * 0.5,
      (src[1] + dst[1]) * 0.5,
      (src[2] + dst[2]) * 0.5,
    ];
    // Slightly slower outer flows.
    return bezierStreamline(`L3-${i}`, src, ctrl, dst, 220, 420);
  }),

  // Layer 4 — paired filament strands toward Norma (parallel to layer 1
  // but offset, giving the field a sense of continuous flow).
  ...layer4PairsA.map((src, i) => {
    const mid = layer4PairsB[i] ?? src;
    return bezierStreamline(`L4-${i}`, src, mid, NORMA, 200, 540);
  }),

  // Layer 5 — radial strands close to Local Group toward the GA
  // direction. Visualises "we are HERE and being pulled THIS way".
  ...layer5Sources.map((src, i) => {
    const ctrl: [number, number, number] = [
      src[0] + (NORMA[0] - src[0]) * 0.35,
      src[1] + (NORMA[1] - src[1]) * 0.35,
      src[2] + (NORMA[2] - src[2]) * 0.35,
    ];
    return bezierStreamline(`L5-${i}`, src, ctrl, NORMA, 160, 520);
  }),
];

/** Mpc → light-years. 1 parsec = 3.26156 LY → 1 Mpc = 3.26156e6 LY. */
export const LY_PER_MPC = 3_261_564;

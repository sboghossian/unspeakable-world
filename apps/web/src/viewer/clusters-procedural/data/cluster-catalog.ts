/**
 * cluster-catalog — 9 famous star clusters rendered as procedural Points
 * clouds (open clusters with exponential density, globulars with a
 * King-model-ish power-law core + truncation radius).
 *
 * Each row carries:
 *   • Stable id + display name + SIMBAD canonical id
 *   • ICRS J2000 RA/Dec (degrees) and heliocentric distance (parsecs)
 *     from Gaia DR3 / literature consensus
 *   • Cluster bucket (open | globular)
 *   • Total star count we instantiate as Points (NOT the real population
 *     — that would be tens of millions for Omega Cen; we sample a
 *     representative subset that still reads as "very dense globular"
 *     visually).
 *   • Half-light radius (parsecs) — the disc radius at which 50% of the
 *     stars fall inside (open clusters: tidal radius ~ 5× half-light).
 *   • Truncation radius (parsecs) — outer edge of the sampling.
 *   • B-V colour spread — (mean, halfWidth). Drives the stellar
 *     temperature distribution we hand to the shader: very metal-poor
 *     globulars (NGC 6397) get a tight low-BV / blue HB; old open
 *     clusters (Hyades) get a broad gentle spread.
 *   • A small note string for hover.
 *
 * Distance / mass / population references:
 *   • Pleiades M45: Galli+ 2017 Gaia DR2 → 136 pc, ~1000 members
 *   • Hyades: Gaia DR2 → 47 pc, ~400 stars (Aldebaran is foreground)
 *   • M13 Hercules: Harris 1996 (2010 ed.) → 6900 pc, ~300k stars
 *   • M22 Sgr: Harris 1996 → 3200 pc, ~83k stars (or 500k by some refs)
 *   • Omega Cen NGC 5139: Harris 1996 → 5400 pc, ~10M stars
 *   • NGC 6397: Brown+ 2018 (Gaia DR2) → 2390 pc, very metal-poor
 *   • Praesepe M44 Beehive: Gaia DR2 → 187 pc, ~1000 members
 *   • 47 Tuc NGC 104: Harris 1996 → 4500 pc, ~1M stars
 *   • Double Cluster NGC 869+884: Currie+ 2010 → 2280 pc, ~10k stars
 */

export type ClusterType = "open" | "globular";

export type ClusterRow = {
  readonly id: string;
  readonly name: string;
  readonly simbadId: string;
  readonly raDeg: number;
  readonly decDeg: number;
  /** Heliocentric distance, parsecs. */
  readonly distancePc: number;
  readonly clusterType: ClusterType;
  /** Number of stars we instantiate as Points. */
  readonly starCount: number;
  /** Half-light radius, parsecs (≈ effective radius). */
  readonly halfLightPc: number;
  /** Truncation radius, parsecs (Points are sampled inside this sphere). */
  readonly truncationPc: number;
  /** B-V colour distribution: [mean, halfWidth]. */
  readonly bvMean: number;
  readonly bvHalfWidth: number;
  /** Apparent integrated magnitude (V). */
  readonly magnitude: number;
  /** Short hover-card note. */
  readonly note: string;
};

/* eslint-disable @typescript-eslint/no-magic-numbers */
export const CLUSTERS_CATALOG: ReadonlyArray<ClusterRow> = [
  {
    id: "m45",
    name: "Pleiades (M45)",
    simbadId: "M 45",
    raDeg: 56.75, // 3h47m
    decDeg: 24.117, // +24°07'
    distancePc: 136,
    clusterType: "open",
    starCount: 1000,
    halfLightPc: 3.0,
    truncationPc: 18.0,
    bvMean: -0.1, // mostly hot B-class
    bvHalfWidth: 0.6,
    magnitude: 1.6,
    note: "Seven Sisters · young (~115 Myr) blue B-class siblings still wrapped in reflection dust.",
  },
  {
    id: "hyades",
    name: "Hyades",
    simbadId: "C 0424+157",
    raDeg: 67.5, // 4h30m
    decDeg: 15.867, // +15°52'
    distancePc: 47,
    clusterType: "open",
    starCount: 400,
    halfLightPc: 2.5,
    truncationPc: 10.0,
    bvMean: 0.55, // older, redder than Pleiades
    bvHalfWidth: 0.45,
    magnitude: 0.5,
    note: "Nearest open cluster · 625 Myr old · Aldebaran is a foreground unrelated giant.",
  },
  {
    id: "m13",
    name: "M13 Hercules",
    simbadId: "M 13",
    raDeg: 250.4233, // 16h41m41s
    decDeg: 36.4581, // +36°27'
    distancePc: 6900,
    clusterType: "globular",
    starCount: 60000,
    halfLightPc: 2.5,
    truncationPc: 50.0,
    bvMean: 0.7, // old population
    bvHalfWidth: 0.5,
    magnitude: 5.8,
    note: "Great Hercules Cluster · ~300k stars · ~11.7 Gyr old · target of the 1974 Arecibo message.",
  },
  {
    id: "m22",
    name: "M22 Sagittarius",
    simbadId: "M 22",
    raDeg: 279.1, // 18h36m24s
    decDeg: -23.9, // -23°54'
    distancePc: 3200,
    clusterType: "globular",
    starCount: 40000,
    halfLightPc: 3.0,
    truncationPc: 45.0,
    bvMean: 0.7,
    bvHalfWidth: 0.55,
    magnitude: 5.1,
    note: "One of the closest globulars · contains two confirmed planetary-mass black holes.",
  },
  {
    id: "omega-cen",
    name: "Omega Centauri",
    simbadId: "NGC 5139",
    raDeg: 201.6917, // 13h26m46s
    decDeg: -47.4769, // -47°28'
    distancePc: 5400,
    clusterType: "globular",
    starCount: 120000,
    halfLightPc: 7.5,
    truncationPc: 70.0,
    bvMean: 0.65,
    bvHalfWidth: 0.65,
    magnitude: 3.7,
    note: "Largest, most massive globular in the Milky Way · suspected stripped dwarf-galaxy nucleus.",
  },
  {
    id: "ngc6397",
    name: "NGC 6397",
    simbadId: "NGC 6397",
    raDeg: 265.175, // 17h40m42s
    decDeg: -53.6744, // -53°40'
    distancePc: 2390,
    clusterType: "globular",
    starCount: 30000,
    halfLightPc: 2.0,
    truncationPc: 30.0,
    bvMean: 0.45, // very metal-poor → blue HB
    bvHalfWidth: 0.55,
    magnitude: 5.7,
    note: "Closest core-collapsed globular · extremely metal-poor · blue horizontal branch.",
  },
  {
    id: "m44",
    name: "Praesepe (M44 Beehive)",
    simbadId: "M 44",
    raDeg: 130.025, // 8h40m06s
    decDeg: 19.6822, // +19°41'
    distancePc: 187,
    clusterType: "open",
    starCount: 800,
    halfLightPc: 3.5,
    truncationPc: 12.0,
    bvMean: 0.45, // intermediate age
    bvHalfWidth: 0.5,
    magnitude: 3.7,
    note: "Beehive Cluster · 600-700 Myr · contains the first exoplanet found orbiting a Sun-like cluster star.",
  },
  {
    id: "47tuc",
    name: "47 Tucanae",
    simbadId: "NGC 104",
    raDeg: 6.0233, // 0h24m05s
    decDeg: -72.0814, // -72°04'
    distancePc: 4500,
    clusterType: "globular",
    starCount: 80000,
    halfLightPc: 3.2,
    truncationPc: 50.0,
    bvMean: 0.75,
    bvHalfWidth: 0.55,
    magnitude: 4.1,
    note: "Second-brightest globular · ~1M stars · dense core · home to many millisecond pulsars.",
  },
  {
    id: "double-cluster",
    name: "Double Cluster (NGC 869 + 884)",
    simbadId: "NGC 869",
    raDeg: 34.7417, // 2h18m58s (NGC 869 centre)
    decDeg: 57.1486, // +57°08'
    distancePc: 2280,
    clusterType: "open",
    starCount: 1500, // both NGC 869 + 884 combined (one Points cloud)
    halfLightPc: 6.0, // covers both cores
    truncationPc: 22.0,
    bvMean: -0.05, // very young hot stars
    bvHalfWidth: 0.55,
    magnitude: 4.3,
    note: "Two young open clusters in Perseus · ~13 Myr old · favourite binocular target.",
  },
];
/* eslint-enable @typescript-eslint/no-magic-numbers */

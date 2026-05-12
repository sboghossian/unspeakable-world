/**
 * 🌑 Dark-matter halo catalog.
 *
 * Hand-authored from published reviews of Local Group + Virgo Supercluster
 * mass distributions. Each entry is a conceptual halo: the inferred
 * (mostly-DM) gravitational envelope around a known galaxy or cluster,
 * not a particle-simulation snapshot.
 *
 * Two coordinate flavors are supported per entry:
 *
 *   1. Sky-aligned   — (raDeg, decDeg, distanceLY) for nearby halos that
 *      we want to render at a real on-sky position (M31, M33, the LMC,
 *      Centaurus A, Virgo cluster, …).
 *
 *   2. Supergalactic — (sgxMpc, sgyMpc, sgzMpc) for the broader Local
 *      Volume + Virgo Supercluster, where the SGL/SGB frame makes the
 *      flattened supergalactic plane geometry intuitive.
 *
 * Mass / R_vir sources (rounded for readability):
 *   - Milky Way:  Boylan-Kolchin et al. 2013 (M_vir ≈ 1.0-1.6 × 10^12 M☉)
 *   - M31:        van der Marel et al. 2012 (M_vir ≈ 1.5 × 10^12 M☉)
 *   - LMC/SMC/M33: Karachentsev 2014 Local Group review
 *   - Virgo cluster: Fouqué et al. 2001 (M ≈ 1.2 × 10^15 M☉)
 *   - Fornax cluster: Drinkwater et al. 2001
 *   - Centaurus A group: Karachentsev 2007
 *
 * All numbers are approximate within the published 1-σ range. The point
 * of this overlay is conceptual scale, not 4-decimal-place precision.
 */

export type DarkMatterHalo = {
  id: string;
  hostName: string;
  /** Sky right ascension (deg). Set together with decDeg + distanceLY. */
  raDeg?: number;
  decDeg?: number;
  /** Distance from the observer in light-years. */
  distanceLY?: number;
  /** Supergalactic Cartesian coords (Mpc). Set together with sgyMpc + sgzMpc. */
  sgxMpc?: number;
  sgyMpc?: number;
  sgzMpc?: number;
  /** Total halo mass (M☉), including the dark-matter component. */
  massMsun: number;
  /** Virial radius (kpc) — the conventional outer edge of the halo. */
  virialRadiusKpc: number;
  /** One-line caption shown in tooltips / info copy. */
  detail: string;
};

export const DARK_MATTER_HALOS: DarkMatterHalo[] = [
  // ─── Local Group ────────────────────────────────────────────────
  {
    id: "mw-halo",
    hostName: "Milky Way",
    distanceLY: 0,
    raDeg: 266.4,
    decDeg: -28.94,
    massMsun: 1.5e12,
    virialRadiusKpc: 220,
    detail:
      "Our home halo · ~1.5 × 10¹² M☉ · R_vir ≈ 220 kpc · ~85% dark matter",
  },
  {
    id: "m31-halo",
    hostName: "Andromeda (M31)",
    raDeg: 10.6847,
    decDeg: 41.2687,
    distanceLY: 2.54e6,
    massMsun: 1.5e12,
    virialRadiusKpc: 250,
    detail:
      "M31 halo · comparable to the Milky Way · 2.54 Mly · merging with us in 4.5 Gyr",
  },
  {
    id: "m33-halo",
    hostName: "Triangulum (M33)",
    raDeg: 23.4621,
    decDeg: 30.6602,
    distanceLY: 2.73e6,
    massMsun: 5e11,
    virialRadiusKpc: 160,
    detail: "M33 halo · third-largest Local Group member · 2.73 Mly",
  },
  {
    id: "lmc-halo",
    hostName: "Large Magellanic Cloud",
    raDeg: 80.8939,
    decDeg: -69.7561,
    distanceLY: 1.63e5,
    massMsun: 2e11,
    virialRadiusKpc: 115,
    detail: "LMC halo · massive satellite of the Milky Way · ~2 × 10¹¹ M☉",
  },
  {
    id: "smc-halo",
    hostName: "Small Magellanic Cloud",
    raDeg: 13.1583,
    decDeg: -72.8003,
    distanceLY: 2.0e5,
    massMsun: 7e9,
    virialRadiusKpc: 45,
    detail: "SMC halo · stripped companion of the LMC · ~7 × 10⁹ M☉",
  },
  {
    id: "ngc-3109-halo",
    hostName: "NGC 3109",
    raDeg: 150.7799,
    decDeg: -26.1597,
    distanceLY: 4.3e6,
    massMsun: 3e10,
    virialRadiusKpc: 70,
    detail: "Outer Local Group dwarf · ~4.3 Mly · isolated subhalo",
  },
  {
    id: "ic-10-halo",
    hostName: "IC 10",
    raDeg: 5.0726,
    decDeg: 59.2914,
    distanceLY: 2.2e6,
    massMsun: 4e10,
    virialRadiusKpc: 80,
    detail: "Starburst dwarf · M31 satellite · ~2.2 Mly",
  },

  // ─── Nearby groups (sky-anchored, distances in LY) ───────────────
  {
    id: "centaurus-a-halo",
    hostName: "Centaurus A (NGC 5128)",
    raDeg: 201.3651,
    decDeg: -43.0192,
    distanceLY: 1.34e7,
    massMsun: 1.5e13,
    virialRadiusKpc: 400,
    detail: "Cen A group halo · nearest giant elliptical · 13.4 Mly",
  },
  {
    id: "m81-halo",
    hostName: "M81 group",
    raDeg: 148.8882,
    decDeg: 69.0653,
    distanceLY: 1.18e7,
    massMsun: 1.2e13,
    virialRadiusKpc: 360,
    detail: "M81/M82 group halo · 11.8 Mly · post-encounter system",
  },
  {
    id: "ic-342-halo",
    hostName: "IC 342 / Maffei group",
    raDeg: 56.7021,
    decDeg: 68.0961,
    distanceLY: 1.1e7,
    massMsun: 8e12,
    virialRadiusKpc: 320,
    detail: "Hidden behind the Milky Way disk · ~11 Mly",
  },
  {
    id: "m83-halo",
    hostName: "M83 / NGC 5253",
    raDeg: 204.2538,
    decDeg: -29.8657,
    distanceLY: 1.5e7,
    massMsun: 6e12,
    virialRadiusKpc: 290,
    detail: "Southern Pinwheel group halo · ~15 Mly",
  },

  // ─── Virgo Supercluster & beyond (supergalactic Mpc) ─────────────
  {
    id: "virgo-cluster-halo",
    hostName: "Virgo Cluster (M87)",
    raDeg: 187.7059,
    decDeg: 12.391,
    distanceLY: 5.4e7,
    sgxMpc: -3.5,
    sgyMpc: 16.8,
    sgzMpc: -0.6,
    massMsun: 1.2e15,
    virialRadiusKpc: 2200,
    detail:
      "Virgo Cluster halo · ~1,300 galaxies · ~1.2 × 10¹⁵ M☉ · 54 Mly · core of our supercluster",
  },
  {
    id: "fornax-cluster-halo",
    hostName: "Fornax Cluster (NGC 1399)",
    raDeg: 54.6213,
    decDeg: -35.4505,
    distanceLY: 6.2e7,
    sgxMpc: -13.4,
    sgyMpc: -12.4,
    sgzMpc: -5.6,
    massMsun: 7e13,
    virialRadiusKpc: 700,
    detail:
      "Fornax Cluster halo · second-richest within 100 Mly · ~62 Mly",
  },
  {
    id: "eridanus-cluster-halo",
    hostName: "Eridanus Cluster",
    raDeg: 53.0,
    decDeg: -21.5,
    distanceLY: 7.5e7,
    sgxMpc: -16.0,
    sgyMpc: -9.5,
    sgzMpc: -3.0,
    massMsun: 4e13,
    virialRadiusKpc: 600,
    detail: "Eridanus group complex · ~75 Mly · filament toward Fornax",
  },
  {
    id: "norma-cluster-halo",
    hostName: "Norma Cluster (Great Attractor)",
    raDeg: 243.5,
    decDeg: -60.9,
    distanceLY: 2.2e8,
    sgxMpc: -52.0,
    sgyMpc: 16.0,
    sgzMpc: -8.0,
    massMsun: 1e15,
    virialRadiusKpc: 1900,
    detail:
      "Norma / Great Attractor · gravitational anchor pulling the Local Group at 600 km/s",
  },
  {
    id: "coma-cluster-halo",
    hostName: "Coma Cluster",
    raDeg: 194.95,
    decDeg: 27.98,
    distanceLY: 3.21e8,
    sgxMpc: 0.0,
    sgyMpc: 80.0,
    sgzMpc: 25.0,
    massMsun: 7e14,
    virialRadiusKpc: 2900,
    detail: "Coma Cluster · ~1,000 galaxies · 321 Mly · classic rich cluster",
  },
  {
    id: "perseus-cluster-halo",
    hostName: "Perseus Cluster",
    raDeg: 49.95,
    decDeg: 41.51,
    distanceLY: 2.4e8,
    sgxMpc: -25.0,
    sgyMpc: 19.0,
    sgzMpc: 60.0,
    massMsun: 6.7e14,
    virialRadiusKpc: 2700,
    detail:
      "Perseus Cluster halo · brightest X-ray cluster in the sky · 240 Mly",
  },
  {
    id: "leo-cluster-halo",
    hostName: "Leo Cluster (Abell 1367)",
    raDeg: 176.0,
    decDeg: 19.84,
    distanceLY: 3.3e8,
    sgxMpc: -2.0,
    sgyMpc: 82.0,
    sgzMpc: -12.0,
    massMsun: 3e14,
    virialRadiusKpc: 1800,
    detail: "Leo Cluster · companion of Coma · ~330 Mly",
  },
  {
    id: "hercules-cluster-halo",
    hostName: "Hercules Cluster (Abell 2151)",
    raDeg: 241.3,
    decDeg: 17.74,
    distanceLY: 5.0e8,
    sgxMpc: 88.0,
    sgyMpc: 70.0,
    sgzMpc: 4.0,
    massMsun: 2e14,
    virialRadiusKpc: 1500,
    detail: "Hercules Cluster · spiral-rich · ~500 Mly",
  },
];

/** Convert solar masses to a logarithmic scale factor for rendering size. */
export function massScaleFactor(massMsun: number): number {
  // log10(massMsun / 1e10), clamped to [0, 5] — Milky Way is ~2.18, Virgo ~5.
  const logRel = Math.log10(massMsun / 1e10);
  return Math.max(0, Math.min(5, logRel));
}

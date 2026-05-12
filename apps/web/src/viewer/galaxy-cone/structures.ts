/**
 * galaxy-cone/structures.ts — named cosmic structures overlay.
 *
 * Each entry is a bounding sphere in galactic-frame light-years
 * (matches `universe-scene` / `dark-matter-field` SUN_LY = 26 kly
 * convention). On hover we surface the name + a one-line note.
 *
 * Distance / sky-position references:
 *   • Local Group         — McConnachie 2012 review (~1 Mpc envelope)
 *   • Virgo Cluster       — Mei 2007 SBF distance ≈ 16.5 Mpc
 *   • Coma Cluster        — Carter 2008 ≈ 100 Mpc
 *   • Great Wall (CfA2)   — Geller & Huchra 1989, ridge at ~80 Mpc
 *   • Hercules/Perseus    — NED redshift-distance averages
 *   • Hydra-Centaurus     — "Great Attractor" basin, ~65 Mpc
 *   • Shapley Conc.       — ~200 Mpc, beyond the 2MRS bright sample
 *
 * Positions are computed by converting (RA, Dec, distance) into the
 * galactic world frame the same way the renderer does, so a hovered
 * label sits visually on its associated overdensity.
 */

import { Vector3 } from "three";

export type Structure = {
  id: string;
  name: string;
  /** RA in degrees (ICRS J2000) of the centroid. */
  raDeg: number;
  /** Dec in degrees. */
  decDeg: number;
  /** Mean distance to the structure's heart, Mpc. */
  distanceMpc: number;
  /** Radius of the bounding sphere, Mpc. Used for hover hit-tests. */
  radiusMpc: number;
  /** One-line description shown when hovered. */
  note: string;
};

/**
 * Ten famous structures within the 2MRS+6dFGS volume. Coordinates are
 * approximate cluster-core centroids in equatorial ICRS J2000.
 */
export const STRUCTURES: ReadonlyArray<Structure> = [
  {
    id: "local-group",
    name: "Local Group",
    raDeg: 10.68,
    decDeg: 41.27, // anchored at M31 for visualisation purposes
    distanceMpc: 0.8,
    radiusMpc: 1.5,
    note: "Milky Way, Andromeda, Triangulum + ~80 satellites · ~1 Mpc",
  },
  {
    id: "virgo",
    name: "Virgo Cluster",
    raDeg: 187.7,
    decDeg: 12.39,
    distanceMpc: 16.5,
    radiusMpc: 3.0,
    note: "Heart of the Local Supercluster · ~1,300 galaxies",
  },
  {
    id: "fornax",
    name: "Fornax Cluster",
    raDeg: 54.62,
    decDeg: -35.45,
    distanceMpc: 19.0,
    radiusMpc: 2.5,
    note: "Second-richest cluster within 25 Mpc · southern sky",
  },
  {
    id: "great-attractor",
    name: "Great Attractor (Norma)",
    raDeg: 243.5,
    decDeg: -60.8,
    distanceMpc: 65.0,
    radiusMpc: 8.0,
    note: "Gravitational basin pulling the Local Sheet at ~600 km/s",
  },
  {
    id: "coma",
    name: "Coma Cluster",
    raDeg: 194.95,
    decDeg: 27.98,
    distanceMpc: 100.0,
    radiusMpc: 6.0,
    note: "~1,000 galaxies bound · backbone of the CfA2 Great Wall",
  },
  {
    id: "great-wall",
    name: "CfA2 Great Wall",
    raDeg: 200.0,
    decDeg: 27.0,
    distanceMpc: 95.0,
    radiusMpc: 35.0, // sheet-like; sphere is a rough hit-region
    note: "~250 Mpc-long filament · Geller & Huchra 1989",
  },
  {
    id: "perseus-pisces",
    name: "Perseus-Pisces Supercluster",
    raDeg: 45.0,
    decDeg: 36.0,
    distanceMpc: 75.0,
    radiusMpc: 25.0,
    note: "Long filament of clusters · Perseus, A262, A347, NGC 507",
  },
  {
    id: "hydra-centaurus",
    name: "Hydra-Centaurus Supercluster",
    raDeg: 200.0,
    decDeg: -45.0,
    distanceMpc: 50.0,
    radiusMpc: 15.0,
    note: "Foreground of the Great Attractor · Hydra + Centaurus",
  },
  {
    id: "hercules",
    name: "Hercules Supercluster",
    raDeg: 247.0,
    decDeg: 17.0,
    distanceMpc: 130.0,
    radiusMpc: 12.0,
    note: "A2151/A2147/A2152 · part of the CfA2 Great Wall",
  },
  {
    id: "shapley",
    name: "Shapley Concentration",
    raDeg: 200.5,
    decDeg: -31.5,
    distanceMpc: 200.0,
    radiusMpc: 30.0,
    note: "Largest mass concentration within z<0.1 · Tully 2014",
  },
];

/* ─── Coordinate helpers ─────────────────────────────────────────── */

/** 1 Mpc → light-years. */
export const LY_PER_MPC = 3_261_564;

/**
 * Sun anchor in the galactic LY world frame. Matches
 * `viewer/universe/universe-scene.ts` and the dark-matter overlay so the
 * structure labels land on the same galaxies they describe.
 */
export const SUN_LY = new Vector3(26000, 0, 0);

/**
 * Equatorial (RA, Dec, distance-Mpc) → galactic-frame world LY.
 *
 * The galactic frame used by `universe-scene` puts the disk in the
 * x/z plane and +y toward the north galactic pole. Equatorial RA/Dec
 * map onto that frame via the standard rotation from the celestial
 * equator to the galactic plane (J2000 NGP at α=192.86°, δ=27.13°,
 * galactic origin at l=122.93°).
 *
 * In practice we don't need full galactic-coordinate precision for an
 * 80K-galaxy point cloud — the renderer just needs a consistent unit
 * sphere → cartesian mapping that matches the *other* `viewer/*`
 * catalogs. Since the cosmicflows + dark-matter + galactic-scene
 * modules all treat equatorial RA/Dec as if it were galactic
 * (a deliberate scene-frame simplification at 100 Mpc scale, where the
 * 60° rotation between the two systems is irrelevant to the
 * visualisation), we follow the same convention here.
 *
 * Result: world = SUN + (Mpc × LY_PER_MPC) × (cosδ cosα, sinδ, cosδ sinα)
 *         with the axis swap (raDecToVec3 returns (x,y,z) → world (x,z,y))
 *         that the rest of the viewer applies.
 */
export function equatorialMpcToWorldLY(
  raRad: number,
  decRad: number,
  distanceMpc: number,
): Vector3 {
  const r = distanceMpc * LY_PER_MPC;
  const cosDec = Math.cos(decRad);
  const x = r * cosDec * Math.cos(raRad);
  const y = r * Math.sin(decRad);
  const z = r * cosDec * Math.sin(raRad);
  // Map equatorial cartesian onto the world frame the same way
  // dark-matter-field does: (x, y, z) → (SUN.x + x, y, SUN.z + z).
  return new Vector3(SUN_LY.x + x, y, SUN_LY.z + z);
}

/** Same as above but takes degrees. */
export function equatorialDegMpcToWorldLY(
  raDeg: number,
  decDeg: number,
  distanceMpc: number,
): Vector3 {
  return equatorialMpcToWorldLY(
    (raDeg * Math.PI) / 180,
    (decDeg * Math.PI) / 180,
    distanceMpc,
  );
}

/**
 * Hubble constant baked into the catalog. Distance (Mpc) = cz / H0.
 * H0 = 70 km/s/Mpc (Planck/SH0ES compromise).
 */
export const H0_KMS_PER_MPC = 70;

/** Convert recession velocity to distance in Mpc. */
export function czToDistanceMpc(czKms: number): number {
  return czKms / H0_KMS_PER_MPC;
}

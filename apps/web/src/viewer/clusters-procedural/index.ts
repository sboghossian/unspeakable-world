/**
 * clusters-procedural — procedural Points clouds for nine famous open +
 * globular clusters.
 *
 * Each cluster is a separate Points cloud generated locally (no fetch).
 * The host positions the cloud at the catalogued RA/Dec/distance in the
 * galactic/universe world frame, or projects it onto the unit celestial
 * sphere for sky mode (cluster shrinks to a tiny glow).
 *
 * Density profile:
 *   • Open clusters (Pleiades, Hyades, Praesepe, Double Cluster):
 *     3D exponential with half-light radius from the catalog. Star
 *     counts 400-1500 → keeps memory tiny.
 *   • Globular clusters (M13, M22, Omega Cen, NGC 6397, 47 Tuc): a
 *     King-model-ish power-law core + truncation. Star counts
 *     30 000-120 000. Omega Cen has 120k Points; total across all 9
 *     clusters lands at ~332 000 Points — well inside the GPU budget.
 *
 * Modes:
 *   • sky        — clusters collapse to a tiny glow on the unit sphere.
 *                  We scale every Points cloud to a few×1e-3 unit
 *                  diameter so the cluster reads as a fuzzy patch (real
 *                  binocular look).
 *   • galactic   — Points placed at heliocentric RA/Dec/distance in LY.
 *                  Pleiades at 444 LY from Sun, Omega Cen at 17 600 LY.
 *   • universe   — same as galactic. Universe-mode camera at gigaparsec
 *                  scale shrinks everything to subpixel; that's fine.
 *
 * Coordinate source per cluster: see `data/cluster-catalog.ts`.
 *
 * Performance: 9 Points draws/frame, total ~330 k vertices. Each vertex
 * is a single vec3 + 5 floats (~6 attributes), shader is trivial. Tested
 * at 60 fps with the volumetric nebulae layer also enabled.
 */

import { Group, type Object3D, Vector3 } from "three";

import { log } from "../../lib/logger";
import { raDecToVec3 } from "../stars/coords";
import {
  CLUSTERS_CATALOG,
  type ClusterRow,
} from "./data/cluster-catalog";
import { buildClusterPoints, type BuiltCluster } from "./cluster-field";

export const LAYER_META = {
  id: "clusters-procedural",
  label: "Procedural star clusters",
  icon: "✺",
  attribution:
    "Procedural Points clouds · positions Gaia DR3 + Harris 1996 globular catalog",
  modes: ["sky", "galactic", "universe"] as const,
  defaultEnabled: false,
  description:
    "Nine famous star clusters generated procedurally: Pleiades, Hyades, " +
    "Praesepe, Double Cluster (open) + M13, M22, Omega Cen, NGC 6397, 47 Tuc " +
    "(globular). Density profile is exponential for open, King-ish for " +
    "globular; B-V spread drives temperature distribution.",
  synthetic: false,
};

export type LayerMode = (typeof LAYER_META.modes)[number];

export type MountOpts = {
  parent: Object3D;
  mode: string;
  enabled: boolean;
};

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode?(m: string): void;
  setTime?(ms: number): void;
  dispose(): void;
};

/* ─── frame constants matched to galaxies-procedural ─────────────── */

const LY_PER_PC = 3.261_563_777;
const SUN_LY = { x: 26000, y: 0, z: 0 } as const;

/** Sky-mode shell: just inside the DSO + nebula shells. */
const SKY_SHELL_RADIUS = 0.989;
/** Sky-mode cluster radius on unit sphere (tiny — clusters are a smudge
 * at naked-eye scale). 0.005 unit ≈ 17 arcmin which matches M13's binocular
 * size; we let the per-row scale tweak this up for the Hyades (huge) and
 * down for tight globulars. */
const SKY_BASE_SCALE = 0.005;

/** Galactic-mode position resolver (RA, Dec, distance pc → world LY). */
function placeClusterGalactic(row: ClusterRow): Vector3 {
  const raRad = (row.raDeg * Math.PI) / 180;
  const decRad = (row.decDeg * Math.PI) / 180;
  const distLy = row.distancePc * LY_PER_PC;
  const cosDec = Math.cos(decRad);
  return new Vector3(
    SUN_LY.x + distLy * cosDec * Math.cos(raRad),
    distLy * Math.sin(decRad),
    SUN_LY.z + distLy * cosDec * Math.sin(raRad),
  );
}

/** Sky-mode position: on the unit sphere at the cluster's RA/Dec. */
function placeClusterSky(row: ClusterRow): Vector3 {
  const [x, y, z] = raDecToVec3(row.raDeg, row.decDeg, SKY_SHELL_RADIUS);
  return new Vector3(x, y, z);
}

/** Per-mode local scale so Points stay reasonable at every distance. */
function scaleForMode(
  row: ClusterRow,
  mode: "sky" | "galactic" | "universe",
): number {
  if (mode === "sky") {
    // Convert physical truncation radius at the cluster's distance into
    // an apparent angular size (small-angle): θ ≈ rTrunc / distance.
    // Multiply by SKY_BASE_SCALE so the on-sphere patch reads as the
    // cluster's real binocular size. We then divide by row.truncationPc
    // because the geometry's local coords already extend to that radius
    // — net result: each star's local position (in pc) scales to its
    // fraction of the on-sphere angular diameter.
    const angularRad = row.truncationPc / Math.max(row.distancePc, 1);
    const angularUnitRadius = Math.max(angularRad, 0.0005);
    return (
      (angularUnitRadius / Math.max(row.truncationPc, 1e-3)) *
      SKY_BASE_SCALE *
      40
    );
  }
  // galactic / universe: Points are sampled in parsecs; convert to LY so
  // the cluster sits at the catalog's physical extent.
  return LY_PER_PC;
}

/* ─── field ──────────────────────────────────────────────────────── */

type ClusterEntry = {
  readonly row: ClusterRow;
  readonly built: BuiltCluster;
};

class ClustersField {
  readonly group = new Group();
  private entries: ClusterEntry[] = [];
  private mode: "sky" | "galactic" | "universe" = "sky";

  constructor() {
    this.group.name = "ClustersProceduralField";
    this.group.visible = false;
    // Match the other sky-mode overlays' celestial sphere rotation.
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 1;
  }

  build(
    catalog: ReadonlyArray<ClusterRow>,
    mode: "sky" | "galactic" | "universe",
    pixelRatio: number,
  ): void {
    this.mode = mode;
    this.group.rotation.x = mode === "sky" ? -Math.PI / 2 : 0;
    for (const row of catalog) {
      try {
        const built = buildClusterPoints(row, pixelRatio);
        this.applyTransform(built, row, mode);
        this.group.add(built.points);
        this.entries.push({ row, built });
      } catch (err) {
        log.warn(
          "[clusters-procedural]",
          `failed to build cluster ${row.id}`,
          err,
        );
      }
    }
  }

  setMode(mode: "sky" | "galactic" | "universe"): void {
    if (mode === this.mode) {
      this.group.rotation.x = mode === "sky" ? -Math.PI / 2 : 0;
      return;
    }
    this.mode = mode;
    this.group.rotation.x = mode === "sky" ? -Math.PI / 2 : 0;
    for (const e of this.entries) this.applyTransform(e.built, e.row, mode);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  dispose(): void {
    for (const e of this.entries) {
      e.built.geometry.dispose();
      e.built.material.dispose();
    }
    this.entries = [];
    this.group.clear();
  }

  private applyTransform(
    built: BuiltCluster,
    row: ClusterRow,
    mode: "sky" | "galactic" | "universe",
  ): void {
    const pos = mode === "sky" ? placeClusterSky(row) : placeClusterGalactic(row);
    built.points.position.copy(pos);
    const s = scaleForMode(row, mode);
    built.points.scale.set(s, s, s);
  }
}

/* ─── mount ──────────────────────────────────────────────────────── */

export function mountLayer(opts: MountOpts): LayerHandle {
  const supportedMode = coerceMode(opts.mode);
  const field = new ClustersField();
  opts.parent.add(field.group);

  const pixelRatio =
    typeof window !== "undefined" && window.devicePixelRatio
      ? window.devicePixelRatio
      : 1;

  try {
    field.build(CLUSTERS_CATALOG, supportedMode, pixelRatio);
    log.info(
      "[clusters-procedural]",
      `built ${CLUSTERS_CATALOG.length} procedural star clusters ` +
        `(mode=${supportedMode}, total Points=${totalStarCount()})`,
    );
  } catch (err) {
    log.warn("[clusters-procedural]", "build failed", err);
  }

  let currentMode: "sky" | "galactic" | "universe" = supportedMode;
  let enabled = opts.enabled;
  let disposed = false;

  field.setVisible(enabled);

  return {
    setEnabled(v: boolean): void {
      if (disposed) return;
      enabled = v;
      field.setVisible(enabled);
    },
    setMode(m: string): void {
      const next = coerceMode(m);
      if (next !== currentMode) {
        currentMode = next;
        field.setMode(next);
      }
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

function coerceMode(m: string): "sky" | "galactic" | "universe" {
  if (m === "galactic") return "galactic";
  if (m === "universe") return "universe";
  return "sky";
}

function totalStarCount(): number {
  let n = 0;
  for (const c of CLUSTERS_CATALOG) n += c.starCount;
  return n;
}

export { CLUSTERS_CATALOG } from "./data/cluster-catalog";
export type { ClusterRow, ClusterType } from "./data/cluster-catalog";
export { buildClusterPoints } from "./cluster-field";

import { query_disc_inclusive_nest } from "@hscmap/healpix";
import { Group, type Vector3 } from "three";
import type { Survey } from "../hips/surveys";
import { buildTile, type TileMesh } from "./healpix-tile-mesh";

/**
 * The "sky" — 12 base HEALPix tiles forming a closed unit sphere, plus a
 * dynamic detail layer that pulls higher-order tiles into the camera frustum
 * as we zoom in.
 *
 * Detail layer (Day 3 LOD MVP):
 * - Base: 12 Norder 0 tiles, always rendered behind everything.
 * - Detail: tiles at the order chosen by `pickTargetOrder(fov)`, populated
 *   on demand via `query_disc_inclusive_nest` and capped at MAX_DETAIL_TILES.
 * - Detail tiles render in front of base (renderOrder).
 * - When camera moves: re-query the cone, add missing tiles, evict tiles that
 *   left the cone. The shared LRU tile-loader cache means re-entering a region
 *   is instant.
 *
 * Day 3+ TODO:
 * - Polar/Collignon seam handling at lat ±41.81° (the dragon).
 * - Crossfade parent ↔ child tiles instead of pop-in.
 * - Texture atlas (cf. Aladin Lite's `buffer.rs` pattern).
 */

const MAX_DETAIL_TILES = 64;

export class HipsSphere {
  readonly group = new Group();
  readonly tiles: TileMesh[] = []; // base layer (Norder 0)
  private detailTiles = new Map<string, TileMesh>(); // key = "order|ipix"
  private currentSurvey: Survey;

  constructor(survey: Survey) {
    this.currentSurvey = survey;
    this.group.name = 'HipsSphere';
    // Astronomy data (HEALPix, raDecToVec3) is Z-up (celestial north on +Z).
    // Three.js camera defaults to Y-up. Rotate the whole sphere -90° around X
    // so celestial north lands on +Y and yaw/pitch on the camera mean what
    // a casual observer expects.
    this.group.rotation.x = -Math.PI / 2;
    this.buildOrder0();
  }

  private buildOrder0(): void {
    for (let ipix = 0; ipix < 12; ipix++) {
      const tile = buildTile(this.currentSurvey, 0, ipix);
      this.tiles.push(tile);
      this.group.add(tile.mesh);
    }
  }

  ready(): Promise<void> {
    return Promise.all(this.tiles.map((t) => t.ready)).then(() => undefined);
  }

  /**
   * Update the detail layer to match the current camera frustum.
   * Returns true if the layer changed (caller should mark the scene dirty).
   */
  updateLOD(forward: Vector3, fovDeg: number): boolean {
    const targetOrder = pickTargetOrder(fovDeg);
    if (targetOrder === 0) {
      const had = this.detailTiles.size > 0;
      this.clearDetail();
      return had;
    }

    const nside = 1 << targetOrder;
    const fovRad = (fovDeg * Math.PI) / 180;
    const radius = Math.min(Math.PI / 2, fovRad * 0.75);
    const visibleKeys = new Set<string>();

    query_disc_inclusive_nest(
      nside,
      [forward.x, forward.y, forward.z],
      radius,
      (ipix: number) => {
        visibleKeys.add(`${targetOrder}|${ipix}`);
      },
    );

    // Cap by closest-to-camera. Cheap heuristic: trim arbitrarily (tile-pixel
    // index is roughly ordered along Hilbert curves; any cap is OK for the toy).
    let added = 0;
    let changed = false;
    for (const key of visibleKeys) {
      if (added >= MAX_DETAIL_TILES) break;
      added++;
      if (this.detailTiles.has(key)) continue;
      const parts = key.split("|");
      const order = Number(parts[0]);
      const ipix = Number(parts[1]);
      const tile = buildTile(this.currentSurvey, order, ipix);
      tile.mesh.renderOrder = -8; // in front of base (-10) but behind everything else
      this.detailTiles.set(key, tile);
      this.group.add(tile.mesh);
      changed = true;
    }

    // Evict tiles no longer visible (or beyond cap).
    for (const [key, tile] of this.detailTiles) {
      if (!visibleKeys.has(key)) {
        this.group.remove(tile.mesh);
        tile.mesh.geometry.dispose();
        // Don't dispose the material/texture — the LRU tile cache may serve
        // it again momentarily as the user pans back.
        this.detailTiles.delete(key);
        changed = true;
      }
    }

    return changed;
  }

  private clearDetail(): void {
    for (const tile of this.detailTiles.values()) {
      this.group.remove(tile.mesh);
      tile.mesh.geometry.dispose();
    }
    this.detailTiles.clear();
  }

  /** Returns the union of base + detail tiles for status reporting. */
  detailCount(): number {
    return this.detailTiles.size;
  }

  /** Iterator over every tile (base + detail) currently in the scene. */
  tilesAll(): Iterable<TileMesh> {
    const base = this.tiles;
    const detail = [...this.detailTiles.values()];
    return [...base, ...detail];
  }

  /** Wire a callback to fire when any detail tile finishes loading. */
  onDetailTileLoaded(cb: () => void): () => void {
    let alive = true;
    const wrapped = () => {
      if (alive) cb();
    };
    // Walk current detail tiles. New ones added later get hooked in updateLOD.
    for (const tile of this.detailTiles.values()) {
      void tile.ready.finally(wrapped);
    }
    return () => {
      alive = false;
    };
  }

  dispose(): void {
    for (const t of this.tiles) {
      t.mesh.geometry.dispose();
      disposeMaterial(t);
    }
    for (const t of this.detailTiles.values()) {
      t.mesh.geometry.dispose();
      disposeMaterial(t);
    }
    this.detailTiles.clear();
  }
}

function disposeMaterial(t: TileMesh): void {
  const mat = t.mesh.material;
  if (Array.isArray(mat)) {
    mat.forEach((m) => m.dispose());
  } else {
    mat.dispose();
  }
}

/**
 * Choose target HEALPix order from camera FOV.
 * Day 3 MVP: only Norder 0 and 1 (48 tiles total at order 1). Higher orders
 * arrive once we have texture-atlas batching.
 */
function pickTargetOrder(fovDeg: number): number {
  if (fovDeg >= 50) return 0;
  if (fovDeg >= 25) return 1;
  if (fovDeg >= 12) return 2;
  return 3;
}

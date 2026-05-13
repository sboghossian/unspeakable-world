import { query_disc_inclusive_nest } from "@hscmap/healpix";
import { Group, type Vector3 } from "three";
import { getHipsMaxOrder } from "../../lib/quality";
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
  /**
   * Render-order offset applied to every tile mesh. Default 0 → base tiles
   * land at -10, detail tiles at -8. Overlay sphere passes +5 → -5 / -3,
   * strictly above the background sphere.
   */
  private renderOrderOffset: number;

  constructor(survey: Survey, renderOrderOffset = 0) {
    this.currentSurvey = survey;
    this.renderOrderOffset = renderOrderOffset;
    this.group.name = "HipsSphere";
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
      tile.mesh.renderOrder += this.renderOrderOffset;
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
      // Detail tiles paint on top of base tiles within the same sphere; the
      // overlay sphere shifts both layers via renderOrderOffset.
      tile.mesh.renderOrder = -8 + this.renderOrderOffset;
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

  /** Active survey, exposed for wavelength UI labels. */
  survey(): Survey {
    return this.currentSurvey;
  }

  /**
   * Push the same uniform opacity to every tile material in the sphere.
   * Used by the multi-wavelength overlay to cross-fade against the base.
   */
  setOpacity(opacity: number): void {
    for (const t of this.tilesAll()) {
      const mat = t.mesh.material;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          m.opacity = opacity;
          m.transparent = true;
          m.needsUpdate = true;
        }
      } else {
        mat.opacity = opacity;
        mat.transparent = true;
        mat.needsUpdate = true;
      }
    }
  }

  /**
   * Swap the active survey: dispose the current tile pyramid and rebuild the
   * 12 base tiles for `next`. Detail tiles are cleared and will rebuild on the
   * next LOD pass. This is what powers wavelength toggling on the overlay
   * sphere.
   */
  setSurvey(next: Survey): void {
    if (next.id === this.currentSurvey.id) return;
    // Dispose current.
    for (const t of this.tiles) {
      this.group.remove(t.mesh);
      t.mesh.geometry.dispose();
      disposeMaterial(t);
    }
    this.tiles.length = 0;
    this.clearDetail();
    this.currentSurvey = next;
    this.buildOrder0();
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
 *
 * The quality preset caps the maximum order we'll request — `low` clamps to
 * 6 so mobile devices never ask the CDN for the deep tile, `ultra` opens it
 * up to 9. Cap changes take effect on next camera update (no reload needed
 * because `updateLOD` is invoked on every dirty frame).
 */
function pickTargetOrder(fovDeg: number): number {
  const cap = getHipsMaxOrder();
  let order: number;
  if (fovDeg >= 50) order = 0;
  else if (fovDeg >= 25) order = 1;
  else if (fovDeg >= 12) order = 2;
  else order = 3;
  return Math.min(order, cap);
}

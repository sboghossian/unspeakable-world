import { Group } from "three";
import type { Survey } from "../hips/surveys";
import { buildTile, type TileMesh } from "./healpix-tile-mesh";

/**
 * The "sky" — 12 base HEALPix tiles assembled into a closed unit sphere.
 *
 * Day 2 ships a single-order render. Day 3 will add Norder ≥ 1 LOD.
 */
export class HipsSphere {
  readonly group = new Group();
  readonly tiles: TileMesh[] = [];
  private currentSurvey: Survey;

  constructor(survey: Survey) {
    this.currentSurvey = survey;
    this.group.name = "HipsSphere";
    this.buildOrder0();
  }

  private buildOrder0(): void {
    for (let ipix = 0; ipix < 12; ipix++) {
      const tile = buildTile(this.currentSurvey, 0, ipix);
      this.tiles.push(tile);
      this.group.add(tile.mesh);
    }
  }

  /** Promise that resolves once every base tile has had its first texture attempt. */
  ready(): Promise<void> {
    return Promise.all(this.tiles.map((t) => t.ready)).then(() => undefined);
  }

  dispose(): void {
    for (const t of this.tiles) {
      t.mesh.geometry.dispose();
      const mat = t.mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    }
  }
}

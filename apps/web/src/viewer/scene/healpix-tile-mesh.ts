import { pixcoord2vec_nest } from "@hscmap/healpix";
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import { loadTile } from "../hips/tile-loader";
import type { Survey } from "../hips/surveys";

/**
 * Build a Three.js Mesh for a single HEALPix tile (any order).
 *
 * Geometry: subdivide the tile's (ne, nw) parameter space into an
 * SUB × SUB grid and lift each grid point onto the sphere using
 * `pixcoord2vec_nest`. UV maps directly to (ne, nw) ∈ [0,1]².
 *
 * Texture: stream the matching HiPS tile JPG.
 *
 * Day 2 known issues (documented):
 * - No polar/Collignon seam handling at lat ≈ ±41.81° → visible cracks
 * - One Texture per tile, no atlas
 * - No frustum culling
 * - LOD limited to a single order at a time
 */

const SUB = 16; // subdivision per tile axis
const RADIUS = 1; // sky sphere radius — we render inside-out

export type TileMesh = {
  ipix: number;
  order: number;
  mesh: Mesh;
  /** Resolves once the texture-load attempt finishes (success or error). */
  ready: Promise<void>;
  /** True after texture is bound to the material. */
  loaded: boolean;
};

export function buildTile(
  survey: Survey,
  order: number,
  ipix: number,
): TileMesh {
  const nside = 1 << order;
  const geom = buildTileGeometry(nside, ipix);

  // Fallback color before texture lands — slightly lit deep-blue so the sphere
  // is visible even if a tile fetch fails.
  const mat = new MeshBasicMaterial({
    color: 0x0a1428,
    transparent: true,
    opacity: 1,
  });

  const mesh = new Mesh(geom, mat);
  mesh.frustumCulled = false; // sphere is small, always near camera
  mesh.renderOrder = -10; // render behind everything else (it's the sky)
  // Inside-out rendering: backface is what we see.
  mat.side = 2 as 0 | 1 | 2; // THREE.BackSide

  const tile: TileMesh = {
    ipix,
    order,
    mesh,
    loaded: false,
    ready: Promise.resolve(),
  };

  tile.ready = loadTile(survey, order, ipix)
    .then((tex) => {
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      tile.loaded = true;
    })
    .catch((err) => {
      console.warn(
        `[hips] tile fetch failed: order=${order} ipix=${ipix}`,
        err,
      );
    });

  return tile;
}

function buildTileGeometry(nside: number, ipix: number): BufferGeometry {
  const positions = new Float32Array((SUB + 1) * (SUB + 1) * 3);
  const uvs = new Float32Array((SUB + 1) * (SUB + 1) * 2);
  const indices = new Uint32Array(SUB * SUB * 6);

  const v = new Vector3();

  for (let j = 0; j <= SUB; j++) {
    for (let i = 0; i <= SUB; i++) {
      const ne = i / SUB;
      const nw = j / SUB;
      const [x, y, z] = pixcoord2vec_nest(nside, ipix, ne, nw);
      v.set(x, y, z).multiplyScalar(RADIUS);
      const idx = j * (SUB + 1) + i;
      positions[idx * 3 + 0] = v.x;
      positions[idx * 3 + 1] = v.y;
      positions[idx * 3 + 2] = v.z;
      // UV: the HiPS tile JPEG is laid out so that pixel (px, py) corresponds
      // to (ne, nw) with the south corner at the *bottom-left* of the image.
      // Three.js textures default to WebGL UV (origin bottom-left), so we map
      // u = ne and v = nw. We will likely need to flip this once we visually
      // compare to a reference — leaving as a Day 3 polish item.
      uvs[idx * 2 + 0] = ne;
      uvs[idx * 2 + 1] = nw;
    }
  }

  let k = 0;
  for (let j = 0; j < SUB; j++) {
    for (let i = 0; i < SUB; i++) {
      const a = j * (SUB + 1) + i;
      const b = a + 1;
      const c = a + (SUB + 1);
      const d = c + 1;
      // Two triangles per quad, wound so that the BackSide faces the camera.
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }

  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(positions, 3));
  geom.setAttribute("uv", new BufferAttribute(uvs, 2));
  geom.setIndex(new BufferAttribute(indices, 1));
  geom.computeBoundingSphere();
  return geom;
}

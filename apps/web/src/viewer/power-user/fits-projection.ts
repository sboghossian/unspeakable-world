/**
 * Mount a FITS image as a textured plane in the scene, anchored at the
 * WCS reference world coordinate.
 *
 * Geometry: a flat unit-ish PlaneGeometry tangent to the celestial
 * sphere at (CRVAL1, CRVAL2). Width/height in world units are derived
 * from CDELT × NAXIS so the plane subtends roughly the right angular
 * size — accurate enough for "where is this image on the sky?" use,
 * not for science overlay.
 *
 * Limits (documented in the panel copy too):
 *   • The plane is flat — for fields > a few degrees the corners drift
 *     from the great-circle FITS pixels (no per-vertex reprojection in v1).
 *   • Rotation around the line of sight uses CROTA2 only; the PC/CD
 *     matrix off-diagonals are ignored.
 *   • Pixel orientation: we already flipped rows in the reader so the
 *     plane reads sky-up.
 */
import {
  CanvasTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Object3D,
} from "three";
import type { FitsImage } from "./fits-reader";
import { stretchToImageData } from "./fits-reader";

export type FitsProjectionHandle = {
  /** Three.js object the host can use to remove the mount. */
  object: Object3D;
  /** Cleanly dispose geometry / material / texture. */
  dispose: () => void;
};

/**
 * Build a textured plane oriented to (RA, Dec) on the celestial sphere
 * and attach it as a child of `parent`. Returns a handle the caller can
 * use to remove the projection later.
 */
export function projectFitsOnSky(
  img: FitsImage,
  parent: Group,
): FitsProjectionHandle {
  if (!img.wcs) {
    throw new Error("FITS has no WCS — cannot project");
  }
  // 1. Stretch float pixels into a CanvasTexture.
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("FITS projection: 2D canvas unavailable");
  const imgData = ctx.createImageData(img.width, img.height);
  stretchToImageData(img.data, img.width, img.height, imgData);
  ctx.putImageData(imgData, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  // 2. Plane sized in unit-sphere world units. The sky stack uses a
  //    radius-1 sphere; an angular size α (radians) corresponds to a
  //    chord length 2·sin(α/2). For modest images (< 5°) chord ≈ α so
  //    we just take the angular extent directly.
  const wDeg = Math.abs(img.wcs.cdelt1) * img.width;
  const hDeg = Math.abs(img.wcs.cdelt2) * img.height;
  const wRad = (wDeg * Math.PI) / 180;
  const hRad = (hDeg * Math.PI) / 180;
  const geom = new PlaneGeometry(wRad, hRad);
  const mat = new MeshBasicMaterial({
    map: texture,
    side: DoubleSide,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new Mesh(geom, mat);
  mesh.renderOrder = 10; // above HiPS / overlay tiles

  // 3. Place the plane tangent to the celestial sphere at (RA, Dec).
  //    Parent group is rotated −π/2 around X (Z-up → Y-up), so we author
  //    the position in Z-up celestial cartesian — the parent rotation
  //    flips it into world-Y-up.
  const ra = (img.wcs.crval1 * Math.PI) / 180;
  const dec = (img.wcs.crval2 * Math.PI) / 180;
  const cd = Math.cos(dec);
  const x = cd * Math.cos(ra);
  const y = cd * Math.sin(ra);
  const z = Math.sin(dec);
  // Push slightly inside the unit sphere so it sits "behind" the HiPS
  // surface — viewer is at origin, looking outward; sphere is radius 1.
  // Anchor at 0.999 to render inside the HiPS but above its renderOrder.
  const anchor = 0.999;
  mesh.position.set(x * anchor, y * anchor, z * anchor);
  // Orient the plane: lookAt origin so its normal points inward. Then
  // apply CROTA2 around the normal for the on-sky roll.
  mesh.lookAt(0, 0, 0);
  // PlaneGeometry's default normal is +Z; after lookAt the plane's local
  // +Z points at origin. Roll around local Z by CROTA2.
  const roll = (img.wcs.crota2 * Math.PI) / 180;
  mesh.rotateZ(roll);

  parent.add(mesh);

  return {
    object: mesh,
    dispose: () => {
      parent.remove(mesh);
      geom.dispose();
      mat.dispose();
      texture.dispose();
    },
  };
}

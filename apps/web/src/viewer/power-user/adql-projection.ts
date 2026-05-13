/**
 * Plot ADQL result rows (with RA / Dec columns) as a point cloud on the sky.
 *
 * Tiny: BufferGeometry of unit-sphere positions, PointsMaterial with a
 * vivid accent so the user can spot their query results above the
 * background stars. No per-point sizing in v1 — every row renders at
 * the same 4-pixel dot.
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
  type Object3D,
} from "three";

export type AdqlPointsHandle = {
  object: Object3D;
  dispose: () => void;
  count: number;
};

/**
 * Build a Points mesh from rows of (raDeg, decDeg). Rows where either
 * value is non-finite are silently dropped.
 */
export function projectAdqlPoints(
  rows: ReadonlyArray<{ raDeg: number; decDeg: number }>,
  parent: Group,
): AdqlPointsHandle {
  const positions: number[] = [];
  for (const r of rows) {
    if (!Number.isFinite(r.raDeg) || !Number.isFinite(r.decDeg)) continue;
    const ra = (r.raDeg * Math.PI) / 180;
    const dec = (r.decDeg * Math.PI) / 180;
    const cd = Math.cos(dec);
    // Z-up celestial — the parent power-user group already rotates
    // these into Y-up world space.
    positions.push(cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec));
  }
  const count = positions.length / 3;
  const geom = new BufferGeometry();
  geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const mat = new PointsMaterial({
    color: 0xff7eee,
    size: 0.012,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const points = new Points(geom, mat);
  points.renderOrder = 12;
  parent.add(points);
  return {
    object: points,
    count,
    dispose: () => {
      parent.remove(points);
      geom.dispose();
      mat.dispose();
    },
  };
}

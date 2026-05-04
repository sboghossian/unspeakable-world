import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Equatorial coordinate grid + ecliptic + galactic plane.
 *
 * - Equatorial (RA/Dec): a fine 15° meridian × 10° parallel mesh, plus the
 *   celestial equator drawn brighter.
 * - Ecliptic: the path of the Sun through the year (obliquity ≈ 23.4366°).
 * - Galactic plane: the great circle of the Milky Way's mid-plane in
 *   equatorial J2000 (computed from the standard galactic-pole rotation).
 *
 * Each layer is a separate LineSegments mesh so it can be toggled and
 * re-coloured independently. All sit on a 0.998-radius shell — just inside
 * the HiPS sphere (1.0) and just outside the constellation lines (0.999),
 * with renderOrder shifted so they read correctly atop the sky.
 */

const RADIUS = 0.998;
const SEG_PER_CIRCLE = 256; // resolution of curved lines

const COL_GRID = 0x60a0ff; // soft blue
const COL_EQUATOR = 0xa6c8ff;
const COL_ECLIPTIC = 0xffd277; // warm yellow — the Sun's path
const COL_GALACTIC = 0xb389ff; // violet — Milky Way

// IAU galactic pole (J2000): RA = 192.8595°, Dec = +27.1283°
const GAL_POLE_RA = 192.8595;
const GAL_POLE_DEC = 27.1283;

export class CoordGrid {
  readonly group = new Group();
  private gridMesh: LineSegments | null = null;
  private equatorMesh: LineSegments | null = null;
  private eclipticMesh: LineSegments | null = null;
  private galacticMesh: LineSegments | null = null;

  private gridMat: LineBasicMaterial;
  private equatorMat: LineBasicMaterial;
  private eclipticMat: LineBasicMaterial;
  private galacticMat: LineBasicMaterial;

  constructor() {
    this.group.name = "CoordGrid";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up, matches sky meshes
    this.group.renderOrder = 2;
    this.group.visible = false;

    this.gridMat = new LineBasicMaterial({
      color: COL_GRID,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      depthTest: false,
    });
    this.equatorMat = new LineBasicMaterial({
      color: COL_EQUATOR,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      depthTest: false,
    });
    this.eclipticMat = new LineBasicMaterial({
      color: COL_ECLIPTIC,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: false,
    });
    this.galacticMat = new LineBasicMaterial({
      color: COL_GALACTIC,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: false,
    });

    this.build();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  private build(): void {
    // Equatorial grid: 24 meridians (every 15° RA) + 17 parallels (every 10°).
    const gridPos: number[] = [];

    // Meridians — full great-circles from -90° to +90°
    for (let raDeg = 0; raDeg < 360; raDeg += 15) {
      addCurve(gridPos, (t) => raDecToVec3(raDeg, -90 + 180 * t, RADIUS));
    }
    // Parallels — circles at constant declination (skip ±90°, they're points)
    for (let dec = -80; dec <= 80; dec += 10) {
      if (dec === 0) continue; // celestial equator drawn separately, brighter
      addCurve(gridPos, (t) => raDecToVec3(360 * t, dec, RADIUS));
    }

    this.gridMesh = makeLineSegments(gridPos, this.gridMat);
    this.gridMesh.renderOrder = 2;
    this.group.add(this.gridMesh);

    // Celestial equator (RA-axis circle at Dec=0)
    const eqPos: number[] = [];
    addCurve(eqPos, (t) => raDecToVec3(360 * t, 0, RADIUS));
    this.equatorMesh = makeLineSegments(eqPos, this.equatorMat);
    this.equatorMesh.renderOrder = 2.1;
    this.group.add(this.equatorMesh);

    // Ecliptic — sin(lat) = sin(23.4366°) sin(lon)
    const obl = (23.4366 * Math.PI) / 180;
    const eclPos: number[] = [];
    addCurve(eclPos, (t) => {
      // Parameterize by ecliptic longitude (0…360°). Convert ecliptic
      // (lon, lat=0) → equatorial via the standard rotation about X.
      const lon = (360 * t * Math.PI) / 180;
      const xe = Math.cos(lon);
      const ye = Math.sin(lon);
      // Rotate about X by +obliquity to get equatorial cartesian.
      const x = xe;
      const y = ye * Math.cos(obl);
      const z = ye * Math.sin(obl);
      const ra = (Math.atan2(y, x) * 180) / Math.PI;
      const dec = (Math.asin(z) * 180) / Math.PI;
      return raDecToVec3(ra, dec, RADIUS);
    });
    this.eclipticMesh = makeLineSegments(eclPos, this.eclipticMat);
    this.eclipticMesh.renderOrder = 2.2;
    this.group.add(this.eclipticMesh);

    // Galactic plane — locus of points 90° from the galactic pole.
    const galPos: number[] = [];
    const { axisX, axisY } = galacticBasis();
    addCurve(galPos, (t) => {
      const ang = 2 * Math.PI * t;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const x = axisX[0] * c + axisY[0] * s;
      const y = axisX[1] * c + axisY[1] * s;
      const z = axisX[2] * c + axisY[2] * s;
      const ra = (Math.atan2(y, x) * 180) / Math.PI;
      const dec = (Math.asin(z) * 180) / Math.PI;
      return raDecToVec3(ra, dec, RADIUS);
    });
    this.galacticMesh = makeLineSegments(galPos, this.galacticMat);
    this.galacticMesh.renderOrder = 2.3;
    this.group.add(this.galacticMesh);
  }

  dispose(): void {
    for (const m of [
      this.gridMesh,
      this.equatorMesh,
      this.eclipticMesh,
      this.galacticMesh,
    ]) {
      if (!m) continue;
      m.geometry.dispose();
      this.group.remove(m);
    }
    this.gridMat.dispose();
    this.equatorMat.dispose();
    this.eclipticMat.dispose();
    this.galacticMat.dispose();
  }
}

/** Push a smooth curve as line segments onto `out`. `fn(t)` returns the
 *  cartesian point for t ∈ [0, 1]. */
function addCurve(
  out: number[],
  fn: (t: number) => [number, number, number],
): void {
  let prev = fn(0);
  for (let i = 1; i <= SEG_PER_CIRCLE; i++) {
    const cur = fn(i / SEG_PER_CIRCLE);
    out.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]);
    prev = cur;
  }
}

function makeLineSegments(
  positions: number[],
  material: LineBasicMaterial,
): LineSegments {
  const geom = new BufferGeometry();
  geom.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  const mesh = new LineSegments(geom, material);
  mesh.frustumCulled = false;
  return mesh;
}

/** Two orthonormal basis vectors lying in the galactic plane (the plane is
 *  perpendicular to the galactic pole). Built once at module scope; the
 *  galactic plane curve is `axisX cos t + axisY sin t`. */
function galacticBasis(): {
  axisX: [number, number, number];
  axisY: [number, number, number];
} {
  const pole = unitFromRaDec(GAL_POLE_RA, GAL_POLE_DEC);
  // Pick any vector not parallel to pole, project out the pole component.
  const seed: [number, number, number] = Math.abs(pole[2]) < 0.9
    ? [0, 0, 1]
    : [1, 0, 0];
  const dot = pole[0] * seed[0] + pole[1] * seed[1] + pole[2] * seed[2];
  const axisX0: [number, number, number] = [
    seed[0] - pole[0] * dot,
    seed[1] - pole[1] * dot,
    seed[2] - pole[2] * dot,
  ];
  const axisX = normalize(axisX0);
  const axisY = normalize(cross(pole, axisX));
  return { axisX, axisY };
}

function unitFromRaDec(raDeg: number, decDeg: number): [number, number, number] {
  return raDecToVec3(raDeg, decDeg, 1);
}

function cross(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

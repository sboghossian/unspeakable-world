import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from "three";
import { raDecToVec3 } from "../stars/coords";
import type { PolarizationVector } from "./polarization-data";

/**
 * 🪡 Renders Planck Q/U polarization as tangent line segments on the
 * celestial sphere. Each vector lives in the local tangent plane at
 * its (ra, dec):
 *
 *   • length     ∝ P = √(Q² + U²)         (visual amplitude)
 *   • angle ψ   = ½ atan2(U, Q)            (IAU convention)
 *   • azimuth    measured from the local north direction (toward east)
 *
 * The local north direction at (ra, dec) on the celestial sphere is the
 * derivative of the position vector w.r.t. declination. The local east
 * direction is the derivative w.r.t. right ascension. Together they
 * form an orthonormal basis in the tangent plane. We rotate the unit
 * north vector by ψ around the local radial normal to get the segment
 * direction; the segment is centred on the sample point.
 *
 * Color: pale violet-pink, additive blended so the dense galactic-plane
 * region brightens naturally where many segments overlap.
 */

const RADIUS = 0.9985; // sit just inside the HiPS sphere
/** Visual length scaler — converts µK_CMB → angular span on the sphere. */
const LEN_SCALE = 0.0042;
/** Soft cap so a few hot pixels can't blow up the field's visual scale. */
const MAX_LEN = 0.018;

export class PolarizationField {
  readonly group = new Group();
  private mesh: LineSegments | null = null;
  private material: LineBasicMaterial | null = null;

  constructor() {
    this.group.name = "PlanckPolarization";
    this.group.rotation.x = -Math.PI / 2; // match other RA/Dec layers
    this.group.renderOrder = 3;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  build(vectors: ReadonlyArray<PolarizationVector>): void {
    this.dispose();
    const positions = new Float32Array(vectors.length * 6);
    for (let i = 0; i < vectors.length; i++) {
      const v = vectors[i];
      if (!v) continue;
      this.writeSegment(v, positions, i * 6);
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.computeBoundingSphere();
    this.material = new LineBasicMaterial({
      color: 0xf0b8ff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.mesh = new LineSegments(geom, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    this.group.add(this.mesh);
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.group.remove(this.mesh);
      this.mesh = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  /** Pack the two endpoints of one polarization segment into `out` at
   *  the given offset. Math is documented at the top of this file. */
  private writeSegment(
    v: PolarizationVector,
    out: Float32Array,
    off: number,
  ): void {
    const raRad = (v.raDeg * Math.PI) / 180;
    const decRad = (v.decDeg * Math.PI) / 180;

    const [cx, cy, cz] = raDecToVec3(v.raDeg, v.decDeg, RADIUS);

    // Local east = ∂r/∂ra normalised; local north = ∂r/∂dec normalised.
    const cosDec = Math.cos(decRad);
    const sinDec = Math.sin(decRad);
    const cosRA = Math.cos(raRad);
    const sinRA = Math.sin(raRad);

    // East = (-sin ra, cos ra, 0)
    const ex = -sinRA;
    const ey = cosRA;
    const ez = 0;

    // North = (-sin dec cos ra, -sin dec sin ra, cos dec)
    const nx = -sinDec * cosRA;
    const ny = -sinDec * sinRA;
    const nz = cosDec;

    // Polarization angle ψ from N toward E. IAU convention: psi = ½ atan2(U, Q).
    const P = Math.sqrt(v.Q * v.Q + v.U * v.U);
    const psi = 0.5 * Math.atan2(v.U, v.Q);
    const halfLen = Math.min(P * LEN_SCALE, MAX_LEN) * 0.5;
    const dx = (nx * Math.cos(psi) + ex * Math.sin(psi)) * halfLen;
    const dy = (ny * Math.cos(psi) + ey * Math.sin(psi)) * halfLen;
    const dz = (nz * Math.cos(psi) + ez * Math.sin(psi)) * halfLen;

    // Endpoints, projected back onto the sphere so the segment stays
    // visually tangent at moderate zoom levels.
    const a = new Vector3(cx - dx, cy - dy, cz - dz).normalize().multiplyScalar(RADIUS);
    const b = new Vector3(cx + dx, cy + dy, cz + dz).normalize().multiplyScalar(RADIUS);
    out[off] = a.x;
    out[off + 1] = a.y;
    out[off + 2] = a.z;
    out[off + 3] = b.x;
    out[off + 4] = b.y;
    out[off + 5] = b.z;
  }
}

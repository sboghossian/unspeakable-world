import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from "three";
import { LY_PER_MPC, type CF4Galaxy } from "./cf4-data";

/**
 * 🌊 Cosmicflows-4 velocity field renderer.
 *
 * Each galaxy is drawn as a short colored line segment from its
 * supergalactic position along the direction of its peculiar velocity,
 * length proportional to |v_pec|. Colour ramps from cool blue (low
 * |v_pec|) through cyan/yellow to orange (high) — identical hue ramp
 * to the curated `cosmicflows/` streamlines so the two layers harmonise
 * visually.
 *
 * Lives in the galactic frame group, with the same SGX/SGY/SGZ → world
 * axis mapping the existing module uses:
 *   SGX → world.x   ·   SGZ → world.y (up)   ·   SGY → world.z
 *
 * Anchor: the Local Group sits at (anchor.x, anchor.y, anchor.z) in
 * world LY. The caller passes the same SUN_LY used by the existing
 * curated module so both layers register precisely.
 */

export type AnchorLY = { x: number; y: number; z: number };

/** Visual length scaler. 1 km/s of v_pec maps to this many Mpc of
 *  segment length. Tuned so a 500 km/s flow draws as a ~3 Mpc segment. */
const VEL_TO_MPC = 0.006;
/** Cap individual segment length (Mpc) so a few outliers don't crowd the field. */
const MAX_LEN_MPC = 4;

export class CF4FlowField {
  readonly group = new Group();
  private mesh: LineSegments | null = null;
  private material: LineBasicMaterial | null = null;

  constructor(anchor: AnchorLY) {
    this.group.name = "CF4FlowField";
    this.group.position.set(anchor.x, anchor.y, anchor.z);
    this.group.renderOrder = 5;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  build(galaxies: ReadonlyArray<CF4Galaxy>): void {
    this.dispose();
    const positions = new Float32Array(galaxies.length * 6);
    const colors = new Float32Array(galaxies.length * 6);
    let written = 0;
    for (let i = 0; i < galaxies.length; i++) {
      const g = galaxies[i];
      if (!g) continue;
      const off = written * 6;
      // Anchor-frame (Mpc → LY) plus SG-axis remap.
      const x0 = g.sgx * LY_PER_MPC;
      const y0 = g.sgz * LY_PER_MPC;
      const z0 = g.sgy * LY_PER_MPC;

      // Velocity → displacement in Mpc, then to LY with the same swap.
      const mag = g.vpec;
      const lenMpc = Math.min(mag * VEL_TO_MPC, MAX_LEN_MPC);
      // Direction in (SGX, SGY, SGZ) frame.
      const invMag = mag > 1e-6 ? 1 / mag : 0;
      const dx = g.vx * invMag * lenMpc * LY_PER_MPC;
      const dy = g.vz * invMag * lenMpc * LY_PER_MPC;
      const dz = g.vy * invMag * lenMpc * LY_PER_MPC;

      positions[off] = x0;
      positions[off + 1] = y0;
      positions[off + 2] = z0;
      positions[off + 3] = x0 + dx;
      positions[off + 4] = y0 + dy;
      positions[off + 5] = z0 + dz;

      const c = flowColor(mag);
      // Tail = dimmer for a sense of motion-blur; head = full colour.
      colors[off] = c.r * 0.4;
      colors[off + 1] = c.g * 0.4;
      colors[off + 2] = c.b * 0.4;
      colors[off + 3] = c.r;
      colors[off + 4] = c.g;
      colors[off + 5] = c.b;
      written++;
    }
    const geom = new BufferGeometry();
    geom.setAttribute(
      "position",
      new BufferAttribute(positions.subarray(0, written * 6), 3),
    );
    geom.setAttribute(
      "color",
      new Float32BufferAttribute(colors.subarray(0, written * 6), 3),
    );
    geom.computeBoundingSphere();
    this.material = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.mesh = new LineSegments(geom, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
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
}

/** Matches the colour ramp of the existing `cosmicflows/` module so the
 *  two layers read as the same visual language. */
function flowColor(vKms: number): Color {
  const t = Math.max(0, Math.min(1, (vKms - 150) / (700 - 150)));
  const stops: ReadonlyArray<{ t: number; c: Color }> = [
    { t: 0.0, c: new Color(0.25, 0.55, 1.0) },
    { t: 0.3, c: new Color(0.4, 0.85, 1.0) },
    { t: 0.55, c: new Color(0.95, 0.95, 0.85) },
    { t: 0.8, c: new Color(1.0, 0.75, 0.35) },
    { t: 1.0, c: new Color(1.0, 0.45, 0.2) },
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / Math.max(b.t - a.t, 1e-6);
      return new Color(
        a.c.r + (b.c.r - a.c.r) * k,
        a.c.g + (b.c.g - a.c.g) * k,
        a.c.b + (b.c.b - a.c.b) * k,
      );
    }
  }
  return stops[stops.length - 1]?.c.clone() ?? new Color(1, 1, 1);
}

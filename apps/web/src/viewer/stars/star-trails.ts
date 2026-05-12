import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from "three";
import { bvToRgb, raDecToVec3 } from "./coords";

/**
 * ✨ Star trails — long-exposure renderer for the sky atlas.
 *
 * Each star in the HYG-bright catalog gets a short arc tracing the path
 * it sweeps as the Earth rotates over the configured duration. The arc
 * is centered on the celestial pole and sits on a circle of latitude
 * (constant Dec, varying RA).
 *
 *   • Arc length scales with `durationHours`, default 2 h ≈ 30°.
 *   • Stars near the pole sweep tight circles; stars near the celestial
 *     equator sweep nearly full diameters — exactly what a real long
 *     exposure looks like.
 *   • Brightness modulates per-vertex alpha along the arc so each
 *     trail fades from "now" (bright head) to "shutter-open" (faint
 *     tail) — preserving the sense of direction.
 *
 * This is a SEPARATE layer from the regular `StarField` Points object;
 * it's toggled on via the universe-scene's `setStarTrails(on)` and the
 * normal point stars fade out simultaneously.
 */

const STAR_RADIUS = 0.997; // just inside StarField shell so trails read in front
const SEGMENTS = 24; // segments per arc — 24 reads smoothly at 30° span

type StarRecord = { ra: number; dec: number; mag: number; bv: number };

export class StarTrails {
  readonly group = new Group();
  private lines: LineSegments | null = null;
  private durationHours = 2;

  constructor() {
    this.group.name = "StarTrails";
    this.group.renderOrder = -4; // in front of HiPS, behind labels
    this.group.rotation.x = -Math.PI / 2;
    this.group.visible = false;
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`star catalog HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const count = view.getUint32(0, true);
    const stars: StarRecord[] = new Array(count);
    let o = 4;
    for (let i = 0; i < count; i++) {
      stars[i] = {
        ra: view.getFloat32(o, true),
        dec: view.getFloat32(o + 4, true),
        mag: view.getFloat32(o + 8, true),
        bv: view.getFloat32(o + 12, true),
      };
      o += 16;
    }
    this.build(stars);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  /** Change the simulated exposure length. Rebuilds the arc geometry. */
  setDurationHours(hours: number): void {
    const clamped = Math.max(0.25, Math.min(12, hours));
    if (Math.abs(clamped - this.durationHours) < 0.01) return;
    this.durationHours = clamped;
    // Rebuild requires the original star list; cheapest fix is to keep
    // the line count fixed and update geometry positions in place. But
    // since durations rarely change at runtime we just re-fetch.
    if (this.lastStars) this.build(this.lastStars);
  }

  durationHoursValue(): number {
    return this.durationHours;
  }

  dispose(): void {
    if (this.lines) {
      this.lines.geometry.dispose();
      (this.lines.material as LineBasicMaterial).dispose();
      this.group.remove(this.lines);
      this.lines = null;
    }
  }

  private lastStars: StarRecord[] | null = null;

  private build(stars: StarRecord[]): void {
    this.lastStars = stars;
    this.dispose();

    // Filter to a working magnitude range so we don't end up with
    // hundreds of thousands of line vertices.
    const filtered = stars.filter((s) => s.mag <= 5.5);

    // Each star produces SEGMENTS line segments → 2 × SEGMENTS vertices.
    const totalVerts = filtered.length * SEGMENTS * 2;
    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);

    const arcDeg = this.durationHours * 15; // 15°/hour
    let vi = 0;
    for (const s of filtered) {
      const [baseR, baseG, baseB] = bvToRgb(s.bv);
      const brightness = Math.pow(10, -s.mag / 2.5);
      // Normalize brightness to a 0..1 range. Mag 0 (Sirius) → 1.0,
      // mag 5.5 → ~0.006. Use sqrt for a perceptual taper.
      const intensity = Math.min(1, Math.sqrt(brightness) * 0.18);

      // Build SEGMENTS sub-arcs that fade from intensity → ~0 along
      // the trail. Each sub-arc is two vertices: (ra+t, dec) → (ra+t+dt, dec).
      for (let i = 0; i < SEGMENTS; i++) {
        const t0 = (i / SEGMENTS) * arcDeg;
        const t1 = ((i + 1) / SEGMENTS) * arcDeg;
        // Vertex A — at t0
        const raA = s.ra - t0; // tail extends "backward" in time
        const [ax, ay, az] = raDecToVec3(raA, s.dec, STAR_RADIUS);
        // Vertex B — at t1
        const raB = s.ra - t1;
        const [bx, by, bz] = raDecToVec3(raB, s.dec, STAR_RADIUS);

        // Alpha fades from intensity at the head (i=0) to ~0.05 at the tail.
        const fadeA = 1 - i / SEGMENTS;
        const fadeB = 1 - (i + 1) / SEGMENTS;
        const aA = intensity * (0.05 + 0.95 * fadeA);
        const aB = intensity * (0.05 + 0.95 * fadeB);

        positions[vi * 3] = ax;
        positions[vi * 3 + 1] = ay;
        positions[vi * 3 + 2] = az;
        colors[vi * 3] = baseR * aA;
        colors[vi * 3 + 1] = baseG * aA;
        colors[vi * 3 + 2] = baseB * aA;
        vi++;

        positions[vi * 3] = bx;
        positions[vi * 3 + 1] = by;
        positions[vi * 3 + 2] = bz;
        colors[vi * 3] = baseR * aB;
        colors[vi * 3 + 1] = baseG * aB;
        colors[vi * 3 + 2] = baseB * aB;
        vi++;
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new Float32BufferAttribute(colors, 3));
    const mat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    const lines = new LineSegments(geom, mat);
    lines.renderOrder = -4;
    this.lines = lines;
    this.group.add(lines);
  }
}

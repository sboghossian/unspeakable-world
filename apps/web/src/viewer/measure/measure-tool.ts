import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LinearFilter,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";

/**
 * 📐 Distance-scale measurement tool — two-click great-circle ruler on
 * the celestial sphere.
 *
 * Lifecycle:
 *   1. `addPoint(dir)` — drops a marker at unit-vector `dir`. After two
 *      points are placed a great-circle arc is drawn between them.
 *   2. `clear()` — removes all markers + the arc.
 *
 * Public state:
 *   - `points` — the recorded directions (max 2)
 *   - `angularDeg` — separation in degrees when both points exist
 *
 * The whole tool lives in `group` which the universe scene parents under
 * its `hipsGroup` (radius-2000 sphere). All positions are stored as
 * unit vectors and scaled to `RADIUS` so they sit just inside the sky.
 */

const RADIUS = 0.998;
const ARC_SEGMENTS = 64;

export class MeasureTool {
  readonly group = new Group();
  private markerTex: CanvasTexture;
  private markerSprites: Sprite[] = [];
  private arc: Line | null = null;
  readonly points: Vector3[] = [];

  constructor() {
    this.group.name = "MeasureTool";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 5;
    this.markerTex = makeMarkerTexture();
  }

  /** Drop a marker at the given unit-direction (celestial, NOT world). */
  addPoint(dir: Vector3): void {
    if (this.points.length >= 2) this.clear();
    const d = dir.clone().normalize();
    this.points.push(d);
    const mat = new SpriteMaterial({
      map: this.markerTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    const sprite = new Sprite(mat);
    sprite.scale.set(0.025, 0.025, 1);
    sprite.position.set(d.x * RADIUS, d.y * RADIUS, d.z * RADIUS);
    sprite.renderOrder = 6;
    this.markerSprites.push(sprite);
    this.group.add(sprite);

    if (this.points.length === 2) this.buildArc();
  }

  clear(): void {
    for (const s of this.markerSprites) {
      (s.material as SpriteMaterial).dispose();
      this.group.remove(s);
    }
    this.markerSprites = [];
    this.points.length = 0;
    if (this.arc) {
      (this.arc.material as LineBasicMaterial).dispose();
      this.arc.geometry.dispose();
      this.group.remove(this.arc);
      this.arc = null;
    }
  }

  /** Angular separation in degrees between the two recorded directions. */
  angularDeg(): number {
    if (this.points.length < 2) return 0;
    const dot = Math.max(
      -1,
      Math.min(1, this.points[0]!.dot(this.points[1]!)),
    );
    return (Math.acos(dot) * 180) / Math.PI;
  }

  dispose(): void {
    this.clear();
    this.markerTex.dispose();
  }

  private buildArc(): void {
    const a = this.points[0]!;
    const b = this.points[1]!;
    const dot = Math.max(-1, Math.min(1, a.dot(b)));
    const omega = Math.acos(dot);
    if (omega < 1e-4) return; // points are the same — skip the arc

    const sinOmega = Math.sin(omega);
    const positions = new Float32Array(ARC_SEGMENTS * 3 + 3);
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = i / ARC_SEGMENTS;
      const w1 = Math.sin((1 - t) * omega) / sinOmega;
      const w2 = Math.sin(t * omega) / sinOmega;
      const x = a.x * w1 + b.x * w2;
      const y = a.y * w1 + b.y * w2;
      const z = a.z * w1 + b.z * w2;
      const k = RADIUS / Math.hypot(x, y, z);
      positions[i * 3] = x * k;
      positions[i * 3 + 1] = y * k;
      positions[i * 3 + 2] = z * k;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    const mat = new LineBasicMaterial({
      color: new Color(0x7cf3c4),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    const arc = new Line(geom, mat);
    arc.renderOrder = 5;
    this.arc = arc;
    this.group.add(arc);
  }
}

function makeMarkerTexture(): CanvasTexture {
  const SIZE = 96;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  // Outer cross-hair
  ctx.strokeStyle = "rgba(124, 243, 196, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy);
  ctx.lineTo(cx - 10, cy);
  ctx.moveTo(cx + 10, cy);
  ctx.lineTo(cx + 28, cy);
  ctx.moveTo(cx, cy - 28);
  ctx.lineTo(cx, cy - 10);
  ctx.moveTo(cx, cy + 10);
  ctx.lineTo(cx, cy + 28);
  ctx.stroke();
  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.stroke();
  // Centre dot
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/**
 * Convert a world-space direction (Y-up) back to celestial RA/Dec
 * (Z-up) so we can store + display it.
 *
 *   world (x, y, z) ← celestial (xc, -zw, yw)   (the -π/2 X-rotation
 *   used by hips/sky groups). So inverse: xc = xw, yc = -zw, zc = yw.
 */
export function worldDirToRaDec(world: Vector3): {
  raDeg: number;
  decDeg: number;
  celestial: Vector3;
} {
  const d = world.clone().normalize();
  const xc = d.x;
  const yc = -d.z;
  const zc = d.y;
  const decDeg = (Math.asin(Math.max(-1, Math.min(1, zc))) * 180) / Math.PI;
  let raDeg = (Math.atan2(yc, xc) * 180) / Math.PI;
  if (raDeg < 0) raDeg += 360;
  return { raDeg, decDeg, celestial: new Vector3(xc, yc, zc) };
}

/**
 * Human-readable equivalents for a given angular separation in degrees.
 * Full moon ≈ 0.5°, fingertip-at-arms-length ≈ 1°, fist ≈ 10°.
 */
export function angularEquivalents(deg: number): string {
  if (deg < 0.1) return `${(deg * 60).toFixed(1)}'`;
  if (deg < 1) return `${(deg * 60).toFixed(0)}' · ~${(deg / 0.5).toFixed(1)} full moons`;
  if (deg < 5) return `${deg.toFixed(2)}° · ~${(deg / 0.5).toFixed(0)} full moons`;
  if (deg < 30) return `${deg.toFixed(1)}° · ~${(deg / 10).toFixed(1)} fists at arm's length`;
  return `${deg.toFixed(1)}° · ~${(deg / 10).toFixed(1)} fists`;
}

/**
 * Format the celestial coordinates (RA in hours-minutes-seconds, Dec in
 * degrees-arcminutes-arcseconds) the way astronomers actually use them.
 */
export function formatRaDec(raDeg: number, decDeg: number): string {
  const raHours = raDeg / 15;
  const h = Math.floor(raHours);
  const mFrac = (raHours - h) * 60;
  const m = Math.floor(mFrac);
  const s = (mFrac - m) * 60;

  const sign = decDeg >= 0 ? "+" : "-";
  const absDec = Math.abs(decDeg);
  const dd = Math.floor(absDec);
  const dmFrac = (absDec - dd) * 60;
  const dm = Math.floor(dmFrac);
  const ds = (dmFrac - dm) * 60;

  return `RA ${h}h${pad2(m)}m${s.toFixed(1)}s · Dec ${sign}${pad2(dd)}°${pad2(dm)}'${ds.toFixed(1)}"`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

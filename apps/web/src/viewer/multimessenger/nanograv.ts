/**
 * 🌐 NANOGrav 15-yr pulsar timing array renderer.
 *
 * Two visual elements are stacked:
 *
 *  1. A small green crosshair for each of the 67 millisecond pulsars
 *     in the 15-year analysis. Crosshair geometry is procedural (line
 *     segments) so it stays a precise 8-px target at any zoom.
 *  2. A faint sky-wide gradient suggesting the stochastic GW background
 *     the array detected — a low-opacity backdrop sphere with a smooth
 *     noise texture that hints at "things are happening everywhere".
 *
 * Data: NANOGrav 15-yr pulsar list (see scripts/bake-multimessenger.ts).
 */

import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from "three";
import { raDecToVec3 } from "../stars/coords";

const PULSAR_RADIUS = 0.993;
const BG_RADIUS = 1.5;

export type NanoGravPulsar = {
  name: string;
  raDeg: number;
  decDeg: number;
  periodMs: number;
  distanceKpc: number;
};

export class NanoGravLayer {
  readonly group = new Group();
  private crosshairs: LineSegments | null = null;
  private bgMesh: Mesh | null = null;

  constructor() {
    this.group.name = "MMNanoGrav";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 2;
    this.group.visible = false;
  }

  setData(pulsars: NanoGravPulsar[]): void {
    this.dispose();
    if (pulsars.length === 0) return;
    this.buildCrosshairs(pulsars);
    this.buildBackground();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  private buildCrosshairs(pulsars: NanoGravPulsar[]): void {
    // 4 segments per crosshair × 2 vertices × 3 coords.
    // Segments: + horizontal, + vertical, × diag1, × diag2 — actually
    // just a "+" symbol (2 segments) keeps it clean.
    const segs = 2;
    const positions = new Float32Array(pulsars.length * segs * 2 * 3);
    const arm = 0.0035; // small fixed angular extent so the crosshair stays readable
    for (let i = 0; i < pulsars.length; i++) {
      const p = pulsars[i]!;
      const [cx, cy, cz] = raDecToVec3(p.raDeg, p.decDeg, PULSAR_RADIUS);
      // Pick two orthogonal tangent directions on the sphere (east + north).
      const raR = (p.raDeg * Math.PI) / 180;
      // East tangent: ∂/∂ra of (cos δ cos α, cos δ sin α, sin δ) = (−sin α, cos α, 0).
      const ex = -Math.sin(raR);
      const ey = Math.cos(raR);
      const ez = 0;
      // North tangent: ∂/∂δ. Use cross of radial × east, normalised.
      // radial = (cx, cy, cz); east = (ex, ey, ez); north = radial × east.
      const nx = cy * ez - cz * ey;
      const ny = cz * ex - cx * ez;
      const nz = cx * ey - cy * ex;
      const ln = Math.hypot(nx, ny, nz) || 1;
      const nXn = nx / ln;
      const nYn = ny / ln;
      const nZn = nz / ln;

      const o = i * segs * 2 * 3;
      // Horizontal arm: center ± east * arm
      positions[o + 0] = cx - ex * arm;
      positions[o + 1] = cy - ey * arm;
      positions[o + 2] = cz - ez * arm;
      positions[o + 3] = cx + ex * arm;
      positions[o + 4] = cy + ey * arm;
      positions[o + 5] = cz + ez * arm;
      // Vertical arm: center ± north * arm
      positions[o + 6] = cx - nXn * arm;
      positions[o + 7] = cy - nYn * arm;
      positions[o + 8] = cz - nZn * arm;
      positions[o + 9] = cx + nXn * arm;
      positions[o + 10] = cy + nYn * arm;
      positions[o + 11] = cz + nZn * arm;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.computeBoundingSphere();
    const mat = new LineBasicMaterial({
      color: 0x7cffa1,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
    });
    this.crosshairs = new LineSegments(geom, mat);
    this.crosshairs.frustumCulled = false;
    this.crosshairs.renderOrder = 2;
    this.group.add(this.crosshairs);
  }

  private buildBackground(): void {
    // Faint green-blue gradient on the back side of a large sphere.
    // We render after the starfield (renderOrder=2) with very low alpha
    // and additive blending so the user gets a "the whole sky is humming"
    // hint rather than a wall of paint.
    const geom = new SphereGeometry(BG_RADIUS, 48, 32);
    const mat = new ShaderMaterial({
      uniforms: {},
      vertexShader: BG_VERT,
      fragmentShader: BG_FRAG,
      transparent: true,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.bgMesh = new Mesh(geom, mat);
    this.bgMesh.frustumCulled = false;
    this.bgMesh.renderOrder = 0;
    this.group.add(this.bgMesh);
  }

  dispose(): void {
    if (this.crosshairs) {
      this.crosshairs.geometry.dispose();
      (this.crosshairs.material as LineBasicMaterial).dispose();
      this.group.remove(this.crosshairs);
      this.crosshairs = null;
    }
    if (this.bgMesh) {
      this.bgMesh.geometry.dispose();
      (this.bgMesh.material as ShaderMaterial).dispose();
      this.group.remove(this.bgMesh);
      this.bgMesh = null;
    }
  }
}

// ────────────────────────────────────────────────────────────────────
// Background shader — smooth dipole/quadrupole tint suggesting the SGWB
// Hellings-Downs correlation. Pure cosmetic; no physics interpretation.
// ────────────────────────────────────────────────────────────────────

const BG_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BG_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vDir;
  // Cheap value-noise so the background doesn't read as a flat tint.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(17.1, 113.5, 31.7))) * 43758.5453);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash(i);
    float n100 = hash(i + vec3(1,0,0));
    float n010 = hash(i + vec3(0,1,0));
    float n110 = hash(i + vec3(1,1,0));
    float n001 = hash(i + vec3(0,0,1));
    float n101 = hash(i + vec3(1,0,1));
    float n011 = hash(i + vec3(0,1,1));
    float n111 = hash(i + vec3(1,1,1));
    float x00 = mix(n000, n100, f.x);
    float x10 = mix(n010, n110, f.x);
    float x01 = mix(n001, n101, f.x);
    float x11 = mix(n011, n111, f.x);
    float y0 = mix(x00, x10, f.y);
    float y1 = mix(x01, x11, f.y);
    return mix(y0, y1, f.z);
  }
  void main() {
    // Two scales of noise so the gradient has a quadrupolar feel.
    float n = noise(vDir * 2.0) * 0.7 + noise(vDir * 6.0) * 0.3;
    vec3 tint = mix(vec3(0.05, 0.18, 0.12), vec3(0.10, 0.32, 0.22), n);
    // Cap alpha very low — this is a hint, not a wall.
    gl_FragColor = vec4(tint, 0.10);
  }
`;

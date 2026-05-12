/**
 * 〰️ LIGO/Virgo GW event renderer.
 *
 * Each event is a filled translucent violet disc whose radius represents
 * the 90 %-localisation area (deg^2). The disc is drawn additively so
 * overlapping localisations blend into a halo rather than masking each
 * other. `pick(ndc, camera)` returns the closest event on a tap so the
 * host UI can show the tooltip ("BBH · 35 + 30 M☉ · 440 Mpc") and play
 * the chirp audio.
 *
 * Data: GWOSC GWTC-3-confident (see scripts/bake-multimessenger.ts).
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
  type Camera,
  Vector2,
  Vector3,
} from "three";
import { raDecToVec3 } from "../stars/coords";

const RADIUS = 0.994;

export type LigoEvent = {
  id: string;
  raDeg: number;
  decDeg: number;
  area90DegSq: number;
  mass1Source: number;
  mass2Source: number;
  distanceMpc: number;
  type: "BBH" | "BNS" | "NSBH";
};

export class LigoLayer {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private items: LigoEvent[] = [];

  constructor() {
    this.group.name = "MMLigo";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 3;
    this.group.visible = false;
  }

  setData(items: LigoEvent[]): void {
    this.dispose();
    this.items = items;
    if (items.length === 0) return;
    const positions = new Float32Array(items.length * 3);
    const sizes = new Float32Array(items.length);
    const tints = new Float32Array(items.length * 3);
    for (let i = 0; i < items.length; i++) {
      const e = items[i]!;
      const [x, y, z] = raDecToVec3(e.raDeg, e.decDeg, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // Disc radius proportional to angular radius implied by area.
      // r_deg ≈ sqrt(area / π); we map 1 deg → ~14 px and clamp.
      const rDeg = Math.sqrt(Math.max(1, e.area90DegSq) / Math.PI);
      sizes[i] = Math.min(120, Math.max(18, rDeg * 6 + 16));
      const tint = colorForType(e.type);
      tints[i * 3] = tint[0];
      tints[i * 3 + 1] = tint[1];
      tints[i * 3 + 2] = tint[2];
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.setAttribute("aTint", new BufferAttribute(tints, 3));
    geom.computeBoundingSphere();
    this.material = new ShaderMaterial({
      uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geom, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  list(): LigoEvent[] {
    return this.items;
  }

  /**
   * NDC pick. Returns the nearest GW event within 5 % of the viewport
   * (~25 px on a 1000-px canvas) so the host UI can play a chirp.
   */
  pick(ndc: Vector2, camera: Camera): LigoEvent | null {
    if (!this.group.visible || this.items.length === 0) return null;
    const local = new Vector3();
    const world = new Vector3();
    let best = -1;
    let bestDist = 0.05;
    for (let i = 0; i < this.items.length; i++) {
      const e = this.items[i]!;
      const [x, y, z] = raDecToVec3(e.raDeg, e.decDeg, RADIUS);
      local.set(x, y, z);
      world.copy(local).applyMatrix4(this.group.matrixWorld);
      world.project(camera);
      if (world.z > 1 || world.z < -1) continue;
      const d = Math.hypot(world.x - ndc.x, world.y - ndc.y);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    return best >= 0 ? this.items[best] ?? null : null;
  }

  dispose(): void {
    if (this.points) {
      this.points.geometry.dispose();
      this.group.remove(this.points);
      this.points = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.items = [];
  }
}

function colorForType(t: LigoEvent["type"]): [number, number, number] {
  // BBH violet, BNS magenta-pink (kilonova-ish), NSBH lavender.
  if (t === "BNS") return [1.0, 0.45, 0.85];
  if (t === "NSBH") return [0.85, 0.65, 1.0];
  return [0.78, 0.55, 1.0];
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aTint;
  varying vec3 vTint;
  uniform float uPixelRatio;
  void main() {
    vTint = aTint;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vTint;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    // Soft filled disc — bright centre, smooth falloff. Edge stays faint
    // so adjacent localisations co-exist.
    float core = 1.0 - smoothstep(0.0, 0.10, r2);
    float body = 1.0 - smoothstep(0.05, 0.25, r2);
    float a = clamp(0.25 * body + 0.55 * core, 0.0, 1.0) * 0.55;
    gl_FragColor = vec4(vTint, a);
  }
`;

/**
 * 📒 Observation log field — yellow ✦ markers on the celestial sphere.
 *
 * Renders each saved observation as an additive yellow point with a
 * subtle pulse. Mirrors the shader strategy of `AtelField` so it visually
 * belongs to the live-alerts family but uses a warmer hue and a fixed
 * (no "appearance pulse") opacity — these are user history, not breaking
 * news.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";
import type { Observation } from "./store";

const RADIUS = 0.9962;

export class ObsLogField {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private startTimeMs = performance.now();
  private items: Observation[] = [];

  constructor() {
    this.group.name = "ObsLogField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 5;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  list(): ReadonlyArray<Observation> {
    return this.items;
  }

  setData(items: ReadonlyArray<Observation>): void {
    this.items = items.slice();
    this.rebuild();
  }

  update(): void {
    if (!this.material) return;
    const t = (performance.now() - this.startTimeMs) / 1000;
    const u = this.material.uniforms.uTime;
    if (u) u.value = t;
  }

  private rebuild(): void {
    this.disposeBuffers();
    if (this.items.length === 0) return;
    this.build();
  }

  private build(): void {
    const n = this.items.length;
    const positions = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const it = this.items[i];
      if (!it) continue;
      const [x, y, z] = raDecToVec3(it.ra_deg, it.dec_deg, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      phases[i] = (i * 0.6180339887) % 1;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aPhase", new BufferAttribute(phases, 1));
    geom.computeBoundingSphere();

    this.material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uTime: { value: 0 },
        uBaseSize: { value: 9 },
      },
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

  /** Resolve an observation by raycast hit position (best-effort). */
  findNearest(raDeg: number, decDeg: number, maxDeg = 1.5): Observation | null {
    let best: Observation | null = null;
    let bestSq = (maxDeg * maxDeg);
    for (const o of this.items) {
      const dRa = ((o.ra_deg - raDeg + 540) % 360) - 180;
      const dDec = o.dec_deg - decDeg;
      const sq = dRa * dRa + dDec * dDec;
      if (sq < bestSq) {
        bestSq = sq;
        best = o;
      }
    }
    return best;
  }

  private disposeBuffers(): void {
    if (this.points) {
      this.points.geometry.dispose();
      this.group.remove(this.points);
      this.points = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }

  dispose(): void {
    this.disposeBuffers();
    this.items = [];
  }
}

const VERT = /* glsl */ `
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uBaseSize;
  varying float vPulse;

  void main() {
    float omega = 6.2831853 / 2.7;
    float shimmer = sin(omega * (uTime + aPhase * 1.5));
    float scale = 1.0 + 0.12 * (shimmer + 1.0);
    vPulse = 0.5 + 0.5 * shimmer;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uBaseSize * uPixelRatio * scale;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vPulse;

  // Draw a stylised 4-point star (✦) by combining the 1-r distance with
  // an angular modulation. Cheap and looks "logged-by-hand".
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = atan(c.y, c.x);
    // 4 spokes: |cos(2a)| peaks at 0, π/2, π, 3π/2.
    float spoke = pow(abs(cos(2.0 * a)), 12.0);
    float spike = (1.0 - smoothstep(0.0, 0.5, r)) * spoke * 1.4;
    float core = 1.0 - smoothstep(0.0, 0.08, r * r);
    float alpha = clamp(core + spike * 0.55, 0.0, 1.0);
    alpha *= 0.55 + 0.45 * vPulse;
    // Warm yellow-amber.
    vec3 col = vec3(1.0, 0.86, 0.32);
    gl_FragColor = vec4(col, alpha);
  }
`;

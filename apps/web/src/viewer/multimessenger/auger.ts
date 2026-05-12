/**
 * 🔶 Pierre Auger UHECR renderer.
 *
 * Each event is a small amber dot on the celestial sphere; alpha scales
 * with `(energy / 100 EeV)` clipped to [0.4, 1.0] so the highest-energy
 * events stand out without erasing the rest.
 *
 * Data: Pierre Auger open data (public; see scripts/bake-multimessenger.ts).
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

const RADIUS = 0.995;

export type AugerEvent = {
  id: string;
  raDeg: number;
  decDeg: number;
  energyEeV: number;
  mjd: number;
};

export class AugerLayer {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;

  constructor() {
    this.group.name = "MMAuger";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 4;
    this.group.visible = false;
  }

  setData(items: AugerEvent[]): void {
    this.dispose();
    if (items.length === 0) return;
    const positions = new Float32Array(items.length * 3);
    const alphas = new Float32Array(items.length);
    const sizes = new Float32Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const e = items[i]!;
      const [x, y, z] = raDecToVec3(e.raDeg, e.decDeg, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const norm = Math.min(1, Math.max(0, (e.energyEeV - 40) / 120));
      alphas[i] = 0.4 + 0.6 * norm;
      // Modestly grow the dot for the headliners — 5 px → 9 px.
      sizes[i] = 5 + 4 * norm;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aAlpha", new BufferAttribute(alphas, 1));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
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
  }
}

const VERT = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  varying float vAlpha;
  uniform float uPixelRatio;
  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.02, 0.10, r2);
    float halo = (1.0 - smoothstep(0.10, 0.25, r2)) * 0.35;
    float a = clamp(core + halo, 0.0, 1.0) * vAlpha;
    // Amber: warm orange tone for cosmic rays.
    gl_FragColor = vec4(1.0, 0.70, 0.30, a);
  }
`;

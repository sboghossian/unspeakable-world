/**
 * 🌀 IceCube neutrino alert renderer.
 *
 * Each event is drawn as a hollow blue ring on the celestial sphere.
 * Ring radius scales with the 90 %-containment angular error so the
 * marker tells the viewer "the actual neutrino arrived somewhere inside
 * this disk". Inner alpha pulses softly so the field reads as live.
 *
 * Data: IceCube alert track catalog (public; see `scripts/bake-multimessenger.ts`).
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

const RADIUS = 0.996;

export type IceCubeEvent = {
  id: string;
  raDeg: number;
  decDeg: number;
  angErrDeg: number;
  log10Energy: number;
  mjd: number;
};

export class IceCubeLayer {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private startTimeMs = performance.now();

  constructor() {
    this.group.name = "MMIceCube";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 4;
    this.group.visible = false;
  }

  setData(items: IceCubeEvent[]): void {
    this.dispose();
    if (items.length === 0) return;
    const positions = new Float32Array(items.length * 3);
    const sizes = new Float32Array(items.length);
    const phases = new Float32Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const e = items[i]!;
      const [x, y, z] = raDecToVec3(e.raDeg, e.decDeg, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // Marker size in CSS px proportional to angular error.
      // Floor at 8 px so sub-arcsecond errors still register; cap at 40 px
      // so multi-degree HESE events don't drown the screen.
      const px = Math.min(40, Math.max(8, e.angErrDeg * 18 + 9));
      sizes[i] = px;
      phases[i] = (i * 0.6180339887) % 1;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.setAttribute("aPhase", new BufferAttribute(phases, 1));
    geom.computeBoundingSphere();

    this.material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uTime: { value: 0 },
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

  update(): void {
    if (!this.material) return;
    const t = (performance.now() - this.startTimeMs) / 1000;
    const u = this.material.uniforms.uTime;
    if (u) u.value = t;
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
  attribute float aSize;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vPulse;
  void main() {
    float omega = 6.2831853 / 2.4;
    float s = sin(omega * (uTime + aPhase * 2.4));
    vPulse = 0.5 + 0.5 * s;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio * (0.95 + 0.1 * s);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vPulse;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    // Hollow ring — strong edge, hollow centre. r ∈ [0,0.5].
    float r = sqrt(r2);
    float ring = smoothstep(0.36, 0.40, r) - smoothstep(0.46, 0.50, r);
    float glow = (1.0 - smoothstep(0.30, 0.50, r)) * 0.08;
    float a = clamp(ring + glow, 0.0, 1.0) * (0.7 + 0.3 * vPulse);
    gl_FragColor = vec4(0.31, 0.81, 1.0, a);
  }
`;

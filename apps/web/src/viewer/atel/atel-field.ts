/**
 * ATel field — small additive yellow markers on the celestial sphere.
 *
 * Mirrors the ZtfField rendering strategy (additive disc points on a
 * Group rotated -π/2 around X, radius 0.9955 so it sits just inside the
 * ZTF shell at 0.996 and the existing transient layer at 0.997). Color
 * is fixed yellow per the live-alerts palette: yellow=ATel, red-orange=
 * FXT, cyan=GOTO, magenta=BlackGEM.
 *
 * Newly-appeared markers (since the last `setData`) get a one-shot
 * appearance pulse identical to ZtfField so freshly-issued telegrams
 * read as "new".
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
import type { AtelEvent } from "./feed";

const RADIUS = 0.9955;
const RECENT_PULSE_MS = 1000;

export class AtelField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: AtelEvent[] = [];
  private material: ShaderMaterial | null = null;
  private appearedAt = new Float32Array(0);
  private startTimeMs = performance.now();

  constructor() {
    this.group.name = "AtelField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 5;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  count(): number {
    return this.items.length;
  }

  list(): AtelEvent[] {
    return this.items;
  }

  setData(items: AtelEvent[]): void {
    const prev = new Map<string, number>();
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it) prev.set(it.id, this.appearedAt[i] ?? 0);
    }
    const now = (performance.now() - this.startTimeMs) / 1000;
    this.items = items;
    this.appearedAt = new Float32Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it) continue;
      this.appearedAt[i] = prev.get(it.id) ?? now;
    }
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
    const appeared = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const it = this.items[i];
      if (!it) continue;
      const [x, y, z] = raDecToVec3(it.raDeg, it.decDeg, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      phases[i] = (i * 0.6180339887) % 1;
      appeared[i] = this.appearedAt[i] ?? 0;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aPhase", new BufferAttribute(phases, 1));
    geom.setAttribute("aAppeared", new BufferAttribute(appeared, 1));
    geom.computeBoundingSphere();

    this.material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uTime: { value: 0 },
        uBaseSize: { value: 8 },
        uPulseWindow: { value: RECENT_PULSE_MS / 1000 },
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
    this.appearedAt = new Float32Array(0);
  }
}

const VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aAppeared;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uBaseSize;
  uniform float uPulseWindow;
  varying float vPulse;

  void main() {
    float omega = 6.2831853 / 1.7;
    float shimmer = sin(omega * (uTime + aPhase * 1.5));
    float baseScale = 1.0 + 0.18 * (shimmer + 1.0);

    float age = max(uTime - aAppeared, 0.0);
    float k = clamp(1.0 - age / max(uPulseWindow, 0.001), 0.0, 1.0);
    float pulse = pow(k, 1.4) * 2.2;
    float scale = baseScale + pulse;

    vPulse = 0.5 + 0.5 * shimmer + 0.5 * k;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uBaseSize * uPixelRatio * scale;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vPulse;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.04, r2);
    float halo = (1.0 - smoothstep(0.04, 0.25, r2)) * 0.55;
    float a = clamp(core + halo, 0.0, 1.0);
    a *= 0.6 + 0.4 * vPulse;
    // ATel yellow.
    vec3 col = vec3(1.0, 0.92, 0.36);
    gl_FragColor = vec4(col, a);
  }
`;

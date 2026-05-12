/**
 * ZTF alert field — flashing markers on the celestial sphere.
 *
 * Each alert is drawn as a small additive disc at its RA/Dec, parented
 * to a Group on the celestial sphere (radius 0.996, just inside the
 * existing transient field at 0.997 so the two don't z-fight when both
 * are enabled). Recently-detected alerts (under `RECENT_PULSE_MS` since
 * marker first appeared in the local field) get a one-second size pulse
 * on appearance, then settle into a slow shimmer matching the rest of
 * the field.
 *
 * Color is constant — bright orange — to read distinctly from the
 * ALeRCE transient stream (red/magenta/yellow) and Gaia stars (white).
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Camera,
} from "three";
import { raDecToVec3 } from "../stars/coords";
import type { ZtfAlert } from "./lasair-feed";

const RADIUS = 0.996;
/** Per-marker one-shot pulse window after `setData`. */
const RECENT_PULSE_MS = 1000;

export type ZtfPick = ZtfAlert;

export class ZtfField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: ZtfAlert[] = [];
  private material: ShaderMaterial | null = null;
  private appearedAt = new Float32Array(0);
  private startTimeMs = performance.now();

  constructor() {
    this.group.name = "ZtfField";
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

  list(): ZtfAlert[] {
    return this.items;
  }

  /**
   * Replace the dataset and rebuild GPU buffers.
   *
   * Markers whose `oid` is new (not present in the previous frame) get
   * an `appearedAt` timestamp so the shader can flash them once.
   */
  setData(items: ZtfAlert[]): void {
    const prev = new Map<string, number>();
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it) prev.set(it.oid, this.appearedAt[i] ?? 0);
    }
    const now = (performance.now() - this.startTimeMs) / 1000;
    this.items = items;
    this.appearedAt = new Float32Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      this.appearedAt[i] = prev.get(it.oid) ?? now;
    }
    this.rebuild();
  }

  /** Drive the shader clock + per-marker pulse. */
  update(): void {
    if (!this.material) return;
    const t = (performance.now() - this.startTimeMs) / 1000;
    const u = this.material.uniforms.uTime;
    if (u) u.value = t;
  }

  /** Same NDC-proximity strategy as TransientField. */
  pick(ndc: Vector2, _: unknown, camera: Camera): ZtfPick | null {
    void _;
    if (!this.points || !this.group.visible || this.items.length === 0) {
      return null;
    }
    const local = new Vector3();
    const world = new Vector3();
    let bestIdx = -1;
    let bestDist = 0.03;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!;
      const [x, y, z] = raDecToVec3(item.raDeg, item.decDeg, RADIUS);
      local.set(x, y, z);
      world.copy(local).applyMatrix4(this.group.matrixWorld);
      world.project(camera);
      if (world.z > 1 || world.z < -1) continue;
      const dx = world.x - ndc.x;
      const dy = world.y - ndc.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return null;
    return this.items[bestIdx] ?? null;
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
      const it = this.items[i]!;
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
        uBaseSize: { value: 9 },
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
    // Background shimmer: 1.5s sine, per-marker phase offset.
    float omega = 6.2831853 / 1.5;
    float shimmer = sin(omega * (uTime + aPhase * 1.5));
    float baseScale = 1.0 + 0.2 * (shimmer + 1.0); // [1.0, 1.4]

    // One-shot appearance pulse: ease-out over uPulseWindow seconds.
    float age = max(uTime - aAppeared, 0.0);
    float k = clamp(1.0 - age / max(uPulseWindow, 0.001), 0.0, 1.0);
    float pulse = pow(k, 1.4) * 2.0; // [0, 2]
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
    // ZTF orange — distinct from the existing red/magenta transient set.
    vec3 col = vec3(1.0, 0.62, 0.22);
    gl_FragColor = vec4(col, a);
  }
`;

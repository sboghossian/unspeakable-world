import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
  type Camera,
  type Raycaster,
  Vector2,
  Vector3,
} from "three";
import { raDecToVec3 } from "../stars/coords";
import { classGroup, type Transient } from "./alerce-feed";

/**
 * 💫 Transient field — pulsing markers for live ZTF alerts from ALeRCE.
 *
 * Each transient is drawn as a small disc on the celestial sphere
 * (radius 0.997, just inside the constellation lines and pulsar layer
 * so it reads on top). The marker pulses size 1.0 ↔ 1.4 over 1.5 s, with
 * a per-vertex phase offset so the field shimmers as a whole rather than
 * blinking in lockstep.
 *
 * Color encodes the classifier group:
 *   • supernova candidates (SNIa / SNIbc / SNII / SN) → red
 *   • AGN / Blazar / QSO                            → magenta
 *   • periodic variables (LPV / EA / EB / RRL / …)  → yellow
 *   • CV / Nova                                     → green
 *   • everything else (Unknown)                     → cool white
 */

const RADIUS = 0.997;
const COLOR_BY_GROUP: Record<string, [number, number, number]> = {
  supernova: [1.0, 0.34, 0.34],
  agn: [1.0, 0.36, 0.92],
  variable: [1.0, 0.85, 0.32],
  cv: [0.42, 1.0, 0.55],
  unknown: [0.78, 0.86, 1.0],
};

export type TransientPick = Transient & {
  /** Group used for color coding. */
  group: "supernova" | "agn" | "variable" | "cv" | "unknown";
};

export class TransientField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: Transient[] = [];
  private material: ShaderMaterial | null = null;
  private startTimeMs = performance.now();

  constructor() {
    this.group.name = "TransientField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = 5; // above pulsars, below labels
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  count(): number {
    return this.items.length;
  }

  list(): Transient[] {
    return this.items;
  }

  /** Replace the entire dataset and rebuild the GPU buffers. */
  setData(items: Transient[]): void {
    this.items = items;
    this.disposeBuffers();
    if (items.length === 0) return;
    this.build();
  }

  /** Drive the pulse animation. Call once per frame from the scene tick. */
  update(): void {
    if (!this.material) return;
    const t = (performance.now() - this.startTimeMs) / 1000;
    const u = this.material.uniforms.uTime;
    if (u) u.value = t;
  }

  /**
   * NDC-proximity pick (the field is a Points layer, just like pulsars).
   * Returns the nearest transient within ~14 px on a 1000-px canvas.
   */
  pick(
    ndc: Vector2,
    _raycaster: Raycaster,
    camera: Camera,
  ): TransientPick | null {
    void _raycaster;
    if (!this.points || !this.group.visible || this.items.length === 0) {
      return null;
    }
    const local = new Vector3();
    const world = new Vector3();
    let bestIdx = -1;
    let bestDist = 0.03; // ~14 px on a 1000-px canvas
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
    const it = this.items[bestIdx]!;
    return { ...it, group: classGroup(it.className) ?? "unknown" };
  }

  private build(): void {
    const n = this.items.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const item = this.items[i]!;
      const [x, y, z] = raDecToVec3(item.raDeg, item.decDeg, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const g = classGroup(item.className) ?? "unknown";
      const rgb = COLOR_BY_GROUP[g] ?? COLOR_BY_GROUP.unknown!;
      colors[i * 3] = rgb[0]!;
      colors[i * 3 + 1] = rgb[1]!;
      colors[i * 3 + 2] = rgb[2]!;
      // Phase offset in [0, 1) so the field shimmers rather than blinking.
      phases[i] = (i * 0.6180339887) % 1; // golden-ratio low-discrepancy
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aColor", new BufferAttribute(colors, 3));
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
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uBaseSize;
  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vColor = aColor;
    // 1.5s period sine wave, scaled 1.0 → 1.4. Per-vertex phase offset
    // makes the swarm shimmer instead of blinking together.
    float omega = 6.2831853 / 1.5;
    float s = sin(omega * (uTime + aPhase * 1.5));
    float scale = 1.0 + 0.2 * (s + 1.0); // [1.0, 1.4]
    vPulse = 0.5 + 0.5 * s;              // [0,1] for fragment alpha lift
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uBaseSize * uPixelRatio * scale;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vPulse;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    // Bright core + halo. Core sharpens during peak pulse.
    float core = 1.0 - smoothstep(0.0, 0.04, r2);
    float halo = (1.0 - smoothstep(0.04, 0.25, r2)) * 0.55;
    float a = clamp(core + halo, 0.0, 1.0);
    a *= 0.65 + 0.35 * vPulse;
    gl_FragColor = vec4(vColor, a);
  }
`;

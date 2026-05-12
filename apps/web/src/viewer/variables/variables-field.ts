import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Variable-star overlay rendered as a pulsating-circle Points cloud.
 *
 * Color encodes the variable-star class:
 *   Cepheid              → yellow
 *   Delta Scuti          → blue
 *   Mira                 → red
 *   Eclipsing Binary     → green
 *   RR Lyrae             → orange
 *   LBV                  → magenta
 *   Cataclysmic / Nova   → cyan
 *   default / Irregular  → soft white
 *
 * Two related catalogs share this renderer: AAVSO / VSX bright stars and
 * — separately, with a reticle shader — NASA TESS TOI planet candidates.
 * The TOI variant lives in `toi-field.ts`.
 */

const RADIUS = 0.997;

export type VariableEntry = {
  name: string;
  ra: number;
  dec: number;
  type: string;
  vmag_min: number;
  vmag_max: number;
  period_days: number | null;
};

const COLOR_BY_TYPE: Record<string, [number, number, number]> = {
  Cepheid: [1.0, 0.92, 0.4],
  "RR Lyrae": [1.0, 0.65, 0.25],
  Mira: [1.0, 0.35, 0.32],
  "Semi-Regular": [1.0, 0.5, 0.45],
  "Delta Scuti": [0.45, 0.7, 1.0],
  "Eclipsing Binary": [0.4, 1.0, 0.6],
  LBV: [1.0, 0.45, 0.95],
  "RV Tauri": [1.0, 0.78, 0.55],
  "T Tauri": [0.78, 0.95, 0.55],
  Cataclysmic: [0.4, 0.95, 1.0],
  Irregular: [0.85, 0.85, 0.92],
  Other: [0.85, 0.85, 0.92],
};

function colorForType(type: string): [number, number, number] {
  const c = COLOR_BY_TYPE[type];
  if (c) return c;
  return [0.85, 0.85, 0.92];
}

export class VariablesField {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private items: VariableEntry[] = [];
  private startTimeMs = performance.now();

  constructor() {
    this.group.name = "VariablesField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = -2;
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

  list(): VariableEntry[] {
    return this.items;
  }

  setData(items: VariableEntry[]): void {
    this.items = items;
    if (this.points) this.disposePoints();
    this.build();
  }

  setMode(mode: "sky" | "galactic" | "universe"): void {
    if (mode === "sky") {
      this.group.rotation.x = -Math.PI / 2;
    } else {
      this.group.rotation.set(0, 0, 0);
    }
  }

  /** Advance the pulsation animation. ms is milliseconds since arbitrary epoch. */
  setTime(ms: number): void {
    if (this.material) {
      this.material.uniforms.uTime!.value = (ms - this.startTimeMs) * 0.001;
    }
  }

  private build(): void {
    if (this.items.length === 0) return;
    const positions = new Float32Array(this.items.length * 3);
    const colors = new Float32Array(this.items.length * 3);
    const sizes = new Float32Array(this.items.length);
    const phases = new Float32Array(this.items.length);

    for (let i = 0; i < this.items.length; i++) {
      const v = this.items[i]!;
      const [x, y, z] = raDecToVec3(v.ra, v.dec, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const [r, g, b] = colorForType(v.type);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      // Size from brightness (smaller mag = brighter). Floor 4 px, cap 10 px.
      const m = v.vmag_min;
      sizes[i] = Math.max(4, Math.min(10, 9 - m * 0.5));
      // Phase from index — staggers the pulse so the field shimmers.
      phases[i] = (i * 0.6180339887) % 1;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
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
    this.points.renderOrder = -2;
    this.group.add(this.points);
  }

  private disposePoints(): void {
    if (!this.points) return;
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
    this.group.remove(this.points);
    this.points = null;
    this.material = null;
  }

  dispose(): void {
    this.disposePoints();
    this.items = [];
  }
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vPulse;
  uniform float uPixelRatio;
  uniform float uTime;

  void main() {
    vColor = color;
    // 2π * (t/T + phase). Period ~2.4s, amplitude 0.25.
    float t = uTime * 0.42 + aPhase * 6.2831853;
    vPulse = 1.0 + sin(t) * 0.25;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * vPulse * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vPulse;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    // Soft round dot.
    float core = 1.0 - smoothstep(0.0, 0.06, r2);
    float halo = (1.0 - smoothstep(0.06, 0.25, r2)) * 0.40;
    float a = clamp(core + halo, 0.0, 1.0);
    if (a < 0.04) discard;
    // Pulse modulates alpha gently so size + alpha breathe together.
    gl_FragColor = vec4(vColor, a * 0.85 * mix(0.8, 1.05, (vPulse - 0.75) * 2.0));
  }
`;

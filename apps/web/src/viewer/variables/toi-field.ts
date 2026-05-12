import {
  BufferAttribute,
  BufferGeometry,
  Group,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * TESS Object of Interest (TOI) markers — small target reticles.
 *
 * Source: NASA Exoplanet Archive `toi` table (public domain). Each
 * marker plots the host's ICRS position. The reticle shader draws a
 * crosshair + ring, color-coded by TFOPWG disposition:
 *
 *   CP  — confirmed planet         → bright green
 *   KP  — known planet             → cyan
 *   PC  — planet candidate         → yellow
 *   APC — ambiguous candidate      → orange
 *   FP  — false positive           → red
 *   FA  — false alarm              → dim red
 *   *   — anything else            → soft gray
 */

const RADIUS = 0.9965;

export type ToiEntry = {
  toi: number;
  ra: number;
  dec: number;
  disp: string;
  period_days: number | null;
  duration_hr: number | null;
};

function colorForDisp(disp: string): [number, number, number] {
  switch (disp.toUpperCase()) {
    case "CP":
      return [0.35, 1.0, 0.4];
    case "KP":
      return [0.35, 0.95, 1.0];
    case "PC":
      return [1.0, 0.92, 0.35];
    case "APC":
      return [1.0, 0.7, 0.3];
    case "FP":
      return [1.0, 0.4, 0.4];
    case "FA":
      return [0.7, 0.35, 0.35];
    default:
      return [0.78, 0.84, 0.92];
  }
}

export class ToiField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: ToiEntry[] = [];

  constructor() {
    this.group.name = "ToiField";
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

  list(): ToiEntry[] {
    return this.items;
  }

  setData(items: ToiEntry[]): void {
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

  private build(): void {
    if (this.items.length === 0) return;
    const positions = new Float32Array(this.items.length * 3);
    const colors = new Float32Array(this.items.length * 3);

    for (let i = 0; i < this.items.length; i++) {
      const t = this.items[i]!;
      const [x, y, z] = raDecToVec3(t.ra, t.dec, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const [r, g, b] = colorForDisp(t.disp);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uPointSize: { value: 8 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: NormalBlending,
    });

    this.points = new Points(geom, material);
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
  }

  dispose(): void {
    this.disposePoints();
    this.items = [];
  }
}

const VERT = /* glsl */ `
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;
  uniform float uPointSize;

  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPointSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // Small target reticle: thin ring + horizontal/vertical tick marks.
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;

    // Ring: bright between 0.34 and 0.44.
    float ring = smoothstep(0.30, 0.36, r) - smoothstep(0.40, 0.46, r);

    // Crosshair ticks: short bars along ±x and ±y just outside the ring.
    float bx = step(abs(c.y), 0.02) * step(0.18, abs(c.x)) * step(abs(c.x), 0.32);
    float by = step(abs(c.x), 0.02) * step(0.18, abs(c.y)) * step(abs(c.y), 0.32);
    float cross = max(bx, by);

    float a = clamp(max(ring, cross), 0.0, 1.0);
    if (a < 0.04) discard;
    gl_FragColor = vec4(vColor, a * 0.9);
  }
`;

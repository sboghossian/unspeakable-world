import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Deep-sky-objects overlay: Messier + bright NGC/IC as colored markers.
 *
 * Source: OpenNGC v1.0+ (CC BY-SA 4.0), filtered by `apps/etl/dso.mjs`.
 * Day 10 cut: ring-shaped points in type-coded colors. Labels and
 * hover/click integration come on Day 11+.
 *
 * Type colors:
 *   G  = Galaxy        deep blue
 *   GCl/OCl/Cl* = Cluster   yellow
 *   PN/SNR/Neb = Nebula     pink
 *   *  = Star (rarely DSO)  white
 *   default                gray
 */

const DSO_RADIUS = 0.997;

type DsoRow = {
  name: string;
  ra: number;
  dec: number;
  type: string;
  mag: number | null;
  common: string | null;
  messier: boolean;
};

export type DsoEntry = DsoRow & { index: number };

export class DsoField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: DsoEntry[] = [];

  constructor() {
    this.group.name = "DsoField";
    this.group.renderOrder = -3;
    this.group.rotation.x = -Math.PI / 2;
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`DSO catalog HTTP ${res.status}`);
    const list = (await res.json()) as DsoRow[];
    this.items = list.map((row, index) => ({ ...row, index }));
    this.build();
  }

  count(): number {
    return this.items.length;
  }

  /** Look up a DSO by index — useful when the future picker fires. */
  get(index: number): DsoEntry | null {
    return this.items[index] ?? null;
  }

  private build(): void {
    const positions = new Float32Array(this.items.length * 3);
    const colors = new Float32Array(this.items.length * 3);
    const sizes = new Float32Array(this.items.length);

    for (let i = 0; i < this.items.length; i++) {
      const d = this.items[i]!;
      const [x, y, z] = raDecToVec3(d.ra, d.dec, DSO_RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const [r, g, b] = colorForType(d.type);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Size: Messier objects are pulled larger so they always read,
      // others scale gently with magnitude.
      const baseSize = d.messier ? 14 : 8;
      const magBoost = d.mag !== null ? Math.max(0, 12 - d.mag) * 0.6 : 0;
      sizes[i] = baseSize + magBoost;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      // Additive feels right for DSOs — they're meant to highlight, not
      // overpaint. Stars use NormalBlending; DSOs use additive.
      blending: AdditiveBlending,
    });

    this.points = new Points(geom, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -3;
    this.group.add(this.points);
    void NormalBlending;
  }

  dispose(): void {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as ShaderMaterial).dispose();
      this.group.remove(this.points);
      this.points = null;
    }
    this.items = [];
  }
}

function colorForType(type: string): [number, number, number] {
  // Galaxy
  if (/^G/.test(type) && !type.startsWith("GC")) return [0.45, 0.7, 1.0];
  // Globular / Open cluster, Cl*
  if (/^G?Cl|^OCl|^GCl|^\*Ass/.test(type)) return [1.0, 0.86, 0.45];
  // Nebula categories
  if (/^PN|^Neb|^SNR|^HII|^EmN|^RfN/.test(type)) return [1.0, 0.55, 0.85];
  // Stars or unknown
  return [0.85, 0.85, 0.85];
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // Hollow ring — empty center, bright edge, soft outer halo.
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float ring = smoothstep(0.04, 0.08, r2) - smoothstep(0.10, 0.18, r2);
    float halo = (1.0 - smoothstep(0.18, 0.25, r2)) * 0.15;
    float a = clamp(ring + halo, 0.0, 1.0);
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

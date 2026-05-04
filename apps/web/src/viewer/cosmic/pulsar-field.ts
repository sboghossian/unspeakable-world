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
 * 🌟 Pulsar field — every entry in SIMBAD with otype='Psr' (~3.9K).
 *
 * Source: CDS SIMBAD via apps/etl/pulsars.mjs.
 * Each pulsar is a small amber point on the celestial sphere; AstroGrid
 * has the same layer with similar density. The renderer matches the
 * exoplanet field's GPU-instanced Points pattern.
 */

const RADIUS = 0.9968;

export type PulsarEntry = { name: string; ra: number; dec: number };

export class PulsarField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: PulsarEntry[] = [];

  constructor() {
    this.group.name = "PulsarField";
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

  list(): PulsarEntry[] {
    return this.items;
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`pulsars HTTP ${res.status}`);
    this.items = (await res.json()) as PulsarEntry[];
    this.build();
  }

  private build(): void {
    const positions = new Float32Array(this.items.length * 3);
    const sizes = new Float32Array(this.items.length);
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i]!;
      const [x, y, z] = raDecToVec3(p.ra, p.dec, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = 3;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.computeBoundingSphere();
    const material = new ShaderMaterial({
      uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geom, material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
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

const VERT = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;
const FRAG = /* glsl */ `
  void main() {
    // Amber pulsar dot
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.5;
    float a = clamp(core + halo, 0.0, 1.0);
    gl_FragColor = vec4(1.0, 0.78, 0.35, a * 0.85);
  }
`;

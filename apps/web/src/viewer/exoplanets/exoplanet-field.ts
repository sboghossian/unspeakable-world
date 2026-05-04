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
 * 🪐 Confirmed exoplanet markers.
 *
 * Source: NASA Exoplanet Archive PSCompPars table — public, no API key.
 * Each marker sits at the host star's ICRS coordinates (the planet itself
 * is unresolvable at any sky-atlas FOV, so we plot the system).
 *
 * 6,278 entries as a single GPU-instanced Points mesh — same render
 * pattern as the bright-star field.
 */

const RADIUS = 0.997;

export type ExoplanetEntry = {
  name: string;
  host: string;
  ra: number;
  dec: number;
  distPc: number | null;
  orbDays: number | null;
  year: number | null;
  method: string | null;
};

export class ExoplanetField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: ExoplanetEntry[] = [];

  constructor() {
    this.group.name = "ExoplanetField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = -2;
    this.group.visible = false; // toggle on demand
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

  list(): ExoplanetEntry[] {
    return this.items;
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`exoplanets HTTP ${res.status}`);
    this.items = (await res.json()) as ExoplanetEntry[];
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
      // Size: closer systems get a small bump; default 3 px so the
      // field reads as faint coloured dust at wide FOV.
      const dist = p.distPc ?? 1000;
      sizes[i] = 3 + Math.max(0, 6 - Math.log10(Math.max(1, dist))) * 0.8;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
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
      blending: AdditiveBlending,
    });
    this.points = new Points(geom, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -2;
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
    // Soft greenish dot — distinct from stars, DSOs, planets.
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.45;
    float a = clamp(core + halo, 0.0, 1.0);
    gl_FragColor = vec4(0.45, 1.0, 0.65, a * 0.85);
  }
`;

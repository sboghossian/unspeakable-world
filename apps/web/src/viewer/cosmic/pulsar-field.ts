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

/**
 * 🌟 Pulsar field — every entry in SIMBAD with otype='Psr' (~3.9K).
 *
 * Source: CDS SIMBAD via apps/etl/pulsars.mjs.
 * Each pulsar is a small amber point on the celestial sphere; AstroGrid
 * has the same layer with similar density. The renderer matches the
 * exoplanet field's GPU-instanced Points pattern.
 */

const RADIUS = 0.9968;

export type PulsarEntry = {
  name: string;
  ra: number;
  dec: number;
  /** Period in seconds — most JSON entries lack this; we fall back to a
   *  curated table for famous pulsars and a default 0.5 s otherwise. */
  periodSec?: number;
};

export type PulsarPick = {
  name: string;
  raDeg: number;
  decDeg: number;
  periodSec: number;
  /** Distance from Sun in light-years, if known (curated). */
  distanceLY?: number;
  /** Free-form note (e.g. "audible-rate pulsar"). */
  note?: string;
};

/**
 * Curated periods + distances for headline pulsars. Most of the
 * SIMBAD-derived JSON entries lack timing data; ATNF-style enrichments
 * are out of scope here. For unknown entries we fall back to 0.5 s, which
 * is the rough median of the canonical population — audibly slow but not
 * silent. Known entries get accurate values.
 */
const KNOWN_PULSARS: Record<string, { periodSec: number; distanceLY?: number; note?: string }> = {
  "PSR B0531+21": {
    periodSec: 0.0334,
    distanceLY: 6500,
    note: "Crab Pulsar — audible-rate hum (~30 Hz)",
  },
  "PSR J0534+2200": {
    periodSec: 0.0334,
    distanceLY: 6500,
    note: "Crab Pulsar — audible-rate hum (~30 Hz)",
  },
  "PSR B0833-45": { periodSec: 0.0893, distanceLY: 950, note: "Vela Pulsar" },
  "PSR J0835-4510": { periodSec: 0.0893, distanceLY: 950, note: "Vela Pulsar" },
  "PSR B1937+21": { periodSec: 0.001558, distanceLY: 7800, note: "first known millisecond pulsar" },
  "PSR J1939+2134": { periodSec: 0.001558, distanceLY: 7800, note: "first known millisecond pulsar" },
  "PSR B1919+21": { periodSec: 1.337, distanceLY: 2300, note: "Bell-Burnell discovery (1967)" },
  "PSR J1921+2153": { periodSec: 1.337, distanceLY: 2300, note: "Bell-Burnell discovery (1967)" },
};

const DEFAULT_PERIOD_SEC = 0.5;

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

  /**
   * Pick the closest pulsar to the click NDC. Pulsars live on the celestial
   * sphere (radius ~1 in local units, multiplied by skybox scale ~2000).
   * We project each pulsar's *world* position into NDC and pick the nearest
   * within a 12-pixel-equivalent threshold (0.025 NDC ≈ 12 px on a 1000-px
   * canvas). Cheap O(n) loop — 3.9k items, maybe 0.5 ms.
   */
  pick(ndc: Vector2, _raycaster: Raycaster, camera: Camera): PulsarPick | null {
    if (!this.points || !this.group.visible) return null;
    void _raycaster;
    const local = new Vector3();
    const world = new Vector3();
    let bestIdx = -1;
    let bestDist = 0.025; // NDC threshold (~12 px on a 1000-px canvas)
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i]!;
      const [x, y, z] = raDecToVec3(p.ra, p.dec, RADIUS);
      local.set(x, y, z);
      // Transform to world space (group rotation + parent scale + position).
      world.copy(local).applyMatrix4(this.group.matrixWorld);
      // Project into NDC.
      world.project(camera);
      // Behind camera — skip.
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
    const item = this.items[bestIdx]!;
    const known = KNOWN_PULSARS[item.name];
    const periodSec = item.periodSec ?? known?.periodSec ?? DEFAULT_PERIOD_SEC;
    const note = known?.note;
    const result: PulsarPick = {
      name: item.name,
      raDeg: item.ra,
      decDeg: item.dec,
      periodSec,
    };
    if (known?.distanceLY !== undefined) result.distanceLY = known.distanceLY;
    if (note !== undefined) result.note = note;
    return result;
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

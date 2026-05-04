import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import * as satelliteJs from "satellite.js";

/**
 * 🛰 Real-satellite catalog — TLE-driven.
 *
 * Source: Celestrak `gp.php` TLE feeds (stations, weather, GPS, Galileo,
 * GEO, Intelsat, Iridium NEXT, science, amateur — Starlink excluded as
 * visual noise). Each satellite's TLE is propagated client-side via
 * satellite.js (SGP4) to get its current ECI position; we map that to
 * scene coordinates around Earth.
 *
 * Designed to drop into the solar flight scene where Earth is a 3D body
 * — the satellite cloud reads as a halo of pinpricks at LEO altitudes,
 * widening out to GPS / GEO at greater radii.
 */

export type SatelliteEntry = {
  name: string;
  l1: string;
  l2: string;
  group: string;
};

type SatRecord = {
  entry: SatelliteEntry;
  satrec: ReturnType<typeof satelliteJs.twoline2satrec> | null;
};

export class SatelliteField {
  readonly group = new Group();
  private points: Points | null = null;
  private records: SatRecord[] = [];
  private positions: Float32Array | null = null;

  constructor() {
    this.group.name = "SatelliteField";
    this.group.renderOrder = 4;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  count(): number {
    return this.records.length;
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`satellites HTTP ${res.status}`);
    const list = (await res.json()) as SatelliteEntry[];
    for (const entry of list) {
      let satrec: SatRecord["satrec"] = null;
      try {
        satrec = satelliteJs.twoline2satrec(entry.l1, entry.l2);
      } catch {
        // skip malformed TLE
      }
      this.records.push({ entry, satrec });
    }
    this.build();
  }

  private build(): void {
    this.positions = new Float32Array(this.records.length * 3);
    const sizes = new Float32Array(this.records.length);
    for (let i = 0; i < this.records.length; i++) {
      sizes[i] = 2;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(this.positions, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    const mat = new ShaderMaterial({
      uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geom, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  /** Propagate every TLE to `time` and update the geometry. Caller should
   *  pass Earth's scene position so we can offset the cloud. */
  update(
    time: Date,
    earthScenePos: { x: number; y: number; z: number },
    sceneScale: number,
  ): void {
    if (!this.points || !this.positions || !this.group.visible) return;
    let dirty = false;
    for (let i = 0; i < this.records.length; i++) {
      const r = this.records[i]!;
      if (!r.satrec) continue;
      let posEci: { x: number; y: number; z: number } | null = null;
      try {
        const result = satelliteJs.propagate(r.satrec, time);
        if (result && typeof result !== "boolean") {
          const p = result.position;
          if (p && typeof p !== "boolean") {
            posEci = { x: p.x, y: p.y, z: p.z };
          }
        }
      } catch {
        // ignore — bad TLE epoch / propagation error
      }
      if (!posEci) continue;
      // ECI → scene-relative-to-Earth: ECI is in km. Earth's drawSize is
      // ~0.045 AU. Real Earth radius is 6371 km. Map km → scene units by
      // (km/EarthRadius) × (Earth-drawSize-in-scene-units × sceneScale).
      const km2unit = sceneScale;
      const sx = earthScenePos.x + posEci.x * km2unit;
      const sy = earthScenePos.y + posEci.z * km2unit; // z_eci → y_scene
      const sz = earthScenePos.z + -posEci.y * km2unit;
      this.positions[i * 3] = sx;
      this.positions[i * 3 + 1] = sy;
      this.positions[i * 3 + 2] = sz;
      dirty = true;
    }
    if (dirty) {
      (this.points.geometry.attributes.position as BufferAttribute)
        .needsUpdate = true;
    }
  }

  list(): SatelliteEntry[] {
    return this.records.map((r) => r.entry);
  }

  dispose(): void {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as ShaderMaterial).dispose();
      this.group.remove(this.points);
      this.points = null;
    }
    this.records = [];
    this.positions = null;
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
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.45;
    float a = clamp(core + halo, 0.0, 1.0);
    // cyan dot — distinct from stars
    gl_FragColor = vec4(0.55, 0.95, 1.0, a * 0.85);
  }
`;

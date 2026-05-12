/**
 * Starlink TLE-driven point cloud.
 *
 * For each TLE we propagate SGP4 via `satellite.js`, then place the
 * resulting ECI position relative to Earth's scene position. We mirror
 * the existing SatelliteField convention:
 *
 *   sceneScale  = drawSize / EARTH_RADIUS_KM   (= 0.045 / 6371 AU/km)
 *   sx = earthX + posEci.x * sceneScale
 *   sy = earthY + posEci.z * sceneScale
 *   sz = earthZ - posEci.y * sceneScale
 *
 * Earth's heliocentric AU position is recomputed each tick via
 * astronomy-engine's `HelioVector(Body.Earth, t)` — the host viewer
 * uses the same call, so the cloud always sits on the live Earth.
 *
 * Color: light cyan (visually distinct from the existing fuller-spectrum
 * SatelliteField and from gold ISS marker).
 *
 * Update cadence: every ~1 s (driven by the host calling `setTime`).
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import * as satelliteJs from "satellite.js";
import { Body, HelioVector } from "astronomy-engine";
import { log } from "../../lib/logger";
import type { Tle } from "./celestrak-tle";

/** Matches solar-flight.ts: Earth drawSize 0.045, EARTH_RADIUS_KM 6371. */
const SCENE_SCALE_AU_PER_KM = 0.045 / 6371;

type SatRecord = {
  tle: Tle;
  satrec: ReturnType<typeof satelliteJs.twoline2satrec> | null;
};

export class StarlinkField {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private records: SatRecord[] = [];
  private positions: Float32Array | null = null;
  private lastUpdateMs = 0;
  /** Throttle SGP4 to ~1 Hz; ~6000 calls/sec is fine on desktop, but a
   *  laptop on battery would rather we update once a second. */
  private readonly minIntervalMs = 1000;

  constructor() {
    this.group.name = "StarlinkField";
    this.group.renderOrder = 4;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  count(): number {
    return this.records.length;
  }

  /**
   * Replace the TLE catalog and rebuild GPU buffers. Each TLE is
   * pre-compiled into a satrec; malformed records are kept around with
   * a null satrec so indices stay stable.
   */
  setTles(tles: Tle[]): void {
    this.disposeBuffers();
    this.records = [];
    for (const tle of tles) {
      let satrec: SatRecord["satrec"] = null;
      try {
        satrec = satelliteJs.twoline2satrec(tle.l1, tle.l2);
      } catch {
        // bad TLE — keep the slot but skip propagation later
      }
      this.records.push({ tle, satrec });
    }
    this.build();
    this.lastUpdateMs = 0;
  }

  /**
   * Propagate every record to `simTime` (Date), and refresh the GPU
   * buffer. Throttled to `minIntervalMs`.
   */
  update(simTime: Date): void {
    if (!this.points || !this.positions || !this.group.visible) return;
    const nowReal = performance.now();
    if (nowReal - this.lastUpdateMs < this.minIntervalMs) return;
    this.lastUpdateMs = nowReal;

    // Earth's heliocentric AU position, scene-mapped (x, z, -y).
    let earthX = 0;
    let earthY = 0;
    let earthZ = 0;
    try {
      const v = HelioVector(Body.Earth, simTime);
      earthX = v.x;
      earthY = v.z;
      earthZ = -v.y;
    } catch (err) {
      log.warn("[starlink-optin] HelioVector failed", err);
      return;
    }

    let dirty = false;
    const km2unit = SCENE_SCALE_AU_PER_KM;
    for (let i = 0; i < this.records.length; i++) {
      const r = this.records[i]!;
      if (!r.satrec) continue;
      let posEci: { x: number; y: number; z: number } | null = null;
      try {
        const result = satelliteJs.propagate(r.satrec, simTime);
        if (result && typeof result !== "boolean") {
          const p = result.position;
          if (p && typeof p !== "boolean") {
            posEci = { x: p.x, y: p.y, z: p.z };
          }
        }
      } catch {
        // stale TLE / SGP4 numerical edge — leave previous position
      }
      if (!posEci) continue;
      const sx = earthX + posEci.x * km2unit;
      const sy = earthY + posEci.z * km2unit;
      const sz = earthZ + -posEci.y * km2unit;
      this.positions[i * 3] = sx;
      this.positions[i * 3 + 1] = sy;
      this.positions[i * 3 + 2] = sz;
      dirty = true;
    }
    if (dirty) {
      const attr = this.points.geometry.attributes.position;
      if (attr) (attr as BufferAttribute).needsUpdate = true;
    }
  }

  private build(): void {
    const n = this.records.length;
    this.positions = new Float32Array(n * 3);
    // Start every marker at the origin until the first update places it
    // around Earth. Without this they'd briefly flash at 0,0,0 — fine
    // because the layer is invisible until the host enables it.
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.material = new ShaderMaterial({
      uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
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
    this.records = [];
    this.positions = null;
  }
}

const VERT = /* glsl */ `
  uniform float uPixelRatio;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 1.6 * uPixelRatio;
  }
`;
const FRAG = /* glsl */ `
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.35;
    float a = clamp(core + halo, 0.0, 1.0);
    // Light cyan — soft enough to read as a swarm rather than a wall.
    gl_FragColor = vec4(0.78, 0.96, 1.0, a * 0.72);
  }
`;

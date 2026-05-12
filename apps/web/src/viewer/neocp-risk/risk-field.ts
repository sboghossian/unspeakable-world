/**
 * NEOCP impact-risk field — orange diamond markers in solar mode.
 *
 * Sentry doesn't publish orbital elements with the risk summary, so we
 * place each object on a deterministic pseudo-orbit (semimajor axis
 * 0.8–2.0 AU, inclination ±15°, hash-seeded mean longitude). This is
 * symbolic, not an ephemeris — the tooltip in the panel says so.
 *
 * Marker color runs a log color-ramp keyed on impact probability:
 *   ip ≤ 1e-6   → pale yellow
 *   ip ~ 1e-4   → amber
 *   ip ≥ 1e-2   → deep orange-red
 *
 * The diamond shape is drawn in the fragment shader (rotated 45° square
 * mask) — keeps everything as a single Points draw call.
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
import { hashUnit, type ImpactRisk } from "./sentry-feed";

const TWO_PI = Math.PI * 2;

export type RiskPick = ImpactRisk & {
  /** Where the marker is placed in scene-AU. Useful for the panel. */
  scenePos: { x: number; y: number; z: number };
};

/**
 * Compute deterministic pseudo-orbit position for an object, in
 * heliocentric ecliptic AU (same frame as solar-flight planets).
 *
 * The function is pure of side-effects and stable per-`designation`, so
 * markers don't jump between refreshes.
 */
export function pseudoOrbitPosition(designation: string): {
  x: number;
  y: number;
  z: number;
} {
  const h1 = hashUnit(designation);
  const h2 = hashUnit(designation + "+a");
  const h3 = hashUnit(designation + "+i");
  // Semimajor axis 0.8 → 2.0 AU (covers Atens, Apollos, Amors).
  const a = 0.8 + h2 * 1.2;
  // Inclination ±15° (most NEAs have low inclination, capped at i=π/12).
  const inc = (h3 - 0.5) * (Math.PI / 6);
  // Mean longitude — circular orbit, no eccentricity (cosmetic).
  const l = h1 * TWO_PI;
  const x = a * Math.cos(l);
  const yEcl = a * Math.sin(l);
  // Map ecliptic (x, y_ecl, 0) → scene (x, sin·inc bumps z, -y_ecl).
  return {
    x,
    y: Math.sin(inc) * a,
    z: -yEcl * Math.cos(inc),
  };
}

/** Log color-ramp on impact probability — pale yellow → deep red. */
function rampColor(ip: number): [number, number, number] {
  const k = Math.max(0, Math.min(1, (Math.log10(Math.max(ip, 1e-9)) + 7) / 7));
  // 0 → pale yellow (1,0.95,0.55), 0.5 → orange (1,0.62,0.22), 1 → red (1,0.32,0.18).
  if (k < 0.5) {
    const t = k / 0.5;
    return [1.0, 0.95 - t * 0.33, 0.55 - t * 0.33];
  }
  const t = (k - 0.5) / 0.5;
  return [1.0, 0.62 - t * 0.3, 0.22 - t * 0.04];
}

export class RiskField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: ImpactRisk[] = [];
  private positions: Float32Array = new Float32Array(0);
  private material: ShaderMaterial | null = null;
  private startTimeMs = performance.now();

  constructor() {
    this.group.name = "NeocpRiskField";
    this.group.renderOrder = 4;
    this.group.visible = false;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  count(): number {
    return this.items.length;
  }

  list(): ImpactRisk[] {
    return this.items;
  }

  setData(items: ImpactRisk[]): void {
    this.items = items;
    this.rebuild();
  }

  update(): void {
    if (!this.material) return;
    const t = (performance.now() - this.startTimeMs) / 1000;
    const u = this.material.uniforms.uTime;
    if (u) u.value = t;
  }

  /**
   * NDC-proximity pick. The risk field lives in solar space (AU), so
   * we project each marker's world position via the active camera.
   */
  pick(ndc: Vector2, _: unknown, camera: Camera): RiskPick | null {
    void _;
    if (!this.points || !this.group.visible || this.items.length === 0) {
      return null;
    }
    const world = new Vector3();
    let bestIdx = -1;
    let bestDist = 0.04;
    for (let i = 0; i < this.items.length; i++) {
      const x = this.positions[i * 3] ?? 0;
      const y = this.positions[i * 3 + 1] ?? 0;
      const z = this.positions[i * 3 + 2] ?? 0;
      world.set(x, y, z).applyMatrix4(this.group.matrixWorld);
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
    const item = this.items[bestIdx];
    if (!item) return null;
    return {
      ...item,
      scenePos: {
        x: this.positions[bestIdx * 3] ?? 0,
        y: this.positions[bestIdx * 3 + 1] ?? 0,
        z: this.positions[bestIdx * 3 + 2] ?? 0,
      },
    };
  }

  private rebuild(): void {
    this.disposeBuffers();
    if (this.items.length === 0) return;
    this.build();
  }

  private build(): void {
    const n = this.items.length;
    this.positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const it = this.items[i]!;
      const p = pseudoOrbitPosition(it.designation);
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      const [r, g, b] = rampColor(it.ip);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      phases[i] = (i * 0.6180339887) % 1;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(this.positions, 3));
    geom.setAttribute("aColor", new BufferAttribute(colors, 3));
    geom.setAttribute("aPhase", new BufferAttribute(phases, 1));
    geom.computeBoundingSphere();

    this.material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uTime: { value: 0 },
        uBaseSize: { value: 14 },
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
    this.positions = new Float32Array(0);
  }
}

const VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uBaseSize;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    // Gentle 3s breathing pulse — these objects are reminders, not alarms.
    float omega = 6.2831853 / 3.0;
    float s = sin(omega * (uTime + aPhase * 3.0));
    float scale = 1.0 + 0.12 * (s + 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uBaseSize * uPixelRatio * scale;
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  void main() {
    // Diamond mask — rotated-square L1 distance.
    vec2 c = gl_PointCoord - 0.5;
    float d = abs(c.x) + abs(c.y);
    if (d > 0.45) discard;
    float core = 1.0 - smoothstep(0.0, 0.18, d);
    float edge = (1.0 - smoothstep(0.18, 0.45, d)) * 0.6;
    float a = clamp(core + edge, 0.0, 1.0);
    gl_FragColor = vec4(vColor, a);
  }
`;

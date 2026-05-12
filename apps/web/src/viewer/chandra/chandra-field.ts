import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import { fetchCatalogJson } from "../../lib/idb-cache";
import { log } from "../../lib/logger";
import { raDecToVec3 } from "../stars/coords";

/**
 * Chandra X-ray sources overlay.
 *
 * Source: curated subset of bright sources from the Chandra Source
 * Catalog 2.0 release (NASA/CXC, public domain) plus historically
 * important X-ray sources (Cyg X-1, Sco X-1, Cas A, Sgr A*, …).
 *
 * Marker: tiny diamond rendered with a shader-derived rotated square
 * mask. Color encodes the hardness ratio:
 *   hr → +1 (hard)  → cool blue
 *   hr →  0 (mid)   → purple
 *   hr → -1 (soft)  → warm red
 */

const RADIUS = 0.996; // slightly inside the DSO/star spheres
const SKY_GROUP_RENDER_ORDER = -2;

export type ChandraSource = {
  name: string;
  ra: number;
  dec: number;
  flux_aper_b: number;
  hard_ratio_hm: number;
  type: string;
  notes?: string;
};

type Payload = {
  generated: string;
  attribution: string;
  count: number;
  sources: ChandraSource[];
};

export class ChandraField {
  readonly group = new Group();
  private points: Points | null = null;
  private items: ChandraSource[] = [];

  constructor() {
    this.group.name = "ChandraField";
    this.group.rotation.x = -Math.PI / 2;
    this.group.renderOrder = SKY_GROUP_RENDER_ORDER;
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

  list(): ChandraSource[] {
    return this.items;
  }

  async load(url: string): Promise<void> {
    try {
      const payload = await fetchCatalogJson<Payload>("exoplanets", url);
      this.items = payload.sources;
      this.build();
    } catch (err) {
      log.warn("[chandra] load failed", err);
      this.items = [];
    }
  }

  /** Set sources directly — used for unit tests / dev overrides. */
  setData(items: ChandraSource[]): void {
    this.items = items;
    if (this.points) {
      this.disposePoints();
    }
    this.build();
  }

  /** Switch render geometry between sky (unit sphere) and 3D modes. */
  setMode(mode: "sky" | "galactic" | "universe"): void {
    // Sky uses the celestial-sphere rotation applied at the group level.
    // Galactic / universe modes project to the same unit sphere (no
    // parallax data for X-ray sources at this scope), but we keep the
    // group rotation consistent — the parent group decides how the sky
    // is oriented relative to the galaxy/universe view.
    if (mode === "sky") {
      this.group.rotation.x = -Math.PI / 2;
    } else {
      // In galactic/universe mode, leave the orientation up to the
      // parent. Reset to identity so the parent's transform is honored.
      this.group.rotation.set(0, 0, 0);
    }
  }

  private build(): void {
    if (this.items.length === 0) return;
    const positions = new Float32Array(this.items.length * 3);
    const colors = new Float32Array(this.items.length * 3);
    const sizes = new Float32Array(this.items.length);

    for (let i = 0; i < this.items.length; i++) {
      const s = this.items[i]!;
      const [x, y, z] = raDecToVec3(s.ra, s.dec, RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const [r, g, b] = colorForHardness(s.hard_ratio_hm);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Size scaled by log flux: very bright Sco X-1 reads ~9 px, faint
      // ULXs ~4 px. floor at 4 px so all markers stay clickable.
      const logF = Math.log10(Math.max(1e-16, s.flux_aper_b));
      // logF roughly in [-16, -7]. Map -7 → 9, -13 → 4.
      const size = Math.max(4, Math.min(10, 4 + (logF + 13) * 0.8));
      sizes[i] = size;
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
      blending: AdditiveBlending,
    });

    this.points = new Points(geom, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = SKY_GROUP_RENDER_ORDER;
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

/**
 * Map hardness ratio ∈ [-1, +1] to an RGB triple.
 *   +1 →  cool blue
 *    0 →  violet
 *   -1 →  warm red
 */
function colorForHardness(hr: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, hr));
  // t in [-1, +1] → mix between red (soft) and blue (hard) through purple.
  const u = (t + 1) * 0.5; // 0 → red, 1 → blue
  const r = 1.0 - u * 0.6; // 1.0 → 0.4
  const g = 0.25 + (1 - Math.abs(t)) * 0.15; // peaks at hr=0
  const b = 0.35 + u * 0.6; // 0.35 → 0.95
  return [r, g, b];
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;

  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // Diamond marker: rotate the point's [0,1] coord 45° and clip a square.
    vec2 c = gl_PointCoord - 0.5;
    // 45° rotation
    vec2 r = vec2(c.x - c.y, c.x + c.y) * 0.70710678;
    float d = max(abs(r.x), abs(r.y));
    if (d > 0.42) discard;
    // Bright outer edge, soft interior — diamond outline.
    float edge = smoothstep(0.32, 0.40, d) - smoothstep(0.40, 0.44, d);
    float core = (1.0 - smoothstep(0.0, 0.16, d)) * 0.55;
    float a = clamp(edge + core, 0.0, 1.0);
    if (a < 0.03) discard;
    gl_FragColor = vec4(vColor, a * 0.9);
  }
`;

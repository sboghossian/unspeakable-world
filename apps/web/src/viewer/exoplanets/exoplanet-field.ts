import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "three";
import { fetchCatalogJson } from "../../lib/idb-cache";
import { raDecToVec3 } from "../stars/coords";
import {
  esiToRgb,
  loadHabitability,
  lookup,
  type HabitabilityIndex,
} from "./habitability";

/**
 * 🪐 Confirmed exoplanet markers.
 *
 * Source: NASA Exoplanet Archive PSCompPars table — public, no API key.
 * Each marker sits at the host star's ICRS coordinates (the planet itself
 * is unresolvable at any sky-atlas FOV, so we plot the system).
 *
 * Renders ~6K-15K systems as a single GPU-instanced Points mesh —
 * same render pattern as the bright-star field. Per-vertex colour buffer
 * lets us recolour by discovery method, habitability (PHL ESI), or
 * discovery year without rebuilding geometry.
 *
 * Companion ring geometry overlays each multi-planet system with a small
 * outline ring whose size grows with planet count.
 */

const RADIUS = 0.997;
const RING_RADIUS = 0.998;

export type ExoplanetEntry = {
  name: string;
  host: string;
  ra: number;
  dec: number;
  distPc: number | null;
  orbDays: number | null;
  year: number | null;
  method: string | null;
  /** Full-dataset fields — optional so the legacy slim JSON still loads. */
  radEarth?: number | null;
  massEarth?: number | null;
  eqt?: number | null;
};

export type ExoplanetColorMode = "method" | "habitability" | "discovery_year";

/** Discovery-method base colours (linear sRGB). */
const METHOD_COLORS: Readonly<Record<string, [number, number, number]>> = {
  transit: [0.65, 0.4, 1.0], // purple
  "radial velocity": [0.35, 0.6, 1.0], // blue
  imaging: [0.35, 1.0, 0.55], // green
  microlensing: [1.0, 0.65, 0.25], // orange
  astrometry: [1.0, 0.85, 0.45], // pale yellow
  "transit timing variations": [0.9, 0.55, 0.9], // pink
  "eclipse timing variations": [0.7, 0.7, 0.95], // periwinkle
  "pulsar timing": [1.0, 0.95, 0.95], // near-white
  "pulsation timing variations": [0.95, 0.9, 1.0],
  "orbital brightness modulation": [0.55, 0.85, 0.9],
  "disk kinematics": [0.6, 0.9, 0.85],
};
const DEFAULT_METHOD_COLOR: [number, number, number] = [0.55, 0.85, 0.75];

function methodColor(m: string | null): [number, number, number] {
  if (!m) return DEFAULT_METHOD_COLOR;
  const k = m.trim().toLowerCase();
  return METHOD_COLORS[k] ?? DEFAULT_METHOD_COLOR;
}

/** Discovery-year → cool blue (1992) to hot orange (2026). */
function yearColor(year: number | null): [number, number, number] {
  if (year === null) return [0.4, 0.4, 0.45];
  const t = Math.max(0, Math.min(1, (year - 1992) / (2030 - 1992)));
  // viridis-ish
  if (t < 0.5) {
    const u = t / 0.5;
    return [0.27 + 0.0 * u, 0.0 + 0.7 * u, 0.33 + 0.2 * u];
  }
  const u = (t - 0.5) / 0.5;
  return [0.27 + 0.7 * u, 0.7 + 0.2 * u, 0.53 - 0.4 * u];
}

export class ExoplanetField {
  readonly group = new Group();
  private points: Points | null = null;
  private rings: Points | null = null;
  private items: ExoplanetEntry[] = [];
  private habitability: HabitabilityIndex | null = null;
  private habitabilityUrl: string | null = "/data/phl-hwc.json";
  private colorMode: ExoplanetColorMode = "method";

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

  /**
   * Pick which habitability JSON to merge. Pass `null` to skip the
   * habitability fetch entirely. Defaults to `/data/phl-hwc.json`.
   */
  setHabitabilitySource(url: string | null): void {
    this.habitabilityUrl = url;
  }

  /** Switch the per-vertex colour buffer without rebuilding geometry. */
  setColorMode(mode: ExoplanetColorMode): void {
    if (this.colorMode === mode) return;
    this.colorMode = mode;
    this.applyColors();
  }

  colorModeOf(): ExoplanetColorMode {
    return this.colorMode;
  }

  /**
   * Load a catalogue from `url`. Accepts both the slim legacy
   * `/data/exoplanets.json` (array) and the full
   * `/data/exoplanets-full.json` (also array, extra fields).
   *
   * Also kicks off habitability fetch in parallel if configured.
   */
  async load(url: string): Promise<void> {
    const [items, hab] = await Promise.all([
      fetchCatalogJson<ExoplanetEntry[]>("exoplanets", url),
      this.habitabilityUrl
        ? loadHabitability(this.habitabilityUrl)
        : Promise.resolve(null),
    ]);
    this.items = items;
    this.habitability = hab;
    this.build();
  }

  private build(): void {
    // Pre-compute planet count per host system (drives ring size).
    const hostCount = new Map<string, number>();
    for (const p of this.items) {
      hostCount.set(p.host, (hostCount.get(p.host) ?? 0) + 1);
    }

    const n = this.items.length;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
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
    geom.setAttribute("aColor", new BufferAttribute(colors, 3));
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

    // Apply colours into the attribute now that the geometry exists.
    this.applyColors();

    // Ring overlay: one Points sample per multi-planet host (>1 planet),
    // size scaled by planet count. We deduplicate so each host gets a
    // single ring even if 5 of its planets are in the catalogue.
    const seen = new Set<string>();
    const ringHosts: ExoplanetEntry[] = [];
    for (const p of this.items) {
      if (seen.has(p.host)) continue;
      seen.add(p.host);
      if ((hostCount.get(p.host) ?? 0) > 1) ringHosts.push(p);
    }
    if (ringHosts.length > 0) {
      const rPos = new Float32Array(ringHosts.length * 3);
      const rSize = new Float32Array(ringHosts.length);
      for (let i = 0; i < ringHosts.length; i++) {
        const p = ringHosts[i]!;
        const [x, y, z] = raDecToVec3(p.ra, p.dec, RING_RADIUS);
        rPos[i * 3] = x;
        rPos[i * 3 + 1] = y;
        rPos[i * 3 + 2] = z;
        const k = hostCount.get(p.host) ?? 1;
        // Ring grows with planet count: 6 px (2 planets) → 14 px (8+).
        rSize[i] = 5 + Math.min(9, k) * 1.1;
      }
      const rGeom = new BufferGeometry();
      rGeom.setAttribute("position", new BufferAttribute(rPos, 3));
      rGeom.setAttribute("aSize", new BufferAttribute(rSize, 1));
      rGeom.computeBoundingSphere();
      const rMat = new ShaderMaterial({
        uniforms: {
          uPixelRatio: { value: window.devicePixelRatio || 1 },
        },
        vertexShader: VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      });
      this.rings = new Points(rGeom, rMat);
      this.rings.frustumCulled = false;
      this.rings.renderOrder = -2;
      this.group.add(this.rings);
    }
  }

  /**
   * Rewrite the `aColor` buffer according to `this.colorMode`. Cheap
   * enough at 6K entries to run on the main thread on mode change.
   */
  private applyColors(): void {
    if (!this.points) return;
    const attr = this.points.geometry.getAttribute("aColor") as
      | BufferAttribute
      | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i]!;
      let rgb: [number, number, number];
      switch (this.colorMode) {
        case "method":
          rgb = methodColor(p.method);
          break;
        case "habitability": {
          const rec = this.habitability
            ? lookup(this.habitability, p.name, p.host)
            : null;
          rgb = esiToRgb(rec?.esi ?? null);
          break;
        }
        case "discovery_year":
          rgb = yearColor(p.year);
          break;
      }
      arr[i * 3] = rgb[0];
      arr[i * 3 + 1] = rgb[1];
      arr[i * 3 + 2] = rgb[2];
    }
    attr.needsUpdate = true;
  }

  dispose(): void {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as ShaderMaterial).dispose();
      this.group.remove(this.points);
      this.points = null;
    }
    if (this.rings) {
      this.rings.geometry.dispose();
      (this.rings.material as ShaderMaterial).dispose();
      this.group.remove(this.rings);
      this.rings = null;
    }
    this.items = [];
    this.habitability = null;
  }
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.45;
    float a = clamp(core + halo, 0.0, 1.0);
    gl_FragColor = vec4(vColor, a * 0.85);
  }
`;

/**
 * Hollow-ring fragment for multi-planet host markers. Renders a thin
 * annulus around the host position so multi-planet systems pop without
 * stealing the foreground from the per-planet dots.
 */
const RING_FRAG = /* glsl */ `
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    // Annulus between r = 0.30 and r = 0.45
    float inner = smoothstep(0.28, 0.32, r);
    float outer = 1.0 - smoothstep(0.43, 0.47, r);
    float a = clamp(inner * outer, 0.0, 1.0);
    if (a < 0.01) discard;
    gl_FragColor = vec4(0.85, 0.95, 1.0, a * 0.55);
  }
`;

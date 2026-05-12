/**
 * galaxy-cone/galaxy-field.ts — Three.js renderer for the
 * 2MRS+6dFGS galaxy point cloud + named-structure overlay.
 *
 * Design notes:
 *   • A single `THREE.Points` cloud handles all ~80K galaxies — at this
 *     count `InstancedMesh` is ~3× slower and gains us nothing visually
 *     (galaxies at z<0.1 are sub-pixel except for the very nearest
 *     handful).
 *   • Per-vertex colour ramp: low z = pale white, mid z = warm yellow,
 *     high z = deep red. This is a cosmological-redshift hue idiom, not
 *     a real spectral redshift (which would blueshift nothing on this
 *     range anyway — the catalog is positive cz only).
 *   • Per-vertex size: scaled by K-band apparent magnitude (brighter →
 *     larger). Falls back to a fixed mid-size if K is NaN/missing.
 *   • Visibility: the layer hides itself in "sky" mode (the catalog
 *     positions are 3D distances, not direction-only). Galactic +
 *     universe mode both share the same world frame so the same
 *     geometry is reused; only the camera context differs.
 *   • Structures: hovered via `pickStructure(world)` which the host
 *     viewer calls on pointer-move with a world-space ray-cast point.
 *     We expose a sprite labelling layer that toggles per-structure.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import {
  czToDistanceMpc,
  equatorialDegMpcToWorldLY,
  equatorialMpcToWorldLY,
  LY_PER_MPC,
  STRUCTURES,
  SUN_LY,
  type Structure,
} from "./structures";
import type { GalaxyCatalog } from "./loader";

export type GalaxyFieldMode = "galactic" | "universe";

export class GalaxyField {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private geometry: BufferGeometry | null = null;
  private mode: GalaxyFieldMode = "universe";

  /** Structure-label sprites (one per `STRUCTURES` entry). */
  private structureLabels: Sprite[] = [];
  private structureLabelTex: CanvasTexture[] = [];
  private structureLabelMat: SpriteMaterial[] = [];
  private structuresVisible = true;
  /** Currently hovered structure id, or null. */
  private hovered: string | null = null;

  constructor() {
    this.group.name = "GalaxyConeField";
    // Sit just behind labels but ahead of the cosmic-web particle field.
    this.group.renderOrder = 1;
    this.group.visible = false;
  }

  /** Build geometry from the binary catalog. Safe to call once. */
  build(cat: GalaxyCatalog): void {
    if (this.points) return; // idempotent

    const n = cat.count;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);

    // Pre-compute distance + colour for each row in one pass. We do
    // this on the main thread because 80K records × ~5 trig ops fits
    // comfortably under 50 ms on a modern laptop; deferring to a
    // worker just for one-off bake-on-load is over-engineering.
    const raw = cat.raw;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const ra = raw[o] ?? 0;
      const dec = raw[o + 1] ?? 0;
      const cz = raw[o + 2] ?? 0;
      const kMag = raw[o + 3];

      const distMpc = czToDistanceMpc(cz);
      // World-space position in the galactic LY frame, anchored at SUN.
      const v = equatorialMpcToWorldLY(ra, dec, distMpc);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;

      const [r, g, b] = redshiftColor(cz);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      sizes[i] = sizeForMag(kMag);
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.computeBoundingSphere();

    const mat = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: typicalDpr() },
        uOpacity: { value: 0.85 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });

    const pts = new Points(geom, mat);
    pts.frustumCulled = false; // catalog spans hundreds of Mpc — culling fights us
    pts.renderOrder = 1;
    pts.name = "galaxy-cone:points";
    this.points = pts;
    this.material = mat;
    this.geometry = geom;
    this.group.add(pts);

    this.buildStructures();
  }

  /** Whether the renderer has been populated yet. */
  ready(): boolean {
    return this.points !== null;
  }

  /** Catalog row count (0 until `build` runs). */
  count(): number {
    return this.geometry?.getAttribute("position").count ?? 0;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /**
   * Mode hook. Both galactic + universe modes share the same world
   * frame, so we just stash the value; the host scene controls camera
   * scale separately. Sky mode is unsupported (filtered upstream).
   */
  setMode(m: GalaxyFieldMode): void {
    this.mode = m;
    // Slightly dimmer / smaller in galactic mode so the galaxy points
    // don't compete with bright stars at close zoom; brighter in
    // universe mode where they ARE the show.
    if (this.material) {
      this.material.uniforms.uOpacity!.value = m === "galactic" ? 0.6 : 0.9;
    }
  }

  /** Read-only mode accessor (handy for tests). */
  currentMode(): GalaxyFieldMode {
    return this.mode;
  }

  /** Toggle the named-structure label layer. */
  setStructuresVisible(v: boolean): void {
    this.structuresVisible = v;
    for (const s of this.structureLabels) s.visible = v;
  }

  /** Read-only list of structures (for HUD / hit-test). */
  structures(): ReadonlyArray<Structure> {
    return STRUCTURES;
  }

  /**
   * Hit-test a world-space point against the structure bounding spheres.
   * Returns the closest matching structure id or null. Cheap O(n) loop
   * over ~10 entries — no spatial index needed.
   */
  pickStructure(world: Vector3): Structure | null {
    let best: Structure | null = null;
    let bestDist = Infinity;
    for (const s of STRUCTURES) {
      const c = equatorialDegMpcToWorldLY(s.raDeg, s.decDeg, s.distanceMpc);
      const dx = world.x - c.x;
      const dy = world.y - c.y;
      const dz = world.z - c.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const r = s.radiusMpc * LY_PER_MPC;
      if (d2 <= r * r && d2 < bestDist) {
        best = s;
        bestDist = d2;
      }
    }
    return best;
  }

  /** Highlight a structure (or clear). Drives sprite scale + opacity. */
  setHovered(id: string | null): void {
    if (id === this.hovered) return;
    this.hovered = id;
    for (let i = 0; i < this.structureLabels.length; i++) {
      const sprite = this.structureLabels[i];
      const mat = this.structureLabelMat[i];
      const s = STRUCTURES[i];
      if (!sprite || !mat || !s) continue;
      const isHover = s.id === id;
      mat.opacity = isHover ? 1.0 : 0.75;
      const k = isHover ? 1.18 : 1.0;
      const base = baseLabelHeightLY(s);
      const aspect = sprite.scale.x / sprite.scale.y;
      sprite.scale.set(base * k * aspect, base * k, 1);
    }
  }

  /** Currently hovered structure id, or null. */
  hoveredId(): string | null {
    return this.hovered;
  }

  /** Free GPU resources. */
  dispose(): void {
    if (this.points) {
      this.geometry?.dispose();
      this.material?.dispose();
      this.group.remove(this.points);
      this.points = null;
      this.material = null;
      this.geometry = null;
    }
    for (const m of this.structureLabelMat) {
      m.map?.dispose();
      m.dispose();
    }
    for (const t of this.structureLabelTex) t.dispose();
    this.structureLabels = [];
    this.structureLabelMat = [];
    this.structureLabelTex = [];
    this.group.clear();
  }

  /* ─── private ─────────────────────────────────────────────────── */

  private buildStructures(): void {
    for (const s of STRUCTURES) {
      const tex = makeLabel(s.name);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.75,
      });
      const sprite = new Sprite(mat);
      const h = baseLabelHeightLY(s);
      const aspect =
        tex.image && tex.image.height > 0 ? tex.image.width / tex.image.height : 4;
      sprite.scale.set(h * aspect, h, 1);
      const c = equatorialDegMpcToWorldLY(s.raDeg, s.decDeg, s.distanceMpc);
      sprite.position.copy(c);
      sprite.visible = this.structuresVisible;
      sprite.renderOrder = 3;
      sprite.name = `structure:${s.id}`;
      this.group.add(sprite);
      this.structureLabels.push(sprite);
      this.structureLabelTex.push(tex);
      this.structureLabelMat.push(mat);
    }
  }
}

/* ─── colour + sizing helpers ─────────────────────────────────────── */

/**
 * Map heliocentric recession velocity to a "redshift hue".
 *   ~100   km/s  → pale white            (Local Group, Virgo outskirts)
 *   ~3000  km/s  → warm cream            (Local Sheet → 50 Mpc)
 *   ~10000 km/s  → soft amber            (Coma / Hercules distance)
 *   ~30000 km/s  → muted red             (z ≈ 0.1 edge of the catalog)
 *
 * Linear interp in RGB through four stops keeps the gradient continuous
 * and avoids hue-banding the eye reads as "data tier" rather than
 * smooth physical recession.
 */
function redshiftColor(czKms: number): [number, number, number] {
  const stops: Array<{ v: number; c: [number, number, number] }> = [
    { v: 0, c: [0.95, 0.96, 1.0] }, // near-white, faint blue
    { v: 3000, c: [1.0, 0.96, 0.85] }, // warm cream
    { v: 10000, c: [1.0, 0.78, 0.5] }, // amber
    { v: 22000, c: [1.0, 0.5, 0.35] }, // deeper orange
    { v: 30000, c: [0.95, 0.3, 0.25] }, // red
  ];
  if (czKms <= (stops[0]?.v ?? 0)) {
    return stops[0]?.c ?? [1, 1, 1];
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (!a || !b) continue;
    if (czKms >= a.v && czKms <= b.v) {
      const k = (czKms - a.v) / Math.max(b.v - a.v, 1e-6);
      return [
        a.c[0] + (b.c[0] - a.c[0]) * k,
        a.c[1] + (b.c[1] - a.c[1]) * k,
        a.c[2] + (b.c[2] - a.c[2]) * k,
      ];
    }
  }
  const last = stops[stops.length - 1]?.c ?? [1, 1, 1];
  return last;
}

/**
 * K-band magnitude → point size in pixels.
 *   K ≈ 6   (very bright local galaxy) → ~10 px
 *   K ≈ 11  (median 2MRS row)          → ~3 px
 *   K ≈ 14  (faint 6dFGS edge)         → ~1.5 px
 *   missing                            → 2.0 px
 */
function sizeForMag(kMag: number | undefined): number {
  if (kMag === undefined || !Number.isFinite(kMag)) return 2.0;
  const m = Math.max(5, Math.min(15, kMag));
  // Linear: K=5 → 10 px, K=15 → 1.2 px.
  const s = 10 - (m - 5) * 0.88;
  return Math.max(1.0, s);
}

/**
 * Per-structure base label height in LY. We size proportional to the
 * bounding sphere radius so the Great Wall reads "regional" while a
 * compact cluster like Coma reads "point landmark".
 */
function baseLabelHeightLY(s: Structure): number {
  // Floor at 2 Mpc so even Local Group has a legible label.
  const mpc = Math.max(2, Math.min(20, s.radiusMpc * 0.35));
  return mpc * LY_PER_MPC;
}

/** Build a small text-on-rounded-rect sprite for a structure label. */
function makeLabel(text: string): CanvasTexture {
  const dpr = typicalDpr();
  const padX = 7;
  const padY = 3;
  const fontPx = 12;
  const fontSize = fontPx * dpr;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("galaxy-cone: 2d context unavailable");
  measure.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("galaxy-cone: 2d context unavailable");

  const radius = 4 * dpr;
  ctx.fillStyle = "rgba(14, 18, 28, 0.78)";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(width, 0, width, height, radius);
  ctx.arcTo(width, height, 0, height, radius);
  ctx.arcTo(0, height, 0, 0, radius);
  ctx.arcTo(0, 0, width, 0, radius);
  ctx.closePath();
  ctx.fill();

  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(220, 230, 255, 0.96)";
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** SSR-safe DPR fallback. */
function typicalDpr(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Re-export so consumers don't need to know the unit-conversion helper path. */
export { SUN_LY };

/* ─── shaders ─────────────────────────────────────────────────────── */

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;

  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Distance attenuation: galaxies at z=0.1 (~430 Mpc world units in
    // LY frame ≈ 1.4e9 LY) should be smaller than the Local Group's
    // members. The 1/-mv.z falloff caps at the per-row aSize.
    float falloff = clamp(300.0 / max(-mv.z, 1.0), 0.4, 1.0);
    gl_PointSize = aSize * uPixelRatio * falloff;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  uniform float uOpacity;

  void main() {
    // Soft round dot with a bright core. Discard anything outside the
    // sprite's inscribed circle so points don't show their quad edges
    // when they overlap.
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.18, r2);
    float halo = 1.0 - smoothstep(0.18, 0.25, r2);
    float a = clamp(core * 0.85 + halo * 0.25, 0.0, 1.0) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;


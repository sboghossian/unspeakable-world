/**
 * cosmic-web/cosmic-web-field.ts — Three.js renderer for the named
 * cosmic-structure particle clouds + label sprites + core-body markers.
 *
 * Design choices:
 *   • One `THREE.Points` per structure (12 in total, ≤ 50K total
 *     vertices) instead of one global mega-mesh. This way each cloud
 *     can be coloured + faded independently based on the camera's
 *     distance to the structure centre, and we can keep individual
 *     clouds frustum-culled while letting the labels stay drawn.
 *   • Shared ShaderMaterial template — each cloud gets its own uniforms
 *     (core/edge colour, opacity, point size). All clouds use additive
 *     blending so they stack visually with cosmicflows4 + galaxy-cone.
 *   • Label sprites are canvas textures (one bitmap per structure)
 *     positioned at the cloud centre with a small +y offset so they
 *     don't sit "inside" the cloud's bright core.
 *   • Distance-based opacity fade: each structure has a preferredView
 *     scale; the cloud fades in when the camera is at roughly that
 *     scale tier and fades out when the camera is much closer or much
 *     further. This is what makes "toggle cosmic-web in universe mode
 *     and see labelled regions" feel narrative — the Local Group label
 *     vanishes when you fly out to a Gpc, and Sloan Great Wall vanishes
 *     when you fly into the Local Sheet.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { COSMIC_STRUCTURES, LY_PER_MPC, type CosmicStructure } from "./structures";
import { shapeFor } from "./shapes";
import { CoreBodyLayer } from "./core-bodies";

export type FieldMode = "galactic" | "universe";

type StructureRecord = {
  readonly def: CosmicStructure;
  readonly points: Points;
  readonly material: ShaderMaterial;
  readonly geometry: BufferGeometry;
  readonly label: Sprite;
  readonly labelMat: SpriteMaterial;
  readonly labelTex: CanvasTexture;
  /** Cached world-space centre (Mpc → LY w/ SG axis remap). */
  readonly worldCenter: Vector3;
};

export class CosmicWebField {
  readonly group = new Group();
  private records: StructureRecord[] = [];
  private cores = new CoreBodyLayer();
  private mode: FieldMode = "universe";
  /** Camera position cached by `updateForCamera`. */
  private cameraWorld = new Vector3();
  private hasCamera = false;
  private masterOpacity = 1;

  constructor() {
    this.group.name = "CosmicWebField";
    // Sit ahead of galaxy-cone (renderOrder 1) and CF4 lines (5) so the
    // labels float on top, but below the core-body markers (6).
    this.group.renderOrder = 4;
    this.group.visible = false;
    this.group.add(this.cores.group);
  }

  /** Build the geometry + sprites for every catalogued structure. */
  build(): void {
    if (this.records.length > 0) return; // idempotent
    for (const def of COSMIC_STRUCTURES) {
      this.records.push(this.buildStructure(def));
    }
    this.cores.build();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /** Adjust dim factor between modes (galactic = dimmer to avoid
   *  overlapping the galactic-mode bright background). */
  setMode(m: FieldMode): void {
    this.mode = m;
    this.masterOpacity = m === "galactic" ? 0.55 : 0.92;
    this.applyOpacities();
  }

  currentMode(): FieldMode {
    return this.mode;
  }

  /** Hand-off from the host scene: the world-space camera position so
   *  each cloud can fade based on viewing scale. Called every frame. */
  updateForCamera(cameraWorld: Vector3): void {
    this.cameraWorld.copy(cameraWorld);
    this.hasCamera = true;
    this.applyOpacities();
  }

  /** Read-only structures list (handy for HUD lookups). */
  structures(): ReadonlyArray<CosmicStructure> {
    return COSMIC_STRUCTURES;
  }

  dispose(): void {
    for (const r of this.records) {
      r.geometry.dispose();
      r.material.dispose();
      r.labelMat.map?.dispose();
      r.labelMat.dispose();
      r.labelTex.dispose();
      this.group.remove(r.points);
      this.group.remove(r.label);
    }
    this.records = [];
    this.cores.dispose();
    this.group.clear();
  }

  /* ─── private ───────────────────────────────────────────────────── */

  private buildStructure(def: CosmicStructure): StructureRecord {
    const shape = shapeFor(def.morphology);
    const { positions: localPos, densities } = shape({
      count: def.particleCount,
      extent: def.extentMpc,
      seed: hashSeed(def.id),
    });

    // Translate local-Mpc → world-LY, applying the SG→world axis remap
    // (SGX → world.x, SGZ → world.y, SGY → world.z) so we register with
    // cosmicflows4.
    const positions = new Float32Array(localPos.length);
    const colors = new Float32Array(localPos.length);
    const sizes = new Float32Array(def.particleCount);
    const core = new Color(...def.coreColor);
    const edge = new Color(...def.edgeColor);
    for (let i = 0; i < def.particleCount; i++) {
      const lx = localPos[i * 3] ?? 0;
      const ly = localPos[i * 3 + 1] ?? 0;
      const lz = localPos[i * 3 + 2] ?? 0;
      const sgx = def.centerMpc.x + lx;
      const sgy = def.centerMpc.y + ly;
      const sgz = def.centerMpc.z + lz;
      // SG → world remap (matches cosmicflows4).
      positions[i * 3] = sgx * LY_PER_MPC;
      positions[i * 3 + 1] = sgz * LY_PER_MPC;
      positions[i * 3 + 2] = sgy * LY_PER_MPC;

      const dens = densities[i] ?? 0;
      // Blend edge → core by density.
      colors[i * 3] = edge.r + (core.r - edge.r) * dens;
      colors[i * 3 + 1] = edge.g + (core.g - edge.g) * dens;
      colors[i * 3 + 2] = edge.b + (core.b - edge.b) * dens;

      // Size in pixels: faint outer particles ~1.4px, bright core ~3.4px.
      sizes[i] = 1.2 + dens * 2.4;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: typicalDpr() },
        uOpacity: { value: this.masterOpacity },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });

    const points = new Points(geom, material);
    points.frustumCulled = false;
    points.renderOrder = 4;
    points.name = `cosmic-web:cloud:${def.id}`;
    this.group.add(points);

    // SG → world remap of the centre.
    const worldCenter = new Vector3(
      def.centerMpc.x * LY_PER_MPC,
      def.centerMpc.z * LY_PER_MPC,
      def.centerMpc.y * LY_PER_MPC,
    );

    const labelTex = makeStructureLabel(def);
    const labelMat = new SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.92,
    });
    const label = new Sprite(labelMat);
    label.renderOrder = 7;
    label.name = `cosmic-web:label:${def.id}`;
    // Label height in LY ≈ 20% of the cloud's largest extent.
    const maxExtent = Math.max(def.extentMpc.x, def.extentMpc.y, def.extentMpc.z);
    const labelH = Math.max(3, Math.min(40, maxExtent * 0.18)) * LY_PER_MPC;
    const aspect =
      labelTex.image && labelTex.image.height > 0
        ? labelTex.image.width / labelTex.image.height
        : 4;
    label.scale.set(labelH * aspect, labelH, 1);
    // Float the label slightly "above" the cloud (positive world-y).
    const liftLY = Math.max(2, maxExtent * 0.55) * LY_PER_MPC;
    label.position.set(worldCenter.x, worldCenter.y + liftLY, worldCenter.z);
    this.group.add(label);

    return {
      def,
      points,
      material,
      geometry: geom,
      label,
      labelMat,
      labelTex,
      worldCenter,
    };
  }

  /** Recompute per-cloud opacity from the camera's viewing distance to
   *  each structure's centre. Each structure has a `preferredViewMpc`
   *  scale; clouds fade in within a log-band of that scale. */
  private applyOpacities(): void {
    if (!this.hasCamera) {
      for (const r of this.records) {
        r.material.uniforms.uOpacity!.value = this.masterOpacity;
        r.labelMat.opacity = this.masterOpacity;
      }
      return;
    }
    for (const r of this.records) {
      // Distance from camera to structure centre in Mpc.
      const dx = this.cameraWorld.x - r.worldCenter.x;
      const dy = this.cameraWorld.y - r.worldCenter.y;
      const dz = this.cameraWorld.z - r.worldCenter.z;
      const distLY = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const distMpc = distLY / LY_PER_MPC;
      const visible = scaleFade(distMpc, r.def.preferredViewMpc);
      const op = visible * this.masterOpacity;
      r.material.uniforms.uOpacity!.value = op;
      // Labels stay a touch brighter so they read at the edge of the
      // fade band — narrative >>> data.
      r.labelMat.opacity = Math.min(1, op * 1.2 + 0.05);
    }
  }
}

/* ─── helpers ─────────────────────────────────────────────────────── */

/**
 * Soft fade as a function of (camera-distance, structure preferred view).
 * Returns 1 when the camera is at the right scale tier, falls off
 * smoothly on both sides in log-space. Designed so each structure has a
 * "best zoom level" at which it lights up.
 */
function scaleFade(distMpc: number, preferredMpc: number): number {
  const d = Math.max(distMpc, 0.5);
  const p = Math.max(preferredMpc, 0.5);
  const logRatio = Math.log10(d / p);
  // Width = 1.3 dex on each side (factor ~20× zoom band).
  const width = 1.3;
  const t = Math.abs(logRatio) / width;
  if (t >= 1) return 0.05;
  const smooth = 1 - t * t * (3 - 2 * t);
  return 0.05 + 0.95 * smooth;
}

/** Hash a string id → 32-bit int seed so each structure gets a
 *  deterministic but distinct shape. */
function hashSeed(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function typicalDpr(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Build the label bitmap for a structure: title + one-line note. */
function makeStructureLabel(def: CosmicStructure): CanvasTexture {
  const dpr = typicalDpr();
  const padX = 9;
  const padY = 5;
  const titlePx = 13;
  const notePx = 10;
  const titleSize = titlePx * dpr;
  const noteSize = notePx * dpr;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("cosmic-web: 2d context unavailable");
  measure.font = `600 ${titleSize}px "Space Grotesk", system-ui, sans-serif`;
  const titleMetrics = measure.measureText(def.name);
  measure.font = `${noteSize}px "Space Grotesk", system-ui, sans-serif`;
  const noteMetrics = measure.measureText(def.note);
  const contentWidth = Math.max(titleMetrics.width, noteMetrics.width);
  const width = Math.ceil(contentWidth + padX * 2 * dpr);
  const height = Math.ceil(titleSize + noteSize + padY * 3 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("cosmic-web: 2d context unavailable");

  const radius = 5 * dpr;
  ctx.fillStyle = "rgba(12, 8, 26, 0.82)";
  ctx.strokeStyle = "rgba(170, 130, 255, 0.5)";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(width, 0, width, height, radius);
  ctx.arcTo(width, height, 0, height, radius);
  ctx.arcTo(0, height, 0, 0, radius);
  ctx.arcTo(0, 0, width, 0, radius);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = `600 ${titleSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(230, 220, 255, 1.0)";
  ctx.fillText(def.name, padX * dpr, padY * dpr);

  ctx.font = `${noteSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(200, 200, 230, 0.92)";
  ctx.fillText(def.note, padX * dpr, padY * dpr + titleSize + padY * dpr * 0.4);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

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
    float falloff = clamp(800.0 / max(-mv.z, 1.0), 0.45, 1.4);
    gl_PointSize = aSize * uPixelRatio * falloff;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  uniform float uOpacity;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.18, r2);
    float halo = 1.0 - smoothstep(0.18, 0.25, r2);
    float a = clamp(core * 0.85 + halo * 0.22, 0.0, 1.0) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

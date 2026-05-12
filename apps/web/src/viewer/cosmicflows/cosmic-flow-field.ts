import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LinearFilter,
  LineBasicMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import {
  FLOW_STREAMLINES,
  LANIAKEA_LANDMARKS,
  LY_PER_MPC,
  type Landmark,
  type Streamline,
} from "./cosmicflows-data";

/**
 * 🌊 CosmicFlowField — renders the Cosmicflows-4 peculiar-velocity
 * field as colored streamlines + named-landmark sprites.
 *
 * Lives inside `galacticGroup` (LY units). Supergalactic Cartesian
 * Mpc → galactic-frame LY mapping:
 *
 *   • The Local Group is anchored at the Sun's galactic position
 *     (SUN_LY). At hundreds-of-Mpc resolution the offset from the
 *     Sun to the Milky Way's barycentre is rounding noise.
 *   • Supergalactic axes map onto the galactic frame as:
 *         SGX → world.x (Mpc → LY × LY_PER_MPC)
 *         SGY → world.z   (so the SG plane lies near horizontal)
 *         SGZ → world.y   (so SG-north points up in scene)
 *   • This is a simplification: the real supergalactic plane is
 *     inclined ~6° to the galactic plane (Lahav et al. 2000). At this
 *     visualisation's scale the inclination is invisible, so we keep
 *     the simpler axis-swap mapping.
 *
 * Colour ramp: cool blue (low |v_pec|) → warm orange/red (high
 * |v_pec|). Reads as "fast = hot, slow = cold" with no need for a
 * legend on first look. Additive blending so overlapping streamlines
 * brighten where the flow concentrates.
 */

/** Anchor for the Local Group in the galactic frame (LY). Set when
 *  the field is constructed; we read SUN_LY from the consumer. */
export type AnchorLY = { x: number; y: number; z: number };

export class CosmicFlowField {
  readonly group = new Group();
  private streamlineMats: LineBasicMaterial[] = [];
  private labelMats: SpriteMaterial[] = [];
  private labelTextures: CanvasTexture[] = [];

  constructor(anchor: AnchorLY) {
    this.group.name = "CosmicFlowField";
    this.group.visible = false;
    // High render order so the streamlines paint over the cosmic-web
    // point cloud they share space with.
    this.group.renderOrder = 5;
    this.build(anchor);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  /** Count of streamlines + landmarks — useful for HUD readouts. */
  stats(): { streamlines: number; landmarks: number } {
    return {
      streamlines: FLOW_STREAMLINES.length,
      landmarks: LANIAKEA_LANDMARKS.length,
    };
  }

  private build(anchor: AnchorLY): void {
    const toWorld = (sgx: number, sgy: number, sgz: number): Vector3 =>
      new Vector3(
        anchor.x + sgx * LY_PER_MPC,
        anchor.y + sgz * LY_PER_MPC, // SGZ → world.y (up)
        anchor.z + sgy * LY_PER_MPC, // SGY → world.z
      );

    // ─── Streamlines ────────────────────────────────────────────
    // Per-vertex colour ramp by peculiar-velocity magnitude. Cool blue
    // at ~150 km/s ramping through cyan/yellow to deep orange at the
    // highest local-volume peculiar velocities (~700 km/s).
    for (const sl of FLOW_STREAMLINES) {
      const line = this.buildStreamline(sl, toWorld);
      this.group.add(line);
    }

    // ─── Landmark labels ────────────────────────────────────────
    for (const lm of LANIAKEA_LANDMARKS) {
      const sprite = this.buildLandmarkLabel(lm, toWorld);
      this.group.add(sprite);
    }
  }

  private buildStreamline(
    sl: Streamline,
    toWorld: (x: number, y: number, z: number) => Vector3,
  ): Line {
    const positions = new Float32Array(sl.points.length * 3);
    const colors = new Float32Array(sl.points.length * 3);
    for (let i = 0; i < sl.points.length; i++) {
      const p = sl.points[i]!;
      const w = toWorld(p.sgx, p.sgy, p.sgz);
      positions[i * 3] = w.x;
      positions[i * 3 + 1] = w.y;
      positions[i * 3 + 2] = w.z;
      const c = flowColor(p.vKms);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new Float32BufferAttribute(colors, 3));
    const mat = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
      linewidth: 1, // ignored on most platforms, but documents intent
    });
    this.streamlineMats.push(mat);
    const line = new Line(geom, mat);
    line.frustumCulled = false;
    line.name = `flow:${sl.id}`;
    return line;
  }

  private buildLandmarkLabel(
    lm: Landmark,
    toWorld: (x: number, y: number, z: number) => Vector3,
  ): Sprite {
    const tier = lm.tier;
    const color =
      tier === "anchor"
        ? "rgba(255, 200, 120, 0.98)"
        : tier === "us"
          ? "rgba(180, 240, 255, 0.98)"
          : tier === "primary"
            ? "rgba(255, 230, 180, 0.95)"
            : "rgba(220, 220, 240, 0.85)";
    const tex = makeLabel(lm.name, color, tier === "anchor" ? 14 : 11);
    const mat = new SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.95,
    });
    this.labelMats.push(mat);
    this.labelTextures.push(tex);
    const sprite = new Sprite(mat);
    const aspect = tex.image.width / tex.image.height;
    // Label height in LY — anchor landmarks twice the size of
    // secondary ones so the eye reads the hierarchy.
    const h =
      tier === "anchor"
        ? 9 * LY_PER_MPC
        : tier === "primary"
          ? 5 * LY_PER_MPC
          : tier === "us"
            ? 4 * LY_PER_MPC
            : 3.5 * LY_PER_MPC;
    sprite.scale.set(h * aspect, h, 1);
    const w = toWorld(lm.sgx, lm.sgy, lm.sgz);
    sprite.position.copy(w);
    sprite.renderOrder = 6;
    sprite.name = `flow-label:${lm.name}`;
    return sprite;
  }

  dispose(): void {
    for (const m of this.streamlineMats) m.dispose();
    for (const m of this.labelMats) {
      m.map?.dispose();
      m.dispose();
    }
    for (const t of this.labelTextures) t.dispose();
    this.streamlineMats = [];
    this.labelMats = [];
    this.labelTextures = [];
    this.group.clear();
  }
}

/**
 * Velocity-magnitude → colour ramp. Anchored at 150 km/s (cool blue)
 * → 700 km/s (warm orange). Linear interpolation through cyan, white
 * and yellow keeps mid-velocity flows readable on the dark sky.
 */
function flowColor(vKms: number): Color {
  const t = Math.max(0, Math.min(1, (vKms - 150) / (700 - 150)));
  // Five-stop gradient: blue → cyan → white → yellow → orange.
  const stops = [
    { t: 0.0, c: new Color(0.25, 0.55, 1.0) },
    { t: 0.3, c: new Color(0.4, 0.85, 1.0) },
    { t: 0.55, c: new Color(0.95, 0.95, 0.85) },
    { t: 0.8, c: new Color(1.0, 0.75, 0.35) },
    { t: 1.0, c: new Color(1.0, 0.45, 0.2) },
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / Math.max(b.t - a.t, 1e-6);
      return new Color(
        a.c.r + (b.c.r - a.c.r) * k,
        a.c.g + (b.c.g - a.c.g) * k,
        a.c.b + (b.c.b - a.c.b) * k,
      );
    }
  }
  return stops[stops.length - 1]!.c.clone();
}

function makeLabel(text: string, color: string, fontPx: number): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 7;
  const padY = 3;
  const fontSize = fontPx * dpr;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("2d context unavailable");
  measure.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const radius = 4 * dpr;
  ctx.fillStyle = "rgba(15, 18, 32, 0.78)";
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
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

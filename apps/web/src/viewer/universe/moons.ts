import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Raycaster,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Camera,
  type Vector2,
} from "three";
import {
  KM_PER_AU,
  MOONS,
  PARENT_OBLIQUITY_DEG,
  type MoonElements,
} from "../data/moons";

/**
 * 🛰 Planetary moon layer.
 *
 * One small sphere + orbit loop + label per moon (~14 total). Position is
 * computed CPU-side (cheap at this count) by solving Kepler in the
 * parent-equatorial frame, then rotating into the ecliptic frame the
 * universe-scene uses everywhere else.
 *
 * The whole layer lives in `solarGroup` (1 unit = 1 AU). Each moon's
 * `Object3D` is parented to a per-planet anchor that the scene moves to
 * the planet's heliocentric position each frame.
 */

const DEG = Math.PI / 180;

export type MoonRenderable = {
  spec: MoonElements;
  /** Anchor offset relative to the parent planet, in AU (ecliptic). */
  rel: Vector3;
  /** Group containing sphere + label, positioned at `rel`. */
  group: Group;
  sphere: Mesh;
  label: Sprite;
  orbit: LineLoop;
};

export class MoonField extends Object3D {
  /** Per-planet anchor — scene sets `position` to the planet's AU position. */
  private anchors = new Map<MoonElements["parent"], Group>();
  private moons: MoonRenderable[] = [];
  /** Per-planet rotation matrix (parent-equator → ecliptic). */
  private parentRotCos: Map<MoonElements["parent"], number> = new Map();
  private parentRotSin: Map<MoonElements["parent"], number> = new Map();
  /** Distance from camera (AU) to the anchored planet, for culling labels. */
  private camAU = new Vector3();
  /** Visibility threshold — labels visible if camera is within this many AU. */
  private static LABEL_AU = 0.05;

  constructor(options: { excludeParents?: MoonElements["parent"][] } = {}) {
    super();
    this.visible = false;
    const exclude = new Set(options.excludeParents ?? []);

    // Pre-compute per-parent rotation (just a single x-axis tilt to
    // approximate ecliptic projection — adequate for v1 visuals).
    for (const parent of Object.keys(PARENT_OBLIQUITY_DEG) as MoonElements["parent"][]) {
      const obl = (PARENT_OBLIQUITY_DEG[parent] ?? 0) * DEG;
      this.parentRotCos.set(parent, Math.cos(obl));
      this.parentRotSin.set(parent, Math.sin(obl));
    }

    for (const m of MOONS) {
      if (exclude.has(m.parent)) continue;
      let anchor = this.anchors.get(m.parent);
      if (!anchor) {
        anchor = new Group();
        this.anchors.set(m.parent, anchor);
        this.add(anchor);
      }

      const group = new Group();
      const geom = new SphereGeometry(m.drawSize, 16, 16);
      const mat = new MeshBasicMaterial({ color: 0xd9d6cf });
      const sphere = new Mesh(geom, mat);
      sphere.userData = { moonName: m.name };
      group.add(sphere);

      const labelTex = makeLabelTexture(m.name);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
      });
      const label = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const lh = 0.0035;
      label.scale.set(lh * aspect, lh, 1);
      label.position.set(0, m.drawSize + 0.0015, 0);
      group.add(label);

      anchor.add(group);

      const orbit = makeOrbitLoop(m, parent => this.applyParentTilt(parent, new Vector3()));
      // We rebuild the orbit loop with the actual rotation now.
      const orbitFinal = this.makeOrbitLoop(m);
      orbit.geometry.dispose();
      (orbit.material as LineBasicMaterial).dispose();
      anchor.add(orbitFinal);

      this.moons.push({
        spec: m,
        rel: new Vector3(),
        group,
        sphere,
        label,
        orbit: orbitFinal,
      });
    }
  }

  /** Set per-planet anchor positions in AU (called by universe-scene each frame). */
  setParentPositions(positions: Map<MoonElements["parent"], Vector3>): void {
    for (const [parent, anchor] of this.anchors) {
      const p = positions.get(parent);
      if (p) anchor.position.copy(p);
    }
  }

  /** Update camera position (AU, in solarGroup-local frame) for label culling. */
  setCameraAU(pos: Vector3): void {
    this.camAU.copy(pos);
  }

  /** Advance Kepler by sim-time. */
  setSimTime(date: Date): void {
    const jd = date.getTime() / 86400000 + 2440587.5;
    for (const m of this.moons) {
      const dt = jd - m.spec.epochJD;
      const n = (2 * Math.PI) / m.spec.period_days; // rad/day
      let M = m.spec.M0_deg * DEG + n * dt;
      M = ((M + Math.PI) % (2 * Math.PI)) - Math.PI;
      // Newton-Raphson
      let E = M;
      for (let k = 0; k < 6; k++) {
        const f = E - m.spec.e * Math.sin(E) - M;
        const fp = 1 - m.spec.e * Math.cos(E);
        E -= f / fp;
      }
      const cosE = Math.cos(E);
      const a_au = m.spec.a_km / KM_PER_AU;
      const r = a_au * (1 - m.spec.e * cosE);
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + m.spec.e) * Math.sin(E / 2),
        Math.sqrt(1 - m.spec.e) * Math.cos(E / 2),
      );
      const inc = m.spec.i_deg * DEG;
      const node = m.spec.node_deg * DEG;
      const argp = m.spec.argp_deg * DEG;
      const cw = Math.cos(nu + argp);
      const sw = Math.sin(nu + argp);
      const cN = Math.cos(node);
      const sN = Math.sin(node);
      const ci = Math.cos(inc);
      const si = Math.sin(inc);
      // Parent-equator frame.
      const ex = r * (cN * cw - sN * sw * ci);
      const ey = r * (sN * cw + cN * sw * ci);
      const ez = r * (sw * si);
      // Tilt parent-equator → ecliptic (rotation about ecliptic-x by obliquity).
      const tilted = this.applyParentTilt(m.spec.parent, new Vector3(ex, ey, ez));
      // Ecliptic (x, y, z) → scene (x, z, -y) (matches universe-scene convention).
      m.rel.set(tilted.x, tilted.z, -tilted.y);
      m.group.position.copy(m.rel);
      // Label opacity ramps up when camera is near the parent anchor.
      const anchor = this.anchors.get(m.spec.parent);
      if (anchor) {
        const distAU = anchor.position.distanceTo(this.camAU);
        const op = clamp01(1 - distAU / MoonField.LABEL_AU);
        (m.label.material as SpriteMaterial).opacity = op;
        const orbitMat = m.orbit.material as LineBasicMaterial;
        orbitMat.opacity = op * 0.6;
        orbitMat.transparent = true;
        orbitMat.visible = op > 0.02;
      }
    }
  }

  /** Pick (raycast) — returns the nearest hit moon or null. */
  pick(
    ndc: Vector2,
    raycaster: Raycaster,
    camera: Camera,
  ): MoonRenderable | null {
    raycaster.setFromCamera(ndc, camera);
    let best: { hit: MoonRenderable; dist: number } | null = null;
    for (const m of this.moons) {
      // Skip culled moons (label is hidden → camera too far for sensible click).
      if ((m.label.material as SpriteMaterial).opacity <= 0.02) continue;
      const hits = raycaster.intersectObject(m.sphere, false);
      const h = hits[0];
      if (h && (!best || h.distance < best.dist)) {
        best = { hit: m, dist: h.distance };
      }
    }
    return best?.hit ?? null;
  }

  private applyParentTilt(
    parent: MoonElements["parent"],
    v: Vector3,
  ): Vector3 {
    const c = this.parentRotCos.get(parent) ?? 1;
    const s = this.parentRotSin.get(parent) ?? 0;
    // Rotate about x-axis: y' = c*y - s*z; z' = s*y + c*z.
    const y = v.y;
    const z = v.z;
    v.y = c * y - s * z;
    v.z = s * y + c * z;
    return v;
  }

  private makeOrbitLoop(m: MoonElements): LineLoop {
    const SAMPLES = 96;
    const positions = new Float32Array(SAMPLES * 3);
    const a_au = m.a_km / KM_PER_AU;
    const inc = m.i_deg * DEG;
    const node = m.node_deg * DEG;
    const argp = m.argp_deg * DEG;
    const cN = Math.cos(node);
    const sN = Math.sin(node);
    const ci = Math.cos(inc);
    const si = Math.sin(inc);
    for (let i = 0; i < SAMPLES; i++) {
      const E = (i / SAMPLES) * 2 * Math.PI;
      const cosE = Math.cos(E);
      const r = a_au * (1 - m.e * cosE);
      const nu = 2 * Math.atan2(
        Math.sqrt(1 + m.e) * Math.sin(E / 2),
        Math.sqrt(1 - m.e) * Math.cos(E / 2),
      );
      const cw = Math.cos(nu + argp);
      const sw = Math.sin(nu + argp);
      const ex = r * (cN * cw - sN * sw * ci);
      const ey = r * (sN * cw + cN * sw * ci);
      const ez = r * (sw * si);
      const tilted = this.applyParentTilt(m.parent, new Vector3(ex, ey, ez));
      positions[i * 3] = tilted.x;
      positions[i * 3 + 1] = tilted.z;
      positions[i * 3 + 2] = -tilted.y;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    const mat = new LineBasicMaterial({
      color: hueForMoon(m.name),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return new LineLoop(geom, mat);
  }

  /** Iterate moons (for the universe-scene's pick path). */
  all(): MoonRenderable[] {
    return this.moons;
  }
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Per-moon orbit-line hue. Matches AstroGrid v1.1.10's "each moon's orbit
 *  line uses its own hue so you can tell crowded systems apart at a
 *  glance" — Saturn's seven moons would be indistinguishable in one tint. */
function hueForMoon(name: string): number {
  switch (name) {
    case "Phobos":
      return 0xff9c6e;
    case "Deimos":
      return 0xd1764e;
    case "Mimas":
      return 0x86c1ff;
    case "Enceladus":
      return 0xb6e6f5;
    case "Tethys":
      return 0xa6ffd3;
    case "Dione":
      return 0xffd486;
    case "Rhea":
      return 0xffb070;
    case "Titan":
      return 0xfff5a3;
    case "Iapetus":
      return 0xc89aff;
    case "Miranda":
      return 0x9aeaff;
    case "Ariel":
      return 0xc4f0ff;
    case "Umbriel":
      return 0x8e9fb8;
    case "Titania":
      return 0xc1d6f0;
    case "Oberon":
      return 0x9bb5c8;
    case "Triton":
      return 0x6fa8ff;
    default:
      return 0x88a4c4;
  }
}

function makeOrbitLoop(
  _m: MoonElements,
  _tilt: (parent: MoonElements["parent"]) => Vector3,
): LineLoop {
  // Placeholder used only during initial constructor flow above; the real
  // loop is rebuilt via `MoonField.makeOrbitLoop`.
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(new Float32Array(0), 3));
  const mat = new LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
  return new LineLoop(geom, mat);
}

function makeLabelTexture(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 4;
  const padY = 2;
  const fontSize = 10 * dpr;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(220, 232, 255, 0.95)";
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

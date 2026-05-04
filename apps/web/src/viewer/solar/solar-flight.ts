import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { Body, HelioVector, GeoVector } from "astronomy-engine";

/**
 * 🚀 Solar System Flight Mode.
 *
 * A separate 3D scene that puts the camera in heliocentric space and lets
 * you fly around the planets at real heliocentric coordinates (1 AU = 1
 * scene unit). Sun at origin, planets as small sized spheres, orbital
 * paths drawn as elliptical line loops sampled across one full revolution.
 *
 * Background stars are rendered at radius 5,000 (effectively at infinity
 * relative to the ~30 AU planet system) so they don't move with parallax
 * as the camera flies — the constellations remain recognizable.
 *
 * Camera control: a hand-rolled "orbit-around-target" rig — drag to yaw +
 * pitch around the focused body, wheel to zoom. Click any planet's sphere
 * (via raycast) to refocus on it. Same time-scrubbing semantics as the
 * sky view, so playing forward shows the planets actually orbit.
 */

const AU = 1; // 1 AU = 1 scene unit
const SUN_DRAW_SIZE = 0.35; // Sun reads as the brightest object
const STAR_RADIUS = 5000; // background star sphere radius
const ORBIT_SAMPLES = 256;

const PLANETS: Array<{
  body: Body;
  name: string;
  color: number;
  drawSize: number;
}> = [
  { body: Body.Mercury, name: "Mercury", color: 0xc8c1b8, drawSize: 0.025 },
  { body: Body.Venus, name: "Venus", color: 0xfff0c2, drawSize: 0.04 },
  { body: Body.Earth, name: "Earth", color: 0x6ea4ff, drawSize: 0.045 },
  { body: Body.Mars, name: "Mars", color: 0xff8a5e, drawSize: 0.035 },
  { body: Body.Jupiter, name: "Jupiter", color: 0xffd9a8, drawSize: 0.09 },
  { body: Body.Saturn, name: "Saturn", color: 0xffe1a3, drawSize: 0.08 },
  { body: Body.Uranus, name: "Uranus", color: 0xb6e6f0, drawSize: 0.055 },
  { body: Body.Neptune, name: "Neptune", color: 0x7fa6ff, drawSize: 0.055 },
];

const ORBIT_COLORS: Record<string, number> = {
  Mercury: 0xc8c1b8,
  Venus: 0xffd57a,
  Earth: 0x6ea4ff,
  Mars: 0xff8a5e,
  Jupiter: 0xffd9a8,
  Saturn: 0xffe1a3,
  Uranus: 0xb6e6f0,
  Neptune: 0x7fa6ff,
};

type PlanetMesh = {
  name: string;
  body: Body;
  group: Group; // holds the sphere + label so they translate together
  sphere: Mesh;
  label: Sprite;
  drawSize: number;
};

export type SolarFlightState = {
  time: Date;
  playing: boolean;
  timeRate: number;
  /** Camera focus body name. */
  focus: string;
  /** Distance from focus body in AU. */
  cameraDistance: number;
  /** Camera RA-like azimuth in radians. */
  yaw: number;
  /** Camera pitch in radians. */
  pitch: number;
};

type Listener = (s: SolarFlightState) => void;

export class SolarFlightScene {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene = new Scene();

  // Camera control
  private focusName = "Sun";
  private cameraDistance = 4; // AU from focus
  private yaw = 0;
  private pitch = 0.4;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  // Time
  private simTime = new Date();
  private playing = true;
  private timeRate = 86400; // default: 1 day per second so motion is visible
  private lastWallClock = performance.now();

  // Scene objects
  private sun: Mesh;
  private sunGlow: Sprite;
  private planets: PlanetMesh[] = [];
  private orbits: LineLoop[] = [];
  private starPoints: Points | null = null;
  private backgroundLabels: Sprite[] = [];

  // State
  private rafHandle = 0;
  private resizeObs: ResizeObserver | null = null;
  private disposed = false;
  private listeners = new Set<Listener>();
  private state: SolarFlightState;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000208, 1);

    this.camera = new PerspectiveCamera(50, 1, 0.001, 20000);

    // Sun at origin — emissive sphere + sprite glow
    const sunGeom = new SphereGeometry(SUN_DRAW_SIZE, 32, 32);
    const sunMat = new MeshBasicMaterial({ color: 0xffeb91 });
    this.sun = new Mesh(sunGeom, sunMat);
    this.scene.add(this.sun);

    this.sunGlow = makeGlowSprite(0xffd06a, SUN_DRAW_SIZE * 6);
    this.scene.add(this.sunGlow);

    // Build planets + orbits
    void this.buildPlanets();
    void this.buildOrbits();

    // Background star field on a giant sphere (radius STAR_RADIUS).
    void this.loadStarBackground();
    // Bright-star + cosmic-landmark labels at the same far radius.
    void this.loadBackgroundLabels();

    // Camera + interaction
    this.applyCamera();
    this.attachInputs();

    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(canvas);
    this.handleResize();

    this.state = {
      time: this.simTime,
      playing: this.playing,
      timeRate: this.timeRate,
      focus: this.focusName,
      cameraDistance: this.cameraDistance,
      yaw: this.yaw,
      pitch: this.pitch,
    };

    this.tick();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setTime(t: Date): void {
    this.simTime = new Date(t.getTime());
    this.updatePlanets();
    this.publishState();
  }

  setPlaying(p: boolean): void {
    this.playing = p;
    this.lastWallClock = performance.now();
    this.publishState();
  }

  setTimeRate(r: number): void {
    this.timeRate = r;
    this.publishState();
  }

  setFocus(name: string): void {
    if (name === this.focusName) return;
    this.focusName = name;
    // Reset distance to a reasonable default for the new target.
    this.cameraDistance =
      name === "Sun"
        ? 4
        : ["Jupiter", "Saturn", "Uranus", "Neptune"].includes(name)
          ? 0.5
          : 0.2;
    this.applyCamera();
    this.publishState();
  }

  /** Returns the names of all flyable targets. */
  targets(): string[] {
    return ["Sun", ...PLANETS.map((p) => p.name)];
  }

  private async buildPlanets(): Promise<void> {
    for (const spec of PLANETS) {
      const group = new Group();
      const geom = new SphereGeometry(spec.drawSize, 24, 24);
      const mat = new MeshBasicMaterial({ color: spec.color });
      const sphere = new Mesh(geom, mat);
      group.add(sphere);

      // Earth: subtle atmosphere glow halo (back-side hemisphere with
      // additive blending — reads as a faint blue rim).
      if (spec.name === "Earth") {
        const atmoGeom = new SphereGeometry(spec.drawSize * 1.18, 24, 24);
        const atmoMat = new MeshBasicMaterial({
          color: 0x6ea4ff,
          transparent: true,
          opacity: 0.25,
          side: BackSide,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        const atmo = new Mesh(atmoGeom, atmoMat);
        group.add(atmo);
      }

      // Saturn: textured ring system. RingGeometry is a flat disk; we tilt
      // it around the X axis so it reads at the body's actual ~26.7°
      // axial inclination (close enough for visualization).
      if (spec.name === "Saturn") {
        const ringInner = spec.drawSize * 1.4;
        const ringOuter = spec.drawSize * 2.4;
        const ringGeom = new RingGeometry(ringInner, ringOuter, 96);
        const ringMat = new MeshBasicMaterial({
          map: makeRingTexture(),
          color: 0xffe1a3,
          transparent: true,
          opacity: 0.85,
          side: DoubleSide,
          depthWrite: false,
        });
        const ring = new Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2 - 0.466; // ~26.7° tilt
        group.add(ring);
      }

      const labelTex = makeLabelTexture(spec.name);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.9,
      });
      const label = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const h = 0.06;
      label.scale.set(h * aspect, h, 1);
      label.position.set(0, spec.drawSize + 0.05, 0);
      group.add(label);

      this.scene.add(group);
      this.planets.push({
        name: spec.name,
        body: spec.body,
        group,
        sphere,
        label,
        drawSize: spec.drawSize,
      });
    }
    this.updatePlanets();
  }

  private async buildOrbits(): Promise<void> {
    // Sample one orbital period per planet so the loop closes.
    const PERIOD_DAYS: Record<string, number> = {
      Mercury: 87.969,
      Venus: 224.701,
      Earth: 365.256,
      Mars: 686.971,
      Jupiter: 4332.59,
      Saturn: 10759.22,
      Uranus: 30688.5,
      Neptune: 60182,
    };
    const now = this.simTime;
    for (const spec of PLANETS) {
      const periodDays = PERIOD_DAYS[spec.name] ?? 365.256;
      const positions: number[] = [];
      for (let i = 0; i < ORBIT_SAMPLES; i++) {
        const t = new Date(
          now.getTime() + (i / ORBIT_SAMPLES) * periodDays * 86400 * 1000,
        );
        try {
          const v = HelioVector(spec.body, t);
          positions.push(v.x * AU, v.z * AU, -v.y * AU);
        } catch {
          // ignore, skip a sample
        }
      }
      const geom = new BufferGeometry();
      geom.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(positions), 3),
      );
      const mat = new LineBasicMaterial({
        color: ORBIT_COLORS[spec.name] ?? 0xffffff,
        transparent: true,
        opacity: 0.45,
      });
      const loop = new LineLoop(geom, mat);
      this.scene.add(loop);
      this.orbits.push(loop);
    }
  }

  private updatePlanets(): void {
    for (const p of this.planets) {
      try {
        const v = HelioVector(p.body, this.simTime);
        // AstronomyEngine returns equatorial J2000 (x to vernal point, z to NCP).
        // Map to scene Y-up: scene_x = x_eq, scene_y = z_eq, scene_z = -y_eq.
        p.group.position.set(v.x * AU, v.z * AU, -v.y * AU);
      } catch {
        // ignore
      }
    }
  }

  private async loadBackgroundLabels(): Promise<void> {
    try {
      // Top ~50 brightest named stars + every cosmic landmark.
      const [starsRes, landmarksMod] = await Promise.all([
        fetch("/data/hyg-named.json"),
        import("../cosmic/cosmic-landmarks"),
      ]);
      const stars = (await starsRes.json()) as Array<{
        name: string;
        ra: number;
        dec: number;
        mag: number;
      }>;
      const topStars = stars
        .filter((s) => s.name !== "Sol")
        .sort((a, b) => a.mag - b.mag)
        .slice(0, 50);

      // Helper: place a label at the celestial direction projected onto
      // the giant background sphere.
      const place = (
        raDeg: number,
        decDeg: number,
        text: string,
        color: string,
        opacity: number,
      ) => {
        const raRad = (raDeg * Math.PI) / 180;
        const decRad = (decDeg * Math.PI) / 180;
        const cdec = Math.cos(decRad);
        const x = STAR_RADIUS * cdec * Math.cos(raRad);
        const ySc = STAR_RADIUS * Math.sin(decRad);
        const z = -STAR_RADIUS * cdec * Math.sin(raRad);
        const tex = makeColoredLabel(text, color);
        const mat = new SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity,
        });
        const sprite = new Sprite(mat);
        const aspect = tex.image.width / tex.image.height;
        // World-space sprite scale at distance STAR_RADIUS (5000) needs
        // ~70 units tall to read as ~0.8° angular size — same visual
        // weight as the star labels in the celestial-sphere view.
        const h = 70;
        sprite.scale.set(h * aspect, h, 1);
        sprite.position.set(x, ySc, z);
        this.scene.add(sprite);
        this.backgroundLabels.push(sprite);
      };

      for (const s of topStars) {
        place(s.ra, s.dec, s.name, "rgba(245, 240, 220, 0.95)", 0.7);
      }
      for (const lm of landmarksMod.COSMIC_LANDMARKS) {
        const color =
          lm.kind === "black-hole"
            ? "rgba(255, 130, 130, 0.95)"
            : lm.kind === "pulsar"
              ? "rgba(255, 200, 90, 0.95)"
              : lm.kind === "supernova-remnant"
                ? "rgba(255, 110, 200, 0.95)"
                : lm.kind === "quasar"
                  ? "rgba(190, 220, 255, 0.95)"
                  : lm.kind === "agn"
                    ? "rgba(120, 220, 255, 0.95)"
                    : "rgba(220, 180, 255, 0.95)";
        place(lm.raDeg, lm.decDeg, lm.name, color, 0.85);
      }
    } catch {
      // ignore — labels are nice-to-have
    }
  }

  private async loadStarBackground(): Promise<void> {
    try {
      const res = await fetch("/data/hyg-bright.bin");
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const view = new DataView(buf);
      const count = view.getUint32(0, true);
      // Cap to ~30K brightest for the background — full 117K would be
      // pretty but scrolls off-budget for the parallax-free sphere.
      const limit = Math.min(count, 30000);
      const positions = new Float32Array(limit * 3);
      const colors = new Float32Array(limit * 3);
      const sizes = new Float32Array(limit);
      let o = 4;
      for (let i = 0; i < count; i++) {
        const ra = view.getFloat32(o, true);
        const dec = view.getFloat32(o + 4, true);
        const mag = view.getFloat32(o + 8, true);
        const bv = view.getFloat32(o + 12, true);
        o += 16;
        if (i >= limit) continue;
        const raRad = (ra * Math.PI) / 180;
        const decRad = (dec * Math.PI) / 180;
        const cdec = Math.cos(decRad);
        // Equatorial → Y-up scene. Project to a giant sphere.
        const x = STAR_RADIUS * cdec * Math.cos(raRad);
        const ySc = STAR_RADIUS * Math.sin(decRad);
        const z = -STAR_RADIUS * cdec * Math.sin(raRad);
        positions[i * 3] = x;
        positions[i * 3 + 1] = ySc;
        positions[i * 3 + 2] = z;
        const [r, g, b] = bvToRgb(bv);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
        const brightness = Math.pow(10, -mag / 2.5);
        sizes[i] = 1.5 + 22 * Math.pow(brightness, 0.45);
      }
      const geom = new BufferGeometry();
      geom.setAttribute("position", new BufferAttribute(positions, 3));
      geom.setAttribute("color", new BufferAttribute(colors, 3));
      geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
      const material = new ShaderMaterial({
        uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      this.starPoints = new Points(geom, material);
      this.starPoints.frustumCulled = false;
      this.scene.add(this.starPoints);
    } catch {
      // ignore — background stars are a nice-to-have
    }
  }

  private attachInputs(): void {
    const c = this.canvas;
    c.style.cursor = "grab";
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    c.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.style.cursor = "grabbing";
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.yaw -= dx * 0.005;
    this.pitch = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, this.pitch - dy * 0.005),
    );
    this.applyCamera();
    this.publishState();
  };
  private onPointerUp = (e: PointerEvent) => {
    this.dragging = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.canvas.style.cursor = "grab";
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Logarithmic zoom: 1 wheel notch ~10% distance change.
    const factor = Math.exp(e.deltaY * 0.0008);
    this.cameraDistance = Math.max(
      0.05,
      Math.min(80, this.cameraDistance * factor),
    );
    this.applyCamera();
    this.publishState();
  };

  private focusPosition(): Vector3 {
    if (this.focusName === "Sun") return new Vector3(0, 0, 0);
    const p = this.planets.find((x) => x.name === this.focusName);
    if (!p) return new Vector3(0, 0, 0);
    return p.group.position.clone();
  }

  private applyCamera(): void {
    const focus = this.focusPosition();
    const r = this.cameraDistance;
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const offset = new Vector3(r * cp * sy, r * sp, r * cp * cy);
    this.camera.position.copy(focus).add(offset);
    this.camera.lookAt(focus);
  }

  private publishState(): void {
    this.state = {
      time: this.simTime,
      playing: this.playing,
      timeRate: this.timeRate,
      focus: this.focusName,
      cameraDistance: this.cameraDistance,
      yaw: this.yaw,
      pitch: this.pitch,
    };
    for (const l of this.listeners) l(this.state);
  }

  private handleResize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private tick = (): void => {
    if (this.disposed) return;
    if (this.playing) {
      const now = performance.now();
      const elapsedMs = now - this.lastWallClock;
      this.lastWallClock = now;
      this.simTime = new Date(
        this.simTime.getTime() + elapsedMs * this.timeRate,
      );
      this.updatePlanets();
      this.publishState();
    }
    // If we're focused on a moving target, keep the camera glued.
    if (this.focusName !== "Sun") this.applyCamera();
    this.renderer.render(this.scene, this.camera);
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  /** Returns the geocentric direction from Earth to the focused body, used
   *  to round-trip the focus selection back into the sky-mode camera. */
  geocentricDirOfFocus(): { x: number; y: number; z: number } | null {
    if (this.focusName === "Sun") {
      try {
        const v = GeoVector(Body.Sun, this.simTime, true);
        const len = Math.hypot(v.x, v.y, v.z);
        return { x: v.x / len, y: v.z / len, z: -v.y / len };
      } catch {
        return null;
      }
    }
    const p = this.planets.find((x) => x.name === this.focusName);
    if (!p) return null;
    try {
      const v = GeoVector(p.body, this.simTime, true);
      const len = Math.hypot(v.x, v.y, v.z);
      return { x: v.x / len, y: v.z / len, z: -v.y / len };
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    this.resizeObs?.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    for (const o of this.orbits) {
      o.geometry.dispose();
      (o.material as LineBasicMaterial).dispose();
    }
    for (const p of this.planets) {
      p.sphere.geometry.dispose();
      (p.sphere.material as MeshBasicMaterial).dispose();
      const lm = p.label.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
    }
    this.sun.geometry.dispose();
    (this.sun.material as MeshBasicMaterial).dispose();
    if (this.starPoints) {
      this.starPoints.geometry.dispose();
      (this.starPoints.material as ShaderMaterial).dispose();
    }
    for (const s of this.backgroundLabels) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.scene.remove(s);
    }
    this.backgroundLabels = [];
    this.renderer.dispose();
    this.listeners.clear();
  }
}

function makeLabelTexture(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 5;
  const padY = 2;
  const fontSize = 11 * dpr;
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
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(245, 240, 220, 0.95)";
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/** Procedural Saturn-ring texture: a horizontal stripe of warm bands
 *  with a couple of darker gaps (Cassini Division at ~70%). */
function makeRingTexture(): CanvasTexture {
  const w = 512;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  // Base gradient: dark inner, bright middle, fading outer
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(120, 100, 70, 0.0)"); // inner edge transparent
  grad.addColorStop(0.05, "rgba(180, 150, 100, 0.7)");
  grad.addColorStop(0.45, "rgba(255, 220, 160, 0.95)");
  grad.addColorStop(0.65, "rgba(0, 0, 0, 0.0)"); // Cassini Division
  grad.addColorStop(0.7, "rgba(255, 220, 160, 0.95)");
  grad.addColorStop(0.95, "rgba(180, 150, 100, 0.5)");
  grad.addColorStop(1, "rgba(120, 100, 70, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Add fine banding noise
  for (let x = 0; x < w; x += 2) {
    if (Math.random() < 0.18) {
      ctx.fillStyle = `rgba(255, 235, 200, ${Math.random() * 0.18})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function makeColoredLabel(text: string, color: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 5;
  const padY = 2;
  const fontSize = 11 * dpr;
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
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function makeGlowSprite(color: number, size: number): Sprite {
  const c = new Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const sz = 256;
  const canvas = document.createElement("canvas");
  canvas.width = sz;
  canvas.height = sz;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const grad = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  grad.addColorStop(0.0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.2, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
  grad.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sz, sz);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  const mat = new SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function bvToRgb(bv: number): [number, number, number] {
  const t = Math.max(-0.4, Math.min(2.0, Number.isFinite(bv) ? bv : 0));
  let r: number;
  let g: number;
  let b: number;
  if (t < 0.0) {
    r = 0.61 + 0.11 * t + 0.1 * t * t;
    g = 0.7 + 0.07 * t + 0.1 * t * t;
    b = 1.0;
  } else if (t < 0.4) {
    r = 0.83 + 0.17 * t;
    g = 0.87 + 0.11 * t;
    b = 1.0;
  } else if (t < 1.6) {
    const u = (t - 0.4) / 1.2;
    r = 1.0;
    g = 0.98 - 0.16 * u;
    b = 1.0 - 0.47 * u - 0.18 * u * u;
  } else {
    r = 1.0;
    g = 0.82 - 0.5 * (t - 1.6);
    b = 0.35 - 0.1 * (t - 1.6);
  }
  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio;
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.04, r2);
    float halo = (1.0 - smoothstep(0.04, 0.25, r2)) * 0.45;
    vec3 col = mix(vColor, vec3(1.0), 0.7) * core + vColor * halo;
    float a = clamp(core + halo, 0.0, 1.0);
    gl_FragColor = vec4(col, a);
  }
`;

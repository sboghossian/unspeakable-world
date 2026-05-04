import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

/**
 * 🌌 Galactic-scale scene.
 *
 * Renders the Milky Way as a procedural spiral disk + central bulge +
 * stellar halo, with the Sun at its real position (~8 kpc / 26,000 ly
 * from the galactic center, in the Orion Spur). The camera flies in a
 * WASD-style free rig so the user can zoom from a few light-years out
 * to seeing the galaxy as a whole.
 *
 * Spatial unit: 1 unit = 1,000 light-years (1 kly). At this scale the
 * Sun sits at (26.0, 0, 0) and the galactic disk extends ~50 kly radius.
 *
 * Layers (visible based on camera distance):
 *   - 0-1 unit: stylised Sun marker + closest cosmic landmarks
 *   - 1-50 units: spiral structure becomes legible
 *   - 50+ units: full galaxy, Local Group neighbours, supercluster labels
 */

const GALACTIC_CENTER = new Vector3(0, 0, 0);
const SUN_POS = new Vector3(26, 0, 0); // 26 kly from GC

export type GalacticState = {
  cameraDistance: number; // distance from Sun in kly
  scaleLabel: string;
  arms: boolean;
  starHalo: boolean;
};

type Listener = (s: GalacticState) => void;

const ARM_COLORS = [0xb88cff, 0xff8cb8, 0x88c8ff, 0xffd28c];

const SPIRAL_ARMS: Array<{
  name: string;
  startAngleDeg: number;
  startRadius: number;
  endRadius: number;
  endAngleDeg: number;
  color: number;
}> = [
  { name: "Perseus Arm", startAngleDeg: 90, startRadius: 5, endRadius: 45, endAngleDeg: 360, color: ARM_COLORS[0]! },
  { name: "Sagittarius-Carina Arm", startAngleDeg: 210, startRadius: 5, endRadius: 40, endAngleDeg: 480, color: ARM_COLORS[1]! },
  { name: "Scutum-Centaurus Arm", startAngleDeg: 330, startRadius: 5, endRadius: 42, endAngleDeg: 600, color: ARM_COLORS[2]! },
  { name: "Orion Spur", startAngleDeg: 30, startRadius: 18, endRadius: 30, endAngleDeg: 90, color: ARM_COLORS[3]! },
];

const NAMED_LANDMARKS: Array<{ name: string; pos: Vector3; tone: string }> = [
  // Galactic features
  { name: "Sgr A*", pos: new Vector3(0, 0, 0), tone: "rgba(255, 130, 130, 0.95)" },
  { name: "Galactic Bulge", pos: new Vector3(0, 2.5, 0), tone: "rgba(255, 220, 160, 0.95)" },
  { name: "Stellar Halo", pos: new Vector3(0, 35, -50), tone: "rgba(220, 220, 240, 0.85)" },
  { name: "Thick Disk", pos: new Vector3(20, -4, 30), tone: "rgba(180, 200, 255, 0.85)" },
  { name: "Orion Spur (you are here)", pos: new Vector3(SUN_POS.x, 1.5, 0), tone: "rgba(255, 235, 145, 0.95)" },

  // Local Group (Mly-scale; 1 kly = 1 unit so 1 Mly = 1000 units)
  { name: "Andromeda Galaxy (M31)", pos: new Vector3(2540, 0, 0), tone: "rgba(220, 200, 255, 0.95)" },
  { name: "Triangulum (M33)", pos: new Vector3(2700, -300, 100), tone: "rgba(220, 200, 255, 0.95)" },
  { name: "Large Magellanic Cloud", pos: new Vector3(-160, 0, 30), tone: "rgba(220, 200, 255, 0.95)" },
  { name: "Small Magellanic Cloud", pos: new Vector3(-200, 0, 60), tone: "rgba(220, 200, 255, 0.95)" },

  // Nearby galaxies (Mly)
  { name: "Centaurus A (NGC 5128)", pos: new Vector3(13000, 1200, -2000), tone: "rgba(120, 220, 255, 0.95)" },
  { name: "M81 Group", pos: new Vector3(11700, 5000, 1000), tone: "rgba(220, 220, 220, 0.85)" },
  { name: "Sombrero (M104)", pos: new Vector3(31000, 5000, 0), tone: "rgba(220, 220, 220, 0.95)" },
  { name: "Whirlpool (M51)", pos: new Vector3(-23000, 3000, 8000), tone: "rgba(220, 220, 220, 0.95)" },

  // Galaxy clusters (Mly–Gly)
  { name: "Virgo Cluster", pos: new Vector3(53000, 12000, 0), tone: "rgba(120, 220, 255, 0.85)" },
  { name: "Coma Cluster", pos: new Vector3(320000, 50000, 100000), tone: "rgba(120, 220, 255, 0.85)" },
  { name: "Perseus Cluster", pos: new Vector3(-240000, 100000, -50000), tone: "rgba(120, 220, 255, 0.85)" },

  // Superclusters / large-scale structure
  { name: "Local Group", pos: new Vector3(1000, 0, 0), tone: "rgba(180, 220, 255, 0.85)" },
  { name: "Virgo Supercluster", pos: new Vector3(60000, 0, 0), tone: "rgba(180, 220, 255, 0.95)" },
  { name: "Laniakea Supercluster", pos: new Vector3(220000, 50000, 0), tone: "rgba(180, 220, 255, 0.95)" },
  { name: "Great Attractor", pos: new Vector3(250000, 0, 0), tone: "rgba(255, 200, 130, 0.95)" },
  { name: "Shapley Supercluster", pos: new Vector3(650000, 100000, 0), tone: "rgba(255, 200, 130, 0.95)" },
  { name: "Sloan Great Wall", pos: new Vector3(1370000, 200000, 0), tone: "rgba(255, 200, 130, 0.95)" },
  { name: "Boötes Void", pos: new Vector3(700000, 0, 0), tone: "rgba(180, 180, 180, 0.6)" },

  // Famous nearby stars (within 30 ly, kly = 1 unit means these sit ON the Sun)
  // Drawn at slightly offset positions for legibility.
  { name: "Alpha Centauri", pos: new Vector3(SUN_POS.x - 0.0043, 0.05, 0), tone: "rgba(255, 240, 200, 0.85)" },
  { name: "Sirius", pos: new Vector3(SUN_POS.x + 0.0086, 0.04, 0.005), tone: "rgba(220, 240, 255, 0.85)" },
  { name: "Vega", pos: new Vector3(SUN_POS.x, 0.02, -0.025), tone: "rgba(220, 240, 255, 0.85)" },
  { name: "Betelgeuse", pos: new Vector3(SUN_POS.x - 0.7, 0.05, 0.1), tone: "rgba(255, 200, 130, 0.85)" },
  { name: "Polaris", pos: new Vector3(SUN_POS.x, 0.43, 0), tone: "rgba(220, 240, 255, 0.85)" },
];

export class GalacticScene {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene = new Scene();

  private galaxyGroup = new Group();
  private bulge: Mesh;
  private disk: Mesh;
  private halo: Mesh;
  private armPoints: Points;
  private cosmicWebPoints: Points | null = null;
  private armLabels: Sprite[] = [];
  private landmarkLabels: Sprite[] = [];
  private sunMarker: Mesh;

  // Free WASD camera — start above the disk looking at the galactic center.
  private camPos = new Vector3(40, 25, 40);
  private camForward = new Vector3();
  // yaw/pitch chosen so the forward vector points from camPos toward the
  // origin (Galactic Center). forward = (-camPos).normalize().
  // forward = (-40, -25, -40)/|.| ≈ (-0.65, -0.40, -0.65)
  // yaw = atan2(forward.x, forward.z) = atan2(-0.65, -0.65) = -3π/4
  // pitch = asin(forward.y) ≈ -0.412 rad
  private camYaw = -(3 * Math.PI) / 4;
  private camPitch = -0.412;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private heldKeys = new Set<string>();
  private cameraSpeed = 30; // kly per second base

  private rafHandle = 0;
  private resizeObs: ResizeObserver | null = null;
  private disposed = false;
  private listeners = new Set<Listener>();
  private state: GalacticState;
  private lastTickMs = performance.now();
  private armsVisible = true;
  private haloVisible = true;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: true,
      logarithmicDepthBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x020415, 1);

    // Wide near/far range for galactic scales.
    this.camera = new PerspectiveCamera(60, 1, 0.001, 100000);
    this.applyCamera();

    // Galactic disk — flat plane with procedural galaxy texture.
    const galaxyTex = makeGalaxyTexture();
    const diskMat = new MeshBasicMaterial({
      map: galaxyTex,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
    const diskGeom = new PlaneGeometry(110, 110);
    this.disk = new Mesh(diskGeom, diskMat);
    this.disk.rotation.x = -Math.PI / 2; // lay flat
    this.galaxyGroup.add(this.disk);

    // Central bulge — bright glowing sphere.
    const bulgeGeom = new SphereGeometry(3, 32, 32);
    const bulgeMat = new MeshBasicMaterial({
      color: 0xfff0c0,
      transparent: true,
      opacity: 0.85,
    });
    this.bulge = new Mesh(bulgeGeom, bulgeMat);
    this.galaxyGroup.add(this.bulge);

    // Stellar halo — large faint sphere around the disk.
    const haloGeom = new SphereGeometry(70, 24, 24);
    const haloMat = new MeshBasicMaterial({
      color: 0xa080ff,
      transparent: true,
      opacity: 0.05,
      side: DoubleSide,
      depthWrite: false,
    });
    this.halo = new Mesh(haloGeom, haloMat);
    this.galaxyGroup.add(this.halo);

    // Spiral-arm star points — sample logarithmic spirals + scatter.
    this.armPoints = makeArmPoints();
    this.galaxyGroup.add(this.armPoints);

    // Cosmic-web particle layer — extends out to ~2 Gly, with filaments
    // and voids approximated by clustered random samples.
    this.cosmicWebPoints = makeCosmicWebPoints();
    this.scene.add(this.cosmicWebPoints);

    // Sun marker — bright pulsing sphere at SUN_POS plus a glow halo.
    const sunGeom = new SphereGeometry(0.6, 16, 16);
    const sunMat = new MeshBasicMaterial({
      color: 0xfff0a0,
      transparent: false,
    });
    this.sunMarker = new Mesh(sunGeom, sunMat);
    this.sunMarker.position.copy(SUN_POS);
    this.galaxyGroup.add(this.sunMarker);
    // Halo so it's visible from far away.
    const sunHaloGeom = new SphereGeometry(2.5, 16, 16);
    const sunHaloMat = new MeshBasicMaterial({
      color: 0xffd060,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const sunHalo = new Mesh(sunHaloGeom, sunHaloMat);
    sunHalo.position.copy(SUN_POS);
    this.galaxyGroup.add(sunHalo);
    // "You Are Here" arrow — a cone-ish tetrahedron tilted up
    const arrowGeom = new SphereGeometry(0.3, 8, 8);
    const arrowMat = new MeshBasicMaterial({ color: 0x00ff88 });
    const arrow = new Mesh(arrowGeom, arrowMat);
    arrow.position.copy(SUN_POS);
    arrow.position.y += 1.5;
    this.galaxyGroup.add(arrow);

    // Spiral-arm labels (sprites positioned along arms).
    for (const a of SPIRAL_ARMS) {
      const angleRad = ((a.startAngleDeg + a.endAngleDeg) / 2) * (Math.PI / 180);
      const radius = (a.startRadius + a.endRadius) / 2;
      const sprite = makeArmLabel(a.name, a.color);
      sprite.position.set(
        radius * Math.cos(angleRad),
        0.5,
        radius * Math.sin(angleRad),
      );
      this.galaxyGroup.add(sprite);
      this.armLabels.push(sprite);
    }

    // Cosmic landmark labels.
    for (const lm of NAMED_LANDMARKS) {
      const sprite = makeLabelSprite(lm.name, lm.tone);
      sprite.position.copy(lm.pos);
      // For the Solar-System label, offset slightly so it doesn't sit
      // right on the marker.
      if (lm.name === "Solar System") sprite.position.y += 1.2;
      this.scene.add(sprite);
      this.landmarkLabels.push(sprite);
    }

    this.scene.add(this.galaxyGroup);

    this.attachInputs();

    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(canvas);
    this.handleResize();

    this.state = {
      cameraDistance: this.camPos.distanceTo(SUN_POS),
      scaleLabel: this.scaleLabel(),
      arms: this.armsVisible,
      starHalo: this.haloVisible,
    };

    this.tick();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setArmsVisible(on: boolean): void {
    this.armsVisible = on;
    this.armPoints.visible = on;
    for (const s of this.armLabels) s.visible = on;
    this.publishState();
  }

  setHaloVisible(on: boolean): void {
    this.haloVisible = on;
    this.halo.visible = on;
    this.publishState();
  }

  flyTo(target: "Sun" | "Galactic Center" | "M31" | "Local Group"): void {
    let dest: Vector3;
    let dist: number;
    if (target === "Galactic Center") {
      dest = GALACTIC_CENTER.clone();
      dist = 12;
    } else if (target === "M31") {
      dest = new Vector3(2540, 0, 0);
      dist = 200;
    } else if (target === "Local Group") {
      dest = new Vector3(0, 0, 0);
      dist = 3000;
    } else {
      dest = SUN_POS.clone();
      dist = 5;
    }
    // Place camera behind dest along (-1, 0.4, -1).
    const dir = new Vector3(-1, 0.4, -1).normalize();
    this.camPos = dest.clone().add(dir.clone().multiplyScalar(dist));
    // Camera looks along -dir (back toward dest).
    const fwd = dir.clone().negate();
    this.camYaw = Math.atan2(fwd.x, fwd.z);
    this.camPitch = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
    this.applyCamera();
    this.publishState();
  }

  private attachInputs(): void {
    const c = this.canvas;
    c.style.cursor = "grab";
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("pointermove", this.onPointerMove);
    c.addEventListener("pointerup", this.onPointerUp);
    c.addEventListener("pointercancel", this.onPointerUp);
    c.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
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
    this.camYaw -= dx * 0.005;
    this.camPitch = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, this.camPitch - dy * 0.005),
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
    // Wheel adjusts camera speed, since WASD moves at fixed speed.
    const factor = Math.exp(-e.deltaY * 0.0008);
    this.cameraSpeed = Math.max(0.5, Math.min(5000, this.cameraSpeed * factor));
    this.publishState();
  };
  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
    this.heldKeys.add(e.key.toLowerCase());
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.key.toLowerCase());
  };

  private applyCamera(): void {
    this.camForward.set(
      Math.cos(this.camPitch) * Math.sin(this.camYaw),
      Math.sin(this.camPitch),
      Math.cos(this.camPitch) * Math.cos(this.camYaw),
    );
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camPos.clone().add(this.camForward));
  }

  private scaleLabel(): string {
    const d = this.camPos.distanceTo(SUN_POS); // kly
    if (d < 0.5) return "Solar Neighborhood";
    if (d < 5) return "Local Stars";
    if (d < 30) return "Galactic Disk";
    if (d < 80) return "Whole Milky Way";
    if (d < 300) return "Local Group";
    if (d < 5000) return "Nearby Galaxies";
    if (d < 50000) return "Supercluster Region";
    return "Cosmic Web";
  }

  private publishState(): void {
    this.state = {
      cameraDistance: this.camPos.distanceTo(SUN_POS),
      scaleLabel: this.scaleLabel(),
      arms: this.armsVisible,
      starHalo: this.haloVisible,
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
    const now = performance.now();
    const dt = (now - this.lastTickMs) / 1000;
    this.lastTickMs = now;

    // WASD movement
    if (this.heldKeys.size > 0) {
      const speed = this.cameraSpeed * (this.heldKeys.has("shift") ? 4 : 1);
      const right = new Vector3(
        Math.cos(this.camYaw),
        0,
        -Math.sin(this.camYaw),
      );
      if (this.heldKeys.has("w")) {
        this.camPos.add(this.camForward.clone().multiplyScalar(speed * dt));
      }
      if (this.heldKeys.has("s")) {
        this.camPos.add(this.camForward.clone().multiplyScalar(-speed * dt));
      }
      if (this.heldKeys.has("a")) {
        this.camPos.add(right.clone().multiplyScalar(-speed * dt));
      }
      if (this.heldKeys.has("d")) {
        this.camPos.add(right.clone().multiplyScalar(speed * dt));
      }
      if (this.heldKeys.has("q")) {
        this.camPos.y -= speed * dt;
      }
      if (this.heldKeys.has("e")) {
        this.camPos.y += speed * dt;
      }
      this.applyCamera();
      this.publishState();
    }

    // No galaxy rotation — fly-to coordinates would drift out from under us.
    void dt;

    // Make sun marker pulse slightly.
    const t = now / 1000;
    const pulse = 1 + 0.3 * Math.sin(t * 3);
    this.sunMarker.scale.setScalar(pulse);

    this.renderer.render(this.scene, this.camera);
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    this.resizeObs?.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.disk.geometry.dispose();
    (this.disk.material as MeshBasicMaterial).map?.dispose();
    (this.disk.material as MeshBasicMaterial).dispose();
    this.bulge.geometry.dispose();
    (this.bulge.material as MeshBasicMaterial).dispose();
    this.halo.geometry.dispose();
    (this.halo.material as MeshBasicMaterial).dispose();
    this.armPoints.geometry.dispose();
    (this.armPoints.material as ShaderMaterial).dispose();
    if (this.cosmicWebPoints) {
      this.cosmicWebPoints.geometry.dispose();
      (this.cosmicWebPoints.material as ShaderMaterial).dispose();
    }
    for (const s of [...this.armLabels, ...this.landmarkLabels]) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
    }
    this.sunMarker.geometry.dispose();
    (this.sunMarker.material as MeshBasicMaterial).dispose();
    this.renderer.dispose();
    this.listeners.clear();
  }
}

// ─── Procedural galaxy texture ─────────────────────────────────────

function makeGalaxyTexture(): CanvasTexture {
  const SIZE = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const rMax = SIZE / 2 - 4;

  // Bulge glow (radial)
  const bulgeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax * 0.18);
  bulgeGrad.addColorStop(0, "rgba(255, 240, 200, 1)");
  bulgeGrad.addColorStop(0.5, "rgba(255, 200, 130, 0.6)");
  bulgeGrad.addColorStop(1, "rgba(255, 180, 120, 0)");
  ctx.fillStyle = bulgeGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Disk glow (faded outer)
  const diskGrad = ctx.createRadialGradient(cx, cy, rMax * 0.1, cx, cy, rMax);
  diskGrad.addColorStop(0, "rgba(255, 220, 180, 0.45)");
  diskGrad.addColorStop(0.4, "rgba(220, 180, 240, 0.22)");
  diskGrad.addColorStop(1, "rgba(140, 120, 200, 0)");
  ctx.fillStyle = diskGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Spiral arms — particle scatter along log spirals
  const N_ARMS = 4;
  const N_PARTICLES = 16000;
  for (let i = 0; i < N_PARTICLES; i++) {
    const arm = i % N_ARMS;
    const t = Math.random();
    // Logarithmic spiral: r = a * exp(b * theta)
    const theta = arm * ((Math.PI * 2) / N_ARMS) + t * 4 + Math.random() * 0.4;
    const r = (rMax * 0.1 + t * rMax * 0.85) * (0.95 + Math.random() * 0.1);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    const dist = Math.hypot(x - cx, y - cy);
    if (dist > rMax) continue;
    const tone = Math.random() < 0.7 ? 0 : 1;
    const c =
      tone === 0
        ? `rgba(255, ${220 + Math.random() * 35}, ${190 + Math.random() * 50}, ${0.3 + Math.random() * 0.5})`
        : `rgba(${180 + Math.random() * 60}, ${180 + Math.random() * 60}, 255, ${0.2 + Math.random() * 0.5})`;
    ctx.fillStyle = c;
    const sz = Math.random() * 1.6 + 0.4;
    ctx.fillRect(x, y, sz, sz);
  }

  // Dust lanes (darker streaks along arms)
  for (let i = 0; i < 4000; i++) {
    const arm = i % N_ARMS;
    const t = Math.random();
    const theta = arm * ((Math.PI * 2) / N_ARMS) + t * 4 + 0.3;
    const r = (rMax * 0.15 + t * rMax * 0.7) * (0.97 + Math.random() * 0.06);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    ctx.fillStyle = `rgba(40, 20, 60, ${Math.random() * 0.35})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function makeArmPoints(): Points {
  const N = 8000;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const arm = i % 4;
    const t = Math.random();
    const theta = arm * (Math.PI / 2) + t * 4 + Math.random() * 0.3;
    const r = 5 + t * 45 + Math.random() * 1.5;
    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * (1 - t * 0.7); // disk thickness
    positions[i * 3 + 2] = r * Math.sin(theta);
    const tone = Math.random() < 0.5;
    const c = new Color(tone ? 0xffe0b0 : 0xc8c0ff);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = 1.5 + Math.random() * 2.5;
  }
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(positions, 3));
  geom.setAttribute("color", new BufferAttribute(colors, 3));
  geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
  });
  const points = new Points(geom, mat);
  points.frustumCulled = false;
  return points;
}

/** Cosmic-web particle field. Sample-clustered voronoi-like structure to
 *  approximate filaments, walls, and voids out to ~2 Gly. */
function makeCosmicWebPoints(): Points {
  const N = 30000;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  // Generate ~80 cluster centers in a 2 Gly box, then scatter 99% of the
  // points near these centers to imitate filaments + voids.
  const N_CLUSTERS = 80;
  const RANGE = 1_500_000;
  const centers: Vector3[] = [];
  for (let i = 0; i < N_CLUSTERS; i++) {
    centers.push(
      new Vector3(
        (Math.random() - 0.5) * 2 * RANGE,
        (Math.random() - 0.5) * 2 * RANGE * 0.6,
        (Math.random() - 0.5) * 2 * RANGE,
      ),
    );
  }
  for (let i = 0; i < N; i++) {
    const cluster =
      Math.random() < 0.85
        ? centers[Math.floor(Math.random() * N_CLUSTERS)]!
        : new Vector3(0, 0, 0);
    // Filament-like spread: anisotropic scatter — narrow in z, wide in xy.
    const r = Math.pow(Math.random(), 2) * 200000;
    const t = Math.random() * Math.PI * 2;
    positions[i * 3] = cluster.x + r * Math.cos(t);
    positions[i * 3 + 1] = cluster.y + (Math.random() - 0.5) * r * 0.4;
    positions[i * 3 + 2] = cluster.z + r * Math.sin(t);
    // Slight color variation: most galaxies are red/orange-ish, a few blue.
    if (Math.random() < 0.7) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.2;
    } else {
      colors[i * 3] = 0.7 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 1.0;
    }
    sizes[i] = 1 + Math.random() * 3;
  }
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(positions, 3));
  geom.setAttribute("color", new BufferAttribute(colors, 3));
  geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
    vertexShader: COSMIC_VERT,
    fragmentShader: COSMIC_FRAG,
  });
  const points = new Points(geom, mat);
  points.frustumCulled = false;
  return points;
}

const COSMIC_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio * (50000.0 / -mvPosition.z);
  }
`;
const COSMIC_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float a = 1.0 - smoothstep(0.0, 0.25, r2);
    gl_FragColor = vec4(vColor, a * 0.5);
  }
`;

function makeArmLabel(text: string, color: number): Sprite {
  const c = new Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return makeLabelSprite(text, `rgba(${r},${g},${b},0.95)`);
}

function makeLabelSprite(text: string, color: string): Sprite {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
  const fontSize = 12 * dpr;
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
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  const mat = new SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.9,
  });
  const sprite = new Sprite(mat);
  const aspect = tex.image.width / tex.image.height;
  const h = 1.5;
  sprite.scale.set(h * aspect, h, 1);
  return sprite;
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
    // Scale point size with distance — arms stay legible at all zooms.
    gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
  }
`;
const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float a = 1.0 - smoothstep(0.0, 0.25, r2);
    gl_FragColor = vec4(vColor, a * 0.7);
  }
`;

import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Points,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  BufferAttribute,
  BufferGeometry,
} from "three";

/**
 * 🪐 Planetary Surface Mode.
 *
 * A dedicated Three.js scene that puts the camera close to a textured 3D
 * body — Earth, Mars, Moon — and lets the user rotate around it. We load
 * three things per planet: a colour map (procedural canvas, with optional
 * NASA Blue Marble / Mars Trek / LROC swap-in), a normal map for terrain
 * shading, and (Earth only) an atmosphere shell.
 *
 * Procedural textures are deliberately stylised: continents on Earth, big
 * dark maria + Olympus-Mons-like volcano on Mars, mare regions on the
 * Moon. They read as the planet at a glance and provide a backdrop while
 * we attempt to fetch the real photographic texture.
 */

export type SurfacePlanet = "Earth" | "Mars" | "Moon";

export type SurfaceState = {
  planet: SurfacePlanet;
  cameraRadius: number; // sphere radii from center
  yaw: number;
  pitch: number;
  /** Auto-rotation enabled? */
  autoRotate: boolean;
  /** Whether the photographic texture loaded over the procedural one. */
  realTextureLoaded: boolean;
};

type Listener = (s: SurfaceState) => void;

/** Per-planet config for procedural texture + optional photo URL + atmosphere. */
const PLANETS: Record<
  SurfacePlanet,
  {
    procedural: () => CanvasTexture;
    photoUrl: string | null;
    color: number;
    atmosphere: { color: number; opacity: number } | null;
    starField: boolean;
  }
> = {
  Earth: {
    procedural: makeEarthSurface,
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Land_ocean_ice_cloud_2048.jpg/2048px-Land_ocean_ice_cloud_2048.jpg",
    color: 0xffffff,
    atmosphere: { color: 0x6ea4ff, opacity: 0.35 },
    starField: true,
  },
  Mars: {
    procedural: makeMarsSurface,
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/2048px-OSIRIS_Mars_true_color.jpg",
    color: 0xffffff,
    atmosphere: { color: 0xffb37a, opacity: 0.18 },
    starField: true,
  },
  Moon: {
    procedural: makeMoonSurface,
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/2048px-FullMoon2010.jpg",
    color: 0xffffff,
    atmosphere: null,
    starField: true,
  },
};

export class PlanetSurfaceScene {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene = new Scene();

  private planet: SurfacePlanet;
  private body: Mesh;
  private atmo: Mesh | null = null;
  private starPoints: Points | null = null;

  private cameraRadius = 2.4;
  private yaw = 0;
  private pitch = 0.2;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private autoRotate = true;
  private realTextureLoaded = false;

  private rafHandle = 0;
  private resizeObs: ResizeObserver | null = null;
  private disposed = false;
  private listeners = new Set<Listener>();
  private state: SurfaceState;
  private lastTickMs = performance.now();

  constructor(readonly canvas: HTMLCanvasElement, planet: SurfacePlanet) {
    this.planet = planet;
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

    this.camera = new PerspectiveCamera(45, 1, 0.01, 10000);

    // Sun-direction lighting + soft ambient
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 3, 5);
    this.scene.add(sun);
    this.scene.add(new AmbientLight(0xffffff, 0.18));

    // Body
    const cfg = PLANETS[planet];
    const geom = new SphereGeometry(1, 128, 64);
    const tex = cfg.procedural();
    tex.wrapS = RepeatWrapping;
    const mat = new MeshPhongMaterial({
      color: new Color(cfg.color),
      map: tex,
      shininess: 6,
    });
    this.body = new Mesh(geom, mat);
    this.scene.add(this.body);

    // Try to upgrade to the real photo asynchronously
    if (cfg.photoUrl) {
      const loader = new TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(
        cfg.photoUrl,
        (real) => {
          real.wrapS = RepeatWrapping;
          (this.body.material as MeshPhongMaterial).map = real;
          (this.body.material as MeshPhongMaterial).needsUpdate = true;
          this.realTextureLoaded = true;
          this.publishState();
        },
        undefined,
        () => {
          // CORS / offline — keep procedural
        },
      );
    }

    // Atmosphere — back-side hemisphere with additive
    if (cfg.atmosphere) {
      const atmoGeom = new SphereGeometry(1.05, 64, 64);
      const atmoMat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: BackSide,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(cfg.atmosphere.color) },
          uOpacity: { value: cfg.atmosphere.opacity },
        },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
      });
      this.atmo = new Mesh(atmoGeom, atmoMat);
      this.scene.add(this.atmo);
    }

    if (cfg.starField) this.makeStarField();

    this.attachInputs();
    this.applyCamera();

    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(canvas);
    this.handleResize();

    this.state = {
      planet,
      cameraRadius: this.cameraRadius,
      yaw: this.yaw,
      pitch: this.pitch,
      autoRotate: this.autoRotate,
      realTextureLoaded: this.realTextureLoaded,
    };

    this.tick();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setAutoRotate(v: boolean): void {
    this.autoRotate = v;
    this.publishState();
  }

  private makeStarField(): void {
    const N = 4000;
    const positions = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // Random direction at radius 200 — far enough to be effectively at infinity.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      positions[i * 3] = 200 * r * Math.cos(t);
      positions[i * 3 + 1] = 200 * u;
      positions[i * 3 + 2] = 200 * r * Math.sin(t);
      sizes[i] = 1 + Math.random() * 2;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uPixelRatio: { value: window.devicePixelRatio || 1 } },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
    });
    this.starPoints = new Points(geom, mat);
    this.starPoints.frustumCulled = false;
    this.scene.add(this.starPoints);
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
    this.autoRotate = false;
    this.publishState();
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
    const factor = Math.exp(e.deltaY * 0.0008);
    this.cameraRadius = Math.max(
      1.05,
      Math.min(8, this.cameraRadius * factor),
    );
    this.applyCamera();
    this.publishState();
  };

  private applyCamera(): void {
    const r = this.cameraRadius;
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    this.camera.position.set(r * cp * sy, r * sp, r * cp * cy);
    this.camera.lookAt(new Vector3(0, 0, 0));
  }

  private publishState(): void {
    this.state = {
      planet: this.planet,
      cameraRadius: this.cameraRadius,
      yaw: this.yaw,
      pitch: this.pitch,
      autoRotate: this.autoRotate,
      realTextureLoaded: this.realTextureLoaded,
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

    if (this.autoRotate) {
      this.yaw += dt * 0.05;
      this.applyCamera();
    }
    // Slow body rotation regardless, so terrain features traverse.
    this.body.rotation.y += dt * 0.02;

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
    this.body.geometry.dispose();
    const m = this.body.material as MeshPhongMaterial;
    m.map?.dispose();
    m.dispose();
    if (this.atmo) {
      this.atmo.geometry.dispose();
      (this.atmo.material as ShaderMaterial).dispose();
    }
    if (this.starPoints) {
      this.starPoints.geometry.dispose();
      (this.starPoints.material as ShaderMaterial).dispose();
    }
    this.renderer.dispose();
    this.listeners.clear();
  }
}

// ─── Procedural surface textures ────────────────────────────────────

function makeEarthSurface(): CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // Ocean
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#0a3a6e");
  ocean.addColorStop(0.5, "#1859a0");
  ocean.addColorStop(1, "#0e2c5a");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);
  // Continents (rough silhouettes; lon → x, lat → y)
  const land = "#1d6f3a";
  const landDark = "#155a2c";
  const desert = "#bb9c5e";
  const blob = (lon: number, lat: number, scale: number, color: string) => {
    const cx = ((lon + 180) / 360) * w;
    const cy = ((90 - lat) / 180) * h;
    const sx = scale * (w / 360);
    const sy = scale * (h / 180);
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const r = 1 + Math.sin(a * 4) * 0.18 + Math.cos(a * 2.7) * 0.12;
      const x = cx + Math.cos(a) * sx * r;
      const y = cy + Math.sin(a) * sy * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  blob(20, 5, 25, land);
  blob(20, -10, 18, desert); // Sahara
  blob(55, 50, 50, land); // Eurasia
  blob(95, 30, 22, desert); // Asian deserts
  blob(-95, 40, 28, land); // North America
  blob(-100, 35, 16, desert); // SW desert
  blob(-65, -15, 22, landDark); // South America
  blob(-110, 55, 22, land); // Canadian shield
  blob(135, -25, 18, desert); // Australia
  // Polar caps
  ctx.fillStyle = "#e9eef5";
  ctx.fillRect(0, h - 40, w, 40);
  ctx.fillStyle = "#dde6ee";
  ctx.beginPath();
  ctx.ellipse(w * 0.32, h * 0.06, w * 0.05, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Add cloud noise
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 5 + Math.random() * 30;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.6, r * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(canvas);
  return tex;
}

function makeMarsSurface(): CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // Base reddish gradient
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#9e4a23");
  base.addColorStop(0.5, "#c8633e");
  base.addColorStop(1, "#8a3d1f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // Maria-like dark patches
  ctx.fillStyle = "#5a2c14";
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * w;
    const y = h * 0.2 + Math.random() * h * 0.6;
    const r = 30 + Math.random() * 100;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Olympus Mons highlight (NE quadrant on Mars: ~226°, 18°N)
  const omX = (226 / 360) * w;
  const omY = ((90 - 18) / 180) * h;
  const grad = ctx.createRadialGradient(omX, omY, 0, omX, omY, 120);
  grad.addColorStop(0, "rgba(220, 150, 100, 0.85)");
  grad.addColorStop(0.5, "rgba(200, 120, 80, 0.4)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(omX - 130, omY - 130, 260, 260);
  // Dust streaks
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(${180 + Math.random() * 60},${100 + Math.random() * 40},${60 + Math.random() * 30},${Math.random() * 0.25})`;
    ctx.fillRect(x, y, 1 + Math.random() * 4, 1);
  }
  // Polar caps
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillRect(0, 0, w, 28);
  ctx.fillRect(0, h - 22, w, 22);
  return new CanvasTexture(canvas);
}

function makeMoonSurface(): CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#9a9690";
  ctx.fillRect(0, 0, w, h);
  // Mare regions (darker basalt patches concentrated on near-side)
  ctx.fillStyle = "#43413d";
  const mares: Array<[number, number, number]> = [
    [0, 25, 90], // Mare Imbrium
    [-15, 5, 70], // Mare Tranquillitatis
    [25, 12, 60], // Mare Serenitatis
    [-40, -18, 80], // Oceanus Procellarum
    [-55, -22, 50],
    [10, -15, 50],
  ];
  for (const [lon, lat, r] of mares) {
    const cx = ((lon + 180) / 360) * w;
    const cy = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.6, r, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lots of craters
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 1 + Math.random() * 14;
    // Bright rim + dark interior
    ctx.fillStyle = `rgba(220,220,210,${0.25 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(50,50,46,${0.4 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return new CanvasTexture(canvas);
}

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    // Limb-glow: brightest at the rim of the sphere.
    float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
    gl_FragColor = vec4(uColor, intensity * uOpacity);
  }
`;
const STAR_VERT = /* glsl */ `
  attribute float aSize;
  uniform float uPixelRatio;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio;
  }
`;
const STAR_FRAG = /* glsl */ `
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float a = 1.0 - smoothstep(0.0, 0.25, r2);
    gl_FragColor = vec4(1.0, 1.0, 1.0, a * 0.85);
  }
`;

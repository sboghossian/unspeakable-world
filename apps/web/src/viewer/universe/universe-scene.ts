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
  PlaneGeometry,
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
import { Body, HelioVector } from "astronomy-engine";
import { Raycaster, Vector2 } from "three";
import { HipsSphere } from "../scene/hips-sphere";
import { SURVEYS, type Survey } from "../hips/surveys";
import { ConstellationLines } from "../constellations/constellation-lines";
import { CoordGrid } from "../scene/coord-grid";
import { PulsarField } from "../cosmic/pulsar-field";
import { ExoplanetField } from "../exoplanets/exoplanet-field";
import { CosmicLandmarks } from "../cosmic/cosmic-landmarks";
import { StarLabels } from "../stars/star-labels";
import { BODY_INFO, bodyFactsToPayload } from "../data/body-info";
import type { InfoPayload } from "../ui/InfoPanel";
import {
  AsteroidField,
  CometField,
  InterstellarMarkers,
  type InterstellarRecord,
} from "./asteroids";

/**
 * 🌌 Universe Mode — single seamless scene across scales.
 *
 * Two coordinate frames live in the same Scene:
 *   - Galactic group (1 unit = 1 light-year)
 *   - Solar group (1 unit = 1 AU)
 *
 * Camera position is tracked in galactic units. Each tick we translate
 * both groups so whichever feature is closest to the camera sits near
 * world-origin (0,0,0) — float32 precision stays accurate. Layer
 * visibility cross-fades based on camera distance from the Sun.
 *
 * Float precision math:
 *   - 1 AU ≈ 1.58e-5 LY
 *   - Sun is at (26000, 0, 0) LY = (26000 * 63241, 0, 0) AU = 1.64e9 AU
 *   - We never put 1 AU and 26000 LY in the same coordinate. Solar
 *     group anchors at the Sun's position, expressed via
 *     `solarGroup.position = (cameraLY - SUN_LY) * 63241` so cameraAU
 *     stays near zero.
 */

const AU_PER_LY = 63241.077;
const SUN_LY = new Vector3(26000, 0, 0);


const PLANETS: Array<{
  body: Body;
  name: string;
  color: number;
  drawSize: number; // AU
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

export type UniverseState = {
  cameraLogicalPos: { x: number; y: number; z: number };
  /** Distance from Sun in LY. Drives the visibility ramp. */
  distFromSunLY: number;
  /** Camera speed (LY/sec). */
  speedLY: number;
  yaw: number;
  pitch: number;
  /** Auto-detected scale region. */
  scaleLabel: string;
  /** Sim time. */
  time: Date;
  /** Active tier (which group dominates). */
  tier: "Solar" | "Stellar" | "Galactic" | "Cosmic";
  /** HiPS sky-tile background visible? (true at near-Earth scales). */
  skyTilesVisible: boolean;
  /** HiPS overlay survey id ("halpha", "2mass", "allwise", "galex", "integral", "nvss", "fermi", or null). */
  overlayId: string | null;
  /** HiPS overlay cross-fade [0..1]. */
  overlayMix: number;
  /** Sky-layer toggles (visible only in Solar tier). */
  constellationsOn: boolean;
  coordGridOn: boolean;
  starLabelsOn: boolean;
  pulsarsOn: boolean;
  exoplanetsOn: boolean;
  cosmicLandmarksOn: boolean;
  /** Time playback. */
  playing: boolean;
  /** Time rate (sim seconds per wall second). */
  rate: number;
  asteroidsOn: boolean;
  cometsOn: boolean;
  interstellarOn: boolean;
};

type Listener = (s: UniverseState) => void;

export type UniverseHit = {
  kind: "Sun" | "Planet" | "Landmark" | "Star";
  name: string;
  detail: string;
  facts?: Array<{ label: string; value: string }>;
  wikipedia?: string;
  /** Unified inspector payload — preferred path for the new InfoPanel. */
  payload: InfoPayload;
};

type PlanetMesh = {
  name: string;
  body: Body;
  group: Group; // sphere + label, positioned in AU
  sphere: Mesh;
  label: Sprite;
};

export class UniverseScene {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene = new Scene();

  // Three coordinate frames, each anchored so the camera stays at world (0,0,0):
  //   - solarGroup: 1 unit = 1 AU, recentered on the Sun-relative offset
  //   - galacticGroup: 1 unit = 1 LY, recentered on the camera's logical pos
  //   - hipsGroup: HiPS sky-tile celestial sphere (skybox, follows camera)
  private solarGroup = new Group();
  private galacticGroup = new Group();
  private hipsGroup = new Group();
  private hipsSphere: HipsSphere;
  private hipsOverlay: HipsSphere | null = null;
  private hipsOverlayId: string | null = null;
  private hipsOverlayMix = 0;

  // Sky-overlay layers — all live in hipsGroup so they share the
  // skybox-follows-camera transform and scale together.
  private constellations: ConstellationLines;
  private coordGrid: CoordGrid;
  private starLabels: StarLabels;
  private pulsars: PulsarField;
  private exoplanets: ExoplanetField;
  private cosmicLandmarks: CosmicLandmarks;

  // Solar small-body layers (live in solarGroup, AU units).
  private asteroids: AsteroidField | null = null;
  private comets: CometField | null = null;
  private interstellar: InterstellarMarkers | null = null;

  // Solar contents
  private sunMesh: Mesh;
  private sunGlow: Sprite;
  private planets: PlanetMesh[] = [];
  private orbitLoops: LineLoop[] = [];
  private solarOpacityMaterials: Array<{ opacity?: number; uniforms?: Record<string, { value: number }> }> = [];

  // Galactic contents
  private galaxyDisk: Mesh;
  private galaxyBulge: Mesh;
  private armPoints: Points;
  private cosmicWebPoints: Points;
  private galacticLabels: Sprite[] = [];
  private armLabels: Sprite[] = [];

  // Camera state — logicalPos in LY (galactic-unit absolute). Default view
  // is a tilted overhead of the inner solar system (~5 AU above the
  // ecliptic, looking down at the Sun) so that Mercury → Saturn and their
  // drawn orbits are all visible on first paint.
  private logicalPos = new Vector3(
    SUN_LY.x + 0.5 / AU_PER_LY, // ~0.5 AU offset to give the Sun some parallax
    5 / AU_PER_LY, // 5 AU above the plane
    SUN_LY.z + 5 / AU_PER_LY, // 5 AU back along z
  );
  private yaw = Math.PI;
  private pitch = -0.55; // tilt down toward the ecliptic (~31°)
  private speed = 0.25 / AU_PER_LY; // ~0.25 AU/s — comfortable for inner SS
  private heldKeys = new Set<string>();
  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragMaxDist = 0;
  private lastX = 0;
  private lastY = 0;
  private raycaster = new Raycaster();

  // Time
  private simTime = new Date();
  private playing = true;
  private timeRate = 86400; // 1 day per second by default
  private lastWallClock = performance.now();

  // Lifecycle
  private rafHandle = 0;
  private resizeObs: ResizeObserver | null = null;
  private disposed = false;
  private lastTickMs = performance.now();
  private listeners = new Set<Listener>();
  private state: UniverseState;

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

    // Wide near/far range — logDepth gives us precision across scales.
    this.camera = new PerspectiveCamera(60, 1, 1e-6, 1e10);
    this.camera.position.set(0, 0, 0); // camera always at world origin

    this.scene.add(this.solarGroup);
    this.scene.add(this.galacticGroup);

    // ─── HiPS celestial-sphere background (skybox, follows camera) ─
    // Scaled up so it sits well behind the solar planets but still
    // inside the camera far plane. logDepthBuffer keeps z-precision.
    this.hipsSphere = new HipsSphere(SURVEYS.dss2!);
    this.hipsGroup.add(this.hipsSphere.group);

    // Sky-overlay layers — same skybox transform.
    this.constellations = new ConstellationLines();
    this.hipsGroup.add(this.constellations.group);
    void this.constellations
      .load("/data/constellations.lines.json")
      .catch((err) => console.warn("[constellations] load", err));

    this.coordGrid = new CoordGrid();
    this.hipsGroup.add(this.coordGrid.group);

    this.starLabels = new StarLabels();
    this.hipsGroup.add(this.starLabels.group);
    void this.starLabels
      .load("/data/hyg-named.json")
      .catch((err) => console.warn("[star-labels] load", err));

    this.pulsars = new PulsarField();
    this.hipsGroup.add(this.pulsars.group);
    void this.pulsars
      .load("/data/pulsars.json")
      .catch((err) => console.warn("[pulsars] load", err));

    this.exoplanets = new ExoplanetField();
    this.hipsGroup.add(this.exoplanets.group);
    void this.exoplanets
      .load("/data/exoplanets.json")
      .catch((err) => console.warn("[exoplanets] load", err));

    this.cosmicLandmarks = new CosmicLandmarks();
    this.hipsGroup.add(this.cosmicLandmarks.group);

    this.hipsGroup.scale.setScalar(2000); // 2000 scene-unit radius
    this.scene.add(this.hipsGroup);

    // ─── Solar group ───────────────────────────────────────────
    const sunGeom = new SphereGeometry(0.35, 32, 32); // 0.35 AU
    const sunMat = new MeshBasicMaterial({ color: 0xffeb91 });
    this.sunMesh = new Mesh(sunGeom, sunMat);
    this.solarGroup.add(this.sunMesh);

    this.sunGlow = makeGlowSprite(0xffd06a, 2.1);
    this.solarGroup.add(this.sunGlow);

    void this.buildPlanetsAndOrbits();
    void this.loadSmallBodies();

    // ─── Galactic group ────────────────────────────────────────
    const galaxyTex = makeGalaxyTexture();
    const diskMat = new MeshBasicMaterial({
      map: galaxyTex,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      opacity: 0.0,
    });
    const diskGeom = new PlaneGeometry(110_000, 110_000); // 110 kly, in LY units
    this.galaxyDisk = new Mesh(diskGeom, diskMat);
    this.galaxyDisk.rotation.x = -Math.PI / 2;
    this.galacticGroup.add(this.galaxyDisk);
    this.solarOpacityMaterials.push(diskMat);

    // Bulge
    const bulgeGeom = new SphereGeometry(3000, 32, 32); // 3 kly
    const bulgeMat = new MeshBasicMaterial({
      color: 0xfff0c0,
      transparent: true,
      opacity: 0.0,
    });
    this.galaxyBulge = new Mesh(bulgeGeom, bulgeMat);
    this.galacticGroup.add(this.galaxyBulge);

    this.armPoints = makeArmPoints();
    this.galacticGroup.add(this.armPoints);

    this.cosmicWebPoints = makeCosmicWebPoints();
    this.galacticGroup.add(this.cosmicWebPoints);

    // Galactic labels (LY positions, will be visible based on distance).
    addGalacticLabels(this.galacticLabels, this.galacticGroup);
    addArmLabels(this.armLabels, this.galacticGroup);

    this.attachInputs();

    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(canvas);
    this.handleResize();

    this.state = this.computeState();
    this.tick();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
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

  setTime(t: Date): void {
    this.simTime = new Date(t.getTime());
    this.publishState();
  }

  /** Switch the HiPS overlay survey (or null to clear). */
  setOverlay(surveyId: string | null): void {
    if (surveyId === null) {
      if (this.hipsOverlay) {
        this.hipsGroup.remove(this.hipsOverlay.group);
        this.hipsOverlay.dispose();
        this.hipsOverlay = null;
      }
      this.hipsOverlayId = null;
      this.hipsOverlayMix = 0;
      this.publishState();
      return;
    }
    const survey: Survey | undefined = SURVEYS[surveyId];
    if (!survey) return;
    if (!this.hipsOverlay) {
      this.hipsOverlay = new HipsSphere(survey, 5);
      this.hipsGroup.add(this.hipsOverlay.group);
      this.hipsOverlayMix = 0.6;
    } else {
      this.hipsOverlay.setSurvey(survey);
    }
    this.hipsOverlayId = surveyId;
    this.hipsOverlay.setOpacity(this.hipsOverlayMix);
    this.publishState();
  }

  setOverlayMix(mix: number): void {
    this.hipsOverlayMix = Math.max(0, Math.min(1, mix));
    if (this.hipsOverlay) this.hipsOverlay.setOpacity(this.hipsOverlayMix);
    this.publishState();
  }

  setConstellations(on: boolean): void {
    this.constellations.setVisible(on);
    this.publishState();
  }

  setCoordGrid(on: boolean): void {
    this.coordGrid.setVisible(on);
    this.publishState();
  }

  setStarLabels(on: boolean): void {
    this.starLabels.setVisible(on);
    this.publishState();
  }

  setPulsars(on: boolean): void {
    this.pulsars.setVisible(on);
    this.publishState();
  }

  setExoplanets(on: boolean): void {
    this.exoplanets.setVisible(on);
    this.publishState();
  }

  setCosmicLandmarks(on: boolean): void {
    this.cosmicLandmarks.setVisible(on);
    this.publishState();
  }

  setAsteroids(on: boolean): void {
    if (this.asteroids) this.asteroids.visible = on;
    this.publishState();
  }

  setComets(on: boolean): void {
    if (this.comets) this.comets.visible = on;
    this.publishState();
  }

  setInterstellar(on: boolean): void {
    if (this.interstellar) this.interstellar.visible = on;
    this.publishState();
  }

  private async loadSmallBodies(): Promise<void> {
    // Asteroids
    try {
      const res = await fetch("/data/asteroids.bin");
      if (res.ok) {
        const buf = await res.arrayBuffer();
        this.asteroids = new AsteroidField(buf, this.simTime);
        this.solarGroup.add(this.asteroids);
      }
    } catch (err) {
      console.warn("[asteroids] load", err);
    }
    // Comets
    try {
      const res = await fetch("/data/comets.bin");
      if (res.ok) {
        const buf = await res.arrayBuffer();
        this.comets = new CometField(buf, this.simTime);
        this.solarGroup.add(this.comets);
      }
    } catch (err) {
      console.warn("[comets] load", err);
    }
    // Interstellar
    try {
      const res = await fetch("/data/interstellar.json");
      if (res.ok) {
        const items = (await res.json()) as InterstellarRecord[];
        this.interstellar = new InterstellarMarkers(items);
        this.solarGroup.add(this.interstellar);
      }
    } catch (err) {
      console.warn("[interstellar] load", err);
    }
    this.publishState();
  }

  /** Jump to a named target, choosing a sensible camera offset. */
  flyTo(target: string): void {
    let pos: Vector3;
    let speed: number;
    switch (target) {
      case "Sun":
        // Overhead inner-solar-system view, like AstroGrid's default.
        pos = SUN_LY.clone().add(
          new Vector3(0.5 / AU_PER_LY, 5 / AU_PER_LY, 5 / AU_PER_LY),
        );
        speed = 0.25 / AU_PER_LY;
        break;
      case "Galactic Center":
        pos = new Vector3(8, 4, 8); // 8 LY from GC, slightly above plane
        speed = 0.02;
        break;
      case "M31":
        pos = new Vector3(2_540_000, 0, 0); // 2.54 Mly
        speed = 5;
        break;
      case "Local Group":
        pos = new Vector3(1_000_000, 0, 0); // 1 Mly out
        speed = 5;
        break;
      case "Mercury":
      case "Venus":
      case "Earth":
      case "Mars":
      case "Jupiter":
      case "Saturn":
      case "Uranus":
      case "Neptune": {
        // Place the camera just outside this planet at its current AU
        // position, expressed in LY.
        const planet = PLANETS.find((p) => p.name === target);
        if (!planet) {
          pos = SUN_LY.clone();
          speed = 1e-5;
          break;
        }
        try {
          const v = HelioVector(planet.body, this.simTime);
          const auOffset = new Vector3(v.x, v.z, -v.y);
          const lyOffset = auOffset.clone().multiplyScalar(1 / AU_PER_LY);
          pos = SUN_LY.clone().add(lyOffset);
          // Pull camera back along the radial-out direction by 5 planet-radii
          // (in AU), converted to LY.
          const back = lyOffset
            .clone()
            .normalize()
            .multiplyScalar((planet.drawSize * 6) / AU_PER_LY);
          pos.add(back);
          speed = 1e-6;
        } catch {
          pos = SUN_LY.clone();
          speed = 1e-5;
        }
        break;
      }
      default:
        pos = SUN_LY.clone();
        speed = 1e-5;
    }
    this.logicalPos.copy(pos);
    this.speed = speed;
    // Aim camera back toward Sun (or origin for galactic targets).
    const aimAt = target === "Sun" || target.startsWith("M") || target === "Galactic Center" || target === "Local Group"
      ? (target === "Galactic Center" ? new Vector3(0, 0, 0) : SUN_LY.clone())
      : SUN_LY.clone();
    const fwd = aimAt.clone().sub(pos).normalize();
    this.yaw = Math.atan2(fwd.x, fwd.z);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
    this.publishState();
  }

  private async buildPlanetsAndOrbits(): Promise<void> {
    for (const spec of PLANETS) {
      const group = new Group();
      const geom = new SphereGeometry(spec.drawSize, 24, 24);
      const mat = new MeshBasicMaterial({ color: spec.color });
      const sphere = new Mesh(geom, mat);
      group.add(sphere);

      if (spec.name === "Earth") {
        const atmoGeom = new SphereGeometry(spec.drawSize * 1.22, 32, 32);
        const atmoMat = new MeshBasicMaterial({
          color: 0x6ea4ff,
          transparent: true,
          opacity: 0.32,
          side: BackSide,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        const atmo = new Mesh(atmoGeom, atmoMat);
        group.add(atmo);
      }
      if (spec.name === "Saturn") {
        const ringInner = spec.drawSize * 1.4;
        const ringOuter = spec.drawSize * 2.4;
        const ringGeom = new RingGeometry(ringInner, ringOuter, 96);
        const ringMat = new MeshBasicMaterial({
          color: 0xffe1a3,
          transparent: true,
          opacity: 0.85,
          side: DoubleSide,
          depthWrite: false,
        });
        const ring = new Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2 - 0.466;
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

      this.solarGroup.add(group);
      this.planets.push({
        name: spec.name,
        body: spec.body,
        group,
        sphere,
        label,
      });

      // Orbit loop in solar group (AU units)
      const periodDays = PERIOD_DAYS[spec.name] ?? 365.256;
      const positions: number[] = [];
      const SAMPLES = 256;
      for (let i = 0; i < SAMPLES; i++) {
        const t = new Date(
          this.simTime.getTime() +
            (i / SAMPLES) * periodDays * 86400 * 1000,
        );
        try {
          const v = HelioVector(spec.body, t);
          positions.push(v.x, v.z, -v.y);
        } catch {
          // skip
        }
      }
      const orbitGeom = new BufferGeometry();
      orbitGeom.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(positions), 3),
      );
      const orbitMat = new LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.45,
      });
      const loop = new LineLoop(orbitGeom, orbitMat);
      this.solarGroup.add(loop);
      this.orbitLoops.push(loop);
    }
    this.updatePlanets();
  }

  private updatePlanets(): void {
    for (const p of this.planets) {
      try {
        const v = HelioVector(p.body, this.simTime);
        p.group.position.set(v.x, v.z, -v.y);
      } catch {
        // ignore
      }
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
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragMaxDist = 0;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.style.cursor = "grabbing";
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const total = Math.hypot(
      e.clientX - this.dragStart.x,
      e.clientY - this.dragStart.y,
    );
    if (total > this.dragMaxDist) this.dragMaxDist = total;
    this.yaw -= dx * 0.005;
    this.pitch = Math.max(
      -Math.PI / 2 + 0.05,
      Math.min(Math.PI / 2 - 0.05, this.pitch - dy * 0.005),
    );
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
    // True click (not a drag) → pick.
    if (this.dragMaxDist < 4 && this.onClickCb) {
      const rect = this.canvas.getBoundingClientRect();
      const ndc = new Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const hit = this.pick(ndc);
      if (hit) this.onClickCb(hit);
    }
  };

  private onClickCb: ((hit: UniverseHit) => void) | null = null;
  setOnClick(cb: (hit: UniverseHit) => void): void {
    this.onClickCb = cb;
  }

  /** Raycast against planets, sun, and labelled landmarks. Returns the
   *  closest hit + its inspectable metadata, or null. */
  private pick(ndc: Vector2): UniverseHit | null {
    this.raycaster.setFromCamera(ndc, this.camera);

    const candidates: Array<{
      kind: UniverseHit["kind"];
      name: string;
      distance: number;
      detail: string;
      facts?: UniverseHit["facts"];
      wikipedia?: string;
    }> = [];

    // Sun
    const sunHits = this.raycaster.intersectObject(this.sunMesh, false);
    if (sunHits[0]) {
      const info = BODY_INFO["Sun"]!;
      candidates.push({
        kind: "Sun",
        name: "Sun",
        distance: sunHits[0].distance,
        detail: info.detail,
        facts: info.facts,
        wikipedia: info.wikipedia,
      });
    }
    // Planets
    for (const p of this.planets) {
      const hits = this.raycaster.intersectObject(p.sphere, false);
      if (hits[0]) {
        const info = BODY_INFO[p.name];
        candidates.push({
          kind: "Planet",
          name: p.name,
          distance: hits[0].distance,
          detail: info?.detail ?? `${p.name} · solar-system body`,
          facts: info?.facts,
          wikipedia: info?.wikipedia,
        });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const top = candidates[0];
    if (!top) return null;
    const facts = BODY_INFO[top.name];
    const payload: InfoPayload = facts
      ? bodyFactsToPayload(top.name, top.kind === "Sun" ? "Sun" : "Planet", facts)
      : {
          kind: top.kind === "Sun" ? "Sun" : "Planet",
          name: top.name,
          sections: [{ kind: "overview", text: top.detail }],
        };
    return {
      kind: top.kind,
      name: top.name,
      detail: top.detail,
      facts: top.facts,
      wikipedia: top.wikipedia,
      payload,
    };
  }
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    // Dolly toward / away from the Sun (or galactic origin if outside the
    // solar system) by a fraction of the current radial distance. Step is
    // scale-invariant so the same wheel notch feels right at every zoom
    // level. Shift = fine zoom (10× slower); Ctrl/Cmd = adjust WASD speed.
    if (e.ctrlKey || e.metaKey) {
      const factor = Math.exp(-e.deltaY * 0.0008);
      this.speed = Math.max(1e-9, Math.min(1e6, this.speed * factor));
      this.publishState();
      return;
    }
    const distLY = this.logicalPos.distanceTo(SUN_LY);
    const anchor = distLY < 1 ? SUN_LY : new Vector3(0, 0, 0);
    const dir = this.logicalPos.clone().sub(anchor);
    const r = dir.length();
    if (r < 1e-12) return;
    const fine = e.shiftKey ? 0.15 : 1;
    // ≈ 8 % per natural wheel notch (deltaY 100); shift = ~1.2 %.
    const factor = Math.exp(e.deltaY * 0.0008 * fine);
    // Don't let the user dolly inside the anchor body.
    const minR = anchor === SUN_LY ? 0.005 / AU_PER_LY : 1e-6;
    const maxR = 5e10;
    const newR = Math.max(minR, Math.min(maxR, r * factor));
    dir.multiplyScalar(newR / r);
    this.logicalPos.copy(anchor).add(dir);
    // Aim the camera at the anchor so dolly always feels like an orbit-zoom.
    const fwd = anchor.clone().sub(this.logicalPos).normalize();
    this.yaw = Math.atan2(fwd.x, fwd.z);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
    // Keep WASD speed roughly proportional to the distance from anchor so
    // the user can fly comfortably without manually adjusting.
    this.speed = Math.max(1e-9, newR * 0.05);
    this.publishState();
  };
  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
    this.heldKeys.add(e.key.toLowerCase());
    if (e.key === "`") {
      this.flyTo("Sun");
      return;
    }
    if (e.key === "b" || e.key === "B") {
      this.flyTo("Galactic Center");
      return;
    }
    if (e.key === "n" || e.key === "N") {
      this.flyTo("M31");
      return;
    }
    const n = parseInt(e.key, 10);
    if (!isNaN(n) && n >= 1 && n <= 8) {
      const planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
      this.flyTo(planets[n - 1]!);
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.key.toLowerCase());
  };

  private forwardVec(): Vector3 {
    return new Vector3(
      Math.cos(this.pitch) * Math.sin(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.cos(this.yaw),
    );
  }

  private rightVec(forward: Vector3): Vector3 {
    return new Vector3(forward.z, 0, -forward.x).normalize();
  }

  private scaleLabel(distLY: number): string {
    if (distLY < 1.5e-5) return "Earth Vicinity"; // < 1 AU
    if (distLY < 1e-3) return "Inner Solar System"; // < ~63 AU
    if (distLY < 0.005) return "Outer Solar System"; // < 316 AU
    if (distLY < 1) return "Heliopause / Local Bubble";
    if (distLY < 100) return "Local Stars";
    if (distLY < 1000) return "Galactic Disk";
    if (distLY < 50_000) return "Whole Milky Way";
    if (distLY < 500_000) return "Local Group";
    if (distLY < 50_000_000) return "Nearby Galaxies";
    if (distLY < 500_000_000) return "Supercluster Region";
    return "Cosmic Web";
  }

  private detectTier(distLY: number): UniverseState["tier"] {
    if (distLY < 0.001) return "Solar";
    if (distLY < 1000) return "Stellar";
    if (distLY < 5_000_000) return "Galactic";
    return "Cosmic";
  }

  private computeState(): UniverseState {
    const distLY = this.logicalPos.distanceTo(SUN_LY);
    return {
      cameraLogicalPos: {
        x: this.logicalPos.x,
        y: this.logicalPos.y,
        z: this.logicalPos.z,
      },
      distFromSunLY: distLY,
      speedLY: this.speed,
      yaw: this.yaw,
      pitch: this.pitch,
      scaleLabel: this.scaleLabel(distLY),
      time: this.simTime,
      tier: this.detectTier(distLY),
      skyTilesVisible: this.hipsGroup.visible,
      overlayId: this.hipsOverlayId,
      overlayMix: this.hipsOverlayMix,
      constellationsOn: this.constellations.group.visible,
      coordGridOn: this.coordGrid.group.visible,
      starLabelsOn: this.starLabels.group.visible,
      pulsarsOn: this.pulsars.visible(),
      exoplanetsOn: this.exoplanets.visible(),
      cosmicLandmarksOn: this.cosmicLandmarks.visible(),
      playing: this.playing,
      rate: this.timeRate,
      asteroidsOn: this.asteroids?.visible ?? false,
      cometsOn: this.comets?.visible ?? false,
      interstellarOn: this.interstellar?.visible ?? false,
    };
  }

  private publishState(): void {
    this.state = this.computeState();
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

    // Time advance
    if (this.playing) {
      const elapsedMs = now - this.lastWallClock;
      this.lastWallClock = now;
      const simElapsedMs = elapsedMs * this.timeRate;
      this.simTime = new Date(this.simTime.getTime() + simElapsedMs);
      this.updatePlanets();
    }
    // Per-frame sim-time push to small-body shaders (cheap uniform write).
    this.asteroids?.setSimTime(this.simTime);
    this.comets?.setSimTime(this.simTime);
    this.interstellar?.setSimTime(this.simTime);

    // WASD movement (in local axes derived from current yaw/pitch).
    if (this.heldKeys.size > 0) {
      const fwd = this.forwardVec();
      const right = this.rightVec(fwd);
      const boost = this.heldKeys.has("shift") ? 8 : 1;
      const stepLY = this.speed * boost * dt;
      if (this.heldKeys.has("w")) this.logicalPos.add(fwd.clone().multiplyScalar(stepLY));
      if (this.heldKeys.has("s")) this.logicalPos.add(fwd.clone().multiplyScalar(-stepLY));
      if (this.heldKeys.has("a")) this.logicalPos.add(right.clone().multiplyScalar(-stepLY));
      if (this.heldKeys.has("d")) this.logicalPos.add(right.clone().multiplyScalar(stepLY));
      if (this.heldKeys.has("q")) this.logicalPos.y -= stepLY;
      if (this.heldKeys.has("e")) this.logicalPos.y += stepLY;
    }

    // Apply camera rotation (camera stays at world origin).
    const fwd = this.forwardVec();
    this.camera.lookAt(fwd);

    // Re-anchor groups so the camera sits near the local origin in
    // whichever frame is dominant. Solar group is in AU.
    const distLY = this.logicalPos.distanceTo(SUN_LY);
    // Camera-to-Sun in LY:
    const sunRelLY = SUN_LY.clone().sub(this.logicalPos);
    // Solar group AU position = sunRelLY * AU_PER_LY (Sun sits at this
    // offset relative to the camera in AU units).
    this.solarGroup.position.set(
      sunRelLY.x * AU_PER_LY,
      sunRelLY.y * AU_PER_LY,
      sunRelLY.z * AU_PER_LY,
    );
    // Galactic group offset = -logicalPos (camera at world origin in LY).
    this.galacticGroup.position.set(
      -this.logicalPos.x,
      -this.logicalPos.y,
      -this.logicalPos.z,
    );

    // Layer visibility
    const solarOpacity = ramp(distLY, 1e-3, 0.2, 1.0, 0.0);
    const galaxyOpacity = ramp(distLY, 0.5, 50, 0.0, 1.0);
    const cosmicOpacity = ramp(distLY, 50_000, 5_000_000, 0.0, 1.0);

    (this.sunMesh.material as MeshBasicMaterial).opacity = 1.0;
    (this.sunMesh.material as MeshBasicMaterial).transparent = true;
    (this.sunMesh.material as MeshBasicMaterial).visible = solarOpacity > 0.05;
    (this.sunGlow.material as SpriteMaterial).opacity = solarOpacity;
    for (const p of this.planets) {
      (p.sphere.material as MeshBasicMaterial).visible = solarOpacity > 0.1;
      (p.label.material as SpriteMaterial).opacity = solarOpacity * 0.9;
    }
    for (const o of this.orbitLoops) {
      (o.material as LineBasicMaterial).opacity = solarOpacity * 0.45;
      (o.material as LineBasicMaterial).visible = solarOpacity > 0.05;
    }
    // HiPS skybox: brightest at very-near-Earth scales (< 0.001 LY), fully
    // hidden when we're far enough out that the actual galaxy + cosmic web
    // visualisations are taking over.
    const hipsOpacity = ramp(distLY, 1e-4, 0.05, 1.0, 0.0);
    this.hipsGroup.visible = hipsOpacity > 0.05;
    for (const t of this.hipsSphere.tilesAll()) {
      const m = t.mesh.material as { opacity?: number; transparent?: boolean; needsUpdate?: boolean };
      m.opacity = hipsOpacity;
      m.transparent = true;
      m.needsUpdate = true;
    }
    if (this.hipsOverlay) {
      for (const t of this.hipsOverlay.tilesAll()) {
        const m = t.mesh.material as { opacity?: number; transparent?: boolean; needsUpdate?: boolean };
        m.opacity = hipsOpacity * this.hipsOverlayMix;
        m.transparent = true;
        m.needsUpdate = true;
      }
    }
    (this.galaxyDisk.material as MeshBasicMaterial).opacity = galaxyOpacity;
    (this.galaxyBulge.material as MeshBasicMaterial).opacity = galaxyOpacity * 0.85;
    (this.armPoints.material as ShaderMaterial).visible = galaxyOpacity > 0.05;
    (this.cosmicWebPoints.material as ShaderMaterial).visible = cosmicOpacity > 0.05;
    for (const s of this.galacticLabels) {
      (s.material as SpriteMaterial).opacity = galaxyOpacity * 0.9;
    }
    for (const s of this.armLabels) {
      (s.material as SpriteMaterial).opacity = galaxyOpacity;
    }

    void dt;
    this.renderer.render(this.scene, this.camera);
    this.publishState();
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
    this.renderer.dispose();
    this.listeners.clear();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function ramp(x: number, a: number, b: number, ya: number, yb: number): number {
  if (x <= a) return ya;
  if (x >= b) return yb;
  const t = (x - a) / (b - a);
  return ya + (yb - ya) * t;
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
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.2, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
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

function makeLabelTexture(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 5;
  const padY = 2;
  const fontSize = 11 * dpr;
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
  ctx.fillStyle = "rgba(245, 240, 220, 0.95)";
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function makeGalaxyTexture(): CanvasTexture {
  const SIZE = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const rMax = SIZE / 2 - 4;
  const bulgeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax * 0.18);
  bulgeGrad.addColorStop(0, "rgba(255, 240, 200, 1)");
  bulgeGrad.addColorStop(0.5, "rgba(255, 200, 130, 0.6)");
  bulgeGrad.addColorStop(1, "rgba(255, 180, 120, 0)");
  ctx.fillStyle = bulgeGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const diskGrad = ctx.createRadialGradient(cx, cy, rMax * 0.1, cx, cy, rMax);
  diskGrad.addColorStop(0, "rgba(255, 220, 180, 0.45)");
  diskGrad.addColorStop(0.4, "rgba(220, 180, 240, 0.22)");
  diskGrad.addColorStop(1, "rgba(140, 120, 200, 0)");
  ctx.fillStyle = diskGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 16000; i++) {
    const arm = i % 4;
    const t = Math.random();
    const theta = arm * (Math.PI / 2) + t * 4 + Math.random() * 0.4;
    const r = (rMax * 0.1 + t * rMax * 0.85) * (0.95 + Math.random() * 0.1);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    if (Math.hypot(x - cx, y - cy) > rMax) continue;
    const tone = Math.random() < 0.7 ? 0 : 1;
    ctx.fillStyle =
      tone === 0
        ? `rgba(255, ${220 + Math.random() * 35}, ${190 + Math.random() * 50}, ${0.3 + Math.random() * 0.5})`
        : `rgba(${180 + Math.random() * 60}, ${180 + Math.random() * 60}, 255, ${0.2 + Math.random() * 0.5})`;
    ctx.fillRect(x, y, 0.4 + Math.random() * 1.6, 0.4 + Math.random() * 1.6);
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
    const r = 5_000 + t * 45_000 + Math.random() * 1_500; // LY
    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2_000 * (1 - t * 0.7);
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

function makeCosmicWebPoints(): Points {
  const N = 30000;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const N_CLUSTERS = 80;
  const RANGE = 1_500_000_000; // 1.5 Gly in LY
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
    const r = Math.pow(Math.random(), 2) * 200_000_000;
    const t = Math.random() * Math.PI * 2;
    positions[i * 3] = cluster.x + r * Math.cos(t);
    positions[i * 3 + 1] = cluster.y + (Math.random() - 0.5) * r * 0.4;
    positions[i * 3 + 2] = cluster.z + r * Math.sin(t);
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

function addGalacticLabels(out: Sprite[], group: Group): void {
  const LABELS: Array<{ name: string; pos: Vector3; tone: string }> = [
    { name: "Sgr A*", pos: new Vector3(0, 0, 0), tone: "rgba(255, 130, 130, 0.95)" },
    { name: "Galactic Bulge", pos: new Vector3(0, 2500, 0), tone: "rgba(255, 220, 160, 0.95)" },
    { name: "Solar System", pos: new Vector3(SUN_LY.x, 1500, SUN_LY.z), tone: "rgba(255, 235, 145, 0.95)" },
    { name: "Andromeda (M31)", pos: new Vector3(2_540_000, 0, 0), tone: "rgba(220, 200, 255, 0.95)" },
    { name: "Triangulum (M33)", pos: new Vector3(2_700_000, -300_000, 100_000), tone: "rgba(220, 200, 255, 0.95)" },
    { name: "LMC", pos: new Vector3(-160_000, 0, 30_000), tone: "rgba(220, 200, 255, 0.95)" },
    { name: "Local Group", pos: new Vector3(1_000_000, 0, 0), tone: "rgba(180, 220, 255, 0.85)" },
    { name: "Virgo Cluster", pos: new Vector3(53_000_000, 12_000_000, 0), tone: "rgba(120, 220, 255, 0.95)" },
    { name: "Laniakea", pos: new Vector3(220_000_000, 50_000_000, 0), tone: "rgba(180, 220, 255, 0.95)" },
    { name: "Great Attractor", pos: new Vector3(250_000_000, 0, 0), tone: "rgba(255, 200, 130, 0.95)" },
    { name: "Boötes Void", pos: new Vector3(700_000_000, 0, 0), tone: "rgba(180, 180, 180, 0.6)" },
    { name: "Sloan Great Wall", pos: new Vector3(1_370_000_000, 200_000_000, 0), tone: "rgba(255, 200, 130, 0.95)" },
  ];
  for (const lm of LABELS) {
    const sprite = makeLabelSprite(lm.name, lm.tone, 1500);
    sprite.position.copy(lm.pos);
    group.add(sprite);
    out.push(sprite);
  }
}

function addArmLabels(out: Sprite[], group: Group): void {
  const ARMS: Array<{ name: string; pos: Vector3; tone: string }> = [
    { name: "Perseus Arm", pos: new Vector3(-25_000, 500, 25_000), tone: "rgba(184, 140, 255, 0.95)" },
    { name: "Sagittarius-Carina Arm", pos: new Vector3(-15_000, 500, -25_000), tone: "rgba(255, 140, 184, 0.95)" },
    { name: "Scutum-Centaurus Arm", pos: new Vector3(15_000, 500, -25_000), tone: "rgba(140, 200, 255, 0.95)" },
    { name: "Orion Spur", pos: new Vector3(SUN_LY.x - 5_000, 800, 5_000), tone: "rgba(255, 210, 140, 0.95)" },
  ];
  for (const a of ARMS) {
    const sprite = makeLabelSprite(a.name, a.tone, 2500);
    sprite.position.copy(a.pos);
    group.add(sprite);
    out.push(sprite);
  }
}

function makeLabelSprite(text: string, color: string, h: number): Sprite {
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
    gl_PointSize = aSize * uPixelRatio * (300000.0 / -mvPosition.z);
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
const COSMIC_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio * (50000000.0 / -mvPosition.z);
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

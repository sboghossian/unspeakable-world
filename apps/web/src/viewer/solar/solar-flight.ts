import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Line as ThreeLine,
  LinearFilter,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Points,
  PointLight,
  Raycaster,
  RingGeometry,
  Scene,
  Vector2,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { Body, HelioVector, GeoVector, JupiterMoons } from "astronomy-engine";
import {
  makeEarthAtmosphereMaterial,
  makeEarthDayNightMaterial,
  makePlanetTexture,
  makeSaturnRingShadowMaterial,
  paintCanvas,
  paintEarthNight,
  paintMoon,
  paintSun,
} from "./celestial-art";
import { SatelliteField } from "../satellites/satellite-field";
import { IssModel } from "../satellites/iss-model";
import { JwstModel } from "../spacecraft/jwst-model";
import { OortCloud } from "./oort-cloud";
import { SunGravityWell } from "./gravity-well";
import { MoonField } from "../universe/moons";
import * as satelliteJs from "satellite.js";
import { AsteroidField } from "../universe/asteroids";
import { AuroraOverlay } from "../space-weather/aurora-overlay";
import { payloadForBody } from "../data/body-info";
import type { InfoPayload } from "../ui/InfoPanel";
import { getSettings } from "../../lib/settings";

export type SolarFlightHit = {
  kind: "Sun" | "Planet";
  name: string;
  payload: InfoPayload;
};

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
  /** Sidereal rotation period in days. Negative = retrograde (Venus,
   *  Uranus). Drives the textured-sphere spin in updatePlanets so
   *  continents / cloud bands actually move past the terminator as time
   *  scrubs forward. */
  rotPeriodDays: number;
}> = [
  { body: Body.Mercury, name: "Mercury", color: 0xc8c1b8, drawSize: 0.025, rotPeriodDays: 58.646 },
  { body: Body.Venus, name: "Venus", color: 0xfff0c2, drawSize: 0.04, rotPeriodDays: -243.018 },
  { body: Body.Earth, name: "Earth", color: 0x6ea4ff, drawSize: 0.045, rotPeriodDays: 0.99727 },
  { body: Body.Mars, name: "Mars", color: 0xff8a5e, drawSize: 0.035, rotPeriodDays: 1.02595 },
  { body: Body.Jupiter, name: "Jupiter", color: 0xffd9a8, drawSize: 0.09, rotPeriodDays: 0.41354 },
  { body: Body.Saturn, name: "Saturn", color: 0xffe1a3, drawSize: 0.08, rotPeriodDays: 0.43958 },
  { body: Body.Uranus, name: "Uranus", color: 0xb6e6f0, drawSize: 0.055, rotPeriodDays: -0.71833 },
  { body: Body.Neptune, name: "Neptune", color: 0x7fa6ff, drawSize: 0.055, rotPeriodDays: 0.67125 },
];

/** Solar equatorial rotation period in days (~25.4 d at the Sun's
 *  equator). Differential rotation at higher latitudes is ignored. */
const SUN_ROTATION_DAYS = 25.4;

/** Saturn ring geometry, shared between the ring mesh and the
 *  ring-shadow shader on Saturn's body. Tilt rotates a RingGeometry
 *  (XY plane natively) so it lands ~horizontal in scene-XZ with
 *  Saturn's ~26.7° obliquity. */
const SATURN_RING_INNER_MULT = 1.4;
const SATURN_RING_OUTER_MULT = 2.4;
const SATURN_RING_TILT = Math.PI / 2 - 0.466;

/** Major Earth cities surfaced as sprite labels once the camera is close
 *  enough to read them. Lat/lon in decimal degrees, name is what shows
 *  in the label. Curated — capitals + major metropolises. */
const EARTH_CITIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: "New York", lat: 40.71, lon: -74.0 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "Mexico City", lat: 19.43, lon: -99.13 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Buenos Aires", lat: -34.6, lon: -58.38 },
  { name: "Anchorage", lat: 61.22, lon: -149.9 },
  { name: "Reykjavik", lat: 64.13, lon: -21.95 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Madrid", lat: 40.42, lon: -3.7 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Rome", lat: 41.9, lon: 12.5 },
  { name: "Moscow", lat: 55.76, lon: 37.62 },
  { name: "Istanbul", lat: 41.01, lon: 28.98 },
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Lagos", lat: 6.45, lon: 3.39 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Johannesburg", lat: -26.2, lon: 28.04 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Bangkok", lat: 13.76, lon: 100.5 },
  { name: "Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Beijing", lat: 39.9, lon: 116.4 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Auckland", lat: -36.85, lon: 174.76 },
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
  rotPeriodDays: number;
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
  /** "Tracking Mode" — keeps the camera glued to a moving body. Default on. */
  tracking: boolean;
  /** Auto-detected scale region the camera is currently in. */
  vicinity: string;
  /** Real-Scale toggle: planets at physically-proportional size (off = cosmetic). */
  realScale: boolean;
  /** Orbital path opacity (0-1). */
  orbitOpacity: number;
  /** Background star brightness (0-1). */
  starBrightness: number;
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
  private dragStart = { x: 0, y: 0 };
  private dragMaxDist = 0;
  private raycaster = new Raycaster();
  private onClickCb: ((hit: SolarFlightHit) => void) | null = null;
  private tracking = true;
  private realScale = false;
  private orbitOpacity = 0.45;
  private starBrightness = 1.0;

  // Time
  private simTime = new Date();
  private playing = true;
  private timeRate = 86400; // default: 1 day per second so motion is visible
  private lastWallClock = performance.now();

  // Scene objects
  private sun: Mesh;
  private sunGlow: Sprite;
  private planets: PlanetMesh[] = [];
  private galileanMoons: Array<{
    name: "Io" | "Europa" | "Ganymede" | "Callisto";
    sphere: Mesh;
    label: Sprite;
  }> = [];
  private marsMoons: Array<{
    name: "Phobos" | "Deimos";
    sphere: Mesh;
    label: Sprite;
    /** Approximate orbital radius in AU (cosmetic-scaled). */
    a: number;
    /** Sidereal period in days. */
    period: number;
  }> = [];
  /** Earth's Moon. Positioned via GeoVector(Moon) each frame, with a
   *  cosmetic scale so it sits visibly outside Earth's drawn radius. */
  private earthsMoon: { sphere: Mesh; label: Sprite } | null = null;
  /** City labels parented to Earth's sphere so they rotate with the
   *  planet. Hidden when the camera is far from Earth. */
  private earthCityLabels: Sprite[] = [];
  /** Stylized 3D ISS model — visible alongside the satellite point
   *  cloud once the camera is close enough to Earth. */
  private issModel: IssModel | null = null;
  /** Cached SGP4 record for ISS so we can propagate every frame
   *  without re-parsing the TLE. */
  private issSatRec: ReturnType<typeof satelliteJs.twoline2satrec> | null =
    null;
  /** Stylized 3D JWST model, parked at Sun-Earth L2 in solar flight. */
  private jwstModel: JwstModel | null = null;
  /** Oort Cloud spherical shell — fades in once the camera is past
   *  Neptune so it doesn't clutter the inner-system view. */
  private oortCloud: OortCloud | null = null;
  /** Faint lattice in the ecliptic plane that dips toward the Sun like
   *  a stretched rubber sheet. */
  private gravityWell: SunGravityWell | null = null;
  /** Outer-planet moons (Saturn / Uranus / Neptune systems). Mars +
   *  Jupiter are handled by buildMarsMoons + buildGalileanMoons, so we
   *  exclude them from this field to avoid double-rendering. */
  private outerMoons: MoonField | null = null;
  /** Sun-Earth Lagrange-point markers L1-L5. Each is a sprite label
   *  plus a small dot, positioned each frame from Earth's heliocentric
   *  state. */
  private lagrange: Array<{
    name: "L1" | "L2" | "L3" | "L4" | "L5";
    dot: Mesh;
    label: Sprite;
  }> = [];
  private orbits: LineLoop[] = [];
  private solarZones: LineLoop[] = [];
  private starPoints: Points | null = null;
  private backgroundLabels: Sprite[] = [];
  private satellites: SatelliteField | null = null;
  /** ~10k main-belt + NEA asteroids propagated GPU-side from their
   *  Keplerian elements. Same field used in Universe mode; here it sits
   *  in the same heliocentric ecliptic AU frame as the planets. */
  private asteroids: AsteroidField | null = null;
  private auroraOverlay: AuroraOverlay | null = null;
  /** Saturn's sphere material — kept on hand so updatePlanets() can push
   *  the planet's current world position into the ring-shadow uniform. */
  private saturnMat: ShaderMaterial | null = null;

  // Gravity sandbox — light n-body projectiles pulled by Sun + planets.
  private projectiles: Projectile[] = [];
  private projectileGroup = new Group();
  private projectileTrails: LineLoop[] = [];

  // Standby idle tracking (mirrors UniverseScene): skip renderer.render
  // when the tab is hidden or the camera has been idle > 60s. rAF stays
  // alive so the next pointer/key/touch wakes us back up.
  private lastInteractionMs = performance.now();

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

    // Sun at origin — emissive sphere + sprite glow. The sphere wears a
    // granulation texture (convection cells) so it doesn't read as a
    // flat yellow ball; the sprite glow on top adds the corona halo.
    const sunGeom = new SphereGeometry(SUN_DRAW_SIZE, 48, 48);
    const sunMat = new MeshBasicMaterial({
      map: paintCanvas(1024, 512, paintSun),
      color: 0xffffff,
    });
    this.sun = new Mesh(sunGeom, sunMat);
    this.scene.add(this.sun);

    this.sunGlow = makeGlowSprite(0xffd06a, SUN_DRAW_SIZE * 6);
    this.scene.add(this.sunGlow);

    // Solar lighting — a point light at the Sun's position (origin) lights
    // the planets so their day/night sides actually read. A faint ambient
    // term keeps the unlit hemispheres from going pitch black, which would
    // make moons / outer planets vanish into the background. Earth has its
    // own shader and ignores these (MeshBasicMaterial for the Sun also
    // ignores lights, so the Sun stays self-luminous).
    const sunLight = new PointLight(0xfff2c8, 2.6, 0, 0);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
    this.scene.add(new AmbientLight(0xffffff, 0.12));

    // Build planets + orbits + Jupiter's Galilean moons
    void this.buildPlanets();
    void this.buildOrbits();
    this.buildGalileanMoons();
    this.buildMarsMoons();
    this.buildEarthsMoon();
    this.buildLagrangePoints();
    this.buildSolarZones();

    // Background star field on a giant sphere (radius STAR_RADIUS).
    void this.loadStarBackground();
    // Bright-star + cosmic-landmark labels at the same far radius.
    void this.loadBackgroundLabels();
    // Real satellite catalog — TLE + SGP4 propagation, draped around Earth.
    this.satellites = new SatelliteField();
    this.scene.add(this.satellites.group);
    void this.satellites.load("/data/satellites.json").catch(() => {
      // optional layer
    });

    // Stylized 3D ISS model — built once, positioned each frame from
    // the same SGP4 propagation the satellite cloud uses.
    this.issModel = new IssModel();
    this.scene.add(this.issModel);
    // Stylized 3D JWST model — parked at Sun-Earth L2 each frame.
    this.jwstModel = new JwstModel();
    this.scene.add(this.jwstModel);

    // Oort Cloud — only readable when zoomed out past Neptune.
    this.oortCloud = new OortCloud();
    this.scene.add(this.oortCloud.points);

    // Gravity-well grid — visible at inner-solar-system scales only.
    this.gravityWell = new SunGravityWell();
    this.scene.add(this.gravityWell.mesh);

    // Outer-planet moons: Mimas / Enceladus / Tethys / Dione / Rhea /
    // Titan / Iapetus around Saturn; Miranda / Ariel / Umbriel /
    // Titania / Oberon around Uranus; Triton around Neptune. Mars +
    // Jupiter's moons are handled by the bespoke builders elsewhere
    // in this scene, so we exclude them here.
    this.outerMoons = new MoonField({ excludeParents: ["Mars"] });
    this.outerMoons.visible = true;
    this.scene.add(this.outerMoons);
    void fetch("/data/satellites.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (this.disposed || !Array.isArray(data)) return;
        const iss = (data as Array<{ name: string; l1: string; l2: string }>)
          .find((e) => e.name.includes("ISS (ZARYA)"));
        if (!iss) return;
        try {
          this.issSatRec = satelliteJs.twoline2satrec(iss.l1, iss.l2);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // optional layer
      });

    // Main-belt asteroid swarm — GPU Kepler propagation from `/data/asteroids.bin`.
    // Same binary the Universe scene loads. Shows the actual main belt as
    // a dust ring between Mars and Jupiter once it arrives over the wire.
    void fetch("/data/asteroids.bin")
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (!buf || this.disposed) return;
        this.asteroids = new AsteroidField(buf, this.simTime);
        this.asteroids.visible = true;
        this.asteroids.setSimTime(this.simTime);
        this.scene.add(this.asteroids);
      })
      .catch(() => {
        // optional layer
      });

    // Gravity sandbox layer (initially empty).
    this.scene.add(this.projectileGroup);

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
      tracking: this.tracking,
      vicinity: "Inner Solar System",
      realScale: this.realScale,
      orbitOpacity: this.orbitOpacity,
      starBrightness: this.starBrightness,
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

  setTracking(tracking: boolean): void {
    this.tracking = tracking;
    this.publishState();
  }

  /** Real-scale: shrink planet draw sizes to physically-proportional values
   *  vs the Sun. The cosmetic sizes are nicer to see; real-scale is the
   *  educational "yeah, planets are pinpricks" mode. */
  setRealScale(real: boolean): void {
    this.realScale = real;
    for (const p of this.planets) {
      const factor = real ? 0.06 : 1.0; // 6% of cosmetic size
      p.sphere.scale.setScalar(factor);
    }
    this.publishState();
  }

  setOrbitOpacity(opacity: number): void {
    this.orbitOpacity = Math.max(0, Math.min(1, opacity));
    for (const o of this.orbits) {
      (o.material as LineBasicMaterial).opacity = this.orbitOpacity;
      (o.material as LineBasicMaterial).visible = this.orbitOpacity > 0.01;
    }
    this.publishState();
  }

  setStarBrightness(brightness: number): void {
    this.starBrightness = Math.max(0, Math.min(2, brightness));
    if (this.starPoints) {
      const mat = this.starPoints.material as ShaderMaterial;
      // multiply opacity uniform on shader; we don't have one, so scale via
      // material.opacity (additive blend) — simplest path.
      mat.opacity = this.starBrightness;
      mat.transparent = true;
      mat.needsUpdate = true;
    }
    this.publishState();
  }

  /** Reset simulation time to wall-clock now. */
  resetNow(): void {
    this.simTime = new Date();
    this.lastWallClock = performance.now();
    this.updatePlanets();
    this.publishState();
  }

  /** Restore camera state from saved hash params. */
  setCameraState(yaw: number, pitch: number, dist: number): void {
    if (Number.isFinite(yaw)) this.yaw = yaw;
    if (Number.isFinite(pitch)) this.pitch = pitch;
    if (Number.isFinite(dist) && dist > 0) this.cameraDistance = dist;
    this.applyCamera();
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

      let sphere: Mesh;
      let earthMaterial: ShaderMaterial | null = null;

      if (spec.name === "Earth") {
        // Earth gets a custom day/night shader. Sun sits at world origin
        // in this scene, so the lit hemisphere is the side whose surface
        // normal points back toward the origin. The night hemisphere
        // shows a sparse warm city-lights map; a smooth terminator band
        // cross-fades them.
        const dayTex = makePlanetTexture("Earth");
        const nightTex = paintCanvas(1024, 512, paintEarthNight);
        earthMaterial = makeEarthDayNightMaterial(dayTex, nightTex);
        sphere = new Mesh(geom, earthMaterial);
      } else if (spec.name === "Saturn") {
        // Saturn: custom shader that does its own Lambert plus an
        // analytical ring-shadow — for any surface point we ray-cast to
        // the Sun and darken if that ray crosses the ring annulus.
        const ringN = new Vector3(
          0,
          -Math.sin(SATURN_RING_TILT),
          Math.cos(SATURN_RING_TILT),
        ).normalize();
        const planetTex = makePlanetTexture(spec.name);
        this.saturnMat = makeSaturnRingShadowMaterial(
          planetTex,
          ringN,
          spec.drawSize * SATURN_RING_INNER_MULT,
          spec.drawSize * SATURN_RING_OUTER_MULT,
        );
        sphere = new Mesh(geom, this.saturnMat);
      } else {
        // Every other planet gets its styled procedural texture
        // (Mercury craters, Jupiter bands, Mars rust + polar caps, etc.)
        // on a Lambert material so the Sun's point light gives them a
        // proper day/night gradient as the camera flies around.
        const planetTex = makePlanetTexture(spec.name);
        const mat = new MeshLambertMaterial({ map: planetTex, color: 0xffffff });
        sphere = new Mesh(geom, mat);
      }
      group.add(sphere);

      // Earth: try to upgrade the day texture to the real NASA Blue
      // Marble photo. Falls back to procedural on CORS / offline.
      if (spec.name === "Earth" && earthMaterial) {
        const earthMat = earthMaterial;
        const loader = new TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Land_ocean_ice_cloud_2048.jpg/1024px-Land_ocean_ice_cloud_2048.jpg",
          (tex) => {
            const dayUniform = earthMat.uniforms["uDay"];
            if (dayUniform) dayUniform.value = tex;
            earthMat.needsUpdate = true;
          },
          undefined,
          () => {
            // Silent fail — procedural texture is already in place.
          },
        );

        // Atmosphere — back-side hemisphere with a custom shader doing
        // Fresnel-style rim brightening + a warm twilight band along
        // the terminator. Reads as a real atmosphere rather than a flat
        // additive halo.
        const atmoGeom = new SphereGeometry(spec.drawSize * 1.22, 32, 32);
        const atmoMat = makeEarthAtmosphereMaterial();
        const atmo = new Mesh(atmoGeom, atmoMat);
        group.add(atmo);

        // Aurora oval overlay — fetched lazily when first toggled on.
        const aurora = new AuroraOverlay({ earthRadius: spec.drawSize });
        group.add(aurora);
        this.auroraOverlay = aurora;

        // City labels — parented to the rotating sphere so they sweep
        // around with the diurnal spin. Stay invisible until the camera
        // is close enough to Earth that the labels would actually read.
        for (const c of EARTH_CITIES) {
          const lat = (c.lat * Math.PI) / 180;
          const lon = (c.lon * Math.PI) / 180;
          // Match the texture's UV → 3D mapping: lon=0 hits the texture
          // centre (Greenwich), lat=+90 the north pole.
          const r = spec.drawSize * 1.005;
          const px = r * Math.cos(lat) * Math.cos(lon);
          const py = r * Math.sin(lat);
          const pz = -r * Math.cos(lat) * Math.sin(lon);
          const labelTex = makeLabelTexture(c.name);
          const labelMat = new SpriteMaterial({
            map: labelTex,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            opacity: 0,
          });
          const label = new Sprite(labelMat);
          const aspect = labelTex.image.width / labelTex.image.height;
          const h = spec.drawSize * 0.16;
          label.scale.set(h * aspect, h, 1);
          label.position.set(px, py, pz);
          sphere.add(label);
          this.earthCityLabels.push(label);
        }
      }

      // Saturn: textured ring system. RingGeometry is a flat disk; we tilt
      // it so it reads at the body's actual ~26.7° axial inclination. The
      // body's shader independently casts the ring's analytical shadow
      // back onto the sphere.
      if (spec.name === "Saturn") {
        const ringInner = spec.drawSize * SATURN_RING_INNER_MULT;
        const ringOuter = spec.drawSize * SATURN_RING_OUTER_MULT;
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
        ring.rotation.x = SATURN_RING_TILT;
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
        rotPeriodDays: spec.rotPeriodDays,
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
    let jupX = 0;
    let jupY = 0;
    let jupZ = 0;
    let marsX = 0;
    let marsY = 0;
    let marsZ = 0;
    let earthX = 0;
    let earthY = 0;
    let earthZ = 0;
    // Days since J2000 epoch (2000-01-01 12:00 TT). Drives axial rotation
    // for every body so their textures actually spin as time scrubs.
    const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
    const daysSinceJ2000 = (this.simTime.getTime() - J2000_MS) / 86400000;
    this.sun.rotation.y = ((daysSinceJ2000 / SUN_ROTATION_DAYS) % 1) * Math.PI * 2;
    if (this.asteroids) this.asteroids.setSimTime(this.simTime);
    if (this.outerMoons) this.outerMoons.setSimTime(this.simTime);

    for (const p of this.planets) {
      try {
        const v = HelioVector(p.body, this.simTime);
        const sx = v.x * AU;
        const sy = v.z * AU;
        const sz = -v.y * AU;
        p.group.position.set(sx, sy, sz);
        // Diurnal spin: each planet ticks through its sidereal day.
        // Negative period = retrograde rotation (Venus, Uranus).
        p.sphere.rotation.y =
          ((daysSinceJ2000 / p.rotPeriodDays) % 1) * Math.PI * 2;
        if (p.name === "Jupiter") {
          jupX = sx;
          jupY = sy;
          jupZ = sz;
        } else if (p.name === "Mars") {
          marsX = sx;
          marsY = sy;
          marsZ = sz;
        } else if (p.name === "Earth") {
          earthX = sx;
          earthY = sy;
          earthZ = sz;
        } else if (p.name === "Saturn" && this.saturnMat) {
          // Push Saturn's current world position into the ring-shadow
          // shader so per-fragment ray-casts to the Sun know where the
          // body's center is.
          const center = this.saturnMat.uniforms["uCenterW"];
          if (center) (center.value as Vector3).set(sx, sy, sz);
        }
      } catch {
        // ignore
      }
    }

    // Mars moons (Phobos / Deimos): no AstronomyEngine support, so we
    // propagate a circular Keplerian orbit using period + cosmetic radius.
    // Plenty good for visualization at solar-flight scales.
    if (this.marsMoons.length > 0) {
      const t = this.simTime.getTime() / 1000 / 86400; // days since 1970
      for (const m of this.marsMoons) {
        const phase = ((t / m.period) % 1) * Math.PI * 2;
        const x = marsX + m.a * Math.cos(phase);
        const z = marsZ + m.a * Math.sin(phase);
        const y = marsY;
        m.sphere.position.set(x, y, z);
        m.label.position.set(x, y + 0.005, z);
      }
    }
    // City labels — fade in as the camera gets close to Earth, fade out
    // when the user pulls back. Threshold tuned so they appear once
    // Earth fills a meaningful chunk of the screen.
    if (this.earthCityLabels.length > 0) {
      const camWorld = this.camera.position;
      const dist = Math.hypot(
        camWorld.x - earthX,
        camWorld.y - earthY,
        camWorld.z - earthZ,
      );
      // Map distance → opacity. Fully visible at ≤ 0.005 AU
      // (~750k km, just outside Moon orbit), invisible past 0.05 AU.
      const t = Math.max(0, Math.min(1, (0.05 - dist) / (0.05 - 0.005)));
      for (const label of this.earthCityLabels) {
        (label.material as SpriteMaterial).opacity = t;
        label.visible = t > 0.02;
      }
    }

    // Push planet positions into the outer-moons field so its anchors
    // track Saturn / Uranus / Neptune each frame.
    if (this.outerMoons) {
      const positions = new Map<string, Vector3>();
      for (const p of this.planets) {
        positions.set(p.name, p.group.position);
      }
      this.outerMoons.setParentPositions(
        positions as unknown as Parameters<
          typeof this.outerMoons.setParentPositions
        >[0],
      );
    }

    // Sun-Earth Lagrange points — L1 / L2 along the Sun-Earth line
    // (±0.01 AU from Earth), L3 opposite Earth across the Sun (~1 AU
    // on the far side), L4 / L5 60° ahead/behind Earth on its orbit.
    if (this.lagrange.length > 0) {
      const rE = Math.hypot(earthX, earthY, earthZ);
      if (rE > 1e-6) {
        const ex = earthX / rE;
        const ey = earthY / rE;
        const ez = earthZ / rE;
        // Perpendicular vector in the ecliptic plane (around scene-Y).
        const px = -ez;
        const pz = ex;
        const cos60 = 0.5;
        const sin60 = 0.8660254;
        const POSITIONS: Record<string, [number, number, number]> = {
          L1: [earthX - ex * 0.01, earthY - ey * 0.01, earthZ - ez * 0.01],
          L2: [earthX + ex * 0.01, earthY + ey * 0.01, earthZ + ez * 0.01],
          L3: [-earthX - ex * 0.01, -earthY - ey * 0.01, -earthZ - ez * 0.01],
          L4: [
            rE * (cos60 * ex - sin60 * px),
            earthY,
            rE * (cos60 * ez - sin60 * pz),
          ],
          L5: [
            rE * (cos60 * ex + sin60 * px),
            earthY,
            rE * (cos60 * ez + sin60 * pz),
          ],
        };
        const camWorld = this.camera.position;
        const camToEarth = Math.hypot(
          camWorld.x - earthX,
          camWorld.y - earthY,
          camWorld.z - earthZ,
        );
        // Visible inside the inner solar system; faded when zoomed out
        // to galactic scales where they'd just be five dots stacked
        // on Earth.
        const t = Math.max(0, Math.min(1, (2 - camToEarth) / 1.5));
        for (const lp of this.lagrange) {
          const [lx, ly, lz] = POSITIONS[lp.name]!;
          lp.dot.position.set(lx, ly, lz);
          lp.label.position.set(lx, ly + 0.008, lz);
          (lp.dot.material as MeshBasicMaterial).opacity = t * 0.85;
          (lp.label.material as SpriteMaterial).opacity = t * 0.8;
          lp.dot.visible = t > 0.03;
          lp.label.visible = t > 0.03;
        }
      }
    }

    // JWST at Sun-Earth L2 — Earth's heliocentric position pushed
    // ~0.01 AU farther from the Sun along the Sun-Earth line.
    if (this.jwstModel) {
      const rE = Math.hypot(earthX, earthY, earthZ);
      if (rE > 1e-6) {
        const k = 1 + 0.01 / rE;
        this.jwstModel.position.set(earthX * k, earthY * k, earthZ * k);
        // Always face the Sun so the gold mirror is visible.
        this.jwstModel.lookAt(0, 0, 0);
        const camWorld = this.camera.position;
        const dist = Math.hypot(
          camWorld.x - earthX,
          camWorld.y - earthY,
          camWorld.z - earthZ,
        );
        // Visible once the camera is within ~0.1 AU of Earth (covers
        // anywhere from LEO out to JWST itself).
        this.jwstModel.visible = dist < 0.1;
      }
    }

    // ISS 3D model — propagate its TLE, drape it around Earth at the
    // same scale used by the satellite point cloud, and fade it out
    // when the camera is far away (the SatelliteField point still
    // represents it at that scale).
    if (this.issModel && this.issSatRec) {
      try {
        const out = satelliteJs.propagate(this.issSatRec, this.simTime);
        if (out && typeof out !== "boolean") {
          const p = out.position;
          if (p && typeof p !== "boolean") {
            // SatelliteField uses km2unit = drawSize / EARTH_RADIUS_KM
            // (~0.045 / 6371 ≈ 7.06e-6 AU/km) — match it so the ISS
            // sits on the same shell as the point cloud.
            const km2unit = 0.045 / 6371;
            const sx = earthX + p.x * km2unit;
            const sy = earthY + p.z * km2unit;
            const sz = earthZ - p.y * km2unit;
            this.issModel.position.set(sx, sy, sz);
            const camWorld = this.camera.position;
            const dist = Math.hypot(
              camWorld.x - earthX,
              camWorld.y - earthY,
              camWorld.z - earthZ,
            );
            // Show the model only when it would visibly resolve.
            this.issModel.visible = dist < 0.02;
            // Slow tumble for cinematic life.
            this.issModel.rotation.y =
              ((daysSinceJ2000 * 4.0) % 1) * Math.PI * 2;
          }
        }
      } catch {
        // SGP4 sometimes throws on stale TLEs — ignore.
      }
    }

    // Earth's Moon: GeoVector returns Moon-from-Earth in J2000 AU. Real
    // orbital radius (~0.00257 AU) is much smaller than Earth's drawn
    // size, so we apply a cosmetic SCALE to push the Moon outside the
    // sphere — same trick used for the Galilean moons.
    if (this.earthsMoon) {
      try {
        const rel = GeoVector(Body.Moon, this.simTime, true);
        const SCALE = 40;
        const mx = earthX + rel.x * AU * SCALE;
        const my = earthY + rel.z * AU * SCALE;
        const mz = earthZ + -rel.y * AU * SCALE;
        this.earthsMoon.sphere.position.set(mx, my, mz);
        this.earthsMoon.label.position.set(mx, my + 0.018, mz);
        // Synchronous-rotation: same face toward Earth. Approximated by
        // pointing the sphere's local +Z at Earth and rolling around.
        this.earthsMoon.sphere.lookAt(earthX, earthY, earthZ);
      } catch {
        // ignore
      }
    }

    // Galilean moons: position in heliocentric scene = Jupiter heliocentric
    // + moon-relative-to-Jupiter (StateVector returns AU). Both vectors are
    // equatorial J2000 so we apply the same Z-up→Y-up swap. We multiply
    // the relative offset by a cosmetic factor so the moon system spreads
    // outside Jupiter's drawn radius (planet sprites are ~200x larger
    // than their real radius for visibility) — Callisto then sits just
    // outside the drawn Jupiter sphere.
    if (this.galileanMoons.length > 0) {
      try {
        const info = JupiterMoons(this.simTime);
        const lookup = {
          Io: info.io,
          Europa: info.europa,
          Ganymede: info.ganymede,
          Callisto: info.callisto,
        } as const;
        const SCALE = 18;
        for (const m of this.galileanMoons) {
          const rel = lookup[m.name];
          const x = jupX + rel.x * AU * SCALE;
          const y = jupY + rel.z * AU * SCALE;
          const z = jupZ + -rel.y * AU * SCALE;
          m.sphere.position.set(x, y, z);
          m.label.position.set(x, y + 0.005, z);
        }
      } catch {
        // ignore
      }
    }
  }

  /** Five named radial zones drawn as flat ring loops. Habitable zone +
   *  frost line + asteroid belt + Kuiper belt + heliopause. Off-screen
   *  most of the time but contextual when zoomed wide. */
  private buildSolarZones(): void {
    const ZONES: Array<{ radius: number; color: number; opacity: number }> = [
      // Habitable zone (continuous): inner edge ≈ 0.95 AU, outer ≈ 1.37 AU
      { radius: 0.95, color: 0x4ad19c, opacity: 0.45 },
      { radius: 1.37, color: 0x4ad19c, opacity: 0.45 },
      // Frost line (water ice condenses): ≈ 4.85 AU (between Mars and Jupiter)
      { radius: 4.85, color: 0xa6c8ff, opacity: 0.55 },
      // Inner asteroid belt: ≈ 2.2 AU
      { radius: 2.2, color: 0xc8c1b8, opacity: 0.35 },
      // Outer asteroid belt: ≈ 3.2 AU
      { radius: 3.2, color: 0xc8c1b8, opacity: 0.35 },
      // Kuiper belt inner: 30 AU
      { radius: 30, color: 0xb389ff, opacity: 0.45 },
      // Kuiper belt outer: 50 AU
      { radius: 50, color: 0xb389ff, opacity: 0.45 },
    ];
    const SAMPLES = 256;
    for (const z of ZONES) {
      const positions: number[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const a = (i / SAMPLES) * Math.PI * 2;
        positions.push(Math.cos(a) * z.radius, 0, Math.sin(a) * z.radius);
      }
      const geom = new BufferGeometry();
      geom.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(positions), 3),
      );
      const mat = new LineBasicMaterial({
        color: z.color,
        transparent: true,
        opacity: z.opacity,
      });
      const loop = new LineLoop(geom, mat);
      loop.visible = false; // toggle on demand
      this.scene.add(loop);
      this.solarZones.push(loop);
    }
  }

  setSolarZones(visible: boolean): void {
    for (const z of this.solarZones) z.visible = visible;
  }

  setSatellites(visible: boolean): void {
    this.satellites?.setVisible(visible);
    if (visible) this.refreshSatellites();
  }

  setAurora(visible: boolean): void {
    this.auroraOverlay?.setVisible(visible);
  }

  /** Re-propagate every TLE for the current sim time and update positions
   *  relative to Earth's scene location. Cheap-ish (935 TLEs ≈ 1-2 ms). */
  private refreshSatellites(): void {
    if (!this.satellites || !this.satellites.visible()) return;
    const earthEntry = this.planets.find((p) => p.name === "Earth");
    if (!earthEntry) return;
    const earth = earthEntry.group.position;
    // Cosmetic km-to-scene-units conversion: pick a factor that puts LEO
    // (~6800 km from Earth center) at ~1.5 × Earth's drawn radius (0.045
    // AU). 0.045 × 1.5 / 6800 = 9.9e-6 scene units per km.
    const SCALE = 1.0e-5;
    this.satellites.update(this.simTime, earth, SCALE);
  }

  satelliteCount(): number {
    return this.satellites?.count() ?? 0;
  }

  /**
   * Gravity Sandbox — launch a projectile with given type + speed. The
   * projectile is born at a random sun-frame radius (1–6 AU), aimed
   * tangentially with the requested speed. Up to 15 projectiles at once,
   * older ones pop. Each is integrated via leapfrog under the Sun + 8
   * planets' gravity.
   */
  launchProjectile(
    kind: ProjectileSpec["kind"],
    speedKmS: number,
  ): void {
    const spec = PROJECTILE_SPECS[kind];
    if (this.projectiles.length >= 15) {
      const old = this.projectiles.shift();
      if (old) {
        old.dispose(this.projectileGroup);
      }
    }
    // Birth: random radius 1–6 AU at ~ecliptic, tangential aim.
    const r = 1 + Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const startX = r * Math.cos(theta);
    const startZ = r * Math.sin(theta);
    // Tangential direction (perpendicular to radial in ecliptic plane).
    const tangX = -Math.sin(theta);
    const tangZ = Math.cos(theta);
    // Convert km/s → AU/day: 1 AU = 149.6e6 km, 1 day = 86400 s.
    // dx/dt in AU/day = (km/s) × (86400 / 149.6e6) ≈ (km/s) × 5.78e-4.
    const auPerDay = speedKmS * 5.78e-4;
    const proj = new Projectile(
      spec,
      new Vector3(startX, 0, startZ),
      new Vector3(tangX * auPerDay, 0, tangZ * auPerDay),
    );
    proj.attachTo(this.projectileGroup);
    this.projectiles.push(proj);
  }

  clearProjectiles(): void {
    for (const p of this.projectiles) p.dispose(this.projectileGroup);
    this.projectiles = [];
  }

  projectileCount(): number {
    return this.projectiles.length;
  }

  /** Step every projectile forward by `dtDays` simulated days using
   *  the Sun (heliocentric, mass=1) and four giants. Inner planets are
   *  too weak to matter at typical orbital regimes. */
  private stepProjectiles(dtDays: number): void {
    if (this.projectiles.length === 0) return;
    const G_AU3_PER_DAY2 = 0.00029591220828559104; // GM_sun in AU^3/day^2
    const masses: Array<{ pos: Vector3; mu: number }> = [
      // Sun
      { pos: new Vector3(0, 0, 0), mu: G_AU3_PER_DAY2 },
    ];
    // Add gas giants only — inner planets contribute negligibly to orbital
    // dynamics on solar-system scales. Use scene positions captured in
    // updatePlanets().
    const giantNames = ["Jupiter", "Saturn", "Uranus", "Neptune"];
    const giantMu: Record<string, number> = {
      Jupiter: G_AU3_PER_DAY2 * 9.547e-4,
      Saturn: G_AU3_PER_DAY2 * 2.857e-4,
      Uranus: G_AU3_PER_DAY2 * 4.366e-5,
      Neptune: G_AU3_PER_DAY2 * 5.151e-5,
    };
    for (const n of giantNames) {
      const p = this.planets.find((x) => x.name === n);
      if (!p) continue;
      masses.push({ pos: p.group.position.clone(), mu: giantMu[n]! });
    }
    for (const proj of this.projectiles) {
      proj.step(dtDays, masses);
    }
  }

  private buildMarsMoons(): void {
    // Real semi-major axes (Phobos: 9,376 km = 6.27e-5 AU, Deimos: 23,463
    // km = 1.57e-4 AU) are way smaller than Mars's drawn radius (0.035
    // AU). We scale them up by ~250 so they sit just outside Mars in
    // solar flight — same cosmetic trick as the Galilean moons.
    const MOONS: Array<{
      name: "Phobos" | "Deimos";
      color: number;
      drawSize: number;
      a: number;
      period: number;
    }> = [
      { name: "Phobos", color: 0xa89886, drawSize: 0.005, a: 0.05, period: 0.31891 },
      { name: "Deimos", color: 0x9a8a76, drawSize: 0.004, a: 0.09, period: 1.26244 },
    ];
    for (const m of MOONS) {
      const geom = new SphereGeometry(m.drawSize, 12, 12);
      const mat = new MeshLambertMaterial({
        color: m.color,
        depthTest: false,
      });
      const sphere = new Mesh(geom, mat);
      sphere.renderOrder = 5;
      this.scene.add(sphere);

      const labelTex = makeLabelTexture(m.name);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.8,
      });
      const label = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const h = 0.012;
      label.scale.set(h * aspect, h, 1);
      this.scene.add(label);

      this.marsMoons.push({
        name: m.name,
        sphere,
        label,
        a: m.a,
        period: m.period,
      });
    }
  }

  private buildLagrangePoints(): void {
    const names: Array<"L1" | "L2" | "L3" | "L4" | "L5"> = [
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
    ];
    for (const name of names) {
      const dotMat = new MeshBasicMaterial({
        color: 0x9ad2ff,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
      });
      const dot = new Mesh(new SphereGeometry(0.0015, 8, 8), dotMat);
      dot.renderOrder = 5;
      this.scene.add(dot);
      const labelTex = makeLabelTexture(name);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.85,
      });
      const label = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const h = 0.012;
      label.scale.set(h * aspect, h, 1);
      this.scene.add(label);
      this.lagrange.push({ name, dot, label });
    }
  }

  private buildEarthsMoon(): void {
    // Real Moon size relative to Earth (drawSize 0.045) ≈ 0.272. Bump
    // a little so the disk reads at distance.
    const moonSize = 0.014;
    const geom = new SphereGeometry(moonSize, 24, 24);
    const mat = new MeshLambertMaterial({
      map: paintCanvas(512, 256, paintMoon),
      color: 0xffffff,
    });
    const sphere = new Mesh(geom, mat);
    sphere.renderOrder = 5;
    this.scene.add(sphere);

    const labelTex = makeLabelTexture("Moon");
    const labelMat = new SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.85,
    });
    const label = new Sprite(labelMat);
    const aspect = labelTex.image.width / labelTex.image.height;
    const h = 0.02;
    label.scale.set(h * aspect, h, 1);
    this.scene.add(label);

    this.earthsMoon = { sphere, label };
  }

  private buildGalileanMoons(): void {
    const MOONS: Array<{ name: "Io" | "Europa" | "Ganymede" | "Callisto"; color: number }> = [
      { name: "Io", color: 0xfff0c2 },
      { name: "Europa", color: 0xfafaf2 },
      { name: "Ganymede", color: 0xc8b08a },
      { name: "Callisto", color: 0x8a7a66 },
    ];
    for (const m of MOONS) {
      const geom = new SphereGeometry(0.015, 16, 16);
      const mat = new MeshLambertMaterial({
        color: m.color,
        depthTest: false,
      });
      const sphere = new Mesh(geom, mat);
      sphere.renderOrder = 5; // always render in front of Jupiter
      this.scene.add(sphere);
      const labelTex = makeLabelTexture(m.name);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.8,
      });
      const label = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const h = 0.012;
      label.scale.set(h * aspect, h, 1);
      this.scene.add(label);
      this.galileanMoons.push({ name: m.name, sphere, label });
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
    window.addEventListener("keydown", this.wake);
    c.addEventListener("touchstart", this.wake, { passive: true });
  }

  private wake = (): void => {
    this.lastInteractionMs = performance.now();
  };

  private onPointerDown = (e: PointerEvent) => {
    this.lastInteractionMs = performance.now();
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
    this.lastInteractionMs = performance.now();
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

  setOnClick(cb: (hit: SolarFlightHit) => void): void {
    this.onClickCb = cb;
  }

  /** Raycast against the Sun + planets. Returns the closest hit or null. */
  pick(ndc: Vector2): SolarFlightHit | null {
    this.raycaster.setFromCamera(ndc, this.camera);
    const candidates: Array<{
      kind: SolarFlightHit["kind"];
      name: string;
      distance: number;
    }> = [];
    const sunHits = this.raycaster.intersectObject(this.sun, false);
    if (sunHits[0]) {
      candidates.push({ kind: "Sun", name: "Sun", distance: sunHits[0].distance });
    }
    for (const p of this.planets) {
      const hits = this.raycaster.intersectObject(p.sphere, false);
      if (hits[0]) {
        candidates.push({
          kind: "Planet",
          name: p.name,
          distance: hits[0].distance,
        });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const top = candidates[0];
    if (!top) return null;
    const payload =
      payloadForBody(top.name, top.kind === "Sun" ? "Sun" : "Planet") ?? {
        kind: top.kind === "Sun" ? ("Sun" as const) : ("Planet" as const),
        name: top.name,
        sections: [],
      };
    return { kind: top.kind, name: top.name, payload };
  }
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.lastInteractionMs = performance.now();
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
      tracking: this.tracking,
      vicinity: this.detectVicinity(),
      realScale: this.realScale,
      orbitOpacity: this.orbitOpacity,
      starBrightness: this.starBrightness,
    };
    for (const l of this.listeners) l(this.state);
  }

  /** Camera-distance-from-Sun → name for the scale region we're sitting
   *  in. Mirrors AstroGrid's "EARTH VICINITY" / "INNER SYSTEM" auto-label. */
  private detectVicinity(): string {
    // Use camera position from the Sun, in AU.
    const camWorld = this.camera.position;
    const r = Math.hypot(camWorld.x, camWorld.y, camWorld.z);
    if (r < 0.6) return "Inner Sun";
    if (r < 1.3) return "Earth Vicinity";
    if (r < 2.5) return "Inner Solar System";
    if (r < 6) return "Asteroid Belt Region";
    if (r < 12) return "Jupiter Region";
    if (r < 22) return "Saturn Region";
    if (r < 35) return "Uranus / Neptune Region";
    if (r < 80) return "Outer Solar System";
    if (r < 1500) return "Inner Heliosphere";
    if (r < 50000) return "Heliopause / Local Bubble";
    return "Interstellar Backdrop";
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
      this.refreshSatellites();
      // Step projectiles by the same dt (in days).
      const dtDays = (elapsedMs * this.timeRate) / 86400000;
      this.stepProjectiles(dtDays);
      this.publishState();
    }
    // Tracking mode keeps the camera glued to the moving focus body each
    // frame; turning it off lets the planet drift through the view as it
    // orbits.
    if (this.tracking && this.focusName !== "Sun") this.applyCamera();
    // Fade the Oort Cloud + gravity-well grid based on camera distance.
    if (this.oortCloud || this.gravityWell) {
      const cp = this.camera.position;
      const d = Math.hypot(cp.x, cp.y, cp.z);
      this.oortCloud?.updateForCamera(d);
      this.gravityWell?.updateForCamera(d);
    }
    // Standby: pause renderer.render when the tab is hidden or the user
    // has been idle for >60s. rAF keeps spinning so the next interaction
    // wakes us back up immediately.
    const settings = getSettings();
    const hidden = typeof document !== "undefined" && document.hidden;
    const idleMs = performance.now() - this.lastInteractionMs;
    const idle = idleMs > 60_000 && !this.dragging;
    const standby = settings.standby && (hidden || idle);
    if (!standby) this.renderer.render(this.scene, this.camera);
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
    window.removeEventListener("keydown", this.wake);
    this.canvas.removeEventListener("touchstart", this.wake);
    for (const o of this.orbits) {
      o.geometry.dispose();
      (o.material as LineBasicMaterial).dispose();
    }
    for (const z of this.solarZones) {
      z.geometry.dispose();
      (z.material as LineBasicMaterial).dispose();
      this.scene.remove(z);
    }
    this.solarZones = [];
    for (const p of this.planets) {
      p.sphere.geometry.dispose();
      (p.sphere.material as MeshBasicMaterial).dispose();
      const lm = p.label.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
    }
    for (const m of this.galileanMoons) {
      m.sphere.geometry.dispose();
      (m.sphere.material as MeshBasicMaterial).dispose();
      const lm = m.label.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
      this.scene.remove(m.sphere);
      this.scene.remove(m.label);
    }
    this.galileanMoons = [];
    for (const m of this.marsMoons) {
      m.sphere.geometry.dispose();
      (m.sphere.material as MeshBasicMaterial).dispose();
      const lm = m.label.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
      this.scene.remove(m.sphere);
      this.scene.remove(m.label);
    }
    this.marsMoons = [];
    this.sun.geometry.dispose();
    (this.sun.material as MeshBasicMaterial).dispose();
    if (this.starPoints) {
      this.starPoints.geometry.dispose();
      (this.starPoints.material as ShaderMaterial).dispose();
    }
    if (this.satellites) {
      this.satellites.dispose();
      this.scene.remove(this.satellites.group);
      this.satellites = null;
    }
    for (const p of this.projectiles) p.dispose(this.projectileGroup);
    this.projectiles = [];
    void this.projectileTrails; // suppress unused warning
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

/**
 * Gravity-sandbox projectile spec. The `mu` (GM) field doesn't actually
 * matter for the projectile's own motion (in test-particle integration)
 * but the visual size + glow color come from here.
 */
export type ProjectileSpec = {
  kind:
    | "Comet"
    | "Earth-class"
    | "Jupiter-class"
    | "Brown Dwarf"
    | "White Dwarf"
    | "Neutron Star"
    | "Black Hole";
  color: number;
  drawSize: number;
};

export const PROJECTILE_SPECS: Record<ProjectileSpec["kind"], ProjectileSpec> = {
  Comet: { kind: "Comet", color: 0x9adcff, drawSize: 0.04 },
  "Earth-class": { kind: "Earth-class", color: 0x6ea4ff, drawSize: 0.05 },
  "Jupiter-class": { kind: "Jupiter-class", color: 0xffd9a8, drawSize: 0.09 },
  "Brown Dwarf": { kind: "Brown Dwarf", color: 0xb45c2c, drawSize: 0.11 },
  "White Dwarf": { kind: "White Dwarf", color: 0xffffff, drawSize: 0.06 },
  "Neutron Star": { kind: "Neutron Star", color: 0xc8d6ff, drawSize: 0.05 },
  "Black Hole": { kind: "Black Hole", color: 0x2a1a3a, drawSize: 0.07 },
};

class Projectile {
  readonly spec: ProjectileSpec;
  readonly pos: Vector3;
  readonly vel: Vector3;
  private sphere: Mesh;
  private trail: BufferGeometry;
  private trailMesh: ThreeLine;
  private trailPositions: Float32Array;
  private trailIndex = 0;
  private trailFull = false;
  private static readonly TRAIL_LEN = 400;

  constructor(spec: ProjectileSpec, pos: Vector3, vel: Vector3) {
    this.spec = spec;
    this.pos = pos.clone();
    this.vel = vel.clone();

    // Sphere body
    const geom = new SphereGeometry(spec.drawSize, 16, 16);
    const mat = new MeshBasicMaterial({
      color: spec.color,
      transparent: spec.kind === "Black Hole",
      opacity: spec.kind === "Black Hole" ? 0.95 : 1.0,
    });
    this.sphere = new Mesh(geom, mat);
    this.sphere.position.copy(this.pos);

    // Trail line
    this.trailPositions = new Float32Array(Projectile.TRAIL_LEN * 3);
    this.trail = new BufferGeometry();
    this.trail.setAttribute(
      "position",
      new BufferAttribute(this.trailPositions, 3),
    );
    const trailMat = new LineBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0.6,
    });
    this.trailMesh = new ThreeLine(this.trail, trailMat);
    this.trailMesh.frustumCulled = false;
  }

  attachTo(group: Group): void {
    group.add(this.sphere);
    group.add(this.trailMesh);
  }

  /** Leapfrog integration with the bodies' point-mass gravity (GM provided). */
  step(dtDays: number, masses: Array<{ pos: Vector3; mu: number }>): void {
    const accel = (p: Vector3) => {
      const a = new Vector3();
      for (const m of masses) {
        const dx = m.pos.x - p.x;
        const dy = m.pos.y - p.y;
        const dz = m.pos.z - p.z;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 < 1e-6) continue;
        const r = Math.sqrt(r2);
        const f = m.mu / (r2 * r);
        a.x += dx * f;
        a.y += dy * f;
        a.z += dz * f;
      }
      return a;
    };
    // Leapfrog (kick-drift-kick).
    const a1 = accel(this.pos);
    this.vel.x += a1.x * (dtDays / 2);
    this.vel.y += a1.y * (dtDays / 2);
    this.vel.z += a1.z * (dtDays / 2);
    this.pos.x += this.vel.x * dtDays;
    this.pos.y += this.vel.y * dtDays;
    this.pos.z += this.vel.z * dtDays;
    const a2 = accel(this.pos);
    this.vel.x += a2.x * (dtDays / 2);
    this.vel.y += a2.y * (dtDays / 2);
    this.vel.z += a2.z * (dtDays / 2);

    this.sphere.position.copy(this.pos);
    // Update trail ring buffer.
    const i = this.trailIndex * 3;
    this.trailPositions[i] = this.pos.x;
    this.trailPositions[i + 1] = this.pos.y;
    this.trailPositions[i + 2] = this.pos.z;
    this.trailIndex = (this.trailIndex + 1) % Projectile.TRAIL_LEN;
    if (this.trailIndex === 0) this.trailFull = true;
    void this.trailFull;
    (this.trail.attributes.position as BufferAttribute).needsUpdate = true;
    this.trail.setDrawRange(
      0,
      this.trailFull ? Projectile.TRAIL_LEN : this.trailIndex,
    );
  }

  dispose(group: Group): void {
    this.sphere.geometry.dispose();
    (this.sphere.material as MeshBasicMaterial).dispose();
    group.remove(this.sphere);
    this.trail.dispose();
    (this.trailMesh.material as LineBasicMaterial).dispose();
    group.remove(this.trailMesh);
  }
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

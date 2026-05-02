import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { SURVEYS } from '../hips/surveys';
import { HipsSphere } from './hips-sphere';
import { StarField } from '../stars/star-field';
import { SolarSystem } from '../solar/solar-system';
import { IssTracker, type IssState } from '../iss/iss-tracker';
import { VoyagerControls } from './voyager-controls';

/**
 * Observable view-state the UI can subscribe to (loading veil, log-scale chip,
 * etc). One tiny pub-sub, no Zustand inside the renderer — the renderer is
 * framework-agnostic and the React layer adapts on top.
 */
export type ViewerState = {
  /** Number of base (Norder 0) HiPS tiles that have finished their first fetch. */
  baseTilesLoaded: number;
  /** Total expected base tiles (always 12 for HEALPix). */
  baseTilesTotal: number;
  /** Number of higher-order detail tiles currently mounted in the scene. */
  detailTiles: number;
  /** Number of stars in the bright-star catalog (0 until catalog loads). */
  starCount: number;
  /** Simulation time. The clock the renderer is using for ephemerides. */
  time: Date;
  /** True when the time clock is auto-advancing. */
  playing: boolean;
  /** Time speed multiplier (1 = real-time, 60 = 1 min/sec, etc). */
  timeRate: number;
  /** Current camera field of view in degrees. */
  fov: number;
  /** Camera forward vector in world Y-up cartesian coords. */
  forward: { x: number; y: number; z: number };
  /** Latest ISS state, or null if we haven't fetched yet. */
  iss: IssState | null;
};

type Listener = (s: ViewerState) => void;

/**
 * Top-level Three.js scene for the viewer.
 *
 * Render-on-demand: only run a frame when the camera changed since last draw,
 * or when a tile texture finished loading. Pauses entirely when the tab is
 * hidden. Continuous rAF on a Three.js scene burns 10-25% mobile battery per
 * 5 minutes (per Day 0 research).
 */
export class ViewerScene {
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera;
  private scene = new Scene();
  private sphere: HipsSphere;
  private stars: StarField;
  private solar: SolarSystem;
  private iss: IssTracker;
  private controls: VoyagerControls;

  private dirty = true;
  private rafHandle = 0;
  private resizeObs: ResizeObserver | null = null;
  private disposed = false;
  private lodPending = false;
  private lodTimer = 0;

  private simTime = new Date();
  private playing = false;
  private timeRate = 1;
  private lastWallClock = performance.now();

  private state: ViewerState;
  private listeners = new Set<Listener>();
  private fwd = new Vector3();

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x03050a, 1);

    this.camera = new PerspectiveCamera(60, 1, 0.001, 100);
    this.camera.position.set(0, 0, 0);

    this.sphere = new HipsSphere(SURVEYS.dss2!);
    this.scene.add(this.sphere.group);

    this.stars = new StarField();
    this.scene.add(this.stars.group);
    void this.stars
      .load('/data/hyg-bright.bin')
      .then(() => {
        this.dirty = true;
        this.state = { ...this.state, starCount: this.stars.count() };
        this.emit();
      })
      .catch((err) => console.warn('[stars] catalog load failed', err));

    this.solar = new SolarSystem();
    this.scene.add(this.solar.group);
    this.solar.update(this.simTime);

    this.iss = new IssTracker();
    this.scene.add(this.iss.group);
    this.iss.subscribe((s) => {
      this.dirty = true;
      this.state = { ...this.state, iss: s };
      this.emit();
    });
    this.iss.start();

    this.controls = new VoyagerControls(this.camera, canvas);
    this.controls.onChange = () => {
      this.dirty = true;
      this.publishState();
      this.scheduleLODUpdate();
    };

    // Aim the initial camera at the Sun so the first frame guarantees at
    // least one planet/Moon nearby in the FOV. User can drag away.
    const sunDir = this.solar.directionOf('Sun');
    if (sunDir) this.controls.setForward(sunDir);

    // Wire each base tile's load → dirty + state update.
    for (const t of this.sphere.tiles) {
      t.ready.finally(() => {
        this.dirty = true;
        this.state = {
          ...this.state,
          baseTilesLoaded: this.sphere.tiles.filter((tile) => tile.loaded)
            .length,
        };
        this.emit();
      });
    }

    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(canvas);
    this.handleResize();

    this.state = {
      baseTilesLoaded: 0,
      baseTilesTotal: this.sphere.tiles.length,
      detailTiles: 0,
      starCount: 0,
      time: this.simTime,
      playing: this.playing,
      timeRate: this.timeRate,
      fov: this.camera.fov,
      forward: { x: 0, y: 0, z: -1 },
      iss: null,
    };

    this.tick();
    this.scheduleLODUpdate();
  }

  /**
   * Debounced LOD pass. We coalesce camera-change firings to ~50 ms so a fast
   * drag doesn't kick off a fetch storm — only the *resting* frustum decides
   * which tiles get pulled.
   */
  private scheduleLODUpdate(): void {
    if (this.lodPending) return;
    this.lodPending = true;
    window.clearTimeout(this.lodTimer);
    this.lodTimer = window.setTimeout(() => {
      this.lodPending = false;
      if (this.disposed) return;
      this.camera.getWorldDirection(this.fwd);
      const changed = this.sphere.updateLOD(this.fwd, this.camera.fov);
      if (changed) {
        this.dirty = true;
        // Tile-load events from new detail tiles will mark dirty again.
        for (const t of this.sphere.tilesAll()) {
          if (!t.loaded) {
            void t.ready.finally(() => {
              this.dirty = true;
            });
          }
        }
      }
    }, 80);
  }

  private publishState(): void {
    this.camera.getWorldDirection(this.fwd);
    this.state = {
      ...this.state,
      fov: this.camera.fov,
      forward: { x: this.fwd.x, y: this.fwd.y, z: this.fwd.z },
      detailTiles: this.sphere.detailCount(),
      time: this.simTime,
      playing: this.playing,
      timeRate: this.timeRate,
    };
    this.emit();
  }

  setTime(time: Date): void {
    this.simTime = new Date(time.getTime());
    this.solar.update(this.simTime);
    this.dirty = true;
    this.publishState();
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.lastWallClock = performance.now();
    this.publishState();
  }

  setTimeRate(rate: number): void {
    this.timeRate = rate;
    this.publishState();
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /** Smooth-fly the camera so its forward points at the given world direction. */
  flyTo(direction: Vector3, durationMs = 1200): void {
    const target = direction.clone().normalize();
    const start = new Vector3();
    this.camera.getWorldDirection(start);
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const step = () => {
      if (this.disposed) return;
      const t = Math.min(1, (performance.now() - startTime) / durationMs);
      const k = ease(t);
      const interp = start.clone().lerp(target, k).normalize();
      this.controls.setForward(interp);
      this.dirty = true;
      this.publishState();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private tick = (): void => {
    if (this.disposed) return;
    this.controls.tickInertia(); // mark dirty if drifting
    if (this.controls.drifting) this.dirty = true;

    // Advance simulation time when playing.
    if (this.playing) {
      const now = performance.now();
      const elapsedMs = now - this.lastWallClock;
      this.lastWallClock = now;
      const simElapsedMs = elapsedMs * this.timeRate;
      this.simTime = new Date(this.simTime.getTime() + simElapsedMs);
      this.solar.update(this.simTime);
      this.dirty = true;
      this.publishState();
    }

    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private handleResize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /** Programmatic camera fly to a named target ("Sun", "Moon", "ISS", etc). */
  flyToTarget(target: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'ISS'): void {
    let dir: Vector3 | null = null;
    if (target === 'ISS') dir = this.iss.direction();
    else dir = this.solar.directionOf(target);
    if (dir) this.flyTo(dir);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    window.clearTimeout(this.lodTimer);
    this.resizeObs?.disconnect();
    this.controls.dispose();
    this.sphere.dispose();
    this.stars.dispose();
    this.solar.dispose();
    this.iss.dispose();
    this.renderer.dispose();
    this.listeners.clear();
  }
}

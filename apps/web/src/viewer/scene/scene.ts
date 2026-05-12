import { PerspectiveCamera, Scene, Vector3 } from "three";
import {
  createWebGLRenderer,
  tryCreateWebGPURenderer,
  type SceneRenderer,
} from "./renderer-factory";
import { getRendererPreference } from "../../lib/settings";
import { SURVEYS } from "../hips/surveys";
import { HipsSphere } from "./hips-sphere";
import { StarField } from "../stars/star-field";
import { StarLabels } from "../stars/star-labels";
import { SolarSystem } from "../solar/solar-system";
import { Spacecraft } from "../spacecraft/spacecraft";
import { IssTracker, type IssState } from "../iss/iss-tracker";
import { DsoField } from "../dso/dso-field";
import { ConstellationLines } from "../constellations/constellation-lines";
import {
  SkyCultureLines,
  type SkyCultureId,
} from "../constellations/sky-cultures";
import { CoordGrid } from "./coord-grid";
import { CosmicLandmarks } from "../cosmic/cosmic-landmarks";
import { ExoplanetField } from "../exoplanets/exoplanet-field";
import { PulsarField } from "../cosmic/pulsar-field";
import { Landmarks } from "./landmarks";
import { zenithWorldDirection } from "../observer/zenith";
import { VoyagerControls } from "./voyager-controls";
import { log } from "../../lib/logger";
import {
  mountExtrasInto,
  type ExtrasController,
} from "../extra-layers/mount";
import type { LayerMeta } from "../extra-layers/registry";

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
  /** Number of deep-sky objects loaded (0 until OpenNGC subset arrives). */
  dsoCount: number;
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
  /** Current overlay survey id (null = no overlay). */
  overlayId: string | null;
  /** Cross-fade [0..1] of the overlay against the base. */
  overlayMix: number;
  /** Whether constellation lines are visible. */
  constellations: boolean;
  /** Whether the equatorial / ecliptic / galactic coordinate grid is visible. */
  coordGrid: boolean;
  /** Whether bright-star name labels are visible. */
  starLabels: boolean;
  /** Whether iconic spacecraft markers (Voyagers, Pioneers, NH, JWST) are visible. */
  spacecraft: boolean;
  /** Whether the 6,278-entry confirmed-exoplanet field is visible. */
  exoplanets: boolean;
  /** Whether named exotic objects (Sgr A*, M87*, Crab Pulsar, GW170817 …) are visible. */
  cosmicLandmarks: boolean;
  /** Whether the 3,927-entry SIMBAD pulsar field is visible. */
  pulsars: boolean;
  /** Loaded exoplanet count (0 until catalog arrives). */
  exoplanetCount: number;
  /** Loaded pulsar count (0 until catalog arrives). */
  pulsarCount: number;
  /**
   * Active renderer backend. Starts at `"webgl"` and, if the user has
   * opted in via `getRendererPreference()`, may flip to `"webgpu"` once
   * the async swap completes successfully.
   */
  rendererKind: "webgl" | "webgpu";
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
  private renderer: SceneRenderer;
  /**
   * Tracks the currently-mounted backend so the badge/state subscriber
   * can read it without inspecting the renderer instance type.
   */
  private rendererKind: "webgl" | "webgpu" = "webgl";
  /**
   * True while a WebGPU swap is in flight; the tick loop skips
   * `renderer.render(...)` so a half-mounted backend never tries to
   * draw. Cleared on success or fallback.
   */
  private renderSuspended = false;
  private camera: PerspectiveCamera;
  private scene = new Scene();
  private sphere: HipsSphere;
  private overlaySphere: HipsSphere | null = null;
  private overlayMix = 0;
  private stars: StarField;
  private starLabels: StarLabels;
  private solar: SolarSystem;
  private spacecraft: Spacecraft;
  private exoplanets: ExoplanetField;
  private pulsars: PulsarField;
  private cosmicLandmarks: CosmicLandmarks;
  private iss: IssTracker;
  private dsos: DsoField;
  private constellations: ConstellationLines;
  private skyCulture: SkyCultureLines;
  private skyCultureId: SkyCultureId = "western";
  private coordGrid: CoordGrid;
  private landmarks: Landmarks;
  private controls: VoyagerControls;
  /** Federated extra-layer overlays mounted via the extra-layers registry. */
  private extras: ExtrasController;

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
    // The ctor cannot be async, so we always start on WebGL2 — the
    // existing, known-good codepath. If the user has opted into WebGPU
    // (or "auto"), we kick off an async swap *after* the ctor returns;
    // see `maybeSwapToWebGPU` below.
    this.renderer = createWebGLRenderer(canvas);
    this.rendererKind = "webgl";

    this.camera = new PerspectiveCamera(60, 1, 0.001, 100);
    this.camera.position.set(0, 0, 0);

    this.sphere = new HipsSphere(SURVEYS.dss2!);
    this.scene.add(this.sphere.group);

    this.stars = new StarField();
    this.scene.add(this.stars.group);
    this.starLabels = new StarLabels();
    this.scene.add(this.starLabels.group);
    void this.starLabels
      .load("/data/hyg-named.json")
      .then(() => {
        this.dirty = true;
      })
      .catch((err) => log.warn("[star-labels] load failed", err));
    void this.stars
      .load("/data/hyg-bright.bin")
      .then(() => {
        this.dirty = true;
        this.state = { ...this.state, starCount: this.stars.count() };
        this.emit();
      })
      .catch((err) => log.warn("[stars] catalog load failed", err));

    this.solar = new SolarSystem();
    this.scene.add(this.solar.group);
    this.solar.update(this.simTime);

    this.spacecraft = new Spacecraft();
    this.scene.add(this.spacecraft.group);
    this.spacecraft.update(this.simTime);

    this.exoplanets = new ExoplanetField();
    this.scene.add(this.exoplanets.group);
    void this.exoplanets
      .load("/data/exoplanets.json")
      .then(() => {
        this.dirty = true;
        this.state = {
          ...this.state,
          exoplanetCount: this.exoplanets.count(),
        };
        this.emit();
      })
      .catch((err) => log.warn("[exoplanets] load failed", err));

    this.cosmicLandmarks = new CosmicLandmarks();
    this.scene.add(this.cosmicLandmarks.group);

    this.pulsars = new PulsarField();
    this.scene.add(this.pulsars.group);
    void this.pulsars
      .load("/data/pulsars.json")
      .then(() => {
        this.dirty = true;
        this.state = {
          ...this.state,
          pulsarCount: this.pulsars.count(),
        };
        this.emit();
      })
      .catch((err) => log.warn("[pulsars] load failed", err));

    this.iss = new IssTracker();
    this.scene.add(this.iss.group);
    this.iss.subscribe((s) => {
      this.dirty = true;
      this.state = { ...this.state, iss: s };
      this.emit();
    });
    this.iss.start();

    this.dsos = new DsoField();
    this.scene.add(this.dsos.group);
    void this.dsos
      .load("/data/dso.json")
      .then(() => {
        this.dirty = true;
        this.state = { ...this.state, dsoCount: this.dsos.count() };
        this.emit();
      })
      .catch((err) => log.warn("[dso] catalog load failed", err));

    this.constellations = new ConstellationLines();
    this.scene.add(this.constellations.group);

    this.skyCulture = new SkyCultureLines();
    this.scene.add(this.skyCulture.group);

    this.coordGrid = new CoordGrid();
    this.scene.add(this.coordGrid.group);

    this.landmarks = new Landmarks();
    this.scene.add(this.landmarks.group);
    void this.constellations
      .load("/data/constellations.lines.json")
      .then(() => {
        this.dirty = true;
      })
      .catch((err) => log.warn("[constellations] load failed", err));

    // Mount every "extra layer" whose meta declares mode `sky`.
    // Each is off by default; the React layer toggles them via setExtraLayer.
    this.extras = mountExtrasInto(this.scene, "sky");
    this.extras.setTime(this.simTime.getTime());

    this.controls = new VoyagerControls(this.camera, canvas);
    this.controls.onChange = () => {
      this.dirty = true;
      this.publishState();
      this.scheduleLODUpdate();
    };

    // Aim the initial camera at the Sun so the first frame guarantees at
    // least one planet/Moon nearby in the FOV. User can drag away.
    const sunDir = this.solar.directionOf("Sun");
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
      dsoCount: 0,
      time: this.simTime,
      playing: this.playing,
      timeRate: this.timeRate,
      fov: this.camera.fov,
      forward: { x: 0, y: 0, z: -1 },
      iss: null,
      overlayId: null,
      overlayMix: 0,
      constellations: false,
      coordGrid: false,
      starLabels: false,
      spacecraft: false,
      exoplanets: false,
      cosmicLandmarks: false,
      pulsars: false,
      exoplanetCount: 0,
      pulsarCount: 0,
      rendererKind: this.rendererKind,
    };

    this.tick();
    this.scheduleLODUpdate();

    // Honour the user's renderer preference. WebGL is the default and
    // already mounted — only kick off the async path for "webgpu" /
    // "auto". Any failure rolls back silently to the WebGL2 renderer.
    const pref = getRendererPreference();
    if (pref === "webgpu" || pref === "auto") {
      void this.maybeSwapToWebGPU();
    }
  }

  /**
   * Async path: try to swap the live WebGL2 renderer for a freshly-
   * initialised WebGPU renderer attached to the same canvas. Pauses
   * the tick loop, disposes the old renderer, hot-swaps, resumes.
   *
   * Any failure (capability probe miss, dynamic import failure,
   * `await renderer.init()` throw) keeps WebGL2 mounted — the user
   * still gets a working scene; only the badge stays on "WebGL2".
   *
   * IMPORTANT: we must dispose the WebGL2 renderer *before* the
   * WebGPU renderer's GPUCanvasContext is requested, otherwise the
   * canvas already has a `webgl2` context bound and `getContext
   * ("webgpu")` returns null. The init order is:
   *   1. suspend tick.render
   *   2. dispose WebGL2 renderer (releases the WebGL2 context)
   *   3. await new WebGPURenderer(canvas).init()
   *   4. on failure, rebuild a WebGL2 renderer on the same canvas
   */
  private async maybeSwapToWebGPU(): Promise<void> {
    this.renderSuspended = true;
    const previous = this.renderer;
    try {
      // Release the WebGL2 context first — a single canvas can only
      // host one rendering context, so WebGPU's `getContext("webgpu")`
      // call inside `init()` would fail if WebGL2 still owned the
      // surface.
      previous.dispose();
      const next = await tryCreateWebGPURenderer(this.canvas);
      if (this.disposed) {
        next?.dispose();
        return;
      }
      if (next) {
        this.renderer = next;
        this.rendererKind = "webgpu";
        // Re-apply size now that the new backend owns the surface —
        // the pixel-ratio was set inside the factory but the canvas
        // client dimensions may have changed during the init wait.
        this.handleResize();
        this.state = { ...this.state, rendererKind: this.rendererKind };
        this.emit();
        log.info("[scene] renderer swapped to WebGPU");
        return;
      }
      // WebGPU failed: rebuild WebGL2 on the same canvas so rendering
      // can resume. This is the safe fallback path the rest of the
      // scene already expects.
      this.renderer = createWebGLRenderer(this.canvas);
      this.rendererKind = "webgl";
      this.handleResize();
      log.warn("[scene] WebGPU swap failed; rebuilt WebGL2 renderer");
    } catch (err) {
      log.warn("[scene] renderer swap errored; rebuilding WebGL2", err);
      // Defensive: if anything threw past the WebGL dispose, the scene
      // is left without a renderer. Rebuild WebGL2 unconditionally.
      try {
        this.renderer = createWebGLRenderer(this.canvas);
        this.rendererKind = "webgl";
        this.handleResize();
      } catch (rebuildErr) {
        log.error(
          "[scene] catastrophic: failed to rebuild WebGL2 after WebGPU swap",
          rebuildErr,
        );
      }
    } finally {
      this.renderSuspended = false;
      this.dirty = true;
    }
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
      const baseChanged = this.sphere.updateLOD(this.fwd, this.camera.fov);
      const overlayChanged =
        this.overlaySphere?.updateLOD(this.fwd, this.camera.fov) ?? false;
      const changed = baseChanged || overlayChanged;
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
        if (this.overlaySphere) {
          // Push overlay opacity to any new tiles spun up by updateLOD.
          this.applyOverlayMix();
          for (const t of this.overlaySphere.tilesAll()) {
            if (!t.loaded) {
              void t.ready.finally(() => {
                this.dirty = true;
                this.applyOverlayMix();
              });
            }
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
      overlayId: this.overlaySphere?.survey().id ?? null,
      overlayMix: this.overlayMix,
      constellations: this.constellations?.group.visible ?? false,
      coordGrid: this.coordGrid?.group.visible ?? false,
      starLabels: this.starLabels?.group.visible ?? false,
      spacecraft: this.spacecraft?.visible() ?? false,
      exoplanets: this.exoplanets?.visible() ?? false,
      cosmicLandmarks: this.cosmicLandmarks?.visible() ?? false,
      pulsars: this.pulsars?.visible() ?? false,
      exoplanetCount: this.exoplanets?.count() ?? 0,
      pulsarCount: this.pulsars?.count() ?? 0,
      rendererKind: this.rendererKind,
    };
    this.emit();
  }

  setTime(time: Date): void {
    this.simTime = new Date(time.getTime());
    this.solar.update(this.simTime);
    this.spacecraft.update(this.simTime);
    this.extras.setTime(this.simTime.getTime());
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

  /**
   * Multi-wavelength overlay. Pass a survey id from SURVEYS to enable, or
   * null to remove. Initial overlay opacity is 0.6 — the user can refine
   * with `setOverlayMix`.
   */
  setOverlay(surveyId: string | null): void {
    if (surveyId === null) {
      if (this.overlaySphere) {
        this.scene.remove(this.overlaySphere.group);
        this.overlaySphere.dispose();
        this.overlaySphere = null;
      }
      this.overlayMix = 0;
      this.dirty = true;
      this.publishState();
      return;
    }
    const survey = SURVEYS[surveyId];
    if (!survey) return;
    if (!this.overlaySphere) {
      // renderOrderOffset=5 pushes overlay tiles to renderOrder -5 (base)
      // and -3 (detail), strictly above the background sphere's -10/-8.
      this.overlaySphere = new HipsSphere(survey, 5);
      this.scene.add(this.overlaySphere.group);
      this.overlayMix = 0.6;
    } else {
      this.overlaySphere.setSurvey(survey);
    }
    this.applyOverlayMix();
    this.dirty = true;
    this.publishState();
    // Dirty again as overlay tiles land.
    for (const t of this.overlaySphere.tiles) {
      void t.ready.finally(() => {
        this.dirty = true;
      });
    }
  }

  setOverlayMix(mix: number): void {
    this.overlayMix = Math.max(0, Math.min(1, mix));
    this.applyOverlayMix();
    this.dirty = true;
    this.publishState();
  }

  /**
   * Toggle Sky Atlas projection mode.
   *
   * v1: hides the 3D HiPS celestial sphere and locks the camera to a fixed
   * forward (RA = 0, Dec = 0) when 2D Aitoff is active, so the existing
   * star/constellation/grid layers — all parented to the same sphere —
   * appear in a flattened band-like view. The full per-vertex Aitoff
   * shader path lives in `sky-atlas/projection-shader.ts` and will be
   * wired into the per-tile/per-point materials in a follow-up.
   *
   * Note: this is a deliberate stop-gap. The shader module + UI toggle +
   * settings persistence are all in place, so the per-layer reprojection
   * can land incrementally without touching this surface.
   */
  setProjection(mode: "3d" | "aitoff"): void {
    const aitoff = mode === "aitoff";
    // Hide HiPS background tiles in 2D mode (the Aitoff layer would
    // re-render them via the shader fragment instead).
    this.sphere.group.visible = !aitoff;
    if (this.overlaySphere) this.overlaySphere.group.visible = !aitoff;
    this.dirty = true;
    this.publishState();
  }

  setConstellations(visible: boolean): void {
    this.constellations.setVisible(visible);
    // The non-Western culture overlay shares the constellations toggle:
    // when constellations are off, all line figures hide; when on, the
    // active culture (if any non-Western) renders alongside the IAU set.
    this.skyCulture.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  setSkyCulture(id: SkyCultureId): void {
    this.skyCultureId = id;
    this.skyCulture.setCulture(id);
    // Keep IAU lines visible as the "western" baseline regardless of
    // which non-Western culture is selected. The user can hide all line
    // figures via `setConstellations(false)`.
    this.skyCulture.setVisible(this.constellations.group.visible);
    this.dirty = true;
    this.publishState();
  }

  getSkyCulture(): SkyCultureId {
    return this.skyCultureId;
  }

  setCoordGrid(visible: boolean): void {
    this.coordGrid.setVisible(visible);
    this.landmarks.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  setStarLabels(visible: boolean): void {
    this.starLabels.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  setSpacecraft(visible: boolean): void {
    this.spacecraft.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  setExoplanets(visible: boolean): void {
    this.exoplanets.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  setCosmicLandmarks(visible: boolean): void {
    this.cosmicLandmarks.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  setPulsars(visible: boolean): void {
    this.pulsars.setVisible(visible);
    this.dirty = true;
    this.publishState();
  }

  /** Toggle a federated-data extra layer by its registry id. */
  setExtraLayer(id: string, enabled: boolean): void {
    this.extras.setEnabled(id, enabled);
    this.dirty = true;
  }

  /** Toggle a sub-layer inside a composite extra layer (e.g. IceCube inside Multi-messenger). */
  setExtraSubLayer(layerId: string, subId: string, on: boolean): void {
    this.extras.setSubLayer(layerId, subId, on);
    this.dirty = true;
  }

  /** Metadata for every extra layer mounted in this scene (sky mode). */
  listExtraLayers(): LayerMeta[] {
    return this.extras.listMounted();
  }

  /**
   * Return the host-facing API exposed by a loaded extra layer, if any.
   * Used by React panels that drive module-specific behavior (e.g. the
   * multi-messenger chirp player).
   */
  getExtraLayerApi(id: string): unknown {
    return this.extras.getLayerApi(id);
  }

  /** Force-load an extra layer module without enabling its visuals. */
  ensureExtraLayerLoaded(id: string): Promise<void> {
    return this.extras.ensureLoaded(id);
  }

  exoplanetList(): ReturnType<ExoplanetField["list"]> {
    return this.exoplanets.list();
  }

  cosmicLandmarkList(): ReturnType<CosmicLandmarks["list"]> {
    return this.cosmicLandmarks.list();
  }

  /** Iterate the spacecraft layer for tap-to-fly + click resolution. */
  spacecraftDirection(name: string): { x: number; y: number; z: number } | null {
    return this.spacecraft.directionOf(name);
  }

  spacecraftList(): ReturnType<Spacecraft["list"]> {
    return this.spacecraft.list();
  }

  spacecraftLayerVisible(): boolean {
    return this.spacecraft.visible();
  }

  private applyOverlayMix(): void {
    if (!this.overlaySphere) return;
    this.overlaySphere.setOpacity(this.overlayMix);
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
      this.spacecraft.update(this.simTime);
      this.extras.setTime(this.simTime.getTime());
      this.dirty = true;
      this.publishState();
    }

    if (this.dirty && !this.renderSuspended) {
      // `WebGPURenderer.render` returns `Promise<void>`, WebGLRenderer
      // returns `void`. We don't await — Three.js queues internally and
      // we just need the call site to schedule it.
      void this.renderer.render(this.scene, this.camera);
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
  flyToTarget(
    target:
      | "Sun"
      | "Moon"
      | "Mercury"
      | "Venus"
      | "Mars"
      | "Jupiter"
      | "Saturn"
      | "Uranus"
      | "Neptune"
      | "ISS",
  ): void {
    let dir: Vector3 | null = null;
    if (target === "ISS") dir = this.iss.direction();
    else dir = this.solar.directionOf(target);
    if (dir) this.flyTo(dir);
  }

  /**
   * Tonight's-sky framing: aim the camera straight up from the user's
   * location at the current simulation time. (lat, lon) in degrees, lon
   * positive east.
   */
  flyToZenith(lat: number, lonEast: number): void {
    const dir = zenithWorldDirection(lat, lonEast, this.simTime);
    this.flyTo(dir, 1500);
  }

  /**
   * Set camera orientation from explicit (yaw, pitch) radians. Used by
   * the gyroscope AR controller — converts to a forward vector and reuses
   * the existing VoyagerControls.setForward path so inertia is reset
   * cleanly. yaw is around world-up, pitch around the right-axis, both
   * matching the VoyagerControls YXZ Euler convention.
   */
  setCameraDirection(yaw: number, pitch: number): void {
    if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
    const clampedPitch = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, pitch),
    );
    const fwd = new Vector3(
      Math.cos(clampedPitch) * Math.sin(yaw),
      Math.sin(clampedPitch),
      -Math.cos(clampedPitch) * Math.cos(yaw),
    );
    this.controls.setForward(fwd);
    this.dirty = true;
    this.publishState();
  }

  /** Programmatically set the camera FOV (used by the tour system). */
  setFov(deg: number): void {
    const target = Math.max(6, Math.min(100, deg));
    this.controls.fov = target;
    this.camera.fov = target;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.publishState();
  }

  /**
   * Force one immediate render and return the canvas as a PNG data URL.
   * Used by the snapshot button so the reader gets a deterministic image
   * regardless of whether render-on-demand has skipped this frame.
   */
  snapshotPng(): string {
    // Both backends accept this call shape; WebGPURenderer returns a
    // Promise we intentionally don't await — by the time the user
    // clicks the snapshot button the most recent frame is already on
    // the surface and `toDataURL()` reads the existing framebuffer.
    void this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL("image/png");
  }

  /** Resolve a body name to its current direction (used by the tour). */
  bodyDirection(name: string): Vector3 | null {
    if (name === "ISS") return this.iss.direction();
    return this.solar.directionOf(name);
  }

  /**
   * Pause / resume the Voyager pointer + wheel controls. Used by AR Sky
   * mode to hand camera control to the device gyroscope without leaking
   * drag listeners. The renderer keeps rendering; only input is gated.
   */
  setControlsEnabled(enabled: boolean): void {
    this.controls.setActive(enabled);
  }

  /** Current camera FOV in degrees. */
  getFov(): number {
    return this.camera.fov;
  }

  /** Current camera forward direction in world Y-up coords. */
  getForward(): Vector3 {
    const out = new Vector3();
    this.camera.getWorldDirection(out);
    return out;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafHandle);
    window.clearTimeout(this.lodTimer);
    this.resizeObs?.disconnect();
    this.controls.dispose();
    this.sphere.dispose();
    if (this.overlaySphere) {
      this.scene.remove(this.overlaySphere.group);
      this.overlaySphere.dispose();
      this.overlaySphere = null;
    }
    this.stars.dispose();
    this.starLabels.dispose();
    this.dsos.dispose();
    this.constellations.dispose();
    this.skyCulture.dispose();
    this.coordGrid.dispose();
    this.landmarks.dispose();
    this.solar.dispose();
    this.spacecraft.dispose();
    this.exoplanets.dispose();
    this.pulsars.dispose();
    this.cosmicLandmarks.dispose();
    this.iss.dispose();
    this.extras.dispose();
    this.renderer.dispose();
    this.listeners.clear();
  }
}

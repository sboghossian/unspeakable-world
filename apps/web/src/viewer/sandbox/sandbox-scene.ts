import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import type {
  Body,
  LaunchSpeed,
  ProjectileKind,
  SandboxScenePreset,
  SandboxState,
  SimSpeedKey,
} from "./types";
import { computeAccelerations, pushTrail, resolveCollisions, stepVerlet } from "./physics";
import {
  BASE_LAUNCH_SPEED,
  LAUNCH_SPEED_MULT,
  PROJECTILES,
} from "./projectiles";
import { buildScene, freshId } from "./scenes";

/** Days simulated per real-time second, per sim-speed preset. */
const SIM_SPEED_DAYS_PER_SEC: Record<SimSpeedKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "6mo": 182.625,
  "1y": 365.25,
};

const BODY_CAP = 64;
const SUBSTEP_CAP = 16;
const TRAIL_SAMPLE_EVERY_N_STEPS = 4;
const TRAIL_MAX_POINTS = 500;

type Listener = (s: SandboxState) => void;

type BodyVisual = {
  mesh: Mesh;
  glow: Sprite | null;
  trailLine: Line;
  trailGeometry: BufferGeometry;
  trailPositions: Float32Array;
  trailCount: number;
};

export class SandboxScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly bodiesGroup: Group;
  private readonly trailsGroup: Group;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();

  private bodies: Body[] = [];
  private visuals = new Map<number, BodyVisual>();

  private state: SandboxState;
  private listeners = new Set<Listener>();

  // Camera control state
  private cameraTarget = new Vector3(0, 0, 0);
  private cameraDistance = 8;
  private cameraYaw = 0.5;
  private cameraPitch = 0.4;
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Physics control
  private paused = false;
  private trailStepCounter = 0;

  // FPS tracking
  private fpsAccum = 0;
  private fpsFrames = 0;

  private rafId = 0;
  private lastTime = performance.now();
  private resizeObserver: ResizeObserver | null = null;

  private aimVisible = false;
  private aimPoint = new Vector3();
  private readonly aimMesh: Mesh;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setClearColor(0x020415, 1);

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      55,
      canvas.clientWidth / Math.max(1, canvas.clientHeight),
      0.001,
      10000,
    );

    this.bodiesGroup = new Group();
    this.trailsGroup = new Group();
    this.scene.add(this.trailsGroup);
    this.scene.add(this.bodiesGroup);

    // Aim indicator: a faint ring on the ecliptic plane that follows the cursor.
    const aimGeom = new SphereGeometry(0.04, 16, 12);
    const aimMat = new MeshBasicMaterial({
      color: 0xff8c2a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.aimMesh = new Mesh(aimGeom, aimMat);
    this.scene.add(this.aimMesh);

    this.state = {
      bodyCount: 0,
      selectedKind: "comet",
      launchSpeed: "normal",
      simSpeed: "30d",
      scenePreset: "inner-solar",
      paused: false,
      fps: 60,
    };

    this.installInput();
    this.installResize();

    this.loadScene(this.state.scenePreset);
    this.updateCamera();

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  // ---------- Public API ----------

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setSelectedKind(k: ProjectileKind): void {
    this.state = { ...this.state, selectedKind: k };
    this.notify();
  }

  setLaunchSpeed(s: LaunchSpeed): void {
    this.state = { ...this.state, launchSpeed: s };
    this.notify();
  }

  setSimSpeed(s: SimSpeedKey): void {
    this.state = { ...this.state, simSpeed: s };
    this.notify();
  }

  setScenePreset(p: SandboxScenePreset): void {
    this.loadScene(p);
  }

  setPaused(p: boolean): void {
    this.paused = p;
    this.state = { ...this.state, paused: p };
    this.notify();
  }

  togglePaused(): void {
    this.setPaused(!this.paused);
  }

  reset(): void {
    this.loadScene(this.state.scenePreset);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.removeInput();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    for (const v of this.visuals.values()) {
      v.mesh.geometry.dispose();
      (v.mesh.material as MeshBasicMaterial).dispose();
      if (v.glow) {
        v.glow.material.dispose();
        const map = v.glow.material.map;
        if (map) map.dispose();
      }
      v.trailGeometry.dispose();
      (v.trailLine.material as LineBasicMaterial).dispose();
    }
    this.visuals.clear();
    (this.aimMesh.material as MeshBasicMaterial).dispose();
    this.aimMesh.geometry.dispose();
    this.renderer.dispose();
  }

  // ---------- Scene management ----------

  private loadScene(preset: SandboxScenePreset): void {
    for (const v of this.visuals.values()) {
      this.bodiesGroup.remove(v.mesh);
      this.trailsGroup.remove(v.trailLine);
      v.mesh.geometry.dispose();
      (v.mesh.material as MeshBasicMaterial).dispose();
      if (v.glow) {
        v.glow.material.dispose();
        const map = v.glow.material.map;
        if (map) map.dispose();
      }
      v.trailGeometry.dispose();
      (v.trailLine.material as LineBasicMaterial).dispose();
    }
    this.visuals.clear();
    this.bodies = buildScene(preset);
    for (const b of this.bodies) {
      this.addVisualFor(b);
    }
    computeAccelerations(this.bodies);
    this.state = {
      ...this.state,
      scenePreset: preset,
      bodyCount: this.bodies.length,
    };
    this.notify();
  }

  private addVisualFor(b: Body): void {
    const geom = new SphereGeometry(b.visualRadius, 24, 16);
    const mat = new MeshBasicMaterial({ color: b.color });
    const mesh = new Mesh(geom, mat);
    mesh.position.set(b.position[0], b.position[1], b.position[2]);
    this.bodiesGroup.add(mesh);

    let glow: Sprite | null = null;
    // Don't draw a glow for the literal black hole interior (black-on-black).
    if (b.kind !== "black-hole" && b.color !== 0x000000) {
      const tint = b.kind === "sun" ? 0xfff0c0 : (PROJECTILES[b.kind as ProjectileKind]?.glow ?? b.color);
      const glowMap = makeGlowTexture(tint);
      const glowMat = new SpriteMaterial({
        map: glowMap,
        color: new Color(tint),
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.85,
      });
      glow = new Sprite(glowMat);
      const glowSize = b.visualRadius * 3.5;
      glow.scale.set(glowSize, glowSize, glowSize);
      glow.position.copy(mesh.position);
      this.bodiesGroup.add(glow);
    } else if (b.kind === "black-hole") {
      // Hot accretion-ring sprite around the inky core.
      const ringMap = makeGlowTexture(0xff8c2a);
      const ringMat = new SpriteMaterial({
        map: ringMap,
        color: new Color(0xff8c2a),
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      });
      glow = new Sprite(ringMat);
      const glowSize = b.visualRadius * 4.5;
      glow.scale.set(glowSize, glowSize, glowSize);
      glow.position.copy(mesh.position);
      this.bodiesGroup.add(glow);
    }

    const trailPositions = new Float32Array(TRAIL_MAX_POINTS * 3);
    const trailGeometry = new BufferGeometry();
    trailGeometry.setAttribute(
      "position",
      new BufferAttribute(trailPositions, 3),
    );
    trailGeometry.setDrawRange(0, 0);
    const trailMat = new LineBasicMaterial({
      color: b.color === 0x000000 ? 0x444444 : b.color,
      transparent: true,
      opacity: 0.55,
    });
    const trailLine = new Line(trailGeometry, trailMat);
    this.trailsGroup.add(trailLine);

    this.visuals.set(b.id, {
      mesh,
      glow,
      trailLine,
      trailGeometry,
      trailPositions,
      trailCount: 0,
    });
  }

  private removeVisual(id: number): void {
    const v = this.visuals.get(id);
    if (!v) return;
    this.bodiesGroup.remove(v.mesh);
    if (v.glow) this.bodiesGroup.remove(v.glow);
    this.trailsGroup.remove(v.trailLine);
    v.mesh.geometry.dispose();
    (v.mesh.material as MeshBasicMaterial).dispose();
    if (v.glow) {
      v.glow.material.dispose();
      const map = v.glow.material.map;
      if (map) map.dispose();
    }
    v.trailGeometry.dispose();
    (v.trailLine.material as LineBasicMaterial).dispose();
    this.visuals.delete(id);
  }

  // ---------- Launch ----------

  /**
   * Launch a projectile from the camera position toward the cursor's
   * world-space point on the ecliptic plane (y = 0).
   */
  launchAt(point: Vector3): void {
    if (this.bodies.length >= BODY_CAP) {
      // Recycle: remove the oldest "launched" (non-default) body.
      const oldestIdx = this.bodies.findIndex(
        (b) => b.kind !== "sun" && b.kind !== "planet",
      );
      if (oldestIdx >= 0) {
        const removed = this.bodies.splice(oldestIdx, 1)[0];
        if (removed) this.removeVisual(removed.id);
      }
    }

    const preset = PROJECTILES[this.state.selectedKind];
    if (!preset) return;

    const origin = this.camera.position.clone();
    const dir = point.clone().sub(origin).normalize();
    const speed =
      BASE_LAUNCH_SPEED * LAUNCH_SPEED_MULT[this.state.launchSpeed];

    const body: Body = {
      id: freshId(),
      kind: preset.kind,
      label: preset.label,
      mass: preset.mass,
      radius: preset.radius,
      visualRadius: preset.visualRadius,
      color: preset.color,
      position: [origin.x, origin.y, origin.z],
      velocity: [dir.x * speed, dir.y * speed, dir.z * speed],
      acceleration: [0, 0, 0],
      pinned: false,
      trail: [],
    };

    this.bodies.push(body);
    this.addVisualFor(body);
    computeAccelerations(this.bodies);

    this.state = { ...this.state, bodyCount: this.bodies.length };
    this.notify();
  }

  // ---------- Frame loop ----------

  private tick = (now: number): void => {
    this.rafId = requestAnimationFrame(this.tick);
    const dtReal = Math.min(0.1, (now - this.lastTime) / 1000); // seconds
    this.lastTime = now;

    if (!this.paused) {
      const daysPerSec = SIM_SPEED_DAYS_PER_SEC[this.state.simSpeed];
      const dtDays = dtReal * daysPerSec;
      const baseStep = 0.001;
      let substeps = Math.ceil(dtDays / baseStep);
      if (substeps > SUBSTEP_CAP) substeps = SUBSTEP_CAP;
      const stepDt = dtDays / Math.max(1, substeps);
      let anyAbsorbed = false;
      for (let s = 0; s < substeps; s++) {
        stepVerlet(this.bodies, stepDt);
        const absorbed = resolveCollisions(this.bodies);
        if (absorbed.length > 0) {
          for (const id of absorbed) this.removeVisual(id);
          anyAbsorbed = true;
        }
        this.trailStepCounter++;
        if (this.trailStepCounter % TRAIL_SAMPLE_EVERY_N_STEPS === 0) {
          for (const b of this.bodies) pushTrail(b);
        }
      }
      if (anyAbsorbed) {
        this.state = { ...this.state, bodyCount: this.bodies.length };
      }
    }

    this.syncVisuals();
    this.updateAim();
    this.renderer.render(this.scene, this.camera);

    // FPS averaging
    this.fpsFrames++;
    this.fpsAccum += dtReal;
    if (this.fpsAccum >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.state = { ...this.state, fps };
      this.fpsFrames = 0;
      this.fpsAccum = 0;
      this.notify();
    }
  };

  private syncVisuals(): void {
    for (const b of this.bodies) {
      const v = this.visuals.get(b.id);
      if (!v) continue;
      v.mesh.position.set(b.position[0], b.position[1], b.position[2]);
      if (v.glow) v.glow.position.copy(v.mesh.position);

      // Update trail buffer from b.trail
      const need = Math.min(b.trail.length, TRAIL_MAX_POINTS);
      for (let i = 0; i < need; i++) {
        const p = b.trail[i];
        if (!p) continue;
        const base = i * 3;
        v.trailPositions[base] = p[0];
        v.trailPositions[base + 1] = p[1];
        v.trailPositions[base + 2] = p[2];
      }
      if (need !== v.trailCount) {
        v.trailGeometry.setDrawRange(0, need);
        v.trailCount = need;
      }
      v.trailGeometry.attributes.position!.needsUpdate = true;
    }
  }

  // ---------- Camera ----------

  private updateCamera(): void {
    const cp = Math.cos(this.cameraPitch);
    const sp = Math.sin(this.cameraPitch);
    const cy = Math.cos(this.cameraYaw);
    const sy = Math.sin(this.cameraYaw);
    const r = this.cameraDistance;
    this.camera.position.set(
      this.cameraTarget.x + r * cp * sy,
      this.cameraTarget.y + r * sp,
      this.cameraTarget.z + r * cp * cy,
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private updateAim(): void {
    this.aimMesh.visible = this.aimVisible;
    if (this.aimVisible) {
      this.aimMesh.position.copy(this.aimPoint);
      (this.aimMesh.material as MeshBasicMaterial).opacity = 0.8;
    }
  }

  // ---------- Input ----------

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button === 2 || e.shiftKey) {
      const p = this.pickEcliptic(e);
      if (p) this.launchAt(p);
      return;
    }
    if (e.button === 0) {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.canvas.setPointerCapture?.(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.isDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.cameraYaw -= dx * 0.005;
      this.cameraPitch += dy * 0.005;
      const lim = Math.PI / 2 - 0.05;
      if (this.cameraPitch > lim) this.cameraPitch = lim;
      if (this.cameraPitch < -lim) this.cameraPitch = -lim;
      this.updateCamera();
      return;
    }
    const p = this.pickEcliptic(e);
    if (p) {
      this.aimVisible = true;
      this.aimPoint.copy(p);
    } else {
      this.aimVisible = false;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      try {
        this.canvas.releasePointerCapture?.(e.pointerId);
      } catch {
        // older browsers may throw if not captured
      }
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.0015);
    this.cameraDistance *= factor;
    if (this.cameraDistance < 0.5) this.cameraDistance = 0.5;
    if (this.cameraDistance > 200) this.cameraDistance = 200;
    this.updateCamera();
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === " ") {
      e.preventDefault();
      this.togglePaused();
    } else if (e.key === "r" || e.key === "R") {
      this.reset();
    }
  };

  private installInput(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("keydown", this.onKeyDown);
  }

  private removeInput(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  private installResize(): void {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas);
  }

  private handleResize(): void {
    const w = this.canvas.clientWidth;
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- Picking ----------

  /** Cast a ray from the cursor and intersect with the y=0 plane. */
  private pickEcliptic(e: PointerEvent | MouseEvent): Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const dir = this.raycaster.ray.direction;
    if (Math.abs(dir.y) < 1e-6) return null;
    const t = -this.raycaster.ray.origin.y / dir.y;
    if (t < 0) return null;
    return new Vector3()
      .copy(this.raycaster.ray.origin)
      .addScaledVector(dir, t);
  }

  // ---------- Internal ----------

  private notify(): void {
    for (const l of this.listeners) l(this.state);
  }
}

/** Render a soft radial glow into a 64×64 canvas for sprites. */
function makeGlowTexture(tint: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new CanvasTexture(canvas);
  }
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 32);
  const r = (tint >> 16) & 0xff;
  const g = (tint >> 8) & 0xff;
  const b = tint & 0xff;
  grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(canvas);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

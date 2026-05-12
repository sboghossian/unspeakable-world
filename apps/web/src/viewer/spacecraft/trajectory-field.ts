import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LinearFilter,
  type PerspectiveCamera,
  type Raycaster,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from "three";
import {
  SPACECRAFT_CATALOG,
  type SpacecraftSlug,
  type SpacecraftSpec,
  type TrajectorySamples,
} from "./trajectories-data";

/**
 * 🛰 Spacecraft trajectory field — Three.js Group rendering real
 * heliocentric trajectories for the curated set of iconic missions
 * (Voyager 1, Voyager 2, New Horizons, JWST, Parker Solar Probe).
 *
 * Per spacecraft we draw:
 *
 *   1. A solid colored polyline for the past trajectory (launch → now).
 *   2. A dashed colored polyline for the future projected path
 *      (now → end of baked window, typically 2030).
 *   3. A small colored sprite marker at the current sample position,
 *      linearly interpolated between bracketing samples.
 *   4. A name label that fades in when the camera is close enough.
 *
 * Trajectories use the same heliocentric ecliptic AU frame the
 * solar-flight scene uses for the planets — 1 scene unit = 1 AU, with
 * (x, y, z) ↦ (x, z, -y) to map ecliptic-Z-up to scene-Y-up.
 */

/** Per-frame distance threshold for the spacecraft name label. */
const LABEL_MAX_AU = 8;

/** Map heliocentric ecliptic (x, y, z) AU into scene-Y-up units. */
function eclipticToScene(x: number, y: number, z: number, out: Vector3): void {
  out.set(x, z, -y);
}

function dateToJD(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

type Entry = {
  spec: SpacecraftSpec;
  /** Scene-space sample positions (length = samples × 3). */
  sceneXYZ: Float32Array;
  /** Source ecliptic positions (length = samples × 3) used for
   *  positionOf / current heliocentric distance reporting. */
  eclipticXYZ: Float32Array;
  epochJDs: Float32Array;
  /** Solid polyline (past). */
  pastLine: Line;
  /** Dashed polyline (future). */
  futureLine: Line;
  /** Current-position sprite marker. */
  marker: Sprite;
  /** Name label sprite. */
  label: Sprite;
  /** Most recent interpolated scene position (mutated per frame). */
  current: Vector3;
  /** Most recent interpolated ecliptic position (for distance/speed). */
  currentEcliptic: Vector3;
  /** Most recent speed in km/s (computed from sample bracket). */
  currentSpeedKmS: number;
};

export type SpacecraftStatus = {
  slug: SpacecraftSlug;
  name: string;
  color: string;
  /** Current heliocentric distance in AU. */
  distanceAU: number;
  /** Approximate current speed in km/s. */
  speedKmS: number;
  /** Direction from Sun (origin) to the spacecraft as a unit vector in
   *  scene-Y-up coordinates — fed to setFocus / camera framing. */
  direction: { x: number; y: number; z: number };
  /** Scene-space (AU) position vector of the spacecraft. */
  position: { x: number; y: number; z: number };
  /** Summary text for the panel. */
  summary: string;
};

export class TrajectoryField extends Group {
  private entries: Entry[] = [];
  private bySlug = new Map<SpacecraftSlug, Entry>();
  private allVisible = false;
  private cameraWorld = new Vector3();
  private tmp = new Vector3();
  private lastSimTime = new Date();

  constructor(samples: readonly TrajectorySamples[]) {
    super();
    this.name = "TrajectoryField";
    for (const s of samples) {
      const spec = SPACECRAFT_CATALOG.find((x) => x.slug === s.slug);
      if (!spec) continue;
      this.addEntry(spec, s);
    }
  }

  private addEntry(spec: SpacecraftSpec, samples: TrajectorySamples): void {
    const n = samples.epochJDs.length;
    if (n < 2) return;

    // Build scene-space xyz from ecliptic xyz.
    const sceneXYZ = new Float32Array(n * 3);
    const tmp = new Vector3();
    for (let i = 0; i < n; i++) {
      eclipticToScene(
        samples.polyline[i * 3] ?? 0,
        samples.polyline[i * 3 + 1] ?? 0,
        samples.polyline[i * 3 + 2] ?? 0,
        tmp,
      );
      sceneXYZ[i * 3] = tmp.x;
      sceneXYZ[i * 3 + 1] = tmp.y;
      sceneXYZ[i * 3 + 2] = tmp.z;
    }

    const colorHex = new Color(spec.color).getHex();

    // The past + future lines share the same vertex array — we just
    // toggle attribute draw ranges at update time. Cheaper than
    // rebuilding geometries every frame.
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(sceneXYZ, 3));

    const pastMat = new LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const pastLine = new Line(geom, pastMat);
    pastLine.frustumCulled = false;
    pastLine.renderOrder = 1.6;
    this.add(pastLine);

    // Dashed future line — shares the same geometry. Three.js needs
    // computeLineDistances() to be called once the draw range is set,
    // which we do at update time.
    const futureMat = new LineDashedMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      dashSize: 0.15,
      gapSize: 0.08,
    });
    const futureLine = new Line(geom, futureMat);
    futureLine.frustumCulled = false;
    futureLine.renderOrder = 1.55;
    this.add(futureLine);

    const marker = makeDotSprite(colorHex);
    marker.scale.set(0.07, 0.07, 1);
    marker.renderOrder = 1.8;
    this.add(marker);

    const label = makeLabelSprite(spec.name, colorHex);
    const img = label.material.map?.image as HTMLCanvasElement | undefined;
    const aspect = img ? img.width / img.height : 4;
    const h = 0.055;
    label.scale.set(h * aspect, h, 1);
    label.renderOrder = 1.9;
    this.add(label);

    // Default off — wired in via setAllVisible / setVisible.
    pastLine.visible = false;
    futureLine.visible = false;
    marker.visible = false;
    label.visible = false;

    const entry: Entry = {
      spec,
      sceneXYZ,
      eclipticXYZ: samples.polyline,
      epochJDs: samples.epochJDs,
      pastLine,
      futureLine,
      marker,
      label,
      current: new Vector3(),
      currentEcliptic: new Vector3(),
      currentSpeedKmS: 0,
    };
    this.entries.push(entry);
    this.bySlug.set(spec.slug, entry);
  }

  /** Toggle every spacecraft on/off as a unit. */
  setAllVisible(on: boolean): void {
    this.allVisible = on;
    for (const e of this.entries) {
      e.pastLine.visible = on;
      e.futureLine.visible = on;
      e.marker.visible = on;
      e.label.visible = on;
    }
  }

  visible_(): boolean {
    return this.allVisible;
  }

  /** Toggle one spacecraft. */
  setVisible(slug: SpacecraftSlug, on: boolean): void {
    const e = this.bySlug.get(slug);
    if (!e) return;
    e.pastLine.visible = on;
    e.futureLine.visible = on;
    e.marker.visible = on;
    e.label.visible = on;
  }

  /**
   * Update for the given sim time: re-interpolate marker positions,
   * adjust past/future line draw ranges, and gate label visibility by
   * camera distance.
   */
  setSimTime(date: Date, cameraWorldPos?: Vector3): void {
    this.lastSimTime = date;
    const jd = dateToJD(date);
    if (cameraWorldPos) this.cameraWorld.copy(cameraWorldPos);
    for (const e of this.entries) {
      this.updateEntry(e, jd, cameraWorldPos);
    }
  }

  private updateEntry(e: Entry, jd: number, camWorld?: Vector3): void {
    const jds = e.epochJDs;
    const last = jds.length - 1;
    if (last < 0) return;

    // Find the bracket [lo, hi] such that jds[lo] ≤ jd ≤ jds[hi].
    let lo = 0;
    let hi = last;
    if (jd <= (jds[0] ?? 0)) {
      lo = 0;
      hi = 0;
    } else if (jd >= (jds[last] ?? 0)) {
      lo = last;
      hi = last;
    } else {
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if ((jds[mid] ?? 0) <= jd) lo = mid;
        else hi = mid;
      }
    }
    const j0 = jds[lo] ?? 0;
    const j1 = jds[hi] ?? 0;
    const t = j1 === j0 ? 0 : (jd - j0) / (j1 - j0);

    // Interpolate scene-space position.
    const sx0 = e.sceneXYZ[lo * 3] ?? 0;
    const sy0 = e.sceneXYZ[lo * 3 + 1] ?? 0;
    const sz0 = e.sceneXYZ[lo * 3 + 2] ?? 0;
    const sx1 = e.sceneXYZ[hi * 3] ?? 0;
    const sy1 = e.sceneXYZ[hi * 3 + 1] ?? 0;
    const sz1 = e.sceneXYZ[hi * 3 + 2] ?? 0;
    e.current.set(
      sx0 + (sx1 - sx0) * t,
      sy0 + (sy1 - sy0) * t,
      sz0 + (sz1 - sz0) * t,
    );
    e.marker.position.copy(e.current);
    // Label floats just above the marker so they don't overlap.
    e.label.position.set(e.current.x, e.current.y + 0.08, e.current.z);

    // Interpolate ecliptic position (for distance/speed readouts).
    const ex0 = e.eclipticXYZ[lo * 3] ?? 0;
    const ey0 = e.eclipticXYZ[lo * 3 + 1] ?? 0;
    const ez0 = e.eclipticXYZ[lo * 3 + 2] ?? 0;
    const ex1 = e.eclipticXYZ[hi * 3] ?? 0;
    const ey1 = e.eclipticXYZ[hi * 3 + 1] ?? 0;
    const ez1 = e.eclipticXYZ[hi * 3 + 2] ?? 0;
    e.currentEcliptic.set(
      ex0 + (ex1 - ex0) * t,
      ey0 + (ey1 - ey0) * t,
      ez0 + (ez1 - ez0) * t,
    );

    // Approximate instantaneous speed from the sample bracket.
    // dPosition (AU) over dTime (days) → AU/day → km/s.
    if (j1 > j0) {
      const dx = ex1 - ex0;
      const dy = ey1 - ey0;
      const dz = ez1 - ez0;
      const dAU = Math.hypot(dx, dy, dz);
      const dDays = j1 - j0;
      // 1 AU/day = 1731.46 km/s.
      e.currentSpeedKmS = (dAU / dDays) * 1731.4566;
    }

    // Split the polyline into past (0…hi) + future (lo…last) with a
    // shared duplicated sample at the boundary so the two lines meet
    // at the marker.
    const pastCount = Math.min(hi + 1, jds.length);
    const futureStart = lo;
    const futureCount = Math.max(0, jds.length - futureStart);

    e.pastLine.geometry.setDrawRange(0, pastCount);
    e.futureLine.geometry.setDrawRange(futureStart, futureCount);
    // computeLineDistances is required for LineDashedMaterial.
    if (futureCount > 1) e.futureLine.computeLineDistances();

    // Label gating: only visible when the camera is close, otherwise
    // we get a tag salad at outer-solar-system zoom.
    if (e.label.visible && camWorld) {
      e.marker.updateMatrixWorld();
      const wp = this.tmp.setFromMatrixPosition(e.marker.matrixWorld);
      const dist = wp.distanceTo(camWorld);
      e.label.visible = dist < LABEL_MAX_AU;
    }
  }

  /** Current scene-space position for the spacecraft (or null). */
  positionOf(slug: SpacecraftSlug): Vector3 | null {
    const e = this.bySlug.get(slug);
    return e ? e.current.clone() : null;
  }

  /** Snapshot of every spacecraft's live status — fed into the panel. */
  status(): SpacecraftStatus[] {
    const out: SpacecraftStatus[] = [];
    for (const e of this.entries) {
      const ex = e.currentEcliptic;
      const distanceAU = Math.hypot(ex.x, ex.y, ex.z);
      const cur = e.current;
      const len = Math.max(1e-6, Math.hypot(cur.x, cur.y, cur.z));
      out.push({
        slug: e.spec.slug,
        name: e.spec.name,
        color: e.spec.color,
        distanceAU,
        speedKmS: e.currentSpeedKmS,
        direction: { x: cur.x / len, y: cur.y / len, z: cur.z / len },
        position: { x: cur.x, y: cur.y, z: cur.z },
        summary: e.spec.summary,
      });
    }
    return out;
  }

  /** Resolve a click → spacecraft marker. */
  pick(
    ndc: Vector2,
    raycaster: Raycaster,
    camera: PerspectiveCamera,
  ): SpacecraftSlug | null {
    raycaster.setFromCamera(ndc, camera);
    const markers = this.entries
      .filter((e) => e.marker.visible)
      .map((e) => e.marker);
    if (markers.length === 0) return null;
    const hits = raycaster.intersectObjects(markers, false);
    if (!hits[0]) return null;
    const sprite = hits[0].object as Sprite;
    const found = this.entries.find((e) => e.marker === sprite);
    return found ? found.spec.slug : null;
  }

  /** Track the most recent sim time so future re-renders don't drift
   *  if they're called without a fresh time. */
  lastTime(): Date {
    return this.lastSimTime;
  }

  dispose(): void {
    for (const e of this.entries) {
      // past + future share the geometry; dispose once.
      e.pastLine.geometry.dispose();
      (e.pastLine.material as LineBasicMaterial).dispose();
      (e.futureLine.material as LineDashedMaterial).dispose();
      const mm = e.marker.material as SpriteMaterial;
      mm.map?.dispose();
      mm.dispose();
      const lm = e.label.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
      this.remove(e.pastLine);
      this.remove(e.futureLine);
      this.remove(e.marker);
      this.remove(e.label);
    }
    this.entries = [];
    this.bySlug.clear();
  }
}

function makeDotSprite(color: number): Sprite {
  const sz = 128;
  const canvas = document.createElement("canvas");
  canvas.width = sz;
  canvas.height = sz;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const grad = ctx.createRadialGradient(
    sz / 2,
    sz / 2,
    0,
    sz / 2,
    sz / 2,
    sz / 2,
  );
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.65)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sz, sz);
  // Crisp center dot so the marker reads even at large pixel radii.
  ctx.beginPath();
  ctx.arc(sz / 2, sz / 2, sz * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(
    255,
    b + 60,
  )},1)`;
  ctx.fill();
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
  return new Sprite(mat);
}

function makeLabelSprite(text: string, color: number): Sprite {
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
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  ctx.fillStyle = `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(
    255,
    b + 50,
  )},0.95)`;
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  const mat = new SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.95,
  });
  return new Sprite(mat);
}

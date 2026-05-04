import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LinearFilter,
  type PerspectiveCamera,
  type Raycaster,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from "three";

/**
 * 🛰 Curated mission/spacecraft trajectory layer.
 *
 * Reads pre-baked HORIZONS state-vector blobs (`apps/web/public/data/missions/<slug>.bin`)
 * and renders one polyline + one "now" marker + one label per mission inside the
 * solarGroup (1 unit = 1 AU, ecliptic). The marker is interpolated linearly
 * between sample JDs each frame. Labels fade in only when the mission's
 * current position is within ~30 AU of the camera so we don't clutter
 * outer-system views.
 */

const HEADER_BYTES = 16;
const RECORD_BYTES = 16;
/** Camera-distance (AU) within which a mission label is visible. */
const LABEL_MAX_AU = 30;

export type MissionInput = {
  slug: string;
  name: string;
  color: string;
  /** xyz triples (AU, heliocentric ecliptic) — same length as `epochJDs * 3`. */
  polyline: Float32Array;
  epochJDs: Float32Array;
};

export type MissionFile = {
  slug: string;
  name: string;
  color: string;
  polyline: Float32Array;
  epochJDs: Float32Array;
};

/** Decode a `.bin` ArrayBuffer baked by `scripts/bake-missions.ts`. */
export function parseMissionBin(
  buf: ArrayBuffer,
): { polyline: Float32Array; epochJDs: Float32Array } {
  const v = new DataView(buf);
  const magic = String.fromCharCode(
    v.getUint8(0),
    v.getUint8(1),
    v.getUint8(2),
    v.getUint8(3),
  );
  if (magic !== "UWMS") throw new Error(`bad magic '${magic}' (expected UWMS)`);
  const count = v.getUint32(4, true);
  const polyline = new Float32Array(count * 3);
  const epochJDs = new Float32Array(count);
  let off = HEADER_BYTES;
  for (let i = 0; i < count; i++) {
    epochJDs[i] = v.getFloat32(off, true);
    polyline[i * 3] = v.getFloat32(off + 4, true);
    polyline[i * 3 + 1] = v.getFloat32(off + 8, true);
    polyline[i * 3 + 2] = v.getFloat32(off + 12, true);
    off += RECORD_BYTES;
  }
  return { polyline, epochJDs };
}

function dateToJD(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Map heliocentric ecliptic (x, y, z) AU into solarGroup scene units. */
function eclipticToScene(x: number, y: number, z: number, out: Vector3): void {
  out.set(x, z, -y);
}

type MissionEntry = {
  slug: string;
  name: string;
  color: string;
  polyline: Float32Array;
  epochJDs: Float32Array;
  line: Line;
  marker: Sprite;
  label: Sprite;
  /** Current scene-space position of the marker (mutated per frame). */
  current: Vector3;
};

export class MissionField extends Group {
  private entries: MissionEntry[] = [];
  private bySlug = new Map<string, MissionEntry>();
  private tmp = new Vector3();
  private cameraWorld = new Vector3();

  constructor(missions: MissionInput[]) {
    super();
    for (const m of missions) this.addMission(m);
  }

  private addMission(m: MissionInput): void {
    const sceneXYZ = new Float32Array(m.polyline.length);
    const tmp = new Vector3();
    for (let i = 0; i < m.polyline.length; i += 3) {
      eclipticToScene(
        m.polyline[i] ?? 0,
        m.polyline[i + 1] ?? 0,
        m.polyline[i + 2] ?? 0,
        tmp,
      );
      sceneXYZ[i] = tmp.x;
      sceneXYZ[i + 1] = tmp.y;
      sceneXYZ[i + 2] = tmp.z;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(sceneXYZ, 3));
    const colorNum = new Color(m.color).getHex();
    const lineMat = new LineBasicMaterial({
      color: colorNum,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const line = new Line(geom, lineMat);
    line.frustumCulled = false;
    this.add(line);

    const marker = makeDotSprite(colorNum);
    marker.scale.set(0.18, 0.18, 1);
    this.add(marker);

    const label = makeLabelSprite(m.name);
    const img = label.material.map?.image as HTMLCanvasElement;
    const aspect = img.width / img.height;
    const h = 0.14;
    label.scale.set(h * aspect, h, 1);
    this.add(label);

    const entry: MissionEntry = {
      slug: m.slug,
      name: m.name,
      color: m.color,
      polyline: sceneXYZ,
      epochJDs: m.epochJDs,
      line,
      marker,
      label,
      current: new Vector3(),
    };
    // Default off — Universe scene flips them on via setMission().
    line.visible = false;
    marker.visible = false;
    label.visible = false;
    this.entries.push(entry);
    this.bySlug.set(m.slug, entry);
  }

  setVisible(slug: string, on: boolean): void {
    const e = this.bySlug.get(slug);
    if (!e) return;
    e.line.visible = on;
    e.marker.visible = on;
    e.label.visible = on; // distance gate applied in setSimTime
  }

  setAllVisible(on: boolean): void {
    for (const e of this.entries) {
      e.line.visible = on;
      e.marker.visible = on;
      e.label.visible = on;
    }
  }

  /** Visible flags keyed by slug — for state publishing. */
  visibility(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const e of this.entries) out[e.slug] = e.line.visible;
    return out;
  }

  /**
   * Update marker positions (and label opacity) for the given sim time.
   * `cameraWorldPos` is the camera position expressed in scene-world units;
   * we use it to gate label visibility by distance.
   */
  setSimTime(date: Date, cameraWorldPos?: Vector3): void {
    const jd = dateToJD(date);
    if (cameraWorldPos) this.cameraWorld.copy(cameraWorldPos);
    for (const e of this.entries) {
      this.sampleAt(e, jd, e.current);
      // The marker/label live inside this Group → set local position equal
      // to current (the Group's own world transform handles the AU-scale frame).
      e.marker.position.copy(e.current);
      e.label.position.set(e.current.x, e.current.y + 0.22, e.current.z);
      if (e.line.visible) {
        // Compute the marker's world position by reading our group's matrix.
        e.marker.updateMatrixWorld();
        const wp = this.tmp.setFromMatrixPosition(e.marker.matrixWorld);
        const dist = cameraWorldPos ? wp.distanceTo(cameraWorldPos) : 0;
        const labelOn = dist < LABEL_MAX_AU * (this.scale.x || 1);
        e.label.visible = labelOn;
      }
    }
  }

  /** Linear interpolation of the polyline at the given JD. */
  private sampleAt(e: MissionEntry, jd: number, out: Vector3): void {
    const jds = e.epochJDs;
    const last = jds.length - 1;
    if (last < 0) {
      out.set(0, 0, 0);
      return;
    }
    if (jd <= (jds[0] ?? 0)) {
      out.set(e.polyline[0] ?? 0, e.polyline[1] ?? 0, e.polyline[2] ?? 0);
      return;
    }
    if (jd >= (jds[last] ?? 0)) {
      const i = last * 3;
      out.set(
        e.polyline[i] ?? 0,
        e.polyline[i + 1] ?? 0,
        e.polyline[i + 2] ?? 0,
      );
      return;
    }
    // Binary search.
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((jds[mid] ?? 0) <= jd) lo = mid;
      else hi = mid;
    }
    const j0 = jds[lo] ?? 0;
    const j1 = jds[hi] ?? 0;
    const t = j1 === j0 ? 0 : (jd - j0) / (j1 - j0);
    const i0 = lo * 3;
    const i1 = hi * 3;
    const x0 = e.polyline[i0] ?? 0;
    const y0 = e.polyline[i0 + 1] ?? 0;
    const z0 = e.polyline[i0 + 2] ?? 0;
    const x1 = e.polyline[i1] ?? 0;
    const y1 = e.polyline[i1 + 1] ?? 0;
    const z1 = e.polyline[i1 + 2] ?? 0;
    out.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t);
  }

  /**
   * Pick the closest currently-visible mission marker under the cursor.
   * Returns the slug, name, and current sample JD (for downstream lookup).
   */
  getNearest(
    ndc: Vector2,
    raycaster: Raycaster,
    camera: PerspectiveCamera,
  ): { slug: string; name: string; jd: number; pos: Vector3 } | null {
    raycaster.setFromCamera(ndc, camera);
    const visibleMarkers = this.entries
      .filter((e) => e.marker.visible)
      .map((e) => e.marker);
    const hits = raycaster.intersectObjects(visibleMarkers, false);
    if (!hits[0]) return null;
    const sprite = hits[0].object as Sprite;
    const e = this.entries.find((x) => x.marker === sprite);
    if (!e) return null;
    return {
      slug: e.slug,
      name: e.name,
      jd: dateToJD(this.lastSimTime),
      pos: e.current.clone(),
    };
  }

  /** Track the most recent sim time (for getNearest). */
  private lastSimTime = new Date();
  setSimTimeAndTrack(date: Date, cameraWorldPos?: Vector3): void {
    this.lastSimTime = date;
    this.setSimTime(date, cameraWorldPos);
  }

  /** Current scene-space position of a mission's marker (for InfoPanel). */
  positionOf(slug: string): Vector3 | null {
    const e = this.bySlug.get(slug);
    return e ? e.current.clone() : null;
  }

  dispose(): void {
    for (const e of this.entries) {
      e.line.geometry.dispose();
      (e.line.material as LineBasicMaterial).dispose();
      (e.marker.material as SpriteMaterial).map?.dispose();
      (e.marker.material as SpriteMaterial).dispose();
      (e.label.material as SpriteMaterial).map?.dispose();
      (e.label.material as SpriteMaterial).dispose();
      this.remove(e.line);
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
  const ctx = canvas.getContext("2d")!;
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
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
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
  return new Sprite(mat);
}

function makeLabelSprite(text: string): Sprite {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
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
  ctx.fillStyle = "rgba(255, 230, 200, 0.95)";
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

/** Manifest entry as published in `apps/web/public/data/missions/index.json`. */
export type MissionManifestEntry = {
  slug: string;
  name: string;
  launch: string;
  agency: string;
  summary: string;
  color: string;
};

/**
 * Fetch the mission manifest + every `<slug>.bin` referenced by it,
 * returning the parsed shape ready to feed into `new MissionField(...)`.
 */
export async function loadAllMissions(): Promise<{
  manifest: MissionManifestEntry[];
  files: MissionFile[];
}> {
  const idxRes = await fetch("/data/missions/index.json");
  if (!idxRes.ok) throw new Error(`missions index: HTTP ${idxRes.status}`);
  const manifest = (await idxRes.json()) as MissionManifestEntry[];
  const files = await Promise.all(
    manifest.map(async (m) => {
      const res = await fetch(`/data/missions/${m.slug}.bin`);
      if (!res.ok) throw new Error(`missions ${m.slug}: HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const { polyline, epochJDs } = parseMissionBin(buf);
      return {
        slug: m.slug,
        name: m.name,
        color: m.color,
        polyline,
        epochJDs,
      } satisfies MissionFile;
    }),
  );
  return { manifest, files };
}

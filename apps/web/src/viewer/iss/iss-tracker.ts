import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";

/**
 * Live ISS tracker.
 *
 * Polls https://api.wheretheiss.at every 4 s for the ISS sub-satellite point
 * (lat/lon over Earth). Day 5 cut: we display this as a marker on the sky
 * (treating ISS lat/lon as if they were Dec/RA — a topocentric approximation
 * that's good enough to know "ISS is in this direction-ish from the user").
 *
 * Day 5+ TODO: full SGP4 propagation via satellite.js for accurate az/el from
 * the user's location.
 */

const ISS_API_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const POLL_INTERVAL_MS = 4000;
const ISS_RADIUS = 0.985; // slightly inside HiPS, in front of stars

export type IssState = {
  lat: number;
  lon: number;
  altKm: number;
  velKmh: number;
  fetchedAt: number;
};

export class IssTracker {
  readonly group = new Group();
  private sprite: Sprite | null = null;
  private timer: number | null = null;
  private disposed = false;
  private latest: IssState | null = null;
  private listeners = new Set<(state: IssState | null) => void>();

  constructor() {
    this.group.name = "IssTracker";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up like other astronomy groups
    this.group.renderOrder = 2;
    this.build();
  }

  start(): void {
    if (this.timer !== null) return;
    void this.poll();
    this.timer = window.setInterval(() => void this.poll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(cb: (state: IssState | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.latest);
    return () => this.listeners.delete(cb);
  }

  private build(): void {
    const tex = makeIssMarker();
    const mat = new SpriteMaterial({
      map: tex,
      color: 0xa6f1ff,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    const sprite = new Sprite(mat);
    sprite.scale.set(0.04, 0.04, 1);
    sprite.renderOrder = 2;
    sprite.visible = false;
    this.group.add(sprite);
    this.sprite = sprite;
  }

  private async poll(): Promise<void> {
    if (this.disposed) return;
    try {
      const res = await fetch(ISS_API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        latitude: number;
        longitude: number;
        altitude: number; // km
        velocity: number; // km/h
      };
      this.latest = {
        lat: json.latitude,
        lon: json.longitude,
        altKm: json.altitude,
        velKmh: json.velocity,
        fetchedAt: Date.now(),
      };
      this.applyPosition();
      for (const l of this.listeners) l(this.latest);
    } catch (err) {
      console.warn("[iss] poll failed", err);
    }
  }

  private applyPosition(): void {
    if (!this.sprite || !this.latest) return;
    const { lat, lon } = this.latest;
    // Day 5 approximation: render ISS sub-satellite point as if it were a
    // (lon, lat) sky direction. Day 6 will swap to true topocentric az/el.
    const dec = lat;
    const ra = lon < 0 ? lon + 360 : lon; // wrap [-180,180] → [0,360]
    const x =
      ISS_RADIUS *
      Math.cos((dec * Math.PI) / 180) *
      Math.cos((ra * Math.PI) / 180);
    const y =
      ISS_RADIUS *
      Math.cos((dec * Math.PI) / 180) *
      Math.sin((ra * Math.PI) / 180);
    const z = ISS_RADIUS * Math.sin((dec * Math.PI) / 180);
    this.sprite.position.set(x, y, z);
    this.sprite.visible = true;
  }

  /** Sky-direction unit vector pointing at the ISS (in world Y-up coords). */
  direction(): Vector3 | null {
    if (!this.sprite || !this.latest) return null;
    return this.sprite.position
      .clone()
      .applyEuler(this.group.rotation)
      .normalize();
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    if (this.sprite) {
      const mat = this.sprite.material as SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.group.remove(this.sprite);
      this.sprite = null;
    }
    this.listeners.clear();
  }
}

function makeIssMarker(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  // Cyan crosshair-style ISS marker.
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, "rgba(166, 241, 255, 1)");
  grad.addColorStop(0.4, "rgba(166, 241, 255, 0.4)");
  grad.addColorStop(1, "rgba(166, 241, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Crosshair
  ctx.strokeStyle = "rgba(166, 241, 255, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - size / 2 + 6, cy);
  ctx.lineTo(cx - 10, cy);
  ctx.moveTo(cx + 10, cy);
  ctx.lineTo(cx + size / 2 - 6, cy);
  ctx.moveTo(cx, cy - size / 2 + 6);
  ctx.lineTo(cx, cy - 10);
  ctx.moveTo(cx, cy + 10);
  ctx.lineTo(cx, cy + size / 2 - 6);
  ctx.stroke();

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import { getSettings } from "../../lib/settings";

/**
 * 🌌 Aurora oval overlay — paints OVATION auroral-activity probability
 * onto an Earth sphere. Fetched from NOAA SWPC and refreshed every 5 min;
 * fails silently to a dimmed default oval if the feed is down.
 *
 * The overlay is a slightly-larger transparent sphere around the host
 * Earth mesh, additively blended so the aurora reads as a green halo at
 * high latitudes. The texture is a 720×360 canvas resampled from the raw
 * 1° × 1° OVATION grid (CORS-open), with a soft Gaussian splat per cell
 * to fill the sparse low-probability regions and avoid blocky artefacts.
 *
 * Hosted as a `Group` so callers can `add()` it to whatever scene graph
 * Earth lives in — Universe, Solar Flight, and PlanetSurface all get the
 * same class.
 */

const FEED_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const TEX_W = 720;
const TEX_H = 360;

type OvationCell = [number, number, number]; // [lon, lat, prob]

export type AuroraOverlayOptions = {
  /** Earth sphere radius in scene units. Overlay sits at radius * 1.02. */
  earthRadius: number;
};

export class AuroraOverlay extends Group {
  private mesh: Mesh;
  private texture: CanvasTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastFetchMs = 0;
  private fetchInFlight = false;
  private disposed = false;
  private timer: number | null = null;
  /** Tracks the last network status — true if the most recent fetch was
   *  served from the live SWPC feed; false means we fell back to the
   *  dimmed default oval. */
  private liveData = false;

  constructor(opts: AuroraOverlayOptions) {
    super();
    this.name = "AuroraOverlay";
    this.canvas = document.createElement("canvas");
    this.canvas.width = TEX_W;
    this.canvas.height = TEX_H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("aurora-overlay: 2d context unavailable");
    this.ctx = ctx;
    // Seed with a dimmed default oval so the first frame has something
    // to show before fetch completes.
    this.paintDefaultOval();
    this.texture = new CanvasTexture(this.canvas);
    this.texture.minFilter = LinearFilter;
    this.texture.magFilter = LinearFilter;
    this.texture.wrapS = ClampToEdgeWrapping;
    this.texture.wrapT = ClampToEdgeWrapping;
    this.texture.needsUpdate = true;

    const geom = new SphereGeometry(opts.earthRadius * 1.02, 48, 32);
    const mat = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      opacity: 0.85,
    });
    this.mesh = new Mesh(geom, mat);
    this.add(this.mesh);
    this.visible = false;
  }

  /** Toggle visibility. Triggers a fetch on first show if data is stale. */
  setVisible(on: boolean): void {
    this.visible = on;
    if (on) void this.update();
  }

  /** Force a re-fetch + repaint. Idempotent under in-flight requests. */
  async update(): Promise<void> {
    if (this.disposed || this.fetchInFlight) return;
    if (getSettings().standby && document.hidden) return;
    const now = Date.now();
    if (this.liveData && now - this.lastFetchMs < REFRESH_INTERVAL_MS) return;
    this.fetchInFlight = true;
    try {
      const res = await fetch(FEED_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`SWPC HTTP ${res.status}`);
      const json = (await res.json()) as { coordinates?: OvationCell[] };
      if (!Array.isArray(json.coordinates)) throw new Error("malformed payload");
      this.paintGrid(json.coordinates);
      this.texture.needsUpdate = true;
      this.lastFetchMs = now;
      this.liveData = true;
    } catch {
      // Network/CORS failure → keep the dimmed default oval. Only repaint
      // if we don't already have it (first call).
      if (!this.liveData) {
        this.paintDefaultOval();
        this.texture.needsUpdate = true;
      }
    } finally {
      this.fetchInFlight = false;
      this.scheduleNext();
    }
  }

  private scheduleNext(): void {
    if (this.disposed || this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      if (this.visible) void this.update();
    }, REFRESH_INTERVAL_MS);
  }

  /** Render the OVATION grid into the canvas. Each cell is a soft splat,
   *  so the resulting band looks continuous despite the 1° granularity. */
  private paintGrid(cells: OvationCell[]): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    // Background: very faint base so the sphere shows the aurora region
    // even where the feed is silent.
    ctx.fillStyle = "rgba(20, 50, 30, 0.05)";
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    // Use additive blending in 2D — `lighter` composites are the
    // closest analog. A radial gradient per cell gives the soft glow.
    ctx.globalCompositeOperation = "lighter";
    for (const [lon, lat, prob] of cells) {
      if (!Number.isFinite(prob) || prob < 1) continue;
      // OVATION longitudes are [0, 360]; canvas X = lon (wrap-safe since
      // ClampToEdge + lonShift in shader-equivalent UV is unnecessary —
      // we sample directly).
      const x = ((lon % 360) / 360) * TEX_W;
      const y = ((90 - lat) / 180) * TEX_H;
      const intensity = Math.min(1, prob / 50); // OVATION % already 0-100
      const r = 6 + intensity * 6;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      // Aurora green at the center, hint of magenta at the rim for
      // proton-precipitation regions.
      grad.addColorStop(0, `rgba(120, 255, 170, ${intensity * 0.9})`);
      grad.addColorStop(0.5, `rgba(80, 255, 200, ${intensity * 0.5})`);
      grad.addColorStop(1, "rgba(80, 255, 200, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /** Dimmed oval at ±67° latitude — read as "we don't have live data
   *  but here's the climatology". */
  private paintDefaultOval(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, TEX_W, TEX_H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 360; i += 2) {
      const lon = i;
      for (const lat of [67, -67]) {
        const x = (lon / 360) * TEX_W;
        const y = ((90 - lat) / 180) * TEX_H;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
        grad.addColorStop(0, "rgba(120, 255, 170, 0.18)");
        grad.addColorStop(1, "rgba(120, 255, 170, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - 6, y - 6, 12, 12);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
    this.texture.dispose();
  }
}

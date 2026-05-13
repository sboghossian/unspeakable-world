import { Quaternion, Vector3 } from "three";
import { log } from "../../lib/logger";
import {
  startRearCamera,
  type CameraStartResult,
} from "./camera-passthrough";
import {
  requestOrientationPermission,
  startOrientation,
  type OrientationSession,
} from "./orientation-fusion";

/**
 * 🛰 AR Sky controller.
 *
 * Orchestrates the three moving pieces of the AR Sky overlay:
 *   1. Rear-camera passthrough (camera-passthrough.ts).
 *   2. Device-orientation → quaternion stream (orientation-fusion.ts).
 *   3. Pausing the Voyager controls so pointer drags don't fight the
 *      gyroscope, and feeding camera orientation to the scene.
 *
 * The React layer (`ArSkyButton`, `ArSkyOverlay`) owns the DOM nodes
 * (the <video> element and the label sprites). This controller is the
 * non-React glue between them and the renderer — it stays headless so
 * unit tests can simulate sensor events without spinning up the DOM.
 *
 * # Lifecycle
 *   const ctrl = new ArSkyController(scene);
 *   await ctrl.enter({ videoEl, onOrientation, onCameraResult });
 *   // ... AR mode running ...
 *   ctrl.exit();
 *
 * `enter` resolves once camera + orientation have both been attempted
 * (either may fail individually — the caller decides whether to show a
 * fallback). `exit` is idempotent.
 */

type SceneLike = {
  setCameraDirection: (yaw: number, pitch: number) => void;
  setControlsEnabled: (enabled: boolean) => void;
  bodyDirection: (name: string) => Vector3 | null;
  exoplanetList: () => Array<{
    name: string;
    ra: number;
    dec: number;
  }>;
  cosmicLandmarkList: () => Array<{
    name: string;
    raDeg: number;
    decDeg: number;
    detail: string;
  }>;
};

export type ArEnterOptions = {
  /** Hidden <video> element that will receive the rear-camera stream. */
  videoEl: HTMLVideoElement;
  /** Fired on every gyro sample with the world-space camera quaternion. */
  onOrientation: (q: Quaternion) => void;
  /** Fired once the camera has either started or failed. */
  onCameraResult: (result: CameraStartResult) => void;
  /** Whether the user opted in to the rear-camera passthrough. */
  useCamera: boolean;
};

export type ArLabel = {
  /** Stable id (used as React key). */
  id: string;
  /** Display name. */
  label: string;
  /** Short subtitle (magnitude / type / etc). Optional. */
  detail?: string;
  /** World-space Y-up unit direction the label sits on. */
  direction: Vector3;
  /** Coarse category — drives the label color in the overlay. */
  kind:
    | "sun"
    | "moon"
    | "planet"
    | "iss"
    | "star"
    | "cosmic"
    | "exoplanet";
};

export type BrightStar = {
  name: string;
  ra: number;
  dec: number;
  mag: number;
};

const PLANETS_FOR_AR: Array<{
  name: string;
  kind: ArLabel["kind"];
  detail: string;
}> = [
  { name: "Sun", kind: "sun", detail: "G2V star" },
  { name: "Moon", kind: "moon", detail: "Earth's natural satellite" },
  { name: "Mercury", kind: "planet", detail: "mag 0.5" },
  { name: "Venus", kind: "planet", detail: "morning / evening star" },
  { name: "Mars", kind: "planet", detail: "the red planet" },
  { name: "Jupiter", kind: "planet", detail: "gas giant" },
  { name: "Saturn", kind: "planet", detail: "ringed planet" },
  { name: "Uranus", kind: "planet", detail: "ice giant" },
  { name: "Neptune", kind: "planet", detail: "outermost planet" },
];

export class ArSkyController {
  private orientation: OrientationSession | null = null;
  private cameraStop: (() => void) | null = null;
  private brightStars: BrightStar[] = [];
  private brightStarsLoaded = false;
  private brightStarsLoading: Promise<void> | null = null;

  constructor(private readonly scene: SceneLike) {}

  /**
   * Hand control of the camera to the device gyroscope and (optionally)
   * start the rear-camera passthrough. Must be called from inside a user
   * gesture on iOS Safari.
   *
   * # iOS single-gesture invariant
   * Safari ≥ 13 requires BOTH `DeviceOrientationEvent.requestPermission()`
   * AND `navigator.mediaDevices.getUserMedia()` to be _kicked off_ inside
   * the same synchronous user gesture. If we `await` the orientation
   * permission before even calling `getUserMedia`, Safari treats the
   * second call as detached from the gesture and silently rejects it
   * with `NotAllowedError`. To preserve the invariant we start both
   * promises _synchronously_ here (no `await` between them) and only
   * await the results afterwards.
   */
  async enter(opts: ArEnterOptions): Promise<void> {
    // 1. Pause Voyager pointer/wheel input. We do this first so a
    //    half-failed enter doesn't leave drag+gyro fighting.
    this.scene.setControlsEnabled(false);

    // 2. Kick off BOTH permission flows synchronously. `requestOrientationPermission`
    //    must call `DeviceOrientationEvent.requestPermission()` in this same
    //    JS task or iOS Safari rejects it. Same with `startRearCamera` →
    //    `getUserMedia`. Awaiting *both* afterwards is fine — the gesture
    //    requirement is on the synchronous *call*, not the resolution.
    const orientationPromise = requestOrientationPermission();
    const cameraPromise = opts.useCamera
      ? startRearCamera(opts.videoEl)
      : Promise.resolve<CameraStartResult>({
          ok: false,
          reason: "permission-denied",
          detail: "User opted out of camera at entry",
        });

    // 3. Now we can safely await each result.
    const perm = await orientationPromise;
    if (perm === "granted") {
      this.orientation = startOrientation((q) => {
        // Three's camera convention: forward is local -Z, up is local
        // +Y. Convert quaternion → (yaw, pitch) for the YXZ-no-roll
        // VoyagerControls.setForward path. Roll is the existing
        // fidelity gap noted in observer/gyro-controls.ts.
        const fwd = new Vector3(0, 0, -1).applyQuaternion(q);
        const yaw = Math.atan2(fwd.x, -fwd.z);
        const pitch = Math.asin(Math.max(-1, Math.min(1, fwd.y)));
        this.scene.setCameraDirection(yaw, pitch);
        opts.onOrientation(q);
      });
    } else {
      log.warn("[ar-sky] orientation permission not granted", perm);
    }

    // 4. Camera passthrough (optional). If declined, we still run AR
    //    mode — just on a dark background.
    const camResult = await cameraPromise;
    if (camResult.ok) {
      this.cameraStop = camResult.stop;
    }
    opts.onCameraResult(camResult);

    // 5. Pre-fetch the bright-star catalog. We don't await — overlay can
    //    render planets immediately and add stars when they arrive.
    void this.ensureBrightStars();
  }

  /** Tear everything down. Idempotent. */
  exit(): void {
    if (this.orientation) {
      this.orientation.stop();
      this.orientation = null;
    }
    if (this.cameraStop) {
      this.cameraStop();
      this.cameraStop = null;
    }
    this.scene.setControlsEnabled(true);
  }

  /**
   * List of sky targets that *should* be labelled in AR. Visibility (in
   * the viewport) and screen-space projection are the overlay's
   * responsibility — this method is just the data layer.
   *
   * Includes: sun, moon, planets, ISS, bright named stars, cosmic
   * landmarks (Sgr A*, M87*, …). Exoplanets are skipped by default
   * because the 6,000+ field would clutter the screen; the overlay can
   * opt in by passing `includeExoplanets`.
   */
  visibleLabels(opts: { includeExoplanets?: boolean } = {}): ArLabel[] {
    const out: ArLabel[] = [];

    for (const p of PLANETS_FOR_AR) {
      const dir = this.scene.bodyDirection(p.name);
      if (!dir) continue;
      out.push({
        id: `body:${p.name}`,
        label: p.name,
        detail: p.detail,
        direction: dir,
        kind: p.kind,
      });
    }

    const iss = this.scene.bodyDirection("ISS");
    if (iss) {
      out.push({
        id: "body:ISS",
        label: "ISS",
        detail: "International Space Station",
        direction: iss,
        kind: "iss",
      });
    }

    for (const lm of this.scene.cosmicLandmarkList()) {
      out.push({
        id: `cosmic:${lm.name}`,
        label: lm.name,
        detail: lm.detail,
        direction: raDecToYupDirection(lm.raDeg, lm.decDeg),
        kind: "cosmic",
      });
    }

    for (const s of this.brightStars) {
      out.push({
        id: `star:${s.name}`,
        label: s.name,
        detail: `mag ${s.mag.toFixed(1)}`,
        direction: raDecToYupDirection(s.ra, s.dec),
        kind: "star",
      });
    }

    if (opts.includeExoplanets) {
      for (const exo of this.scene.exoplanetList()) {
        out.push({
          id: `exo:${exo.name}`,
          label: exo.name,
          direction: raDecToYupDirection(exo.ra, exo.dec),
          kind: "exoplanet",
        });
      }
    }

    return out;
  }

  /** Whether bright-star labels are ready (the catalog has loaded). */
  brightStarsReady(): boolean {
    return this.brightStarsLoaded;
  }

  private ensureBrightStars(): Promise<void> {
    if (this.brightStarsLoaded) return Promise.resolve();
    if (this.brightStarsLoading) return this.brightStarsLoading;
    this.brightStarsLoading = (async (): Promise<void> => {
      try {
        const res = await fetch("/data/hyg-named.json");
        if (!res.ok) {
          log.warn("[ar-sky] hyg-named HTTP", res.status);
          return;
        }
        const all = (await res.json()) as BrightStar[];
        // Cap at the brightest 60 (same convention as StarLabels). We
        // also drop the placeholder "Sol" — the Sun has its own entry.
        this.brightStars = all
          .filter((s) => s.name !== "Sol")
          .sort((a, b) => a.mag - b.mag)
          .slice(0, 60);
        this.brightStarsLoaded = true;
      } catch (err) {
        log.warn("[ar-sky] bright-star catalog load failed", err);
      } finally {
        this.brightStarsLoading = null;
      }
    })();
    return this.brightStarsLoading;
  }
}

/**
 * Equatorial (RA, Dec) in degrees → world-space Y-up unit vector,
 * matching the same celestial-Z-up → world-Y-up rotation the StarLabels
 * group applies (rotation.x = -π/2 takes (x, y, z) → (x, z, -y)).
 *
 * Sanity:
 *   (ra=0,   dec=0)  → (+1, 0, 0)   [vernal equinox on +X]
 *   (ra=90,  dec=0)  → (0, 0, -1)   [3h east of equinox]
 *   (ra=0,   dec=90) → (0, +1, 0)   [celestial north on +Y]
 */
export function raDecToYupDirection(raDeg: number, decDeg: number): Vector3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return new Vector3(
    cosDec * Math.cos(ra),
    Math.sin(dec),
    -cosDec * Math.sin(ra),
  ).normalize();
}

/**
 * Project a world-direction (unit Y-up vector) into normalised device
 * coords given the current camera forward + FOV + viewport aspect.
 * Returns `null` if the direction is behind the camera (so the overlay
 * can skip it).
 *
 * Used by `ArSkyOverlay` to position label sprites in CSS-pixel space.
 *
 * Output: `{ ndcX, ndcY }` both in [-1, +1] when on-screen. NDC has +Y
 * pointing up (so CSS code should flip the sign).
 */
export function projectDirectionToNdc(
  direction: Vector3,
  forward: Vector3,
  fovDeg: number,
  aspect: number,
): { ndcX: number; ndcY: number } | null {
  const f = forward.clone().normalize();
  // If the target is behind the camera, dot < 0. Cull aggressively to
  // avoid the camera-axis singularity flipping label positions.
  const dot = direction.dot(f);
  if (dot <= 0.01) return null;

  // Right = f × worldUp; if degenerate (looking straight up/down) swap
  // to a stable basis. This matches the unprojection helper in
  // viewer/Viewer.tsx.
  const worldUp = new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(f, worldUp);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new Vector3().crossVectors(right, f).normalize();

  // Project the direction onto the camera plane to get image coords.
  const fovRad = (fovDeg * Math.PI) / 180;
  const tanY = Math.tan(fovRad / 2);
  const tanX = tanY * aspect;
  const xCam = direction.dot(right);
  const yCam = direction.dot(up);
  // Pinhole projection: x_ndc = (x_cam / z_cam) / tanX. We computed
  // z_cam = dot above.
  const ndcX = xCam / dot / tanX;
  const ndcY = yCam / dot / tanY;
  return { ndcX, ndcY };
}

/**
 * Convert a world-Y-up forward direction to (azimuth, altitude) degrees
 * relative to the observer's local horizon — assuming the camera forward
 * IS the zenith-aware direction. In the existing viewer the world Y-up
 * frame is celestial-aligned (not horizon-aligned), so this helper is
 * really "ecliptic compass" not a true horizon compass without observer
 * lat/lon. The overlay uses it as a best-effort HUD; we document the
 * caveat in the AR overlay.
 *
 * Output: azimuth in [0, 360) (0 = +Z negative = "north of zero RA"),
 * altitude in [-90, 90].
 */
export function directionToCompassAlt(direction: Vector3): {
  azimuthDeg: number;
  altitudeDeg: number;
} {
  const d = direction.clone().normalize();
  const altitudeDeg = (Math.asin(Math.max(-1, Math.min(1, d.y))) * 180) / Math.PI;
  // atan2(x, -z) so 0 lines up with -Z (the viewer's initial forward).
  let azimuthDeg = (Math.atan2(d.x, -d.z) * 180) / Math.PI;
  if (azimuthDeg < 0) azimuthDeg += 360;
  return { azimuthDeg, altitudeDeg };
}

export type { CameraStartResult } from "./camera-passthrough";

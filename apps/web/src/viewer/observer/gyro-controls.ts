import { log } from "../../lib/logger";

/**
 * 📱 Gyroscope / DeviceOrientation AR control for the sky viewer.
 *
 * Maps the phone's three orientation angles onto the rendered sky so
 * holding the device up to the sky frames the same patch of sky on the
 * screen. The geometry is the standard alpha/beta/gamma → yaw/pitch/roll
 * conversion, with a screen-orientation correction for landscape mode.
 *
 *   alpha (0-360°)  Compass heading. 0 = north, increases CCW looking
 *                   down. We rotate the camera around world-up by -α so
 *                   the on-screen sky follows the phone's compass.
 *   beta  (-180-180°)  Front-back tilt. 0 = phone flat on its back,
 *                   90 = phone pointing forward (held upright). We
 *                   subtract 90 so pointing-forward maps to horizon
 *                   and pointing-up maps to zenith.
 *   gamma (-90-90°)   Left-right tilt. We use it for roll — not yet
 *                   threaded through the VoyagerControls (which is YXZ
 *                   no-roll), so roll is currently a small fidelity gap.
 *
 * iOS Safari ≥ 13 requires the user to grant permission via
 * `DeviceOrientationEvent.requestPermission()`. Android / desktop
 * browsers fire `deviceorientation` without a prompt.
 */

type SceneLike = {
  setCameraDirection: (yaw: number, pitch: number) => void;
};

type GyroResult = { ok: true } | { ok: false; reason: string };

type DeviceOrientationEventConstructorWithPermission = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

// Module-level state — only one gyro session at a time. Idempotent
// enable/disable so React effects can call both freely.
let listening = false;
let onOrient: ((e: DeviceOrientationEvent) => void) | null = null;
let lastScene: SceneLike | null = null;

const DEG = Math.PI / 180;

/**
 * Convert (alpha, beta, gamma) + screen orientation to (yawRad, pitchRad).
 *
 * Math:
 *  - α drives yaw (rotation around world-up). yaw_radian = -α · DEG so
 *    a rotating phone rotates the view in the same direction.
 *  - β - 90° drives pitch (front-back tilt minus the "phone vertical"
 *    reference). A phone pointing straight up at the zenith has
 *    β = 0 (face-up flat) … 90° (vertical) … 180° (face-down). We
 *    want pitch_radian = 0 when the phone is held vertical, and
 *    pitch_radian = +π/2 when pointing at the zenith.
 *  - screen.orientation.angle handles portrait vs landscape: in
 *    landscape (angle = ±90°) we swap the β/γ roles so the camera
 *    keeps tracking the phone's optical axis.
 */
export function orientationToYawPitch(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg: number,
): { yaw: number; pitch: number } {
  // Normalise screen-orientation correction.
  const screen = ((screenAngleDeg % 360) + 360) % 360;

  let beta = betaDeg;
  let gamma = gammaDeg;
  // Landscape: swap β/γ so the phone's optical axis (the camera lens
  // direction) keeps pointing where the user expects. The signs flip
  // depending on which way they rotated.
  if (screen === 90) {
    const b = beta;
    beta = -gamma;
    gamma = b;
  } else if (screen === 270) {
    const b = beta;
    beta = gamma;
    gamma = -b;
  } else if (screen === 180) {
    beta = -beta;
    gamma = -gamma;
  }

  // Yaw: compass heading. Negate so a CW phone rotation produces a CW
  // sky rotation on screen.
  const yaw = -alphaDeg * DEG;

  // Pitch: β-90° puts the upright phone at horizon, β=180° at zenith.
  // Clamp roughly to (-π/2, π/2). β can exceed ±90° when the phone
  // tips upside-down; we still clamp here and the scene clamps again.
  const rawPitch = (beta - 90) * DEG;
  const pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, rawPitch));

  // gamma (roll) intentionally unused for now — voyager-controls is YXZ
  // no-roll. Keeping the parameter in the signature so the gap is
  // explicit; will wire roll when the controls grow a roll channel.
  void gamma;

  return { yaw, pitch };
}

/** True if `window.DeviceOrientationEvent` exists and is functional. */
export function gyroSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.DeviceOrientationEvent !== "undefined"
  );
}

/**
 * iOS Safari ≥ 13 ships a permission gate: the page must call
 * DeviceOrientationEvent.requestPermission() inside a user gesture.
 * Other browsers don't have this requirement. Returns "granted" on
 * non-iOS so callers can treat the path uniformly.
 */
async function requestPermissionIfNeeded(): Promise<"granted" | "denied"> {
  if (!gyroSupported()) return "denied";
  const ctor = window.DeviceOrientationEvent as
    | (DeviceOrientationEventConstructorWithPermission & typeof DeviceOrientationEvent)
    | undefined;
  if (ctor && typeof ctor.requestPermission === "function") {
    try {
      const res = await ctor.requestPermission();
      return res;
    } catch (err) {
      log.warn("[gyro] requestPermission threw", err);
      return "denied";
    }
  }
  return "granted";
}

/**
 * Enable gyroscope camera control. Returns ok:true if permission was
 * granted (or not required); ok:false with a reason otherwise. Idempotent
 * — calling twice replaces the bound scene rather than stacking listeners.
 */
export async function enableGyroscope(scene: SceneLike): Promise<GyroResult> {
  if (!gyroSupported()) {
    return { ok: false, reason: "DeviceOrientation not supported" };
  }

  const status = await requestPermissionIfNeeded();
  if (status !== "granted") {
    return { ok: false, reason: "Permission denied" };
  }

  // Replace any existing listener so a second call rebinds cleanly.
  if (listening && onOrient) {
    window.removeEventListener("deviceorientation", onOrient);
  }
  lastScene = scene;

  const handler = (e: DeviceOrientationEvent): void => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    const screenAngle =
      (typeof window.screen !== "undefined" &&
        window.screen.orientation?.angle) ||
      0;
    const { yaw, pitch } = orientationToYawPitch(
      e.alpha,
      e.beta,
      e.gamma,
      screenAngle,
    );
    const s = lastScene;
    if (s) s.setCameraDirection(yaw, pitch);
  };
  onOrient = handler;

  // 'deviceorientationabsolute' is closer to true compass on Android, but
  // not all browsers fire it; fall back to 'deviceorientation'.
  window.addEventListener("deviceorientation", handler);
  listening = true;
  return { ok: true };
}

/** Disable the gyroscope and remove the listener. Idempotent. */
export function disableGyroscope(): void {
  if (onOrient) {
    window.removeEventListener("deviceorientation", onOrient);
    onOrient = null;
  }
  listening = false;
  lastScene = null;
}

/** Returns true while a gyro session is bound. */
export function gyroEnabled(): boolean {
  return listening;
}

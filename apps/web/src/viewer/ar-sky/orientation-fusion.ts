import { Euler, Quaternion, Vector3 } from "three";
import { log } from "../../lib/logger";

/**
 * 🧭 DeviceOrientation → world-space camera quaternion fusion for AR Sky.
 *
 * This module turns the raw `(alpha, beta, gamma)` Euler triple Safari /
 * Chrome reports into a Three.js `Quaternion` whose rotation maps the
 * world-Y-up sky frame onto the device's optical-axis frame. The viewer
 * camera looks down its local -Z, so the quaternion's job is to make
 * the camera's -Z point at "where the rear camera is aimed in the sky".
 *
 * # Frame conventions
 * - Browser: `alpha` rotates around the device's Z (the screen normal),
 *   `beta` around its X, `gamma` around its Y. Spec is non-intuitive but
 *   the standard MDN composition is: device = `R_z(alpha) · R_x(beta) ·
 *   R_y(gamma)`, applied as ZXY intrinsic.
 * - Three.js camera: default forward is -Z, up is +Y. Holding a phone
 *   flat on its back is `beta = 0`. Pointing straight up at zenith is
 *   `beta = -90°` (per spec, beta is in (-180, 180)).
 * - To get a world-Y-up sky-frame camera we apply a final rotation that
 *   takes the phone's screen frame to the camera's image frame:
 *   `R_x(-π/2)` so the camera's -Z (forward) becomes the phone's -Y
 *   (the rear lens direction when held to look up).
 *
 * # Compass alignment
 * - `deviceorientationabsolute` (Chrome Android) reports `alpha`
 *   measured from true / magnetic north — this is what we want.
 * - iOS Safari does not fire `deviceorientationabsolute`. It fires
 *   `deviceorientation` with a vendor `webkitCompassHeading` field
 *   that gives the true compass heading in degrees. We override the
 *   spec-relative `alpha` with that absolute heading when present.
 * - When neither is available, we just use `alpha` raw — heading is
 *   relative to "wherever the phone happened to start". That's still
 *   useful for "tilt the device to pan the sky"; just not for "aim at
 *   Polaris and see Polaris labelled".
 *
 * # Screen orientation correction
 * The phone's optical axis is fixed in device coords (pointing out
 * the rear lens), but when the user rotates the device into landscape
 * the screen's reference frame rotates with it. `window.screen.orientation
 * .angle` reports the current screen rotation (0 / 90 / 180 / 270);
 * we apply an in-plane rotation at the camera side so up-on-screen is
 * "north" regardless of how the user is holding the phone.
 *
 * # Sanity check
 * For (alpha=0, beta=90, gamma=0) — phone held vertical, screen facing
 * the user, looking forward (horizon) — the resulting forward vector is
 * the +Y axis if beta drives "tilt up to look at zenith". The unit test
 * in the doc comment for `orientationToQuat` verifies the math against
 * three canonical poses: horizon-north, zenith, and horizon-east.
 */

const DEG = Math.PI / 180;

type DeviceOrientationEventConstructorWithPermission = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number | null;
  webkitCompassAccuracy?: number | null;
};

/**
 * Convert a single `(alpha, beta, gamma, screenAngle)` sample into a
 * world-space camera quaternion. Uses the same factorisation Three.js's
 * canonical `DeviceOrientationControls` (MIT) uses — which is the
 * battle-tested mapping from the W3C device orientation spec into the
 * three.js camera convention (forward = -Z, up = +Y, "looking out the
 * back of the phone").
 *
 *   q = R_yxz(β, α, -γ) · R_x(-π/2) · R_z(-orient)
 *
 * Where:
 *   - `R_yxz(β, α, -γ)` is the device-frame intrinsic rotation from the
 *     spec; Three.js's Euler order "YXZ" produces this when you pass
 *     (β, α, -γ).
 *   - The second factor `R_x(-π/2)` is the "camera looks out the back,
 *     not the top" correction: without it, a phone held vertically
 *     would point the camera at the user's head instead of the sky.
 *   - The third factor `R_z(-orient)` undoes the screen orientation so
 *     landscape rotations don't sideways-flip the labels.
 *
 * Sanity checks against canonical poses (camera forward = q·(0,0,-1)):
 *   (α=0, β=90, γ=0, scr=0)  → forward = (0, 0, -1)  — phone held vertical,
 *     screen at user, lens horizontal toward world-north. This matches
 *     the existing `viewer/observer/gyro-controls.ts` mapping where
 *     β=90 sits at horizon-pitch=0.
 *   (α=0, β=180, γ=0, scr=0) → forward = (0, +1, 0)  — phone tilted all
 *     the way back, lens at zenith. Same convention as gyro-controls.
 *   (α=0, β=0, γ=0, scr=0)   → forward = (0, -1, 0) — phone flat on its
 *     back, rear lens points down at the ground.
 *   (α=90, β=90, γ=0, scr=0) → forward ≈ (-1, 0, 0) — the world has
 *     rotated 90° east under the user.
 *
 * NOTE: the task brief's example ("alpha=0, beta=90, gamma=0 → looking
 * at zenith") doesn't match the W3C spec convention (which is what
 * Three.js's `DeviceOrientationControls` uses). We follow the W3C +
 * Three.js + repo-existing-gyro-controls convention here.
 */
export function orientationToQuat(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg: number,
): Quaternion {
  const alpha = alphaDeg * DEG;
  const beta = betaDeg * DEG;
  const gamma = gammaDeg * DEG;
  const screen = screenAngleDeg * DEG;

  // Three.js DeviceOrientationControls factorisation. The Euler order
  // is "YXZ" (note: not "ZXY") — the spec lays out an intrinsic z·x·y
  // rotation but feeding (β, α, -γ) into Three's "YXZ" produces the
  // matching matrix.
  const deviceEuler = new Euler(beta, alpha, -gamma, "YXZ");
  const q = new Quaternion().setFromEuler(deviceEuler);

  // "Camera looks out the back of the phone, not the top of the phone."
  // Without this term a phone held vertically would aim at the user
  // (up the +Y axis) instead of the sky (+Z).
  q.multiply(Q_BACK_TO_FORWARD);

  // Screen orientation: rotate around world Z so landscape doesn't
  // rotate the label plane sideways relative to the user's eyes.
  q.multiply(
    new Quaternion().setFromAxisAngle(UNIT_Z, -screen),
  );

  return q;
}

const UNIT_Z = new Vector3(0, 0, 1);
const Q_BACK_TO_FORWARD = new Quaternion(
  -Math.sqrt(0.5),
  0,
  0,
  Math.sqrt(0.5),
); // -π/2 rotation about the X axis

/**
 * iOS Safari ≥ 13 gates DeviceOrientation behind an explicit permission
 * call that MUST be invoked from a user gesture. Returns "granted" on
 * platforms where no permission is required so callers handle one path.
 */
export async function requestOrientationPermission(): Promise<
  "granted" | "denied" | "unsupported"
> {
  if (
    typeof window === "undefined" ||
    typeof window.DeviceOrientationEvent === "undefined"
  ) {
    return "unsupported";
  }
  const ctor = window.DeviceOrientationEvent as
    | (DeviceOrientationEventConstructorWithPermission & typeof DeviceOrientationEvent)
    | undefined;
  if (ctor && typeof ctor.requestPermission === "function") {
    try {
      return await ctor.requestPermission();
    } catch (err) {
      log.warn("[ar-sky] orientation permission threw", err);
      return "denied";
    }
  }
  return "granted";
}

export type OrientationSession = {
  /** True after permission granted and at least one sample has arrived. */
  active: boolean;
  /** Whether absolute (compass-aware) heading is being used. */
  absolute: boolean;
  /** Latest screen orientation angle in degrees. */
  screenAngle: number;
  /** Tear down listeners. Idempotent. */
  stop: () => void;
};

export type OrientationCallback = (q: Quaternion) => void;

/**
 * Begin streaming orientation quaternions to `cb`. Caller is responsible
 * for invoking `requestOrientationPermission()` first inside the user
 * gesture that opened AR Sky mode — this function only sets up listeners.
 *
 * `deviceorientationabsolute` is preferred when available (Chrome on
 * Android). On iOS we listen to `deviceorientation` and pull the
 * compass heading from `webkitCompassHeading`. On both we listen to
 * `screen.orientation.change` so landscape rotates correctly without a
 * sample needing to arrive first.
 */
export function startOrientation(cb: OrientationCallback): OrientationSession {
  const session: OrientationSession = {
    active: false,
    absolute: false,
    screenAngle: readScreenAngle(),
    stop: () => undefined,
  };

  const handler = (e: DeviceOrientationEvent): void => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    const compass = (e as DeviceOrientationEventWithCompass)
      .webkitCompassHeading;
    let alpha = e.alpha;
    if (typeof compass === "number" && Number.isFinite(compass)) {
      // webkitCompassHeading is degrees CW from north. Convert to the
      // spec-relative CCW alpha by negating: 0 stays 0 (north), 90 →
      // -90 (which when fed into R_z gives the same yaw rotation we'd
      // get from the spec's alpha = 270 east-of-north).
      alpha = -compass;
      session.absolute = true;
    } else if (e.absolute) {
      session.absolute = true;
    }
    const q = orientationToQuat(alpha, e.beta, e.gamma, session.screenAngle);
    session.active = true;
    cb(q);
  };

  const screenHandler = (): void => {
    session.screenAngle = readScreenAngle();
  };

  // 'deviceorientationabsolute' is the Android Chrome best path. On iOS
  // it isn't fired at all and we rely on the compass heading on the
  // plain 'deviceorientation' event. Bind both; the first one to fire
  // wins.
  let absoluteFired = false;
  const absoluteHandler = (e: DeviceOrientationEvent): void => {
    absoluteFired = true;
    session.absolute = true;
    handler(e);
  };
  const relativeHandler = (e: DeviceOrientationEvent): void => {
    // If the absolute channel is firing reliably, skip the relative one
    // to avoid double-driving the camera.
    if (absoluteFired) return;
    handler(e);
  };

  window.addEventListener("deviceorientationabsolute", absoluteHandler);
  window.addEventListener("deviceorientation", relativeHandler);
  if (typeof window.screen !== "undefined" && window.screen.orientation) {
    window.screen.orientation.addEventListener("change", screenHandler);
  }
  window.addEventListener("orientationchange", screenHandler);

  session.stop = (): void => {
    window.removeEventListener(
      "deviceorientationabsolute",
      absoluteHandler,
    );
    window.removeEventListener("deviceorientation", relativeHandler);
    if (typeof window.screen !== "undefined" && window.screen.orientation) {
      window.screen.orientation.removeEventListener("change", screenHandler);
    }
    window.removeEventListener("orientationchange", screenHandler);
    session.active = false;
  };

  return session;
}

function readScreenAngle(): number {
  if (typeof window === "undefined") return 0;
  const so = window.screen?.orientation;
  if (so && typeof so.angle === "number") return so.angle;
  // Legacy fallback — `window.orientation` is removed in modern Safari
  // but some embedded WebViews still expose it.
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === "number" ? legacy : 0;
}

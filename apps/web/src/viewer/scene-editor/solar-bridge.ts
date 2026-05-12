/**
 * Glue between the Scene Editor and {@link SolarFlightScene}.
 *
 * `captureSolarCamera` snapshots the scene's current camera state into
 * an opaque blob; `applySolarCamera` pushes a blob back via the scene's
 * existing public setters (no new APIs needed — the scene already
 * exposes `setFocus`, `setCameraState`, `setTracking`, `setTime`,
 * `setTimeRate`).
 *
 * The blob shape:
 *   {
 *     focus: string;            // body name ("Earth", "Saturn", ...)
 *     cameraDistance: number;   // AU from focus
 *     yaw: number;              // radians
 *     pitch: number;            // radians
 *     simTime: string;          // ISO-8601
 *     timeRate: number;         // sim seconds per wall second
 *     tracking: boolean;        // tracking mode on/off
 *   }
 *
 * `focus` and `tracking` are step-change fields — the runner only flips
 * them once per transition (see scene-runner.ts).
 */
import type { SolarFlightScene } from "../solar/solar-flight";

export type SolarCameraBlob = {
  focus: string;
  cameraDistance: number;
  yaw: number;
  pitch: number;
  simTime: string;
  timeRate: number;
  tracking: boolean;
};

/** Read the scene's current camera state via its `subscribe` snapshot. */
export function captureSolarCamera(scene: SolarFlightScene): Record<string, unknown> {
  // SolarFlightScene publishes its state via subscribe(); we grab a
  // synchronous snapshot by subscribing then immediately unsubscribing.
  let snapshot: SolarCameraBlob | null = null;
  const off = scene.subscribe((s) => {
    snapshot = {
      focus: s.focus,
      cameraDistance: s.cameraDistance,
      yaw: s.yaw,
      pitch: s.pitch,
      simTime: s.time.toISOString(),
      timeRate: s.timeRate,
      tracking: s.tracking,
    };
  });
  off();
  return (snapshot ?? {
    focus: "Sun",
    cameraDistance: 4,
    yaw: 0,
    pitch: 0.4,
    simTime: new Date().toISOString(),
    timeRate: 86400,
    tracking: true,
  }) as unknown as Record<string, unknown>;
}

/** Push a camera blob back into the scene. Silently coerces shape. */
export function applySolarCamera(
  scene: SolarFlightScene,
  blob: Record<string, unknown>,
): void {
  const c = blob as Partial<SolarCameraBlob>;
  if (typeof c.focus === "string") scene.setFocus(c.focus);
  if (
    typeof c.yaw === "number" ||
    typeof c.pitch === "number" ||
    typeof c.cameraDistance === "number"
  ) {
    scene.setCameraState(
      typeof c.yaw === "number" ? c.yaw : NaN,
      typeof c.pitch === "number" ? c.pitch : NaN,
      typeof c.cameraDistance === "number" ? c.cameraDistance : NaN,
    );
  }
  if (typeof c.tracking === "boolean") scene.setTracking(c.tracking);
  if (typeof c.simTime === "string") {
    const d = new Date(c.simTime);
    if (!Number.isNaN(d.getTime())) scene.setTime(d);
  }
  if (typeof c.timeRate === "number") scene.setTimeRate(c.timeRate);
}

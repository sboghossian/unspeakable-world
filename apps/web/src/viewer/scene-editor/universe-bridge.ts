/**
 * Glue between the Scene Editor and {@link UniverseScene}.
 *
 * `captureUniverseCamera` snapshots the scene's current camera state
 * into an opaque blob; `applyUniverseCamera` pushes a blob back via
 * the scene's existing public setters (`setCameraLogical`,
 * `setTrackingTarget`, `setTime`, `setTimeRate`, `setOverlay`,
 * `setOverlayMix`).
 *
 * The blob shape:
 *   {
 *     trackingTarget: string | null;
 *     cameraLogicalPos: { x: number; y: number; z: number };
 *     yaw: number;
 *     pitch: number;
 *     simTime: string;             // ISO
 *     rate: number;                // sim seconds per wall second
 *     overlayId: string | null;
 *     overlayMix: number;
 *   }
 */
import type { UniverseScene } from "../universe/universe-scene";

export type UniverseCameraBlob = {
  trackingTarget: string | null;
  cameraLogicalPos: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  simTime: string;
  rate: number;
  overlayId: string | null;
  overlayMix: number;
};

export function captureUniverseCamera(
  scene: UniverseScene,
): Record<string, unknown> {
  let snapshot: UniverseCameraBlob | null = null;
  const off = scene.subscribe((s) => {
    snapshot = {
      trackingTarget: s.trackingTarget,
      cameraLogicalPos: { ...s.cameraLogicalPos },
      yaw: s.yaw,
      pitch: s.pitch,
      simTime: s.time.toISOString(),
      rate: s.rate,
      overlayId: s.overlayId,
      overlayMix: s.overlayMix,
    };
  });
  off();
  return (snapshot ?? {
    trackingTarget: null,
    cameraLogicalPos: { x: 26000, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    simTime: new Date().toISOString(),
    rate: 86400,
    overlayId: null,
    overlayMix: 0,
  }) as unknown as Record<string, unknown>;
}

export function applyUniverseCamera(
  scene: UniverseScene,
  blob: Record<string, unknown>,
): void {
  const c = blob as Partial<UniverseCameraBlob>;
  // Tracking target first — releasing tracking before snapping camera
  // avoids the scene re-applying a tracking offset on top of our pose.
  if (c.trackingTarget !== undefined) {
    scene.setTrackingTarget(c.trackingTarget ?? null);
  }
  if (
    c.cameraLogicalPos &&
    typeof c.cameraLogicalPos === "object" &&
    typeof (c.cameraLogicalPos as { x: unknown }).x === "number"
  ) {
    const p = c.cameraLogicalPos as { x: number; y: number; z: number };
    scene.setCameraLogical(
      p.x,
      p.y,
      p.z,
      typeof c.yaw === "number" ? c.yaw : NaN,
      typeof c.pitch === "number" ? c.pitch : NaN,
    );
  }
  if (typeof c.simTime === "string") {
    const d = new Date(c.simTime);
    if (!Number.isNaN(d.getTime())) scene.setTime(d);
  }
  if (typeof c.rate === "number") scene.setTimeRate(c.rate);
  if (c.overlayId !== undefined) {
    scene.setOverlay(c.overlayId ?? null);
  }
  if (typeof c.overlayMix === "number") scene.setOverlayMix(c.overlayMix);
}

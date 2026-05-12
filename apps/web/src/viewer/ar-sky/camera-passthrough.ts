import { log } from "../../lib/logger";

/**
 * 📷 Rear-camera passthrough for AR Sky mode.
 *
 * Wraps `navigator.mediaDevices.getUserMedia({ video: { facingMode:
 * { ideal: "environment" } }})` so the caller gets a single `start()`
 * call that returns the attached MediaStream and a `stop()` function
 * that fully tears down every track. We deliberately keep this thin —
 * no MediaDevices wrapper deps, no library — to honour the project's
 * "no extra deps" hard constraint.
 *
 * Browser support matrix (May 2026):
 *   - Chrome Android: rear-camera selection via facingMode works since
 *     long ago. No permission gate beyond the standard getUserMedia
 *     prompt. Multi-camera devices may need a deviceId enumeration
 *     pass if facingMode picks the wrong lens — out of scope for v1.
 *   - iOS Safari: rear-camera via facingMode works since iOS 14.3.
 *     Permission prompt fires once per origin per session. Must be
 *     called from a user gesture (button click), enforced by Safari.
 *   - Desktop / no rear cam: `facingMode: "environment"` is treated as
 *     an `ideal` constraint so getUserMedia falls back to the default
 *     webcam instead of failing. Callers should still expect the
 *     denial path (no camera at all, or permission declined) and use
 *     the "AR without camera" fallback.
 */

type CameraStartOk = {
  ok: true;
  stream: MediaStream;
  stop: () => void;
};

type CameraStartErr = {
  ok: false;
  reason: "no-mediadevices" | "permission-denied" | "no-camera" | "unknown";
  detail: string;
};

export type CameraStartResult = CameraStartOk | CameraStartErr;

/**
 * Attach the rear camera to the given <video> element. Returns a result
 * discriminated union so the UI can render an "AR without camera"
 * fallback for the denial / no-rear-cam cases.
 */
export async function startRearCamera(
  videoEl: HTMLVideoElement,
): Promise<CameraStartResult> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    return {
      ok: false,
      reason: "no-mediadevices",
      detail: "navigator.mediaDevices.getUserMedia is unavailable",
    };
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch (err) {
    const name = (err as DOMException | undefined)?.name ?? "";
    const detail = err instanceof Error ? err.message : String(err);
    if (name === "NotAllowedError" || name === "SecurityError") {
      return { ok: false, reason: "permission-denied", detail };
    }
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      return { ok: false, reason: "no-camera", detail };
    }
    log.warn("[ar-sky] getUserMedia threw", err);
    return { ok: false, reason: "unknown", detail };
  }

  // Wire the stream to the <video> element. We deliberately set the
  // attributes that mobile Safari requires for inline autoplay: muted
  // and playsInline. Without these the video element refuses to start
  // and we get a black background. autoplay must be triggered post
  // user-gesture (caller already inside a click handler).
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("webkit-playsinline", "");
  videoEl.autoplay = true;
  try {
    await videoEl.play();
  } catch (err) {
    log.warn("[ar-sky] video.play() rejected", err);
    // Not fatal — the stream is still flowing, the user can tap to
    // reactivate if Safari really insists. Continue anyway.
  }

  const stop = (): void => {
    try {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    } catch (err) {
      log.warn("[ar-sky] track.stop threw", err);
    }
    try {
      videoEl.pause();
      videoEl.srcObject = null;
    } catch (err) {
      log.warn("[ar-sky] video teardown threw", err);
    }
  };

  return { ok: true, stream, stop };
}

import { useEffect, useState } from "react";
import {
  disableGyroscope,
  enableGyroscope,
  gyroSupported,
} from "../observer/gyro-controls";

/**
 * 📱 Gyroscope / AR mode toggle in the top bar.
 *
 * Visible only on touch devices ('ontouchstart' in window). Clicking
 * requests DeviceOrientation permission (iOS 13+ prompt) and starts
 * piping the phone's tilt into the camera. Click again to stop.
 *
 * If permission is denied or the device has no motion sensors, we
 * surface a quiet toast instead of an alert — gyro is a nice-to-have,
 * not a critical path.
 */

type SceneLike = {
  setCameraDirection: (yaw: number, pitch: number) => void;
};

type Props = {
  /** The active scene (ViewerScene or UniverseScene). Null while loading. */
  scene: SceneLike | null;
};

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function GyroButton({ scene }: Props) {
  const [on, setOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isTouchDevice() && gyroSupported());
  }, []);

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(handle);
  }, [toast]);

  // Disable on unmount to avoid leaking listeners when the user switches modes.
  useEffect(() => {
    return () => {
      if (on) disableGyroscope();
    };
  }, [on]);

  if (!supported) return null;

  const handleClick = async (): Promise<void> => {
    if (!scene) return;
    if (on) {
      disableGyroscope();
      setOn(false);
      return;
    }
    const res = await enableGyroscope(scene);
    if (res.ok) {
      setOn(true);
      setToast(
        "Tilt your device to look around — works best on phones with motion sensors.",
      );
    } else {
      setOn(false);
      setToast(
        "Tilt-to-look isn't available — motion sensor permission was declined.",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        title={on ? "Stop AR mode (tilt-to-look)" : "Start AR mode — tilt to look around"}
        aria-label={on ? "Stop AR mode" : "Start AR mode"}
        aria-pressed={on}
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] backdrop-blur transition ${
          on
            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>📱</span>
        <span className="font-mono text-[10px] tracking-widest">
          {on ? "AR ON" : "AR"}
        </span>
      </button>
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto rounded-lg border border-emerald-400/30 bg-space-950/95 px-3 py-2 font-mono text-[11px] text-emerald-100 shadow-lg backdrop-blur">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

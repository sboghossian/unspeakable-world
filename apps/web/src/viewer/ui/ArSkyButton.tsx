import { lazy, Suspense, useEffect, useState } from "react";
import type { ViewerScene } from "../scene/scene";

/**
 * 🛰 AR Sky — top-bar entry point.
 *
 * Mobile-only button that swaps the viewer into an AR overlay: rear-
 * camera passthrough + gyroscope-driven camera + label sprites. Click
 * is the user gesture iOS Safari requires to call both
 * `getUserMedia` and `DeviceOrientationEvent.requestPermission`.
 *
 * The full overlay is dynamic-imported so the first-paint bundle
 * doesn't pay for `Quaternion` / `MediaStream` / etc until the user
 * actually opens AR Sky.
 */

const ArSkyOverlay = lazy(() =>
  import("./ArSkyOverlay").then((m) => ({ default: m.ArSkyOverlay })),
);

type Props = {
  scene: ViewerScene | null;
};

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function ArSkyButton({ scene }: Props) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // We require a touch device with DeviceOrientation. AR Sky on a
    // desktop without a gyro just shows a black background that
    // doesn't move — not useful. Hide rather than confuse.
    setSupported(
      isTouchDevice() && typeof window.DeviceOrientationEvent !== "undefined",
    );
  }, []);

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!scene}
        title="AR Sky — point your phone at the sky to identify what's above you"
        aria-label="Enter AR Sky mode"
        aria-pressed={open}
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] backdrop-blur transition ${
          open
            ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200 hover:bg-fuchsia-400/25"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span aria-hidden>🛰</span>
        <span className="font-mono text-[10px] tracking-widest">AR SKY</span>
      </button>
      {open && scene && (
        <Suspense fallback={null}>
          <ArSkyOverlay scene={scene} onExit={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

import { useEffect, useState } from "react";

/**
 * 👋 First-run hint — a small floating card that explains the three
 * non-obvious gestures: drag, click, ?. Renders once per browser
 * (localStorage flag), auto-dismisses after the user does anything
 * (pointer move on the canvas, click, or any keypress) or after a hard
 * 8-second timeout. Suppressing it permanently via the close button
 * also writes the flag.
 */

const SEEN_KEY = "uw:first-run-hint-seen";

export function FirstRunHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      // Private mode — show once per session, fail open.
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const dismiss = () => {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setVisible(false);
    };
    const onAny = () => dismiss();
    window.addEventListener("pointerdown", onAny, { once: true });
    window.addEventListener("keydown", onAny, { once: true });
    const t = window.setTimeout(dismiss, 8000);
    return () => {
      window.removeEventListener("pointerdown", onAny);
      window.removeEventListener("keydown", onAny);
      window.clearTimeout(t);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-space-950/85 px-4 py-2.5 backdrop-blur">
        <span className="text-lg">👋</span>
        <div className="flex-1 text-xs text-white/80">
          <span className="font-display text-sm text-white">
            Welcome to the sky.
          </span>{" "}
          <span className="text-white/60">
            <kbd className="mx-0.5 rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[10px]">
              drag
            </kbd>{" "}
            to look,{" "}
            <kbd className="mx-0.5 rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[10px]">
              click
            </kbd>{" "}
            to inspect, press{" "}
            <kbd className="mx-0.5 rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[10px]">
              ?
            </kbd>{" "}
            for shortcuts.
          </span>
        </div>
      </div>
    </div>
  );
}

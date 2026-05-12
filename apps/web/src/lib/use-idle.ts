import { useEffect, useState } from "react";

/**
 * Returns `true` when no `mousemove`, `pointerdown`, or `keydown` event
 * has fired on the window in the last `ms` milliseconds. Used to fade
 * non-essential chrome (top bar) once the user is just contemplating
 * the 3D canvas.
 *
 * The hook listens passively to keep input cost low and clears its
 * timer on unmount.
 */
export function useIdle(ms = 3500): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    const arm = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
    const wake = () => {
      setIdle(false);
      arm();
    };
    arm();
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "pointerdown",
      "keydown",
    ];
    for (const e of events) window.addEventListener(e, wake, { passive: true });
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, wake);
    };
  }, [ms]);

  return idle;
}

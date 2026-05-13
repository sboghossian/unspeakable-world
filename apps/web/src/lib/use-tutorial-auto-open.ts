import { useEffect, useRef } from "react";

/**
 * Auto-open the 12-step tutorial the first time a learner enters any
 * viewer mode. Shared across Universe, Viewer, Solar Flight, Galactic,
 * Sandbox, and PlanetSurface so users aren't re-tutorialised when they
 * switch modes — once dismissed in any mode, the key is set and we
 * stay quiet everywhere.
 *
 * The key must match `TutorialOverlayV2`'s internal key (`uw:tutorial-v2-done:v1`)
 * so the existing TutorialOverlayV2 → "got it" persistence keeps working.
 */
const TUTORIAL_KEY = "uw:tutorial-v2-done:v1";

export function useTutorialAutoOpen(setOpen: (v: boolean) => void): void {
  // Fire exactly once per component lifetime. React StrictMode mounts
  // effects twice in dev — the ref guard prevents a double-open.
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    try {
      if (
        typeof window === "undefined" ||
        typeof localStorage === "undefined"
      ) {
        return;
      }
      if (localStorage.getItem(TUTORIAL_KEY) !== "1") {
        setOpen(true);
      }
    } catch {
      // localStorage disabled (privacy mode, etc.) — fall back to
      // opening once per session. The TutorialOverlayV2 itself handles
      // its own dismissal so this is safe.
      setOpen(true);
    }
    // setOpen is captured at call time; we don't want this to retrigger
    // if the parent re-creates the setter on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

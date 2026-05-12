import { useEffect, useState } from "react";

/**
 * 🌊 Cosmic-flow hint — one-time educational toast that explains the
 * peculiar-velocity streamlines on first activation of the layer.
 *
 * Behaviour: when `active` flips true, the hint fades in at the top
 * centre of the canvas, lingers ~6 s, then auto-dismisses. A
 * localStorage flag suppresses it on subsequent activations.
 *
 * The parent (LeftRail / Universe) decides when `active` is true —
 * typically the moment the user enables the cosmic-flows layer.
 */

const SEEN_KEY = "uw:cosmic-flow-hint-seen";
const VISIBLE_MS = 6000;

export function CosmicFlowHint({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      // Private mode — show once per session anyway.
    }
    setVisible(true);
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      setVisible(false);
    }, VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-xl border border-cyan-300/25 bg-space-950/90 px-4 py-2.5 shadow-lg shadow-cyan-500/10 backdrop-blur animate-[fadeIn_300ms_ease-out]">
        <span className="text-lg">🌊</span>
        <div className="flex-1 text-xs text-white/85">
          <span className="font-display text-sm text-cyan-200">
            Cosmicflows-4
          </span>{" "}
          <span className="text-white/70">
            Streamlines show the gravitational pull of dark-matter
            superclusters. We are being pulled toward the{" "}
            <span className="text-amber-200">Great Attractor</span> and
            ultimately the{" "}
            <span className="text-amber-200">Shapley Concentration</span>.
          </span>
        </div>
      </div>
    </div>
  );
}

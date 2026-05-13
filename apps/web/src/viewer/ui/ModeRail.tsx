import { navigate, useRoute, type Route } from "../../router";

/**
 * 🛰 Mode Rail — a slim vertical button stack pinned to the left edge
 * that lets the user jump between Universe, Sky Viewer, Solar Flight,
 * Galactic, Sandbox, and Planet Surface from any viewer mode.
 *
 * Mobile uses the `MobileMenuDrawer` for the same job (hidden via
 * Tailwind's `md:`); this rail only renders ≥ md. The rail itself is
 * mounted once in `App.tsx`, so every viewer route gets it for free
 * without each scene having to opt in.
 */

type ModeItem = {
  /** The router target. Surface defaults to Earth. */
  route: Route;
  /** Glyph rendered in the 44×44 button. */
  glyph: string;
  /** Short label shown on hover (title) + as a tooltip pill. */
  label: string;
};

const MODES: ModeItem[] = [
  { route: "universe", glyph: "🌌", label: "Universe" },
  { route: "viewer", glyph: "🔭", label: "Sky viewer" },
  { route: "solar", glyph: "🚀", label: "Solar flight" },
  { route: "galactic", glyph: "🌠", label: "Galactic" },
  { route: "sandbox", glyph: "⚛", label: "Sandbox" },
  { route: "surface", glyph: "🪐", label: "Planet surface" },
];

export function ModeRail() {
  const route = useRoute();
  // Hide on landing + auxiliary routes — the rail is only meaningful
  // when the user is already inside a viewer scene.
  if (
    route === "landing" ||
    route === "guide" ||
    route === "class" ||
    route === "whoami" ||
    route === "verify-cert"
  ) {
    return null;
  }
  return (
    <nav
      aria-label="Mode switcher"
      className="pointer-events-auto fixed left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1.5 rounded-xl border border-white/10 bg-space-950/70 p-1.5 backdrop-blur md:flex"
    >
      {MODES.map((m) => {
        const active = m.route === route;
        return (
          <button
            key={m.route}
            type="button"
            onClick={() => navigate(m.route)}
            title={m.label}
            aria-label={`Switch to ${m.label}`}
            aria-current={active ? "page" : undefined}
            className={`group relative inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border font-mono text-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${
              active
                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                : "border-white/5 bg-white/[0.03] text-white/70 hover:bg-white/10 hover:text-emerald-200"
            }`}
          >
            <span aria-hidden>{m.glyph}</span>
            {/* Tooltip pill — visible on hover/focus only. */}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-space-950/95 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 backdrop-blur group-hover:block group-focus-visible:block"
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

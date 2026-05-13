import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "../../i18n/hooks";
import { cn, PANEL, RADIUS } from "../../lib/design-tokens";
import { navigate, type Route } from "../../router";
import { useCopilotStore } from "../../lib/copilot-store";

/**
 * 📱 Hamburger drawer — the mobile-only home for every secondary top-bar
 * action that doesn't fit on a 375 px-wide phone. The desktop layout
 * keeps every button inline as before; this drawer is only rendered
 * inside a `flex md:hidden` wrapper in the per-mode scene wrappers.
 *
 * Closes on `Escape` or click outside. Children are unmounted while the
 * drawer is closed so their own popover triggers don't add hidden state
 * to the DOM, and each row gets a min-h-[44px] touch target.
 *
 * Two call styles supported (don't mix):
 *  - `<MobileMenuDrawer groups={…} />` — original API. The caller
 *    controls the entire body. Used by Viewer.tsx's rich overflow
 *    drawer.
 *  - `<MobileMenuDrawer mode="universe" />` — new mode-scoped API.
 *    The drawer renders a standard set of items (mode switcher, Show
 *    Me How, GitHub, User Guide) and is suitable for the simpler
 *    scenes (Universe, Solar, Galactic, Sandbox, PlanetSurface) that
 *    don't have their own per-section overflow content.
 */

export type MobileMenuGroup = { label: string; children: ReactNode };

export type MobileMenuMode =
  | "viewer"
  | "universe"
  | "solar"
  | "galactic"
  | "sandbox"
  | "surface";

type Props = {
  /** Explicit groups — caller controls the body. */
  groups?: MobileMenuGroup[];
  /**
   * Mode-scoped default body. When provided (and `groups` is not), the
   * drawer renders a "switch mode" row, a "show me how" button, a
   * GitHub link, and a "user guide" link. Caller may optionally pass
   * `onShowTutorial` so the in-scene tutorial overlay can be opened
   * directly; absent that, we fall back to navigating to `#guide`.
   */
  mode?: MobileMenuMode;
  /**
   * When `mode` is set: callback wired to the "show me how" button.
   * Used so each scene can open its own `TutorialOverlayV2`. When
   * omitted we navigate to `#guide` instead.
   */
  onShowTutorial?: () => void;
  /**
   * When true, render as a compact "more ▾" overflow popover anchored to
   * the trigger (desktop top-bar use). When false/undefined the original
   * full-width sheet + backdrop renders (mobile drawer use). Mobile
   * behaviour is byte-for-byte unchanged.
   */
  desktop?: boolean;
};

const MODE_ITEMS: Array<{ route: Route; glyph: string; label: string }> = [
  { route: "universe", glyph: "🌌", label: "Universe" },
  { route: "viewer", glyph: "🔭", label: "Sky" },
  { route: "solar", glyph: "🚀", label: "Solar" },
  { route: "galactic", glyph: "🌠", label: "Galactic" },
  { route: "sandbox", glyph: "⚛", label: "Sandbox" },
  { route: "surface", glyph: "🪐", label: "Surface" },
];

const GITHUB_URL = "https://github.com/sboghossian/unspeakable-world";

export function MobileMenuDrawer({
  groups,
  mode,
  onShowTutorial,
  desktop = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const t = useT();
  const openCopilot = useCopilotStore((s) => s.setOpen);

  // Default mode-scoped groups. Only built when the caller used the
  // `mode` API (and didn't supply their own `groups`). Stable per
  // render to keep the underlying drawer body keyed predictably.
  const defaultGroups = useMemo<MobileMenuGroup[]>(() => {
    if (!mode) return [];
    return [
      {
        label: "Modes",
        children: (
          <div className="flex flex-wrap gap-1.5">
            {MODE_ITEMS.map((m) => {
              const active = m.route === modeToRoute(mode);
              return (
                <button
                  key={m.route}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(m.route);
                  }}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px] transition ${
                    active
                      ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                  }`}
                >
                  <span aria-hidden>{m.glyph}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        ),
      },
      {
        label: "Help",
        children: (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (onShowTutorial) onShowTutorial();
                else window.location.hash = "#guide";
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/20"
            >
              <span aria-hidden>📖</span> show me how
            </button>
            <a
              href="#guide"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/75 transition hover:bg-white/10"
            >
              <span aria-hidden>📘</span> user guide
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/75 transition hover:bg-white/10"
            >
              <span aria-hidden>⌥</span> github
            </a>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openCopilot(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-violet-400/40 bg-violet-400/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-violet-200 transition hover:bg-violet-400/20"
            >
              <span aria-hidden>🧠</span> copilot
            </button>
          </div>
        ),
      },
    ];
  }, [mode, onShowTutorial, openCopilot]);

  const effectiveGroups: MobileMenuGroup[] = groups ?? defaultGroups;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Capture phase so a child popover that stops propagation still lets
    // the drawer close when the user taps the backdrop.
    window.addEventListener("mousedown", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick, true);
    };
  }, [open]);

  // A11y focus management: when the drawer opens we move focus to its first
  // focusable element (so keyboard users land inside); when it closes we
  // return focus to the trigger button. This is the minimum focus-trap
  // pattern WCAG asks for without trapping forward Tab inside.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
    return () => {
      // On close, return focus to the trigger so keyboard users don't lose
      // their place. Wrap in try/catch — the button may be unmounted.
      try {
        buttonRef.current?.focus();
      } catch {
        /* ignore */
      }
    };
  }, [open]);

  const triggerClass = desktop
    ? `pointer-events-auto inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5 font-mono text-xs backdrop-blur transition ${
        open
          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
          : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
      }`
    : `pointer-events-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border text-base backdrop-blur transition ${
        open
          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
          : "border-white/10 bg-space-950/70 text-white/80 hover:bg-white/10 hover:text-white"
      }`;

  const body = (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("menu.more")}
        aria-label={t("menu.more.aria")}
        aria-expanded={open}
        className={triggerClass}
      >
        {desktop ? (
          <>
            <span>more</span>
            <span aria-hidden>▾</span>
          </>
        ) : (
          <span aria-hidden>☰</span>
        )}
      </button>
      {open && desktop && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="More tools"
          className={cn(
            "pointer-events-auto absolute right-0 top-9 z-30 w-[min(420px,94vw)] max-h-[min(560px,80vh)] overflow-y-auto p-3",
            RADIUS.lg,
            PANEL.elevated,
          )}
        >
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-sm text-white/95">
                {t("menu.more")}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/65">
                {t("menu.more.subtitle")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("menu.more.close")}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {effectiveGroups.map((g) => (
              <section key={g.label}>
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
                  {g.label}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {g.children}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-3 border-t border-white/5 pt-2 text-right font-mono text-[9px] uppercase tracking-[0.25em] text-white/65">
            {t("menu.help.desktop")}
          </div>
        </div>
      )}
      {open && !desktop && (
        <>
          {/* Backdrop — taps anywhere outside the sheet close it. */}
          <div
            className="pointer-events-auto fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("menu.more")}
            className={cn(
              "pointer-events-auto fixed inset-x-2 top-14 z-40 max-h-[calc(100vh-7rem)] overflow-y-auto p-3",
              RADIUS.lg,
              PANEL.elevated,
            )}
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display text-sm text-white/95">
                  {t("menu.more")}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/65">
                  {t("menu.more.subtitle")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("menu.more.close")}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/10 bg-white/5 font-mono text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {effectiveGroups.map((g) => (
                <section key={g.label}>
                  <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
                    {g.label}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.children}
                  </div>
                </section>
              ))}
            </div>
            <div className="mt-3 border-t border-white/5 pt-2 text-right font-mono text-[9px] uppercase tracking-[0.25em] text-white/65">
              {t("menu.help.mobile")}
            </div>
          </div>
        </>
      )}
    </>
  );
  return desktop ? <div className="relative">{body}</div> : body;
}

/** Map a `MobileMenuMode` → router `Route`. `surface` maps to the
 *  surface route (which defaults to Earth when no planet hint is set). */
function modeToRoute(mode: MobileMenuMode): Route {
  if (mode === "surface") return "surface";
  return mode;
}

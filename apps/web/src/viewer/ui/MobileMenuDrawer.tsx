import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "../../i18n/hooks";
import { cn, PANEL, RADIUS } from "../../lib/design-tokens";

/**
 * 📱 Hamburger drawer — the mobile-only home for every secondary top-bar
 * action that doesn't fit on a 375 px-wide phone. The desktop layout
 * keeps every button inline as before; this drawer is only rendered
 * inside a `flex md:hidden` wrapper in `Viewer.tsx`.
 *
 * Closes on `Escape` or click outside. Children are unmounted while the
 * drawer is closed so their own popover triggers don't add hidden state
 * to the DOM, and each row gets a min-h-[44px] touch target.
 */

export type MobileMenuGroup = { label: string; children: ReactNode };

type Props = {
  groups: MobileMenuGroup[];
  /**
   * When true, render as a compact "more ▾" overflow popover anchored to
   * the trigger (desktop top-bar use). When false/undefined the original
   * full-width sheet + backdrop renders (mobile drawer use). Mobile
   * behaviour is byte-for-byte unchanged.
   */
  desktop?: boolean;
};

export function MobileMenuDrawer({ groups, desktop = false }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const t = useT();

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
            {groups.map((g) => (
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
              {groups.map((g) => (
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

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 🔭 Explore drawer — a Notion-style consolidated home for secondary
 * panels. The viewer top bar would otherwise carry ~22 buttons that
 * spill onto multiple rows; instead, one tidy "explore" button opens a
 * popover whose only job is to host the existing panel components in
 * grouped rows.
 *
 * When the drawer is **closed**, children aren't mounted at all — so
 * their inline trigger buttons don't pollute the top bar. When the
 * drawer is **open**, all children mount in a grid and the user clicks
 * the panel they want. Each panel's own popover is `position: absolute`
 * so it can extend past the drawer popover unhindered.
 *
 * The drawer closes on `Escape` or click outside.
 */

export type Group = { label: string; children: ReactNode };

type Props = {
  groups: Group[];
};

export function ExploreDrawer({ groups }: Props) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Listen at the capture phase so a "outside click" still fires even
    // if a child panel stops propagation on its own popover handlers.
    window.addEventListener("mousedown", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Explore the universe — lessons, news, imagery, tools"
        aria-label="Explore the universe"
        aria-expanded={open}
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] backdrop-blur transition ${
          open
            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
            : "border-white/10 bg-space-950/70 text-white/80 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>🔭</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
          explore
        </span>
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(560px,94vw)] max-h-[min(500px,80vh)] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-4 shadow-2xl backdrop-blur"
          role="dialog"
          aria-label="Explore the universe"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-sm text-white/95">
                Explore the universe
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                lessons · news · imagery · tools
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
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
          <div className="mt-3 border-t border-white/5 pt-2 text-right font-mono text-[9px] uppercase tracking-[0.25em] text-white/35">
            Esc to close
          </div>
        </div>
      )}
    </>
  );
}

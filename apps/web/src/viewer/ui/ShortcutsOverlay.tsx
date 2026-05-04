/**
 * ⌨ Keyboard shortcuts modal.
 *
 * Pure documentation — the bindings themselves are wired in Viewer.tsx
 * via a single window-level keydown listener. This component just renders
 * a centered list of "Key → Action" rows and a close button. Press `?`
 * to open, `Esc` to close.
 */

type Shortcut = { keys: string[]; label: string };

const SHORTCUTS: Array<{ section: string; items: Shortcut[] }> = [
  {
    section: "Navigation",
    items: [
      { keys: ["drag"], label: "Pan the sky" },
      { keys: ["wheel", "pinch"], label: "Zoom in / out" },
      { keys: ["click"], label: "Inspect object (SIMBAD + Wikipedia)" },
    ],
  },
  {
    section: "Search & jump",
    items: [
      { keys: ["⌘", "K"], label: "Open search" },
      { keys: ["/", ""], label: "Open search (alt)" },
      { keys: ["Esc"], label: "Close panels" },
    ],
  },
  {
    section: "Time",
    items: [
      { keys: ["Space"], label: "Play / pause time" },
      { keys: ["←", "→"], label: "Step time backward / forward" },
      { keys: [".", ""], label: "Reset to now" },
    ],
  },
  {
    section: "Tour & view",
    items: [
      { keys: ["t", ""], label: "Start the Grand Tour" },
      { keys: ["c", ""], label: "Toggle constellation lines" },
      { keys: ["g", ""], label: "Toggle coordinate grid" },
      { keys: ["n", ""], label: "Toggle bright-star names" },
      { keys: ["i", ""], label: "About / credits" },
      { keys: ["e", ""], label: "Astronomical events" },
      { keys: ["?"], label: "Show this overlay" },
    ],
  },
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-white/10 bg-space-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              keyboard shortcuts
            </div>
            <div className="font-display text-sm text-white">
              The Unspeakable World — keys
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Esc ✕
          </button>
        </header>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2">
          {SHORTCUTS.map((g) => (
            <section key={g.section}>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
                {g.section}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((s, i) => (
                  <li
                    key={`${g.section}-${i}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-white/75">{s.label}</span>
                    <span className="flex shrink-0 gap-1">
                      {s.keys
                        .filter((k) => k.length > 0)
                        .map((k, j) => (
                          <kbd
                            key={`${k}-${j}`}
                            className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/80"
                          >
                            {k}
                          </kbd>
                        ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="border-t border-white/5 px-5 py-2 font-mono text-[10px] text-white/30">
          Drag works on touch too · pinch to zoom · long-press to inspect
        </footer>
      </div>
    </div>
  );
}

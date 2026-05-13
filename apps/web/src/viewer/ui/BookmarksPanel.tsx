import { useState } from "react";
import { removeBookmark, useBookmarks } from "../../lib/bookmarks";
import { EmptyState } from "./EmptyState";

/**
 * ⭐ Cross-mode bookmarks panel.
 *
 * A small star-button toggle that opens a floating popover listing all
 * saved views across modes. Clicking a row navigates to its URL — the
 * destination mode reads its own hash params on mount and restores camera
 * state.
 */

const TONE_BY_MODE: Record<string, string> = {
  viewer: "text-emerald-200",
  solar: "text-cyan-200",
  galactic: "text-violet-200",
  universe: "text-emerald-200",
  surface: "text-amber-200",
};

export function BookmarksPanel() {
  const [open, setOpen] = useState(false);
  const list = useBookmarks();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Bookmarks — saved views across all modes"
        aria-label={`Bookmarks (${list.length} saved)`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="bookmarks-listbox"
        className={`pointer-events-auto rounded-lg border px-2.5 py-1.5 font-mono text-xs backdrop-blur transition ${
          open
            ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden="true">★</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(320px,90vw)] rounded-xl border border-white/10 bg-space-950/95 p-2 shadow-lg backdrop-blur">
          <div className="mb-1.5 flex items-baseline justify-between px-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
              ★ bookmarks
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
          {list.length === 0 ? (
            <EmptyState
              icon="★"
              title="Save the views you'll come back to"
              body="Frame anything you love and tap ★ save view in any mode — Sky, Solar, Galactic, Universe. Bookmarks live in your browser."
              tone="amber"
              density="compact"
              cta={{ label: "Got it", onClick: () => setOpen(false) }}
            />
          ) : (
            <ul
              id="bookmarks-listbox"
              role="listbox"
              aria-label="Saved bookmarks"
              className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto"
            >
              {list.map((b) => (
                <li
                  key={b.id}
                  role="option"
                  aria-selected="false"
                  className="flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5"
                >
                  <a
                    href={b.url}
                    onClick={() => setOpen(false)}
                    className="flex-1 truncate font-mono text-[11px] text-white/85 hover:text-white"
                    title={b.url}
                  >
                    <span
                      className={`mr-1.5 text-[10px] uppercase tracking-widest ${TONE_BY_MODE[b.mode] ?? "text-white/50"}`}
                    >
                      {b.mode}
                    </span>
                    {b.title}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeBookmark(b.id)}
                    aria-label={`Remove ${b.title}`}
                    className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/65 hover:bg-rose-400/15 hover:text-rose-200"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

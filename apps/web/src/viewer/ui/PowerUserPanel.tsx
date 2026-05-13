import { useEffect, useState } from "react";
import type { Group } from "three";
import { CustomHipsPanel } from "./CustomHipsPanel";
import { FitsPanel } from "./FitsPanel";
import { AdqlPanel } from "./AdqlPanel";

/**
 * "Pro tools" overflow popover.
 *
 * Single top-bar button → tabbed sheet with three power-user features:
 *   • Custom HiPS — paste a HiPS root URL, auto-register the survey.
 *   • FITS — drop a file, read header/WCS, render a thumbnail, project on sky.
 *   • ADQL — query VizieR TAP, plot point results.
 *
 * Intentionally minimal layout — no fancy animation, no focus trap. The
 * panel is dismissed by clicking ✕ or the surrounding backdrop, and it
 * leaks no global state when closed (each tab unmounts cleanly).
 */

type TabId = "hips" | "fits" | "adql";

type Props = {
  /** The scene's power-user mount group (null until the scene is live). */
  group: Group | null;
  /** Callback so the host can request a re-render after we mount objects. */
  onMarkDirty?: () => void;
  /** Callback so the host can change the active wavelength overlay. */
  onActivateOverlay?: (surveyId: string) => void;
};

export function PowerUserPanel({ group, onMarkDirty, onActivateOverlay }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("hips");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Power-user tools — custom HiPS, FITS, ADQL"
        className="pointer-events-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-amber-200 backdrop-blur transition hover:bg-amber-400/20"
      >
        ⚙ pro tools
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-end bg-space-950/60 p-2 backdrop-blur-sm sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="pointer-events-auto flex h-full w-full max-w-md flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-space-950/95 p-3 shadow-2xl">
            <header className="flex items-center justify-between">
              <h2 className="font-display text-base text-white">⚙ pro tools</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </header>

            <nav className="flex gap-1">
              {([
                { id: "hips" as const, label: "custom HiPS" },
                { id: "fits" as const, label: "FITS upload" },
                { id: "adql" as const, label: "ADQL / TAP" },
              ]).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-md border px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                    tab === t.id
                      ? "border-plasma-500/40 bg-plasma-500/15 text-plasma-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto pr-1">
              {tab === "hips" && onActivateOverlay && (
                <CustomHipsPanel onActivate={onActivateOverlay} />
              )}
              {tab === "hips" && !onActivateOverlay && (
                <CustomHipsPanel />
              )}
              {tab === "fits" && (
                <FitsPanel group={group} onMarkDirty={onMarkDirty} />
              )}
              {tab === "adql" && (
                <AdqlPanel group={group} onMarkDirty={onMarkDirty} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

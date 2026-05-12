import { useEffect, useState } from "react";
import {
  ACHIEVEMENTS,
  getRecentUnlock,
  unlockedCount,
  useAchievements,
  type Achievement,
} from "../../lib/achievements";
import { t, useLanguage } from "../../lib/i18n";

/**
 * Trophy icon in the top-bar that opens a popover listing every
 * achievement with a locked / unlocked state. Also surfaces a
 * transient toast in the bottom-right whenever a new unlock fires —
 * the toast self-dismisses after a few seconds.
 */

export function AchievementsPanel() {
  useLanguage();
  const [open, setOpen] = useState(false);
  const state = useAchievements();
  const total = ACHIEVEMENTS.length;
  const got = unlockedCount();
  const [toast, setToast] = useState<Achievement | null>(null);

  // Polling check for the most-recent unlock so a parallel call from
  // anywhere in the codebase still surfaces a toast even if the user
  // hasn't opened the panel.
  useEffect(() => {
    const handle = window.setInterval(() => {
      const recent = getRecentUnlock(4000);
      setToast((cur) =>
        recent && (!cur || cur.id !== recent.id) ? recent : cur,
      );
    }, 1000);
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const handle = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(handle);
  }, [toast]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${t("panel.achievements", "Achievements")} (${got} / ${total})`}
        aria-label={t("panel.achievements", "Achievements")}
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>🏆</span>
        <span className="font-mono text-[10px] tracking-widest">
          {got}/{total}
        </span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(360px,92vw)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              {t("panel.achievements", "Achievements")}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              {got} / {total}
            </div>
          </div>
          <ul className="space-y-1.5">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = !!state.unlocked[a.id];
              return (
                <li
                  key={a.id}
                  className={`flex items-baseline gap-2.5 rounded-md border px-2 py-1.5 ${
                    unlocked
                      ? "border-emerald-400/30 bg-emerald-400/5"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`text-base ${unlocked ? "" : "grayscale opacity-40"}`}
                  >
                    {a.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-display text-[12px] ${
                        unlocked ? "text-emerald-200" : "text-white/70"
                      }`}
                    >
                      {a.title}
                    </div>
                    <div className="font-mono text-[10px] text-white/45">
                      {a.body}
                    </div>
                  </div>
                  {unlocked && (
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-emerald-300/70">
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {toast && (
        <div className="pointer-events-none fixed bottom-3 right-3 z-50 flex items-center gap-3 rounded-lg border border-emerald-400/40 bg-space-950/95 px-3 py-2 shadow-2xl backdrop-blur-md">
          <span aria-hidden className="text-2xl">
            {toast.emoji}
          </span>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">
              Achievement unlocked
            </div>
            <div className="font-display text-sm text-white/95">
              {toast.title}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from "react";
import { LESSONS } from "../curriculum/lessons";
import type { Lesson } from "../curriculum/types";
import {
  isMachineTranslated,
  useLocalisedLessons,
} from "../curriculum/lesson-loader";
import {
  getOverallProgress,
  useLessonProgress,
} from "../../lib/lesson-progress";
import { LessonRunner } from "./LessonRunner";
import { CertificatePanel } from "./CertificatePanel";
import { encodeMyProgress, buildShareSegment } from "../../lib/teacher";
import { t } from "../../lib/i18n";

/**
 * 🎓 Lessons — top-bar entry into the curriculum.
 *
 * Matches the AchievementsPanel pattern: a single 28-px monochrome button
 * that toggles a popover anchored to the top-right of the scene. Each row
 * shows the lesson title, a one-line summary, a duration chip, and a
 * progress dot:
 *
 *   ○  not started
 *   ◐  started but not finished
 *   ●  completed (with quiz score, if any)
 *
 * Clicking "Start" opens the {@link LessonRunner} as a full-screen overlay.
 * The runner reaches into `lesson-progress.ts` to persist state so
 * resuming and cross-tab navigation Just Work.
 */

export function LessonPanel() {
  const { lessons, locale, loading } = useLocalisedLessons();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Lesson | null>(null);
  const [showCert, setShowCert] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const progress = useLessonProgress();
  // Progress + total are keyed off the English source-of-truth ids so a
  // language swap never resets completion or makes the curriculum size drift.
  const total = LESSONS.length;
  const done = LESSONS.filter((l) => progress[l.id]?.completed).length;
  const overall = getOverallProgress();

  return (
    <>
      <LessonPanelButton
        completed={done}
        total={total}
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(380px,92vw)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">{t("panel.lessons", "Lessons")}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              {done} / {total}
            </div>
          </div>
          <p className="mb-3 font-mono text-[10px] leading-relaxed text-white/45">
            Short, narrated tours of where we are in the universe. Each one
            takes you somewhere real.
          </p>
          <div className="mb-3" aria-label={`Overall progress ${overall.percentage}%`}>
            <div className="mb-1 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-widest text-white/45">
              <span>Overall</span>
              <span className="text-emerald-300/85">{overall.percentage}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 ease-out"
                style={{ width: `${overall.percentage}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {overall.percentage >= 100 && (
                <button
                  type="button"
                  onClick={() => setShowCert(true)}
                  className="inline-flex h-7 items-center rounded-md border border-emerald-400/55 bg-emerald-400/15 px-2.5 font-mono text-[10px] uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/25"
                >
                  View certificate
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const segment = buildShareSegment("me", encodeMyProgress());
                  try {
                    void navigator.clipboard.writeText(segment);
                    setShareCopied(true);
                    window.setTimeout(() => setShareCopied(false), 1500);
                  } catch {
                    /* ignore */
                  }
                }}
                className="inline-flex h-7 items-center rounded-md border border-white/15 bg-white/[0.04] px-2.5 font-mono text-[10px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {shareCopied ? "Copied!" : "Share progress"}
              </button>
            </div>
          </div>
          {loading && (
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/45">
              loading {locale}…
            </div>
          )}
          <ul className="space-y-2">
            {lessons.map((lesson) => {
              const p = progress[lesson.id];
              const status = statusOf(p);
              const translated = isMachineTranslated(lesson, locale);
              return (
                <li
                  key={lesson.id}
                  className="rounded-md border border-white/8 bg-white/[0.02] p-2.5"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span
                      aria-hidden
                      title={status.label}
                      className={`shrink-0 font-mono text-base leading-none ${status.tone}`}
                    >
                      {status.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 font-display text-[13px] text-white/90">
                        <span>{lesson.title}</span>
                        {translated && (
                          <span
                            title="Machine-translated by Llama 3.1 8B"
                            className="rounded border border-cyan-400/40 px-1 font-mono text-[8px] uppercase tracking-widest text-cyan-200/85"
                          >
                            {locale}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] leading-snug text-white/50">
                        {lesson.summary}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                        <span>{lesson.durationMin} min</span>
                        <span>·</span>
                        <span>{lesson.ageTier}</span>
                        {p?.quizScore && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-300/80">
                              {p.quizScore.correct}/{p.quizScore.total}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActive(lesson);
                        setOpen(false);
                      }}
                      className="pointer-events-auto inline-flex h-7 shrink-0 items-center rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2.5 font-mono text-[10px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/20"
                    >
                      {p?.completed
                        ? t("lesson.replay", "Replay")
                        : p?.started
                          ? t("lesson.resume", "Resume")
                          : t("lesson.start", "Start")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {active && (
        <LessonRunner lesson={active} onClose={() => setActive(null)} />
      )}
      {showCert && <CertificatePanel onClose={() => setShowCert(false)} />}
    </>
  );
}

/** Standalone button — usable on its own if a parent only wants the icon. */
export function LessonPanelButton({
  completed,
  total,
  onClick,
}: {
  completed: number;
  total: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${t("panel.lessons", "Lessons")} (${completed} / ${total})`}
      aria-label={t("panel.lessons", "Lessons")}
      className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
    >
      <span aria-hidden>🎓</span>
      <span className="font-mono text-[10px] tracking-widest">
        {completed}/{total}
      </span>
    </button>
  );
}

function statusOf(
  p: { started: boolean; completed: boolean } | undefined,
): { glyph: string; tone: string; label: string } {
  if (p?.completed)
    return {
      glyph: "●",
      tone: "text-emerald-300",
      label: "Completed",
    };
  if (p?.started)
    return {
      glyph: "◐",
      tone: "text-amber-300",
      label: "In progress",
    };
  return { glyph: "○", tone: "text-white/40", label: "Not started" };
}

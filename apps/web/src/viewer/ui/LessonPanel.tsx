import { useState } from "react";
import { LESSONS } from "../curriculum/lessons";
import type { Lesson } from "../curriculum/types";
import { useLessonProgress } from "../../lib/lesson-progress";
import { LessonRunner } from "./LessonRunner";

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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Lesson | null>(null);
  const progress = useLessonProgress();
  const total = LESSONS.length;
  const done = LESSONS.filter((l) => progress[l.id]?.completed).length;

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
            <div className="font-display text-sm text-white/90">Lessons</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              {done} / {total}
            </div>
          </div>
          <p className="mb-3 font-mono text-[10px] leading-relaxed text-white/45">
            Short, narrated tours of where we are in the universe. Each one
            takes you somewhere real.
          </p>
          <ul className="space-y-2">
            {LESSONS.map((lesson) => {
              const p = progress[lesson.id];
              const status = statusOf(p);
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
                      <div className="font-display text-[13px] text-white/90">
                        {lesson.title}
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
                        ? "Replay"
                        : p?.started
                          ? "Resume"
                          : "Start"}
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
      title={`Lessons (${completed} / ${total})`}
      aria-label="Lessons"
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

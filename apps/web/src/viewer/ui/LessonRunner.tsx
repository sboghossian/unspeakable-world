import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lesson, LessonStep } from "../curriculum/types";
import {
  getProgress,
  markCompleted,
  markQuizScore,
  markStarted,
  markStepIdx,
} from "../../lib/lesson-progress";
import { unlock } from "../../lib/achievements";

/**
 * Web Speech API helpers. Voice narration is opt-in (persists per
 * learner via `localStorage` key `uw:lesson-narration`), and gracefully
 * falls back to silent when the runtime has no `speechSynthesis`.
 */
const NARRATION_KEY = "uw:lesson-narration";

function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function readNarrationPref(): boolean {
  try {
    return localStorage.getItem(NARRATION_KEY) === "on";
  } catch {
    return false;
  }
}

function writeNarrationPref(on: boolean): void {
  try {
    localStorage.setItem(NARRATION_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

/**
 * Full-screen overlay that drives one lesson from start to finish.
 *
 * The runner is intentionally dumb about scenes: when a `scene` step is
 * reached we simply assign `window.location.hash`, which the existing
 * SolarFlight scene already listens for. After dispatch we wait
 * `durationMs` (default 5s) before auto-advancing.
 *
 * Progress is persisted to localStorage on every advance so a refresh or
 * cross-tab navigation can resume where the learner left off.
 *
 * Keyboard:
 *   ⎋ Esc   → quit (preserves progress)
 *   → / ⏎  → next (when manual)
 */

type Props = {
  lesson: Lesson;
  onClose: () => void;
};

type QuizState = {
  picked: number | null;
  submitted: boolean;
};

const DEFAULT_NARRATE_MS = 7000;
const DEFAULT_SCENE_MS = 5000;

export function LessonRunner({ lesson, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState<number>(() => {
    const cur = getProgress(lesson.id);
    if (!cur || cur.completed) return 0;
    return Math.min(cur.stepIdx, lesson.steps.length - 1);
  });
  const [quiz, setQuiz] = useState<QuizState>({
    picked: null,
    submitted: false,
  });
  const [finished, setFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [narrate, setNarrate] = useState<boolean>(readNarrationPref);

  const step: LessonStep | undefined = lesson.steps[stepIdx];

  // Mark the lesson started once when first mounted.
  useEffect(() => {
    markStarted(lesson.id);
  }, [lesson.id]);

  const totalQuizzes = useMemo(
    () => lesson.steps.filter((s) => s.kind === "quiz").length,
    [lesson],
  );

  const advance = useCallback(() => {
    setQuiz({ picked: null, submitted: false });
    setStepIdx((idx) => {
      const next = idx + 1;
      if (next >= lesson.steps.length) {
        setFinished(true);
        markCompleted(lesson.id);
        unlock("scholar");
        if (totalQuizzes > 0 && correctCount >= totalQuizzes) {
          unlock("honors-student");
        }
        return idx;
      }
      markStepIdx(lesson.id, next);
      return next;
    });
  }, [lesson, correctCount, totalQuizzes]);

  // Auto-advance for narrate/scene/wait steps.
  // When voice narration is on, the narrate step is driven by the
  // speechSynthesis `end` event instead of a fixed timer — the lesson
  // advances exactly when the voice finishes speaking, no faster.
  useEffect(() => {
    if (!step || finished) return;
    if (step.kind === "quiz") return;

    if (step.kind === "narrate" && narrate && speechAvailable()) {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(step.text);
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.onend = () => advance();
      // 25-second hard cap so a broken speech engine doesn't strand
      // the learner on one step.
      const watchdog = window.setTimeout(() => {
        synth.cancel();
        advance();
      }, 25_000);
      utter.onerror = () => {
        window.clearTimeout(watchdog);
        advance();
      };
      synth.speak(utter);
      return () => {
        window.clearTimeout(watchdog);
        synth.cancel();
      };
    }

    let ms: number;
    if (step.kind === "wait") {
      ms = step.ms;
    } else if (step.kind === "narrate") {
      ms = step.durationMs ?? estimateReadMs(step.text);
    } else {
      // scene
      step.hash && (window.location.hash = step.hash);
      ms = step.durationMs ?? DEFAULT_SCENE_MS;
    }
    const handle = window.setTimeout(advance, ms);
    return () => window.clearTimeout(handle);
    // step is structurally stable per index — depend on idx + finished
  }, [step, finished, advance, narrate]);

  // Cancel any in-flight speech when the runner unmounts.
  useEffect(() => {
    return () => {
      if (speechAvailable()) window.speechSynthesis.cancel();
    };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.key === "ArrowRight" || e.key === "Enter") && step && step.kind !== "quiz" && !finished) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, onClose, step, finished]);

  const submitQuiz = () => {
    if (!step || step.kind !== "quiz" || quiz.picked === null) return;
    const isRight = quiz.picked === step.answerIndex;
    const nextCorrect = correctCount + (isRight ? 1 : 0);
    setCorrectCount(nextCorrect);
    setQuiz((q) => ({ ...q, submitted: true }));
    // Persist running score.
    const answered = countQuizzesBefore(lesson, stepIdx) + 1;
    markQuizScore(lesson.id, nextCorrect, answered);
  };

  if (finished) {
    return (
      <FinishCard
        lesson={lesson}
        correct={correctCount}
        total={totalQuizzes}
        onClose={onClose}
      />
    );
  }

  if (!step) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Lesson: ${lesson.title}`}
    >
      <button
        type="button"
        onClick={onClose}
        title="Exit lesson"
        aria-label="Exit lesson"
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-space-950/80 text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        ✕
      </button>
      {speechAvailable() && (
        <button
          type="button"
          onClick={() => {
            const next = !narrate;
            setNarrate(next);
            writeNarrationPref(next);
            // Cancel any current utterance so the new mode takes effect
            // immediately rather than waiting out the in-flight one.
            window.speechSynthesis.cancel();
          }}
          title={narrate ? "Mute narration" : "Speak narration aloud"}
          aria-label={narrate ? "Mute narration" : "Speak narration aloud"}
          aria-pressed={narrate}
          className={`absolute right-14 top-4 inline-flex h-8 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
            narrate
              ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
              : "border-white/15 bg-space-950/80 text-white/75 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span aria-hidden>{narrate ? "🔊" : "🔈"}</span>
          <span>{narrate ? "speaking" : "silent"}</span>
        </button>
      )}

      <div className="pointer-events-auto m-4 w-[min(720px,94vw)] rounded-2xl border border-white/10 bg-space-950/92 p-5 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
            {lesson.title}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
            Step {stepIdx + 1} / {lesson.steps.length}
          </div>
        </div>

        <StepBody
          step={step}
          quiz={quiz}
          onPick={(i) => setQuiz({ picked: i, submitted: false })}
          onSubmit={submitQuiz}
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {hintFor(step, quiz.submitted)}
          </div>
          <NextButton
            step={step}
            quiz={quiz}
            onAdvance={advance}
            onSubmit={submitQuiz}
          />
        </div>
      </div>
    </div>
  );
}

function StepBody({
  step,
  quiz,
  onPick,
  onSubmit,
}: {
  step: LessonStep;
  quiz: QuizState;
  onPick: (i: number) => void;
  onSubmit: () => void;
}) {
  if (step.kind === "narrate") {
    return (
      <p className="font-display text-[15px] leading-relaxed text-white/90">
        {step.text}
      </p>
    );
  }
  if (step.kind === "scene") {
    return (
      <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-emerald-300/80">
        Flying to {labelFromHash(step.hash)} …
      </p>
    );
  }
  if (step.kind === "wait") {
    return (
      <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-white/50">
        Take a look around …
      </p>
    );
  }
  // quiz
  return (
    <div>
      <p className="mb-3 font-display text-[15px] leading-relaxed text-white/90">
        {step.question}
      </p>
      <ul className="space-y-1.5">
        {step.options.map((opt, i) => {
          const isPicked = quiz.picked === i;
          const isRight = i === step.answerIndex;
          const showResult = quiz.submitted;
          const tone = showResult
            ? isRight
              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
              : isPicked
                ? "border-rose-400/50 bg-rose-400/10 text-rose-100"
                : "border-white/10 bg-white/[0.02] text-white/55"
            : isPicked
              ? "border-white/40 bg-white/10 text-white"
              : "border-white/10 bg-white/[0.02] text-white/80 hover:bg-white/[0.06]";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={quiz.submitted}
                onClick={() => onPick(i)}
                onDoubleClick={() => {
                  onPick(i);
                  onSubmit();
                }}
                className={`w-full rounded-md border px-3 py-2 text-left font-display text-[13px] transition ${tone} ${quiz.submitted ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {quiz.submitted && (
        <p
          className={`mt-3 rounded-md border px-3 py-2 font-display text-[13px] leading-relaxed ${
            quiz.picked === step.answerIndex
              ? "border-emerald-400/40 bg-emerald-400/5 text-emerald-100"
              : "border-rose-400/40 bg-rose-400/5 text-rose-100"
          }`}
        >
          {quiz.picked === step.answerIndex ? "Correct. " : "Not quite. "}
          {step.explanation}
        </p>
      )}
    </div>
  );
}

function NextButton({
  step,
  quiz,
  onAdvance,
  onSubmit,
}: {
  step: LessonStep;
  quiz: QuizState;
  onAdvance: () => void;
  onSubmit: () => void;
}) {
  if (step.kind === "quiz") {
    if (!quiz.submitted) {
      return (
        <button
          type="button"
          disabled={quiz.picked === null}
          onClick={onSubmit}
          className="pointer-events-auto inline-flex h-8 items-center rounded-md border border-emerald-400/50 bg-emerald-400/15 px-3 font-mono text-[11px] uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit answer
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={onAdvance}
        className="pointer-events-auto inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 font-mono text-[11px] uppercase tracking-widest text-white/90 transition hover:bg-white/15"
      >
        Continue →
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdvance}
      className="pointer-events-auto inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 font-mono text-[11px] uppercase tracking-widest text-white/90 transition hover:bg-white/15"
    >
      Next →
    </button>
  );
}

function FinishCard({
  lesson,
  correct,
  total,
  onClose,
}: {
  lesson: Lesson;
  correct: number;
  total: number;
  onClose: () => void;
}) {
  const pct = total === 0 ? null : Math.round((correct / total) * 100);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Lesson complete"
    >
      <div className="m-4 w-[min(520px,94vw)] rounded-2xl border border-emerald-400/40 bg-space-950/95 p-6 text-center shadow-2xl backdrop-blur">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/80">
          Lesson complete
        </div>
        <div className="mb-3 font-display text-xl text-white/95">
          {lesson.title}
        </div>
        {pct !== null && (
          <div className="mb-4 font-mono text-[12px] uppercase tracking-widest text-white/60">
            Quiz: {correct} / {total} · {pct}%
          </div>
        )}
        <p className="mb-5 font-display text-[14px] leading-relaxed text-white/75">
          {lesson.summary}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto inline-flex h-9 items-center rounded-md border border-white/20 bg-white/10 px-4 font-mono text-[11px] uppercase tracking-widest text-white/90 transition hover:bg-white/15"
        >
          ← Back to lessons
        </button>
      </div>
    </div>
  );
}

function estimateReadMs(text: string): number {
  // ~180 words/min reading + 1.5s baseline to set the scene.
  const words = text.split(/\s+/).filter(Boolean).length;
  const ms = 1500 + (words / 180) * 60_000;
  return Math.max(DEFAULT_NARRATE_MS, Math.round(ms));
}

function countQuizzesBefore(lesson: Lesson, idx: number): number {
  let n = 0;
  for (let i = 0; i < idx; i++) {
    const s = lesson.steps[i];
    if (s && s.kind === "quiz") n += 1;
  }
  return n;
}

function labelFromHash(hash: string): string {
  const m = hash.match(/focus=([^&]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  return "scene";
}

function hintFor(step: LessonStep, submitted: boolean): string {
  if (step.kind === "quiz") {
    return submitted ? "Continue when ready" : "Pick an answer";
  }
  if (step.kind === "narrate") return "Press → to skip ahead";
  if (step.kind === "scene") return "Travelling";
  return "Holding";
}

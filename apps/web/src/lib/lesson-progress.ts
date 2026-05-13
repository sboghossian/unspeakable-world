/**
 * 🎓 Lesson progress — localStorage-backed per-lesson tracking.
 *
 * Each lesson gets a single key, `uw:lesson:<id>`, holding a JSON-serialised
 * {@link LessonProgress} record. Module-level subscribers re-render via the
 * {@link useLessonProgress} hook; cross-tab updates ride the native
 * `storage` event so a lesson started in one tab shows up in another.
 *
 * No XP, no streaks, no telemetry — just enough state to render dots
 * next to lessons (○ pending · ◐ in progress · ● completed) and to let the
 * runner resume mid-way through a long lesson.
 */

import { useEffect, useState } from "react";
import { LESSONS } from "../viewer/curriculum/lessons";

export type LessonProgress = {
  lessonId: string;
  started: boolean;
  stepIdx: number;
  /** Latest attempt's quiz score (kept for backward compatibility). */
  quizScore?: { correct: number; total: number };
  /** Best score across all attempts, normalised 0..1 (correct / total). */
  bestScore?: number;
  /** Total finished attempts (incremented when the lesson is completed). */
  attempts?: number;
  /** ISO timestamp of the FIRST completion; never overwritten on re-run. */
  firstCompletedAt?: string;
  completed: boolean;
  updatedAt: string;
};

const KEY_PREFIX = "uw:lesson:";

function keyFor(lessonId: string): string {
  return `${KEY_PREFIX}${lessonId}`;
}

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((cb) => cb());
}

function read(lessonId: string): LessonProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LessonProgress>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      lessonId,
      started: !!parsed.started,
      stepIdx: typeof parsed.stepIdx === "number" ? parsed.stepIdx : 0,
      quizScore: parsed.quizScore,
      bestScore: typeof parsed.bestScore === "number" ? parsed.bestScore : undefined,
      attempts: typeof parsed.attempts === "number" ? parsed.attempts : undefined,
      firstCompletedAt:
        typeof parsed.firstCompletedAt === "string"
          ? parsed.firstCompletedAt
          : undefined,
      completed: !!parsed.completed,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function write(progress: LessonProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(progress.lessonId), JSON.stringify(progress));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
  notify();
}

function upsert(
  lessonId: string,
  patch: (cur: LessonProgress) => LessonProgress,
): void {
  const cur = read(lessonId) ?? {
    lessonId,
    started: false,
    stepIdx: 0,
    completed: false,
    updatedAt: new Date().toISOString(),
  };
  const next = patch(cur);
  next.updatedAt = new Date().toISOString();
  write(next);
}

export function getProgress(lessonId: string): LessonProgress | null {
  return read(lessonId);
}

export function markStarted(lessonId: string): void {
  upsert(lessonId, (cur) => ({ ...cur, started: true }));
}

export function markStepIdx(lessonId: string, idx: number): void {
  upsert(lessonId, (cur) => ({
    ...cur,
    started: true,
    stepIdx: Math.max(cur.stepIdx, idx),
  }));
}

export function markQuizScore(
  lessonId: string,
  correct: number,
  total: number,
): void {
  upsert(lessonId, (cur) => {
    const normalised = total > 0 ? correct / total : 0;
    const prevBest = typeof cur.bestScore === "number" ? cur.bestScore : 0;
    return {
      ...cur,
      started: true,
      quizScore: { correct, total },
      bestScore: Math.max(prevBest, normalised),
    };
  });
}

export function markCompleted(lessonId: string): void {
  upsert(lessonId, (cur) => {
    const nowIso = new Date().toISOString();
    return {
      ...cur,
      started: true,
      completed: true,
      attempts: (cur.attempts ?? 0) + 1,
      firstCompletedAt: cur.firstCompletedAt ?? nowIso,
    };
  });
}

/** Returns every known lesson record, keyed by lesson id. */
export function allProgress(): Record<string, LessonProgress> {
  if (typeof window === "undefined") return {};
  const out: Record<string, LessonProgress> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      const id = key.slice(KEY_PREFIX.length);
      const p = read(id);
      if (p) out[id] = p;
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * React hook — re-renders on every progress mutation in this tab and on
 * any cross-tab `storage` event that targets a `uw:lesson:*` key.
 */
export function useLessonProgress(): Record<string, LessonProgress> {
  const [snap, setSnap] = useState<Record<string, LessonProgress>>(() =>
    allProgress(),
  );

  useEffect(() => {
    const refresh = () => setSnap(allProgress());
    listeners.add(refresh);
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith(KEY_PREFIX)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return snap;
}

/**
 * Aggregate completion across the whole curriculum. `totalCount` is the
 * authoritative number of lessons we ship, not the number of keys in
 * localStorage (which only counts started lessons).
 */
export function getOverallProgress(): {
  completedCount: number;
  totalCount: number;
  percentage: number;
} {
  const snap = allProgress();
  const totalCount = LESSONS.length;
  let completedCount = 0;
  for (const lesson of LESSONS) {
    if (snap[lesson.id]?.completed) completedCount += 1;
  }
  const percentage =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percentage };
}

/** Shape consumed by {@link CertificatePanel} for the printable cert. */
export type CertificateData = {
  name: string;
  lessonsCompleted: Array<{ id: string; title: string; firstCompletedAt: string }>;
  dateRange: { start: string; end: string };
};

const CERT_NAME_KEY = "uw:certificate:name";

export function getCertificateName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CERT_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCertificateName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CERT_NAME_KEY, name);
  } catch {
    /* ignore */
  }
  notify();
}

export function getCertificateData(nameOverride?: string): CertificateData {
  const snap = allProgress();
  const lessonsCompleted: CertificateData["lessonsCompleted"] = [];
  for (const lesson of LESSONS) {
    const p = snap[lesson.id];
    if (p?.completed) {
      lessonsCompleted.push({
        id: lesson.id,
        title: lesson.title,
        firstCompletedAt: p.firstCompletedAt ?? p.updatedAt,
      });
    }
  }
  const dates = lessonsCompleted.map((l) => l.firstCompletedAt).sort();
  const start = dates[0] ?? new Date().toISOString();
  const end = dates[dates.length - 1] ?? start;
  return {
    name: nameOverride ?? getCertificateName(),
    lessonsCompleted,
    dateRange: { start, end },
  };
}

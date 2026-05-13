/**
 * 🎓 Teacher class-view encoding.
 *
 * No accounts, no backend — teachers gather a class by collecting each
 * student's "share my progress" string and pasting them into one URL.
 *
 * Wire format
 * -----------
 *   `#class=<entry>,<entry>,<entry>...`
 *
 * Each entry is either `<id>:<b64>` (when the student supplied an id) or
 * just `<b64>`. The base64 payload decodes to a `Uint8Array` of length
 * `2 × LESSONS.length`. For each lesson, in canonical {@link LESSONS}
 * order, we emit two bytes:
 *
 *   byte 0  →  stepIdx, clamped to 0..255
 *   byte 1  →  bit 7 = completed flag, bits 0..6 = best quiz score
 *              expressed as an integer percentage 0..100. 127 sentinel
 *              means "no quiz attempted".
 *
 * Sizing
 * ------
 *   15 lessons × 2 bytes = 30 bytes raw per student.
 *   Base64 of 30 bytes = 40 chars. With a 4-char id and ":" separator:
 *     ≈ 45 chars per student.
 *   30 students × 45 chars + 29 commas ≈ 1,380 chars in the hash.
 *
 * Browsers happily handle hash fragments well over 4 KB, so a class of
 * 30 with short ids fits comfortably under the conservative URL budget.
 */

import { LESSONS } from "../viewer/curriculum/lessons";
import { allProgress, type LessonProgress } from "./lesson-progress";

const NO_QUIZ_SENTINEL = 127;

export type StudentSnapshot = {
  id: string;
  lessons: Array<{
    lessonId: string;
    stepIdx: number;
    completed: boolean;
    /** Best quiz score expressed as a percentage 0..100, or null. */
    bestScorePct: number | null;
  }>;
};

export type ClassRoster = {
  students: StudentSnapshot[];
};

/* ------------------------------------------------------------------ */
/* Base64 helpers — work in both browser and (theoretical) node env. */
/* ------------------------------------------------------------------ */

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
    return btoa(s).replace(/=+$/, "");
  }
  return "";
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob !== "function") return new Uint8Array(0);
  // Pad to a multiple of 4 — `btoa` output may have been stripped.
  const padded = b64 + "===".slice(0, (4 - (b64.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array(0);
  }
}

/* ------------------------------------------------------------------ */
/* Encode / decode one student.                                        */
/* ------------------------------------------------------------------ */

export function encodeProgress(
  progress: Record<string, LessonProgress>,
): Uint8Array {
  const out = new Uint8Array(LESSONS.length * 2);
  for (let i = 0; i < LESSONS.length; i++) {
    const lesson = LESSONS[i]!;
    const p = progress[lesson.id];
    const off = i * 2;
    if (!p) {
      out[off] = 0;
      out[off + 1] = NO_QUIZ_SENTINEL;
      continue;
    }
    out[off] = Math.max(0, Math.min(255, p.stepIdx));
    let scoreByte = NO_QUIZ_SENTINEL;
    if (typeof p.bestScore === "number") {
      const pct = Math.round(p.bestScore * 100);
      scoreByte = Math.max(0, Math.min(100, pct));
    } else if (p.quizScore && p.quizScore.total > 0) {
      const pct = Math.round((p.quizScore.correct / p.quizScore.total) * 100);
      scoreByte = Math.max(0, Math.min(100, pct));
    }
    if (p.completed) scoreByte = (scoreByte & 0x7f) | 0x80;
    out[off + 1] = scoreByte;
  }
  return out;
}

/** Convenience — read this tab's progress and encode it. */
export function encodeMyProgress(): string {
  return bytesToBase64(encodeProgress(allProgress()));
}

/** Build the share URL fragment for one student. */
export function buildShareSegment(id: string, encodedBase64: string): string {
  return id ? `${encodeURIComponent(id)}:${encodedBase64}` : encodedBase64;
}

export function decodeStudent(
  segment: string,
  fallbackId: string,
): StudentSnapshot {
  const colon = segment.indexOf(":");
  let id = fallbackId;
  let b64 = segment;
  if (colon !== -1) {
    id = decodeURIComponent(segment.slice(0, colon));
    b64 = segment.slice(colon + 1);
  }
  const bytes = base64ToBytes(b64);
  const lessons: StudentSnapshot["lessons"] = [];
  for (let i = 0; i < LESSONS.length; i++) {
    const lesson = LESSONS[i]!;
    const off = i * 2;
    const stepIdx = bytes[off] ?? 0;
    const scoreByte = bytes[off + 1] ?? NO_QUIZ_SENTINEL;
    const completed = (scoreByte & 0x80) !== 0;
    const rawScore = scoreByte & 0x7f;
    const bestScorePct =
      rawScore === NO_QUIZ_SENTINEL ? null : Math.min(100, rawScore);
    lessons.push({
      lessonId: lesson.id,
      stepIdx,
      completed,
      bestScorePct,
    });
  }
  return { id, lessons };
}

/* ------------------------------------------------------------------ */
/* Class roster parsing from the URL hash.                             */
/* ------------------------------------------------------------------ */

/** Returns `null` if the current hash isn't a class share. */
export function parseClassHash(hash: string): ClassRoster | null {
  const m = hash.match(/^#class=(.*)$/);
  if (!m || !m[1]) return null;
  const raw = m[1];
  // The hash may itself contain a `?` — strip anything after it.
  const cleaned = raw.split("?")[0] ?? "";
  if (!cleaned) return { students: [] };
  const segments = cleaned
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const students = segments.map((seg, i) =>
    decodeStudent(seg, `student-${i + 1}`),
  );
  return { students };
}

/** Compute per-lesson class averages. */
export function classAverages(
  roster: ClassRoster,
): Array<{ lessonId: string; completedRatio: number; avgScorePct: number | null }> {
  return LESSONS.map((lesson) => {
    let completedCount = 0;
    let scoreSum = 0;
    let scoreN = 0;
    for (const s of roster.students) {
      const row = s.lessons.find((l) => l.lessonId === lesson.id);
      if (!row) continue;
      if (row.completed) completedCount += 1;
      if (row.bestScorePct !== null) {
        scoreSum += row.bestScorePct;
        scoreN += 1;
      }
    }
    const total = roster.students.length || 1;
    return {
      lessonId: lesson.id,
      completedRatio: completedCount / total,
      avgScorePct: scoreN === 0 ? null : Math.round(scoreSum / scoreN),
    };
  });
}

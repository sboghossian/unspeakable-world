/**
 * Curriculum step + lesson shape.
 *
 * Lessons are flat arrays of typed steps. The runner interprets each kind:
 *
 *   narrate → render the text in the bottom card; auto-advance after
 *             `durationMs` or wait for the user's click.
 *   scene   → assign `window.location.hash = step.hash` so the existing
 *             route/hash listeners fly the camera.
 *   wait    → hold the current scene for `ms` (no card change).
 *   quiz    → render N options, score the answer, show explanation,
 *             require a click to proceed.
 */

export type LessonStep =
  | { kind: "narrate"; text: string; durationMs?: number }
  | { kind: "scene"; hash: string; durationMs?: number }
  | { kind: "wait"; ms: number }
  | {
      kind: "quiz";
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    };

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  ageTier: "kid" | "teen" | "adult";
  durationMin: number;
  steps: LessonStep[];
};

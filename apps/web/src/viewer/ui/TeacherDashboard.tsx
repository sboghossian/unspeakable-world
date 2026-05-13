import { useMemo } from "react";
import { LESSONS } from "../curriculum/lessons";
import {
  classAverages,
  parseClassHash,
  type StudentSnapshot,
} from "../../lib/teacher";

/**
 * 👩‍🏫 TeacherDashboard — aggregate progress view, read from URL hash.
 *
 * Activated by `#class=<entry>,<entry>,...` (see `lib/teacher.ts`). No
 * accounts: the teacher copy-pastes each student's share string into one
 * URL. We render a lesson × student grid plus a "class average" row.
 *
 * Privacy: we never store student names. Cells show whatever id the
 * teacher embedded in each share segment (e.g. "row-3", "alex", or a
 * generated `student-N`).
 */

type Props = {
  onExit: () => void;
};

export function TeacherDashboard({ onExit }: Props) {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const roster = useMemo(() => parseClassHash(hash) ?? { students: [] }, [hash]);
  const averages = useMemo(() => classAverages(roster), [roster]);

  const totalStudents = roster.students.length;

  return (
    <div className="flex h-full w-full flex-col bg-space-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/85">
            Teacher view
          </div>
          <h1 className="font-display text-2xl text-white/95">
            Class progress
          </h1>
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/45">
            {totalStudents} student{totalStudents === 1 ? "" : "s"} ·{" "}
            {LESSONS.length} lessons
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 font-mono text-[11px] uppercase tracking-widest text-white/85 transition hover:bg-white/15"
        >
          ← Back
        </button>
      </header>

      {totalStudents === 0 ? (
        <EmptyState />
      ) : (
        <main className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[12px]">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 min-w-[220px] bg-space-950 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/50"
                  >
                    Lesson
                  </th>
                  {roster.students.map((s) => (
                    <th
                      key={s.id}
                      scope="col"
                      className="min-w-[60px] px-2 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/55"
                    >
                      {s.id}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="min-w-[80px] bg-space-950 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-emerald-300/85"
                  >
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {LESSONS.map((lesson, i) => {
                  const avg = averages[i];
                  if (!avg) return null;
                  return (
                    <tr
                      key={lesson.id}
                      className="border-t border-white/5 odd:bg-white/[0.02]"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 bg-space-950 px-3 py-2 align-top text-left"
                      >
                        <div className="font-display text-[13px] text-white/90">
                          {lesson.title}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          {lesson.durationMin} min · {lesson.ageTier}
                        </div>
                      </th>
                      {roster.students.map((s) => (
                        <td
                          key={s.id}
                          className="px-2 py-2 text-center"
                          title={cellTitle(s, lesson.id)}
                        >
                          <Cell student={s} lessonId={lesson.id} />
                        </td>
                      ))}
                      <td className="bg-white/[0.02] px-3 py-2 text-center">
                        <div className="font-mono text-[11px] text-emerald-200/90">
                          {Math.round(avg.completedRatio * 100)}%
                        </div>
                        <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                          {avg.avgScorePct === null
                            ? "—"
                            : `quiz ${avg.avgScorePct}%`}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-white/35">
            Cells show: completion glyph · best quiz score. No personal data
            is collected — only what the teacher pasted into the URL.
          </p>
        </main>
      )}
    </div>
  );
}

function Cell({
  student,
  lessonId,
}: {
  student: StudentSnapshot;
  lessonId: string;
}) {
  const row = student.lessons.find((l) => l.lessonId === lessonId);
  if (!row) return <span className="text-white/25">○</span>;
  const glyph = row.completed ? "●" : row.stepIdx > 0 ? "◐" : "○";
  const tone = row.completed
    ? "text-emerald-300"
    : row.stepIdx > 0
      ? "text-amber-300"
      : "text-white/30";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span aria-hidden className={`font-mono text-base leading-none ${tone}`}>
        {glyph}
      </span>
      <span className="font-mono text-[9px] text-white/45">
        {row.bestScorePct === null ? "" : `${row.bestScorePct}%`}
      </span>
    </div>
  );
}

function cellTitle(student: StudentSnapshot, lessonId: string): string {
  const row = student.lessons.find((l) => l.lessonId === lessonId);
  if (!row) return `${student.id}: not started`;
  const state = row.completed
    ? "completed"
    : row.stepIdx > 0
      ? `in progress (step ${row.stepIdx + 1})`
      : "not started";
  const score = row.bestScorePct === null ? "no quiz" : `quiz ${row.bestScorePct}%`;
  return `${student.id}: ${state} · ${score}`;
}

function EmptyState() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/85">
          Class link is empty
        </div>
        <h2 className="mb-3 font-display text-xl text-white/90">
          No student snapshots in the URL
        </h2>
        <p className="font-display text-[14px] leading-relaxed text-white/65">
          A class link looks like{" "}
          <code className="rounded bg-white/10 px-1 font-mono text-[12px] text-white/85">
            #class=alex:AAA…,sam:AAA…
          </code>
          . Each student copies their share string from the lesson menu and
          you paste them here, comma-separated.
        </p>
      </div>
    </main>
  );
}

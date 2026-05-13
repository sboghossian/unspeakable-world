import { useMemo, useState } from "react";
import {
  getCertificateData,
  getCertificateName,
  setCertificateName,
  useLessonProgress,
} from "../../lib/lesson-progress";
import { LESSONS } from "../curriculum/lessons";

/**
 * 🏅 CertificatePanel — printable completion certificate.
 *
 * Opens as a full-screen modal when the learner has completed 100% of the
 * curriculum. Asks for a display name (no email, no account) once, then
 * renders an A4-portrait certificate styled for both screen and print.
 *
 * Export uses `window.print()` so we don't pull in a PDF library. The
 * Tailwind `print:` variants hide every chrome element and let the
 * browser produce a clean PDF via "Save as PDF" in the system print
 * dialog.
 */

type Props = {
  onClose: () => void;
};

export function CertificatePanel({ onClose }: Props) {
  // Subscribe to progress so the cert refreshes if the user opens it
  // mid-completion or re-runs a lesson while the modal is open.
  useLessonProgress();
  const [name, setName] = useState<string>(() => getCertificateName());
  const [committed, setCommitted] = useState<boolean>(
    () => getCertificateName().length > 0,
  );

  const data = useMemo(
    () => getCertificateData(committed ? name : undefined),
    [name, committed],
  );

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCertificateName(trimmed);
    setName(trimmed);
    setCommitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur print:static print:bg-white print:p-0 print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate of completion"
    >
      <button
        type="button"
        onClick={onClose}
        title="Close"
        aria-label="Close certificate"
        className="absolute right-4 top-4 z-[80] inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-space-950/80 text-white/85 backdrop-blur transition hover:bg-white/10 hover:text-white print:hidden"
      >
        ✕
      </button>

      {!committed ? (
        <NamePrompt
          name={name}
          onChange={setName}
          onSave={handleSaveName}
          onSkip={() => {
            setCertificateName("Astronomer");
            setName("Astronomer");
            setCommitted(true);
          }}
        />
      ) : (
        <CertificateSheet
          name={data.name || "Astronomer"}
          lessonsCompleted={data.lessonsCompleted}
          dateRange={data.dateRange}
          onRename={() => setCommitted(false)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}

function NamePrompt({
  name,
  onChange,
  onSave,
  onSkip,
}: {
  name: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="w-[min(440px,94vw)] rounded-2xl border border-emerald-400/40 bg-space-950/95 p-6 shadow-2xl backdrop-blur">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/85">
        Curriculum complete
      </div>
      <h2 className="mb-3 font-display text-2xl text-white/95">
        Your certificate is ready
      </h2>
      <p className="mb-5 font-display text-[14px] leading-relaxed text-white/75">
        We never asked for an account, so we don&apos;t know your name.
        Type whatever you&apos;d like printed on the certificate.
      </p>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/55">
        Display name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
        }}
        placeholder="Ada Lovelace"
        maxLength={64}
        autoFocus
        className="mb-4 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 font-display text-[14px] text-white/95 outline-none placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.06]"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex h-8 items-center rounded-md border border-white/15 px-3 font-mono text-[10px] uppercase tracking-widest text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={name.trim().length === 0}
          className="inline-flex h-8 items-center rounded-md border border-emerald-400/55 bg-emerald-400/15 px-3 font-mono text-[10px] uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Make my certificate →
        </button>
      </div>
    </div>
  );
}

function CertificateSheet({
  name,
  lessonsCompleted,
  dateRange,
  onRename,
  onPrint,
}: {
  name: string;
  lessonsCompleted: Array<{ id: string; title: string; firstCompletedAt: string }>;
  dateRange: { start: string; end: string };
  onRename: () => void;
  onPrint: () => void;
}) {
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);
  const todayDate = formatDate(new Date().toISOString());
  const totalLessons = LESSONS.length;

  return (
    <div className="flex w-full flex-col items-center gap-4 print:gap-0">
      <div
        // A4 portrait at ~96dpi ≈ 794 × 1123 px.
        className="relative mx-auto flex h-[1123px] w-[794px] max-w-full flex-col border-[12px] border-double border-emerald-700 bg-[#fbf6e8] p-12 font-display text-stone-900 shadow-2xl print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
      >
        {/* Decorative top label */}
        <div className="mx-auto mb-2 font-mono text-[11px] uppercase tracking-[0.45em] text-emerald-800">
          The Unspeakable World
        </div>
        <div className="mx-auto mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">
          A browser planetarium · MIT-licensed
        </div>

        <div className="mb-4 text-center font-display text-4xl font-semibold tracking-wide text-stone-800">
          Certificate of Completion
        </div>
        <div className="mx-auto mb-10 h-px w-40 bg-emerald-700/40" />

        <div className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-stone-500">
          This certifies that
        </div>
        <div className="mb-6 text-center font-display text-5xl font-semibold tracking-wide text-emerald-900">
          {name}
        </div>

        <p className="mx-auto mb-8 max-w-xl text-center font-display text-[15px] leading-relaxed text-stone-700">
          has completed all {totalLessons} lessons of{" "}
          <span className="font-semibold text-stone-900">
            The Unspeakable World — Astronomy Fundamentals
          </span>
          , a guided tour from the surface of Earth to the cosmic web.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          {lessonsCompleted.map((l, i) => (
            <div
              key={l.id}
              className="flex items-baseline gap-2 border-b border-stone-300/60 pb-1"
            >
              <span className="font-mono text-[10px] text-stone-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate text-stone-800">{l.title}</span>
              <span className="font-mono text-[9px] text-stone-400">
                {formatDate(l.firstCompletedAt)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-2 items-end gap-12 pt-8">
          <div>
            <div className="mb-1 border-b border-stone-700/70" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Awarded · {todayDate}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-stone-500">
              Coursework dates {startDate} — {endDate}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-1 border-b border-stone-700/70" />
            <div className="font-display text-[14px] italic text-stone-700">
              The Unspeakable World
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Curriculum signature
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={onRename}
          className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 font-mono text-[10px] uppercase tracking-widest text-white/85 transition hover:bg-white/15"
        >
          Edit name
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex h-9 items-center rounded-md border border-emerald-400/55 bg-emerald-400/15 px-4 font-mono text-[11px] uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/25"
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

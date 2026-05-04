import type { TourStep } from "../tour/tour";

type Props = {
  step: TourStep;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
};

const WAVELENGTH_LABEL: Record<
  NonNullable<TourStep["wavelengthHint"]>,
  string
> = {
  visible: "Visible",
  "near-ir": "2MASS · near-IR",
  "mid-ir": "WISE · mid-IR",
  "x-ray": "INTEGRAL · X-ray",
};

export function TourCard({
  step,
  index,
  total,
  onPrev,
  onNext,
  onExit,
}: Props) {
  return (
    <aside className="pointer-events-auto absolute left-1/2 top-20 z-30 w-[min(560px,92vw)] -translate-x-1/2 rounded-xl border border-violet-500/30 bg-space-950/85 p-4 backdrop-blur md:top-24">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
            tour
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {index + 1} / {total}
          </span>
          {step.wavelengthHint && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
              ⚛ {WAVELENGTH_LABEL[step.wavelengthHint]}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Exit tour"
        >
          exit
        </button>
      </header>

      <h2 className="font-display text-2xl font-semibold text-white">
        {step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{step.body}</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← prev
        </button>
        <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${i <= index ? "bg-violet-400/80" : "bg-transparent"} ${i > 0 ? "ml-0.5" : ""}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-violet-300 transition hover:bg-violet-500/25"
        >
          {index === total - 1 ? "finish" : "next →"}
        </button>
      </div>
    </aside>
  );
}

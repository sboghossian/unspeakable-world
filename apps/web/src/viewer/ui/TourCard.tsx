import type { ReactNode } from "react";
import type { TourStep } from "../tour/tour";
import type { TourStepV2 } from "../tour/tour-v2";

/**
 * 🎟 TourCard — works for both the original sky-mode Grand Tour
 * (`TourStep`, v1) and the Universe-mode Grand Tour v2 (`TourStepV2`).
 *
 * We discriminate on the presence of `body` + `duration_ms` (v2) vs
 * `dwellMs` (v1). The card is otherwise identical chrome — the v2
 * variant just gets layer-chips and a clickable timeline.
 */

type CommonProps = {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
};

type V1Props = CommonProps & {
  step: TourStep;
};

type V2Props = CommonProps & {
  step: TourStepV2;
  /** Optional jump-to-step (clickable timeline dots). v2-only. */
  onJump?: (index: number) => void;
  /** Resolved layer-id → label/icon for the chips. */
  layerLabel?: (id: string) => { label: string; icon?: string };
  /** Optional snapshot trigger when `step.capture` is true. */
  onCapture?: () => void;
};

type Props = V1Props | V2Props;

const WAVELENGTH_LABEL: Record<string, string> = {
  visible: "Visible",
  "near-ir": "2MASS · near-IR",
  "mid-ir": "WISE · mid-IR",
  "x-ray": "INTEGRAL · X-ray",
  cmb: "Planck · CMB",
  halpha: "Hα",
};

function isV2(step: TourStep | TourStepV2): step is TourStepV2 {
  return (
    typeof (step as TourStepV2).duration_ms === "number" &&
    typeof (step as TourStepV2).body === "string"
  );
}

/** Render light markdown — `code`, *em*, **bold**. Intentionally tiny:
 *  the tour body is hand-curated content, not user-supplied. */
function renderMarkdown(text: string): ReactNode {
  // Split on the three markers we support; preserve order via numbered groups.
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-white/85">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-white/10 px-1 font-mono text-[12px] text-violet-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function TourCard(props: Props) {
  const { step, index, total, onPrev, onNext, onExit } = props;

  if (isV2(step)) {
    const v2 = props as V2Props;
    const enabled = step.enable_layers ?? [];
    return (
      <aside className="pointer-events-auto absolute left-1/2 top-20 z-30 w-[min(620px,94vw)] -translate-x-1/2 rounded-xl border border-violet-500/30 bg-space-950/85 p-4 backdrop-blur md:top-24">
        <header className="mb-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
              tour v2
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              {index + 1} / {total}
            </span>
            {step.wavelengthHint && WAVELENGTH_LABEL[step.wavelengthHint] && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
                ⚛ {WAVELENGTH_LABEL[step.wavelengthHint]}
              </span>
            )}
            {enabled.map((id) => {
              const meta = v2.layerLabel?.(id) ?? { label: id };
              return (
                <span
                  key={id}
                  className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200/90"
                  title={`Layer on: ${meta.label}`}
                >
                  {meta.icon ?? "◉"} {meta.label}
                </span>
              );
            })}
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
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          {renderMarkdown(step.body)}
        </p>

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
                className={`flex-1 ${
                  i <= index ? "bg-violet-400/80" : "bg-transparent"
                } ${i > 0 ? "ml-0.5" : ""}`}
              />
            ))}
          </div>
          {step.capture && v2.onCapture && (
            <button
              type="button"
              onClick={v2.onCapture}
              className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-amber-200 transition hover:bg-amber-400/25"
              title="Take a snapshot of this view"
            >
              📸 snap
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-violet-300 transition hover:bg-violet-500/25"
          >
            {index === total - 1 ? "finish" : "next →"}
          </button>
        </div>

        {/* Tour timeline — clickable dots. */}
        {v2.onJump && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 border-t border-white/5 pt-3">
            {Array.from({ length: total }).map((_, i) => {
              const active = i === index;
              const done = i < index;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => v2.onJump?.(i)}
                  title={`Step ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full border transition ${
                    active
                      ? "border-violet-300 bg-violet-300"
                      : done
                        ? "border-violet-400/60 bg-violet-400/60 hover:bg-violet-300"
                        : "border-white/20 bg-white/10 hover:bg-white/30"
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              );
            })}
          </div>
        )}
      </aside>
    );
  }

  // v1 — preserved verbatim for backwards compat.
  const v1Step = step;
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
          {v1Step.wavelengthHint && WAVELENGTH_LABEL[v1Step.wavelengthHint] && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
              ⚛ {WAVELENGTH_LABEL[v1Step.wavelengthHint]}
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
        {v1Step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/75">
        {v1Step.body}
      </p>

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

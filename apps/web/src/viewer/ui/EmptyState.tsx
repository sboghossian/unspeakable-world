import type { ReactNode } from "react";

/**
 * 🪐 EmptyState — canonical "this list is empty / this panel has nothing
 * to show yet" card.
 *
 * Used by every panel that can be opened before there's data inside. The
 * tone follows ERROR-COPY.md: friendly, never blames the user, always
 * offers a next action.
 *
 * Tailwind-only dark-glass design that matches the rest of the chrome
 * (border-white/10, bg-space-950 family). Compact by default — drop it
 * inside an existing popover and it slots in like any other row.
 *
 * Props:
 *   icon  — a single glyph / emoji that sits above the title
 *   title — one short line; we render it as the panel header
 *   body  — one or two sentences; explains what would live here and how to
 *           make it appear
 *   cta   — optional primary action ("Browse the sky", "Start tour")
 *   tone  — accent color preset; defaults to emerald which matches the
 *           viewer's primary palette
 */

export type EmptyStateTone = "emerald" | "violet" | "amber" | "cyan" | "rose";

type Cta = {
  label: string;
  onClick: () => void;
};

type Props = {
  icon: string;
  title: string;
  body: string;
  cta?: Cta;
  /** Optional second action ("Watch the intro"). Rendered as a ghost button. */
  secondary?: Cta;
  tone?: EmptyStateTone;
  /** Optional extra slot rendered between body and cta (e.g. an inline link). */
  children?: ReactNode;
  /** Visual density. "compact" trims the vertical padding for inline lists. */
  density?: "compact" | "comfortable";
};

const TONE: Record<EmptyStateTone, { border: string; bg: string; text: string; cta: string }> = {
  emerald: {
    border: "border-emerald-400/30",
    bg: "bg-emerald-400/[0.04]",
    text: "text-emerald-200/90",
    cta: "border-emerald-400/50 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25",
  },
  violet: {
    border: "border-violet-400/30",
    bg: "bg-violet-400/[0.04]",
    text: "text-violet-200/90",
    cta: "border-violet-400/50 bg-violet-400/15 text-violet-200 hover:bg-violet-400/25",
  },
  amber: {
    border: "border-amber-400/30",
    bg: "bg-amber-400/[0.04]",
    text: "text-amber-200/90",
    cta: "border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25",
  },
  cyan: {
    border: "border-cyan-400/30",
    bg: "bg-cyan-400/[0.04]",
    text: "text-cyan-200/90",
    cta: "border-cyan-400/50 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25",
  },
  rose: {
    border: "border-rose-400/30",
    bg: "bg-rose-400/[0.04]",
    text: "text-rose-200/90",
    cta: "border-rose-400/50 bg-rose-400/15 text-rose-200 hover:bg-rose-400/25",
  },
};

export function EmptyState({
  icon,
  title,
  body,
  cta,
  secondary,
  tone = "emerald",
  children,
  density = "comfortable",
}: Props) {
  const t = TONE[tone];
  const pad = density === "compact" ? "px-3 py-3" : "px-4 py-5";
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border ${t.border} ${t.bg} ${pad} text-center backdrop-blur`}
      role="status"
    >
      <div className={`text-2xl leading-none ${t.text}`} aria-hidden>
        {icon}
      </div>
      <div className="font-display text-[13px] font-semibold text-white/90">
        {title}
      </div>
      <p className="max-w-[40ch] text-[12px] leading-relaxed text-white/65">
        {body}
      </p>
      {children}
      {(cta || secondary) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {cta && (
            <button
              type="button"
              onClick={cta.onClick}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${t.cta}`}
            >
              {cta.label}
            </button>
          )}
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { forwardRef, type ReactNode } from "react";
import { cn } from "../../../lib/design-tokens";

/**
 * ⬚ Toggle — a checkbox-style on/off button with a label and optional
 * hint line. Use this for binary scene-state flips (sonification on,
 * real-color on, standby on) — semantically a checkbox, visually a
 * full-width tinted card so it reads well in dense settings panels.
 *
 * For tabular boolean inputs (e.g. a row of "show X" toggles in a
 * settings section) the `compact` flag drops the hint line and reduces
 * vertical padding.
 */

export type ToggleProps = {
  label: ReactNode;
  description?: ReactNode;
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(
    { label, description, on, onChange, disabled = false, compact = false, className },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => onChange(!on)}
        aria-pressed={on}
        className={cn(
          "w-full rounded-md border text-left font-mono text-[11px] transition",
          compact ? "px-2 py-1" : "px-2.5 py-1.5",
          on
            ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
            : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10",
          disabled && "cursor-not-allowed opacity-40",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-widest">{label}</span>
          <span className="text-[10px]">{on ? "on" : "off"}</span>
        </div>
        {description && !compact && (
          <div className="mt-0.5 font-mono text-[9px] text-white/35">
            {description}
          </div>
        )}
      </button>
    );
  },
);

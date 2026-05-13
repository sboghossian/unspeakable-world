import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { COLOR, cn, type SemanticTone } from "../../../lib/design-tokens";

/**
 * 🏷 Pill — small capsule chip used for status indicators, counters and
 * inline tags.
 *
 * Tone is *semantic*, not chromatic — pass `success` for "active" /
 * "on" states, `warning` for "synthetic" / "preview" data, `danger`
 * for "lost mission" badges, `accent` for "tour v2" / "violet brand"
 * chips, `info` for neutral catalog labels, `muted` for "ended".
 *
 * Variant chooses the silhouette: `pill` (capsule, the default) or
 * `square` (rounded-md, for the rectangular count badges that sit
 * inside tab strips).
 */

export type PillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: SemanticTone;
  variant?: "pill" | "square";
  icon?: ReactNode;
};

export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { tone = "muted", variant = "pill", icon, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
        variant === "pill" ? "rounded-full" : "rounded-sm",
        COLOR[tone],
        className,
      )}
      {...rest}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  );
});

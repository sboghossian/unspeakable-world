import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../../lib/design-tokens";

/**
 * 📑 Tab — a single tab pill in a {@link TabList} strip.
 *
 * Two visual styles are supported:
 *  - `chip`  (default) – pill-style tabs used in popovers (layer panel,
 *                        copilot panel). Compact, mono caps.
 *  - `panel`           – the modal-style tabs used in MissionNarrative;
 *                        each active tab connects visually to the body
 *                        below via a rounded-top with no bottom border.
 *
 * Set `active` from your state and call `onSelect` to switch. The tab
 * fires `role="tab"` + `aria-selected` for screen readers.
 */

export type TabVariant = "chip" | "panel";

export type TabProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onSelect"
> & {
  active: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  variant?: TabVariant;
};

export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { active, onSelect, icon, variant = "chip", children, className, ...rest },
  ref,
) {
  if (variant === "panel") {
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onSelect}
        className={cn(
          "rounded-t-md px-3 py-1.5 font-mono text-[11px] transition",
          active
            ? "border-x border-t border-white/15 bg-space-950 text-white"
            : "text-white/55 hover:text-white/80",
          className,
        )}
        {...rest}
      >
        {icon && <span aria-hidden>{icon} </span>}
        {children}
      </button>
    );
  }
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition",
        active
          ? "border-violet-400/50 bg-violet-400/15 text-violet-100"
          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
        className,
      )}
      {...rest}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </button>
  );
});

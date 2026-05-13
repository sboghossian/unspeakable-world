import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../../lib/design-tokens";

/**
 * 📑 TabList — flex container for {@link Tab} children.
 *
 * `variant` chooses the strip silhouette:
 *  - `chip`  (default) – a wrap-able row of chip tabs with a bottom
 *                        hairline separator.
 *  - `panel`            – the modal-style strip that visually
 *                         connects to the body below (no hairline).
 */

export type TabListVariant = "chip" | "panel";

export type TabListProps = HTMLAttributes<HTMLDivElement> & {
  variant?: TabListVariant;
  label?: string;
};

export const TabList = forwardRef<HTMLDivElement, TabListProps>(
  function TabList({ variant = "chip", label, className, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        role="tablist"
        aria-label={label}
        className={cn(
          variant === "chip"
            ? "mb-2 flex flex-wrap gap-1 border-b border-white/5 pb-2"
            : "flex gap-1 border-b border-white/10 px-3 pt-2",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

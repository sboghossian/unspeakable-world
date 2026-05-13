import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { PANEL, RADIUS, TEXT, cn, type Panel as PanelVariant } from "../../../lib/design-tokens";

/**
 * 🪟 Panel — the canonical bordered/blurred surface for popovers, side
 * panels and inline cards.
 *
 * Variant tells the eye where the panel sits in the stacking order:
 *  - `glass`    – the default; popovers anchored to the top bar
 *  - `subtle`   – nested card inside a glass panel (no backdrop blur)
 *  - `elevated` – modal-level focus (adds shadow-2xl)
 *
 * Pass `title` to render the standard 2-line header (display title +
 * uppercase mono caption) with an optional dismiss × on the right.
 * `footer` renders an inset bottom strip separated by a hairline.
 * For panels that need full custom chrome, omit `title` and lay out
 * the children freely.
 */

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: PanelVariant;
  title?: ReactNode;
  subtitle?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  footer?: ReactNode;
  /** Inner padding override — defaults to "p-3". */
  padding?: string;
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  {
    variant = "glass",
    title,
    subtitle,
    onDismiss,
    dismissLabel = "Close",
    footer,
    padding = "p-3",
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(RADIUS.lg, PANEL[variant], padding, className)}
      {...rest}
    >
      {(title !== undefined || subtitle !== undefined || onDismiss) && (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <div>
            {title !== undefined && (
              <div className={TEXT.display + " text-sm"}>{title}</div>
            )}
            {subtitle !== undefined && (
              <div className={TEXT.label}>{subtitle}</div>
            )}
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={dismissLabel}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      )}
      {children}
      {footer !== undefined && (
        <div className="mt-3 border-t border-white/5 pt-2">{footer}</div>
      )}
    </div>
  );
});

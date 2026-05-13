import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { BUTTON, RADIUS, cn, type ButtonVariant } from "../../../lib/design-tokens";

/**
 * 🔘 Button — semantic, sized button primitive.
 *
 * Pick `variant` for meaning:
 *  - `primary`   – the affirmative / confirm action ("send", "save")
 *  - `secondary` – the neutral default (most chrome buttons)
 *  - `danger`    – destructive ("delete", "clear cache")
 *  - `ghost`     – borderless, used for close × and tertiary affordances
 *
 * Size = visual mass:
 *  - `sm` (default) for tight chrome / chips
 *  - `md` for primary form actions
 *  - `lg` for hero CTAs (rare in this app)
 *
 * `icon` renders before the label; `loading` swaps it for a spinner and
 * disables the button. `className` is appended last so a caller can
 * override anything for a one-off.
 */

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-7 px-2 py-0.5 text-xs",
  md: "h-8 px-3 py-1.5 text-sm",
  lg: "h-9 px-4 py-2 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "sm",
      icon,
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-mono",
          RADIUS.sm,
          SIZE_CLASSES[size],
          BUTTON[variant],
          isDisabled && "cursor-not-allowed opacity-40",
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
          />
        ) : (
          icon && <span aria-hidden>{icon}</span>
        )}
        {children}
      </button>
    );
  },
);

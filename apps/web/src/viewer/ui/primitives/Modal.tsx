import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../../lib/design-tokens";

/**
 * 🪟 Modal — full-screen dimmer + centered dialog surface.
 *
 * Behaviour:
 *  - Pressing **Escape** calls `onClose`
 *  - Clicking the **backdrop** (anywhere outside the inner panel)
 *    calls `onClose` when `dismissOnBackdrop !== false`
 *  - On open, focus is moved into the dialog and trapped (Tab cycles
 *    inside, Shift+Tab cycles backwards). On close, focus returns to
 *    whatever element opened the modal.
 *
 * The Modal renders a transparent shell — bring your own surface
 * (typically a Panel) as the child. `bare` skips the default
 * `max-h-[90vh]` constraint when the child wants full control of
 * its own height (e.g. the printable certificate sheet).
 */

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  label?: string;
  children: ReactNode;
  dismissOnBackdrop?: boolean;
  /** Class names appended to the centering shell. Use for custom padding
   *  or z-index. Defaults to `z-50 p-4`. */
  shellClassName?: string;
  /** Class names appended to the inner click-stop wrapper. */
  innerClassName?: string;
  /** Skip the default `max-h-[90vh] w-full max-w-[min(720px,96vw)]`
   *  inner sizing. Useful when the child controls its own dimensions. */
  bare?: boolean;
};

export function Modal({
  open,
  onClose,
  label,
  children,
  dismissOnBackdrop = true,
  shellClassName,
  innerClassName,
  bare = false,
}: ModalProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Escape closes, body scroll lock, focus management.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = innerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey, true);

    // Move focus into the dialog so screen readers announce it.
    queueMicrotask(() => {
      const root = innerRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? root).focus();
    });

    return () => {
      window.removeEventListener("keydown", onKey, true);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm",
        shellClassName,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={dismissOnBackdrop ? onClose : undefined}
    >
      <div
        ref={innerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          !bare && "w-full max-w-[min(720px,96vw)] max-h-[90vh] overflow-hidden",
          "outline-none",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

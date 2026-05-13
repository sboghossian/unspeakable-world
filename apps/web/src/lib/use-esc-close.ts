import { useEffect } from "react";

/**
 * Wire `Escape` to close a popover / card. Only listens while `active`
 * is true so multiple cards don't fight for the same key.
 *
 * Usage:
 *   useEscClose(sandboxOpen, () => setSandboxOpen(false));
 *
 * Skips when the user is typing in an input/textarea so a stray Escape
 * doesn't blow away the surrounding card while they're still editing.
 */
export function useEscClose(active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

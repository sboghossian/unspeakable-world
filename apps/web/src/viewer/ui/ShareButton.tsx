import { useState } from "react";

/**
 * 🔗 Share button — copies the current URL (which already encodes the
 * full view state: camera direction, FOV, time, overlay + mix,
 * constellations toggle) to the clipboard. Shows a brief "Copied!" pill
 * that auto-clears after 1.5 s.
 *
 * Falls back to `prompt()` if the Clipboard API isn't available (older
 * browsers or insecure contexts) so the user can still copy manually.
 */

type Props = {
  /** Optional hook to write the current camera/scene state into the URL
   *  hash before copying. Returns the new hash (with or without leading #). */
  onPrepare?: () => string | null;
};

export function ShareButton({ onPrepare }: Props = {}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const onClick = async () => {
    if (onPrepare) {
      try {
        const hash = onPrepare();
        if (hash) {
          const h = hash.startsWith("#") ? hash : `#${hash}`;
          if (window.location.hash !== h) {
            window.history.replaceState(null, "", h);
          }
        }
      } catch {
        /* ignore — fall back to copying current href */
      }
    }
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setState("copied");
      } else {
        // eslint-disable-next-line no-alert
        window.prompt("Copy this link:", url);
        setState("copied");
      }
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1500);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title="Copy a shareable link to this view"
      aria-label={
        state === "copied"
          ? "Shareable link copied to clipboard"
          : state === "failed"
            ? "Failed to copy share link"
            : "Copy shareable link to this view"
      }
      aria-live="polite"
      className={`pointer-events-auto rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
        state === "copied"
          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
          : state === "failed"
            ? "border-rose-400/50 bg-rose-400/15 text-rose-300"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="md:hidden" aria-hidden="true">🔗</span>
      <span className="hidden md:inline">
        {state === "copied"
          ? "✓ copied"
          : state === "failed"
            ? "✕ failed"
            : "🔗 share"}
      </span>
    </button>
  );
}

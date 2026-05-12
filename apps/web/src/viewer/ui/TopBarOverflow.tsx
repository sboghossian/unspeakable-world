import { useEffect, useState } from "react";

/**
 * 🆕 What's-new-in-v4 toast.
 *
 * The existing `TutorialOverlay` ships eight hand-crafted steps. Wedging
 * v4 features (Extra Layers panel, Cosmic Copilot, AR sky) into that
 * flow without reworking the layout was ripple-prone, so this lightweight
 * toast does the awareness job instead. It auto-appears once per browser
 * (keyed via localStorage `uw:whats-new-v4:seen`) a few seconds after the
 * viewer becomes live, dismisses on click, and never reappears.
 *
 * Hidden in embed mode by the caller.
 */

const KEY = "uw:whats-new-v4:seen";

export function WhatsNewV4Toast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") return;
    } catch {
      // ignore — assume unseen
    }
    const t = window.setTimeout(() => setVisible(true), 3000);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-2 bottom-32 z-30 mx-auto max-w-md rounded-xl border border-violet-400/40 bg-space-950/95 p-3 text-sm shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-40">
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none" aria-hidden>
          ✨
        </div>
        <div className="flex-1">
          <div className="font-display text-sm text-white">
            What's new in v4
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            ✨ <strong>Extra Layers</strong> — Gaia DR3, Chandra, multi-messenger.
            <br />
            🧠 <strong>Cosmic Copilot</strong> — an AI tutor grounded in your view.
            <br />
            📱 <strong>AR sky</strong> — point your phone, the labels follow.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/10 bg-white/5 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

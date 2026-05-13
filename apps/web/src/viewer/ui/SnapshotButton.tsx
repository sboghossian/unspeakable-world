import { useState } from "react";

/**
 * 📷 Snapshot — capture the current sky as a PNG.
 *
 * Calls a parent-supplied data-URL builder, then triggers a download. We
 * keep the click → download flow on the main thread so the saved frame
 * is exactly what the user is looking at when they tap the button.
 */

type Props = {
  onCapture: () => string | null;
};

export function SnapshotButton({ onCapture }: Props) {
  const [flash, setFlash] = useState(false);

  const handle = () => {
    const url = onCapture();
    if (!url) return;
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
    a.href = url;
    a.download = `unspeakable-${ts}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 350);
  };

  return (
    <button
      type="button"
      onClick={handle}
      title="Save current view as PNG"
      className={`pointer-events-auto rounded-lg border px-2.5 py-1.5 font-mono text-xs backdrop-blur transition ${
        flash
          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
          : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
      }`}
      aria-label="Save current view as PNG snapshot"
    >
      <span aria-hidden="true">📷</span>
    </button>
  );
}

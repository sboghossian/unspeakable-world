import { useEffect, useMemo, useState } from "react";
import { log } from "../../lib/logger";

/**
 * 🎴 Postcard modal — shows the composed image and offers
 * Download / Copy-to-clipboard / System-share.
 *
 * The blob is produced by `generatePostcard()` and handed in via props.
 * We build an object URL once for `<img>` previewing, revoke on
 * unmount. Clipboard support is feature-detected (`ClipboardItem`); on
 * browsers without it the button shows a disabled state with a tooltip.
 *
 * The "Share" button uses `navigator.share` when available — on iOS /
 * Android this opens the native share-sheet so users can post to
 * Instagram, AirDrop, etc. without leaving the page. On desktop browsers
 * that don't support it we fall back to disabled with a tooltip.
 */

type Props = {
  blob: Blob;
  caption?: string;
  onClose: () => void;
};

export function PostcardModal({ blob, caption, onClose }: Props) {
  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canClipboard =
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    "ClipboardItem" in window &&
    typeof navigator.clipboard?.write === "function";

  const canSystemShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const onDownload = () => {
    const a = document.createElement("a");
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace(/Z$/, "");
    a.href = objectUrl;
    a.download = `unspeakable-postcard-${ts}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const onCopy = async () => {
    if (!canClipboard) return;
    try {
      const ItemCtor = (window as unknown as { ClipboardItem: new (
        items: Record<string, Blob>,
      ) => unknown }).ClipboardItem;
      const item = new ItemCtor({ "image/png": blob });
      await navigator.clipboard.write([item as never]);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch (err) {
      log.warn("[postcard] clipboard write failed", err);
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  const onShare = async () => {
    if (!canSystemShare) return;
    try {
      const file = new File([blob], "unspeakable-postcard.png", {
        type: "image/png",
      });
      await navigator.share({
        files: [file],
        title: "The Unspeakable World",
        text: caption ?? "A glimpse of the unspeakable world.",
      });
    } catch (err) {
      // User-cancelled is fine; everything else we warn but don't surface
      // because the browser already showed an error dialog.
      log.warn("[postcard] system share failed/cancelled", err);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-[min(94vw,520px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-950/95 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="font-display text-sm font-semibold text-white">
            🎴 Your postcard
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <img
            src={objectUrl}
            alt={caption ?? "Postcard preview"}
            className="mx-auto block max-h-[60vh] w-auto rounded-lg border border-white/10 shadow-lg"
          />
          {caption && (
            <p className="mt-3 text-center text-xs italic text-white/65">
              "{caption}"
            </p>
          )}
        </div>

        <footer className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg border border-plasma-500/40 bg-plasma-500/15 px-3 py-2 font-mono text-xs uppercase tracking-wider text-plasma-200 transition hover:bg-plasma-500/25"
          >
            ⤓ Download
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!canClipboard}
            title={canClipboard ? "Copy image to clipboard" : "Clipboard not supported"}
            className={`rounded-lg border px-3 py-2 font-mono text-xs uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${
              copyState === "copied"
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                : copyState === "error"
                  ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                  : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            {copyState === "copied"
              ? "✓ Copied"
              : copyState === "error"
                ? "× Failed"
                : "⧉ Copy"}
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={!canSystemShare}
            title={canSystemShare ? "System share-sheet" : "Share not supported on this browser"}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs uppercase tracking-wider text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↗ Share
          </button>
        </footer>
      </div>
    </div>
  );
}

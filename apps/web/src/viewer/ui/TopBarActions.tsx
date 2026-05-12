import { useEffect, useState } from "react";
import { useSettings } from "../../lib/settings";

/**
 * Compact row of icon-only action buttons for the top-right of every
 * scene's header. Matches AstroGrid's icon-cluster pattern:
 *
 *   [🔇 mute] [◻ focus] [⛶ fullscreen] [⚙ settings hint]
 *
 * Each button is small (28×28), monochrome, with a hover ring and a
 * tooltip via `title`. Stateful buttons (mute, focus) show a slightly
 * brighter background when active.
 *
 * Wiring:
 * - mute → app-wide audio toggle persisted in settings.audioMuted.
 *   Existing pulsar sonification + any future ambient track read this.
 * - fullscreen → document.requestFullscreen/exitFullscreen on the page
 *   root; we listen for fullscreenchange to keep the icon honest.
 * - focus → optional onFocusToggle callback (scenes manage their own
 *   "hide UI" state; we just surface the trigger consistently).
 * - settings → optional onSettings callback.
 */

type Props = {
  /** Toggle UI-hidden mode for screenshots; scene owns the state. */
  focusActive?: boolean;
  onFocusToggle?: () => void;
  /** Open the settings popover. */
  onSettings?: () => void;
};

const ICON_BTN =
  "pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-space-950/70 text-[13px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white";
const ICON_BTN_ACTIVE =
  "pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-400/15 text-[13px] text-emerald-200 backdrop-blur transition hover:bg-emerald-400/25";

export function TopBarActions({
  focusActive,
  onFocusToggle,
  onSettings,
}: Props) {
  const [settings, updateSettings] = useSettings();
  const muted = !!settings.audioMuted;
  const [fullscreen, setFullscreen] = useState<boolean>(() =>
    typeof document !== "undefined" && !!document.fullscreenElement,
  );

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleMute = () => {
    updateSettings({ audioMuted: !muted });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // ignore — common on Safari without user gesture
      });
    } else {
      void document.documentElement.requestFullscreen().catch(() => {
        // ignore
      });
    }
  };

  return (
    <div className="pointer-events-auto inline-flex items-center gap-1">
      <button
        type="button"
        title={muted ? "Unmute sound" : "Mute all sound"}
        aria-label={muted ? "Unmute sound" : "Mute all sound"}
        onClick={toggleMute}
        className={muted ? ICON_BTN_ACTIVE : ICON_BTN}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      {onFocusToggle && (
        <button
          type="button"
          title={focusActive ? "Exit focus mode" : "Focus mode — hide UI"}
          aria-label="Toggle focus mode"
          onClick={onFocusToggle}
          className={focusActive ? ICON_BTN_ACTIVE : ICON_BTN}
        >
          ◻
        </button>
      )}
      <button
        type="button"
        title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        aria-label="Toggle fullscreen"
        onClick={toggleFullscreen}
        className={fullscreen ? ICON_BTN_ACTIVE : ICON_BTN}
      >
        ⛶
      </button>
      {onSettings && (
        <button
          type="button"
          title="Settings"
          aria-label="Open settings"
          onClick={onSettings}
          className={ICON_BTN}
        >
          ⚙
        </button>
      )}
    </div>
  );
}

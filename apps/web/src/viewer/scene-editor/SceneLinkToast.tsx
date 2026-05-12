import { useEffect, useState } from "react";
import { importSceneHash, type SavedScene, type SceneMode } from "../../lib/scene-editor";

/**
 * 🎬 Deep-link toast.
 *
 * Parses `#scene=<base64>` from the URL on mount. If present and the
 * scene matches our mode, surfaces a "Play this scene?" prompt in the
 * bottom-right. We deliberately DON'T auto-play — the user must click
 * "play" so the back-button stays predictable.
 */

type Props = {
  mode: SceneMode;
  onPlay: (scene: SavedScene) => void;
};

export function SceneLinkToast({ mode, onPlay }: Props) {
  const [scene, setScene] = useState<SavedScene | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("scene=")) return;
    const parsed = importSceneHash(hash);
    if (parsed && parsed.mode === mode) {
      setScene(parsed);
    }
  }, [mode]);

  if (!scene || dismissed) return null;

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-50 flex items-center gap-3 rounded-lg border border-cyan-400/40 bg-space-950/95 px-3 py-2 shadow-2xl backdrop-blur-md">
      <span aria-hidden className="text-2xl">
        🎬
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300/80">
          Shared scene
        </div>
        <div className="truncate font-display text-sm text-white/95">
          {scene.name}
        </div>
        <div className="font-mono text-[10px] text-white/45">
          {scene.keyframes.length} keyframe
          {scene.keyframes.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            onPlay(scene);
            setDismissed(true);
          }}
          className="rounded border border-cyan-400/40 bg-cyan-400/15 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/25"
        >
          ▶ play
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-white/55 hover:bg-white/10"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}

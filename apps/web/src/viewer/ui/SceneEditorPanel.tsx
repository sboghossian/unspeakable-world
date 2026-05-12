import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  blankScene,
  clampTimings,
  deleteScene,
  exportSceneHash,
  importSceneHash,
  listScenes,
  saveScene,
  SCENE_EDITOR_DEFAULTS,
  uid,
  type Keyframe,
  type SavedScene,
  type SceneMode,
} from "../../lib/scene-editor";
import { SceneRunner, type RunnerState } from "../scene-editor/scene-runner";
import { log } from "../../lib/logger";

/**
 * 🎬 Scene Editor — keyframed cinematic-camera-walk timeline.
 *
 * AstroGrid's headline creator tool: the user records a sequence of
 * camera states ("keyframes"), each with a body to focus on and a
 * dwell / transition time. Hit play → the camera smoothly tweens
 * between them. Scenes are saved per-mode (solar / universe) to
 * localStorage and can be shared via URL hash.
 *
 * The panel is mounted by both `SolarFlight.tsx` and `Universe.tsx`,
 * each passing in:
 *   - `onCapture()` → reads the current camera into an opaque blob
 *   - `onApply(blob)` → pushes a blob back during playback
 *   - `onPlayingChange(playing)` → lets the host suspend its own
 *     hash-state hydration while a scene is playing
 */

type Props = {
  mode: SceneMode;
  /** Read the current camera state into an opaque blob. */
  onCapture: () => Record<string, unknown>;
  /** Push a blob back into the scene during playback. */
  onApply: (camera: Record<string, unknown>) => void;
  /** Notified when a scene starts / stops playing so the host can
   *  suspend its own hash-state hydration during playback. */
  onPlayingChange?: (playing: boolean) => void;
};

type Tab = "scenes" | "timeline" | "share";

export function SceneEditorPanel({
  mode,
  onCapture,
  onApply,
  onPlayingChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("scenes");
  const [scenes, setScenes] = useState<SavedScene[]>(() => listScenes(mode));
  const [active, setActive] = useState<SavedScene | null>(null);
  const [runnerState, setRunnerState] = useState<RunnerState | null>(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const runnerRef = useRef<SceneRunner | null>(null);

  // Lazy-init the runner — one per panel instance.
  if (!runnerRef.current) runnerRef.current = new SceneRunner();

  // Refresh scenes from storage when the panel opens (so updates from
  // another tab show up).
  useEffect(() => {
    if (open) setScenes(listScenes(mode));
  }, [open, mode]);

  // Persist `active` to storage whenever it changes (debounced).
  useEffect(() => {
    if (!active) return;
    const handle = window.setTimeout(() => {
      saveScene(active);
      setScenes(listScenes(mode));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [active, mode]);

  // ESC closes the panel; Space toggles play/pause while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const inField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (e.key === "Escape") {
        if (inField) return; // let the input clear
        setOpen(false);
        return;
      }
      if (e.key === " " && !inField) {
        e.preventDefault();
        if (runnerState?.playing) {
          if (runnerState.paused) handleResume();
          else handlePause();
        } else if (active) {
          handlePlay();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const playing = !!runnerState?.playing;
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  // Stop playback on unmount.
  useEffect(() => {
    return () => {
      runnerRef.current?.stop();
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!active || active.keyframes.length === 0) return;
    const runner = runnerRef.current;
    if (!runner) return;
    setTab("timeline");
    runner.start(active, (camera, state) => {
      onApply(camera);
      setRunnerState({ ...state });
    });
  }, [active, onApply]);

  const handlePause = useCallback(() => {
    runnerRef.current?.pause();
    setRunnerState((s) => (s ? { ...s, paused: true, playing: false } : s));
  }, []);

  const handleResume = useCallback(() => {
    runnerRef.current?.resume();
    setRunnerState((s) => (s ? { ...s, paused: false, playing: true } : s));
  }, []);

  const handleStop = useCallback(() => {
    runnerRef.current?.stop();
    setRunnerState(null);
  }, []);

  const newScene = useCallback(() => {
    const s = blankScene(mode, `Scene ${scenes.length + 1}`);
    saveScene(s);
    setScenes(listScenes(mode));
    setActive(s);
    setTab("timeline");
  }, [mode, scenes.length]);

  const captureKeyframe = useCallback(() => {
    if (!active) return;
    const cam = onCapture();
    const kf: Keyframe = {
      id: uid("kf"),
      label: `Keyframe ${active.keyframes.length + 1}`,
      transitionMs: SCENE_EDITOR_DEFAULTS.transitionMs,
      holdMs: SCENE_EDITOR_DEFAULTS.holdMs,
      camera: cam,
    };
    setActive({ ...active, keyframes: [...active.keyframes, kf] });
  }, [active, onCapture]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Scene Editor — record a keyframed cinematic camera walk"
        aria-label="Open Scene Editor"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>🎬</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          scenes
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(600px,94vw)] max-h-[78vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <header className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span aria-hidden>🎬</span>
              <div className="font-display text-sm text-white/90">
                Scene Editor
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                {mode}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Scene Editor"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </header>

          <nav className="flex gap-1 border-b border-white/5 px-2 py-1.5">
            {(
              [
                ["scenes", "Scenes"],
                ["timeline", "Timeline"],
                ["share", "Share"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest transition ${
                  tab === id
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {tab === "scenes" && (
              <ScenesTab
                scenes={scenes}
                activeId={active?.id ?? null}
                onPick={(s) => {
                  setActive(s);
                  setTab("timeline");
                }}
                onNew={newScene}
                onDelete={(id) => {
                  deleteScene(id);
                  setScenes(listScenes(mode));
                  if (active?.id === id) setActive(null);
                }}
                onRename={(id, name) => {
                  const next = scenes.find((s) => s.id === id);
                  if (!next) return;
                  const updated = { ...next, name };
                  saveScene(updated);
                  setScenes(listScenes(mode));
                  if (active?.id === id) setActive(updated);
                }}
              />
            )}

            {tab === "timeline" && (
              <TimelineTab
                scene={active}
                runnerState={runnerState}
                onChange={(next) => setActive(next)}
                onCaptureKeyframe={captureKeyframe}
                onPlay={handlePlay}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                onApplyKeyframe={(kf) => onApply(kf.camera)}
              />
            )}

            {tab === "share" && (
              <ShareTab
                scene={active}
                copied={shareCopied}
                setCopied={setShareCopied}
                importText={importText}
                setImportText={setImportText}
                importError={importError}
                onImport={() => {
                  setImportError(null);
                  const parsed = importSceneHash(importText.trim());
                  if (!parsed) {
                    setImportError("Couldn't decode that link.");
                    return;
                  }
                  if (parsed.mode !== mode) {
                    setImportError(
                      `That scene is for "${parsed.mode}" mode, not "${mode}".`,
                    );
                    return;
                  }
                  // New id to avoid clobbering existing storage.
                  const fresh: SavedScene = {
                    ...parsed,
                    id: uid("scene"),
                    createdAt: new Date().toISOString(),
                  };
                  saveScene(fresh);
                  setScenes(listScenes(mode));
                  setActive(fresh);
                  setImportText("");
                  setTab("timeline");
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Scenes tab — list + new + delete + inline rename
// ────────────────────────────────────────────────────────────────────

function ScenesTab({
  scenes,
  activeId,
  onPick,
  onNew,
  onDelete,
  onRename,
}: {
  scenes: SavedScene[];
  activeId: string | null;
  onPick: (s: SavedScene) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  return (
    <div>
      <button
        type="button"
        onClick={onNew}
        className="mb-3 w-full rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
      >
        + new scene
      </button>
      {scenes.length === 0 ? (
        <div className="rounded-md border border-white/5 bg-white/[0.02] p-4 text-center font-mono text-[11px] text-white/45">
          No scenes yet — capture a few keyframes to build one.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {scenes.map((s) => {
            const isActive = s.id === activeId;
            const isRenaming = renamingId === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 transition ${
                  isActive
                    ? "border-cyan-400/40 bg-cyan-400/10"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => !isRenaming && onPick(s)}
                  className="flex-1 text-left"
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => {
                        if (renameDraft.trim()) onRename(s.id, renameDraft.trim());
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (renameDraft.trim()) onRename(s.id, renameDraft.trim());
                          setRenamingId(null);
                        } else if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      className="w-full rounded border border-white/10 bg-space-950 px-1.5 py-0.5 font-display text-[12px] text-white/90 focus:border-cyan-400/40 focus:outline-none"
                    />
                  ) : (
                    <>
                      <div
                        className={`font-display text-[12px] ${
                          isActive ? "text-cyan-200" : "text-white/85"
                        }`}
                      >
                        {s.name}
                      </div>
                      <div className="font-mono text-[10px] text-white/40">
                        {s.keyframes.length} keyframe
                        {s.keyframes.length === 1 ? "" : "s"} ·{" "}
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </button>
                {!isRenaming && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(s.id);
                        setRenameDraft(s.name);
                      }}
                      title="Rename"
                      className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/55 hover:bg-white/10 hover:text-white"
                    >
                      rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(`Delete scene "${s.name}"?`)
                        ) {
                          onDelete(s.id);
                        }
                      }}
                      title="Delete"
                      className="rounded border border-red-400/20 bg-red-400/5 px-1.5 py-0.5 font-mono text-[10px] text-red-300/70 hover:bg-red-400/15 hover:text-red-200"
                    >
                      del
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Timeline tab — keyframe cards, transport, SVG playhead
// ────────────────────────────────────────────────────────────────────

function TimelineTab({
  scene,
  runnerState,
  onChange,
  onCaptureKeyframe,
  onPlay,
  onPause,
  onResume,
  onStop,
  onApplyKeyframe,
}: {
  scene: SavedScene | null;
  runnerState: RunnerState | null;
  onChange: (next: SavedScene) => void;
  onCaptureKeyframe: () => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onApplyKeyframe: (kf: Keyframe) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  if (!scene) {
    return (
      <div className="rounded-md border border-white/5 bg-white/[0.02] p-4 text-center font-mono text-[11px] text-white/45">
        Pick a scene from the Scenes tab — or start a new one — to edit
        its timeline.
      </div>
    );
  }

  const playing = !!runnerState?.playing;
  const paused = !!runnerState?.paused;
  const loopOn = scene.loop !== false;

  const handleReorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...scene.keyframes];
    const moved = next.splice(from, 1)[0];
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange({ ...scene, keyframes: next });
  };

  const updateKeyframe = (idx: number, patch: Partial<Keyframe>) => {
    const next = [...scene.keyframes];
    const current = next[idx];
    if (!current) return;
    next[idx] = clampTimings({ ...current, ...patch });
    onChange({ ...scene, keyframes: next });
  };

  const duplicateKeyframe = (idx: number) => {
    const next = [...scene.keyframes];
    const current = next[idx];
    if (!current) return;
    next.splice(idx + 1, 0, {
      ...current,
      id: uid("kf"),
      label: `${current.label ?? "Keyframe"} copy`,
    });
    onChange({ ...scene, keyframes: next });
  };

  const deleteKeyframe = (idx: number) => {
    const next = scene.keyframes.filter((_, i) => i !== idx);
    onChange({ ...scene, keyframes: next });
  };

  return (
    <div className="space-y-3">
      {/* Transport + loop toggle */}
      <div className="flex items-center gap-2">
        {!playing || paused ? (
          <button
            type="button"
            onClick={paused ? onResume : onPlay}
            disabled={scene.keyframes.length === 0}
            className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ▶ {paused ? "resume" : "play"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 transition hover:bg-amber-400/20"
          >
            ❚❚ pause
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          disabled={!playing && !paused}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/65 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ■ stop
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/55">
          <input
            type="checkbox"
            checked={loopOn}
            onChange={(e) =>
              onChange({ ...scene, loop: e.target.checked })
            }
            className="accent-cyan-400"
          />
          loop
        </label>
      </div>

      {/* SVG playhead track */}
      <TimelineTrack scene={scene} runnerState={runnerState} />

      {/* Keyframe cards */}
      {scene.keyframes.length === 0 ? (
        <div className="rounded-md border border-white/5 bg-white/[0.02] p-4 text-center font-mono text-[11px] text-white/45">
          No keyframes yet. Frame your camera the way you want, then hit
          "+ keyframe" to capture it.
        </div>
      ) : (
        <ol className="flex flex-wrap gap-2">
          {scene.keyframes.map((kf, i) => {
            const isActive = runnerState?.stepIdx === i;
            const dragging = dragIdx === i;
            return (
              <li
                key={kf.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => {
                  if (dragIdx === null || dragIdx === i) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null) handleReorder(dragIdx, i);
                  setDragIdx(null);
                }}
                onDragEnd={() => setDragIdx(null)}
                className={`w-[170px] shrink-0 rounded-md border px-2 py-1.5 transition ${
                  isActive
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.02]"
                } ${dragging ? "opacity-50" : ""}`}
              >
                <div className="mb-1 flex items-baseline justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    #{i + 1}
                  </div>
                  <div className="cursor-grab font-mono text-[10px] text-white/30">
                    ⋮⋮
                  </div>
                </div>
                <input
                  type="text"
                  value={kf.label ?? ""}
                  onChange={(e) =>
                    updateKeyframe(i, { label: e.target.value })
                  }
                  placeholder="label"
                  className="mb-1.5 w-full rounded border border-white/5 bg-space-950/60 px-1.5 py-0.5 font-display text-[11px] text-white/85 focus:border-cyan-400/40 focus:outline-none"
                />
                <div className="mb-1 flex items-center gap-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                    in
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={kf.transitionMs}
                    onChange={(e) =>
                      updateKeyframe(i, {
                        transitionMs: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-14 rounded border border-white/5 bg-space-950/60 px-1 py-0.5 text-right font-mono text-[10px] text-white/80 focus:border-cyan-400/40 focus:outline-none"
                  />
                  <span className="font-mono text-[9px] text-white/35">ms</span>
                </div>
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                    hold
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={kf.holdMs}
                    onChange={(e) =>
                      updateKeyframe(i, {
                        holdMs: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-14 rounded border border-white/5 bg-space-950/60 px-1 py-0.5 text-right font-mono text-[10px] text-white/80 focus:border-cyan-400/40 focus:outline-none"
                  />
                  <span className="font-mono text-[9px] text-white/35">ms</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onApplyKeyframe(kf)}
                    title="Jump the camera to this keyframe"
                    className="flex-1 rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/65 hover:bg-white/10 hover:text-white"
                  >
                    go
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateKeyframe(i)}
                    title="Duplicate"
                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/65 hover:bg-white/10 hover:text-white"
                  >
                    ⎘
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteKeyframe(i)}
                    title="Delete"
                    className="rounded border border-red-400/20 bg-red-400/5 px-1.5 py-0.5 font-mono text-[9px] text-red-300/80 hover:bg-red-400/15"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button
        type="button"
        onClick={onCaptureKeyframe}
        className="w-full rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
      >
        + keyframe (capture current camera)
      </button>
    </div>
  );
}

function TimelineTrack({
  scene,
  runnerState,
}: {
  scene: SavedScene;
  runnerState: RunnerState | null;
}) {
  const totalMs = useMemo(() => {
    let sum = 0;
    for (const kf of scene.keyframes) {
      const c = clampTimings(kf);
      sum += c.transitionMs + c.holdMs;
    }
    return Math.max(1, sum);
  }, [scene.keyframes]);

  // Compute the playhead's position (in ms along the total) from the
  // runner state. We pick up the current step's startOffsetMs +
  // (progress * stepMs).
  const playheadFrac = useMemo(() => {
    if (!runnerState || scene.keyframes.length === 0) return 0;
    let offsetMs = 0;
    for (let i = 0; i < runnerState.stepIdx; i++) {
      const kf = scene.keyframes[i];
      if (!kf) continue;
      const c = clampTimings(kf);
      offsetMs += c.transitionMs + c.holdMs;
    }
    const cur = scene.keyframes[runnerState.stepIdx];
    if (cur) {
      const c = clampTimings(cur);
      offsetMs += (c.transitionMs + c.holdMs) * runnerState.progress;
    }
    return Math.min(1, offsetMs / totalMs);
  }, [runnerState, scene.keyframes, totalMs]);

  if (scene.keyframes.length === 0) return null;

  const WIDTH = 560;
  const HEIGHT = 26;
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Scene timeline playhead"
    >
      {/* track baseline */}
      <line
        x1={0}
        y1={HEIGHT / 2}
        x2={WIDTH}
        y2={HEIGHT / 2}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      {/* per-keyframe segments */}
      {(() => {
        let cursor = 0;
        return scene.keyframes.map((kf, i) => {
          const c = clampTimings(kf);
          const segMs = c.transitionMs + c.holdMs;
          const x0 = (cursor / totalMs) * WIDTH;
          const x1 = ((cursor + segMs) / totalMs) * WIDTH;
          cursor += segMs;
          const isActive = runnerState?.stepIdx === i;
          return (
            <g key={kf.id}>
              <rect
                x={x0}
                y={HEIGHT / 2 - 3}
                width={Math.max(2, x1 - x0 - 1)}
                height={6}
                fill={
                  isActive
                    ? "rgba(34,211,238,0.55)"
                    : "rgba(255,255,255,0.18)"
                }
                rx={1.5}
              />
              <circle
                cx={x0}
                cy={HEIGHT / 2}
                r={3}
                fill={isActive ? "#22d3ee" : "rgba(255,255,255,0.45)"}
              />
            </g>
          );
        });
      })()}
      {/* playhead */}
      {runnerState && (
        <line
          x1={playheadFrac * WIDTH}
          y1={2}
          x2={playheadFrac * WIDTH}
          y2={HEIGHT - 2}
          stroke="#22d3ee"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Share tab — copy link, paste & import
// ────────────────────────────────────────────────────────────────────

function ShareTab({
  scene,
  copied,
  setCopied,
  importText,
  setImportText,
  importError,
  onImport,
}: {
  scene: SavedScene | null;
  copied: boolean;
  setCopied: (b: boolean) => void;
  importText: string;
  setImportText: (s: string) => void;
  importError: string | null;
  onImport: () => void;
}) {
  const link = useMemo(() => {
    if (!scene) return "";
    const hash = exportSceneHash(scene);
    const base =
      typeof window !== "undefined"
        ? window.location.origin + window.location.pathname
        : "";
    return `${base}${hash}`;
  }, [scene]);

  const handleCopy = useCallback(() => {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard
        .writeText(link)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        })
        .catch((err) => log.warn("[scene-editor] copy failed", err));
    }
  }, [link, setCopied]);

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          share this scene
        </div>
        {scene ? (
          <>
            <textarea
              value={link}
              readOnly
              rows={4}
              className="w-full rounded border border-white/10 bg-space-950/60 p-2 font-mono text-[10px] text-white/75 focus:border-cyan-400/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="mt-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
            >
              {copied ? "✓ copied" : "copy link"}
            </button>
          </>
        ) : (
          <div className="rounded-md border border-white/5 bg-white/[0.02] p-3 font-mono text-[11px] text-white/45">
            Pick a scene first to generate a shareable link.
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          paste a link
        </div>
        <input
          type="text"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="paste a shared scene link"
          className="w-full rounded border border-white/10 bg-space-950/60 px-2 py-1.5 font-mono text-[11px] text-white/80 focus:border-cyan-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onImport}
          disabled={!importText.trim()}
          className="mt-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          import
        </button>
        {importError && (
          <div className="mt-1 font-mono text-[10px] text-red-300/80">
            {importError}
          </div>
        )}
      </div>
    </div>
  );
}

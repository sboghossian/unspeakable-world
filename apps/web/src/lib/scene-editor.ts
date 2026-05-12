/**
 * Scene Editor storage + serialisation.
 *
 * A "scene" is an ordered list of keyframes; each keyframe captures a
 * mode-specific camera state plus a transition (tween-in) and hold
 * duration. The runner ({@link ./viewer/scene-editor/scene-runner.ts})
 * walks the keyframes and lerps numeric fields between them.
 *
 * Everything lives in a single localStorage key (`uw:scenes:v1`) as a
 * JSON array — same shape as bookmarks.ts. Soft cap at 50 scenes per
 * mode to keep the picker readable and the storage footprint small.
 */
import { log } from "./logger";

const STORAGE_KEY = "uw:scenes:v1";
const SOFT_CAP_PER_MODE = 50;

export type SceneMode = "solar" | "universe";

export type Keyframe = {
  id: string;
  /** Display name, e.g. "Hold on Saturn". Optional. */
  label?: string;
  /** Milliseconds to transition INTO this keyframe (tween). */
  transitionMs: number;
  /** Milliseconds to hold AT this keyframe (after transition completes). */
  holdMs: number;
  /** Mode-specific camera state — opaque blob. */
  camera: Record<string, unknown>;
};

export type SavedScene = {
  id: string;
  name: string;
  mode: SceneMode;
  createdAt: string; // ISO
  keyframes: Keyframe[];
  /** Loop indefinitely when reaching the last keyframe. Default true. */
  loop?: boolean;
};

/** Generate a stable-ish id (no crypto.randomUUID dependency for SSR). */
export function uid(prefix = "kf"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): SavedScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedScene);
  } catch (err) {
    log.warn("[scene-editor] read failed", err);
    return [];
  }
}

function writeAll(scenes: SavedScene[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
  } catch (err) {
    log.warn("[scene-editor] write failed", err);
  }
}

function isKeyframe(v: unknown): v is Keyframe {
  if (!v || typeof v !== "object") return false;
  const k = v as Partial<Keyframe>;
  return (
    typeof k.id === "string" &&
    typeof k.transitionMs === "number" &&
    typeof k.holdMs === "number" &&
    typeof k.camera === "object" &&
    k.camera !== null
  );
}

function isSavedScene(v: unknown): v is SavedScene {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<SavedScene>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    (s.mode === "solar" || s.mode === "universe") &&
    typeof s.createdAt === "string" &&
    Array.isArray(s.keyframes) &&
    s.keyframes.every(isKeyframe)
  );
}

export function listScenes(mode: SceneMode): SavedScene[] {
  return readAll()
    .filter((s) => s.mode === mode)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getScene(id: string): SavedScene | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function saveScene(scene: SavedScene): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === scene.id);
  if (idx >= 0) {
    all[idx] = scene;
  } else {
    // Enforce soft cap — drop the oldest in this mode if we'd exceed it.
    const inMode = all.filter((s) => s.mode === scene.mode);
    if (inMode.length >= SOFT_CAP_PER_MODE) {
      inMode.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const oldest = inMode[0];
      if (oldest) {
        const dropIdx = all.findIndex((s) => s.id === oldest.id);
        if (dropIdx >= 0) all.splice(dropIdx, 1);
      }
    }
    all.push(scene);
  }
  writeAll(all);
}

export function deleteScene(id: string): void {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
}

/** Base64-encode a scene, returning a `#scene=...` fragment. */
export function exportSceneHash(scene: SavedScene): string {
  const json = JSON.stringify(scene);
  // unicode-safe base64
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `#scene=${b64}`;
}

/** Decode a `#scene=...` fragment back into a scene. Validates structure. */
export function importSceneHash(hash: string): SavedScene | null {
  try {
    const m = hash.match(/scene=([^&]+)/);
    if (!m || !m[1]) return null;
    const b64 = m[1];
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed: unknown = JSON.parse(json);
    if (!isSavedScene(parsed)) return null;
    return parsed;
  } catch (err) {
    log.warn("[scene-editor] importSceneHash failed", err);
    return null;
  }
}

/** Convenience: produce a brand-new empty scene. */
export function blankScene(mode: SceneMode, name?: string): SavedScene {
  return {
    id: uid("scene"),
    name: name ?? "Untitled scene",
    mode,
    createdAt: new Date().toISOString(),
    keyframes: [],
    loop: true,
  };
}

/** Clamp a keyframe's timings to the minimum 200ms total floor. */
export function clampTimings(kf: Keyframe): Keyframe {
  const min = 200;
  let t = Math.max(0, Math.floor(kf.transitionMs));
  let h = Math.max(0, Math.floor(kf.holdMs));
  if (t + h < min) {
    // Distribute the deficit toward `hold` since transition=0 is a
    // legitimate "snap" choice.
    h = Math.max(h, min - t);
  }
  return { ...kf, transitionMs: t, holdMs: h };
}

export const SCENE_EDITOR_DEFAULTS = {
  transitionMs: 1500,
  holdMs: 2000,
} as const;

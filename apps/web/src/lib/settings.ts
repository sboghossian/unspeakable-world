import { useEffect, useState } from "react";

/**
 * 🛠 Global app settings.
 *
 * Single source of truth for user-tunable knobs that span multiple scenes
 * (Sky Atlas, Solar Flight, Universe). Persisted to localStorage under
 * `uw.settings.v1`. Components subscribe via {@link useSettings}; non-React
 * scene code reads via {@link getSettings} and listens via
 * {@link onSettingsChange}.
 */

/**
 * Reader registers for the "why this matters" body in the inspector.
 * - `curious` — short, vivid, age-12 voice.
 * - `student` — mechanism + units, age-16 voice (default).
 * - `expert` — physical parameters with units + scientific significance.
 */
export type ExplanationTier = "curious" | "student" | "expert";

export type AppSettings = {
  orbitOpacity: number; // 0–1
  gridOpacity: number; // 0–1
  starBrightness: number; // 0.1–2.0
  flyToDurationSec: number; // 1–10
  fpsCap: 30 | 60 | 120;
  /** Pause renderer when tab hidden or camera idle 60 s. */
  standby: boolean;
  realScale: boolean;
  realColor: boolean;
  showNames: boolean;
  /** Sky Atlas projection mode. 3D = celestial sphere; aitoff = 2D oval. */
  skyProjection: "3d" | "aitoff";
  /** Master switch for pulsar sonification + aurora overlay sound cues. */
  sonificationOn: boolean;
  /** Master volume for sonification UI (0-1). */
  sonificationVolume: number;
  /** Top-bar mute toggle. When true every audio surface goes silent
   *  regardless of `sonificationOn` — quick global "shhh" button. */
  audioMuted: boolean;
  /** Audience register for the "why it matters" body in InfoPanel. */
  explanationTier: ExplanationTier;
};

export const DEFAULT_SETTINGS: AppSettings = {
  orbitOpacity: 0.7,
  gridOpacity: 0.2,
  starBrightness: 1.0,
  flyToDurationSec: 5,
  fpsCap: 60,
  standby: true,
  realScale: false,
  realColor: false,
  showNames: true,
  skyProjection: "3d",
  sonificationOn: true,
  sonificationVolume: 0.4,
  audioMuted: false,
  explanationTier: "student",
};

const STORAGE_KEY = "uw.settings.v1";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function sanitize(raw: unknown): AppSettings {
  const partial = (raw && typeof raw === "object" ? raw : {}) as Partial<AppSettings>;
  const fps = partial.fpsCap;
  return {
    orbitOpacity: clamp(Number(partial.orbitOpacity ?? DEFAULT_SETTINGS.orbitOpacity), 0, 1),
    gridOpacity: clamp(Number(partial.gridOpacity ?? DEFAULT_SETTINGS.gridOpacity), 0, 1),
    starBrightness: clamp(Number(partial.starBrightness ?? DEFAULT_SETTINGS.starBrightness), 0.1, 2.0),
    flyToDurationSec: clamp(Number(partial.flyToDurationSec ?? DEFAULT_SETTINGS.flyToDurationSec), 1, 10),
    fpsCap: fps === 30 || fps === 60 || fps === 120 ? fps : DEFAULT_SETTINGS.fpsCap,
    standby: typeof partial.standby === "boolean" ? partial.standby : DEFAULT_SETTINGS.standby,
    realScale: typeof partial.realScale === "boolean" ? partial.realScale : DEFAULT_SETTINGS.realScale,
    realColor: typeof partial.realColor === "boolean" ? partial.realColor : DEFAULT_SETTINGS.realColor,
    showNames: typeof partial.showNames === "boolean" ? partial.showNames : DEFAULT_SETTINGS.showNames,
    skyProjection:
      partial.skyProjection === "aitoff" ? "aitoff" : DEFAULT_SETTINGS.skyProjection,
    sonificationOn:
      typeof partial.sonificationOn === "boolean"
        ? partial.sonificationOn
        : DEFAULT_SETTINGS.sonificationOn,
    sonificationVolume: clamp(
      Number(partial.sonificationVolume ?? DEFAULT_SETTINGS.sonificationVolume),
      0,
      1,
    ),
    audioMuted:
      typeof partial.audioMuted === "boolean"
        ? partial.audioMuted
        : DEFAULT_SETTINGS.audioMuted,
    explanationTier:
      partial.explanationTier === "curious" ||
      partial.explanationTier === "student" ||
      partial.explanationTier === "expert"
        ? partial.explanationTier
        : DEFAULT_SETTINGS.explanationTier,
  };
}

function load(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let current: AppSettings = load();
const listeners = new Set<(s: AppSettings) => void>();

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getSettings(): AppSettings {
  return current;
}

export function updateSettings(partial: Partial<AppSettings>): void {
  current = sanitize({ ...current, ...partial });
  persist();
  for (const l of listeners) l(current);
}

export function onSettingsChange(cb: (s: AppSettings) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook returning [settings, update]. Re-renders when any field changes. */
export function useSettings(): [AppSettings, (partial: Partial<AppSettings>) => void] {
  const [s, setS] = useState<AppSettings>(current);
  useEffect(() => onSettingsChange(setS), []);
  return [s, updateSettings];
}

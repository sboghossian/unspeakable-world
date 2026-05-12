/**
 * 🏆 Achievements — tiny localStorage-backed unlock system.
 *
 * Designed to be a no-dependency module so any scene or panel can call
 * `unlock("voyager")` without dragging React state, contexts, or stores
 * across module boundaries. Subscribers re-render via {@link useAchievements}.
 *
 * Storage layout (localStorage key `uw.achievements.v1`):
 *
 *   { unlocked: { [id]: ISO timestamp } }
 *
 * The list is intentionally cosmetic + curated — no XP, no leaderboards,
 * just little "I've been here" badges that surface progress when the
 * trophy popover is open.
 */

import { useEffect, useState } from "react";

export type Achievement = {
  id: string;
  title: string;
  body: string;
  emoji: string;
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first-light",
    title: "First light",
    body: "Opened the viewer for the first time.",
    emoji: "✨",
  },
  {
    id: "voyager",
    title: "Voyager",
    body: "Flew to all eight planets in solar flight.",
    emoji: "🚀",
  },
  {
    id: "lunar-visitor",
    title: "Lunar visitor",
    body: "Got within 0.005 AU of Earth's Moon.",
    emoji: "🌕",
  },
  {
    id: "time-traveller",
    title: "Time traveller",
    body: "Scrubbed time more than a year forward or backward.",
    emoji: "🕰",
  },
  {
    id: "cosmologist",
    title: "Cosmologist",
    body: "Zoomed past 1 Mly — into the cosmic web.",
    emoji: "🌌",
  },
  {
    id: "multi-wavelength",
    title: "Multi-wavelength",
    body: "Cross-faded between two HiPS surveys.",
    emoji: "◐",
  },
  {
    id: "pulsar-listener",
    title: "Pulsar listener",
    body: "Played a pulsar's spin as audio.",
    emoji: "⚡",
  },
  {
    id: "iss-spotter",
    title: "ISS spotter",
    body: "Identified the International Space Station from the satellite catalog.",
    emoji: "🛰",
  },
  {
    id: "eclipse-watcher",
    title: "Eclipse watcher",
    body: "Time-machined to a real solar or lunar eclipse.",
    emoji: "🌑",
  },
  {
    id: "tour-guide",
    title: "Tour guide",
    body: "Played a curated cinematic tour to completion.",
    emoji: "🎬",
  },
  {
    id: "scholar",
    title: "Scholar",
    body: "Completed your first curriculum lesson with the quiz.",
    emoji: "🎓",
  },
  {
    id: "honors-student",
    title: "Honors student",
    body: "Aced every quiz in a single lesson.",
    emoji: "🏅",
  },
  {
    id: "mythbuster",
    title: "Mythbuster",
    body: "Browsed the common-myths panel — separating fact from folklore.",
    emoji: "🔍",
  },
];

const STORAGE_KEY = "uw.achievements.v1";

type State = { unlocked: Record<string, string> };

function load(): State {
  if (typeof window === "undefined") return { unlocked: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: {} };
    const parsed = JSON.parse(raw) as Partial<State>;
    return { unlocked: parsed.unlocked ?? {} };
  } catch {
    return { unlocked: {} };
  }
}

let state: State = load();
const listeners = new Set<(s: State) => void>();
let lastUnlocked: { id: string; at: number } | null = null;

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function notify(): void {
  listeners.forEach((cb) => cb(state));
}

/** Returns true if the achievement was newly unlocked (false if no-op). */
export function unlock(id: string): boolean {
  if (state.unlocked[id]) return false;
  if (!ACHIEVEMENTS.some((a) => a.id === id)) return false;
  state = {
    unlocked: { ...state.unlocked, [id]: new Date().toISOString() },
  };
  lastUnlocked = { id, at: Date.now() };
  persist();
  notify();
  return true;
}

export function isUnlocked(id: string): boolean {
  return !!state.unlocked[id];
}

export function unlockedCount(): number {
  return Object.keys(state.unlocked).length;
}

export function getRecentUnlock(maxAgeMs = 6000): Achievement | null {
  if (!lastUnlocked) return null;
  if (Date.now() - lastUnlocked.at > maxAgeMs) return null;
  return ACHIEVEMENTS.find((a) => a.id === lastUnlocked!.id) ?? null;
}

/** React hook — re-renders on every unlock. */
export function useAchievements(): State {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const cb = (s: State) => setSnap(s);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return snap;
}

/** Helper for the Voyager achievement — track every planet the user
 *  has flown to and unlock once all 8 are visited. */
const VOYAGER_KEY = "uw.voyager.v1";
const VOYAGER_TARGETS = [
  "Mercury",
  "Venus",
  "Earth",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
];
export function recordPlanetVisit(name: string): void {
  if (!VOYAGER_TARGETS.includes(name)) return;
  let visited: string[] = [];
  try {
    visited = JSON.parse(window.localStorage.getItem(VOYAGER_KEY) ?? "[]");
  } catch {
    /* ignore */
  }
  if (!visited.includes(name)) {
    visited.push(name);
    try {
      window.localStorage.setItem(VOYAGER_KEY, JSON.stringify(visited));
    } catch {
      /* ignore */
    }
  }
  if (VOYAGER_TARGETS.every((p) => visited.includes(p))) {
    unlock("voyager");
  }
}

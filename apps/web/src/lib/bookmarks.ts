import { useEffect, useState } from "react";

/**
 * 🔖 Cross-mode bookmarks.
 *
 * Each bookmark stores a full URL (including hash), so restoring it is just
 * a navigation — every per-mode component already reads its hash params on
 * mount. Persisted to localStorage under `uw.bookmarks.v1`. Migrates the
 * legacy `uw:favorites` key on first load.
 */

export type BookmarkMode =
  | "viewer"
  | "solar"
  | "galactic"
  | "universe"
  | "surface";

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  mode: BookmarkMode;
  createdAt: number;
};

const STORAGE_KEY = "uw.bookmarks.v1";
const LEGACY_FAV_KEY = "uw:favorites";

function isMode(s: unknown): s is BookmarkMode {
  return (
    s === "viewer" ||
    s === "solar" ||
    s === "galactic" ||
    s === "universe" ||
    s === "surface"
  );
}

function sanitize(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  const out: Bookmark[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const v = r as Partial<Bookmark>;
    if (
      typeof v.id === "string" &&
      typeof v.title === "string" &&
      typeof v.url === "string" &&
      typeof v.createdAt === "number" &&
      isMode(v.mode)
    ) {
      out.push({
        id: v.id,
        title: v.title,
        url: v.url,
        mode: v.mode,
        createdAt: v.createdAt,
      });
    }
  }
  return out;
}

function migrateLegacyFavorites(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_FAV_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    const out: Bookmark[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== "object") continue;
      const v = item as { id?: unknown; label?: unknown; hash?: unknown };
      const label = typeof v.label === "string" ? v.label : undefined;
      const id =
        typeof v.id === "string" ? v.id : `legacy-${now}-${i}`;
      const hash = typeof v.hash === "string" ? v.hash : "";
      if (!label) continue;
      const origin =
        typeof window.location !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : "";
      out.push({
        id: `fav:${id}`,
        title: label,
        url: `${origin}${hash || "#viewer"}`,
        mode: "viewer",
        createdAt: now - (parsed.length - i),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function load(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
    // First-time load: migrate legacy favorites if present.
    const migrated = migrateLegacyFavorites();
    if (migrated.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

let current: Bookmark[] = load();
const listeners = new Set<(b: Bookmark[]) => void>();

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* ignore quota / private mode */
  }
  for (const l of listeners) l(current);
}

export function listBookmarks(): Bookmark[] {
  return current;
}

export function addBookmark(input: {
  title: string;
  url: string;
  mode: BookmarkMode;
}): Bookmark {
  const bm: Bookmark = {
    id: `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.slice(0, 80) || "untitled view",
    url: input.url,
    mode: input.mode,
    createdAt: Date.now(),
  };
  current = [bm, ...current].slice(0, 50);
  persist();
  return bm;
}

export function removeBookmark(id: string): void {
  current = current.filter((b) => b.id !== id);
  persist();
}

/** React hook returning the current bookmarks list. */
export function useBookmarks(): Bookmark[] {
  const [list, setList] = useState<Bookmark[]>(current);
  useEffect(() => {
    const cb = (b: Bookmark[]) => setList(b);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return list;
}

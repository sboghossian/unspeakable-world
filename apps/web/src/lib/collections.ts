import { useEffect, useState } from "react";

/**
 * 📂 URL-hash collections.
 *
 * A collection is a NAMED list of saved object ids that the user can
 * share by URL. No accounts, no server — collections live in
 * `localStorage` under `uw:collections:v1`, and sharing a collection
 * means handing someone a base64url-encoded JSON blob in
 * `#collection=...`.
 *
 * Collections are intentionally distinct from {@link bookmarks} (saved
 * camera URLs) and the legacy SIMBAD favourites menu (sky-target
 * shortlist). They sit between the two: a *curated, named list* that
 * survives reorder and travels through the URL.
 */

export type CollectionItemType =
  | "body"
  | "dso"
  | "star"
  | "constellation"
  | "exotic";

export type CollectionItem = {
  type: CollectionItemType;
  /** Stable identifier the scene can fly back to (e.g. body name). */
  id: string;
  /** Display label — what the user sees in the list. */
  label: string;
};

export type Collection = {
  /** Short URL-safe slug, used as the React key. */
  id: string;
  name: string;
  items: CollectionItem[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "uw:collections:v1";
const MAX_COLLECTIONS = 50;
const MAX_ITEMS_PER_COLLECTION = 200;

function isItemType(s: unknown): s is CollectionItemType {
  return (
    s === "body" ||
    s === "dso" ||
    s === "star" ||
    s === "constellation" ||
    s === "exotic"
  );
}

function sanitizeItem(raw: unknown): CollectionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Partial<CollectionItem>;
  if (!isItemType(v.type)) return null;
  if (typeof v.id !== "string" || typeof v.label !== "string") return null;
  return {
    type: v.type,
    id: v.id.slice(0, 120),
    label: v.label.slice(0, 120),
  };
}

function sanitize(raw: unknown): Collection[] {
  if (!Array.isArray(raw)) return [];
  const out: Collection[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const v = r as Partial<Collection>;
    if (
      typeof v.id !== "string" ||
      typeof v.name !== "string" ||
      !Array.isArray(v.items) ||
      typeof v.createdAt !== "string" ||
      typeof v.updatedAt !== "string"
    ) {
      continue;
    }
    const items: CollectionItem[] = [];
    for (const it of v.items) {
      const clean = sanitizeItem(it);
      if (clean) items.push(clean);
    }
    out.push({
      id: v.id.slice(0, 32),
      name: v.name.slice(0, 80) || "Untitled",
      items: items.slice(0, MAX_ITEMS_PER_COLLECTION),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    });
  }
  return out.slice(0, MAX_COLLECTIONS);
}

function load(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

let current: Collection[] = load();
const listeners = new Set<(c: Collection[]) => void>();

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* quota / private mode */
  }
  for (const l of listeners) l(current);
}

function shortSlug(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function listCollections(): Collection[] {
  return current;
}

export function getCollection(id: string): Collection | null {
  return current.find((c) => c.id === id) ?? null;
}

export function createCollection(name: string): Collection {
  const trimmed = name.trim().slice(0, 80) || "Untitled";
  const c: Collection = {
    id: shortSlug(),
    name: trimmed,
    items: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  current = [c, ...current].slice(0, MAX_COLLECTIONS);
  persist();
  return c;
}

export function renameCollection(id: string, name: string): void {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return;
  current = current.map((c) =>
    c.id === id ? { ...c, name: trimmed, updatedAt: nowIso() } : c,
  );
  persist();
}

export function addToCollection(
  collectionId: string,
  item: CollectionItem,
): void {
  const clean = sanitizeItem(item);
  if (!clean) return;
  current = current.map((c) => {
    if (c.id !== collectionId) return c;
    if (c.items.some((it) => it.id === clean.id && it.type === clean.type)) {
      return c;
    }
    return {
      ...c,
      items: [...c.items, clean].slice(0, MAX_ITEMS_PER_COLLECTION),
      updatedAt: nowIso(),
    };
  });
  persist();
}

export function removeFromCollection(
  collectionId: string,
  itemId: string,
): void {
  current = current.map((c) =>
    c.id === collectionId
      ? {
          ...c,
          items: c.items.filter((it) => it.id !== itemId),
          updatedAt: nowIso(),
        }
      : c,
  );
  persist();
}

export function deleteCollection(id: string): void {
  current = current.filter((c) => c.id !== id);
  persist();
}

export function saveImportedCollection(c: Collection): Collection {
  // Re-id on import to avoid clobbering an existing collection
  // with the same slug. Preserve original name / items / createdAt.
  const fresh: Collection = {
    id: shortSlug(),
    name: c.name.slice(0, 80) || "Untitled",
    items: c.items
      .map(sanitizeItem)
      .filter((it): it is CollectionItem => it !== null)
      .slice(0, MAX_ITEMS_PER_COLLECTION),
    createdAt: c.createdAt,
    updatedAt: nowIso(),
  };
  current = [fresh, ...current].slice(0, MAX_COLLECTIONS);
  persist();
  return fresh;
}

// ---------- base64url encode / decode -----------------------------------

function toBase64Url(input: string): string {
  if (typeof window === "undefined") return "";
  // btoa handles ASCII; ensure UTF-8 safe via TextEncoder + chunked code points.
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)),
    );
  }
  const b64 = window.btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const binary = window.atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Encode a collection as a compact base64url JSON blob. The schema is
 * intentionally short-keyed so URLs stay well under 2 KB — a 50-item
 * collection lands around 1.6 KB.
 */
export function encodeCollection(c: Collection): string {
  const compact = {
    n: c.name,
    i: c.items.map((it) => [it.type, it.id, it.label]),
    c: c.createdAt,
    u: c.updatedAt,
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeCollection(s: string): Collection | null {
  const json = fromBase64Url(s);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const v = parsed as {
    n?: unknown;
    i?: unknown;
    c?: unknown;
    u?: unknown;
  };
  if (typeof v.n !== "string" || !Array.isArray(v.i)) return null;
  const items: CollectionItem[] = [];
  for (const tup of v.i) {
    if (!Array.isArray(tup) || tup.length < 3) continue;
    const [type, id, label] = tup;
    const clean = sanitizeItem({ type, id, label });
    if (clean) items.push(clean);
  }
  const createdAt = typeof v.c === "string" ? v.c : nowIso();
  const updatedAt = typeof v.u === "string" ? v.u : createdAt;
  return {
    id: shortSlug(),
    name: v.n.slice(0, 80) || "Untitled",
    items,
    createdAt,
    updatedAt,
  };
}

/** Read `#collection=...` from the current URL hash, if present. */
export function readCollectionFromHash(): Collection | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  // Hash may look like `#viewer&collection=...` or `#collection=...`.
  const match = hash.match(/(?:^#|[#&?])collection=([^&]+)/);
  if (!match || !match[1]) return null;
  try {
    return decodeCollection(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/** React hook returning the current live collections list. */
export function useCollections(): Collection[] {
  const [list, setList] = useState<Collection[]>(current);
  useEffect(() => {
    const cb = (c: Collection[]) => setList(c);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return list;
}

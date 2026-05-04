/**
 * Personal favorites — a localStorage-backed list of "saved" sky objects.
 *
 * Schema: an array of records, newest-first, capped at 50 to keep
 * localStorage quota friendly. Each record stores the bare minimum so we
 * can render a chip and fly the camera back without re-asking SIMBAD.
 */

const STORAGE_KEY = "uw:favorites";
const MAX_FAVORITES = 50;

export type Favorite = {
  id: string; // hash of name+ra+dec — stable across reloads
  name: string;
  type: string;
  raDeg: number;
  decDeg: number;
  /** ISO timestamp when saved. */
  savedAt: string;
  /** Free-form note the user can attach later (Day 22+ — currently empty). */
  note?: string;
};

function makeId(name: string, raDeg: number, decDeg: number): string {
  return `${name.toLowerCase().replace(/\s+/g, "_")}@${raDeg.toFixed(2)}_${decDeg.toFixed(2)}`;
}

export function readFavorites(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(isFavorite);
  } catch {
    return [];
  }
}

export function saveFavorite(
  input: Omit<Favorite, "id" | "savedAt">,
): Favorite {
  const fav: Favorite = {
    ...input,
    id: makeId(input.name, input.raDeg, input.decDeg),
    savedAt: new Date().toISOString(),
  };
  const list = readFavorites().filter((f) => f.id !== fav.id);
  list.unshift(fav);
  if (list.length > MAX_FAVORITES) list.length = MAX_FAVORITES;
  writeFavorites(list);
  return fav;
}

export function removeFavorite(id: string): void {
  const list = readFavorites().filter((f) => f.id !== id);
  writeFavorites(list);
}

export function isFavorited(
  name: string,
  raDeg: number,
  decDeg: number,
): boolean {
  const id = makeId(name, raDeg, decDeg);
  return readFavorites().some((f) => f.id === id);
}

function writeFavorites(list: Favorite[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / privacy mode
  }
}

function isFavorite(v: unknown): v is Favorite {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<Favorite>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.raDeg === "number" &&
    typeof o.decDeg === "number" &&
    typeof o.savedAt === "string"
  );
}

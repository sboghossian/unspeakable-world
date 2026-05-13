/**
 * 📒 Observation log — localStorage CRUD store.
 *
 * No accounts, no upload, no sync. Each browser keeps its own log under
 * a single localStorage key. Backups go through the panel's
 * "Export JSON" / "Import JSON" buttons.
 *
 * Notes on history-vs-Dexie: we already use Dexie for collections /
 * snapshots elsewhere, but observation log entries are small (KB-scale)
 * and infrequent (a few per night max). Keeping them in localStorage
 * avoids the async-init dance and means the data lives in the same
 * bag as `uw:extra-layers:v1`, `uw:atel-layer:v1`, etc.
 */

const STORAGE_KEY = "uw:obs-log:v1";

export type ObservationSeeing = 1 | 2 | 3 | 4 | 5;

export type Observation = {
  /** UUIDv4-ish identifier; unique within this browser. */
  id: string;
  /** Free text or SIMBAD id. Required. */
  target_name: string;
  /** Right ascension, J2000 decimal degrees. */
  ra_deg: number;
  /** Declination, J2000 decimal degrees. */
  dec_deg: number;
  /** ISO 8601 observation timestamp. */
  date: string;
  /** Free text (city / Bortle site / lat-lon). */
  location?: string;
  /** Free text (e.g. "10\" Dobsonian"). */
  telescope?: string;
  /** Eyepiece. */
  eyepiece?: string;
  /** Antoniadi 1-5. */
  seeing?: ObservationSeeing;
  /** Antoniadi-like transparency 1-5. */
  transparency?: ObservationSeeing;
  /** Markdown-friendly notes. */
  notes?: string;
  /** Optional astrophoto URL (user uploads or pastes). */
  photo_url?: string;
  /** Created-at ISO timestamp. */
  created_at: string;
};

type Subscriber = (list: ReadonlyArray<Observation>) => void;
const subscribers = new Set<Subscriber>();

function notify(list: ReadonlyArray<Observation>): void {
  subscribers.forEach((fn) => {
    try {
      fn(list);
    } catch {
      // ignore — never let a panel crash break the store
    }
  });
}

function readStorage(): Observation[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isObservation);
  } catch {
    return [];
  }
}

function writeStorage(list: ReadonlyArray<Observation>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota / privacy mode — silent
  }
}

export function isObservation(v: unknown): v is Observation {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.target_name === "string" &&
    typeof o.ra_deg === "number" &&
    typeof o.dec_deg === "number" &&
    typeof o.date === "string" &&
    typeof o.created_at === "string"
  );
}

export function listObservations(): Observation[] {
  return readStorage().slice().sort((a, b) => b.date.localeCompare(a.date));
}

export function getObservation(id: string): Observation | null {
  return readStorage().find((o) => o.id === id) ?? null;
}

export function uuid(): string {
  // Prefer the platform crypto.randomUUID where available. Falls back
  // to a reasonably-unique random-hex string (no security claims — this
  // is just a local primary key).
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(16).slice(2, 10);
  const time = Date.now().toString(16);
  return `${time}-${rand}`;
}

export function addObservation(
  input: Omit<Observation, "id" | "created_at"> & { id?: string; created_at?: string },
): Observation {
  const list = readStorage();
  const obs: Observation = {
    id: input.id ?? uuid(),
    target_name: input.target_name,
    ra_deg: input.ra_deg,
    dec_deg: input.dec_deg,
    date: input.date,
    location: input.location,
    telescope: input.telescope,
    eyepiece: input.eyepiece,
    seeing: input.seeing,
    transparency: input.transparency,
    notes: input.notes,
    photo_url: input.photo_url,
    created_at: input.created_at ?? new Date().toISOString(),
  };
  const next = [obs, ...list.filter((o) => o.id !== obs.id)];
  writeStorage(next);
  notify(next);
  return obs;
}

export function updateObservation(
  id: string,
  patch: Partial<Omit<Observation, "id" | "created_at">>,
): Observation | null {
  const list = readStorage();
  const idx = list.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const existing = list[idx];
  if (!existing) return null;
  const updated: Observation = { ...existing, ...patch };
  const next = [...list];
  next[idx] = updated;
  writeStorage(next);
  notify(next);
  return updated;
}

export function deleteObservation(id: string): boolean {
  const list = readStorage();
  const next = list.filter((o) => o.id !== id);
  if (next.length === list.length) return false;
  writeStorage(next);
  notify(next);
  return true;
}

export function subscribe(cb: Subscriber): () => void {
  subscribers.add(cb);
  try {
    cb(listObservations());
  } catch {
    // ignore
  }
  return () => {
    subscribers.delete(cb);
  };
}

export function exportJson(): string {
  return JSON.stringify(listObservations(), null, 2);
}

export function importJson(json: string, mode: "merge" | "replace" = "merge"): {
  imported: number;
  skipped: number;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { imported: 0, skipped: 0 };
  }
  if (!Array.isArray(parsed)) return { imported: 0, skipped: 0 };
  const incoming = parsed.filter(isObservation);
  const skipped = parsed.length - incoming.length;
  if (mode === "replace") {
    writeStorage(incoming);
    notify(incoming);
    return { imported: incoming.length, skipped };
  }
  // Merge: prefer existing entries on id collision.
  const existing = readStorage();
  const seen = new Set(existing.map((o) => o.id));
  const merged = existing.slice();
  for (const o of incoming) {
    if (seen.has(o.id)) continue;
    merged.push(o);
    seen.add(o.id);
  }
  writeStorage(merged);
  notify(merged);
  return { imported: merged.length - existing.length, skipped };
}

/** CSV export — flat schema, one observation per row. */
export function exportCsv(): string {
  const list = listObservations();
  const headers = [
    "id",
    "target_name",
    "ra_deg",
    "dec_deg",
    "date",
    "location",
    "telescope",
    "eyepiece",
    "seeing",
    "transparency",
    "notes",
    "photo_url",
    "created_at",
  ];
  const rows = list.map((o) =>
    headers.map((h) => csvEscape(toCsvField((o as Record<string, unknown>)[h]))),
  );
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function toCsvField(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

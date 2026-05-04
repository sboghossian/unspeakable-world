/**
 * Best-effort IndexedDB cache.
 *
 * Wraps a single versioned database (`uw-cache`) with named object stores,
 * each keyed by string. Every value is wrapped in `{ v, exp }` so we can
 * enforce TTL on read.
 *
 * If IndexedDB is unavailable (private mode, Safari quirks, server-side),
 * every method resolves to a no-op equivalent — `get` returns `null`,
 * `put` resolves silently. Callers must always treat the cache as a hint
 * and fall through to the network.
 */
const DB_NAME = "uw-cache";
const DB_VERSION = 1;

const STORES = [
  "simbad",
  "wikipedia",
  "ads",
  "imagery",
  "pulsars",
  "exoplanets",
] as const;

export type CacheStore = (typeof STORES)[number];

type Envelope<T> = { v: T; exp: number | null };

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
): IDBObjectStore | null {
  if (!db.objectStoreNames.contains(store)) return null;
  try {
    return db.transaction(store, mode).objectStore(store);
  } catch {
    return null;
  }
}

async function get<T>(store: CacheStore, key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const os = tx(db, store, "readonly");
    if (!os) return resolve(null);
    const req = os.get(key);
    req.onsuccess = () => {
      const env = req.result as Envelope<T> | undefined;
      if (!env) return resolve(null);
      if (env.exp !== null && env.exp < Date.now()) return resolve(null);
      resolve(env.v);
    };
    req.onerror = () => resolve(null);
  });
}

async function put<T>(
  store: CacheStore,
  key: string,
  value: T,
  ttlSec?: number,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const os = tx(db, store, "readwrite");
    if (!os) return resolve();
    const env: Envelope<T> = {
      v: value,
      exp: ttlSec && ttlSec > 0 ? Date.now() + ttlSec * 1000 : null,
    };
    const req = os.put(env, key);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

async function clear(store: CacheStore): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const os = tx(db, store, "readwrite");
    if (!os) return resolve();
    const req = os.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

async function clearAll(): Promise<void> {
  const db = await openDb();
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    dbPromise = null;
  }
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.deleteDatabase(DB_NAME);
    } catch {
      return resolve();
    }
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

export const idb = { get, put, clear, clearAll };

/**
 * Read-through JSON fetcher for static catalog bundles (pulsars, exoplanets,
 * etc). Caches the parsed value in `store` keyed by `url`. In production
 * builds the URL is appended with the build-mode marker so callers can bust
 * the cache via Vite asset versioning when they need to.
 *
 * Returns the live network value if IDB is unavailable.
 */
export async function fetchCatalogJson<T>(
  store: CacheStore,
  url: string,
): Promise<T> {
  const isProd = import.meta.env.MODE === "production";
  const fetchUrl = isProd ? `${url}?v=${import.meta.env.MODE}` : url;
  const cacheKey = url;
  const cached = await idb.get<T>(store, cacheKey);
  if (cached !== null) return cached;
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`${store} HTTP ${res.status}`);
  const data = (await res.json()) as T;
  // No TTL — catalog bundles are bake-time artifacts; bust on `?v=` change
  // by resetting the IDB store (Settings → Clear local cache).
  await idb.put(store, cacheKey, data);
  return data;
}

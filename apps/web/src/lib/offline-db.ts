/**
 * Offline catalog DB — Dexie-backed IndexedDB store for the viewer's
 * static reference data (named stars, galaxies, DSO/Messier objects,
 * user bookmarks, spacecraft API caches).
 *
 * Why: the in-memory {@link SearchIndex} hot-loads three JSON files at
 * mount and rebuilds its array on every search. That's fast enough for
 * the ~1.3k named entries, but once we let it reach into Gaia-1M or
 * the 15k-row Cosmicflows-4 catalog it starts to feel laggy on
 * mid-range phones. Dexie lets us push that work into IndexedDB and
 * query just what we need.
 *
 * Backward-compat: the in-memory `SearchIndex` keeps working. This
 * module is *opt-in* — `offline-search.ts` reads from Dexie when
 * `isOfflineDbReady()`, otherwise it falls back to the in-memory
 * index. Private-browsing / no-quota users see no regression.
 *
 * Quota: a single seed of the bundled JSON files runs ~3 MB after
 * Dexie's overhead. We don't store the .bin payloads here — those
 * stay in their dedicated chunked GPU upload path. The browser's
 * default origin quota (usually ~10% of disk, but as low as ~10 MB
 * on iOS WebKit private mode) covers us comfortably; we still defend
 * against `QuotaExceededError` with a graceful fallback marker.
 */
import Dexie, { type Table } from "dexie";
import { log } from "./logger";

// ────────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────────

/** A named bright star (HYG-derived). */
export type StarRow = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  mag: number;
};

/** A galaxy / galaxy group (Cosmicflows-derived). */
export type GalaxyRow = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  redshift?: number;
};

/** Catch-all for DSO + Messier objects. */
export type ObjectRow = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  type: string;
};

/** A user bookmark mirror — primary store is still localStorage; this
 *  is a Dexie copy so search can match on bookmark labels alongside
 *  catalog objects. */
export type BookmarkRow = {
  id: string;
  created_at: number;
  label: string;
};

/** A blob cache for spacecraft API responses (NASA Eyes, etc.). */
export type SpacecraftCacheRow = {
  slug: string;
  fetched_at: number;
  payload: unknown;
};

/** Local Dexie subclass — explicit so TypeScript can infer Table<T> on
 *  `.stars`, `.galaxies`, etc. */
class OfflineDb extends Dexie {
  stars!: Table<StarRow, string>;
  galaxies!: Table<GalaxyRow, string>;
  objects!: Table<ObjectRow, string>;
  bookmarks!: Table<BookmarkRow, string>;
  spacecraft_cache!: Table<SpacecraftCacheRow, string>;

  constructor() {
    super("uw-offline");
    // v1 — additive only; bump and add a new version for any schema
    // change (Dexie chains them).
    this.version(1).stores({
      stars: "id, ra, dec, mag, name",
      galaxies: "id, ra, dec, redshift, name",
      objects: "id, ra, dec, type, name",
      bookmarks: "id, created_at, label",
      spacecraft_cache: "slug, fetched_at",
    });
  }
}

// Lazy singleton — only construct on first use so we don't open an
// IndexedDB handle during SSR / test environments that don't need it.
let dbInstance: OfflineDb | null = null;
let dbUnavailable = false;

const SEED_FLAG = "uw:offline-seeded:v1";

/**
 * Return the singleton DB, or null if IndexedDB is unavailable / has
 * been marked unusable in this session.
 */
export function getOfflineDb(): OfflineDb | null {
  if (dbUnavailable) return null;
  if (typeof indexedDB === "undefined") return null;
  if (!dbInstance) {
    try {
      dbInstance = new OfflineDb();
    } catch (err) {
      log.warn("[offline-db] init failed", err);
      dbUnavailable = true;
      return null;
    }
  }
  return dbInstance;
}

/** True only after `seedFromBundle()` has succeeded in some past session. */
export function isOfflineDbReady(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(SEED_FLAG) === "1";
}

/** Mark the seed as done. Idempotent. */
function markSeeded(): void {
  try {
    localStorage.setItem(SEED_FLAG, "1");
  } catch {
    /* quota / private mode — search still works without the flag */
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────

type RawNamedStar = { name: string; ra: number; dec: number; mag: number };
type RawDso = {
  name: string;
  ra: number;
  dec: number;
  type: string;
  mag: number | null;
  common: string | null;
  messier: boolean;
};
type CosmicflowsBundle = {
  attribution: string;
  count: number;
  data: number[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

/**
 * On first load, pull the bundled JSON catalogs from `/data/*` and
 * push them into Dexie. Idempotent: marks `uw:offline-seeded:v1` so
 * subsequent sessions skip the work.
 *
 * Galaxies come from the packed Cosmicflows-4 array (3-component
 * supergalactic coords flattened — see `bake-cosmicflows4.ts`). We
 * store only the index + name + projected RA/Dec; the full vector
 * stays in the binary file.
 */
export async function seedFromBundle(): Promise<boolean> {
  const db = getOfflineDb();
  if (!db) return false;
  if (isOfflineDbReady()) return true;

  try {
    const [namedStars, dsos, galaxiesBundle] = await Promise.all([
      fetchJson<RawNamedStar[]>("/data/hyg-named.json"),
      fetchJson<RawDso[]>("/data/dso.json"),
      fetchJson<CosmicflowsBundle>("/data/cosmicflows4.json").catch(
        () => null,
      ),
    ]);

    const starRows: StarRow[] = namedStars
      .filter((s) => Number.isFinite(s.ra) && Number.isFinite(s.dec))
      .map((s) => ({
        id: `star:${s.name}`,
        name: s.name,
        ra: s.ra,
        dec: s.dec,
        mag: s.mag,
      }));

    const objectRows: ObjectRow[] = dsos
      .filter((d) => Number.isFinite(d.ra) && Number.isFinite(d.dec))
      .map((d) => ({
        id: `dso:${d.name}`,
        name: d.common && d.common !== d.name ? `${d.name} (${d.common})` : d.name,
        ra: d.ra,
        dec: d.dec,
        type: d.type,
      }));

    // Galaxies bundle is a flat number[] of SGX,SGY,SGZ triples — we
    // don't have per-row names. Synthesize "CF4-#" labels so they're
    // queryable. RA/Dec is computed from SG vector projected to
    // equatorial via a coarse rotation — close enough for the
    // proximity search; the precise vector lives in the .bin path.
    const galaxyRows: GalaxyRow[] = [];
    if (galaxiesBundle && Array.isArray(galaxiesBundle.data)) {
      const data = galaxiesBundle.data;
      for (let i = 0; i + 2 < data.length; i += 3) {
        const sx = data[i] ?? 0;
        const sy = data[i + 1] ?? 0;
        const sz = data[i + 2] ?? 0;
        const r = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (r < 1e-6) continue;
        // Project to RA/Dec in the supergalactic frame; downstream
        // search treats this as "good enough for cone matches" only.
        const dec = (Math.asin(sz / r) * 180) / Math.PI;
        const raRad = Math.atan2(sy, sx);
        const ra = ((raRad < 0 ? raRad + Math.PI * 2 : raRad) * 180) / Math.PI;
        const idx = i / 3;
        galaxyRows.push({
          id: `cf4:${idx}`,
          name: `CF4-${idx}`,
          ra,
          dec,
        });
      }
    }

    await db.transaction(
      "rw",
      db.stars,
      db.galaxies,
      db.objects,
      async () => {
        await db.stars.clear();
        await db.galaxies.clear();
        await db.objects.clear();
        if (starRows.length > 0) await db.stars.bulkAdd(starRows);
        if (galaxyRows.length > 0) await db.galaxies.bulkAdd(galaxyRows);
        if (objectRows.length > 0) await db.objects.bulkAdd(objectRows);
      },
    );
    markSeeded();
    log.info(
      "[offline-db] seeded",
      starRows.length,
      "stars,",
      galaxyRows.length,
      "galaxies,",
      objectRows.length,
      "objects",
    );
    return true;
  } catch (err) {
    log.warn("[offline-db] seed failed — falling back to in-memory", err);
    // Soft-fail: caller will keep using the in-memory index.
    dbUnavailable = true;
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────────────

/** A unified hit shape returned by both `queryNear` and `lookupByName`. */
export type CatalogHit = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  kind: "star" | "galaxy" | "object" | "bookmark";
  /** Angular distance from query (deg). Only populated by `queryNear`. */
  distanceDeg?: number;
};

/** Convert (RA, Dec) in degrees to a Cartesian unit vector. */
function raDecUnit(raDeg: number, decDeg: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const c = Math.cos(dec);
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)];
}

/** Angular distance (deg) between two (RA, Dec) points. */
function angularDistanceDeg(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number,
): number {
  const [x1, y1, z1] = raDecUnit(ra1, dec1);
  const [x2, y2, z2] = raDecUnit(ra2, dec2);
  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  return (Math.acos(dot) * 180) / Math.PI;
}

/**
 * Return all catalog entries within `radiusDeg` of `(ra, dec)`, sorted
 * by angular distance. Indexed pre-filter on the `dec` column keeps us
 * from scanning the full table; the angular check runs on the smaller
 * dec-band slice.
 *
 * Empty array when the DB is unavailable — caller should fall back.
 */
export async function queryNear(
  ra: number,
  dec: number,
  radiusDeg: number,
): Promise<CatalogHit[]> {
  const db = getOfflineDb();
  if (!db) return [];
  // Use a slightly inflated dec band so we never miss an entry within
  // `radiusDeg` along an RA line; cos(dec) handles wrap-around for
  // entries near the poles via the per-row angular re-check below.
  const decLo = dec - radiusDeg;
  const decHi = dec + radiusDeg;

  try {
    const [stars, galaxies, objects] = await Promise.all([
      db.stars.where("dec").between(decLo, decHi, true, true).toArray(),
      db.galaxies.where("dec").between(decLo, decHi, true, true).toArray(),
      db.objects.where("dec").between(decLo, decHi, true, true).toArray(),
    ]);

    const out: CatalogHit[] = [];
    const pushIfWithin = (
      row: { id: string; name: string; ra: number; dec: number },
      kind: CatalogHit["kind"],
    ): void => {
      const d = angularDistanceDeg(ra, dec, row.ra, row.dec);
      if (d <= radiusDeg) {
        out.push({ ...row, kind, distanceDeg: d });
      }
    };
    for (const s of stars) pushIfWithin(s, "star");
    for (const g of galaxies) pushIfWithin(g, "galaxy");
    for (const o of objects) pushIfWithin(o, "object");
    out.sort((a, b) => (a.distanceDeg ?? 0) - (b.distanceDeg ?? 0));
    return out;
  } catch (err) {
    log.warn("[offline-db] queryNear failed", err);
    return [];
  }
}

/** Strip whitespace, hyphens, underscores → "M31" / "M 31" / "M-31" collapse. */
function normalizeCatalogToken(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "").replace(/[-_]/g, "");
}

/**
 * Prefix + fuzzy(ish) name lookup. Up to `limit` hits, ranked:
 *  1. exact match
 *  2. prefix match
 *  3. substring match
 *  4. normalized (catalog-collapse) prefix
 *
 * Returns an empty array if the DB isn't ready.
 */
export async function lookupByName(
  query: string,
  limit = 12,
): Promise<CatalogHit[]> {
  const q = query.trim();
  if (!q) return [];
  const db = getOfflineDb();
  if (!db) return [];
  const lower = q.toLowerCase();
  const norm = normalizeCatalogToken(lower);

  try {
    // Dexie startsWithIgnoreCase is index-backed — much faster than
    // toArray()+filter() for the 1k+ row tables.
    const [starPrefix, galaxyPrefix, objectPrefix] = await Promise.all([
      db.stars.where("name").startsWithIgnoreCase(q).limit(limit).toArray(),
      db.galaxies.where("name").startsWithIgnoreCase(q).limit(limit).toArray(),
      db.objects.where("name").startsWithIgnoreCase(q).limit(limit).toArray(),
    ]);

    type Scored = { hit: CatalogHit; score: number };
    const scored: Scored[] = [];
    const score = (name: string): number => {
      const n = name.toLowerCase();
      if (n === lower) return 1000;
      if (n.startsWith(lower)) return 200 + (lower.length / n.length) * 50;
      if (n.includes(lower)) return 50 + (lower.length / n.length) * 20;
      const nn = normalizeCatalogToken(n);
      if (nn.startsWith(norm)) return 120 + (norm.length / nn.length) * 30;
      if (nn.includes(norm)) return 30 + (norm.length / nn.length) * 10;
      return 0;
    };
    for (const s of starPrefix) {
      const sc = score(s.name);
      if (sc > 0)
        scored.push({
          hit: {
            id: s.id,
            name: s.name,
            ra: s.ra,
            dec: s.dec,
            kind: "star",
          },
          score: sc,
        });
    }
    for (const g of galaxyPrefix) {
      const sc = score(g.name);
      if (sc > 0)
        scored.push({
          hit: {
            id: g.id,
            name: g.name,
            ra: g.ra,
            dec: g.dec,
            kind: "galaxy",
          },
          score: sc,
        });
    }
    for (const o of objectPrefix) {
      const sc = score(o.name);
      if (sc > 0)
        scored.push({
          hit: {
            id: o.id,
            name: o.name,
            ra: o.ra,
            dec: o.dec,
            kind: "object",
          },
          score: sc,
        });
    }

    // Catalog-token fallback — only if the index prefix path gave us
    // less than half the limit. Pulls a small extra slice and runs
    // the normalized scorer on it.
    if (scored.length < Math.floor(limit / 2) && norm.length >= 2) {
      const extra = await Promise.all([
        db.stars.limit(500).toArray(),
        db.galaxies.limit(500).toArray(),
        db.objects.limit(500).toArray(),
      ]);
      const seen = new Set(scored.map((s) => s.hit.id));
      const kinds: CatalogHit["kind"][] = ["star", "galaxy", "object"];
      extra.forEach((rows, idx) => {
        const kind = kinds[idx];
        if (!kind) return;
        for (const r of rows) {
          if (seen.has(r.id)) continue;
          const sc = score(r.name);
          if (sc > 0) {
            scored.push({
              hit: {
                id: r.id,
                name: r.name,
                ra: r.ra,
                dec: r.dec,
                kind,
              },
              score: sc,
            });
            seen.add(r.id);
          }
        }
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.hit);
  } catch (err) {
    log.warn("[offline-db] lookupByName failed", err);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────
// Bookmark mirror + spacecraft cache (small helpers)
// ────────────────────────────────────────────────────────────────────

export async function upsertBookmark(row: BookmarkRow): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.bookmarks.put(row);
  } catch (err) {
    log.warn("[offline-db] upsertBookmark failed", err);
  }
}

export async function getSpacecraftCache(
  slug: string,
): Promise<SpacecraftCacheRow | null> {
  const db = getOfflineDb();
  if (!db) return null;
  try {
    return (await db.spacecraft_cache.get(slug)) ?? null;
  } catch (err) {
    log.warn("[offline-db] getSpacecraftCache failed", err);
    return null;
  }
}

export async function putSpacecraftCache(
  row: SpacecraftCacheRow,
): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;
  try {
    await db.spacecraft_cache.put(row);
  } catch (err) {
    log.warn("[offline-db] putSpacecraftCache failed", err);
  }
}

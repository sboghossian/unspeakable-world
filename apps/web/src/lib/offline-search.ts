/**
 * Offline-aware search facade.
 *
 * Wraps {@link SearchIndex} (in-memory, already loaded by the viewer)
 * with an opt-in Dexie path. Callers ask `searchAny(query)` and we
 * decide which backend serves them:
 *
 *   - If {@link isOfflineDbReady} is true → query Dexie first
 *     (`lookupByName`), merge with anything the in-memory index has
 *     for dynamic entries (planets, ISS), and return.
 *   - Otherwise → in-memory only.
 *
 * The in-memory `SearchIndex` is intentionally left untouched in
 * `viewer/search/search-index.ts` — this facade is additive. If Dexie
 * fails at any step (quota, transaction abort, etc.) we transparently
 * fall back, never throwing into the search bar.
 */
import { Vector3 } from "three";
import {
  isOfflineDbReady,
  lookupByName,
  queryNear,
  seedFromBundle,
  type CatalogHit,
} from "./offline-db";
import type { SearchEntry, SearchIndex } from "../viewer/search/search-index";
import { log } from "./logger";

export type SearchBackend = "dexie" | "memory" | "hybrid";

/** Map a Dexie {@link CatalogHit} into the project's existing
 *  {@link SearchEntry} shape so the search bar UI doesn't have to
 *  branch on backend. */
function hitToEntry(hit: CatalogHit): SearchEntry {
  const kindMap: Record<CatalogHit["kind"], SearchEntry["kind"]> = {
    star: "star",
    galaxy: "dso",
    object: "dso",
    // Bookmarks don't have a true sky direction — surface as a "constellation"-
    // shaped entry so the search bar at least shows them; the row's `direction`
    // will be a unit-X placeholder.
    bookmark: "constellation",
  };
  // Mirrors `celestialToWorld` in search-index.ts: take RA/Dec → Z-up
  // → rotate to Y-up world. We compute Cartesian inline (avoids a
  // dependency on `raDecToVec3`, which has its own coordinate library
  // gravity well).
  const ra = (hit.ra * Math.PI) / 180;
  const dec = (hit.dec * Math.PI) / 180;
  const c = Math.cos(dec);
  const xZ = c * Math.cos(ra);
  const yZ = c * Math.sin(ra);
  const zZ = Math.sin(dec);
  // map (x, y, z)_z-up → (x, z, -y) y-up — same rotation search-index.ts uses
  const direction = new Vector3(xZ, zZ, -yZ).normalize();
  return {
    id: hit.id,
    label: hit.name,
    kind: kindMap[hit.kind] ?? "dso",
    detail: detailFor(hit),
    direction,
    raDeg: hit.ra,
    decDeg: hit.dec,
  };
}

function detailFor(hit: CatalogHit): string {
  switch (hit.kind) {
    case "star":
      return "star";
    case "galaxy":
      return "galaxy (CF4)";
    case "object":
      return "deep-sky object";
    case "bookmark":
      return "bookmark";
  }
}

/**
 * Tries Dexie first when seeded; otherwise delegates to the in-memory
 * index. Always returns at least the in-memory results — Dexie hits
 * are merged in (deduped by `id`) so dynamic entries (planets, ISS)
 * don't disappear when the offline DB is active.
 */
export async function searchAny(
  query: string,
  inMemory: SearchIndex,
  limit = 12,
): Promise<{ backend: SearchBackend; results: SearchEntry[] }> {
  const memoryResults = inMemory.search(query, limit);

  if (!isOfflineDbReady()) {
    return { backend: "memory", results: memoryResults };
  }

  try {
    const hits = await lookupByName(query, limit);
    if (hits.length === 0) {
      return { backend: "hybrid", results: memoryResults };
    }
    const seen = new Set<string>();
    const merged: SearchEntry[] = [];
    // Dynamic entries (planets, ISS) live only in memory — surface
    // them first.
    for (const e of memoryResults) {
      if (e.kind === "planet" && !seen.has(e.id)) {
        merged.push(e);
        seen.add(e.id);
      }
    }
    for (const h of hits) {
      if (seen.has(h.id)) continue;
      merged.push(hitToEntry(h));
      seen.add(h.id);
    }
    // Top up from memory results if Dexie was sparse.
    for (const e of memoryResults) {
      if (merged.length >= limit) break;
      if (seen.has(e.id)) continue;
      merged.push(e);
      seen.add(e.id);
    }
    return { backend: "hybrid", results: merged.slice(0, limit) };
  } catch (err) {
    log.warn("[offline-search] dexie path failed, using memory only", err);
    return { backend: "memory", results: memoryResults };
  }
}

/**
 * Cone search around a sky point. The in-memory index doesn't expose
 * this directly (it's a label-only matcher), so we always go through
 * Dexie. Empty array if the DB isn't ready.
 */
export async function searchNear(
  raDeg: number,
  decDeg: number,
  radiusDeg: number,
): Promise<CatalogHit[]> {
  if (!isOfflineDbReady()) return [];
  return queryNear(raDeg, decDeg, radiusDeg);
}

/**
 * Fire-and-forget seed kick. Safe to call on every viewer mount —
 * `seedFromBundle` is idempotent and bails on the `uw:offline-seeded:v1`
 * flag.
 */
export function kickOfflineSeed(): void {
  if (typeof window === "undefined") return;
  if (isOfflineDbReady()) return;
  // Defer to idle so we don't fight the initial render budget.
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void) => void;
  };
  const run = (): void => {
    seedFromBundle().catch((err) =>
      log.warn("[offline-search] seed kick failed", err),
    );
  };
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(run);
  } else {
    window.setTimeout(run, 1200);
  }
}

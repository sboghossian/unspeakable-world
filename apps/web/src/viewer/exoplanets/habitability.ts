/**
 * 🌍 PHL Habitable Worlds Catalog loader.
 *
 * Source: Planetary Habitability Laboratory @ UPR Arecibo — CC-BY 4.0.
 * Compatible with both the upstream CSV-derived dump and our curated
 * fallback (see scripts/bake-phl-hwc.ts).
 *
 * Public surface:
 *   - HabitabilityRecord    per-planet record (ESI + HZD/HZC/HZA + class)
 *   - HabitabilityIndex     planet-name + host-name keyed maps
 *   - loadHabitability(url) read-through cached fetch + index build
 *   - merge(entries, idx)   in-place ESI augmentation on ExoplanetEntry[]
 *
 * Designed to fail silently — if the catalogue can't be loaded the
 * viewer keeps rendering, habitability mode just shows neutral colours.
 */

import { fetchCatalogJson } from "../../lib/idb-cache";
import { log } from "../../lib/logger";

export type HabitabilityRecord = {
  name: string;
  host: string;
  /** Earth Similarity Index, 0..1; 1 = Earth-identical. */
  esi: number | null;
  /** Habitable Zone Distance, dimensionless: <0 inner edge, 0 = center, >0 outer. */
  hzd: number | null;
  /** Habitable Zone Composition (rocky vs gaseous proxy). */
  hzc: number | null;
  /** Habitable Zone Atmosphere (mass retention proxy). */
  hza: number | null;
  /** PHL thermal/mass class string, e.g. "Warm Terran". */
  class: string | null;
};

export type HabitabilityPayload = {
  version: string;
  source?: string;
  attribution: string;
  count: number;
  entries: HabitabilityRecord[];
};

export type HabitabilityIndex = {
  attribution: string;
  byName: Map<string, HabitabilityRecord>;
  byHost: Map<string, HabitabilityRecord>;
};

const EMPTY: HabitabilityIndex = {
  attribution:
    "Planetary Habitability Laboratory @ UPR Arecibo · CC-BY 4.0 (not loaded)",
  byName: new Map(),
  byHost: new Map(),
};

/** Normalise a planet/host string for fuzzy matching across catalogues. */
function key(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Fetch + IDB-cache the baked PHL JSON, build name/host indices. Falls
 * back to an empty index on any failure.
 */
export async function loadHabitability(
  url = "/data/phl-hwc.json",
): Promise<HabitabilityIndex> {
  try {
    const payload = await fetchCatalogJson<HabitabilityPayload>(
      "exoplanets",
      url,
    );
    if (!payload || !Array.isArray(payload.entries)) return EMPTY;
    const byName = new Map<string, HabitabilityRecord>();
    const byHost = new Map<string, HabitabilityRecord>();
    for (const e of payload.entries) {
      if (!e || typeof e.name !== "string") continue;
      byName.set(key(e.name), e);
      // Keep the highest-ESI record per host (the best inhabitant).
      const existing = byHost.get(key(e.host));
      const curEsi = e.esi ?? -1;
      const prevEsi = existing?.esi ?? -1;
      if (!existing || curEsi > prevEsi) byHost.set(key(e.host), e);
    }
    return {
      attribution: payload.attribution,
      byName,
      byHost,
    };
  } catch (err) {
    log.warn("[exoplanets/habitability]", "load failed", err);
    return EMPTY;
  }
}

/** Look up by planet name first, then fall back to host. */
export function lookup(
  idx: HabitabilityIndex,
  planet: string,
  host: string,
): HabitabilityRecord | null {
  return (
    idx.byName.get(key(planet)) ?? idx.byHost.get(key(host)) ?? null
  );
}

/**
 * Map ESI [0..1] → RGB triple in linear sRGB.
 *
 * Palette: dim red (uninhabitable) → orange → yellow-green → cyan-green
 * (Earth-like). Returns a neutral grey for `null` so unranked planets
 * still render but don't pretend to be habitable.
 */
export function esiToRgb(esi: number | null): [number, number, number] {
  if (esi === null || !Number.isFinite(esi)) return [0.35, 0.35, 0.4];
  const t = Math.max(0, Math.min(1, esi));
  // 4-stop interpolation
  if (t < 0.33) {
    const u = t / 0.33;
    return [0.55 + 0.35 * u, 0.18 + 0.4 * u, 0.18 + 0.05 * u];
  } else if (t < 0.66) {
    const u = (t - 0.33) / 0.33;
    return [0.9 - 0.4 * u, 0.58 + 0.32 * u, 0.23 + 0.07 * u];
  } else {
    const u = (t - 0.66) / 0.34;
    return [0.5 - 0.2 * u, 0.9 - 0.05 * u, 0.3 + 0.45 * u];
  }
}

import { Vector3 } from "three";
import { raDecToVec3 } from "../stars/coords";
import { aliasForMessier } from "../info/aliases";

/**
 * Local search index for the viewer's known objects:
 * - 9 solar bodies (Sun, Moon, 8 planets, ISS)
 * - 314 named bright stars from HYG (Sirius, Vega, Polaris, …)
 * - 879 deep-sky objects (Messier + bright NGC/IC) — by Messier name + common name
 * - 88 IAU constellations — by 3-letter ID + centroid of their line vertices
 *
 * Total ~1,300 entries — small enough to substring-match without a fuzzy lib.
 */

export type SearchKind = "planet" | "star" | "dso" | "constellation";

export type SearchEntry = {
  id: string;
  label: string;
  kind: SearchKind;
  /** Sub-label shown in the dropdown next to the main label. */
  detail: string;
  /** World-Y-up unit direction the camera should fly to. */
  direction: Vector3;
  /** Optional: tuck additional info for the result row. */
  mag?: number | null;
};

type NamedStar = { name: string; ra: number; dec: number; mag: number };
type Dso = {
  name: string;
  ra: number;
  dec: number;
  type: string;
  mag: number | null;
  common: string | null;
  messier: boolean;
};
type ConstellationLineFeature = {
  id: string;
  geometry: { type: "MultiLineString"; coordinates: number[][][] };
};
type LineCollection = {
  features: ConstellationLineFeature[];
};

const PLANET_BODIES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
] as const;

/** Convert celestial Y-up direction (the rotation our astronomy groups apply). */
function celestialToWorld(raDeg: number, decDeg: number): Vector3 {
  const [x, y, z] = raDecToVec3(raDeg, decDeg, 1);
  // raDecToVec3 returns Z-up; rotation.x = -π/2 maps (x, y, z) → (x, z, -y).
  return new Vector3(x, z, -y).normalize();
}

export class SearchIndex {
  private entries: SearchEntry[] = [];
  private dynamicProvider: (() => SearchEntry[]) | null = null;

  /**
   * Set a callback that returns runtime-changing entries (e.g. ISS, planets).
   * Solar bodies move with simulation time, so we re-query them each search.
   */
  setDynamicProvider(provider: () => SearchEntry[]): void {
    this.dynamicProvider = provider;
  }

  async loadStaticCatalogs(): Promise<void> {
    const [namedStars, dsos, constellations] = await Promise.all([
      fetchJson<NamedStar[]>("/data/hyg-named.json"),
      fetchJson<Dso[]>("/data/dso.json"),
      fetchJson<LineCollection>("/data/constellations.lines.json"),
    ]);

    for (const s of namedStars) {
      this.entries.push({
        id: `star:${s.name}`,
        label: s.name,
        kind: "star",
        detail: `mag ${s.mag.toFixed(1)} · star`,
        direction: celestialToWorld(s.ra, s.dec),
        mag: s.mag,
      });
    }

    for (const d of dsos) {
      const detail = [
        d.messier ? "Messier" : "NGC/IC",
        d.type,
        d.mag !== null ? `mag ${d.mag.toFixed(1)}` : null,
        d.common && d.common !== d.name ? d.common : null,
      ]
        .filter(Boolean)
        .join(" · ");
      this.entries.push({
        id: `dso:${d.name}`,
        label: d.name,
        kind: "dso",
        detail,
        direction: celestialToWorld(d.ra, d.dec),
        mag: d.mag,
      });
      // Common-name alias (e.g. "Andromeda Galaxy" → M31)
      if (d.common && d.common !== d.name) {
        this.entries.push({
          id: `dso:${d.name}:common`,
          label: d.common,
          kind: "dso",
          detail: `${d.name} · ${d.type}`,
          direction: celestialToWorld(d.ra, d.dec),
          mag: d.mag,
        });
      }
      // Curated famous-name alias (e.g. "Crab Nebula" → M1, "Pleiades" → M45)
      const famous = aliasForMessier(d.name);
      if (famous && famous !== d.name && famous !== d.common) {
        this.entries.push({
          id: `dso:${d.name}:alias`,
          label: famous,
          kind: "dso",
          detail: `${d.name} · ${d.type}`,
          direction: celestialToWorld(d.ra, d.dec),
          mag: d.mag,
        });
      }
    }

    for (const f of constellations.features) {
      // Centroid: average of all line-vertex (RA, Dec) pairs.
      let sumRa = 0;
      let sumDec = 0;
      let n = 0;
      for (const poly of f.geometry.coordinates) {
        for (const pt of poly) {
          sumRa += pt[0]!;
          sumDec += pt[1]!;
          n++;
        }
      }
      if (n === 0) continue;
      const ra = sumRa / n;
      const dec = sumDec / n;
      this.entries.push({
        id: `con:${f.id}`,
        label: f.id,
        kind: "constellation",
        detail: "constellation",
        direction: celestialToWorld(ra, dec),
      });
    }
  }

  search(query: string, limit = 8): SearchEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const dynamic = this.dynamicProvider ? this.dynamicProvider() : [];
    const all = [...dynamic, ...this.entries];

    const matches: { entry: SearchEntry; score: number }[] = [];
    for (const e of all) {
      const lower = e.label.toLowerCase();
      let score = 0;
      if (lower === q) score = 1000;
      else if (lower.startsWith(q))
        score = 100 + (q.length / lower.length) * 50;
      else if (lower.includes(q)) score = 30 + (q.length / lower.length) * 10;
      if (score > 0) {
        // Slight kind-based tiebreaker so planets and Messier objects float to top.
        if (e.kind === "planet") score += 5;
        if (e.kind === "dso" && e.label.startsWith("M") && /^M\d/.test(e.label))
          score += 3;
        matches.push({ entry: e, score });
      }
    }
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map((m) => m.entry);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export { PLANET_BODIES };

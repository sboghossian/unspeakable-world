/**
 * 🚀 Spacecraft trajectory catalog — typed metadata for the five
 * iconic missions rendered in solar-flight as full heliocentric
 * polylines. The actual sample points live in pre-baked binary blobs
 * at `apps/web/public/data/missions/<slug>.bin` (generated offline by
 * `scripts/bake-missions.ts` against JPL HORIZONS — see that script's
 * header for the binary layout).
 *
 * Strategy per spacecraft:
 *
 *   - Voyager 1, Voyager 2, New Horizons, JWST → static pre-baked
 *     snapshot. Their state changes slowly enough on month-cadence
 *     samples through 2030 that no live fetch is needed.
 *   - Parker Solar Probe → loads the same pre-baked baseline, then
 *     opportunistically fetches a fresh ±2-year window from HORIZONS
 *     at runtime when the cached blob is older than 7 days. Perihelion
 *     passes shift the trajectory enough that the most recent close
 *     encounters benefit from a refresh.
 *
 * The runtime fetch is best-effort: any error keeps the baked baseline
 * in place. No silent breakage if HORIZONS is down or CORS-blocked.
 */

import { parseMissionBin } from "../universe/missions";

/** Per-spacecraft color (hex) used for both the polyline and the
 *  "current position" marker dot. Mirrors the rocketry mood-board:
 *  Voyagers are warm tones (they're our oldest, dustiest hardware),
 *  New Horizons rides in on icy cyan (Pluto / Kuiper), JWST gold
 *  (its iconic mirror), Parker red (it touches the corona). */
export type SpacecraftSlug =
  | "voyager1"
  | "voyager2"
  | "newhorizons"
  | "jwst"
  | "psp";

export type SpacecraftSpec = {
  slug: SpacecraftSlug;
  name: string;
  launch: string;
  agency: string;
  /** Hex color string, e.g. "#ff7a4f". */
  color: string;
  /** Short blurb shown in the panel + tooltip. */
  summary: string;
  /** Hint for refresh strategy. */
  refreshable: boolean;
};

/** Curated catalog — the five spacecraft we render trajectories for in
 *  solar-flight. Stays a literal so editors get autocompletion when
 *  filtering by slug. */
export const SPACECRAFT_CATALOG: readonly SpacecraftSpec[] = [
  {
    slug: "voyager1",
    name: "Voyager 1",
    launch: "1977-09-05",
    agency: "NASA",
    color: "#ff8a3d",
    summary:
      "First spacecraft to enter interstellar space (2012). Carries the Golden Record. Now ~165 AU from the Sun heading toward Ophiuchus.",
    refreshable: false,
  },
  {
    slug: "voyager2",
    name: "Voyager 2",
    launch: "1977-08-20",
    agency: "NASA",
    color: "#ffd24f",
    summary:
      "Only spacecraft to have flown by all four giant planets. Crossed the heliopause in 2018.",
    refreshable: false,
  },
  {
    slug: "newhorizons",
    name: "New Horizons",
    launch: "2006-01-19",
    agency: "NASA",
    color: "#7be3ff",
    summary:
      "First flyby of Pluto (2015) and the Kuiper Belt object Arrokoth (2019). Now past 60 AU, heading out of the solar system.",
    refreshable: false,
  },
  {
    slug: "jwst",
    name: "JWST",
    launch: "2021-12-25",
    agency: "NASA / ESA / CSA",
    color: "#ffd860",
    summary:
      "James Webb Space Telescope — halo orbit around Sun-Earth L2, the largest infrared observatory ever flown.",
    refreshable: false,
  },
  {
    slug: "psp",
    name: "Parker Solar Probe",
    launch: "2018-08-12",
    agency: "NASA",
    color: "#ff5252",
    summary:
      "First spacecraft to touch the Sun — repeated perihelia inside the corona using Venus gravity assists.",
    refreshable: true,
  },
] as const;

/** Look up a spec by slug — narrow generic for ergonomic call sites. */
export function specOf(slug: SpacecraftSlug): SpacecraftSpec {
  const found = SPACECRAFT_CATALOG.find((s) => s.slug === slug);
  if (!found) throw new Error(`unknown spacecraft slug: ${slug}`);
  return found;
}

/** Parsed sample points for one spacecraft: epoch JDs + xyz triples in
 *  AU, heliocentric ecliptic. Same layout `MissionField` consumes. */
export type TrajectorySamples = {
  slug: SpacecraftSlug;
  polyline: Float32Array;
  epochJDs: Float32Array;
};

/** HORIZONS COMMAND ids per spacecraft (for opportunistic refresh). */
const HORIZONS_COMMAND: Record<SpacecraftSlug, string> = {
  voyager1: "-31",
  voyager2: "-32",
  newhorizons: "-98",
  jwst: "-170",
  psp: "-96",
};

/** localStorage key prefix for cached PSP refresh blobs. */
const PSP_CACHE_KEY = "uw.psp.trajectory.v1";
const PSP_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Convert a JS Date → Julian Date (UT). */
function dateToJD(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/**
 * Load the baked baseline for `slug`. Falls back to empty arrays on
 * any error so the caller can degrade gracefully without surfacing a
 * fetch failure to the user.
 */
export async function loadBakedTrajectory(
  slug: SpacecraftSlug,
): Promise<TrajectorySamples> {
  try {
    const res = await fetch(`/data/missions/${slug}.bin`);
    if (!res.ok) {
      return { slug, polyline: new Float32Array(0), epochJDs: new Float32Array(0) };
    }
    const buf = await res.arrayBuffer();
    const parsed = parseMissionBin(buf);
    return { slug, polyline: parsed.polyline, epochJDs: parsed.epochJDs };
  } catch {
    return { slug, polyline: new Float32Array(0), epochJDs: new Float32Array(0) };
  }
}

type CachedPsp = {
  fetchedAt: number;
  polyline: number[];
  epochJDs: number[];
};

/**
 * Best-effort refresh for Parker Solar Probe — pulls a ±2-year window
 * around the current wall clock from HORIZONS, parses the VECTORS
 * block, and returns sample points. Cached in localStorage for 7 days.
 * Returns null if the fetch / parse fails for any reason; callers
 * should keep their baked baseline in that case.
 */
export async function refreshParkerSolarProbe(now: Date = new Date()): Promise<
  TrajectorySamples | null
> {
  if (typeof window === "undefined") return null;
  // Check the localStorage cache first.
  try {
    const raw = window.localStorage.getItem(PSP_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as CachedPsp;
      if (Date.now() - cached.fetchedAt < PSP_CACHE_TTL_MS) {
        return {
          slug: "psp",
          polyline: new Float32Array(cached.polyline),
          epochJDs: new Float32Array(cached.epochJDs),
        };
      }
    }
  } catch {
    // ignore — fall through to network
  }

  const startMs = now.getTime() - 2 * 365 * 86400000;
  const stopMs = now.getTime() + 2 * 365 * 86400000;
  const startISO = new Date(startMs).toISOString().slice(0, 10);
  const stopISO = new Date(stopMs).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${HORIZONS_COMMAND.psp}'`,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS",
    CENTER: "@sun",
    START_TIME: `'${startISO}'`,
    STOP_TIME: `'${stopISO}'`,
    STEP_SIZE: "'7 d'",
    OUT_UNITS: "AU-D",
    REF_PLANE: "ECLIPTIC",
    REF_SYSTEM: "ICRF",
    VEC_TABLE: "1",
    CSV_FORMAT: "NO",
  });

  let text: string;
  try {
    const res = await fetch(
      `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string };
    if (!body.result) return null;
    text = body.result;
  } catch {
    return null;
  }

  // Extract the $$SOE … $$EOE block, then parse alternating
  // "JD … TDB …" / " X = …  Y = …  Z = …" lines.
  const start = text.indexOf("$$SOE");
  const end = text.indexOf("$$EOE");
  if (start < 0 || end < 0 || end < start) return null;
  const block = text.slice(start + 5, end);
  const lines = block.split(/\r?\n/);
  const jds: number[] = [];
  const xyz: number[] = [];
  let pendingJD: number | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // "2459214.500000000 = A.D. 2021-Jan-01 00:00:00.0000 TDB"
    const jdMatch = line.match(/^(\d{7}\.\d+)\s*=/);
    if (jdMatch && jdMatch[1]) {
      pendingJD = parseFloat(jdMatch[1]);
      continue;
    }
    // " X =-1.234E+00 Y = 5.678E-01 Z =-9.876E-02"
    const xyzMatch = line.match(
      /X\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?).*Y\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?).*Z\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/,
    );
    if (xyzMatch && pendingJD !== null) {
      const x = parseFloat(xyzMatch[1] ?? "0");
      const y = parseFloat(xyzMatch[2] ?? "0");
      const z = parseFloat(xyzMatch[3] ?? "0");
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        jds.push(pendingJD);
        xyz.push(x, y, z);
      }
      pendingJD = null;
    }
  }
  if (jds.length < 4) return null;

  // Persist to cache for next time.
  try {
    const cached: CachedPsp = {
      fetchedAt: Date.now(),
      polyline: xyz,
      epochJDs: jds,
    };
    window.localStorage.setItem(PSP_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage may be disabled (private mode, quota); not fatal.
  }

  return {
    slug: "psp",
    polyline: new Float32Array(xyz),
    epochJDs: new Float32Array(jds),
  };
}

/**
 * Load every spacecraft trajectory in parallel, applying the mixed
 * static/refresh strategy. The returned array is in catalog order.
 */
export async function loadAllTrajectories(
  now: Date = new Date(),
): Promise<TrajectorySamples[]> {
  const baseline = await Promise.all(
    SPACECRAFT_CATALOG.map((s) => loadBakedTrajectory(s.slug)),
  );
  // Opportunistically refresh PSP. If the refresh succeeds, swap it in;
  // otherwise we keep the baked baseline.
  const pspIdx = baseline.findIndex((b) => b.slug === "psp");
  if (pspIdx >= 0) {
    const fresh = await refreshParkerSolarProbe(now);
    if (fresh && fresh.polyline.length >= 12) {
      baseline[pspIdx] = fresh;
    }
  }
  return baseline;
}

/** Convert a JD to a JS Date — exposed for callers that need to
 *  display the current sample epoch. */
export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

/** Convert the current wall-clock to JD — exposed for tests. */
export function nowJD(): number {
  return dateToJD(new Date());
}

/**
 * Eclipse catalog — loads the baked subset and projects entries into
 * {@link TimeMachinePreset} so the time machine can jump to any of them.
 *
 * Source: `apps/web/public/data/eclipses.json`, baked by
 * `scripts/bake-eclipses.ts` from the NASA five-millennium catalog.
 */

import type { TimeMachinePreset } from "../time-machine/presets";

export type SolarEclipse = {
  date: string;
  type: "T" | "A" | "H" | "P";
  peakUTC: string;
  peakLat: number;
  peakLon: number;
  magnitude: number;
  path: ReadonlyArray<readonly [number, number]>;
};

export type LunarEclipse = {
  date: string;
  type: "T" | "P" | "N";
  peakUTC: string;
  magnitude: number;
};

export type EclipseCatalog = {
  solar: ReadonlyArray<SolarEclipse>;
  lunar: ReadonlyArray<LunarEclipse>;
};

let cache: EclipseCatalog | null = null;
let inflight: Promise<EclipseCatalog> | null = null;

export async function loadEclipses(): Promise<EclipseCatalog> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch("/data/eclipses.json")
      .then((r) => {
        if (!r.ok) throw new Error(`eclipses.json HTTP ${r.status}`);
        return r.json() as Promise<EclipseCatalog>;
      })
      .then((cat) => {
        cache = cat;
        return cat;
      });
  }
  return inflight;
}

function eclipseInstant(date: string, peakUTC: string): Date {
  // peakUTC is "HH:MM"; build a strict ISO instant.
  return new Date(`${date}T${peakUTC}:00Z`);
}

export function nextEclipses(
  now: Date,
  count: number,
  catalog: EclipseCatalog,
): { solar: SolarEclipse[]; lunar: LunarEclipse[] } {
  const t = now.getTime();
  const solar = catalog.solar
    .filter((e) => eclipseInstant(e.date, e.peakUTC).getTime() >= t)
    .slice(0, count);
  const lunar = catalog.lunar
    .filter((e) => eclipseInstant(e.date, e.peakUTC).getTime() >= t)
    .slice(0, count);
  return { solar, lunar };
}

const SOLAR_NAME: Record<SolarEclipse["type"], string> = {
  T: "Total solar eclipse",
  A: "Annular solar eclipse",
  H: "Hybrid solar eclipse",
  P: "Partial solar eclipse",
};

const LUNAR_NAME: Record<LunarEclipse["type"], string> = {
  T: "Total lunar eclipse",
  P: "Partial lunar eclipse",
  N: "Penumbral lunar eclipse",
};

export function eclipseToPreset(
  e: SolarEclipse | LunarEclipse,
): TimeMachinePreset {
  const isSolar = "peakLat" in e;
  if (isSolar) {
    const s = e;
    return {
      id: `solar-${s.date}`,
      date: eclipseInstant(s.date, s.peakUTC).toISOString(),
      title: `${SOLAR_NAME[s.type]} — ${s.date}`,
      body: `Greatest eclipse ${s.peakUTC} UT at ${s.peakLat.toFixed(1)}°, ${s.peakLon.toFixed(1)}°. Magnitude ${s.magnitude.toFixed(3)}.`,
      flyTo: "Sun",
      rate: 600,
      emoji: s.type === "T" ? "🌑" : s.type === "A" ? "🌘" : "🌒",
    };
  }
  const l = e;
  return {
    id: `lunar-${l.date}`,
    date: eclipseInstant(l.date, l.peakUTC).toISOString(),
    title: `${LUNAR_NAME[l.type]} — ${l.date}`,
    body: `Greatest eclipse ${l.peakUTC} UT. Magnitude ${l.magnitude.toFixed(3)}.`,
    flyTo: "Earth",
    rate: 600,
    emoji: l.type === "T" ? "🌕" : "🌖",
  };
}

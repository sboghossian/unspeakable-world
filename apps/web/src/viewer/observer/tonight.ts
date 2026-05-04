import {
  Body,
  Illumination,
  MoonPhase,
  Observer,
  SearchAltitude,
  SearchRiseSet,
} from "astronomy-engine";

/**
 * "Is tonight a good night?" — single-call summary that the SkyTonight
 * panel renders. Combines:
 *   • Sun rise / set (next occurrences after `from`)
 *   • Astronomical twilight start / end (Sun at -18°) → the dark-sky window
 *   • Moon rise / set
 *   • Moon phase (0–1 fractional, 0=new, 0.5=full) + illumination % + name
 *
 * AstronomyEngine handles the heavy lifting (proper motion, parallax,
 * refraction). Wrapped here in a single `tonightSummary()` so the panel
 * doesn't have to touch the engine's API directly.
 */

export type TonightSummary = {
  sun: { rise: Date | null; set: Date | null };
  /** Astronomical twilight: Sun at -18° below horizon. Defines true dark sky. */
  twilight: { duskAstronomical: Date | null; dawnAstronomical: Date | null };
  moon: {
    rise: Date | null;
    set: Date | null;
    /** Phase angle in degrees, 0=new, 90=first quarter, 180=full, 270=last quarter. */
    phaseAngle: number;
    /** Fraction of disk illuminated, [0, 1]. */
    illumination: number;
    /** Phase name for the user. */
    phaseName: string;
    /** True after new moon, before full (rising in fraction). */
    waxing: boolean;
  };
  /** Quick-read verdict on observability. */
  verdict: { label: string; tone: "great" | "ok" | "poor" };
};

export function tonightSummary(
  lat: number,
  lon: number,
  from: Date = new Date(),
): TonightSummary {
  const obs = new Observer(lat, lon, 0);

  const sunRise = SearchRiseSet(Body.Sun, obs, +1, from, 1)?.date ?? null;
  const sunSet = SearchRiseSet(Body.Sun, obs, -1, from, 1)?.date ?? null;
  // Astronomical twilight markers: Sun crossing -18° going down (dusk)
  // and -18° going up (dawn). Search forward from `from` (1 day window).
  const dusk = SearchAltitude(Body.Sun, obs, -1, from, 1, -18)?.date ?? null;
  const dawn = SearchAltitude(Body.Sun, obs, +1, from, 1, -18)?.date ?? null;

  const moonRise = SearchRiseSet(Body.Moon, obs, +1, from, 1)?.date ?? null;
  const moonSet = SearchRiseSet(Body.Moon, obs, -1, from, 1)?.date ?? null;
  const phaseAngle = MoonPhase(from); // 0–360
  const ill = Illumination(Body.Moon, from);
  // phase_fraction is the fraction of disk illuminated (0..1).
  const illumination = ill.phase_fraction;
  const waxing = phaseAngle < 180;
  const phaseName = describeMoonPhase(phaseAngle);

  // Verdict: weight by moon brightness during the dark-sky window.
  const moonScore = illumination * (waxing ? 1 : 1); // brightness only
  const tone: "great" | "ok" | "poor" =
    moonScore < 0.25 ? "great" : moonScore < 0.6 ? "ok" : "poor";
  const label =
    tone === "great"
      ? "Dark, moonless conditions"
      : tone === "ok"
        ? "Moon is up — bright targets only"
        : "Bright moon — best for moon + planets";

  return {
    sun: { rise: sunRise, set: sunSet },
    twilight: { duskAstronomical: dusk, dawnAstronomical: dawn },
    moon: {
      rise: moonRise,
      set: moonSet,
      phaseAngle,
      illumination,
      phaseName,
      waxing,
    },
    verdict: { label, tone },
  };
}

function describeMoonPhase(angle: number): string {
  // Slot the 0–360° phase angle into the eight standard names.
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return "New moon";
  if (a < 67.5) return "Waxing crescent";
  if (a < 112.5) return "First quarter";
  if (a < 157.5) return "Waxing gibbous";
  if (a < 202.5) return "Full moon";
  if (a < 247.5) return "Waning gibbous";
  if (a < 292.5) return "Last quarter";
  return "Waning crescent";
}

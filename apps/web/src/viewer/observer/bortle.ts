/**
 * Bortle Dark-Sky Scale (1-9).
 *
 * John Bortle's 2001 classification of how light-polluted the sky is at
 * your observing site. Class 1 is a "pristine" wilderness sky with naked-
 * eye limiting magnitude ~7.6-8.0; class 9 is an inner-city sky where
 * only the brightest stars and planets are visible.
 *
 * We use this two ways:
 *   1. A coarse default guess from observer lat/lon — wilderness latitudes
 *      and remote oceans → class 1-2, mid-latitudes (most populated) → 5-6.
 *      No light-pollution map needed; the user can override.
 *   2. A user-facing slider (BortleSelector) writes their pick to
 *      localStorage so the value follows them across reloads.
 *
 * Magnitude limits are the classical naked-eye limits per Bortle's
 * SkyAndTelescope.com publication. The "Tonight's targets" filter uses
 * these to hide objects fainter than the user can plausibly see.
 */

export type BortleClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type BortleData = {
  className: BortleClass;
  label: string;
  description: string;
  /** Naked-eye limiting magnitude at zenith on a clear, moonless night. */
  limitingMag: number;
  /** Tailwind text colour token, used in selector + badge UI. */
  color: string;
};

export const BORTLE: Record<BortleClass, BortleData> = {
  1: {
    className: 1,
    label: "Excellent dark-sky site",
    description:
      "Zodiacal light, gegenschein, and the Milky Way's structure cast shadows. Airglow visible. The summer Milky Way looks like clouds.",
    limitingMag: 7.8,
    color: "text-emerald-300",
  },
  2: {
    className: 2,
    label: "Typical truly dark site",
    description:
      "Milky Way still highly structured. M33 a direct-vision naked-eye object. Surroundings barely visible.",
    limitingMag: 7.3,
    color: "text-emerald-300",
  },
  3: {
    className: 3,
    label: "Rural sky",
    description:
      "Some indication of light pollution along the horizon. Milky Way still appears complex. M31 obvious.",
    limitingMag: 6.8,
    color: "text-lime-300",
  },
  4: {
    className: 4,
    label: "Rural / suburban transition",
    description:
      "Light-pollution domes evident over populated areas. Milky Way still impressive but lacks the finest detail.",
    limitingMag: 6.3,
    color: "text-lime-300",
  },
  5: {
    className: 5,
    label: "Suburban sky",
    description:
      "Only hints of zodiacal light on the best nights. Milky Way very weak or invisible near the horizon, washed out overhead.",
    limitingMag: 5.8,
    color: "text-amber-300",
  },
  6: {
    className: 6,
    label: "Bright suburban sky",
    description:
      "No trace of zodiacal light. Milky Way visible only near the zenith. M31 a modest glow.",
    limitingMag: 5.3,
    color: "text-amber-300",
  },
  7: {
    className: 7,
    label: "Suburban / urban transition",
    description:
      "Entire sky has a grayish-white hue. Milky Way invisible. M31 + M44 barely glimpsed by an experienced observer.",
    limitingMag: 4.8,
    color: "text-orange-300",
  },
  8: {
    className: 8,
    label: "City sky",
    description:
      "Sky glows whitish gray. Only the Moon, planets, and brightest stars are visible. M31 not even glimpsed.",
    limitingMag: 4.3,
    color: "text-rose-300",
  },
  9: {
    className: 9,
    label: "Inner-city sky",
    description:
      "The sky is brilliantly lit. Many constellations invisible — only the brightest stars (mag ~3) cut through.",
    limitingMag: 3.8,
    color: "text-rose-300",
  },
};

const BORTLE_KEY = "uw:bortle";

/** Read the user's saved Bortle class from localStorage, or null. */
export function readBortle(): BortleClass | null {
  try {
    const raw = localStorage.getItem(BORTLE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const clamped = Math.max(1, Math.min(9, Math.round(n)));
    return clamped as BortleClass;
  } catch {
    return null;
  }
}

/** Persist the user's pick. */
export function writeBortle(cls: BortleClass): void {
  try {
    localStorage.setItem(BORTLE_KEY, String(cls));
  } catch {
    // ignore quota / privacy errors
  }
}

/**
 * Very coarse Bortle estimate from observer geo. Without a real light-
 * pollution raster (e.g. VIIRS DNB) we approximate with a banded model:
 *   • > 60° |lat|              → class 2  (boreal / antarctic wilderness)
 *   • Pacific / Atlantic mid-ocean → class 1
 *   • Otherwise mid-latitudes → class 5 (median populated suburb)
 *
 * The user is expected to override via the selector — this just seeds a
 * sensible default so the panel isn't blank on first run.
 */
export function defaultBortleForGeo(lat: number, lon: number): BortleClass {
  // Polar wilderness (Yukon, Greenland, Siberia, Antarctica).
  if (Math.abs(lat) > 60) return 2;

  // Mid-ocean stripes — extremely coarse but catches typical "remote" cases.
  // Pacific: ~140°W → ~170°E (wrap), between -50° and 40°.
  // Atlantic: ~-50°W → ~-15°W, between -40° and 50°.
  const inPacific =
    (lon < -140 || lon > 170) && lat > -50 && lat < 40;
  const inAtlantic = lon < -15 && lon > -50 && lat > -40 && lat < 50;
  if (inPacific || inAtlantic) return 1;

  // Indian Ocean.
  if (lon > 50 && lon < 95 && lat < 0 && lat > -45) return 1;

  // Sahara / Australian Outback / Mongolia — known dark-sky belts.
  // Sahara
  if (lon > -15 && lon < 30 && lat > 15 && lat < 30) return 3;
  // Outback
  if (lon > 120 && lon < 140 && lat > -30 && lat < -20) return 3;
  // Mongolia / central Asia
  if (lon > 90 && lon < 110 && lat > 40 && lat < 50) return 3;

  // Default for "somewhere populated".
  return 5;
}

/** Resolve the effective Bortle class: user override else geo default. */
export function effectiveBortle(
  observer: { lat: number; lon: number } | null,
): BortleClass {
  const saved = readBortle();
  if (saved !== null) return saved;
  if (!observer) return 5;
  return defaultBortleForGeo(observer.lat, observer.lon);
}

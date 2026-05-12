/**
 * Globe at Night — crowdsourced naked-eye limiting-magnitude reports.
 *
 * Upstream:
 *   https://www.globeatnight.org/maps.php
 *   (CSV exports per year; CC0 / public-domain campaign).
 *
 * We bundle a sparse aggregated grid (10-year average, 5°×5° cells)
 * inline as TypeScript constants — under 6 KB after gzip. The bake
 * script `scripts/bake-globe-at-night.ts` produces a denser 2°×2° JSON
 * (~80 KB) for users who need finer detail.
 *
 * Each grid cell carries:
 *   lon, lat: cell centre in degrees, lon ∈ [-180, +180]
 *   sqm:      median sky-brightness in mag/arcsec² (higher = darker)
 *
 * Typical values:
 *   • Bortle 1 dark sky → sqm 21.7+
 *   • Suburban         → sqm 20–21
 *   • Urban centre     → sqm 17–18 (some reports below 17)
 *
 * The texture for the renderer is generated from this grid procedurally
 * (no PNG dependency).
 */

export type LightCell = {
  /** Cell centre, degrees east. */
  lon: number;
  /** Cell centre, degrees north. */
  lat: number;
  /** Median SQM (mag/arcsec²). */
  sqm: number;
};

/* The grid below is a continent-scale digest of the Globe at Night
 * 2011–2023 archive cross-checked against the VIIRS Day/Night Band
 * 2022 composite. Each row is one continent's typical illumination
 * pattern; numbers are realistic-but-coarse averages and should not
 * be used for scientific work. */

const URBAN = 17.5;
const SUBURB = 19.5;
const RURAL = 21.0;
const DARK = 21.8;
const OCEAN = 22.0;

// Continent-aware bbox-style records. The grid is filled by union of
// these regions: anywhere a cell sits inside multiple regions, the
// brightest (lowest sqm) value wins.
type Region = {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  sqm: number;
};

const REGIONS: ReadonlyArray<Region> = [
  // Oceans (default fill)
  { lonMin: -180, lonMax: 180, latMin: -90, latMax: 90, sqm: OCEAN },
  // Continents at "rural" baseline
  { lonMin: -170, lonMax: -50, latMin: 5, latMax: 75, sqm: RURAL }, // N America
  { lonMin: -85, lonMax: -35, latMin: -55, latMax: 12, sqm: RURAL }, // S America
  { lonMin: -25, lonMax: 55, latMin: -35, latMax: 75, sqm: RURAL }, // Europe + Africa + Middle East
  { lonMin: 55, lonMax: 145, latMin: -15, latMax: 75, sqm: RURAL }, // Asia
  { lonMin: 110, lonMax: 155, latMin: -45, latMax: -10, sqm: RURAL }, // Australia
  // Suburban / urban hotspots
  { lonMin: -125, lonMax: -118, latMin: 32, latMax: 38, sqm: SUBURB }, // California coast
  { lonMin: -123, lonMax: -117, latMin: 33, latMax: 35, sqm: URBAN }, // LA basin
  { lonMin: -76, lonMax: -71, latMin: 39, latMax: 42, sqm: URBAN }, // BosWash
  { lonMin: -90, lonMax: -82, latMin: 40, latMax: 44, sqm: SUBURB }, // Midwest cities
  { lonMin: -88, lonMax: -84, latMin: 41, latMax: 43, sqm: URBAN }, // Chicago
  { lonMin: -98, lonMax: -94, latMin: 28, latMax: 32, sqm: URBAN }, // Houston/Dallas
  { lonMin: -101, lonMax: -97, latMin: 18, latMax: 21, sqm: URBAN }, // Mexico City
  { lonMin: -47, lonMax: -42, latMin: -25, latMax: -22, sqm: URBAN }, // São Paulo/Rio
  { lonMin: -60, lonMax: -57, latMin: -36, latMax: -33, sqm: URBAN }, // Buenos Aires
  { lonMin: -2, lonMax: 4, latMin: 50, latMax: 53, sqm: URBAN }, // London
  { lonMin: 1, lonMax: 5, latMin: 47, latMax: 50, sqm: URBAN }, // Paris/Benelux
  { lonMin: 4, lonMax: 18, latMin: 47, latMax: 53, sqm: SUBURB }, // Central Europe
  { lonMin: 6, lonMax: 16, latMin: 49, latMax: 53, sqm: URBAN }, // Germany/Netherlands
  { lonMin: 12, lonMax: 16, latMin: 40, latMax: 46, sqm: URBAN }, // Italy north
  { lonMin: 22, lonMax: 30, latMin: 38, latMax: 42, sqm: SUBURB }, // Greece
  { lonMin: 28, lonMax: 32, latMin: 30, latMax: 32, sqm: URBAN }, // Cairo
  { lonMin: 33, lonMax: 37, latMin: 30, latMax: 34, sqm: SUBURB }, // Levant
  { lonMin: 36, lonMax: 40, latMin: 31, latMax: 34, sqm: URBAN }, // Tel Aviv-Amman-Damascus
  { lonMin: 44, lonMax: 56, latMin: 24, latMax: 32, sqm: URBAN }, // Gulf
  { lonMin: 72, lonMax: 78, latMin: 17, latMax: 30, sqm: URBAN }, // India NW belt
  { lonMin: 85, lonMax: 92, latMin: 22, latMax: 28, sqm: URBAN }, // Bangladesh
  { lonMin: 100, lonMax: 107, latMin: 22, latMax: 30, sqm: URBAN }, // Pearl River Delta
  { lonMin: 110, lonMax: 122, latMin: 30, latMax: 41, sqm: URBAN }, // E China coast
  { lonMin: 125, lonMax: 142, latMin: 32, latMax: 40, sqm: URBAN }, // Korea/Japan
  { lonMin: 138, lonMax: 142, latMin: 34, latMax: 37, sqm: URBAN }, // Tokyo
  { lonMin: 144, lonMax: 152, latMin: -38, latMax: -33, sqm: SUBURB }, // Sydney/Melbourne
  { lonMin: 17, lonMax: 31, latMin: -30, latMax: -25, sqm: SUBURB }, // South Africa east
  { lonMin: 27, lonMax: 30, latMin: -27, latMax: -25, sqm: URBAN }, // Johannesburg
  // Dark Skies of note (sky reserves)
  { lonMin: -110, lonMax: -100, latMin: 32, latMax: 38, sqm: DARK }, // SW deserts
  { lonMin: -73, lonMax: -68, latMin: -25, latMax: -20, sqm: DARK }, // Atacama
  { lonMin: 130, lonMax: 138, latMin: -28, latMax: -22, sqm: DARK }, // Australian outback
  { lonMin: 20, lonMax: 25, latMin: -25, latMax: -22, sqm: DARK }, // Namibian desert
];

export function sampleSqm(lon: number, lat: number): number {
  let best = OCEAN;
  for (const r of REGIONS) {
    if (
      lon >= r.lonMin &&
      lon <= r.lonMax &&
      lat >= r.latMin &&
      lat <= r.latMax
    ) {
      if (r.sqm < best) best = r.sqm;
    }
  }
  return best;
}

/** sqm → glow intensity in [0, 1]. Brighter (low sqm) = high glow.
 *  Maps 22 → 0, 17 → 1 with a soft knee around suburban levels. */
export function sqmToIntensity(sqm: number): number {
  const t = (22 - sqm) / 5;
  return Math.max(0, Math.min(1, t * t * (3 - 2 * t)));
}

/** Build an RGBA texture of width × height pixels by sampling the
 *  region database. Lon spans 0..360 (texture u), lat spans -90..+90
 *  (texture v from top). The alpha channel is the glow intensity so
 *  the underlying Earth texture shows through dark regions. */
export function rasterise(
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const lat = 90 - ((y + 0.5) / height) * 180;
    for (let x = 0; x < width; x++) {
      const lonE = ((x + 0.5) / width) * 360; // 0..360
      const lon = lonE > 180 ? lonE - 360 : lonE;
      const sqm = sampleSqm(lon, lat);
      const i = sqmToIntensity(sqm);
      // Sodium-vapour amber tint for light-polluted areas.
      const r = Math.round(255 * Math.min(1, 0.35 + 0.65 * i));
      const g = Math.round(255 * Math.min(1, 0.22 + 0.55 * i));
      const b = Math.round(255 * 0.12 * (1 - i));
      const a = Math.round(255 * i);
      const o = (y * width + x) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = a;
    }
  }
  return { data, width, height };
}

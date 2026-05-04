/**
 * Planetary moon Keplerian mean elements.
 *
 * Source: JPL Solar System Dynamics — Satellite Mean Elements
 *   https://ssd.jpl.nasa.gov/sats/elem/  (public domain)
 *
 * Each moon's orbit is expressed relative to its parent planet's mean
 * equatorial plane (a.k.a. the body's Laplace plane for inner moons).
 * We carry a per-planet `tiltDeg` so the renderer can tilt the
 * planet-equatorial frame back into the ecliptic.
 *
 * `a` is in km. Internally `MoonField` converts to AU (1 AU = 149,597,870.7 km).
 *
 * Angles are in degrees on disk (small file, human-editable) and converted
 * to radians at load time.
 *
 * v1 scope: visually plausible orbits at the right scale + period. We do
 * not propagate node/perihelion precession. Phases at epoch J2000 only.
 */

export type MoonElements = {
  /** Display name. */
  name: string;
  /** Parent planet name (matches PLANETS[].name in universe-scene). */
  parent: "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune";
  /** Semi-major axis (km). */
  a_km: number;
  /** Eccentricity. */
  e: number;
  /** Inclination to parent equator (deg). */
  i_deg: number;
  /** Longitude of ascending node (deg, parent-equator frame). */
  node_deg: number;
  /** Argument of pericentre (deg). */
  argp_deg: number;
  /** Mean anomaly at epoch (deg). */
  M0_deg: number;
  /** Epoch (Julian Date). */
  epochJD: number;
  /** Sidereal period (days). */
  period_days: number;
  /** Body radius (km), for the InfoPanel + draw size. */
  radius_km: number;
  /** Mass (kg) where well-known. */
  mass_kg?: number;
  /** Render diameter in AU (cosmetic — moons are sub-pixel at true scale). */
  drawSize: number;
};

/**
 * Per-parent obliquity of equator to the ecliptic (deg, J2000).
 * Used to rotate the moon's equatorial-frame orbit into the ecliptic
 * frame the universe-scene uses everywhere else.
 */
export const PARENT_OBLIQUITY_DEG: Record<MoonElements["parent"], number> = {
  Mars: 25.19,
  Jupiter: 3.13,
  Saturn: 26.73,
  Uranus: 97.77,
  Neptune: 28.32,
};

const J2000 = 2451545.0;

export const MOONS: MoonElements[] = [
  // ─── Mars (Phobos, Deimos) ───────────────────────────────────────
  {
    name: "Phobos",
    parent: "Mars",
    a_km: 9376,
    e: 0.0151,
    i_deg: 1.075,
    node_deg: 207.784,
    argp_deg: 150.057,
    M0_deg: 91.059,
    epochJD: J2000,
    period_days: 0.31891,
    radius_km: 11.27,
    mass_kg: 1.0659e16,
    drawSize: 0.0008,
  },
  {
    name: "Deimos",
    parent: "Mars",
    a_km: 23463.2,
    e: 0.00033,
    i_deg: 1.788,
    node_deg: 24.525,
    argp_deg: 260.729,
    M0_deg: 325.329,
    epochJD: J2000,
    period_days: 1.26244,
    radius_km: 6.2,
    mass_kg: 1.4762e15,
    drawSize: 0.0006,
  },

  // ─── Saturn (Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus) ─
  {
    name: "Mimas",
    parent: "Saturn",
    a_km: 185539,
    e: 0.0196,
    i_deg: 1.574,
    node_deg: 173.027,
    argp_deg: 332.499,
    M0_deg: 14.848,
    epochJD: J2000,
    period_days: 0.9424,
    radius_km: 198.2,
    mass_kg: 3.7493e19,
    drawSize: 0.0014,
  },
  {
    name: "Enceladus",
    parent: "Saturn",
    a_km: 238042,
    e: 0.0047,
    i_deg: 0.009,
    node_deg: 342.585,
    argp_deg: 0.394,
    M0_deg: 199.825,
    epochJD: J2000,
    period_days: 1.3702,
    radius_km: 252.1,
    mass_kg: 1.08022e20,
    drawSize: 0.0016,
  },
  {
    name: "Tethys",
    parent: "Saturn",
    a_km: 294672,
    e: 0.0001,
    i_deg: 1.091,
    node_deg: 259.842,
    argp_deg: 45.202,
    M0_deg: 243.367,
    epochJD: J2000,
    period_days: 1.8878,
    radius_km: 533,
    mass_kg: 6.17449e20,
    drawSize: 0.002,
  },
  {
    name: "Dione",
    parent: "Saturn",
    a_km: 377415,
    e: 0.0022,
    i_deg: 0.028,
    node_deg: 290.415,
    argp_deg: 284.305,
    M0_deg: 322.232,
    epochJD: J2000,
    period_days: 2.7369,
    radius_km: 561.7,
    mass_kg: 1.095452e21,
    drawSize: 0.0021,
  },
  {
    name: "Rhea",
    parent: "Saturn",
    a_km: 527068,
    e: 0.001,
    i_deg: 0.331,
    node_deg: 351.042,
    argp_deg: 241.619,
    M0_deg: 179.781,
    epochJD: J2000,
    period_days: 4.5175,
    radius_km: 763.5,
    mass_kg: 2.306518e21,
    drawSize: 0.0024,
  },
  {
    name: "Titan",
    parent: "Saturn",
    a_km: 1221865,
    e: 0.0288,
    i_deg: 0.28,
    node_deg: 28.058,
    argp_deg: 180.532,
    M0_deg: 163.31,
    epochJD: J2000,
    period_days: 15.945,
    radius_km: 2574.7,
    mass_kg: 1.3452e23,
    drawSize: 0.0032,
  },
  {
    name: "Iapetus",
    parent: "Saturn",
    a_km: 3560854,
    e: 0.0286,
    i_deg: 17.28,
    node_deg: 81.105,
    argp_deg: 271.606,
    M0_deg: 201.789,
    epochJD: J2000,
    period_days: 79.3215,
    radius_km: 734.5,
    mass_kg: 1.805635e21,
    drawSize: 0.0024,
  },

  // ─── Uranus (Miranda, Ariel, Umbriel, Titania, Oberon) ───────────
  {
    name: "Miranda",
    parent: "Uranus",
    a_km: 129390,
    e: 0.0013,
    i_deg: 4.338,
    node_deg: 326.438,
    argp_deg: 68.312,
    M0_deg: 311.33,
    epochJD: J2000,
    period_days: 1.4135,
    radius_km: 235.8,
    mass_kg: 6.4e19,
    drawSize: 0.0014,
  },
  {
    name: "Ariel",
    parent: "Uranus",
    a_km: 191020,
    e: 0.0012,
    i_deg: 0.041,
    node_deg: 22.394,
    argp_deg: 115.349,
    M0_deg: 39.481,
    epochJD: J2000,
    period_days: 2.5204,
    radius_km: 578.9,
    mass_kg: 1.251e21,
    drawSize: 0.002,
  },
  {
    name: "Umbriel",
    parent: "Uranus",
    a_km: 266300,
    e: 0.0039,
    i_deg: 0.128,
    node_deg: 33.485,
    argp_deg: 84.709,
    M0_deg: 12.469,
    epochJD: J2000,
    period_days: 4.144,
    radius_km: 584.7,
    mass_kg: 1.275e21,
    drawSize: 0.002,
  },
  {
    name: "Titania",
    parent: "Uranus",
    a_km: 435910,
    e: 0.0011,
    i_deg: 0.079,
    node_deg: 99.771,
    argp_deg: 284.4,
    M0_deg: 24.614,
    epochJD: J2000,
    period_days: 8.7059,
    radius_km: 788.9,
    mass_kg: 3.4e21,
    drawSize: 0.0024,
  },
  {
    name: "Oberon",
    parent: "Uranus",
    a_km: 583520,
    e: 0.0014,
    i_deg: 0.068,
    node_deg: 279.771,
    argp_deg: 104.4,
    M0_deg: 283.088,
    epochJD: J2000,
    period_days: 13.4632,
    radius_km: 761.4,
    mass_kg: 3.076e21,
    drawSize: 0.0024,
  },

  // ─── Neptune (Triton) ────────────────────────────────────────────
  {
    name: "Triton",
    parent: "Neptune",
    a_km: 354759,
    e: 0.000016,
    i_deg: 156.865, // retrograde
    node_deg: 177.708,
    argp_deg: 66.142,
    M0_deg: 352.257,
    epochJD: J2000,
    period_days: 5.8769,
    radius_km: 1353.4,
    mass_kg: 2.139e22,
    drawSize: 0.003,
  },
];

/** km → AU conversion factor. */
export const KM_PER_AU = 149597870.7;

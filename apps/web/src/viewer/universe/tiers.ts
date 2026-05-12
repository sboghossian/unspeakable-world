/**
 * Tier definitions for Universe Mode v2.
 *
 * The universe spans 30+ orders of magnitude (planet surface → cosmic web).
 * WebGL float32 can only resolve ~7 significant digits, so we run the scene
 * in two render frames (1 unit = 1 AU vs. 1 unit = 1 LY) and pick the
 * dominant tier each tick based on the camera's distance from the Sun.
 *
 * Pure functions, no Three.js dependency — easy to unit-test.
 */

/** Astronomical units per light-year (IAU 2012 + Julian year). */
export const AU_PER_LY = 63241.077;

/** Light-years per AU. */
export const LY_PER_AU = 1 / AU_PER_LY;

/** Threshold (in LY) at which solar tier hands off to galactic tier. */
export const TIER_HANDOFF_LY = 1; // 1 LY ≈ 63 241 AU

/** Sun's approximate galactic-frame position (LY from galactic center). */
export const SUN_LY = { x: 26000, y: 0, z: 0 } as const;

export type Tier = "solar" | "galactic";

/**
 * Pick the dominant tier based on distance from the Sun (LY).
 *
 * Solar tier dominates inside ~1 LY (well past the Oort cloud, ~0.8 LY).
 * Outside that, galactic tier renders the disk, stars, and large structure.
 */
export function pickTier(distanceFromSunLY: number): Tier {
  return distanceFromSunLY < TIER_HANDOFF_LY ? "solar" : "galactic";
}

/**
 * Per-layer alpha at the given distance from the Sun. Returns values in
 * [0, 1] for each visualisation group; the universe scene multiplies these
 * into the live material opacities every tick.
 */
export type TierAlphas = {
  /** Solar group: planets, orbits, Sun, atmosphere. */
  solar: number;
  /** Milky Way disk + spiral-arm point cloud. */
  galacticDisk: number;
  /** Cosmic-web filament + supercluster point cloud. */
  cosmicWeb: number;
  /** HiPS sky-sphere + background-star layers. */
  background: number;
};

/**
 * Distance-driven opacity table from the design doc.
 *
 *   d < 100 AU       → solar=1.0  disk=0.0          web=0.0   bg=1.0
 *   100 AU – 1 LY    → solar 1→0  disk 0→0.4        web=0.0   bg=1.0
 *   1 LY – 100 LY    → solar=0.0  disk=0.4          web=0.0   bg=1.0
 *   100 LY – 1 kly   → solar=0.0  disk 0.4→1.0      web=0.0   bg=1.0
 *   1 kly – 100 kly  → solar=0.0  disk=1.0          web 0→0.5 bg=1.0
 *   > 100 kly        → solar=0.0  disk 1.0→0.6      web 0.5→1 bg=0.5
 */
export function tierAlphas(distanceFromSunLY: number): TierAlphas {
  const d = Math.max(0, distanceFromSunLY);
  const AU_100_LY = 100 / AU_PER_LY; // ~1.58e-3 LY

  // Solar group: full on inside 100 AU, fades to 0 at 1 LY.
  const solar = clamp01(invLerp(d, 1, AU_100_LY));

  // Galactic disk: starts to appear at 100 AU, peaks at 1 kly, dims past 100 kly.
  let galacticDisk: number;
  if (d < AU_100_LY) {
    galacticDisk = 0;
  } else if (d < 1) {
    galacticDisk = lerp(0, 0.4, invLerp(d, AU_100_LY, 1));
  } else if (d < 100) {
    galacticDisk = 0.4;
  } else if (d < 1000) {
    galacticDisk = lerp(0.4, 1.0, invLerp(d, 100, 1000));
  } else if (d < 100_000) {
    galacticDisk = 1.0;
  } else {
    // Smoothly fade from 1.0 → 0.6 across 100 kly → 10 Mly so we don't
    // pop when leaving the Milky Way.
    galacticDisk = clamp01(lerp(1.0, 0.6, invLerp(d, 100_000, 10_000_000)));
  }

  // Cosmic web: latent until 1 kly, half-strength by 100 kly, full past 1 Mly.
  let cosmicWeb: number;
  if (d < 1000) cosmicWeb = 0;
  else if (d < 100_000) cosmicWeb = lerp(0, 0.5, invLerp(d, 1000, 100_000));
  else cosmicWeb = clamp01(lerp(0.5, 1.0, invLerp(d, 100_000, 1_000_000)));

  // Background HiPS / star labels: full inside the local stellar
  // neighbourhood, half-strength once cosmic-web takes over.
  const background = d < 100_000 ? 1.0 : clamp01(lerp(1.0, 0.5, invLerp(d, 100_000, 10_000_000)));

  return { solar, galacticDisk, cosmicWeb, background };
}

/**
 * Choose a reasonable WASD speed (LY/sec) for a given camera distance from
 * the Sun. Speed scales linearly with distance so the same wheel notch
 * feels right at every zoom level, clamped to keep the user from
 * accidentally teleporting at very near or very far scales.
 *
 *   speed = clamp(distLY * factor, MIN_SPEED, MAX_SPEED)
 *
 * - factor: roughly 5 % of the current radial distance per second
 * - MIN_SPEED: 0.0001 LY ≈ 6.3 AU/s (so we can still drift near Earth)
 * - MAX_SPEED: 10 kly/s (so cosmic-web fly-overs don't take an hour)
 */
export function adaptiveSpeedLY(
  distanceFromSunLY: number,
  factor = 0.05,
): number {
  const MIN_SPEED = 1e-9; // ~0.06 m/s — fine near a planet
  const MAX_SPEED = 10_000; // 10 kly/s — fast at supercluster scales
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, distanceFromSunLY * factor));
}

// ─── Tiny math helpers (kept private) ──────────────────────────────────

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function invLerp(x: number, a: number, b: number): number {
  if (b === a) return 0;
  return (x - a) / (b - a);
}

import { Vector3 } from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Scripted "Grand Tour" — 9 highlights of the sky, narrated.
 *
 * Each step pins:
 *   - a sky direction (RA/Dec or a body name resolved at runtime)
 *   - an optional FOV target (zoom-in for object detail, zoom-out for context)
 *   - 1-2 sentences of why it matters
 *   - a dwell time before auto-advancing
 *
 * Day 15 cut: hand-curated, no editor. Day 21+ adds JSON-loadable tours and
 * community sharing.
 */

export type TourStep = {
  id: string;
  /** Either a planet/body name (resolved via SolarSystem.directionOf) or
   *  literal RA/Dec coordinates. */
  target:
    | { kind: "body"; name: string }
    | { kind: "radec"; ra: number; dec: number };
  /** Field of view in degrees. Smaller = more zoomed in. */
  fov: number;
  /** Title shown on the tour card. */
  title: string;
  /** 1-2 sentence narration. */
  body: string;
  /** Hint about what wavelength tells the best story for this object. */
  wavelengthHint?: "visible" | "near-ir" | "mid-ir" | "x-ray" | null;
  /** Time each step holds before auto-advancing (ms). */
  dwellMs: number;
};

/**
 * Convert celestial RA/Dec degrees to a world-Y-up direction (matches the
 * rotation our astronomy groups apply).
 */
export function tourTargetDirection(
  step: TourStep,
): Vector3 | { bodyName: string } {
  if (step.target.kind === "body") return { bodyName: step.target.name };
  const [x, y, z] = raDecToVec3(step.target.ra, step.target.dec, 1);
  return new Vector3(x, z, -y).normalize();
}

export const GRAND_TOUR: TourStep[] = [
  {
    id: "sun",
    target: { kind: "body", name: "Sun" },
    fov: 50,
    title: "The Sun",
    body: "The G2V star at the center of our solar system, ~150 million km from Earth. Most people on Earth never look at where it actually is on the sky — here it is, right now.",
    dwellMs: 7000,
  },
  {
    id: "andromeda",
    target: { kind: "radec", ra: 10.6847, dec: 41.2691 }, // M31
    fov: 22,
    title: "Andromeda — M31",
    body: "The nearest large galaxy, 2.5 million light years away, with a trillion stars. In 4 billion years it will collide with our Milky Way.",
    wavelengthHint: "near-ir",
    dwellMs: 8000,
  },
  {
    id: "pleiades",
    target: { kind: "radec", ra: 56.85, dec: 24.117 }, // M45
    fov: 14,
    title: "Pleiades — M45",
    body: "The Seven Sisters: a young open cluster only ~100 million years old, wrapped in the dust of the cloud they were born from.",
    wavelengthHint: "visible",
    dwellMs: 7000,
  },
  {
    id: "orion",
    target: { kind: "radec", ra: 83.8221, dec: -5.3911 }, // M42 / Orion Nebula
    fov: 14,
    title: "Orion Nebula — M42",
    body: "A stellar nursery 1,344 light-years away where new stars are being born right now from the collapse of giant molecular clouds.",
    wavelengthHint: "mid-ir",
    dwellMs: 7000,
  },
  {
    id: "galactic-center",
    target: { kind: "radec", ra: 266.4168, dec: -29.0078 }, // Sgr A*
    fov: 18,
    title: "Galactic Center — Sgr A*",
    body: "The supermassive black hole at the heart of the Milky Way, 26,000 light years away. Visible-light surveys are blocked by dust — but X-ray and infrared see right through.",
    wavelengthHint: "x-ray",
    dwellMs: 8500,
  },
  {
    id: "crab-nebula",
    target: { kind: "radec", ra: 83.6331, dec: 22.0144 }, // M1
    fov: 8,
    title: "Crab Nebula — M1",
    body: "The aftermath of a supernova Chinese astronomers recorded in 1054 AD. The pulsar at its core spins 30 times per second, lighting up the gas it expelled.",
    wavelengthHint: "x-ray",
    dwellMs: 7500,
  },
  {
    id: "large-magellanic-cloud",
    target: { kind: "radec", ra: 80.8939, dec: -69.7561 }, // LMC
    fov: 24,
    title: "Large Magellanic Cloud",
    body: "A satellite galaxy of the Milky Way, ~163,000 light-years away. Visible to the naked eye from the Southern Hemisphere as a fuzzy patch.",
    wavelengthHint: "visible",
    dwellMs: 7000,
  },
  {
    id: "jupiter",
    target: { kind: "body", name: "Jupiter" },
    fov: 6,
    title: "Jupiter + the Galilean Moons",
    body: "Largest planet in our solar system. Zoom in past 6° FOV after the tour and you'll see Io, Europa, Ganymede, and Callisto — the four moons Galileo found in 1610.",
    dwellMs: 7500,
  },
  {
    id: "voyager-1",
    target: { kind: "radec", ra: 269.4, dec: 12.4 },
    fov: 30,
    title: "Voyager 1 — interstellar space",
    body: "Toggle the ◇ CRAFT layer (or press s) and the cyan marker shows where Voyager 1 is in the sky right now — ~166 AU away, near Rasalhague in Ophiuchus, the most distant human-made object in history.",
    dwellMs: 8500,
  },
];

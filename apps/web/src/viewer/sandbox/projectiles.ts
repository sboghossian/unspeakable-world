import type { LaunchSpeed, ProjectileKind, ProjectilePreset } from "./types";

/**
 * Projectile presets. Masses in Earth masses (M⊕). Physical radii in AU
 * are heavily exaggerated above true values so collisions in the sandbox
 * are visible at normal play distances — true planetary radii (~4e-5 AU
 * for Earth) would never trigger in a sub-AU sim.
 */
export const PROJECTILES: Record<ProjectileKind, ProjectilePreset> = {
  comet: {
    kind: "comet",
    label: "Comet",
    mass: 1e-9,
    radius: 0.002,
    visualRadius: 0.02,
    color: 0x9be7ff,
    glow: 0xc8f4ff,
  },
  earth: {
    kind: "earth",
    label: "Earth",
    mass: 1.0,
    radius: 0.01,
    visualRadius: 0.04,
    color: 0x4a9bff,
    glow: 0x8ec1ff,
  },
  jupiter: {
    kind: "jupiter",
    label: "Jupiter",
    mass: 317.8,
    radius: 0.025,
    visualRadius: 0.1,
    color: 0xd9a06b,
    glow: 0xe9c690,
  },
  "brown-dwarf": {
    kind: "brown-dwarf",
    label: "Brown Dwarf",
    mass: 13000,
    radius: 0.04,
    visualRadius: 0.15,
    color: 0xa14f3a,
    glow: 0xc56b50,
  },
  "white-dwarf": {
    kind: "white-dwarf",
    label: "White Dwarf",
    mass: 200000,
    radius: 0.03,
    visualRadius: 0.08,
    color: 0xeaf2ff,
    glow: 0xb6c8ff,
  },
  "neutron-star": {
    kind: "neutron-star",
    label: "Neutron Star",
    mass: 467000,
    radius: 0.02,
    visualRadius: 0.05,
    color: 0xffffff,
    glow: 0x9bb6ff,
  },
  "black-hole": {
    kind: "black-hole",
    label: "Black Hole",
    mass: 1e6,
    radius: 0.025,
    visualRadius: 0.07,
    color: 0x000000,
    glow: 0xff8c2a,
  },
};

export const PROJECTILE_ORDER: ProjectileKind[] = [
  "comet",
  "earth",
  "jupiter",
  "brown-dwarf",
  "white-dwarf",
  "neutron-star",
  "black-hole",
];

/** Multiplier on the base launch speed (~circular at 1 AU = 1 in sandbox units). */
export const LAUNCH_SPEED_MULT: Record<LaunchSpeed, number> = {
  slow: 0.3,
  normal: 1.0,
  fast: 3.0,
  extreme: 10.0,
  "near-light": 100.0,
};

export const LAUNCH_SPEED_LABEL: Record<LaunchSpeed, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
  extreme: "Extreme",
  "near-light": "Near-light",
};

/** Base launch speed reference: roughly circular orbital velocity at 1 AU around the Sun. */
export const BASE_LAUNCH_SPEED = 0.0172; // AU/day, ≈ 29.78 km/s

export type ProjectileKind =
  | "comet"
  | "earth"
  | "jupiter"
  | "brown-dwarf"
  | "white-dwarf"
  | "neutron-star"
  | "black-hole";

export type ProjectilePreset = {
  kind: ProjectileKind;
  label: string;
  /** Earth masses (M⊕). */
  mass: number;
  /** Physical radius for collisions, in AU. */
  radius: number;
  /** Visual radius hint for rendering, in AU. Decoupled from physical radius. */
  visualRadius: number;
  color: number;
  /** Optional glow color (sprite tint). */
  glow?: number;
};

export type BodyKind = ProjectileKind | "sun" | "planet";

/**
 * A simulated body in the sandbox.
 *
 * Internal units throughout the sandbox:
 *   length = AU
 *   mass   = Earth masses (M⊕)
 *   time   = days
 * with G = 8.887692593e-10 AU³ · M⊕⁻¹ · d⁻².
 */
export type Body = {
  id: number;
  kind: BodyKind;
  label: string;
  /** Earth masses. */
  mass: number;
  /** Physical radius for collision detection, in AU. */
  radius: number;
  visualRadius: number;
  color: number;
  position: [number, number, number];
  velocity: [number, number, number];
  /** Previous-step acceleration (Verlet companion). */
  acceleration: [number, number, number];
  /** Whether the body is fixed in place (used for "anchor" mode if we add it). */
  pinned: boolean;
  /** Rolling history of recent positions for the trail. Newest last. */
  trail: Array<[number, number, number]>;
};

export type SandboxScenePreset =
  | "inner-solar"
  | "sun-earth"
  | "empty"
  | "binary";

export type LaunchSpeed = "slow" | "normal" | "fast" | "extreme" | "near-light";
export type SimSpeedKey = "1d" | "7d" | "30d" | "6mo" | "1y";

/** Public state the React shell needs to render. */
export type SandboxState = {
  bodyCount: number;
  selectedKind: ProjectileKind;
  launchSpeed: LaunchSpeed;
  simSpeed: SimSpeedKey;
  scenePreset: SandboxScenePreset;
  paused: boolean;
  fps: number;
};

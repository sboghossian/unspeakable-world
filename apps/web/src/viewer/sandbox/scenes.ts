import type { Body, SandboxScenePreset } from "./types";
import { circularSpeed } from "./physics";

/** Sun mass in Earth masses. */
const SUN_MASS = 332946.04;

/** Sun "physical radius" used for sandbox collisions, in AU. Real value
 *  ≈ 4.65e-3 AU; we keep the same scale so close approaches feel right. */
const SUN_RADIUS = 0.0046;

let nextId = 1;

function makeBody(partial: Omit<Body, "id" | "trail" | "acceleration">): Body {
  return {
    id: nextId++,
    trail: [],
    acceleration: [0, 0, 0],
    ...partial,
  };
}

/** Reset the id generator. Useful in tests / re-init. */
export function resetIds(): void {
  nextId = 1;
}

/** A standalone Sun, anchored at the origin. */
function makeSun(): Body {
  return makeBody({
    kind: "sun",
    label: "Sun",
    mass: SUN_MASS,
    radius: SUN_RADIUS,
    visualRadius: 0.12,
    color: 0xffd27a,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    pinned: false,
  });
}

type PlanetSpec = {
  label: string;
  radius: number; // physical radius in AU (exaggerated for sandbox)
  visualRadius: number;
  color: number;
  /** Orbit radius in AU. */
  a: number;
  /** Mass in Earth masses. */
  mass: number;
};

const PLANETS: PlanetSpec[] = [
  {
    label: "Mercury",
    radius: 0.005,
    visualRadius: 0.025,
    color: 0xa39074,
    a: 0.39,
    mass: 0.055,
  },
  {
    label: "Venus",
    radius: 0.007,
    visualRadius: 0.035,
    color: 0xd8b06a,
    a: 0.72,
    mass: 0.815,
  },
  {
    label: "Earth",
    radius: 0.008,
    visualRadius: 0.04,
    color: 0x4a9bff,
    a: 1.0,
    mass: 1.0,
  },
  {
    label: "Mars",
    radius: 0.006,
    visualRadius: 0.03,
    color: 0xd6663f,
    a: 1.52,
    mass: 0.107,
  },
  {
    label: "Jupiter",
    radius: 0.02,
    visualRadius: 0.085,
    color: 0xd9a06b,
    a: 5.2,
    mass: 317.8,
  },
];

function makePlanet(spec: PlanetSpec, theta: number): Body {
  const v = circularSpeed(SUN_MASS, spec.a);
  return makeBody({
    kind: "planet",
    label: spec.label,
    mass: spec.mass,
    radius: spec.radius,
    visualRadius: spec.visualRadius,
    color: spec.color,
    position: [spec.a * Math.cos(theta), 0, spec.a * Math.sin(theta)],
    velocity: [-v * Math.sin(theta), 0, v * Math.cos(theta)],
    pinned: false,
  });
}

export function buildScene(preset: SandboxScenePreset): Body[] {
  resetIds();
  if (preset === "empty") {
    return [makeSun()];
  }

  if (preset === "sun-earth") {
    return [makeSun(), makePlanet(PLANETS[2]!, 0)];
  }

  if (preset === "binary") {
    // Two equal-mass suns in a tight circular pair. Separation 0.5 AU.
    const sep = 0.5;
    const m = SUN_MASS;
    // For an equal-mass binary in a circular orbit, each orbits the
    // center of mass at radius sep/2 with speed v = sqrt(G·M_tot / (4·a))
    // where a = sep/2. Using circularSpeed against M for total mass works
    // because each body sees the other's gravity at distance sep.
    const v = Math.sqrt((8.887692593e-10 * m) / sep) * 0.5;
    return [
      makeBody({
        kind: "sun",
        label: "Sun A",
        mass: m,
        radius: SUN_RADIUS,
        visualRadius: 0.12,
        color: 0xffd27a,
        position: [-sep / 2, 0, 0],
        velocity: [0, 0, -v],
        pinned: false,
      }),
      makeBody({
        kind: "sun",
        label: "Sun B",
        mass: m,
        radius: SUN_RADIUS,
        visualRadius: 0.12,
        color: 0xffb070,
        position: [sep / 2, 0, 0],
        velocity: [0, 0, v],
        pinned: false,
      }),
    ];
  }

  // inner-solar (default)
  const bodies: Body[] = [makeSun()];
  for (let i = 0; i < PLANETS.length; i++) {
    const p = PLANETS[i]!;
    // Stagger initial true anomalies so the scene isn't a line.
    const theta = (i * 2 * Math.PI) / PLANETS.length;
    bodies.push(makePlanet(p, theta));
  }
  return bodies;
}

/** Allocate a fresh ID for a launched body. */
export function freshId(): number {
  return nextId++;
}

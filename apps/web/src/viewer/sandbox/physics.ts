import type { Body } from "./types";

/**
 * Gravitational constant in sandbox units:
 *   length = AU, mass = Earth masses (M⊕), time = days.
 *
 * Derived from G_SI = 6.6743e-11 m³ · kg⁻¹ · s⁻² with
 *   1 M⊕ = 5.972e24 kg, 1 AU = 1.495978707e11 m, 1 d = 86400 s.
 */
export const G = 8.887692593e-10;

/** Softening to avoid singularities at very close passages, in AU. */
const EPSILON = 1e-3;

/** Trail history length per body. */
const TRAIL_MAX = 500;

/**
 * Compute acceleration on every body from every other body's gravity.
 * Writes back into `b.acceleration` in place.
 */
export function computeAccelerations(bodies: Body[]): void {
  const n = bodies.length;
  const eps2 = EPSILON * EPSILON;
  for (let i = 0; i < n; i++) {
    const bi = bodies[i];
    if (!bi || bi.pinned) {
      if (bi) {
        bi.acceleration[0] = 0;
        bi.acceleration[1] = 0;
        bi.acceleration[2] = 0;
      }
      continue;
    }
    let ax = 0;
    let ay = 0;
    let az = 0;
    const [xi, yi, zi] = bi.position;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const bj = bodies[j];
      if (!bj) continue;
      const dx = bj.position[0] - xi;
      const dy = bj.position[1] - yi;
      const dz = bj.position[2] - zi;
      const r2 = dx * dx + dy * dy + dz * dz + eps2;
      const invR = 1 / Math.sqrt(r2);
      const invR3 = invR / r2;
      const f = G * bj.mass * invR3;
      ax += f * dx;
      ay += f * dy;
      az += f * dz;
    }
    bi.acceleration[0] = ax;
    bi.acceleration[1] = ay;
    bi.acceleration[2] = az;
  }
}

/**
 * Advance the simulation by `dt` days using velocity Verlet.
 *
 * Verlet:
 *   x_{n+1} = x_n + v_n · dt + 0.5 · a_n · dt²
 *   a_{n+1} = a(x_{n+1})
 *   v_{n+1} = v_n + 0.5 · (a_n + a_{n+1}) · dt
 *
 * Bodies must already have valid `acceleration` from a prior
 * `computeAccelerations` call (or be freshly initialized to zero).
 */
export function stepVerlet(bodies: Body[], dt: number): void {
  const halfDt2 = 0.5 * dt * dt;

  // 1. Drift positions with current velocity and acceleration.
  for (const b of bodies) {
    if (!b || b.pinned) continue;
    b.position[0] += b.velocity[0] * dt + b.acceleration[0] * halfDt2;
    b.position[1] += b.velocity[1] * dt + b.acceleration[1] * halfDt2;
    b.position[2] += b.velocity[2] * dt + b.acceleration[2] * halfDt2;
  }

  // 2. Save old accelerations so we can complete the half-kick after the
  //    new accelerations are computed.
  const oldAx = new Float64Array(bodies.length);
  const oldAy = new Float64Array(bodies.length);
  const oldAz = new Float64Array(bodies.length);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (!b) continue;
    oldAx[i] = b.acceleration[0];
    oldAy[i] = b.acceleration[1];
    oldAz[i] = b.acceleration[2];
  }

  // 3. Compute new accelerations at the drifted positions.
  computeAccelerations(bodies);

  // 4. Kick velocities by the average of old and new accelerations.
  const halfDt = 0.5 * dt;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (!b || b.pinned) continue;
    b.velocity[0] += (oldAx[i]! + b.acceleration[0]) * halfDt;
    b.velocity[1] += (oldAy[i]! + b.acceleration[1]) * halfDt;
    b.velocity[2] += (oldAz[i]! + b.acceleration[2]) * halfDt;
  }
}

/**
 * Resolve collisions in place. Two bodies collide when their centers are
 * closer than (r_a + r_b). The more massive absorbs the other:
 *
 *   m' = m_a + m_b
 *   v' = (m_a · v_a + m_b · v_b) / m'
 *   r' = (r_a³ + r_b³)^(1/3)   (volume preserved)
 *
 * Returns the IDs of bodies absorbed (caller can filter the list).
 */
export function resolveCollisions(bodies: Body[]): number[] {
  const absorbed: number[] = [];
  const removed = new Set<number>();
  for (let i = 0; i < bodies.length; i++) {
    if (removed.has(i)) continue;
    const a = bodies[i];
    if (!a) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      if (removed.has(j)) continue;
      const b = bodies[j];
      if (!b) continue;
      const dx = a.position[0] - b.position[0];
      const dy = a.position[1] - b.position[1];
      const dz = a.position[2] - b.position[2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (r >= a.radius + b.radius) continue;

      const heavier = a.mass >= b.mass ? a : b;
      const lighter = heavier === a ? b : a;
      const lighterIdx = heavier === a ? j : i;
      const totalMass = heavier.mass + lighter.mass;

      heavier.velocity[0] =
        (heavier.mass * heavier.velocity[0] +
          lighter.mass * lighter.velocity[0]) /
        totalMass;
      heavier.velocity[1] =
        (heavier.mass * heavier.velocity[1] +
          lighter.mass * lighter.velocity[1]) /
        totalMass;
      heavier.velocity[2] =
        (heavier.mass * heavier.velocity[2] +
          lighter.mass * lighter.velocity[2]) /
        totalMass;

      heavier.mass = totalMass;
      heavier.radius = Math.cbrt(
        heavier.radius ** 3 + lighter.radius ** 3,
      );

      removed.add(lighterIdx);
      absorbed.push(lighter.id);
      if (lighterIdx === i) break; // a was absorbed; stop pairing it
    }
  }
  if (removed.size > 0) {
    // Compact the array in place: caller passes by reference, we splice.
    // We iterate descending so indices stay valid.
    const sortedDesc = [...removed].sort((p, q) => q - p);
    for (const idx of sortedDesc) bodies.splice(idx, 1);
  }
  return absorbed;
}

/** Append the current position to a body's trail buffer, capped at TRAIL_MAX. */
export function pushTrail(b: Body): void {
  b.trail.push([b.position[0], b.position[1], b.position[2]]);
  if (b.trail.length > TRAIL_MAX) b.trail.shift();
}

/** Total kinetic + potential energy. Useful for invariant checks. */
export function totalEnergy(bodies: Body[]): number {
  let ke = 0;
  let pe = 0;
  for (const b of bodies) {
    if (!b) continue;
    const v2 =
      b.velocity[0] ** 2 + b.velocity[1] ** 2 + b.velocity[2] ** 2;
    ke += 0.5 * b.mass * v2;
  }
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (!b) continue;
      const dx = a.position[0] - b.position[0];
      const dy = a.position[1] - b.position[1];
      const dz = a.position[2] - b.position[2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz + EPSILON * EPSILON);
      pe -= (G * a.mass * b.mass) / r;
    }
  }
  return ke + pe;
}

/**
 * Circular-orbit speed for a body of mass `m` at radius `r` around a
 * central mass `M`, in sandbox units.
 *   v = sqrt(G · M / r)
 */
export function circularSpeed(M: number, r: number): number {
  return Math.sqrt((G * M) / r);
}

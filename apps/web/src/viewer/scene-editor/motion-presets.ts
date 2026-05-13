/**
 * 🎬 Cinematic motion presets for the Scene Editor.
 *
 * Each preset is a tiny pure generator: given a `target`, a `startPos`,
 * and a wall-clock `durationSec`, it returns a list of {@link MotionKeyframe}s
 * — `{ t, position, lookAt, fov? }` tuples where `t` is the normalised
 * playback fraction (0 = start, 1 = end). The Scene Editor panel turns
 * those into the project's own {@link Keyframe} blobs by sampling the
 * `t` axis into transition + hold millisecond pairs and packing the
 * position / lookAt vectors into the existing camera blob shape.
 *
 * The presets are *purely procedural* — they don't read state from any
 * Three.js scene. That means they're testable in isolation, deterministic,
 * and work for both `solar` and `universe` mode (the panel decides which
 * camera blob shape to emit).
 *
 * All presets emit 8–16 keyframes (we deliberately overshoot a tiny bit
 * for spline-y presets like the spiral & slingshot, since the runner's
 * `easeInOutCubic` works best with denser samples).
 */
import { Vector3 } from "three";

/**
 * One sample along a procedural camera path. `t` is the normalised
 * playback fraction in [0, 1]; the panel turns adjacent (t_i, t_{i+1})
 * pairs into a transition/hold pair scaled by the user-chosen duration.
 */
export type MotionKeyframe = {
  t: number;
  position: Vector3;
  lookAt: Vector3;
  fov?: number;
};

/**
 * Public contract for a motion preset. `generate` is pure and
 * deterministic — same inputs, same keyframes.
 */
export type MotionPreset = {
  id: string;
  label: string;
  description: string;
  generate(
    target: Vector3,
    startPos: Vector3,
    durationSec: number,
  ): MotionKeyframe[];
};

// ────────────────────────────────────────────────────────────────────
// Small math helpers (kept local — these don't earn a shared module).
// ────────────────────────────────────────────────────────────────────

/** Quadratic Bezier between three control points, at parameter `t`. */
function bezierQuadratic(
  p0: Vector3,
  p1: Vector3,
  p2: Vector3,
  t: number,
): Vector3 {
  const u = 1 - t;
  const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
  const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
  const z = u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z;
  return new Vector3(x, y, z);
}

/** Cubic Bezier between four control points, at parameter `t`. */
function bezierCubic(
  p0: Vector3,
  p1: Vector3,
  p2: Vector3,
  p3: Vector3,
  t: number,
): Vector3 {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  const x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x;
  const y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;
  const z = b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z;
  return new Vector3(x, y, z);
}

/** Linear interpolation between two vectors. */
function lerpVec(a: Vector3, b: Vector3, t: number): Vector3 {
  return new Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  );
}

/** Cubic ease-in-out — same curve scene-runner.ts uses. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Produce N samples in [0, 1] evenly spaced (inclusive of both ends). */
function linspace(n: number): number[] {
  if (n <= 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i / (n - 1));
  return out;
}

/**
 * Build an orthonormal "orbit frame" around `target` given a viewing
 * direction `from → target`. Returns `{ radial, tangent, up }` unit
 * vectors. `up` is world-Y when possible, falling back to world-X if
 * the radial is nearly vertical (avoids gimbal lock at the poles).
 */
function orbitFrame(
  target: Vector3,
  from: Vector3,
): { radial: Vector3; tangent: Vector3; up: Vector3; radius: number } {
  const radialRaw = new Vector3().subVectors(from, target);
  const radius = Math.max(radialRaw.length(), 1e-6);
  const radial = radialRaw.clone().divideScalar(radius);
  const worldUp = new Vector3(0, 1, 0);
  // If radial is nearly parallel to worldUp, swap to worldX so cross
  // products stay numerically stable.
  let up = worldUp;
  if (Math.abs(radial.dot(worldUp)) > 0.95) up = new Vector3(1, 0, 0);
  // tangent = up × radial (right-handed orbit direction)
  const tangent = new Vector3().crossVectors(up, radial).normalize();
  // recompute up so {radial, tangent, up} is orthonormal
  const upOrtho = new Vector3().crossVectors(radial, tangent).normalize();
  return { radial, tangent, up: upOrtho, radius };
}

/** Place a camera at `(radial, tangent, up)` mix around `target` at `radius`. */
function orbitPoint(
  target: Vector3,
  radial: Vector3,
  tangent: Vector3,
  up: Vector3,
  radius: number,
  azimuthRad: number,
  elevationRad: number,
): Vector3 {
  const cosE = Math.cos(elevationRad);
  const sinE = Math.sin(elevationRad);
  const cosA = Math.cos(azimuthRad);
  const sinA = Math.sin(azimuthRad);
  const r = radial.clone().multiplyScalar(cosE * cosA);
  const t = tangent.clone().multiplyScalar(cosE * sinA);
  const u = up.clone().multiplyScalar(sinE);
  return new Vector3().addVectors(target, r.add(t).add(u).multiplyScalar(radius));
}

// ────────────────────────────────────────────────────────────────────
// Presets (1) Bezier orbit
// ────────────────────────────────────────────────────────────────────

const bezierOrbit: MotionPreset = {
  id: "bezier-orbit",
  label: "Bezier orbit",
  description:
    "Smooth elliptical orbit around the target with asymmetric speed " +
    "via cubic Bezier control points — slow at the apexes, fast at the " +
    "near pass.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    // Cubic Bezier control points around the orbit ellipse. The middle
    // two CPs sit at ±90° but slightly outside the radius so the camera
    // sweeps wider and slower at the far side — gives a cinematic
    // "long-side, short-side" feel.
    const cp0 = orbitPoint(target, radial, tangent, up, radius, 0, 0);
    const cp1 = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 1.4,
      Math.PI * 0.45,
      0.15,
    );
    const cp2 = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 0.85,
      Math.PI * 1.35,
      -0.05,
    );
    const cp3 = orbitPoint(target, radial, tangent, up, radius, Math.PI * 2, 0);
    const ts = linspace(12);
    return ts.map((t) => ({
      t,
      position: bezierCubic(cp0, cp1, cp2, cp3, t),
      lookAt: target.clone(),
    }));
  },
};

// ────────────────────────────────────────────────────────────────────
// (2) Linear dolly
// ────────────────────────────────────────────────────────────────────

const linearDolly: MotionPreset = {
  id: "linear-dolly",
  label: "Linear dolly",
  description:
    "Straight push from start toward (1.05× past) the target at a " +
    "constant rate — the classic dolly-in.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    // Push to ~12% short of the target so we don't punch through it.
    const end = lerpVec(startPos, target, 0.88);
    const ts = linspace(10);
    return ts.map((t) => ({
      t,
      position: lerpVec(startPos, end, t),
      lookAt: target.clone(),
    }));
  },
};

// ────────────────────────────────────────────────────────────────────
// (3) Crane overview
// ────────────────────────────────────────────────────────────────────

const craneOverview: MotionPreset = {
  id: "crane-overview",
  label: "Crane overview",
  description:
    "Start high above the target and descend toward eye level while " +
    "keeping the target framed — like a crane shot drifting down to " +
    "the establishing angle.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    // Begin near the zenith, end near the original azimuth at low elevation.
    const ts = linspace(12);
    return ts.map((t) => {
      const eased = easeInOutCubic(t);
      const elevation = (1 - eased) * (Math.PI * 0.42) + eased * 0.1;
      const azimuth = eased * 0.25; // slight drift while descending
      const r = radius * (1 + (1 - eased) * 0.6); // start a bit higher/farther
      return {
        t,
        position: orbitPoint(target, radial, tangent, up, r, azimuth, elevation),
        lookAt: target.clone(),
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// (4) Sine float
// ────────────────────────────────────────────────────────────────────

const sineFloat: MotionPreset = {
  id: "sine-float",
  label: "Sine float",
  description:
    "Gentle vertical bob while slowly orbiting — feels like the camera " +
    "is on a Steadicam drifting in zero-g.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    const ts = linspace(14);
    return ts.map((t) => {
      const azimuth = t * Math.PI * 0.6; // gentle 108° sweep
      const elevation = Math.sin(t * Math.PI * 3) * 0.18; // ±~10°
      return {
        t,
        position: orbitPoint(
          target,
          radial,
          tangent,
          up,
          radius,
          azimuth,
          elevation,
        ),
        lookAt: target.clone(),
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// (5) Swoop dive
// ────────────────────────────────────────────────────────────────────

const swoopDive: MotionPreset = {
  id: "swoop-dive",
  label: "Swoop dive",
  description:
    "Fast approach from a high distance, decelerating sharply on " +
    "final approach — the gravitational swoop.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    // Start far above & behind; end close in & roughly head-on.
    const apex = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 2.2,
      -0.15,
      0.55,
    );
    const mid = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 0.9,
      0.1,
      0.18,
    );
    const finalPos = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 0.25,
      0.2,
      0.05,
    );
    const ts = linspace(12);
    return ts.map((t) => {
      // ease-out cubic: fast early, slow late
      const eased = 1 - Math.pow(1 - t, 3);
      return {
        t,
        position: bezierQuadratic(apex, mid, finalPos, eased),
        lookAt: target.clone(),
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// (6) Orbital wrap
// ────────────────────────────────────────────────────────────────────

const orbitalWrap: MotionPreset = {
  id: "orbital-wrap",
  label: "Orbital wrap",
  description:
    "Full 360° rotation around the target with a level horizon — the " +
    "classic showcase shot.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    const ts = linspace(13); // 12 segments → ~30° each
    return ts.map((t) => ({
      t,
      position: orbitPoint(
        target,
        radial,
        tangent,
        up,
        radius,
        t * Math.PI * 2,
        0,
      ),
      lookAt: target.clone(),
    }));
  },
};

// ────────────────────────────────────────────────────────────────────
// (7) Spiral flythrough
// ────────────────────────────────────────────────────────────────────

const spiralFlythrough: MotionPreset = {
  id: "spiral-flythrough",
  label: "Spiral flythrough",
  description:
    "Helical approach — orbits the target while simultaneously closing " +
    "in. Two full revolutions across the duration.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    const ts = linspace(16);
    return ts.map((t) => {
      const azimuth = t * Math.PI * 4; // two full turns
      const elevation = (0.4 - t * 0.35) * Math.sin(t * Math.PI); // gentle bow
      const r = radius * (1 - 0.75 * t); // close to 25% of starting radius
      return {
        t,
        position: orbitPoint(
          target,
          radial,
          tangent,
          up,
          Math.max(r, radius * 0.15),
          azimuth,
          elevation,
        ),
        lookAt: target.clone(),
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// (8) Slingshot arc
// ────────────────────────────────────────────────────────────────────

const slingshotArc: MotionPreset = {
  id: "slingshot-arc",
  label: "Slingshot arc",
  description:
    "Pass close to the target along a hyperbolic-ish arc, then fly out " +
    "to the opposite side — the gravitational slingshot.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    const periapsis = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 0.18,
      Math.PI * 0.5,
      0.08,
    );
    const exitFar = orbitPoint(
      target,
      radial,
      tangent,
      up,
      radius * 1.5,
      Math.PI,
      0.25,
    );
    const ts = linspace(14);
    return ts.map((t) => ({
      t,
      // Cubic Bezier: start → drift-in CP → periapsis → exit-far.
      position: bezierCubic(
        startPos.clone(),
        lerpVec(startPos, periapsis, 0.55),
        periapsis,
        exitFar,
        t,
      ),
      lookAt: target.clone(),
    }));
  },
};

// ────────────────────────────────────────────────────────────────────
// (9) Pendulum swing
// ────────────────────────────────────────────────────────────────────

const pendulumSwing: MotionPreset = {
  id: "pendulum-swing",
  label: "Pendulum swing",
  description:
    "Back-and-forth azimuthal swing across the target — like a giant " +
    "pendulum tracing an arc above it.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    const ts = linspace(14);
    return ts.map((t) => {
      // Pendulum-style: cos curve gives a swing that slows at extremes.
      const azimuth = Math.sin(t * Math.PI * 2) * 0.9; // ~±51°
      const elevation = 0.15 + Math.cos(t * Math.PI * 2) * 0.05;
      return {
        t,
        position: orbitPoint(
          target,
          radial,
          tangent,
          up,
          radius,
          azimuth,
          elevation,
        ),
        lookAt: target.clone(),
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// (10) Hyperdrive
// ────────────────────────────────────────────────────────────────────

const hyperdrive: MotionPreset = {
  id: "hyperdrive",
  label: "Hyperdrive",
  description:
    "Aggressive linear push — target swells fast. The FOV is narrowed " +
    "slightly mid-flight to mimic a motion-blur warp feel even without " +
    "a post-effect.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    // Punch in to ~5% short of the target with exponential easing.
    const end = lerpVec(startPos, target, 0.95);
    const ts = linspace(10);
    return ts.map((t) => {
      const eased = Math.pow(t, 1.8); // accelerate, then crash
      // Narrow FOV slightly mid-flight (~70° → ~52° → ~60°)
      const fov = 70 - Math.sin(t * Math.PI) * 18;
      return {
        t,
        position: lerpVec(startPos, end, eased),
        lookAt: target.clone(),
        fov,
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// (11) Pull focus
// ────────────────────────────────────────────────────────────────────

const pullFocus: MotionPreset = {
  id: "pull-focus",
  label: "Pull focus",
  description:
    "Slow pull-back from near the target — the scale opens up around " +
    "the framed subject. Reverse of the dolly.",
  generate(target, startPos, _durationSec): MotionKeyframe[] {
    // Pull out to 2.5× the original radius.
    const { radial, tangent, up, radius } = orbitFrame(target, startPos);
    const ts = linspace(10);
    return ts.map((t) => {
      const eased = easeInOutCubic(t);
      const r = radius * (1 + eased * 1.5);
      return {
        t,
        position: orbitPoint(target, radial, tangent, up, r, 0, 0),
        lookAt: target.clone(),
      };
    });
  },
};

// ────────────────────────────────────────────────────────────────────
// Public registry
// ────────────────────────────────────────────────────────────────────

export const MOTION_PRESETS: readonly MotionPreset[] = [
  bezierOrbit,
  linearDolly,
  craneOverview,
  sineFloat,
  swoopDive,
  orbitalWrap,
  spiralFlythrough,
  slingshotArc,
  pendulumSwing,
  hyperdrive,
  pullFocus,
];

export function getMotionPreset(id: string): MotionPreset | null {
  return MOTION_PRESETS.find((p) => p.id === id) ?? null;
}

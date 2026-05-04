# Universe Mode — design notes

## Goal
A single seamless scene that handles every scale from a planet's surface
to the cosmic web, with one camera and one set of controls.

## The float-precision problem
- 1 AU ≈ 1.58 × 10⁻⁵ light-years
- Sun sits ~26,000 LY from the galactic center
- WebGL shaders use `float32` (≈7 significant digits)
- Earth's orbit at radius 1.58e-5 — at distance 26,000 from origin —
  cannot be resolved without losing precision

## Solution: tier-aware coordinate frames + camera-relative rendering

Two render frames live in the same `Scene`:

- **Galactic frame**: 1 unit = 1 LY (kly). Sun, MW disk, cosmic web.
- **Solar frame**: 1 unit = 1 AU. Planets, orbits, moons.

Both are placed at world-space position `(0,0,0)`. The "logical
position" of the Sun in the galactic frame (26,000, 0, 0) lives only
in the camera-relative offset. Each frame's `Group` has a `.position`
that re-anchors so that whichever feature the camera is closest to
sits near `(0,0,0)` in world space — float32 stays accurate.

## Camera state

Single `Vector3 logicalPos` — the camera's "true" position in galactic
units (LY from galactic center). On each tick:

1. Compute distance from Sun in LY: `d = |logicalPos - SUN_LY|`.
2. Pick the active tier:
   - `d < 0.001 LY` (~63 AU) → Solar tier
   - else → Galactic tier
3. Translate scene groups so the camera sits at world `(0,0,0)`:
   - Galactic group: `pos = -logicalPos` (in LY)
   - Solar group: `pos = (logicalPos - SUN_LY) * 63241` (LY → AU,
     negated to put camera at world origin)
4. Render normally; the camera literally stays at world (0,0,0)
   with a fixed orientation matrix derived from yaw/pitch.

## Layer visibility

Each group has an opacity uniform driven by camera distance:

| Distance from Sun | Solar group | Galactic disk | Cosmic web | Stars |
|-------------------|-------------|----------------|------------|-------|
| < 100 AU          | 1.0         | 0.0            | 0.0        | 1.0   |
| 100 AU – 1 LY     | 1.0 → 0.0   | 0.0 → 0.4      | 0.0        | 1.0   |
| 1 LY – 100 LY     | 0.0         | 0.4            | 0.0        | 1.0   |
| 100 LY – 1 kly    | 0.0         | 0.4 → 1.0      | 0.0        | 1.0   |
| 1 kly – 100 kly   | 0.0         | 1.0            | 0.0 → 0.5  | 1.0   |
| > 100 kly         | 0.0         | 1.0 → 0.6      | 0.5 → 1.0  | 0.5   |

## Camera controls

- WASD: move at adaptive speed (faster when far, slower when near)
- Mouse drag: yaw + pitch
- Wheel: speed adjust
- Backtick: home (jump to default solar-system view)
- 1-8: jump to planets
- B: jump to galactic center
- N: jump to nearest galaxy (M31)
- F: focus mode (hide UI)

## Implementation plan

1. Build `UniverseScene` class with two groups + tier switching
2. Move solar-flight content (planets, orbits, atmosphere) into Solar group
3. Move galactic content (MW disk, arm points, cosmic web, labels) into Galactic group
4. Wire the tier-switching logic into the tick
5. Add `/#universe` route + lazy-loaded `Universe.tsx`
6. Add an "open in Universe" button on the landing page
7. Land it as the new default — the existing modes stay reachable as
   shortcuts but Universe is the headline experience.

## Out of scope (V1)

- Surface tier (terrain) — keeps existing per-planet `/#surface/<p>` route
- True 64-bit positions (would need WebGPU + custom precision shaders)
- Fully smooth in-between tier transitions (we cross-fade, not warp)

# Gravity Sandbox

Branch: `feat/gravity-sandbox`
Astrogrid parity item: tier 1, #8.

## Goal

A self-contained playground at `/#sandbox` where the user picks a
projectile, sets launch speed, click-to-launch into a starter scene
(Sun + a few planets), and watches an n-body simulation play out.
Fun first, physically-plausible second.

## Why a separate route

The realistic AstronomyEngine ephemeris in Universe / SolarFlight is
deterministic — bodies follow real orbits driven by the wall clock.
Gravity Sandbox needs to *mutate* state freely and apply forces. A
dedicated route with its own scene avoids any coupling.

## Units (simplified, internal)

- Position: AU
- Mass: Earth masses (M⊕)
- Time: days
- G in these units: `G = 8.887692593e-10 AU³ / (M⊕ · d²)`
  (derived: G_SI · (1 M⊕) · (1 d)² / (1 AU)³)

These units keep the dynamic range manageable in float32 and let
"Earth in a 1 AU orbit around 333,000 M⊕" Just Work.

## Physics

- **Integrator**: velocity Verlet (good drift behavior for n-body,
  pure functions, easy to test).
- **Step size**: adaptive — base 0.001 d, scale down near close
  encounters. Substeps capped at 16 / frame to keep frame budget.
- **Softening**: ε = 0.001 AU on the `1/r²` to avoid singularities
  when bodies pass close.
- **Body cap**: 64 bodies (8 default + 56 launches). Beyond that,
  oldest projectile gets recycled. n² update is fine at this scale.
- **Collision**: simple — when two bodies' centers are closer than
  `r_a + r_b`, the more massive one absorbs the lighter (mass +
  momentum conserved, the absorbed body is removed).

## Projectile presets

| Name        | Mass (M⊕) | Visual size | Color          | Notes                   |
| ----------- | --------- | ----------- | -------------- | ----------------------- |
| Comet       | 1e-9      | tiny        | pale cyan      | dusty tail              |
| Earth-class | 1.0       | small       | blue           | familiar baseline       |
| Jupiter     | 318       | medium      | tan / orange   | gas-giant ring          |
| Brown Dwarf | 13,000    | bigger      | dim red        | substellar              |
| White Dwarf | 200,000   | small       | white-blue     | dense                   |
| Neutron Star| 467,000   | very small  | piercing white | very dense              |
| Black Hole  | 1e6 – 1e9 | very small  | jet-black      | accretion-ring sprite   |

Speed selector multiplies a base orbital velocity at 1 AU around the
Sun (≈ 1.0 in our units):

| Slow | Normal | Fast | Extreme | Near-light |
| ---- | ------ | ---- | ------- | ---------- |
| 0.3× | 1.0×   | 3×   | 10×     | 100×       |

(Near-light is "fun fast," not relativistic — sandbox, not GR.)

## Sim speed

Decoupled from real-time. Time-strip presets:

`1 d/s · 7 d/s · 30 d/s · 6 mo/s · 1 yr/s`

## Starter scenes (selectable)

1. **Inner solar system**: Sun + 4 inner planets at circular orbits
2. **Sun + Earth**: minimal pair, easiest to see physics
3. **Empty**: just the Sun (or nothing) — pure launch playground
4. **Binary pair**: two equal-mass stars in a stable orbit

## UI

- Top-left panel: projectile picker (icon grid), speed dial, sim-speed
- Top-right: starter scene selector, Reset, Pause, body count, FPS
- Bottom hint: "Right-click anywhere to launch" / Esc to deselect
- When a body is selected: shows mass, speed, distance-from-Sun

## Render

- Each body: a small `Mesh` with a glow sprite. Size = log-scaled mass.
- Trail: `BufferGeometry` with rolling history of last 500 positions.
- Sun gets the same corona shader as solar-flight if cheap to import.
- Camera: orbit controls anchored to scene center, free to zoom.

## Files

- `apps/web/src/viewer/sandbox/types.ts` — Body / Projectile types
- `apps/web/src/viewer/sandbox/physics.ts` — Verlet, gravity, collisions
  (pure functions for easy reasoning; vitest can be added later when
  the project adopts a test runner)
- `apps/web/src/viewer/sandbox/projectiles.ts` — presets table
- `apps/web/src/viewer/sandbox/scenes.ts` — starter scenes
- `apps/web/src/viewer/sandbox/sandbox-scene.ts` — Three.js scene
- `apps/web/src/viewer/Sandbox.tsx` — React shell + UI
- `apps/web/src/router.ts` — add `/#sandbox` lazy route
- `apps/web/src/App.tsx` — wire sandbox route
- Entry-point button on Hero / Universe LeftRail

## Out of scope (V1)

- Relativistic effects (kept newtonian; "near-light" is cosmetic)
- Tidal forces / Roche limit visualization
- 3D camera-relative precision tricks (sandbox stays in solar tier
  scale; positions don't exceed ~50 AU in any practical play)
- Persistence — closing the tab resets the sandbox
- Sharing a sim state via URL (could come later)

## Verify

- [ ] `pnpm --filter web typecheck`
- [ ] `pnpm --filter web build`
- [ ] Manual: launch each projectile type; verify slingshot off Jupiter
- [ ] Manual: collision merges work (drop comet into Sun)

## Commit

`feat: day 69 — Gravity Sandbox (n-body playground)`

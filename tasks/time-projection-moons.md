# Time + Projection + Moons

Branch: `feat/time-scrubber-projection-moons`

## Plan

1. Continuous TimeStrip scrubber
   - [x] Add scope selector (±1d / ±1y / ±100y / ±10ky)
   - [x] Draggable thumb + range input for keyboard
   - [x] Log-symmetric mapping (default ±100y scope)
   - [x] Auto-pause on drag; keep buttons + presets working
   - [x] Keyboard arrow stepping with Shift modifier

2. Sky-Atlas 2D Aitoff projection
   - [x] `apps/web/src/viewer/sky-atlas/projection-shader.ts` GLSL helpers
   - [x] `skyProjection: '3d' | 'aitoff'` setting
   - [x] Toggle button in WavelengthBar
   - [x] ViewerScene `setProjection` method that swaps materials

3. Saturn / Uranus / Neptune (+ Mars) moons
   - [x] `apps/web/src/viewer/data/moons.ts` Keplerian elements
   - [x] `apps/web/src/viewer/universe/moons.ts` MoonField (GPU Kepler shader)
   - [x] Wire into universe-scene: `setMoons`, `moonsOn` state
   - [x] LeftRail toggle under "Celestial objects"
   - [x] Pickable, info payload via `moonFactsToPayload`

## Verify

- [ ] `pnpm --filter web exec tsc --noEmit`
- [ ] `pnpm --filter web build`

## Commit

- `feat: day 34 — time scrubber, 2D sky projection, planetary moons`

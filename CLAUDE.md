# Project: The Unspeakable World

> Project-specific overrides. Falls through to global `~/.claude/CLAUDE.md`.

## Hard constraints

- **License**: MIT for all source files. No GPL/AGPL dependencies, ever.
- **Timeline**: 7-day sprint. Cut scope, never quality.
- **Build in public**: every commit lands on `main` and pushes to public GitHub.
- **No console.log**: use `packages/core/src/logger.ts`.
- **TypeScript strict + `noUncheckedIndexedAccess`**.
- **Tailwind only**, no inline styles, no CSS modules.
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Architecture pillars

1. **Federate, don't ingest.** HiPS tiles stream from CDS/IRSA/ESASky CDN. We host nothing > 10 GB.
2. **Voyager camera default.** Target-anchored orbit + tap-to-fly. Pilot 6DOF is post-v1.
3. **Render-on-demand.** Pause `requestAnimationFrame` when camera idle > 250 ms (battery).
4. **R2 free egress** is the entire economic moat — never use a pay-per-GB CDN.

## Day-to-day rules

- Plan first → write to `tasks/todo.md` → verify before starting.
- Track with `TodoWrite`. One in-progress at a time.
- Update `README.md` after any user-visible feature.
- Add `lessons.md` entries when corrected.
- Test edges: empty, auth fail, network fail, malformed input.

## What this project is NOT (in v1)

- Not a planetarium (Stellarium does that).
- Not a spacecraft viewer (NASA Eyes does that).
- Not a 2D sky atlas (Aladin Lite does that).
- Not a procedural universe (SpaceEngine does that).
- It is **all of those, unified, in a browser, free**.

## Don't do these

- Don't add ECS abstractions in v1. Premature.
- Don't add accounts / Stripe / WebSocket auth. Free forever in v1.
- Don't ship a mobile tier system in v1. One quality preset.
- Don't ship a production HEALPix renderer in v1. Toy + documented bugs.
- Don't bundle CesiumJS in initial JS. Lazy-load only on planetary surface entry (Phase 2+).

## Reference docs

- Master plan: `tasks/todo.md`
- PRD: `/Users/stephaneboghossian/Documents/Code/docs/unspeakable-world-prd.md`
- Aladin Lite source (LGPL — read, don't copy): https://github.com/cds-astro/aladin-lite
- HEALPix Rust crate: https://github.com/cds-astro/cds-healpix-rust (MIT/Apache)

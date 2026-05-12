# The Unspeakable World — v3.1 7-Day Sprint

> **Constraints (locked 2026-04-30):**
>
> - Timeline: 7 days, working 24/7 with Claude
> - Solo builder, learn-as-we-go
> - **MIT everything**, pure OSS, monetize via hosted SaaS later (or never)
> - Audience: consumer-default, deep enough for the science-curious
> - **Never** monetize (in v1)
> - **Build in public**: GitHub repo public from commit #1
> - Domain: unspeakable-world.dashable.dev
> - Camera: Voyager (orbit + tap-to-fly), no Pilot mode in v1

---

## What ships in 7 days

Public OSS browser app at unspeakable-world.dashable.dev that:

1. Streams real HiPS sky tiles (DSS2 + 2MASS + WISE) onto a 3D sphere with free 6DOF Voyager camera
2. Renders Hipparcos bright stars with GPU instancing
3. Has accurate Sun/Moon/8 planets with time scrubbing (AstronomyEngine)
4. "Tonight's sky" mode with gyro/geolocation
5. ISS live position + tap-to-fly search across SIMBAD
6. Multi-wavelength cross-fade slider (the demo moment for HN)
7. Info panel with grounded data via SIMBAD/NED federated query

What it does NOT ship: production HEALPix renderer (toy only, polar seam bugs documented), Pilot 6DOF, planetary surface terrain (CesiumJS), mission archive, AI copilot, accounts, Stripe, mobile tier system, Kafka alert streams, SPICE kernels.

---

## Daily plan

### Day 1 — Foundation + Public Launch

- [ ] Monorepo: pnpm workspaces + Turborepo
- [ ] `apps/web`: Vite 6 + React 19 + TypeScript strict + Tailwind CSS
- [ ] `apps/api`: Cloudflare Worker (Hono) — TAP proxy + tile cache
- [ ] `packages/core`: Three.js scene shell, scene graph, multi-pass renderer
- [ ] Project CLAUDE.md (overrides global where needed)
- [ ] LICENSE (MIT)
- [ ] README with vision (cinematic, builds-in-public energy)
- [ ] Landing page: dark, animated, email capture, "coming this week" headline
- [ ] Cloudflare Pages + named tunnel for unspeakable-world.dashable.dev
- [ ] git init + first commit + push to public GitHub
- [ ] Tweet/X devlog Day 1 with screenshot

### Day 2-3 — HEALPix Toy Renderer (the moat spike)

- [ ] Vendor `cds-healpix-rust` (dual MIT/Apache) into `packages/wasm/healpix`
- [ ] `wasm-pack build --target web` → TS bindings
- [ ] `packages/healpix-renderer`: Three.js HEALPix sphere
  - 12 base tiles, NESTED scheme
  - UV sphere mesh per tile, fetch DSS2 color from `alasky.cds.unistra.fr` (with 200ms throttle)
  - Norder 3 children on zoom-in (no proper LOD switching, just 2 levels)
  - Document polar seam bug at lat ±41.81° as known issue
- [ ] Voyager camera (`packages/core/camera`):
  - Target-anchored orbit
  - Pinch / wheel zoom (logarithmic)
  - Tap-to-fly (Catmull-Rom path, ~1.5s eased)
  - Log-scale chip in corner: `42 km · 0.3 AU · 4.2 ly`
- [ ] Render-on-demand (pause rAF when camera idle >250ms)
- [ ] Day 3 devlog post

### Day 4 — Catalogs + Solar System

- [ ] Bundle Hipparcos (118K stars, ~5 MB Parquet) in `apps/web/public/data/`
- [ ] DuckDB-WASM in a Web Worker → query stars by magnitude
- [ ] GPU instanced star rendering, B-V → RGB shader
- [ ] AstronomyEngine integration: Sun + 8 planets + Moon
- [ ] Bottom timeline strip: pinch-zoom, scrub, play/pause/×60/×3600/×86400
- [ ] Sun shader (corona + magnitude-based bloom)

### Day 5 — Tonight's Sky + ISS + Search

- [ ] DeviceOrientation permission flow (button-gated, never auto-prompt)
- [ ] Geolocation permission flow (button-gated)
- [ ] Alt-az projection from observer's lat/lon at current sidereal time
- [ ] Constellation lines (d3-celestial GeoJSON, BSD)
- [ ] ISS live position via wheretheiss.at (1Hz polling, no Kafka)
- [ ] Search input → SIMBAD via CF Worker proxy → autocomplete
- [ ] Tap result → fly-to with eased camera

### Day 6 — Multi-wavelength + Info Panel

- [ ] Bottom-sheet wavelength toggle: Visible / 2MASS (IR) / WISE (mid-IR)
- [ ] Cross-fade slider at top of sheet (the HN demo moment)
- [ ] Long-press chip = solo layer
- [ ] Info panel on object click:
  - Name, type, magnitude, distance, RA/Dec
  - SIMBAD description (federated query)
  - Wikipedia summary (if available)
- [ ] URL deep-linking (camera state + selected object)

### Day 7 — Ship

- [ ] Polish: loading states, error boundaries, empty states
- [ ] Mobile responsive (one quality preset, iPhone-tested)
- [ ] OG card with cinematic screenshot
- [ ] README polish: 30-second pitch + GIF + architecture diagram
- [ ] CONTRIBUTING.md (build-in-public energy)
- [ ] GitHub repo polish: topics, description, social preview
- [ ] Submit to Hacker News (Show HN: The Unspeakable World)
- [ ] Submit to Product Hunt
- [ ] Post to r/space, r/astronomy, r/dataisbeautiful, r/webgl, r/threejs
- [ ] Twitter/X launch thread with full devlog
- [ ] Tag CDS Strasbourg, Three.js, etc. respectfully

---

## Tech Stack (locked, MIT)

```
Frontend:    Vite 6 + React 19 + TypeScript strict + Tailwind CSS
3D:          Three.js r184+ (WebGL2 only for v1; WebGPU later)
ECS:         (skip for v1 — premature optimization)
State:       Zustand
Data:        DuckDB-WASM + Parquet (local Hipparcos)
HEALPix:     Vendored cds-healpix-rust → wasm-pack
Ephemeris:   AstronomyEngine
Federation:  Cloudflare Worker → SIMBAD/NED/VizieR TAP proxy
Hosting:     Cloudflare Pages + R2 + Workers (free tier)
Build:       pnpm workspaces + Turborepo
```

## Three Non-negotiables

1. **R2 free egress** — never use a pay-per-GB CDN
2. **Mirror only `hips_status=clonable` surveys** — but for week 1, hot-link DSS2/2MASS/WISE direct from CDS with polite User-Agent and aggressive client-side LRU cache. R2 mirror lands post-launch when traffic warrants.
3. **SIMBAD rate limit (6 qps/IP)** — Worker throttles to 5 qps and caches aggressively. Mirror to R2 if launch goes viral.

## Known Issues Documented in v1

- HEALPix polar seam crack at lat ±41.81° (Collignon boundary)
- LOD only switches between 2 orders (3 → 4), no smooth crossfade
- No texture atlas — one Three.js Texture per tile (memory not optimized)
- No proper frustum culling on the sphere
- No mobile tier system — one quality preset
- No Pilot 6DOF camera
- No planetary surface terrain
- AI copilot deferred

These become public roadmap items on GitHub Issues. Building in public means we _show_ the dragons, not hide them.

---

## Day 1 — STARTING NOW

Order:

1. Scaffold monorepo
2. CLAUDE.md + README + LICENSE
3. Landing page
4. git init + first commit
5. Push to GitHub (need: confirm org/repo name)
6. Cloudflare tunnel

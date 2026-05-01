# 🌌 The Unspeakable World

> The first emotionally legible front-end to the entire Virtual Observatory.
> Every wavelength of every sky survey. Every spacecraft trajectory ever flown.
> In a browser. 60 fps. MIT licensed.

**Live (soon):** [space.dashable.dev](https://space.dashable.dev)
**Status:** Day 1 of 7 — building in public.

---

## The Wedge

Existing tools split the sky into fragments:

- **NASA Eyes** is a spacecraft viewer (no stars, no deep sky).
- **Stellarium Web** is a 2D planetarium (no 6DOF flight).
- **Aladin Lite** is a 2D sky atlas (no spaceflight UX).
- **VelonSpace / AstroGrid** has 6DOF in browser but no real survey data.
- **SpaceEngine / Celestia / OpenSpace** are gorgeous, but desktop-only.

**Nobody has built `HEALPix tile streaming + free 6DOF Three.js camera + multi-wavelength toggle + tonight's sky` in one browser tab.**

That's the moat. We're building it in public over 7 days.

---

## The Three-Layer Stack

```
Layer 3 — Daily-use hooks      tonight's sky · ISS passes · live alerts
Layer 2 — Grounded AI brain    "what am I looking at?" with citations
Layer 1 — HEALPix-3D engine    1,400 sky surveys, every wavelength
```

We ship Layer 1 + a sliver of Layer 3 in week one. Layer 2 follows.

---

## Stack

```
Frontend     Vite 6 · React 19 · TypeScript strict · Tailwind CSS
3D           Three.js r184+ (WebGL2; WebGPU later)
HEALPix      Vendored cds-healpix-rust → wasm-pack
Catalogs     DuckDB-WASM + Parquet (Hipparcos bundled)
Ephemeris    AstronomyEngine (MIT)
Federation   Cloudflare Worker → SIMBAD / NED / VizieR TAP
Hosting      Cloudflare Pages + R2 + Workers (free tier)
Build        pnpm workspaces + Turborepo
```

Every dependency is MIT, Apache-2.0, BSD, or public domain. **No GPL, no AGPL.**

---

## Data sources (federated, never re-hosted at petabyte scale)

- **HiPS surveys** at CDS Strasbourg, NASA IRSA, ESA ESASky, JAXA DARTS — gamma → radio, ~1,400 surveys
- **SIMBAD / NED / VizieR** — federated TAP queries via a Cloudflare Worker proxy
- **Hipparcos** (118K stars) — bundled
- **AstronomyEngine** — solar system positions, no ephemeris files needed
- **CelesTrak** — ISS + satellite TLEs (Phase 2)
- **JPL Horizons / SPICE kernels** — every spacecraft trajectory ever flown (Phase 2)

---

## Repo layout

```
apps/
  web/          Vite + React + R3F main app
  api/          Cloudflare Worker (TAP proxy + tile cache)
packages/
  core/         Three.js scene, camera, multi-pass renderer
  healpix-renderer/   HEALPix sphere streamer
  wasm/         Vendored cds-healpix-rust + wasm-pack
docs/           Notes + architecture diagrams
```

---

## Build in public

This is a 7-day public sprint. The repo is public from commit #1. Every dragon is a GitHub Issue.

Day-by-day plan: [`tasks/todo.md`](./tasks/todo.md)

---

## Acknowledgements

Built on the shoulders of:

- **CDS Strasbourg** — HiPS, SIMBAD, VizieR. The IVOA's beating heart.
- **NASA / ESA / JAXA / ISRO / CNSA** — every public-domain image and trajectory.
- **Three.js community** — the renderer everyone deserves.
- **Don Cross** — AstronomyEngine.
- **F.-X. Pineau & the cdshealpix team** — the Rust HEALPix that makes this possible.

---

## License

MIT. See [LICENSE](./LICENSE).

Data attribution per source (CC-BY almost universally).

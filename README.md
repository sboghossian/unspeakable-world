# 🌌 The Unspeakable World

> The first emotionally legible front-end to the entire Virtual Observatory.
> Every wavelength of every sky survey. Live ISS. Click any star and ask SIMBAD what it is.
> In a browser. 60 fps. MIT licensed.

**🚀 Live:** [space.dashable.dev](https://space.dashable.dev) — open `/#viewer` and drag

[![og](apps/web/public/og-card.png)](https://space.dashable.dev/#viewer)

---

## What you can do, today

**Drag the sky.** Pinch / wheel to zoom. Tap any region to fly there. The viewer streams real DSS2 sky tiles from CDS Strasbourg onto a 3D Three.js sphere — when you zoom in, higher-order Norder 1+ tiles fetch into the camera frustum.

**Cross-fade wavelengths.** Visible (DSS2) ↔ near-IR (2MASS) ↔ mid-IR (AllWISE) ↔ X-ray (INTEGRAL). Slide the mix between two layers and watch the sky transform — galactic dust appears, hot dust glows red, X-ray binaries flare into view.

**Click anything → ask SIMBAD + Wikipedia.** Tap a region on the sky and the inspector resolves the closest known object via CDS's open SIMBAD endpoint, then chains to Wikipedia for the article extract + thumbnail when one exists.

**Search anything.** ⌘K opens search across 314 named stars, 879 deep-sky objects (Messier + NGC/IC + common-name aliases like "Crab Nebula" or "Pleiades"), 9 solar bodies, and the 88 IAU constellations. Click any result to fly there.

**Take the Grand Tour.** Click ▶ TOUR for an 8-step guided walkthrough — Sun, Andromeda, Pleiades, Orion Nebula, Galactic Center, Crab Nebula, Large Magellanic Cloud, Jupiter — each automatically switching to the wavelength that tells the best story.

**Tonight's sky from your location.** ↑ TONIGHT'S SKY uses geolocation (button-gated) + IAU sidereal-time math to fly the camera straight up from where you are right now. Your coordinates never leave your device.

**Real solar system.** Sun, Moon, and 8 planets via [AstronomyEngine](https://github.com/cosinekitty/astronomy). Time slider scrubs ±days, with ×60 / ×1h / ×1d / ×30d speeds — watch Mars cross the sky, watch the Moon track its phase.

**Live ISS.** Polls `wheretheiss.at` every 4 s. Click "ISS" in the targets menu and the camera flies to wherever the station is right now.

**88 constellations + labels.** Toggle ✦ LINES for the IAU constellation lines from d3-celestial, with the 3-letter code at every centroid.

**8,921 bright stars + 879 deep-sky objects.** HYG v4.0 stars (CC BY-SA, 139 KB packed binary) GPU-instanced with B-V → RGB color, plus OpenNGC's bright filtered subset as type-coded ring markers (galaxy / cluster / nebula).

**Shareable URLs.** Every camera state, FOV, time, overlay + mix, and constellation toggle round-trips via the URL hash — copy-paste any view to share exactly what you see.

---

The full plan lives in [`tasks/todo.md`](./tasks/todo.md). Every commit lands on `main` and pushes here. **No private branches, no stealth — every dragon is a public issue.**

---

## The wedge

Existing tools split the sky into fragments:

- **NASA Eyes** is a spacecraft viewer (no stars, no deep sky).
- **Stellarium Web** is a 2D planetarium (no 6DOF flight).
- **Aladin Lite** is a 2D sky atlas (gorgeous, but no spaceflight UX, and GPL).
- **VelonSpace / AstroGrid** has 6DOF in browser but no real survey data.
- **SpaceEngine / Celestia / OpenSpace** are gorgeous, but desktop-only.

**Nobody had built `HEALPix tile streaming + free 6DOF Three.js camera + multi-wavelength toggle + tonight's sky` in one browser tab.**

So we did. Permissively-licensed, in 7 days, in public.

---

## The three-layer stack

```
Layer 3 — Daily-use hooks      tonight's sky · ISS passes · live alerts (ZTF, GCN)
Layer 2 — Grounded AI brain    "what am I looking at?" with citations
Layer 1 — HEALPix-3D engine    1,400 sky surveys, every wavelength
```

Layer 1 + a sliver of Layer 3 ship today. Layer 2 follows.

---

## Stack

```
Frontend     Vite 6 · React 19 · TypeScript strict · Tailwind CSS
3D           Three.js r171+ (WebGL2 today; WebGPU later)
HEALPix      @hscmap/healpix (MIT, pure TS) — math by F.-X. Pineau & cdshealpix
Catalogs     HYG v4.0 → 139 KB binary (etl/hyg-bright.mjs at build time)
Ephemeris    AstronomyEngine (MIT, 100 KB)
Federation   SIMBAD (CORS open) · CDS HiPS tiles · wheretheiss.at
Hosting      Cloudflare Pages + named tunnel (free tier)
Build        pnpm workspaces + Turborepo
```

Every dependency is MIT, Apache-2.0, BSD, or public domain. **No GPL, no AGPL.**

---

## Data sources (federated, never re-hosted at petabyte scale)

- **HiPS surveys** at CDS Strasbourg, NASA IRSA, ESA ESASky — gamma → radio, ~1,400 surveys
- **SIMBAD** — federated cone search via CDS Strasbourg (CORS-open, no proxy)
- **HYG v4.0** — 8,921 bright stars (CC BY-SA 2.5)
- **AstronomyEngine** — solar system positions, no ephemeris files
- **wheretheiss.at** — live ISS sub-satellite point
- **JPL Horizons + SPICE kernels** — every spacecraft trajectory ever flown (Phase 2)

---

## Repo layout

```
apps/
  web/          Vite + React main app
    src/viewer/
      scene/    Three.js scene · HEALPix sphere · LOD · Voyager controls
      hips/     Survey definitions + tile loader
      stars/    HYG bright-star field with B-V color shader
      solar/    Sun + Moon + planets via AstronomyEngine
      iss/      Live ISS tracker
      info/     SIMBAD client + ASCII parsers
      ui/       TimeStrip · WavelengthBar · QuickTargets · InfoPanel
  etl/          HYG → binary build pipeline (Node)
packages/       Reserved for the production renderer extraction
docs/
  screenshots/  Visual proof per phase
tasks/
  todo.md       Day-by-day plan (you are reading the meta version)
```

---

## Build in public — daily commits

| Day | Commit  | What shipped                                                     |
| --- | ------- | ---------------------------------------------------------------- |
| 1   | a03d0e2 | Bootstrap monorepo + landing page + Cloudflare tunnel            |
| 2   | 82e8eb2 | HEALPix toy + DSS2 streaming + Voyager camera                    |
| 3   | 83b5439 | LOD switching + touch + inertia + chips + tap-to-fly             |
| 4   | c3177f5 | HYG bright stars + AstronomyEngine + time strip                  |
| 5   | 5234e10 | Multi-pointer + Y-up coords + ISS tracker + Quick Targets        |
| 6.A | a6fa461 | Multi-wavelength toggle (Visible / 2MASS / WISE) with cross-fade |
| 6.B | 3ad41d3 | SIMBAD info panel — click sky, ask "what am I looking at"        |
| 7   | 777de83 | v1 public launch · README · OG card · landing polish             |
| 8   | 9d6c7f6 | Tonight's sky — geolocation → fly to your zenith                 |
| 9   | 2bafb13 | Polar Collignon seam tightened (SUB 16→32)                       |
| 10  | 934cfae | Messier + bright NGC overlay (879 deep-sky rings)                |
| 11  | 240fe83 | 88 IAU constellation lines (toggleable)                          |
| 12  | 28f8307 | INTEGRAL hard X-ray as 4th wavelength layer                      |
| 13  | 7602ed4 | Top-bar search across stars / DSO / planets / constellations     |
| 14  | bd9511a | Mobile UX — top bar collapses to icons; engineering chrome hides |
| 15  | 2cea894 | Grand Tour — 8-step guided sky walkthrough with auto-wavelength  |
| 16  | 3c4b052 | URL deep-linking — every view is a shareable hash                |
| 17  | e8c1b4c | Wikipedia summary in the SIMBAD inspector                        |
| 18  | f1d0f27 | Famous-object alias map ("Crab" → M1, "Pleiades" → M45)          |
| 19  | 56eebf0 | 88 constellation labels at line centroids                        |
| 20  | (this)  | v2 ship — refreshed README · OG card · landing roadmap update    |

---

## Acknowledgements

Built on the shoulders of:

- **CDS Strasbourg** — HiPS, SIMBAD, VizieR. The IVOA's beating heart.
- **NASA / ESA / JAXA / ISRO / CNSA** — every public-domain image and trajectory.
- **F.-X. Pineau & the cdshealpix team** — the HEALPix math that makes this possible.
- **Don Cross** — [AstronomyEngine](https://github.com/cosinekitty/astronomy).
- **Three.js community** — the renderer everyone deserves.
- **astronexus** — [HYG database](https://github.com/astronexus/HYG-Database) (CC BY-SA 2.5).
- **wheretheiss.at** — free live ISS API.

---

## License

MIT. See [LICENSE](./LICENSE).

Data attribution per source (CC-BY almost universally).

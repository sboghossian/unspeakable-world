# v4 screenshots

Hero shots for the v4 feature wave (Gaia DR3, multi-messenger sky,
Cosmic Copilot, Universe Mode v2, AR Sky, Planck CMB).

Each shot is captured by `tools/capture-v4-screenshots.mjs` from a
URL-hash deep link, so anyone can re-snap them locally against a fresh
build of the viewer.

## Shot list

| File | URL hash | What it shows |
|---|---|---|
| `gaia-1m-stars.png` | `#viewer?fov=15&ra=83.82&dec=-5.39&layers=gaia-stars` | Gaia DR3 1M-star layer over the Orion region. BP-RP → RGB shader colour, parallax-derived 3D positions. |
| `multi-messenger.png` | `#viewer?fov=90&ra=266.4&dec=-29&layers=multimessenger,gaia-stars` | Galactic-centre region with IceCube ν tracks, Auger UHECR dots, and the LIGO GWTC-3 90% sky areas as violet rings. |
| `galaxy-cone.png` | `#universe?cx=26000&cy=200000&cz=0&yaw=3.14&pitch=-1.4` | Universe mode pulled out to ~200 kly above the disk so the 136 596-galaxy 2MRS+6dFGS cone fills the frame. Redshift hue gradient visible. |
| `cosmic-copilot.png` | `#viewer?object=M31&fov=2&ra=10.68&dec=41.27` | Cosmic Copilot panel open, seeded with "What am I looking at? Tell me about M31." Try-asking suggestions visible. |
| `universe-tiers.png` | `#universe?cx=26050&cy=20&cz=0&yaw=3.14&pitch=-0.4` | Universe Mode v2 mid-zoom. The bottom-left tier HUD reads "Galactic Tier · X ly from Sun". |
| `extra-layers-panel.png` | `#viewer?layers=gaia-stars,multimessenger,planck-polarization,galaxy-cone,chandra` + opens the ✨ popover | The federated-data layers popover with several toggles already on. |
| `ar-sky-preview.png` | `#viewer?fov=80&n=1&c=1` | Star-names + constellation lines on the celestial sphere — the visual surface the AR Sky overlay paints onto when rear-camera passthrough is granted on a phone. |
| `planck-cmb.png` | `#viewer?fov=120&ra=0&dec=0&w=planck&mix=0.85&layers=planck-polarization` | Planck CMB temperature map at 85% mix + the v4 E/B polarisation vector layer. |

## Re-capturing

Two terminals. First, serve the built viewer:

```bash
pnpm --filter @unspeakable/web build
pnpm --filter @unspeakable/web preview --port 4173
```

Then, in a second terminal, capture:

```bash
# one-time
npx playwright install chromium

# all eight shots into docs/screenshots/v4/ and apps/web/public/screenshots/v4/
node tools/capture-v4-screenshots.mjs --base http://localhost:4173

# just one
node tools/capture-v4-screenshots.mjs --base http://localhost:4173 --only galaxy-cone
```

The script

- pre-seeds `localStorage` flags so the tutorial, "what's new in v4",
  PWA install banner, support ribbon and consent banner don't cover
  the canvas;
- opens a fresh Chromium page per shot (the Three.js renderer state
  doesn't fully reset on a hash-route nav, and reusing one page
  intermittently leaves the canvas black);
- runs Chromium with `--use-gl=swiftshader` so WebGL2 works in
  headless / sandbox CI environments;
- mirrors each PNG into `apps/web/public/screenshots/v4/` so the
  landing-page `<img>` tags can serve them at `/screenshots/v4/<name>.png`.

## Caveats

- AR Sky's rear-camera passthrough needs a user gesture + device camera,
  neither of which exists in headless Chromium. The `ar-sky-preview.png`
  is therefore a star-names / constellation-lines stand-in — the same
  vector layer that AR Sky overlays in production.
- SwiftShader-rendered HiPS tiles look fine but draw a few frames slower
  than a GPU; if you re-capture on a fast machine, set `postWaitMs` lower
  in the shot table for a snappier run.
- The screenshots are CC-BY 4.0 — credit
  "Unspeakable World · unspeakable-world.dashable.dev".

# v4 screenshots

Ten polished hero shots for the v4 wave (Gaia DR3 · multi-messenger
sky · 136K galaxy cone · Cosmic Copilot · Universe Mode v2 · ✨
federated layers panel · Grand Tour v2 · FITS upload · Planck
polarization · Curriculum certificate).

Captured by [`tools/capture-v4-screenshots.mjs`](../../../tools/capture-v4-screenshots.mjs)
at 1920×1080 — see the long-form walkthrough in
[`docs/FEATURES.md`](../../FEATURES.md).

## Shot list

| File | Hash / route | What it shows |
|---|---|---|
| `gaia-dr3-million-stars.png` | `#universe?cx=26000&cy=0.00079&cz=0&yaw=3.14159&pitch=-1.55` | Universe Mode 50 AU above the ecliptic, Gaia DR3 1M-star field around the Sun + planet orbits. |
| `multi-messenger-sky.png` | `#viewer?fov=150&ra=180&dec=0&layers=multimessenger&c=1&n=1` | Wide-FOV sky with IceCube + Auger + LIGO + NANOGrav all on, constellation lines + bright-star names. |
| `136k-galaxy-cone.png` | `#universe?cx=26000&cy=10000000&cz=0&yaw=3.14159&pitch=-1.4` | Universe Mode 10 Mly above the Milky Way; 2MRS+6dFGS cone with the Virgo Cluster at frame centre. |
| `cosmic-copilot-conversation.png` | `#viewer?fov=3.5&ra=10.6847&dec=41.269&w=2mass&mix=0.9&c=1&n=1` + open Copilot | Cosmic Copilot panel mid 3-turn M31 conversation, `fly_to` + `set_overlay` tool-call pills visible. |
| `universe-tier-handoff.png` | `#universe?cx=26000&cy=50&cz=0&yaw=3.14159&pitch=-0.45` | Universe Mode 50 LY above the Sun; Milky Way disk just starting to build up; tier HUD reads "Galactic Tier · 50.00 LY FROM SUN". |
| `layers-panel-with-sub-tabs.png` | `#viewer?…&layers=gaia-stars,multimessenger,planck-polarization,chandra,variables,sky-cultures-extended` + open ✨ panel | Sky viewer + ✨ layers panel on the "Live alerts" sub-tab with 6 layers enabled across all 4 tabs. |
| `grand-tour-v2.png` | `#universe` + start grand tour + jump to step 7 | TourCard at "7. The Galactic Center" with the 12-step timeline + INTEGRAL/Chandra X-ray badges visible. |
| `fits-upload-on-sky.png` | `#viewer?fov=1.0&ra=10.6847&dec=41.269&w=2mass&mix=0.5` + ⚙ pro tools → FITS | Sky viewer aimed at M31 with a synthetic 256×256 FITS uploaded and projected on the sphere. |
| `planck-cmb-polarization.png` | `#viewer?fov=90&ra=266.4&dec=-29&w=wise&mix=0.6&layers=planck-polarization` | Galactic-centre sky with the dust lane glowing + Planck polarization vectors streaking along the plane. |
| `education-certificate.png` | `#viewer` (auto-opens with 100% lesson progress seeded) | Printable A4 Certificate of Completion for the 15-lesson curriculum. |

## Re-capturing

```bash
# All 10 shots against production (default; ~3 minutes)
node tools/capture-v4-screenshots.mjs

# Against a local preview
pnpm --filter @unspeakable/web build
pnpm --filter @unspeakable/web preview --port 4173 &
node tools/capture-v4-screenshots.mjs --target http://localhost:4173

# Just one shot
node tools/capture-v4-screenshots.mjs --only education-certificate

# List the shot names
node tools/capture-v4-screenshots.mjs --list
```

The script

- pre-seeds `localStorage` (consent decline, tutorial done, copilot
  thread for the conversation shot, 15 completed lessons for the
  certificate shot, sub-layer flags for multi-messenger);
- opens a fresh Chromium page per shot (Three.js renderer state
  doesn't fully reset on a hash-route nav);
- collapses the Universe-mode left rail for hero shots where it
  would dominate;
- runs Chromium with `--use-gl=swiftshader` so WebGL2 works in
  headless / sandbox CI environments;
- mirrors each PNG into `apps/web/public/screenshots/v4/` so the
  landing-page `<img src>` tags resolve;
- additionally writes legacy filenames (`gaia-1m-stars.png`,
  `galaxy-cone.png`, `multi-messenger.png`, `cosmic-copilot.png`,
  `universe-tiers.png`, `extra-layers-panel.png`, `planck-cmb.png`)
  by copying so old README / landing-page references keep working.

## Caveats

- The Planck HFI_Color HiPS endpoint at CDS started returning 404s
  in 2026-05 (genuine upstream regression). `planck-cmb-polarization.png`
  therefore uses WISE mid-IR as the wavelength base — the same
  warm-dust pattern Planck 353 GHz traces. The polarization vectors
  ship locally and always render.
- SwiftShader-rendered HiPS tiles look fine but load a few seconds
  slower than a GPU. If you re-capture on a fast workstation, you can
  trim `postWaitMs` down a notch.
- The FITS shot drops a synthetic 256×256 float FITS with WCS
  centred on M31; on a real-data run, supply a `.fits` of your own
  in the panel.
- Screenshots are CC-BY 4.0 — credit
  "Unspeakable World · unspeakable-world.dashable.dev".

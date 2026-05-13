# Features — v4 walkthrough

Ten major features of the v4 wave, each with a hero screenshot, what
it does, how to use it, and why it matters. Captured live from
[unspeakable-world.dashable.dev](https://unspeakable-world.dashable.dev).

Every screenshot is reproducible from its URL hash + a small
`localStorage` seed; the capture script lives at
[`tools/capture-v4-screenshots.mjs`](../tools/capture-v4-screenshots.mjs).

---

## 🌌 Universe Mode v2 — tier-aware seamless camera

[![Universe Mode v2 mid-zoom — Milky Way disk arches across the top of the frame, bottom HUD reads 'Galactic Tier · 50.00 LY FROM SUN'](screenshots/v4/universe-tier-handoff.png)](screenshots/v4/universe-tier-handoff.png)

**What it does.** One Three.js scene holds the entire universe — the
Solar System in AU and the Milky Way + Local Group + cosmic web in
LY — by re-anchoring two coordinate frames against the camera each
tick. As you zoom out from a planet, the AU frame fades down and the
LY frame fades up so there is no scene swap, no loading spinner, no
"loading galactic mode" interstitial. The bottom HUD live-reads your
distance from the Sun, switching units (km → Mkm → AU → LY → kly →
Mly → Gly) and your **tier** (Solar · Galactic · Cosmic) so you
always know where you are.

**How to use it.** Open [`/#universe`](https://unspeakable-world.dashable.dev/#universe)
and drag. Scroll to zoom — `Shift` + scroll for fine control. `WASD`
for first-person glide. `F` focuses the nearest body. The URL hash
encodes `cx,cy,cz,yaw,pitch` in the galactic LY frame (SUN = `(26000,
0, 0)`), so every camera position is shareable as a permalink. The
"▶ grand tour" button drives the camera through 12 canonical stops.

**Why it matters.** Stellarium is 2D. NASA Eyes is spacecraft-only.
SpaceEngine is desktop. The previous generation of "fly through the
universe" web apps reload a different rendering engine every time you
cross a unit boundary; the seam is jarring and breaks the spatial
intuition the experience exists to build. Universe Mode v2 holds the
illusion that this is *one place* — and that's the entire wedge.

---

## ✦ Gaia DR3 — one million stars

[![Universe Mode 50 AU above the ecliptic — Sun at centre, Gaia DR3 1M-star field across the background, planet-orbit rings](screenshots/v4/gaia-dr3-million-stars.png)](screenshots/v4/gaia-dr3-million-stars.png)

**What it does.** A 1,000,000-star slice of the Gaia DR3 catalog
(G ≤ 10.77) baked at build-time into a binary blob, instanced on the
GPU as a single `THREE.Points` with a `BP-RP → RGB` shader. Each star
sits at its true heliocentric XYZ derived from Gaia's parallax — so
when you fly out past Alpha Centauri the Sun visibly leaves the
foreground and the rest of the local stellar neighborhood swings into
place around the camera. Bucketed into 100K / 500K / 1M density
presets for adaptive performance on mobile.

**How to use it.** Open Universe Mode, toggle ✦ in the left rail
(or `?layers=gaia-stars` in the URL hash). The shot above uses
[`/#universe?cx=26000&cy=0.00079&cz=0&yaw=3.14159&pitch=-1.55`](https://unspeakable-world.dashable.dev/#universe?cx=26000&cy=0.00079&cz=0&yaw=3.14159&pitch=-1.55):
camera 50 AU above the ecliptic looking back at the Sun, with the
Gaia field filling the backdrop.

**Why it matters.** Bright-star catalogs in the browser stopped at
9,000 stars (HYG) for the last decade. With 1M Gaia stars + parallax
distances, the sky becomes 3D — and the *empty volume* between stars
becomes legible for the first time outside desktop tools.

---

## ◌ Galaxy cone — 136K galaxies in 3D

[![Universe Mode 10 Mly above the Milky Way — Virgo cluster as a bright knot at frame centre surrounded by scattered galaxies of the 2MRS+6dFGS cone](screenshots/v4/136k-galaxy-cone.png)](screenshots/v4/136k-galaxy-cone.png)

**What it does.** Renders the 2MRS + 6dFGS galaxy redshift surveys —
136,596 galaxies — at their measured 3D positions (RA, Dec, redshift
→ comoving distance) in the galactic-LY frame, instanced as a single
point cloud. Hue encodes redshift (low z = cyan/violet, high z =
deep red); K-band magnitude scales the sprite radius. Ten named
structures (Local Group · Virgo · Coma · Hercules · Shapley · …)
ride along as labels so the cosmography is legible without a key.

**How to use it.** Open Universe Mode, toggle `◌ Galaxy cone` in the
✨ Layers panel. To see it densely the camera must be ≥ a few Mly
from the Sun — the shot above uses
[`/#universe?cx=26000&cy=10000000&cz=0&yaw=3.14159&pitch=-1.4`](https://unspeakable-world.dashable.dev/#universe?cx=26000&cy=10000000&cz=0&yaw=3.14159&pitch=-1.4),
10 Mly "above" the disk so the Virgo Cluster appears at frame centre.

**Why it matters.** Until v4, the only way to look at the cosmic web
in a browser was on a paper figure. The Cosmicflows / 2MRS team's
data has been free and open since 2012 — wiring it into a 6DOF
camera in 2026 was overdue. Anyone with a phone now has Hubble-era
cosmography in their pocket.

---

## ◈ Multi-messenger sky

[![Wide-FOV sky with blue IceCube neutrino rings, violet LIGO localization discs, constellation lines and bright star names](screenshots/v4/multi-messenger-sky.png)](screenshots/v4/multi-messenger-sky.png)

**What it does.** Four messenger streams on one celestial sphere:
**IceCube** neutrino tracks (blue rings, position-angle scaled by
energy), **Pierre Auger** UHECR arrival directions (amber dots),
**LIGO/Virgo GWTC-3** 90% sky-localisation contours (violet discs),
and **NANOGrav** pulsar-timing-array sources (green crosshairs).
LIGO events come with an inspiral chirp re-synthesised in pure Web
Audio from the published mass + spin parameters — click any disc to
hear the merger.

**How to use it.** [`/#viewer?fov=150&ra=180&dec=0&layers=multimessenger&c=1&n=1`](https://unspeakable-world.dashable.dev/#viewer?fov=150&ra=180&dec=0&layers=multimessenger&c=1&n=1).
All four sub-layers default on; toggle individual streams inside the
multi-messenger controls (one-tap mute on the audio).

**Why it matters.** Multi-messenger astrophysics — GW170817 onwards
— is the field's biggest tool of the decade and the hardest to
visualise. Drawing every stream against the constellation art turns
"there was a kilonova in NGC 4993" from an abstract paper figure
into "this pixel, here, on the sky."

---

## 🧠 Cosmic Copilot — Layer 2 AI tutor

[![Cosmic Copilot panel mid-conversation — user asks about M31, assistant answers, second turn shows fly_to + set_overlay tool-call pills](screenshots/v4/cosmic-copilot-conversation.png)](screenshots/v4/cosmic-copilot-conversation.png)

**What it does.** An LLM tutor grounded in the live viewer state.
The Copilot sees the camera's RA/Dec, FOV, active overlay, enabled
layers, focused object, and recent inspector chips — and answers
questions in context with citations to SIMBAD / Wikipedia / ADS.
Critically it can **act on the scene**: the screenshot above shows
the model issuing `fly_to(M31)` + `set_overlay(2mass, mix=0.85)` as
real tool calls (green pills); the viewer's tool-runner bridges
those into actual camera + overlay state.

**How to use it.** Click the 🧠 ask button (top bar of the sky
viewer). Tool calls fire automatically when the model decides they're
useful — no menu, no scene-script DSL to learn. Backend order:
local Ollama (auto-probed on mount) → Cloudflare Workers AI →
hand-written 32-answer offline table. Set a backend in the cog
icon to pin one.

**Why it matters.** Every astronomy app since 2005 has been "look at
this and figure it out." Layer 2 is the bet that the next decade is
"ask, and the app will show you." Grounding the model in the live
scene context (and letting it move the camera) is what makes that
useful instead of decorative.

---

## ◐ Multi-wavelength HiPS surveys (14 of them)

[![Galactic-centre sky with the Milky Way disk glowing across the top and cyan polarization vectors streaking across the frame](screenshots/v4/planck-cmb-polarization.png)](screenshots/v4/planck-cmb-polarization.png)

**What it does.** 14 federated HiPS surveys stream from CDS Strasbourg,
NASA IRSA, and ESASky onto a Three.js sphere with a cross-fade slider
between any two: **DSS2** visible · **Pan-STARRS DR1** · **SDSS9** ·
**Hα Finkbeiner** · **2MASS** NIR · **WISE** mid-IR · **GALEX** UV ·
**INTEGRAL** X-ray · **NVSS / VLASS / TGSS** radio · **Fermi LAT**
γ-ray · **Planck CMB** · **HST mosaic** · **DESI Legacy DR10**.
Tile loading is order-and-frustum aware, so zoom-in pulls Norder 6+
tiles into a 1024×512 backing texture.

**How to use it.** The wavelength bar at the bottom of the sky
viewer; drag the mix slider to morph between any two. Or set
`?w=<id>&mix=<0..1>` in the URL hash. The shot above pairs WISE
mid-IR with the polarization vectors — the same warm-dust structure
Planck 353 GHz traces, with the field lines drawn on top.

**Why it matters.** Aladin Lite has these tiles but is 2D and GPL.
Sky atlases like SDSS Skyserver give you one wavelength. Cross-fading
ten of them inside a free 6DOF camera is the wedge nobody filled —
which is why this app exists.

---

## 🎓 Curriculum + certificate

[![Printable Certificate of Completion for 'Stephane Boghossian' — 15 lessons listed with completion dates](screenshots/v4/education-certificate.png)](screenshots/v4/education-certificate.png)

**What it does.** 15 lessons (`Where are we standing?` → `What we
still don't know`), each a mix of narrated camera tours, scene
states, hand-coded explainers, and a 4-option multiple-choice quiz.
Progress saves under `uw:lesson:<id>` in `localStorage`; no account,
no email, no telemetry. When all 15 are completed the panel above
auto-opens. The learner types whatever name they want printed and
the cert prints clean to A4 via `window.print()` — no PDF library.

**How to use it.** [`/#class`](https://unspeakable-world.dashable.dev/#class)
opens the curriculum hub. Each lesson is `~3–5 min`. The certificate
opens automatically on completion, or via the 🏅 button in the
class hub once you cross 100%.

**Why it matters.** Existing astronomy education products are
walled-garden K-12 SKUs you pay $200/seat for. v3 / v4 ship a free,
MIT-licensed, account-less alternative that respects the learner's
time and prints a certificate the learner can give their parents.
That's the whole product, and it's free forever.

---

## ⚙ Power-user tools (FITS · ADQL · custom HiPS)

[![Sky viewer with the ⚙ pro tools panel open on the FITS tab — synthetic 256x256 FITS thumbnail visible, WCS header cards parsed, 'project on sky' button armed](screenshots/v4/fits-upload-on-sky.png)](screenshots/v4/fits-upload-on-sky.png)

**What it does.** Three pro tools behind one top-bar button. **FITS
upload**: drop a `.fits` file, the in-browser reader parses
BITPIX/NAXIS/WCS, stretches the pixels, renders a thumbnail, and
mounts the image at its true (RA, Dec) on the celestial sphere.
**ADQL / TAP**: paste a VizieR / SIMBAD ADQL query, the result
points are projected on the sphere as a custom catalog. **Custom
HiPS**: paste any HiPS root URL — the app auto-registers it as a
new wavelength toggle.

**How to use it.** Click `⚙ pro tools` in the top bar (sky viewer).
The synthetic FITS in the shot above is a 256×256 32-bit float with
a gaussian + ring + gradient, WCS centred on M31, generated by the
capture script's `buildSyntheticFits()` helper — useful as a
reference fixture if you're writing your own FITS exporter.

**Why it matters.** Aladin Lite has these features; nothing else
free does. Wiring them into a 6DOF browser scene closes the loop for
the "professional / hobbyist astronomer" segment that doesn't fit in
the curriculum side of the product.

---

## 🪡 Real Planck polarization

[![Galactic-centre sky with the Milky Way disk glowing across the top and cyan polarization vectors streaking across the frame](screenshots/v4/planck-cmb-polarization.png)](screenshots/v4/planck-cmb-polarization.png)

**What it does.** The v4 polarization layer ships the **Planck PR3
SMICA Q/U** at NSIDE 16 — a downsample of the 353 GHz thermal-dust
polarization map — and renders it as oriented dashes whose angle is
`0.5 atan2(U, Q)` and whose length scales with `√(Q² + U²)`. The
vectors clearly streak along the galactic plane, matching the
foreground pattern in Planck Collaboration XII (2018).

**How to use it.** Toggle `🪡 Planck Polarization` in the ✨ Layers
panel (Imagery & culture tab), or `?layers=planck-polarization`.
Pair with any wavelength overlay — the shot above uses WISE mid-IR
as the base because the CDS Planck HFI HiPS endpoint started
returning 404s in 2026-05 (genuine upstream regression; we fall
back gracefully).

**Why it matters.** This is the only place outside the desktop
Aladin Standalone where you can drag-pan a Planck polarization map
on a 3D sphere in a browser. The data has been free since 2018.
Putting it under a single toggle was overdue.

---

## ✨ Federated data layers panel

[![Sky viewer with the ✨ federated layers popover open on the 'Live alerts' sub-tab — six layers enabled across the four tabs](screenshots/v4/layers-panel-with-sub-tabs.png)](screenshots/v4/layers-panel-with-sub-tabs.png)

**What it does.** 21 federated overlays grouped into 4 sub-tabs —
**📚 Catalogs** (Gaia · Exoplanets · Chandra · Variables · NEOCP) ·
**🧭 3D structure** (Galaxy cone · Cosmicflows-4) · **📡 Live
alerts** (Multi-messenger · ZTF · ATel · GOTO · BlackGEM · …) ·
**🎨 Imagery & culture** (Planck polarization · Sky cultures ·
Globe at Night · OPAL · Mars rover · Sonification). Each module is
**dynamic-imported on first toggle** so the landing bundle stays at
67 KB gzipped. The full `?layers=` selection round-trips through
the URL hash (capped at 10 ids).

**How to use it.** Click `✨ layers` in the top bar (sky / universe).
Toggle anything; the URL updates, share it. The shot above has six
layers enabled across all four sub-tabs:
[`?layers=gaia-stars,multimessenger,planck-polarization,chandra,variables,sky-cultures-extended`](https://unspeakable-world.dashable.dev/#viewer?fov=60&ra=180&dec=20&c=1&n=1&layers=gaia-stars,multimessenger,planck-polarization,chandra,variables,sky-cultures-extended).

**Why it matters.** **Federate, don't ingest.** We host none of the
21 datasets; they all stream from their canonical IVOA-compliant
endpoints. That's the economic moat — pay zero for petabytes — and
the architectural promise: every new survey added by CDS / NASA /
ESA can become a UW layer in two hundred lines of TypeScript.

---

## 🚀 The Grand Tour v2

[![Universe Mode with the Grand Tour v2 card open at step 7 — '7. The Galactic Center' with the 12-step timeline below](screenshots/v4/grand-tour-v2.png)](screenshots/v4/grand-tour-v2.png)

**What it does.** A 12-step narrated camera tour through Universe
Mode v2: Earth → Sun → planets → beyond Pluto → Proxima Centauri →
the local neighborhood → **Sgr A*** (shown here, with the Chandra
X-ray layer auto-enabled) → multi-messenger sky → CMB → Local Group
→ cosmic web → heat death. Each step nudges layers + wavelength so
the right story tells itself; durations are tuned by hand. The
runner snapshots layer state on enter and restores it on exit.

**How to use it.** Click `▶ grand tour` in the Universe Mode top
bar. Use the timeline dots to jump steps, `← prev / next →` to
walk manually, `exit` to bail. The capture script reproduces this
by clicking the button then jumping the 7th dot.

**Why it matters.** Most users won't drag the cosmos manually on
day one. The Tour is the on-rails counterpart to free flight — it
showcases every major feature in five minutes, and the layer
recipes inside each step are the canonical "how to compose a
scene" reference for new contributors writing their own tours.

---

## Reproducing these shots

```bash
# Default — captures against production. ~3 minutes for all 10.
node tools/capture-v4-screenshots.mjs

# Against a local preview
pnpm --filter @unspeakable/web preview &
node tools/capture-v4-screenshots.mjs --target http://localhost:4173

# One shot only
node tools/capture-v4-screenshots.mjs --only grand-tour-v2

# What are the shot names?
node tools/capture-v4-screenshots.mjs --list
```

Each capture pre-seeds `localStorage` so the tutorial / first-run
hints / PWA banner / consent strip don't cover the canvas, opens a
fresh page per shot (Three.js renderer state isn't fully reset on
hash-route nav), and writes both `docs/screenshots/v4/<name>.png`
(canonical) and `apps/web/public/screenshots/v4/<name>.png`
(landing-page mirror).

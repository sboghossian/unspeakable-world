# Documentation screenshots

This folder holds the marketing + documentation imagery for Unspeakable
World. The main `README.md` and a few guide pages reference these files
directly with relative paths (`docs/screenshots/<name>.png`).

## Currently captured

| File | What it shows |
|---|---|
| `01-multiwavelength.png` | Cross-fade slider with infrared dust over visible sky |
| `02-wise-ir.png` | WISE mid-infrared Milky Way plane |
| `03-landing.png` | Landing page (APOD + highlights + astronomy today) |
| `04-constellations.png` | IAU constellation lines + labels |
| `05-andromeda-2mass.png` | Andromeda Galaxy via 2MASS near-IR |

## Wish list (still to capture)

These show up in the changelog but don't yet have a hero shot. Numbered
so the gallery layout in `README.md` can stay stable.

| File | What it should show |
|---|---|
| `06-solar-flight.png` | Solar-flight scene with planets in true scale, time-strip running |
| `07-saturn-rings.png` | Saturn close-up with the analytic ring-shadow shader visible on the cloud tops |
| `08-jupiter-galileans.png` | Jupiter focused, the four Galilean moons in orbit, info-panel open |
| `09-lesson-runner.png` | A lesson mid-step — narration card + quiz prompt + scene behind |
| `10-cross-section.png` | Earth interior cross-section with inner core / outer core / mantle / crust labeled |
| `11-distance-ruler.png` | Two crosshair markers on the sky + great-circle arc + "47° · ~94 full moons" chip |
| `12-star-trails.png` | Long-exposure star trails near the celestial pole |
| `13-info-panel.png` | InfoPanel open on M31 with Curious/Student/Expert tier toggle + glossary tooltip + citation chips |
| `14-seti-drake.png` | SETI panel · Drake equation tab with sliders + N readout |
| `15-myths.png` | Myths panel showing 2-3 cards with red-strikethrough myth + green Reality |
| `16-compare-sun-sirius.png` | Side-by-side compare: Sun vs Sirius A with diameter-ratio chip |
| `17-news.png` | News panel · Launches tab with T-minus countdown highlighted |
| `18-history.png` | "Today in Space History" with 3 events for today's date |
| `19-cosmicflows.png` | Cosmicflows-4 peculiar-velocity streamlines toward Shapley |
| `20-dark-matter.png` | Dark-matter halo overlay around the Local Group |
| `21-explore-drawer.png` | The Notion-style Explore drawer expanded, five groups visible |

## Capturing screenshots

The repo ships a tiny Playwright script that drives the live deployment
and saves each screenshot to this folder:

```bash
# one-time
npx playwright install chromium

# capture all
node tools/screenshot.mjs

# capture one
node tools/screenshot.mjs --only 09-lesson-runner

# capture against local dev server (must be running on :5173)
node tools/screenshot.mjs --base http://localhost:5173
```

The script uses the URL-hash deep-link system so each screenshot is
reproducible: the focus body, camera, time, overlays, and active panel
are all encoded in the URL.

## Style notes

- 2560×1600 native (Retina). The script downsamples to 1280×800 to keep
  the README PNGs under a few hundred KB.
- Dark theme always — UW has no light mode.
- Keep panels open *if* the screenshot is about that panel; otherwise
  the canvas should dominate.
- No mouse cursor in captures (Playwright never positions the cursor on
  screen during navigation).

## License

All screenshots in this folder are CC-BY 4.0 — credit "Unspeakable
World · unspeakable-world.dashable.dev". Use them freely in articles,
slides, classroom decks, or social posts.

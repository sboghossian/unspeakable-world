# Embed templates

Drop-in iframe templates so science bloggers, Wikipedia editors,
educators, and museum web teams can put a live, multi-wavelength sky
viewer inside their own pages — no API key, no account, no tracking.

All embeds load
[`unspeakable-world.dashable.dev`](https://unspeakable-world.dashable.dev/)
in **embed mode** (`?embed=1`), which strips the chrome (top bar,
left rail, overlays) and shows only the scene plus a small
"Unspeakable World ↗" corner attribution that opens the full app.

## Who these are for

- **Science bloggers** writing about a specific object (a Messier
  galaxy, a transient, a planet) and wanting the reader to actually
  fly there.
- **Wikipedia editors** who want a live "click to explore" footer in
  astronomy articles. (For Wikipedia itself, see also the companion
  [`apps/wiki-ext/`](../../apps/wiki-ext/) browser extension.)
- **Museum / planetarium web teams** that need a free, MIT-licensed
  way to embed the sky without paying CDN egress.
- **Education sites** building lesson plans around a single object,
  a wavelength comparison, or a live tracker.

## Templates

| File                          | What it shows                                                      |
| ----------------------------- | ------------------------------------------------------------------ |
| [`today.html`](today.html)                      | Tonight's sky at the visitor's local time                          |
| [`messier.html`](messier.html)                  | Any Messier object, picked from a dropdown                         |
| [`wavelength-compare.html`](wavelength-compare.html) | Same patch of sky in optical / infrared / X-ray side-by-side       |
| [`iss-live.html`](iss-live.html)                | Live ISS position, propagated from current TLE via SGP4            |
| [`multi-messenger.html`](multi-messenger.html)  | GW / neutrino / GRB localizations overlaid on the optical sky      |

Open any of these HTML files in your browser to preview the embed and
copy the snippet at the top of the page.

## URL parameters

All embeds use the canonical viewer URL scheme — same as deep links
shared from the full app:

```
https://unspeakable-world.dashable.dev/#viewer?embed=1&<key>=<value>&...
```

Recognized keys (most are optional — missing = "don't override"):

| Key       | Meaning                                                              |
| --------- | -------------------------------------------------------------------- |
| `embed`   | `1` to strip chrome; omit for the full app                            |
| `ra`      | Right ascension in decimal degrees, J2000.0                          |
| `dec`     | Declination in decimal degrees, J2000.0                              |
| `fov`     | Camera field-of-view in degrees                                       |
| `w`       | Survey overlay id: `dss2`, `2mass`, `chandra`, etc.                  |
| `mix`     | Overlay cross-fade `0..1`                                            |
| `layers`  | Comma-separated extra-layer ids (e.g. `multimessenger`, `gaia`)      |
| `object`  | Named object to track (`ISS`, `Mars`, `Jupiter`, `Sun`, `Moon`, ...) |
| `track`   | `1` to keep the camera locked on `object` as it moves                |
| `t`       | Simulation time as ISO 8601, e.g. `2026-05-04T08:00Z`                |
| `c`       | `1` to show constellation lines                                       |
| `g`       | `1` to show the coordinate grid                                       |
| `n`       | `1` to show bright-star name labels                                   |

## Attribution & licensing

- The viewer carries a `Unspeakable World ↗` link in the bottom-right
  of every embed — no other attribution is required, but a textual
  credit ("Sky embed: The Unspeakable World") in your article is
  appreciated.
- The embed HTML in this folder is MIT-licensed.
- The sky imagery streamed inside the embed remains under the
  individual survey licenses (CDS HiPS, IRSA, ESASky, Chandra, etc.).
  The viewer surfaces these inside its own info panel.
- No tracking pixels are added by the embed itself. The hosted app
  may run aggregate analytics; bloggers concerned about reader
  privacy can wrap the iframe in `<noscript>` or a click-to-load
  pattern.

## Fallback for blocked iframes

Every snippet includes an inline fallback so readers whose browsers
or hosts block third-party iframes still see something useful:

```html
<iframe src="..." ...>
  <a href="https://unspeakable-world.dashable.dev/#viewer">
    <img src="https://unspeakable-world.dashable.dev/og-card.png" alt="..." />
  </a>
</iframe>
```

The `og-card.png` is the canonical Open-Graph preview baked at build
time — the same image that appears when the app is shared on
Twitter / Mastodon / Slack.

# The Unspeakable World — "Fly To" browser extension

A tiny Manifest V3 browser extension that adds a single button to
Wikipedia astronomy articles:

> 🌌 Fly to in The Unspeakable World

Click it and the article's celestial object opens at its actual
right ascension / declination inside the live multi-wavelength sky
viewer at [unspeakable-world.dashable.dev](https://unspeakable-world.dashable.dev).

## What it does

The content script (`content.js`) runs on `wikipedia.org/wiki/*` pages
and tries, in order:

1. Parse the article's infobox for `Right ascension` + `Declination`
   rows. Works on Wikipedia's standard `Star`, `Nebula`, `Galaxy`,
   `Globular cluster`, etc. templates.
2. Match the page title against a built-in catalog (Messier 1..104,
   famous proper-named stars, planets, the ISS, Sagittarius A*).

If either succeeds, it injects a small floating button next to the
article's `<h1>` title that links to:

```
https://unspeakable-world.dashable.dev/#viewer?ra=<deg>&dec=<deg>&fov=<deg>
```

(or, for live-tracked objects like the ISS, planets, Sun, Moon:
`?object=<name>&track=1`).

## Install (unpacked — Chrome / Edge / Brave / Arc)

1. Open `chrome://extensions` (or the equivalent in your browser).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked**.
4. Pick the `apps/wiki-ext/` folder of this repo.
5. Visit any Wikipedia astronomy article — e.g.
   <https://en.wikipedia.org/wiki/Andromeda_Galaxy> — and look for
   the button next to the page title.

## Install (unpacked — Firefox)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Pick `apps/wiki-ext/manifest.json`.

Firefox treats the add-on as temporary and unloads it on browser
restart — fine for personal use; for permanent install, see the
publishing notes below.

## Publishing to the web stores

The repo ships the **unpacked** extension. Submitting to the Chrome
Web Store and Mozilla Add-ons requires:

- Chrome: a one-time \$5 developer fee + uploading a packed `.zip`
  to <https://chrome.google.com/webstore/devconsole>. Review usually
  takes 1–3 days.
- Firefox: free; upload a `.zip` to <https://addons.mozilla.org/developers/>.
  Review can be automated for source-included extensions.

Both stores require store metadata (icons, screenshots, privacy policy,
support URL) that need to be authored by the project maintainer. Once
ready, the existing files in this folder are everything the reviewer
needs — there is no build step.

To pack a zip:

```bash
cd apps/wiki-ext
zip -r ../../unspeakable-world-wiki-ext-0.1.0.zip \
  manifest.json content.js content.css \
  icon-16.png icon-48.png icon-128.png \
  README.md LICENSE
```

## Files

| File           | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `manifest.json`| Manifest V3 declaration, host permissions + content script |
| `content.js`   | Detect astronomy article + inject button (vanilla JS)  |
| `content.css`  | Scoped button styling                                  |
| `icon-*.png`   | Browser-store icons (16 / 48 / 128 px)                 |
| `_gen-icons.py`| Reproducible icon generation (stdlib Python, no deps)  |

## Privacy

- No data is sent anywhere by the extension itself.
- The button is a plain `<a target="_blank">` link — when the user
  clicks it, their browser navigates to `unspeakable-world.dashable.dev`
  the same way clicking any external link would.
- The extension does not run on non-Wikipedia pages.
- The extension does not request any optional permissions.

## License

MIT, same as the main project.

/*
 * The Unspeakable World — Wikipedia "Fly To" content script.
 *
 * Detects astronomy articles on Wikipedia and injects a single floating
 * button next to the article title that deep-links into the viewer at the
 * page's celestial coordinates:
 *
 *   https://unspeakable-world.dashable.dev/#viewer?ra=<deg>&dec=<deg>&fov=<deg>
 *
 * Detection heuristics (any one triggers the button):
 *
 *   1. The page has an `.infobox` with a row labelled "Right ascension"
 *      and another labelled "Declination" — by far the most reliable
 *      signal across Wikipedia astronomy templates (Star, Nebula,
 *      Galaxy, Globular cluster, etc.).
 *   2. The page title matches a known astronomical-object pattern:
 *      Messier (M1..M110), NGC, IC, Caldwell, HD, HIP, HR, Gliese,
 *      well-known proper names, planets, dwarf planets, or Greek-letter
 *      Bayer designations.
 *
 * When (1) succeeds we use the parsed RA/Dec directly. When only (2)
 * succeeds we fall back to a small built-in catalog (Messier, planets,
 * a handful of famous objects) keyed by canonical name.
 *
 * Everything below is vanilla JS — no build step, no dependencies.
 */

(function () {
  "use strict";

  if (window.__uwFlyToInjected) return;
  window.__uwFlyToInjected = true;

  var VIEWER_BASE = "https://unspeakable-world.dashable.dev";
  var DEFAULT_FOV = 6; // degrees — comfortable for most DSOs / stars

  /* ------------------------------------------------------------------ */
  /* 1. Coordinate parsing                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Parse a Wikipedia RA string into decimal degrees.
   * Accepts (typical Wikipedia rendering):
   *   "00h 42m 44.3s"
   *   "00ʰ 42ᵐ 44.3ˢ"
   *   "0h 42m 44s"
   *   "00 42 44.3"
   *   "10.6847°"  (some templates render decimal degrees)
   */
  function parseRA(text) {
    if (!text) return null;
    var s = text.replace(/ /g, " ").trim();
    // Pure decimal degrees with ° suffix
    var deg = s.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*°/);
    if (deg) {
      var v = parseFloat(deg[1]);
      if (Number.isFinite(v)) return ((v % 360) + 360) % 360;
    }
    // Sexagesimal: h m s
    var m = s.match(
      /([+-]?\d+(?:\.\d+)?)\s*[hʰ:]\s*(\d+(?:\.\d+)?)\s*[mᵐ:'′]\s*(\d+(?:\.\d+)?)?/,
    );
    if (m) {
      var h = parseFloat(m[1]);
      var mi = parseFloat(m[2]);
      var se = m[3] ? parseFloat(m[3]) : 0;
      if (Number.isFinite(h) && Number.isFinite(mi) && Number.isFinite(se)) {
        var hours = h + mi / 60 + se / 3600;
        return ((hours * 15) % 360 + 360) % 360;
      }
    }
    return null;
  }

  /**
   * Parse a Wikipedia Dec string into decimal degrees.
   * Accepts:
   *   "+41° 16′ 09″"
   *   "−05° 23′ 28″"
   *   "+41 16 09"
   *   "-5.391°"
   */
  function parseDec(text) {
    if (!text) return null;
    var s = text.replace(/ /g, " ").replace(/−/g, "-").trim();
    // Pure decimal degrees with ° suffix
    var deg = s.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*°\s*$/);
    if (deg) {
      var dv = parseFloat(deg[1]);
      if (Number.isFinite(dv) && dv >= -90 && dv <= 90) return dv;
    }
    var m = s.match(
      /([+-]?\d+(?:\.\d+)?)\s*[°d:]\s*(\d+(?:\.\d+)?)\s*[′'m:]\s*(\d+(?:\.\d+)?)?/,
    );
    if (m) {
      var d = parseFloat(m[1]);
      var mi = parseFloat(m[2]);
      var se = m[3] ? parseFloat(m[3]) : 0;
      if (Number.isFinite(d) && Number.isFinite(mi) && Number.isFinite(se)) {
        var sign = d < 0 || /^-/.test(s) ? -1 : 1;
        var deg2 = Math.abs(d) + mi / 60 + se / 3600;
        var out = sign * deg2;
        if (out >= -90 && out <= 90) return out;
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Infobox extraction                                              */
  /* ------------------------------------------------------------------ */

  function findInfoboxRow(infobox, labelRegex) {
    var rows = infobox.querySelectorAll("tr");
    for (var i = 0; i < rows.length; i++) {
      var th = rows[i].querySelector("th");
      var td = rows[i].querySelector("td");
      if (!th || !td) continue;
      var label = th.textContent ? th.textContent.trim() : "";
      if (labelRegex.test(label)) return td.textContent || "";
    }
    return null;
  }

  function extractFromInfobox() {
    var boxes = document.querySelectorAll(
      ".infobox, table.infobox, .infobox-data, .infobox.biota",
    );
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var raText = findInfoboxRow(
        box,
        /^(right\s*ascension|ra)\b/i,
      );
      var decText = findInfoboxRow(box, /^(declination|dec)\b/i);
      var ra = raText ? parseRA(raText) : null;
      var dec = decText ? parseDec(decText) : null;
      if (ra !== null && dec !== null) return { ra: ra, dec: dec };
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 3. Fallback catalog for famous objects (no infobox match)          */
  /* ------------------------------------------------------------------ */

  // Subset of Messier + famous objects + planets. Keys are normalized
  // Wikipedia titles in lowercase. RA/Dec are J2000 decimal degrees.
  // Planets resolve to their *current* sky position — not encoded here;
  // we pass ?object=<name>&track=1 so the viewer can resolve them.
  var CATALOG = {
    "messier 1": { ra: 83.6331, dec: 22.0145, fov: 1 },
    "crab nebula": { ra: 83.6331, dec: 22.0145, fov: 1 },
    "messier 13": { ra: 250.4234, dec: 36.4613, fov: 0.5 },
    "messier 16": { ra: 274.7, dec: -13.7833, fov: 1 },
    "eagle nebula": { ra: 274.7, dec: -13.7833, fov: 1 },
    "messier 27": { ra: 299.9013, dec: 22.7211, fov: 0.5 },
    "dumbbell nebula": { ra: 299.9013, dec: 22.7211, fov: 0.5 },
    "messier 31": { ra: 10.6847, dec: 41.2691, fov: 8 },
    "andromeda galaxy": { ra: 10.6847, dec: 41.2691, fov: 8 },
    "messier 33": { ra: 23.4621, dec: 30.6602, fov: 4 },
    "triangulum galaxy": { ra: 23.4621, dec: 30.6602, fov: 4 },
    "messier 42": { ra: 83.8221, dec: -5.3911, fov: 2 },
    "orion nebula": { ra: 83.8221, dec: -5.3911, fov: 2 },
    "messier 45": { ra: 56.85, dec: 24.1167, fov: 3 },
    pleiades: { ra: 56.85, dec: 24.1167, fov: 3 },
    "messier 51": { ra: 202.4696, dec: 47.1953, fov: 1 },
    "whirlpool galaxy": { ra: 202.4696, dec: 47.1953, fov: 1 },
    "messier 57": { ra: 283.3962, dec: 33.0292, fov: 0.5 },
    "ring nebula": { ra: 283.3962, dec: 33.0292, fov: 0.5 },
    "messier 81": { ra: 148.8882, dec: 69.0653, fov: 1 },
    "bode's galaxy": { ra: 148.8882, dec: 69.0653, fov: 1 },
    "messier 82": { ra: 148.9697, dec: 69.6797, fov: 1 },
    "cigar galaxy": { ra: 148.9697, dec: 69.6797, fov: 1 },
    "messier 87": { ra: 187.7059, dec: 12.3911, fov: 1 },
    "messier 104": { ra: 189.9976, dec: -11.6231, fov: 1 },
    "sombrero galaxy": { ra: 189.9976, dec: -11.6231, fov: 1 },
    "sirius": { ra: 101.2871, dec: -16.7161, fov: 5 },
    "betelgeuse": { ra: 88.7929, dec: 7.4071, fov: 10 },
    "rigel": { ra: 78.6345, dec: -8.2017, fov: 10 },
    "polaris": { ra: 37.9546, dec: 89.2641, fov: 5 },
    "vega": { ra: 279.2347, dec: 38.7837, fov: 5 },
    "altair": { ra: 297.6958, dec: 8.8683, fov: 5 },
    "deneb": { ra: 310.358, dec: 45.2803, fov: 5 },
    "antares": { ra: 247.3519, dec: -26.4319, fov: 5 },
    "arcturus": { ra: 213.9153, dec: 19.1825, fov: 5 },
    "proxima centauri": { ra: 217.4289, dec: -62.6795, fov: 2 },
    "sagittarius a*": { ra: 266.4168, dec: -29.0078, fov: 1 },
    "galactic center": { ra: 266.4168, dec: -29.0078, fov: 1 },
    // Live trackers — viewer resolves position
    "international space station": { object: "ISS", track: 1 },
    iss: { object: "ISS", track: 1 },
    sun: { object: "Sun", track: 1 },
    moon: { object: "Moon", track: 1 },
    mercury: { object: "Mercury", track: 1 },
    venus: { object: "Venus", track: 1 },
    mars: { object: "Mars", track: 1 },
    jupiter: { object: "Jupiter", track: 1 },
    saturn: { object: "Saturn", track: 1 },
    uranus: { object: "Uranus", track: 1 },
    neptune: { object: "Neptune", track: 1 },
  };

  function pageTitle() {
    var h = document.getElementById("firstHeading");
    var raw = h && h.textContent ? h.textContent : document.title;
    return raw
      .replace(/\s*[-–—]\s*Wikipedia.*$/i, "")
      .replace(/\s*\(.*?\)\s*$/, "") // strip "(galaxy)" disambiguators
      .trim();
  }

  function lookupCatalog(title) {
    var key = title.toLowerCase();
    if (CATALOG[key]) return CATALOG[key];
    // Messier aliases: "M31" -> "messier 31"
    var mm = key.match(/^m\s*(\d{1,3})$/);
    if (mm) {
      var alias = "messier " + mm[1];
      if (CATALOG[alias]) return CATALOG[alias];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Astronomy-page detection                                        */
  /* ------------------------------------------------------------------ */

  function looksLikeAstroPage(title) {
    if (!title) return false;
    var t = title.trim();
    // Messier / NGC / IC / Caldwell / HD / HIP / HR / Gliese
    if (
      /^(messier\s+\d{1,3}|m\s*\d{1,3})\b/i.test(t) ||
      /^(ngc|ic|caldwell|hd|hip|hr|gj|gliese)\s+\d/i.test(t) ||
      /^(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\s+/i.test(
        t,
      )
    ) {
      return true;
    }
    // Catalog hit
    if (lookupCatalog(t)) return true;
    return false;
  }

  function isAstronomyPage() {
    // Cheap structural check: an infobox-style table with an RA row.
    var coords = extractFromInfobox();
    if (coords) return { coords: coords };
    var title = pageTitle();
    if (looksLikeAstroPage(title)) {
      var cat = lookupCatalog(title);
      if (cat) return { catalog: cat, title: title };
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* 5. URL building + button injection                                 */
  /* ------------------------------------------------------------------ */

  function buildViewerHref(detected) {
    var params = new URLSearchParams();
    if (detected.coords) {
      params.set("ra", detected.coords.ra.toFixed(4));
      params.set("dec", detected.coords.dec.toFixed(4));
      params.set("fov", String(DEFAULT_FOV));
    } else if (detected.catalog) {
      var c = detected.catalog;
      if (typeof c.ra === "number" && typeof c.dec === "number") {
        params.set("ra", c.ra.toFixed(4));
        params.set("dec", c.dec.toFixed(4));
        params.set("fov", String(c.fov || DEFAULT_FOV));
      }
      if (c.object) params.set("object", c.object);
      if (c.track) params.set("track", String(c.track));
    }
    params.set("utm_source", "wiki-ext");
    params.set("utm_medium", "browser-extension");
    return VIEWER_BASE + "/#viewer?" + params.toString();
  }

  function injectButton(detected) {
    var anchor =
      document.getElementById("firstHeading") ||
      document.querySelector("h1");
    if (!anchor) return;
    if (document.getElementById("uw-fly-to-btn")) return;

    var btn = document.createElement("a");
    btn.id = "uw-fly-to-btn";
    btn.className = "uw-fly-to-btn";
    btn.href = buildViewerHref(detected);
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.title =
      "Open this object in The Unspeakable World — every wavelength, in a browser.";
    btn.innerHTML =
      '<span class="uw-fly-to-icon" aria-hidden="true">🌌</span>' +
      '<span class="uw-fly-to-label">Fly to in The Unspeakable World</span>';
    anchor.appendChild(btn);
  }

  /* ------------------------------------------------------------------ */
  /* 6. Entry point                                                     */
  /* ------------------------------------------------------------------ */

  function run() {
    var detected = isAstronomyPage();
    if (!detected) return;
    injectButton(detected);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();

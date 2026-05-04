/**
 * Guide content. Plain TypeScript so it bundles into the lazy /guide
 * chunk and we can hyperlink between pages without a router.
 */

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "kbd"; rows: Array<[string, string]> }
  | { kind: "callout"; tone: "info" | "warn" | "tip"; text: string }
  | { kind: "link"; slug: string; text: string };

export type GuidePage = {
  slug: string;
  section: string;
  title: string;
  lede?: string;
  body: GuideBlock[];
  prev?: string;
  next?: string;
};

export const GUIDE_PAGES: GuidePage[] = [
  {
    slug: "essentials",
    section: "Start here",
    title: "Essentials",
    lede:
      "The seven shortcuts that recover you from any state, plus the gestures that move the camera in every mode.",
    body: [
      { kind: "h2", text: "Lost in space?" },
      {
        kind: "p",
        text:
          "Press ` (backtick) to fly back to the Sun in Universe Mode, or click ← back in any mode header. Esc closes the most recent panel and returns to the previous camera.",
      },
      { kind: "h2", text: "Must-know shortcuts" },
      {
        kind: "kbd",
        rows: [
          ["` (backtick)", "fly home to the Sun"],
          ["1 – 8", "Mercury · Venus · Earth · Mars · Jupiter · Saturn · Uranus · Neptune"],
          ["B", "Galactic Center"],
          ["N", "Andromeda (M31)"],
          ["F", "focus mode (hide all UI)"],
          ["W A S D", "move (Shift = boost)"],
          ["Q / E", "down / up"],
          ["space", "play / pause time"],
          ["? or H", "open the shortcut help"],
          ["Esc", "deselect / close panels / go back"],
        ],
      },
      { kind: "h2", text: "Mouse + touch" },
      {
        kind: "ul",
        items: [
          "Left-drag — orbit / look around",
          "Right-drag — pan",
          "Scroll wheel — adjust speed (Universe / Galactic) or zoom FOV (Sky Atlas)",
          "Click — inspect a body",
          "Right-click on a body — context menu",
          "Double-click a body — fly to it",
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        text:
          "Inertial rotation: release a fast left-drag and the rotation continues with smooth deceleration.",
      },
      { kind: "link", slug: "overview", text: "Continue with Getting Started" },
    ],
    next: "overview",
  },
  {
    slug: "overview",
    section: "Start here",
    title: "Getting Started",
    lede:
      "The Unspeakable World is a federated 3D atlas of the Virtual Observatory. Every wavelength of every sky survey, every spacecraft trajectory ever flown, in your browser. MIT licensed.",
    body: [
      { kind: "h2", text: "Five things you can do today" },
      {
        kind: "ul",
        items: [
          "Universe Mode — one camera, every scale (AU → Gly), with WASD free flight and seamless tier transitions.",
          "Sky Atlas — 8-wavelength HiPS sky-tile streaming + 88 IAU constellations + SIMBAD/Wikipedia inspector + Tonight's Sky.",
          "Solar Flight — 3D heliocentric solar system with drawn orbits, real planet ephemerides, Saturn rings, Galilean moons, Mars moons, real-satellite SGP4, and the Gravity Sandbox.",
          "Planetary Surface — textured Earth / Mars / Moon you can rotate around, with NASA-photo upgrade if CORS allows.",
          "Galactic Mode — procedural Milky Way with named arms, Local Group, cosmic web. WASD to fly between galaxies.",
        ],
      },
      { kind: "h2", text: "Recommended environment" },
      {
        kind: "ul",
        items: [
          "Modern browser with WebGL2: Chrome, Edge, Safari 17+, latest Firefox.",
          "Desktop / laptop with GPU acceleration enabled (mobile works but is reduced).",
          "Optional: share your location to get the rise/transit/set times, dark-sky window, and aurora outlook for tonight.",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        text:
          "We host nothing > 10 GB. Sky tiles stream from CDS Strasbourg / NASA IRSA / ESA ESASky; SIMBAD + Wikipedia + JPL + Celestrak run as live federated services. The viewer is the front-end; the data is the universe.",
      },
      { kind: "link", slug: "interface", text: "Continue with Interface" },
    ],
    prev: "essentials",
    next: "interface",
  },
  {
    slug: "interface",
    section: "Tour",
    title: "Interface",
    lede:
      "Every UI surface is a glass-morphism panel that floats over the 3D view. Panels are draggable / collapsible. Same shapes across modes.",
    body: [
      { kind: "h2", text: "Top bar" },
      {
        kind: "ul",
        items: [
          "Left: ← exit, mode label, search box (⌘K / /), snapshot (📷), tutorial (🎓).",
          "Center: wavelength bar in Universe + Sky Atlas (visible · Hα · 2MASS · WISE · UV · X-ray · radio · γ-ray) with cross-fade slider.",
          "Right: Events (📅), NEO (🛸), Sky Tonight (🌙), Space Weather (☀), Tonight's Sky (↑), and the FLY-TO chip strip (Sun, planets, Galactic Center, M31, Local Group).",
        ],
      },
      { kind: "h2", text: "Bottom bar" },
      {
        kind: "ul",
        items: [
          "Vicinity readout (auto-detected: Earth Vicinity → Inner Solar System → Local Stars → Whole Milky Way → Local Group → Cosmic Web).",
          "Distance from Sun (units adapt: m → km → AU → LY → kly → Mly → Gly).",
          "Speed (in Universe / Galactic — wheel adjusts).",
          "Time strip (▶ play, scrub, ×60 / ×1H / ×1D / ×30D rates, ⟲ NOW reset).",
        ],
      },
      { kind: "h2", text: "Bottom-left" },
      {
        kind: "p",
        text: "Color legend — every marker colour explained.",
      },
      { kind: "link", slug: "search", text: "Continue with Search & Deep Links" },
    ],
    prev: "overview",
    next: "search",
  },
  {
    slug: "search",
    section: "Tour",
    title: "Search & Deep Links",
    lede:
      "The search box indexes 117K stars + 14K deep-sky + 6K exoplanets + 4K pulsars + 73 cosmic landmarks + 88 constellations + 9 solar bodies + spacecraft + missions.",
    body: [
      { kind: "h2", text: "Unified search" },
      {
        kind: "ul",
        items: [
          "⌘K (Mac) / Ctrl-K — focus the search box",
          "/ (slash) — alt focus",
          "Matches HD/HIP/HR/M/NGC/IC catalogue ids, common names, aliases",
          "Fuzzy: tolerates 1–2 typos",
          "Click a result → camera flies there",
        ],
      },
      { kind: "h2", text: "Deep-link URLs" },
      {
        kind: "ul",
        items: [
          "/#viewer?ra=10.68&dec=41.27&fov=22 — sky-atlas camera state",
          "/#solar — Solar Flight Mode",
          "/#galactic — Galactic Mode",
          "/#universe — full unified Universe Mode",
          "/#surface/earth | mars | moon — planetary surface",
          "/#guide/<slug> — a specific page of this guide",
        ],
      },
      { kind: "h2", text: "Share Links" },
      {
        kind: "p",
        text:
          "Every pan / zoom / time-scrub round-trips into the URL hash, so any view you reach can be copy-pasted to share. The 🔗 share button at the top copies the current URL.",
      },
      {
        kind: "callout",
        tone: "warn",
        text:
          "Deep links may not survive future major-version updates. When a link no longer resolves, we fall back to the main view — keep a screenshot alongside any link you want to preserve.",
      },
      { kind: "link", slug: "universe", text: "Continue with Universe Mode" },
    ],
    prev: "interface",
    next: "universe",
  },
  {
    slug: "universe",
    section: "Modes",
    title: "Universe Mode",
    lede:
      "/#universe — one tool, every scale. Single Three.js scene with two coordinate frames (Solar in AU, Galactic in LY), camera-anchored so float-precision holds across 16 orders of magnitude.",
    body: [
      { kind: "h2", text: "What you see at each tier" },
      {
        kind: "kbd",
        rows: [
          ["Solar", "Sun + 8 planets + orbits + atmosphere + Saturn rings · HiPS sky tiles in the background · constellation lines + named stars + grid + pulsars + exoplanets + cosmic landmarks all toggleable"],
          ["Stellar", "Solar system collapses to a Sun marker, Milky Way disk fades in"],
          ["Galactic", "Full Milky Way disk with named arms (Perseus / Sagittarius-Carina / Scutum-Centaurus / Orion Spur) · Sgr A* + Galactic Bulge"],
          ["Cosmic", "Cosmic-web particle field + Local Group + Virgo Cluster + Laniakea + Great Attractor + Sloan Great Wall + Boötes Void"],
        ],
      },
      { kind: "h2", text: "Camera" },
      {
        kind: "ul",
        items: [
          "WASD (+ Q/E for vertical, Shift for boost)",
          "Drag to look around",
          "Wheel to adjust speed — adaptive: 1e-9 LY/s when very close, 1e6 LY/s when very far",
          "1–8 jump to planets, ` home, B Galactic Center, N M31",
        ],
      },
      { kind: "h2", text: "Wavelength bar" },
      {
        kind: "p",
        text:
          "Visible only in Solar tier (when the celestial-sphere skybox is active). Cross-fade between visible / Hα / 2MASS / WISE / UV / INTEGRAL X-ray / NVSS radio / Fermi γ-ray. The mix slider blends two layers when an overlay is on.",
      },
      { kind: "link", slug: "skyatlas", text: "Continue with Sky Atlas Mode" },
    ],
    prev: "search",
    next: "skyatlas",
  },
  {
    slug: "skyatlas",
    section: "Modes",
    title: "Sky Atlas Mode",
    lede:
      "/#viewer — focused celestial-sphere view. The classic planetarium experience with photographic HiPS tiles, click-to-inspect via SIMBAD + Wikipedia, and the full Tonight's Sky toolkit.",
    body: [
      { kind: "h2", text: "What's here" },
      {
        kind: "ul",
        items: [
          "8 wavelength HiPS surveys with cross-fade",
          "88 IAU constellation lines + 88 3-letter labels at centroids",
          "Top-60 named bright stars · 117,931 HYG stars total",
          "13,962 OpenNGC deep-sky objects (Messier + bright NGC/IC)",
          "6,278 confirmed exoplanet hosts · 3,927 SIMBAD pulsars · 73 named cosmic landmarks",
          "Real-time Sun + 8 planets + Moon (AstronomyEngine) + Galilean moons + ISS",
          "Voyager 1/2 · Pioneer 10/11 · New Horizons · JWST markers at their current sky directions",
          "RA/Dec equatorial grid + ecliptic + galactic plane + named landmarks (Sgr A*, equinoxes, solstices, galactic poles)",
        ],
      },
      { kind: "h2", text: "Inspector" },
      {
        kind: "p",
        text:
          "Click any sky point and we resolve the closest known object: solar bodies + ISS + spacecraft from the local resolver, then SIMBAD via the Worker proxy, with Wikipedia article extract chained on top. The inspector shows magnitude, distance, RA/Dec, type, identifiers, the rise/transit/set window for the night, and a 24-hour altitude sparkline.",
      },
      { kind: "h2", text: "Tonight's Sky" },
      {
        kind: "p",
        text:
          "Share location (button-gated geolocation, or manual lat/lon entry) and the camera snaps to your zenith at current sidereal time. The right-hand panels then show: rise/transit/set + dark-sky window per object, current moon phase, what's up tonight ranked by altitude × magnitude, the planetary K-index, and the aurora outlook.",
      },
      { kind: "link", slug: "solar", text: "Continue with Solar Flight Mode" },
    ],
    prev: "universe",
    next: "solar",
  },
  {
    slug: "solar",
    section: "Modes",
    title: "Solar Flight Mode",
    lede:
      "/#solar — focused 3D heliocentric view. Free orbit camera, drawn ellipse paths, real planet ephemerides, plus the Gravity Sandbox.",
    body: [
      { kind: "h2", text: "Camera" },
      {
        kind: "ul",
        items: [
          "Drag to orbit around the focused body, wheel to zoom",
          "Pick any focus chip in the top bar (Sun · Mercury · Venus · Earth · Mars · Jupiter · Saturn · Uranus · Neptune)",
          "1–8 keys jump to planets, ` to Sun, F to hide UI",
          "⊙ Tracking on/off — keep camera glued to the moving body or let it drift through the field",
          "⟲ Now button — reset sim time to wall-clock now",
        ],
      },
      { kind: "h2", text: "What's drawn" },
      {
        kind: "ul",
        items: [
          "Sun + glowing corona",
          "8 planets with real HelioVector() positions + orbital paths sampled across one full revolution",
          "Earth — procedural Blue Marble texture + atmosphere glow + async swap-in to NASA real photo",
          "Saturn — textured ring system with the Cassini Division",
          "Jupiter + Galilean moons (Io, Europa, Ganymede, Callisto) live from JupiterMoons()",
          "Mars + Phobos + Deimos via Keplerian propagation",
          "30K background stars + bright-star labels + cosmic-landmark labels at correct distances",
          "Solar Zones overlay: habitable zone, frost line, asteroid belt, Kuiper belt as ring loops",
          "🛰 935 real satellites with live SGP4 propagation when in Earth vicinity",
        ],
      },
      { kind: "h2", text: "⚛ Gravity Sandbox" },
      {
        kind: "p",
        text:
          "Open the orange ⚛ SANDBOX panel. Pick a projectile (Comet · Earth-class · Jupiter-class · Brown Dwarf · White Dwarf · Neutron Star · Black Hole), set launch speed (5–200 km/s), hit ▶ LAUNCH. Leapfrog n-body integration with the Sun + four gas giants. Up to 15 simultaneous projectiles, each with a 400-point trail.",
      },
      { kind: "link", slug: "surface", text: "Continue with Surface Mode" },
    ],
    prev: "skyatlas",
    next: "surface",
  },
  {
    slug: "surface",
    section: "Modes",
    title: "Planetary Surface Mode",
    lede:
      "/#surface/earth | mars | moon — close-up textured 3D body you can rotate around. Procedural texture renders instantly; real photographic NASA texture swaps in async if CORS allows.",
    body: [
      { kind: "h2", text: "Three planets so far" },
      {
        kind: "ul",
        items: [
          "Earth — continents + ice caps + cloud noise + atmosphere shader. NASA Blue Marble swaps in.",
          "Mars — maria-like dark patches + Olympus Mons highlight + dust streaks + polar caps. OSIRIS true-color swaps in.",
          "Moon — 1,500 procedural craters with bright rims + dark interiors + maria regions. FullMoon2010 swaps in.",
        ],
      },
      { kind: "h2", text: "Controls" },
      {
        kind: "ul",
        items: [
          "Drag — yaw / pitch around the body",
          "Wheel — zoom in / out (0.05 to 8 body radii)",
          "Auto-rotate toggle for hands-free viewing",
          "Top-right picker — switch between Earth, Mars, Moon",
        ],
      },
      { kind: "h2", text: "Right-side facts panel" },
      {
        kind: "p",
        text:
          "Radius, surface gravity, day length, year/period — plus a one-line tagline that captures the body's character (Mars: 'Olympus Mons rises 21.9 km above the datum. Two potato moons.').",
      },
      { kind: "link", slug: "galactic", text: "Continue with Galactic Mode" },
    ],
    prev: "solar",
    next: "galactic",
  },
  {
    slug: "galactic",
    section: "Modes",
    title: "Galactic Mode",
    lede:
      "/#galactic — focused Milky Way + Local Group + Cosmic Web view with WASD free flight. Subset of Universe Mode for users who want to start at galactic scale.",
    body: [
      { kind: "h2", text: "What's drawn" },
      {
        kind: "ul",
        items: [
          "Procedural Milky Way disk (110 kly) with 16K stars sampled along log-spirals + 4K dust lanes + central bulge gradient",
          "8K-particle 3D arm structure for parallax",
          "Stellar halo + thick disk visible as off-plane labels",
          "Spiral-arm labels: Perseus, Sagittarius-Carina, Scutum-Centaurus, Orion Spur",
          "Cosmic-web particle layer to ~1.5 Gly with ~80 cluster centers",
          "Named landmarks at correct distances: Sgr A*, Galactic Bulge, Solar System pin, M31, M33, LMC, SMC, Local Group, Virgo Cluster, Coma, Perseus Cluster, Cen A, Sombrero, Whirlpool, Laniakea, Shapley, Sloan Great Wall, Boötes Void",
        ],
      },
      { kind: "h2", text: "Fly-to presets" },
      {
        kind: "p",
        text: "Sun · Galactic Center · M31 · Local Group — buttons + B + N keys jump to those positions and aim the camera correctly.",
      },
      { kind: "link", slug: "settings", text: "Continue with Settings" },
    ],
    prev: "surface",
    next: "settings",
  },
  {
    slug: "settings",
    section: "Configuration",
    title: "Settings",
    lede:
      "Performance + visual options. All settings persist locally to your browser only.",
    body: [
      { kind: "h2", text: "Visual" },
      {
        kind: "ul",
        items: [
          "Real Scale toggle (Solar Flight) — drop planets to ~6% of cosmetic size, the educational 'planets are pinpricks' mode",
          "Orbit opacity slider (0–1, default 0.45) — fade drawn ellipses",
          "Star brightness slider (0–2) — dim or boost the background star field",
          "Coordinate grid + constellation lines + named stars are independently toggleable in Sky Atlas / Universe",
        ],
      },
      { kind: "h2", text: "Layers" },
      {
        kind: "p",
        text:
          "Toggle catalogue overlays: ✦ constellations, ⌖ grid, ★ named stars, ⚡ pulsars (3,927), ⊙ exoplanets (6,278), ◉ exotic objects (73 black holes / pulsars / SNRs / GW events / superclusters), 🛰 spacecraft, ◇ craft markers.",
      },
      { kind: "h2", text: "Tutorial + help" },
      {
        kind: "ul",
        items: [
          "🎓 Re-open the 8-step interactive tutorial",
          "? Show the keyboard-shortcut overlay",
          "ℹ About panel — every data source + license",
        ],
      },
      { kind: "link", slug: "faq", text: "Continue with FAQ" },
    ],
    prev: "galactic",
    next: "faq",
  },
  {
    slug: "faq",
    section: "Help",
    title: "FAQ & Troubleshooting",
    body: [
      { kind: "h3", text: "The viewer is choppy / low FPS" },
      {
        kind: "p",
        text:
          "Open Settings → set FPS cap to 30. Disable layers you're not using (constellations, pulsars, exoplanets). On older laptops, prefer Sky Atlas (2D-on-sphere) over Universe Mode (full 3D scene).",
      },
      { kind: "h3", text: "I clicked Tonight's Sky and got an error" },
      {
        kind: "p",
        text:
          "Share location is button-gated. If your browser denied geolocation, use the manual lat/lon entry below the Allow button. Coordinates never leave your device — pure client math.",
      },
      { kind: "h3", text: "Wikipedia thumbnail isn't loading" },
      {
        kind: "p",
        text:
          "Wikipedia's REST API blocks some referrers; we fall back to the SIMBAD inspector card without the image. Future versions will use a CF Worker proxy.",
      },
      { kind: "h3", text: "The polar seam — what's the dragon?" },
      {
        kind: "p",
        text:
          "HiPS uses HEALPix tiles. At lat ±41.81° (the Collignon boundary) our toy renderer has a thin crack between adjacent tiles. We document it — the production renderer is on the roadmap.",
      },
      { kind: "h3", text: "Universe Mode crashed when I zoomed in past Earth" },
      {
        kind: "p",
        text:
          "Float-precision wall. Each tier reanchors, but if you zoom to a planet without flying-to it first, the transition can stutter. Use 1–8 to fly to the planet first, then zoom further with the wheel.",
      },
      { kind: "link", slug: "contact", text: "Continue with Contact" },
    ],
    prev: "settings",
    next: "contact",
  },
  {
    slug: "contact",
    section: "Help",
    title: "Contact + Roadmap",
    body: [
      { kind: "h2", text: "Where to find us" },
      {
        kind: "ul",
        items: [
          "GitHub: github.com/sboghossian/unspeakable-world — issues, PRs, discussions",
          "Live: space.dashable.dev",
          "Built in public — every commit lands on main",
        ],
      },
      { kind: "h2", text: "License + attribution" },
      {
        kind: "p",
        text:
          "MIT for our source. Sky tiles via CDS Strasbourg + ESAC (public domain / CDS open). HYG v4.0 (CC BY-SA, David Nash). OpenNGC (CC BY-SA, Mattia Verga). d3-celestial (BSD-3, Olaf Frohn). AstronomyEngine (MIT, Don Cross). NASA Exoplanet Archive (public domain). SIMBAD via CDS open service. NOAA SWPC (US public domain). Celestrak TLEs (public domain). NASA imagery via Wikimedia Commons.",
      },
      { kind: "h2", text: "Roadmap" },
      {
        kind: "ul",
        items: [
          "Click-to-inspect on planets / stars / landmarks across all modes",
          "Aladin-Lite-style postage-stamp cutouts when clicking sky regions",
          "Layer 2 — grounded AI 'what am I looking at?' panel with citations",
          "Live transient stream (GraceDB + GCN + ATel)",
          "12 more HiPS surveys (Chandra, ROSAT, eROSITA, Spitzer, Herschel, IRAS, GAIA DR3, HI4PI, Planck CMB, EHT)",
          "Production HEALPix renderer — fix the polar seam",
          "VizieR catalog federation",
          "Mobile gyroscope: point your phone at the sky",
        ],
      },
    ],
    prev: "faq",
  },
];

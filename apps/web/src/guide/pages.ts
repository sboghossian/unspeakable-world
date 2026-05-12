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
  | { kind: "link"; slug: string; text: string }
  | {
      kind: "votes";
      items: Array<{ id: string; title: string; detail: string }>;
    };

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
      { kind: "link", slug: "account", text: "Continue with Account" },
    ],
    prev: "galactic",
    next: "account",
  },
  {
    slug: "account",
    section: "Configuration",
    title: "Account & Sign-in",
    lede:
      "There is no account in v1. Everything you do is local-first, anonymous, and free forever.",
    body: [
      { kind: "h2", text: "Why no sign-in?" },
      {
        kind: "p",
        text:
          "We federate public archives. There is nothing to lock behind a paywall, no quotas to enforce, no per-user state on a server. Your camera state, layer toggles, and pinned objects live in your browser only.",
      },
      { kind: "h2", text: "What persists locally" },
      {
        kind: "ul",
        items: [
          "Layer toggles (constellations, grid, pulsars, exoplanets, …)",
          "Real-scale toggle, orbit opacity, star brightness sliders",
          "Last-visited mode and camera state (URL hash + localStorage)",
          "Roadmap upvotes on the Roadmap page",
        ],
      },
      { kind: "h2", text: "What does NOT persist anywhere" },
      {
        kind: "ul",
        items: [
          "Geolocation — Tonight's Sky uses it once per session, never sent to a server",
          "Browser fingerprint, IP, or device id",
          "Search history, click history, dwell time",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        text:
          "If a future version adds optional sign-in (collections, sharing), it will be opt-in and the no-account path will always work.",
      },
      { kind: "link", slug: "quality", text: "Continue with Quality & Performance" },
    ],
    prev: "settings",
    next: "quality",
  },
  {
    slug: "quality",
    section: "Configuration",
    title: "Quality & Performance",
    lede:
      "How to get smooth 60 fps on a laptop, on a phone, and on a 5-year-old machine.",
    body: [
      { kind: "h2", text: "Render-on-demand" },
      {
        kind: "p",
        text:
          "When the camera idles for >250 ms we pause the requestAnimationFrame loop. Hover, pan, or click and it resumes. This is why a stationary 'staring at Andromeda' view costs near zero battery.",
      },
      { kind: "h2", text: "Recommended specs" },
      {
        kind: "ul",
        items: [
          "Best: any laptop or desktop with a discrete GPU and Chrome / Edge / Safari 17+",
          "Good: integrated-graphics Mac (M1+), modern phone (iPhone 12+, Pixel 6+)",
          "Reduced: low-end Android — falls back to fewer point sprites and lower star count",
        ],
      },
      { kind: "h2", text: "If frame rate drops" },
      {
        kind: "ul",
        items: [
          "Disable layers you're not using (pulsars + exoplanets are the heaviest)",
          "Switch from Universe to Sky Atlas (2D-on-sphere is cheaper than 3D)",
          "Close other GPU-heavy tabs (YouTube, Figma, Maps)",
          "On phone: tap once to dismiss the FLY-TO chip strip — it stops re-rendering",
        ],
      },
      { kind: "h2", text: "Memory ceiling" },
      {
        kind: "p",
        text:
          "Whole-app footprint stays under ~280 MB on first load (Three.js + 117K-star buffer + 14K DSO + HiPS sphere). Subsequent navigation between modes does not duplicate the catalogs.",
      },
      { kind: "link", slug: "faq", text: "Continue with FAQ" },
    ],
    prev: "account",
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
    prev: "quality",
    next: "contact",
  },
  {
    slug: "contact",
    section: "Help",
    title: "Contact",
    lede: "Reach the maintainer or open an issue.",
    body: [
      { kind: "h2", text: "Where to find us" },
      {
        kind: "ul",
        items: [
          "GitHub issues — github.com/sboghossian/unspeakable-world/issues",
          "GitHub discussions — for ideas, questions, show-and-tell",
          "Email — stephanemboghossian@gmail.com (response time: best effort, days not hours)",
          "Live build — unspeakable-world.dashable.dev",
        ],
      },
      { kind: "h2", text: "Reporting a bug" },
      {
        kind: "ul",
        items: [
          "Browser + version + OS",
          "URL hash that reproduces it (the entire #… string)",
          "Screenshot or short screen capture if visual",
          "Browser console errors (Cmd-Opt-J / F12)",
        ],
      },
      { kind: "link", slug: "roadmap", text: "Continue with Roadmap & Voting" },
    ],
    prev: "faq",
    next: "roadmap",
  },
  {
    slug: "roadmap",
    section: "Help",
    title: "Roadmap & Voting",
    lede:
      "Vote on what comes next. Counts persist locally per browser and inform what we build first.",
    body: [
      { kind: "h2", text: "Coming soon — vote it up" },
      {
        kind: "votes",
        items: [
          {
            id: "ai-inspector",
            title: "Grounded AI inspector",
            detail:
              "“What am I looking at?” panel with cited claims, drawing on SIMBAD + Wikipedia + NASA ADS.",
          },
          {
            id: "transients",
            title: "Live transient stream",
            detail:
              "GraceDB + GCN + ATel feed with markers that pulse on the sky for new alerts.",
          },
          {
            id: "more-hips",
            title: "12 more HiPS surveys",
            detail:
              "Chandra, ROSAT, eROSITA, Spitzer, Herschel, IRAS, Gaia DR3, HI4PI, Planck CMB, EHT, …",
          },
          {
            id: "vizier",
            title: "VizieR catalog federation",
            detail:
              "Search and overlay any of the 20,000+ VizieR catalogs as a layer.",
          },
          {
            id: "mobile-gyro",
            title: "Mobile gyroscope mode",
            detail:
              "Point your phone at the sky and the camera tracks. AR-style stargazing.",
          },
          {
            id: "healpix-prod",
            title: "Production HEALPix renderer",
            detail:
              "Fix the polar seam at lat ±41.81° with proper Collignon-aware tile geometry.",
          },
          {
            id: "spacecraft-trajectories",
            title: "Spacecraft trajectories",
            detail:
              "Voyager 1/2, New Horizons, JWST, Parker Solar Probe with real ephemerides.",
          },
          {
            id: "dark-matter",
            title: "Dark-matter halo overlay",
            detail:
              "Visualize the inferred mass distribution in the Local Group and Virgo Supercluster.",
          },
          {
            id: "collections",
            title: "Collections (opt-in account)",
            detail:
              "Save a list of objects and share the collection by URL. Opt-in only — anonymous path stays default.",
          },
          {
            id: "i18n",
            title: "Translations",
            detail:
              "Languages: ES, FR, DE, JA, ZH. UI strings + body text.",
          },
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        text:
          "Votes are stored in your browser's localStorage. We periodically aggregate anonymous counts via opt-in telemetry — never tied to any identity.",
      },
      { kind: "link", slug: "support", text: "Continue with Support" },
    ],
    prev: "contact",
    next: "support",
  },
  {
    slug: "support",
    section: "Help",
    title: "Support",
    lede:
      "How to get help, how to support the project, and what to expect on response times.",
    body: [
      { kind: "h2", text: "Get help" },
      {
        kind: "ul",
        items: [
          "Read the FAQ first — most questions are answered there",
          "Open a GitHub Discussion for usage questions",
          "Open a GitHub Issue for reproducible bugs",
          "Email for sensitive reports (security, copyright, takedown)",
        ],
      },
      { kind: "h2", text: "Support the project" },
      {
        kind: "ul",
        items: [
          "Star the GitHub repo — visibility helps recruit contributors",
          "Share a deep-link of a beautiful view on social",
          "File a clear bug report with a hash URL — saves us hours",
          "Open a PR — small docs fixes are deeply appreciated",
        ],
      },
      { kind: "h2", text: "Response times" },
      {
        kind: "p",
        text:
          "This is a solo MIT-licensed project. Best-effort response within a few days; no SLA. Critical security reports get priority — email rather than filing a public issue.",
      },
      { kind: "link", slug: "copyright", text: "Continue with Copyright" },
    ],
    prev: "roadmap",
    next: "copyright",
  },
  {
    slug: "copyright",
    section: "Legal",
    title: "Copyright & Attribution",
    lede:
      "Our source is MIT. The data we federate stays under its upstream licenses. Here's how to credit each piece.",
    body: [
      { kind: "h2", text: "Source code" },
      {
        kind: "p",
        text:
          "© 2026 Stephane Boghossian and contributors. Source released under the MIT License. You may copy, modify, distribute, and use it commercially, with attribution. The full text lives at the LICENSE file in the repo.",
      },
      { kind: "h2", text: "Catalogs & sky tiles" },
      {
        kind: "ul",
        items: [
          "HYG v4.0 star catalog — © David Nash · CC BY-SA 2.5 · github.com/astronexus/HYG-Database",
          "OpenNGC deep-sky catalog — © Mattia Verga · CC BY-SA 4.0 · github.com/mattiaverga/OpenNGC",
          "NASA Exoplanet Archive (PSCompPars) — public domain · exoplanetarchive.ipac.caltech.edu",
          "SIMBAD object database — CDS, Strasbourg · CC BY 4.0 · simbad.cds.unistra.fr",
          "HiPS sky imagery — CDS / NASA IRSA / ESA ESASky · open-access scientific use · aladin.cds.unistra.fr/hips",
          "d3-celestial constellation lines — © Olaf Frohn · BSD-3 · github.com/ofrohn/d3-celestial",
          "AstronomyEngine ephemerides — © Don Cross · MIT · github.com/cosinekitty/astronomy",
          "Celestrak TLEs (satellites) — public domain · celestrak.org",
          "NOAA SWPC space-weather feeds — US public domain · swpc.noaa.gov",
          "JPL CAD API (NEO close approach) — public domain · ssd-api.jpl.nasa.gov",
          "Wikipedia REST API — CC BY-SA · en.wikipedia.org/api/rest_v1",
          "Planet textures — NASA / JPL / USGS public domain via Wikimedia Commons",
        ],
      },
      { kind: "h2", text: "Citing us" },
      {
        kind: "p",
        text:
          "If you use a figure or screenshot in a paper or article, please credit ‘The Unspeakable World — unspeakable-world.dashable.dev’ and a permalink (URL hash) to the view. Bibtex stub on the GitHub README.",
      },
      {
        kind: "callout",
        tone: "warn",
        text:
          "If you believe content here infringes your rights, please email stephanemboghossian@gmail.com with the URL and a description. We act within 72 hours on good-faith requests.",
      },
      { kind: "link", slug: "terms", text: "Continue with Terms" },
    ],
    prev: "support",
    next: "terms",
  },
  {
    slug: "terms",
    section: "Legal",
    title: "Terms of Use",
    lede:
      "Plain-English summary first. Free to use, AS-IS, no warranty, no resale of mirrored content.",
    body: [
      { kind: "h2", text: "Plain English" },
      {
        kind: "ul",
        items: [
          "It's free. No accounts, no payments, no quotas in v1.",
          "Don't break the law with it (illegal targeting, harassment, etc.).",
          "Don't try to DoS the upstream archives we federate (CDS, IRSA, NASA, SIMBAD).",
          "We provide the service AS-IS. No warranty. Outages happen.",
          "We may change the URL or shut down the service at any time.",
        ],
      },
      { kind: "h2", text: "Acceptable use" },
      {
        kind: "p",
        text:
          "You agree not to use the service to violate any law, infringe any third-party right, or attempt to overwhelm the federated data sources. Automated scraping must respect each upstream provider's rate limits — they are not ours to grant.",
      },
      { kind: "h2", text: "No warranty" },
      {
        kind: "p",
        text:
          "The site is provided AS-IS, without warranty of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement. The maintainers are not liable for any damages arising from use of the site.",
      },
      { kind: "h2", text: "Educational / research use" },
      {
        kind: "p",
        text:
          "All data shown is intended for education, public outreach, and informal scientific exploration. For peer-reviewed work, always cite the upstream archive directly.",
      },
      { kind: "h2", text: "Changes" },
      {
        kind: "p",
        text:
          "We may update these terms. Material changes will be noted in the GitHub repo; continued use after a change means you accept the new terms.",
      },
      { kind: "link", slug: "privacy", text: "Continue with Privacy" },
    ],
    prev: "copyright",
    next: "privacy",
  },
  {
    slug: "privacy",
    section: "Legal",
    title: "Privacy",
    lede:
      "We don't have your data. There is no account, no tracker, no third-party analytics that follows you.",
    body: [
      { kind: "h2", text: "What we DO NOT collect" },
      {
        kind: "ul",
        items: [
          "No account — there is no sign-up form",
          "No advertising trackers, no Facebook/Google pixels",
          "No browser fingerprinting",
          "No location data sent to a server (Tonight's Sky is fully client-side)",
          "No payment data — there is nothing to pay for",
        ],
      },
      { kind: "h2", text: "What lives in YOUR browser only" },
      {
        kind: "ul",
        items: [
          "Layer toggles, sliders, and last-mode (localStorage)",
          "Roadmap upvotes (localStorage)",
          "Search history is not persisted",
          "URL hash with current camera state (you choose to share)",
        ],
      },
      { kind: "h2", text: "What we MIGHT collect" },
      {
        kind: "ul",
        items: [
          "Server access logs at the CDN edge — IP + URL + timestamp + UA — kept up to 14 days for abuse prevention, then dropped",
          "Aggregated anonymous request counts — no per-user breakdown",
          "Optional self-hosted analytics for page views (no cookies, no fingerprint, country-level only)",
        ],
      },
      { kind: "h2", text: "Third parties" },
      {
        kind: "p",
        text:
          "When you use the viewer, your browser fetches sky tiles and catalog data directly from CDS Strasbourg, NASA IRSA, ESA ESASky, SIMBAD, NOAA, JPL, Celestrak, and Wikipedia. Each of those services has its own privacy policy and may log requests. We do not proxy or relay your queries.",
      },
      { kind: "h2", text: "Your rights" },
      {
        kind: "p",
        text:
          "You can clear all local data by clearing your browser's site data for unspeakable-world.dashable.dev. There is nothing to delete on our side because we never received it.",
      },
      {
        kind: "callout",
        tone: "tip",
        text:
          "If you spot a feature that leaks personal data (geolocation, IP, etc.) to anyone other than the upstream archives listed above, treat it as a security bug and email us.",
      },
    ],
    prev: "terms",
  },

  // ── Release & reference ─────────────────────────────────────────────
  {
    slug: "whats-new",
    section: "Release notes",
    title: "What's new",
    lede:
      "Release log for the Unspeakable World. New entries land when a substantial feature batch hits main.",
    body: [
      { kind: "h2", text: "May 2026 — visual & UX parity pass" },
      { kind: "h3", text: "Solar system" },
      {
        kind: "ul",
        items: [
          "Textured planets — Mercury craters, Venus swirls, banded Jupiter w/ Great Red Spot, Mars rust + polar caps, paler Saturn bands, faint Uranus bands, deep azure Neptune w/ dark spot",
          "Earth day/night shader with city-lights map on the unlit hemisphere, smooth ~17° terminator, Fresnel atmosphere with golden sunset glow",
          "Real PointLight at the Sun + AmbientLight floor — every planet + moon shows correct day/night gradients",
          "Granulated Sun: convection cells + sunspots biased to the activity belt",
          "Saturn ring shadow on the body — analytical ray-cast shader, no shadow maps",
          "Every planet (and the Sun) rotates on its real sidereal day, Venus + Uranus retrograde",
          "Earth's Moon — Lambert-lit, synchronous rotation, maria + ray craters",
          "10k-body main-belt asteroid swarm shared with Universe mode, Oort Cloud shell at 2-6k AU",
          "Sun-Earth Lagrange points L1-L5",
          "3D ISS + 3D JWST models, propagated from real TLE / L2 geometry",
          "27 capital-city labels parented to Earth's sphere — fade in when zoomed close",
        ],
      },
      { kind: "h3", text: "UI / UX" },
      {
        kind: "ul",
        items: [
          "Cinematic bottom-HUD across every scene: DISTANCE FROM SUN · vicinity · SCREEN SCALE",
          "Categorized Celestial Objects panel with count badges",
          "Top-bar icon cluster: mute · focus · fullscreen, plus a ✨ surprise-me random fly-to",
          "🏆 Achievements (10 badges) + bottom-right unlock toast",
          "Satellites drawer with live SGP4 readouts (altitude · speed · lat · lon · orbital period · inclination · NORAD ID · launch year)",
          "Black-hole landmarks gain a photon-ring + accretion-disk sprite",
          "Cinematic loading veil with named phases",
          "🐛 Report-a-bug floating button — prefilled GitHub Issue",
          "Global `?` hotkey opens a keyboard-shortcut overlay",
        ],
      },
      { kind: "h3", text: "Landing" },
      {
        kind: "ul",
        items: [
          "Drifting Starfield with shooting-star meteors every 4-10s",
          "Active PWA install banner",
          "Today-in-astronomy-history card (~30 curated dates)",
          "Six-card feature highlights grid",
        ],
      },
      { kind: "h2", text: "Earlier" },
      {
        kind: "p",
        text:
          "Tracking mode, snapshot/share parity, cross-mode bookmarks, pulsar sonification, aurora oval, light cone, grounded SIMBAD + Wikipedia inspector, IndexedDB cache, verified imagery, continuous time scrubber, 2D Aitoff sky projection, planetary moons, curated mission trajectories with HORIZONS data, time-machine presets, eclipse predictor, solar-system zones, settings panel + persistence, standby mode, NEO panel, space-weather panel, Tonight Sky observer panel, 8 wavelengths of HiPS tiles, full 6DOF Universe mode, gravity sandbox playground.",
      },
    ],
    prev: "privacy",
    next: "deep-links",
  },

  {
    slug: "deep-links",
    section: "Release notes",
    title: "Deep links",
    lede:
      "Every mode, body, and zone is reachable by URL. Share the exact view; the receiver lands where you were.",
    body: [
      { kind: "h2", text: "Modes" },
      {
        kind: "ul",
        items: [
          "/#universe — the full multi-tier explorer (default for repeat visitors)",
          "/#solar — solar-flight at heliocentric AU",
          "/#galactic — Milky Way + Local Group + cosmic web",
          "/#surface/earth and /#surface/mars — high-detail planet surfaces",
          "/#viewer — Sky Atlas (celestial-sphere browser)",
          "/#sandbox — gravity sandbox playground",
          "/#guide — this user guide",
        ],
      },
      { kind: "h2", text: "Camera-state parameters" },
      {
        kind: "p",
        text:
          "Every scene appends its camera state to the hash: focus body, yaw/pitch/distance, sim time, time rate, tracking flag. The share button copies the entire hash so URLs round-trip cleanly.",
      },
      { kind: "h2", text: "Examples" },
      {
        kind: "ul",
        items: [
          "/#solar?focus=Saturn&dist=0.5 — fly to Saturn with a 0.5 AU camera distance",
          "/#universe?ra=83.633&dec=22.014&fov=2 — point at the Crab Nebula at 2° FOV",
          "/#guide/whats-new — jump straight to the release log",
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        text:
          "The share button copies the hash with the simulation time — a link saved during an eclipse will replay the same eclipse view.",
      },
    ],
    prev: "whats-new",
    next: "embed",
  },

  {
    slug: "whoami",
    section: "About",
    title: "Who made this",
    lede:
      "The Unspeakable World is a one-builder open-source project. Hi 👋 — I'm Stephane.",
    body: [
      { kind: "h2", text: "Stephane Boghossian" },
      {
        kind: "p",
        text:
          "Builder of consumer + AI products. Day job is co-founding HAQQ — a legal-AI startup. Nights & weekends I build emotionally legible tools for the open web. The Unspeakable World is what happens when you give a curious astronomer a browser, a Three.js shader, and a public Virtual-Observatory archive.",
      },
      { kind: "h2", text: "Why this exists" },
      {
        kind: "p",
        text:
          "Astronomy data has been heroically open for thirty years — every photon ever recorded by NASA, ESA, ESO, and friends is one HTTPS request away. The viewer layer hasn't caught up. Stellarium is a desktop install. Aladin Lite is a 2D sky atlas. NASA Eyes is a spacecraft tracker. SpaceEngine is gorgeous and closed. There was no single thing that let a curious person — not a researcher — fly from Earth's day/night terminator to the cosmic web in a browser, for free, with their feet on every dataset that real astronomers use.",
      },
      {
        kind: "p",
        text:
          "So I started building one. Federated where possible (the sky tiles stream from CDS Strasbourg, the catalog queries hit SIMBAD live, the satellites come from Celestrak SGP4 every second), self-hosted only where the upstream stops being polite. MIT licensed end to end.",
      },
      { kind: "h2", text: "Stack + sources" },
      {
        kind: "ul",
        items: [
          "Rendering: Three.js (WebGL2) with custom shaders for Earth day/night, Saturn ring shadow, Sun gravity-well grid, atmospheric scattering",
          "Frontend: Vite 6 + React 19 + TypeScript strict + Tailwind",
          "Data warehousing: DuckDB-WASM in a Web Worker for the Hipparcos catalog",
          "Ephemerides: AstronomyEngine (planets, moons, eclipses), satellite.js (SGP4 for live TLE)",
          "Federation: Cloudflare Workers proxy SIMBAD / NED / VizieR / Wikipedia + cache aggressively",
          "Hosting: Cloudflare Pages + R2 + Workers (free tier — we pay only when the Hacker News front page happens)",
        ],
      },
      { kind: "h2", text: "Data we draw from" },
      {
        kind: "p",
        text:
          "Hipparcos-Yale-Gliese (118k stars), Gaia DR3 (nearby subset), OpenNGC (13.9k deep-sky), NASA Exoplanet Archive (6.3k confirmed), Minor Planet Center (10k asteroids + comets), ATNF Pulsar Catalogue (3.9k pulsars), Open Supernova Catalog, Green's SNR catalog, LIGO GWOSC + BlackCAT for black holes, Celestrak TLEs for ~400 live satellites, AstronomyEngine for planetary state vectors, CDS Strasbourg's HiPS tiles for the multi-wavelength sky, NOAA SWPC for live aurora + solar wind, JPL HORIZONS for spacecraft trajectories.",
      },
      { kind: "h2", text: "How to support" },
      {
        kind: "p",
        text:
          "It's free, no account, no tracking, no ads — the work is the contribution. If you want to throw something in the hat: ⭐ the GitHub repo, send a screenshot to your favourite group chat, or tweet a feature you'd like to see. Bug reports via the 🐛 button in the viewer go straight into the public issue tracker.",
      },
      {
        kind: "callout",
        tone: "tip",
        text:
          "If you teach astronomy and want a deep link to a specific lesson view, the share button in the top-bar captures the entire camera + simulation state into a URL. Drop it into Notion / your LMS and the student lands exactly where you were.",
      },
      { kind: "h2", text: "Find me" },
      {
        kind: "ul",
        items: [
          "Email — stephanemboghossian@gmail.com",
          "GitHub — github.com/sboghossian",
          "Project — github.com/sboghossian/unspeakable-world",
        ],
      },
    ],
    prev: "shortcuts-ref",
  },

  {
    slug: "embed",
    section: "Release notes",
    title: "Embedding the viewer",
    lede:
      "Drop a chrome-less, interactive Unspeakable World scene into your blog, course site, or Notion page with a single iframe.",
    body: [
      { kind: "h2", text: "How it works" },
      {
        kind: "p",
        text:
          "Append ?embed=1 to any unspeakable-world.pages.dev URL and the viewer renders without the top bar, the left rail, the bottom HUD, the share/snapshot buttons, or any overlays. Just the scene, plus a tiny 'Unspeakable World ↗' link in the bottom-right that opens the full app in a new tab. Drag, pinch, and scroll-wheel still work — your readers can explore inside the iframe.",
      },
      { kind: "h2", text: "URL pattern" },
      {
        kind: "ul",
        items: [
          "https://unspeakable-world.pages.dev/?embed=1#viewer (Sky Atlas — fully chrome-less)",
          "https://unspeakable-world.pages.dev/?embed=1#viewer?ra=10.68&dec=41.27&fov=8 (Andromeda)",
          "https://unspeakable-world.pages.dev/?embed=1#solar?focus=Saturn (heliocentric — mode picker still visible)",
        ],
      },
      {
        kind: "callout",
        tone: "info",
        text:
          "Both query (?embed=1) and hash (#embed) detection work; either form on its own is enough to enter embed mode. The fragment after the # encodes the camera / focus state exactly like a normal share link.",
      },
      { kind: "h2", text: "Iframe snippet" },
      {
        kind: "p",
        text:
          "Paste this into your HTML, Markdown article, or Notion 'Embed' block. Set the height to whatever fits your layout — 60vh is a sensible default.",
      },
      {
        kind: "ul",
        items: [
          "<iframe src=\"https://unspeakable-world.pages.dev/?embed=1#viewer\" width=\"100%\" height=\"540\" style=\"border:0;border-radius:12px\" loading=\"lazy\" allow=\"fullscreen\"></iframe>",
        ],
      },
      { kind: "h2", text: "Three examples" },
      {
        kind: "ul",
        items: [
          "Saturn close-up — ?embed=1#solar?focus=Saturn (heliocentric, ringed)",
          "Andromeda (M31) — ?embed=1#viewer?ra=10.68&dec=41.27&fov=8 (Sky Atlas)",
          "ISS live tracker — ?embed=1#viewer (default Sky Atlas; the ISS marker chases its current ground track in real time)",
        ],
      },
      { kind: "h2", text: "Responsive sizing tip" },
      {
        kind: "p",
        text:
          "The viewer is fluid — it fills 100% of the iframe at any aspect ratio. For mobile, prefer aspect-ratio:16/9 with a min-height around 320px so the canvas still has room. Avoid fixed pixel widths.",
      },
      {
        kind: "callout",
        tone: "tip",
        text:
          "Embedded views remain fully interactive but never auto-prompt for geolocation. Tonight's-sky features in embed mode will fall back to the read-only universal view.",
      },
      {
        kind: "p",
        text:
          "A standalone copy-paste demo lives at /embed.html on the deployed site, so you can preview the snippet without leaving Unspeakable World.",
      },
    ],
    prev: "deep-links",
    next: "shortcuts-ref",
  },
  {
    slug: "shortcuts-ref",
    section: "Release notes",
    title: "Keyboard shortcuts",
    lede:
      "Press `?` from anywhere in the viewer for a categorized cheat sheet. The full list lives below for offline reference.",
    body: [
      { kind: "h2", text: "Global" },
      {
        kind: "kbd",
        rows: [
          ["?", "Open the keyboard-shortcuts overlay"],
          ["Esc", "Close panels / overlays"],
          ["⌘K / /", "Open search"],
          ["Space", "Play / pause time"],
          ["← / →", "Step time backward / forward"],
          [".", "Reset simulation to now"],
        ],
      },
      { kind: "h2", text: "Solar flight" },
      {
        kind: "kbd",
        rows: [
          ["`", "Reset focus to the Sun"],
          ["1 – 8", "Jump focus to Mercury → Neptune"],
          ["F", "Toggle focus-mode (hide UI for screenshots)"],
          ["K", "Toggle solar-system zone overlays"],
          ["drag", "Orbit camera around focus"],
          ["wheel / pinch", "Zoom"],
        ],
      },
      { kind: "h2", text: "Universe" },
      {
        kind: "kbd",
        rows: [
          ["W A S D", "Free-fly through 3D space"],
          ["Q / E", "Roll up / down"],
          ["1 – 8", "Jump to planet"],
          ["B", "Jump to the Galactic Centre"],
          ["N", "Jump to M31 (Andromeda)"],
          ["L", "Toggle constellation lines"],
          ["G", "Toggle reference grid"],
          ["Y", "Toggle live aurora overlay"],
          ["K", "Toggle solar zones"],
        ],
      },
      { kind: "h2", text: "Sky Atlas" },
      {
        kind: "kbd",
        rows: [
          ["C", "Toggle constellation lines"],
          ["N", "Toggle bright-star names"],
          ["S", "Toggle spacecraft markers"],
          ["X", "Toggle exoplanet hosts"],
          ["Z", "Toggle exotic objects (BH · pulsars · SNR)"],
          ["I", "About / credits"],
          ["E", "Astronomical events panel"],
          ["T", "Start the Grand Tour"],
        ],
      },
    ],
    prev: "embed",
    next: "whoami",
  },
];

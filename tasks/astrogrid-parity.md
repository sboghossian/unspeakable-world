# AstroGrid Parity Plan — what they have we don't

Walked through https://velonspace.com/ end to end. The big surprises are
not "they have more stars" — that's at parity. The surprises are the
**collateral product surface**: a satellite catalog, a gravity sandbox,
a tutorial, a textured 3D Earth, and a far richer left-rail layer
taxonomy. Below is the full audit + a prioritized backlog.

## What I observed (sidebar tools, in order)

1. **Collapse** — sidebar can collapse to icon-only.
2. **Space Travel** — top-level mode (selected by default).
3. **Tutorial** — interactive guided tutorial (we have a tour but no
   "click here next" tutorial).
4. **Celestial Objects** — submenu with a full taxonomy of toggles:
   - **Cosmic Background**: Cosmic clusters (10), Milky Way overlay (1)
   - **Solar System**: Sun + 8 planets + moons (12 entries)
   - **Solar Overlays**: Scattered Disk (Trans-Neptunian), Solar Zones
     (5 — habitable zone, frost line)
   - **Spacecraft**: Probes & Missions (30+, includes Voyager/NH)
   - **Stars**: 120,000+ HYG
   - **Exoplanets**: 5,000+
   - **Nebulae**: thousands
   - **Planetary Nebulae**: hundreds
   - **Supernova Remnants**: hundreds
   - **Special Objects**:
     - Pulsars (3,000+)
     - Black Holes (dozens)
     - Supernovae (hundreds)
     - **Gravitational-wave events (90+)** ← LIGO/Virgo detected
   - **Galaxies**: 100,000+
   - **Neighboring Galaxies** (~20: LMC, SMC, Andromeda, Triangulum…)
   - **Quasars** (100,000+)
   - **Galaxy Groups** (25)
   - **Galaxy Clusters** (50)
   - **Large-scale Structure**:
     - Superclusters (20)
     - Cosmic Web (25 filaments / walls / voids)
5. **Missions** — 14+ named spacecraft missions with launch year:
   Hubble, JWST, ISS, Chandra, New Horizons, Cassini-Huygens, Curiosity,
   Perseverance, Apollo 11, Artemis I, Space Shuttle Discovery, Spitzer,
   Voyager 1, Voyager 2 (+ "9 active · 5 historical" filter)
6. **Satellites** — **3,797 real satellites** in Earth orbit (TLE feed
   from Celestrak), grouped by category (Space Stations, Cargo, Comm,
   etc.) with altitude readouts. ISS, CSS, Crew Dragon, Soyuz, Progress,
   Shenzhou, Spitzer, etc. Some have `3D` chips meaning textured models.
7. **Gravity Sandbox** — full n-body physics playground:
   - Pick projectile: Comet · Earth-class · Jupiter-class · Brown Dwarf
     · White Dwarf · Neutron Star · Black Hole
   - Launch speed: Slow / Normal / Fast / Extreme / Near-light
   - Simulation speed: 1d/s, 7d/s, 30d/s, 6mo/s, 1yr/s
   - Gravity reference numbers (Earth 9.8 m/s², Sun 274 m/s²)
   - Right-click anywhere to launch
8. **Scenario Tour** — curated cinematic scenarios (Black Hole Lensing,
   Pinwheel Galaxy, …) — "more coming soon."
9. **Show Names** (L key) — toggle name labels.
10. **Orbital Paths** (O key) — toggle drawn orbits.
11. **Reference Grid** (G key) — the ground plane.
12. **Solar System Zones** (K key) — vicinity zones (Earth Vicinity,
    Jupiter Vicinity…).
13. **Real Scale** (M key) — toggle physical-scale planets (tiny, true
    to size).
14. **Real Color** (C key) — toggle realistic body colors.
15. **2D / 3D View Toggle** (Z key) — flip celestial-sphere ↔ 3D mode.
16. **Tracking Mode** — auto-follow a moving target (FOLLOW state).
17. **Distance Scale** — measurement tool.
18. **Time Controls** — usual time scrub.

**Sliders (always-visible at the bottom of left rail):**
- ORBIT LINE OPACITY (0–100%, default 70)
- GRID OPACITY (0–100%, default 20)
- STAR BRIGHTNESS (0–100%, default 100)
- FLY-TO DURATION (0–10 s, default 5.0)

**Top bar:**
- ASTROGRID logo + "User Guide" link
- Search "Search stars, planets, ga…"
- 🏠 Home (return to Sun-overview)
- 🌐 (probably reference frame switcher)
- ✨ (probably AI / suggestion)
- 🎯 achievements
- ✉ share/embed
- 🔇 background music
- ⛶ focus on selection
- ⛶⛶ fullscreen
- ⚙ settings
- 🛒 store / coffee
- ☾ theme

**Bottom-left:**
- "Color Legend" (explains marker colors)

**Bottom-center HUD:**
- "DISTANCE FROM SUN" + value (1.82 AU)
- "EARTH VICINITY" (the named scale region)
- Camera distance: "2.63 AU"
- Time controls inline: −, <, ⏸, >, +, "1 hr/s", "Now", ✕

**Other big visual differences:**
- **Earth is rendered as a textured 3D sphere** with continents, oceans,
  day/night terminator. We render flat blue.
- **PWA install prompt** is actively pushed in-app ("Install as App"
  banner top-right with Install button).
- **"Buy me a coffee"** badge top-right.
- **Loading screen** has phase indicators ("Core systems · camera ·
  background · solar system" → "Building star field" → "Loading Milky
  Way & nebulae" → "Preparing deep sky & large-scale structures") with
  percentage bar.

## Prioritized backlog for The Unspeakable World

### Tier 1 — high impact, ship-able in days, fills obvious gaps

1. **Textured 3D Earth** in solar flight mode.
   - Free public-domain Earth texture (NASA Blue Marble, 2K/4K).
   - Day/night shader: front-side lit, back-side faint emissive city
     glow.
   - 30-min job for the texture, ~2 h for the shader.

2. **Real-satellite catalog**. Pull Celestrak's `satcat.txt` + the
   TLE feed (or N2YO API). 3K+ satellites visible around Earth, grouped
   by category. Subset of 30-100 famous ones (ISS, Hubble, GPS, Iridium,
   Starlink top-of-train, weather sats).

3. **Gravity Sandbox**. Single-page mini-app: n-body solver
   (Verlet integration), pick-projectile UI, click to launch. Doesn't
   need to be physically perfect — needs to be fun. The 7 projectile
   types are mostly cosmetic (mass + glow color).

4. **Solar System Zones overlay**. Habitable zone / frost line / Kuiper
   belt / Oort cloud visualization in solar flight. Easy data, big
   educational impact.

5. **Tracking Mode**. Lock the camera onto a moving body so it stays
   centered as time scrubs. We almost have this — just pin yaw/pitch to
   target velocity vector.

6. **"User Guide" page**. Public README-as-page documenting every
   feature + every keyboard shortcut.

7. **Tutorial mode**. Step-by-step interactive overlay: "Drag to look",
   "Click any star", "Press space to play time", etc.

8. **Sidebar (collapsible left rail)**. Replace the scattered top-bar
   buttons with a categorized left rail like theirs:
   - Travel · Tutorial · Layers · Missions · Satellites · Sandbox ·
     Tour · Settings — plus the always-visible toggles + sliders.

### Tier 2 — bigger data adds

9. **Real planetary nebulae catalog** (~hundreds). PN catalog from
   SIMBAD or HASH database.

10. **Supernova remnants catalog** (~hundreds). Green's catalog or
    similar.

11. **Pulsar catalog** (3,000+). ATNF Pulsar Catalogue. We currently
    list 8 named — they have 3K markers.

12. **Gravitational-wave events catalog** (90+). LIGO/Virgo public list
    via GraceDB.

13. **Galaxy catalog** with 100K objects. HyperLEDA or 2MRS catalog. We
    currently have 13.9K NGC; theirs is wider.

14. **Quasar catalog** (100K+). Million Quasar Catalog (MILLIQUAS).

15. **Galaxy groups / clusters / superclusters / cosmic web**. These are
    real 3D-positioned structures from the SDSS/2dF surveys. Ambitious.

### Tier 3 — Solar Flight polish

16. **Mars moons (Phobos, Deimos)** in solar flight. Hardcoded Keplerian
    elements + simple propagator.

17. **Saturn moons (Titan, Rhea, Iapetus, Enceladus, Mimas)** in solar
    flight. Same approach.

18. **"Real Scale" toggle** — show planets at their physical size
    relative to orbits (planets vanish, but it's educational).

19. **"Real Color" toggle** — realistic surface colors / textures.

20. **Solar Zones** drawn as ring overlays (habitable zone =
    0.95–1.37 AU, frost line ≈ 4.85 AU, etc).

21. **Scattered Disk / TNO / Oort cloud** point cloud at the appropriate
    radii.

22. **Loading screen phase indicator**. We just show a bar; theirs
    spells out which subsystem is loading.

### Tier 4 — UX / polish features they have

23. **Color Legend** — small button bottom-left explaining what each
    marker color means.

24. **Always-visible sliders** for orbit opacity, grid opacity, star
    brightness, fly-to duration.

25. **"Now" button** in the time strip — reset to wall-clock now. We
    have `.` keyboard shortcut; they have a button too.

26. **Camera vicinity readout** — "EARTH VICINITY" zone label that
    auto-updates as you fly.

27. **Distance from focus** chip (we have it in solar flight; promote
    in sky view too).

28. **Active install-as-app banner** instead of relying on browser PWA
    prompt.

29. **Background music toggle**. Quiet ambient track + 🔇 button.

30. **Achievements / progress system** (probably the green icon top-
    right). Cosmetic but engagement-positive.

31. **Distance Scale** measurement tool — drag two points, get
    physical distance.

### Tier 5 — flagship visuals

32. **Black-hole gravitational-lensing shader** in the cosmic-landmark
    view. Distort background star field around named BHs.

33. **Real-scale Sun with surface granulation / corona** (better than
    our flat yellow ball).

34. **Saturn with photorealistic ring shadow** on the planet body.

## What WE have they don't (keep doubling down)

- 8-wavelength HiPS photographic sky tiles.
- Multi-wavelength cross-fade slider (the HN demo moment).
- Live SIMBAD + Wikipedia inspector.
- Tonight's-sky panel (rise/transit/set, dark window).
- NOAA SWPC live (Kp + alerts + sunspots + solar wind + aurora outlook).
- Click-to-fly meteor radiants from the events panel.
- 90-day forward sky-events calendar.
- Center-pointing HUD with constellation lookup.
- Federated-only architecture (we host nothing).

## Implementation order I'd actually take

1. Textured 3D Earth (1 commit, massive visual win).
2. Tracking Mode (small).
3. "Now" button + camera vicinity readout in solar flight (small).
4. Pulsar 3K catalog (one ETL, one renderer).
5. Real-satellites catalog (one ETL, one renderer).
6. Solar-Zones overlay rings.
7. Phobos / Deimos / Titan via Keplerian elements.
8. Gravity Sandbox (mini sub-app).
9. Tutorial mode.
10. Left-rail sidebar redesign.

Items 1–7 collapse the visible parity gap. 8–10 are the next-tier
upgrades. The grav-wave / cosmic-web / quasar 100K catalogs are Tier 2
and can wait.

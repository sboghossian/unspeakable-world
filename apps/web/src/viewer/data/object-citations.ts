/**
 * Object citations — editorial "why does this matter?" blurbs plus links
 * to authoritative archives (SIMBAD, Wikipedia, NASA ADS) and a handful of
 * landmark primary papers per object.
 *
 * Voice: a curious 12-year-old should leave each blurb with one thing they
 * did not know before. Facts are real; papers are real; numbers are not
 * invented. Wikipedia URLs are the canonical English article. SIMBAD URLs
 * use the by-identifier endpoint. ADS URLs use the search-by-name endpoint
 * with `object:` filter so the link surfaces real bibliography rather than
 * a hand-picked record.
 *
 * Keyed by the same display name that flows through `BODY_INFO`, the moon
 * catalog, named-star catalog, Messier catalog, and cosmic-landmark
 * catalog. `citationFor` does a tolerant lookup (case-insensitive, strips
 * common decorations like "*" or "Messier ").
 */

/**
 * Reader register the "why this matters" body should target. The InfoPanel
 * exposes a Curious / Student / Expert pill toggle that flips this; the
 * choice is persisted in {@link AppSettings.explanationTier}.
 */
export type ExplanationTier = "curious" | "student" | "expert";

/**
 * Either a plain string (the legacy single-voice entry, treated as
 * authoritative for every tier) or a partial map of tier → text. The
 * `pickWhyMatters` helper picks the best available register and falls
 * back gracefully when only some tiers were authored.
 */
export type TieredText = string | Partial<Record<ExplanationTier, string>>;

export type ObjectCitation = {
  /** Catalog id — must match the display name used elsewhere in the app. */
  id: string;
  /**
   * Editorial "why does this matter?" copy. May be a single string (used
   * for every tier) or a {curious, student, expert} record. Authors should
   * prefer the tiered form for popular objects.
   */
  whyMatters: TieredText;
  /** SIMBAD by-identifier URL, if SIMBAD has the object. */
  simbadUrl?: string;
  /** Canonical English Wikipedia article. */
  wikipediaUrl?: string;
  /** ADS NASA URL — name-search, or specific abstract for landmark results. */
  adsQueryUrl?: string;
  /** 1-3 landmark papers. Real titles, real years, real DOIs/abstracts. */
  primarySources?: Array<{ title: string; url: string; year: number }>;
};

/**
 * Resolve a {@link TieredText} to a single string for the requested tier.
 * If `text` is a plain string it is returned unchanged. If it is a tiered
 * record, the requested tier wins; otherwise we fall back to whichever
 * register is authored, preferring expert → student → curious so the
 * reader never sees an empty section.
 */
export function pickWhyMatters(text: TieredText, tier: ExplanationTier): string {
  if (typeof text === "string") return text;
  const direct = text[tier];
  if (direct) return direct;
  return text.expert ?? text.student ?? text.curious ?? "";
}

function simbad(id: string): string {
  return `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(id)}`;
}

function wiki(slug: string): string {
  return `https://en.wikipedia.org/wiki/${slug}`;
}

function adsName(name: string): string {
  return `https://ui.adsabs.harvard.edu/search/q=${encodeURIComponent(`object:"${name}"`)}&sort=date%20desc`;
}

export const OBJECT_CITATIONS: Record<string, ObjectCitation> = {
  /* ───────────────────── SOLAR SYSTEM ───────────────────── */
  Sun: {
    id: "Sun",
    whyMatters: {
      curious:
        "The Sun is so big that 1.3 million Earths would fit inside it, and every second it turns 4 million tonnes of itself into pure light. That light takes 8 minutes to reach you — sunlight on your skin is older than your last sneeze.",
      student:
        "The Sun is a G2V main-sequence star fusing hydrogen into helium at ~15 million K in its core, producing 3.828 × 10²⁶ W of power. It contains 99.86% of the solar system's mass and is about halfway through its 10-billion-year hydrogen-burning lifetime. Its 11-year magnetic cycle drives sunspots, flares, and the space weather that lights up our auroras and occasionally damages power grids.",
      expert:
        "G2V dwarf: M = 1.989 × 10³⁰ kg, R = 6.957 × 10⁸ m, L = 3.828 × 10²⁶ W, Teff = 5772 K, age ≈ 4.57 Gyr. Energy is generated almost entirely by the pp-chain (≈99%) with a CNO trace; hydrostatic equilibrium is maintained against self-gravity by radiation and gas pressure. The Babcock-Leighton flux-transport dynamo modulates an 11-year activity cycle; helioseismology (BiSON, GONG, SOHO) constrains the standard solar model, and in-situ measurements from Parker Solar Probe and Solar Orbiter continue to refine coronal heating and solar-wind acceleration theories.",
    },
    simbadUrl: simbad("Sun"),
    wikipediaUrl: wiki("Sun"),
    adsQueryUrl: adsName("Sun"),
    primarySources: [
      {
        title: "Bahcall — Solar models: an historical overview",
        url: "https://ui.adsabs.harvard.edu/abs/2003NuPhS.118...77B",
        year: 2003,
      },
    ],
  },
  Mercury: {
    id: "Mercury",
    whyMatters: {
      curious:
        "Mercury is the closest planet to the Sun and has days hotter than an oven (430 °C) and nights colder than dry ice (−180 °C). And yet — there is actual water ice hiding in craters at its poles that the Sun has never touched.",
      student:
        "Mercury is mostly iron core under a thin silicate skin, probably because a giant impact stripped most of its rocky mantle early on. MESSENGER (2011-15) confirmed water ice in permanently shadowed polar craters despite a noon surface of 700 K. Its 43 arcsec-per-century anomalous perihelion precession was the first observational confirmation of general relativity (Einstein, 1915).",
      expert:
        "Innermost planet: a = 0.387 AU, e = 0.2056, M = 3.30 × 10²³ kg, R = 2440 km, ρ = 5.43 g/cm³ (highest of any planet after Earth, implying ~70% iron core by mass). 3:2 spin-orbit resonance, no substantial atmosphere; an internally generated dipole at ~1% of Earth's strength is sustained by a partially molten outer core. The 43″/century perihelion advance unexplained by Newtonian perturbations matched GR's Schwarzschild prediction. MESSENGER neutron spectroscopy + Earth-based radar confirm polar water-ice deposits; BepiColombo (ESA/JAXA) is en route, with orbit insertion in 2026.",
    },
    simbadUrl: simbad("Mercury"),
    wikipediaUrl: wiki("Mercury_(planet)"),
    adsQueryUrl: adsName("Mercury"),
    primarySources: [
      {
        title: "Lawrence et al. — Evidence for water ice near Mercury's north pole from MESSENGER",
        url: "https://ui.adsabs.harvard.edu/abs/2013Sci...339..292L",
        year: 2013,
      },
    ],
  },
  Venus: {
    id: "Venus",
    whyMatters: {
      curious:
        "Venus is almost the same size as Earth, but its air is so heavy and so hot that the surface would melt lead. A day on Venus is longer than its year, and it spins backwards compared to almost every other planet.",
      student:
        "Venus is Earth's near-twin in mass and radius, but a runaway greenhouse drove the surface to 737 K under 92 bar of CO₂. It rotates retrograde with a sidereal day (243 d) longer than its year (225 d). The 2020 reported detection of phosphine in its cloud deck is contested but reopened the question of habitability in the 50 km cloud layer where temperatures are Earth-like. DAVINCI and VERITAS are scheduled to relaunch atmospheric and surface science later this decade.",
      expert:
        "Terrestrial planet: a = 0.723 AU, M = 4.87 × 10²⁴ kg, R = 6051.8 km, ρ = 5.24 g/cm³. Surface: 737 K, 92 bar, 96.5% CO₂, 3.5% N₂; cloud deck of H₂SO₄ droplets at 50-70 km. Sidereal rotation 243.02 d retrograde, axial tilt 177.4°. No global magnetic field — induced magnetosphere from solar-wind interaction with the ionosphere drives non-thermal escape. Greaves+2020 reported 20 ppb PH₃ at 60 km; subsequent ALMA reanalysis and JCMT follow-ups remain inconclusive. Surface ages of ~300-600 Myr from Magellan radar suggest catastrophic global resurfacing, with implications for terrestrial-planet thermal evolution.",
    },
    simbadUrl: simbad("Venus"),
    wikipediaUrl: wiki("Venus"),
    adsQueryUrl: adsName("Venus"),
    primarySources: [
      {
        title: "Greaves et al. — Phosphine gas in the cloud decks of Venus",
        url: "https://ui.adsabs.harvard.edu/abs/2021NatAs...5..655G",
        year: 2021,
      },
    ],
  },
  Earth: {
    id: "Earth",
    whyMatters: {
      curious:
        "Earth is the only place we know of where matter ever woke up and started wondering about itself. Liquid water, breathable air, a stabilising Moon and a magnetic shield against the solar wind — all four had to land at once for any of this to be reading these words.",
      student:
        "Earth is the only known habitable world: surface liquid water, plate tectonics that recycle CO₂ on Myr timescales, an active geodynamo that deflects the solar wind, and an unusually large Moon that keeps the axial tilt stable to within a few degrees. Earth's spectrum is the calibration target for every exoplanet biosignature search — JWST and ELT direct-imaging campaigns compare candidate worlds to Earth's O₂ + O₃ + H₂O absorption fingerprint first.",
      expert:
        "Terrestrial planet: a = 1.000 AU, M = 5.972 × 10²⁴ kg, R_eq = 6378.1 km, ρ = 5.514 g/cm³, axial obliquity 23.44°, sidereal rotation 86 164 s. Internal structure: solid inner core (Fe-Ni), liquid outer core sustaining a ~25-65 μT dipole geodynamo, mantle convection driving plate tectonics with subduction-zone volatile recycling. Atmosphere 78% N₂ / 21% O₂ — the O₂ is biogenic and the strongest known disequilibrium biosignature in the solar system. Mauna Loa CO₂ has risen from 315 ppm (1958) to >420 ppm (2024). Reference body for ARIEL and HWO Earth-analog yield estimates.",
    },
    simbadUrl: simbad("Earth"),
    wikipediaUrl: wiki("Earth"),
    adsQueryUrl: adsName("Earth"),
  },
  Moon: {
    id: "Moon",
    whyMatters: {
      curious:
        "The Moon used to be part of Earth — a Mars-sized planet called Theia smashed into us 4.5 billion years ago and the debris stuck together to form our Moon. It keeps the Earth from wobbling, which is one of the reasons climate has stayed liveable long enough for you to exist.",
      student:
        "The Moon is unusually large for its host planet (1/81 of Earth's mass) and stabilises Earth's axial tilt against chaotic excursions. Apollo sample analyses date it to 4.51 Gyr, supporting a giant-impact origin: a Mars-sized impactor (Theia) struck the proto-Earth and the Moon coalesced from the debris disk. With no weather and minimal tectonics, its cratering record is the cleanest archive of inner-solar-system bombardment history.",
      expert:
        "Natural satellite: M = 7.342 × 10²² kg, R = 1737.4 km, ρ = 3.344 g/cm³, semi-major axis 384 399 km, eccentricity 0.0549, inclination 5.145° to ecliptic. Synchronous rotation (1:1 spin-orbit lock); recedes from Earth at 3.82 cm/yr from tidal dissipation. Bulk composition is depleted in volatiles and iron relative to Earth's mantle, consistent with hot-debris giant-impact formation (Canup & Asphaug 2001). 4.51 Gyr crystallisation age from KREEP-rich samples constrains the late stages of magma-ocean solidification. The Late Heavy Bombardment chronology, calibrated by Apollo/Luna sample dates, is the timing reference for Mars and Mercury surface ages.",
    },
    simbadUrl: simbad("Moon"),
    wikipediaUrl: wiki("Moon"),
    adsQueryUrl: adsName("Moon"),
    primarySources: [
      {
        title: "Canup & Asphaug — Origin of the Moon in a giant impact near the end of Earth's formation",
        url: "https://ui.adsabs.harvard.edu/abs/2001Natur.412..708C",
        year: 2001,
      },
    ],
  },
  Mars: {
    id: "Mars",
    whyMatters: {
      curious:
        "Mars used to have rivers and lakes — you can still see the dried-up shorelines from orbit. Then its magnetic shield broke, the solar wind blew most of the air away, and it froze. Rovers driving around it right now keep finding the building blocks of life in old mud.",
      student:
        "Mars is the only other body in the solar system with clear evidence of past surface liquid water — branching valley networks, deltas at Jezero and Eberswalde, and hydrated minerals in Gale Crater. ~3.5-4 Gyr ago its core dynamo shut down, the magnetic field collapsed, and solar-wind sputtering stripped most of the atmosphere. Curiosity and Perseverance have detected organic carbon and habitable past chemistry, making Mars the highest-priority astrobiology target in the solar system.",
      expert:
        "Terrestrial planet: a = 1.524 AU, M = 6.417 × 10²³ kg, R = 3389.5 km, ρ = 3.933 g/cm³, surface gravity 3.71 m/s², atmosphere 6.1 mbar of CO₂. Crustal magnetic remanence (MGS magnetometer) indicates a once-active dynamo that died ~4 Gyr ago; subsequent solar-wind-driven ion escape is being quantified by MAVEN. Gale (Curiosity) and Jezero (Perseverance) sample habitable fluvio-lacustrine environments with detected thiophenes, chlorobenzenes, and organic carbon (Eigenbrode+2018). Mars Sample Return aims to deliver cached Perseverance samples to Earth in the 2030s for definitive biosignature analysis.",
    },
    simbadUrl: simbad("Mars"),
    wikipediaUrl: wiki("Mars"),
    adsQueryUrl: adsName("Mars"),
    primarySources: [
      {
        title: "Grotzinger et al. — A habitable fluvio-lacustrine environment at Yellowknife Bay, Gale Crater, Mars",
        url: "https://ui.adsabs.harvard.edu/abs/2014Sci...343A.386G",
        year: 2014,
      },
    ],
  },
  Jupiter: {
    id: "Jupiter",
    whyMatters: {
      curious:
        "Jupiter is more massive than every other planet in our solar system combined. Its Great Red Spot is a storm wider than Earth that has been raging for at least 350 years — and its biggest moon, Ganymede, is bigger than the planet Mercury.",
      student:
        "Jupiter is 318 Earth masses — 2.5× every other planet combined — and its gravity helped sculpt the inner solar system's final configuration. Juno's high-precision gravity measurements show its core is not a clean rocky ball but a diluted region of heavy elements mixed deep into hydrogen. Its four Galilean moons (Io, Europa, Ganymede, Callisto) are individually planet-class worlds and include the prime ocean-world candidates Europa and Ganymede.",
      expert:
        "Gas giant: M = 1.898 × 10²⁷ kg (= 317.8 M⊕), R_eq = 71 492 km, a = 5.204 AU, ρ = 1.326 g/cm³, oblateness 0.0649, equatorial rotation period 9 h 55 m. Bulk composition predominantly H + He with solar-ratio enhancements of heavier elements (~3× protosolar metallicity). Juno gravity-moment analysis (Wahl+2017, Stevenson+2020) favours a dilute, partially eroded heavy-element core extending to ~0.5 R, not a discrete inner core. ~20 000 km deep zonal winds confirmed by gravity harmonics J6-J10. Strong dipole field (4.2 G at cloud tops) drives the Io plasma torus and the most luminous aurorae in the solar system.",
    },
    simbadUrl: simbad("Jupiter"),
    wikipediaUrl: wiki("Jupiter"),
    adsQueryUrl: adsName("Jupiter"),
    primarySources: [
      {
        title: "Wahl et al. — Comparing Jupiter interior structure models to Juno gravity measurements and the role of a dilute core",
        url: "https://ui.adsabs.harvard.edu/abs/2017GeoRL..44.4649W",
        year: 2017,
      },
    ],
  },
  Saturn: {
    id: "Saturn",
    whyMatters: {
      curious:
        "Saturn is so light for its size that it would float on water if you could find a bathtub big enough. Its famous rings are only a few tens of metres thick and may have appeared after the dinosaurs went extinct — and they are slowly raining back down onto the planet.",
      student:
        "Saturn is the least dense planet in the solar system (0.687 g/cm³) and rotates so fast it bulges 10% wider at the equator. Cassini gravity and ring-mass measurements suggest its rings are only 100-400 Myr old — younger than the dinosaurs — and that 'ring rain' will erode them on a similar timescale. Its moon Titan has methane lakes and Enceladus vents hydrothermal-water plumes into space, both making Saturn's system the richest astrobiology target in the outer solar system.",
      expert:
        "Gas giant: M = 5.683 × 10²⁶ kg (= 95.16 M⊕), R_eq = 60 268 km, a = 9.583 AU, ρ = 0.687 g/cm³, equatorial rotation 10 h 33 m, oblateness 0.0980. Cassini gravity (Iess+2019) and seismology of ring waves (Mankovich & Fuller 2021) constrain a stably-stratified, dilute heavy-element core extending to ~60% of the radius. Ring system: 99.9% water ice, total mass ~1.5 × 10¹⁹ kg ≈ half of Mimas; ring-age estimates of 100-400 Myr and infall rates of ~10⁴-10⁵ kg/s imply the rings are a transient feature. Enceladus south-polar plumes (E ring source) deliver hydrothermal H₂, organics, and silica nanoparticles directly to Saturn's magnetosphere.",
    },
    simbadUrl: simbad("Saturn"),
    wikipediaUrl: wiki("Saturn"),
    adsQueryUrl: adsName("Saturn"),
    primarySources: [
      {
        title: "Iess et al. — Measurement and implications of Saturn's gravity field and ring mass",
        url: "https://ui.adsabs.harvard.edu/abs/2019Sci...364.2965I",
        year: 2019,
      },
    ],
  },
  Uranus: {
    id: "Uranus",
    whyMatters: {
      curious:
        "Uranus is the only planet that rolls on its side, like a marble lying down — something huge must have knocked it over a long time ago. Each of its poles spends 42 years in straight sunlight and 42 years in pitch dark.",
      student:
        "Uranus has an extreme 97.8° axial tilt, almost certainly the result of a giant impact during late planet formation, producing 42-year polar seasons. It is an 'ice giant' — bulk composition water, methane, and ammonia ('ices' in the planetary-science sense) under enormous pressure rather than the metallic hydrogen of Jupiter and Saturn. Voyager 2's 1986 flyby remains our only close visit; the US Planetary Decadal Survey named a Uranus Orbiter and Probe its flagship priority for the 2030s.",
      expert:
        "Ice giant: M = 8.681 × 10²⁵ kg (= 14.54 M⊕), R_eq = 25 559 km, a = 19.19 AU, axial tilt 97.77° retrograde, sidereal rotation 17.24 h. Bulk composition ~70-80% 'ices' (H₂O, CH₄, NH₃) surrounding a small rocky core; atmosphere 83% H₂, 15% He, 2.3% CH₄ (the methane absorbs red light, producing the aqua colour). Magnetic dipole offset 0.3 R from centre and tilted 59° to the rotation axis — strongly suggestive of a non-convective ionic-fluid dynamo. Internal heat flux is anomalously low (~0.04 W/m²) compared to Neptune, an unsolved problem possibly tied to compositional layering frozen in after the suspected obliquity-creating impact.",
    },
    simbadUrl: simbad("Uranus"),
    wikipediaUrl: wiki("Uranus"),
    adsQueryUrl: adsName("Uranus"),
  },
  Neptune: {
    id: "Neptune",
    whyMatters: {
      curious:
        "Neptune was discovered using maths before anyone saw it with a telescope. Even though it is 4.5 billion kilometres from the Sun, it has winds that scream at 2,100 km/h — faster than the speed of sound on Earth.",
      student:
        "Neptune was the first planet predicted before observed: Le Verrier solved Uranus's orbital anomalies and Galle confirmed the prediction within 1° in 1846. It hosts the fastest sustained winds in the solar system (~2 100 km/h) despite receiving only 1/900 of the solar flux Earth gets. Its largest moon Triton orbits retrograde — a smoking-gun signature of capture from the Kuiper belt rather than co-formation.",
      expert:
        "Ice giant: M = 1.024 × 10²⁶ kg (= 17.15 M⊕), R_eq = 24 764 km, a = 30.07 AU, sidereal rotation 16.11 h, axial tilt 28.32°. Atmosphere 80% H₂, 19% He, 1.5% CH₄; super-rotational equatorial winds up to ~580 m/s. Internal heat flux 0.43 W/m² (~2.6× absorbed solar input), in striking contrast to Uranus despite similar bulk composition. Magnetic dipole offset 0.55 R and tilted 47° — again consistent with a thin-shell ionic dynamo. Discovered 23 September 1846 (Galle/d'Arrest) from Le Verrier's prediction, founding the era of dynamical perturbation-based discovery; Voyager 2 (1989) remains the only close flyby.",
    },
    simbadUrl: simbad("Neptune"),
    wikipediaUrl: wiki("Neptune"),
    adsQueryUrl: adsName("Neptune"),
  },

  /* ───────────────────── FAMOUS MOONS ───────────────────── */
  Io: {
    id: "Io",
    whyMatters:
      "Io is the most volcanically active world in the solar system — hundreds of erupting vents at once, fed by tidal heating as Jupiter and the other Galilean moons squeeze it like a stress ball. The surface is repainted yellow with sulphur compounds on timescales of years, and there are essentially no impact craters because everything gets buried. Io is also our best natural laboratory for understanding tidal heat as an energy source, which matters because that is the same mechanism keeping subsurface oceans liquid on Europa and Enceladus.",
    simbadUrl: simbad("Io"),
    wikipediaUrl: wiki("Io_(moon)"),
    adsQueryUrl: adsName("Io"),
    primarySources: [
      {
        title: "Peale, Cassen & Reynolds — Melting of Io by tidal dissipation",
        url: "https://ui.adsabs.harvard.edu/abs/1979Sci...203..892P",
        year: 1979,
      },
    ],
  },
  Europa: {
    id: "Europa",
    whyMatters:
      "Under Europa's cracked ice shell is an ocean with roughly twice the liquid water of all of Earth's oceans combined. The chemistry is interesting — hydrogen from water-rock reactions on the seafloor, oxidants from radiation chemistry on the surface ice — which means there is at least an energy budget for life. NASA's Europa Clipper, launched in 2024, will fly past Europa dozens of times to map the ice thickness and sniff plumes that may vent oceanic material into space.",
    simbadUrl: simbad("Europa"),
    wikipediaUrl: wiki("Europa_(moon)"),
    adsQueryUrl: adsName("Europa"),
    primarySources: [
      {
        title: "Pappalardo et al. — Does Europa have a subsurface ocean? Evaluation of the geological evidence",
        url: "https://ui.adsabs.harvard.edu/abs/1999JGR...10424015P",
        year: 1999,
      },
    ],
  },
  Ganymede: {
    id: "Ganymede",
    whyMatters:
      "Ganymede is the largest moon in the solar system — bigger than the planet Mercury — and the only moon with its own intrinsic magnetic field, generated by a molten iron core. Hubble UV observations of aurorae over its poles gave us strong evidence for a salty subsurface ocean sandwiched between layers of high-pressure ice. The ESA JUICE mission, launched in 2023, will eventually settle into orbit around Ganymede in the 2030s — the first time any spacecraft will have orbited a moon other than our own.",
    simbadUrl: simbad("Ganymede"),
    wikipediaUrl: wiki("Ganymede_(moon)"),
    adsQueryUrl: adsName("Ganymede"),
    primarySources: [
      {
        title: "Saur et al. — The search for a subsurface ocean in Ganymede with Hubble Space Telescope observations of its auroral ovals",
        url: "https://ui.adsabs.harvard.edu/abs/2015JGRA..120.1715S",
        year: 2015,
      },
    ],
  },
  Titan: {
    id: "Titan",
    whyMatters:
      "Titan is the only moon with a substantial atmosphere — thicker than Earth's, mostly nitrogen, hazed with organic smog. Cassini and the Huygens lander confirmed lakes and rivers of liquid methane and ethane on the surface, making Titan the only body besides Earth with a stable surface liquid cycle. Its organic chemistry is essentially a deep-frozen snapshot of pre-biotic Earth, which is why NASA's Dragonfly rotorcraft mission (launching in 2028) is going to literally fly between sites on the surface.",
    simbadUrl: simbad("Titan"),
    wikipediaUrl: wiki("Titan_(moon)"),
    adsQueryUrl: adsName("Titan"),
    primarySources: [
      {
        title: "Stofan et al. — The lakes of Titan",
        url: "https://ui.adsabs.harvard.edu/abs/2007Natur.445...61S",
        year: 2007,
      },
    ],
  },
  Enceladus: {
    id: "Enceladus",
    whyMatters:
      "Enceladus is a tiny icy moon of Saturn (just 500 km across) that fires plumes of salty water laced with organic molecules out of cracks at its south pole. Cassini flew straight through those plumes and tasted them: H2, CO2, methane, complex organics, and silica grains that imply hydrothermal vents on the seafloor. In other words, every ingredient we list for hydrothermal-vent life on Earth has been confirmed in samples already collected from above Enceladus — without ever landing.",
    simbadUrl: simbad("Enceladus"),
    wikipediaUrl: wiki("Enceladus"),
    adsQueryUrl: adsName("Enceladus"),
    primarySources: [
      {
        title: "Waite et al. — Cassini finds molecular hydrogen in the Enceladus plume: Evidence for hydrothermal processes",
        url: "https://ui.adsabs.harvard.edu/abs/2017Sci...356..155W",
        year: 2017,
      },
    ],
  },
  Triton: {
    id: "Triton",
    whyMatters:
      "Triton orbits Neptune backwards — a retrograde orbit no moon could acquire by forming in place, so it must have been captured from the Kuiper belt, making it a sibling of Pluto that ended up tied to a gas giant. Voyager 2 saw active nitrogen geysers on the surface in 1989, despite a temperature of −235 °C. Triton is slowly spiralling inwards and will eventually be torn apart by tides to form a ring system around Neptune.",
    simbadUrl: simbad("Triton"),
    wikipediaUrl: wiki("Triton_(moon)"),
    adsQueryUrl: adsName("Triton"),
  },

  /* ───────────────────── NAMED STARS ───────────────────── */
  Sirius: {
    id: "Sirius",
    whyMatters: {
      curious:
        "Sirius is the brightest star in the night sky, and it has a tiny dead twin orbiting it — a white dwarf the size of Earth but as heavy as the Sun. A thimbleful of that twin would weigh about a tonne.",
      student:
        "Sirius is the brightest star in Earth's night sky (apparent magnitude −1.46), partly because it is intrinsically bright (A1V, 25 L⊙) but mostly because it is only 2.64 pc away. It is a binary: Sirius B is the first white dwarf ever identified (Clark 1862), a 1.02 M⊙ remnant compressed into an Earth-sized volume — a key anchor for the mass-radius relation of degenerate matter.",
      expert:
        "α CMa, d = 2.637 pc (Hipparcos), V = −1.46. Sirius A: A1V, M = 2.063 M⊙, R = 1.711 R⊙, L = 25.4 L⊙, Teff ≈ 9940 K, age ~240 Myr. Sirius B: DA2 white dwarf, M = 1.018 M⊙, R = 0.0084 R⊙, Teff = 25 200 K, gravitational redshift of 80.65 km/s confirms GR mass-radius relation for degenerate matter. Orbital period 50.13 yr, e = 0.5923. Heliacal rising regulated the Egyptian agricultural calendar; the 'Sirius B problem' from Adams 1925 was one of the first quantitative tests of general relativity outside the solar system.",
    },
    simbadUrl: simbad("Sirius"),
    wikipediaUrl: wiki("Sirius"),
    adsQueryUrl: adsName("Sirius"),
  },
  Vega: {
    id: "Vega",
    whyMatters: {
      curious:
        "Vega is the star astronomers use as a measuring stick for the brightness of every other star — it's literally the calibration star. It used to be our North Star 14,000 years ago and will be again 12,000 years from now.",
      student:
        "Vega is the photometric standard for stellar magnitudes — its visible-band magnitude is defined as essentially zero. IRAS's 1984 detection of an infrared excess around Vega revealed a debris disc and founded the field of debris-disc/exo-planetary-system science. Because Earth's rotation axis precesses on a 26 000-yr cycle, Vega was the pole star ~12 000 BCE and will be again ~14 000 CE.",
      expert:
        "α Lyr, d = 7.68 pc, V = 0.026. A0Va, M ≈ 2.135 M⊙, R = 2.362 R⊙ (equatorial), L = 40.12 L⊙, Teff(pole) ≈ 9988 K, age ~455 Myr. Rapid rotator at vsin i ≈ 23 km/s but seen near pole-on; equatorial rotation reaches ~91% of breakup, producing strong gravity darkening (ΔT ~2300 K pole-to-equator) measured by CHARA interferometry (Aufdenberg+2006). Aumann+1984 IRAS 60-μm excess at 16× photospheric flux launched the debris-disc field; Vega's disc now resolved at sub-mm and IR wavelengths with two-belt architecture suggestive of intervening planets.",
    },
    simbadUrl: simbad("Vega"),
    wikipediaUrl: wiki("Vega"),
    adsQueryUrl: adsName("Vega"),
    primarySources: [
      {
        title: "Aumann et al. — Discovery of a shell around Alpha Lyrae",
        url: "https://ui.adsabs.harvard.edu/abs/1984ApJ...278L..23A",
        year: 1984,
      },
    ],
  },
  Polaris: {
    id: "Polaris",
    whyMatters: {
      curious:
        "Polaris is the North Star — almost exactly above Earth's North Pole, so it appears to stand still while every other star wheels around it. Sailors used it to find their way for thousands of years before GPS existed.",
      student:
        "Polaris sits within 0.7° of the north celestial pole and has been the navigator's anchor for centuries, though Earth's 26 000-yr axial precession will hand the role over to other stars. It is also the nearest Cepheid variable to the Sun — a member of the class Henrietta Leavitt used in 1912 to establish the period-luminosity relation that built the cosmic distance ladder. The primary is a yellow supergiant about 2 500× the Sun's luminosity, orbited by two main-sequence companions.",
      expert:
        "α UMi A: F7Ib supergiant, M ≈ 5.4 M⊙, R ≈ 37.5 R⊙, L ≈ 1260 L⊙, Teff ≈ 6015 K. Classical Cepheid (Type-I) with period P ≈ 3.97 d but pulsation amplitude has decreased from ~0.12 mag in the 19th century to ~0.03 mag today — an unusual evolutionary signature. Distance debated: Hipparcos and HST-FGS yielded 99 ± 2 pc; later parallax revisions give 137 pc; the dispersion is a current Cepheid-zero-point and Hubble-constant systematic. Triple system: A + B (F3V, 18.6″ separation) + Ab (closer F-V companion, period 29.59 yr). The north celestial pole reaches minimum separation from Polaris ~0.45° in 2102.",
    },
    simbadUrl: simbad("Polaris"),
    wikipediaUrl: wiki("Polaris"),
    adsQueryUrl: adsName("Polaris"),
  },
  Betelgeuse: {
    id: "Betelgeuse",
    whyMatters: {
      curious:
        "Betelgeuse is a dying giant star so huge that if you swapped it for the Sun, it would swallow Mercury, Venus, Earth, and Mars and still keep going past Jupiter. When it explodes — sometime in the next 100,000 years — it will be bright enough to read by at night for weeks.",
      student:
        "Betelgeuse is a red supergiant ~550 pc away, so swollen that placing it at the Sun's position would extend its photosphere past the orbit of Jupiter (R ≈ 750 R⊙). It is in the last <1% of its life, burning helium and heavier elements toward core collapse; it will go Type II supernova within ~100 000 years. The 2019-2020 'Great Dimming' fell to ~1.6 mag — not the imminent supernova but a localised surface cooling plus an ejected dust cloud crossing the line of sight (Montargès+2021).",
      expert:
        "α Ori, d ≈ 168 pc (radio parallax, uncertain because Betelgeuse photocentre wanders), M₁ ≈ 11-18 M⊙ (initial), current M ≈ 10 M⊙ after wind mass loss of 2 × 10⁻⁶ M⊙/yr, R = 640-764 R⊙, L = 90 000-150 000 L⊙, Teff ≈ 3600 K, spectral M1-2 Ia-ab. Long-period photometric variability dominated by P ≈ 400 d radial pulsation plus longer-secondary-period ~2100 d convection cell. Pre-supernova; will produce a neutrino burst detectable by SuperKamiokande, IceCube, and SNEWS and a Type II-P supernova reaching V ≈ −10 to −12 (brighter than the full Moon). Hubble UV imaging and ALMA millimetre observations resolved the Great Dimming's dust-and-cool-spot architecture.",
    },
    simbadUrl: simbad("Betelgeuse"),
    wikipediaUrl: wiki("Betelgeuse"),
    adsQueryUrl: adsName("Betelgeuse"),
    primarySources: [
      {
        title: "Montargès et al. — A dusty veil shading Betelgeuse during its Great Dimming",
        url: "https://ui.adsabs.harvard.edu/abs/2021Natur.594..365M",
        year: 2021,
      },
    ],
  },
  Rigel: {
    id: "Rigel",
    whyMatters:
      "Rigel is a blue supergiant about 860 light-years away — the seventh-brightest star in the night sky and one of the most intrinsically luminous stars near us, pouring out about 120,000 times the Sun's energy. It marks Orion's foot and is the hottest of the bright winter stars, with a surface around 12,000 K. Rigel is on the same one-way trip to supernova that Betelgeuse is, just a few million years behind.",
    simbadUrl: simbad("Rigel"),
    wikipediaUrl: wiki("Rigel"),
    adsQueryUrl: adsName("Rigel"),
  },
  Antares: {
    id: "Antares",
    whyMatters:
      "Antares — 'rival of Mars' — is a red supergiant in Scorpius, around 550 light-years away, and the brightest member of the Scorpius-Centaurus Association, the closest OB stellar association to the Sun. Like Betelgeuse it is in late helium burning and within a few hundred thousand years of going supernova. VLT interferometry has resolved its surface and its surrounding extended atmosphere, giving us one of our best looks at how a dying massive star sheds mass back into the galaxy.",
    simbadUrl: simbad("Antares"),
    wikipediaUrl: wiki("Antares"),
    adsQueryUrl: adsName("Antares"),
  },
  Arcturus: {
    id: "Arcturus",
    whyMatters:
      "Arcturus is a red giant 37 light-years away, the fourth-brightest star in the sky, and an old member of the Milky Way's thick disk that is just passing through our neighbourhood — it is moving at over 120 km/s relative to the Sun, fast enough that its apparent position drifts noticeably on a human lifetime. It is what our Sun will look like in about 5 billion years when it leaves the main sequence. Light from Arcturus was used to switch on the 1933 Chicago World's Fair.",
    simbadUrl: simbad("Arcturus"),
    wikipediaUrl: wiki("Arcturus"),
    adsQueryUrl: adsName("Arcturus"),
  },
  "Proxima Centauri": {
    id: "Proxima Centauri",
    whyMatters: {
      curious:
        "Proxima Centauri is the closest star to us after the Sun — only 4.2 light-years away — and it has a planet in its 'just-right' zone where water could be liquid. It is also a tiny red star that will keep burning for trillions of years after the Sun has died.",
      student:
        "Proxima is the closest stellar neighbour to the Sun (d = 1.301 pc, 4.246 ly) and hosts at least three confirmed planets, including Proxima b — a ~1.07 M⊕ world in the habitable zone (Anglada-Escudé+2016). It is an M5.5Ve red dwarf with energetic flaring that complicates the habitability question for Proxima b. As an M dwarf it will burn hydrogen for trillions of years, outliving every Sun-like star in the galaxy.",
      expert:
        "α Cen C: M5.5Ve, M = 0.1221 M⊙, R = 0.1542 R⊙, L = 0.0017 L⊙, Teff = 3042 K, d = 1.3012 pc (Gaia DR3). Gravitationally bound to α Cen AB at ~13 000 AU, orbital period ~547 000 yr. Planets: Proxima b (m sin i ≈ 1.07 M⊕, P = 11.186 d, a = 0.0485 AU — within HZ); Proxima c (~7 M⊕, P ≈ 1900 d); Proxima d (~0.26 M⊕, P = 5.12 d). High-energy flaring with 100-1000× quiescent X-ray brightening, including a 2019 flare reaching ΔV = −7 mag (Howard+2018), making atmospheric retention on Proxima b an open question. Future LIFE-class direct-imaging missions targeting α Cen system biosignatures are in concept stage.",
    },
    simbadUrl: simbad("Proxima Cen"),
    wikipediaUrl: wiki("Proxima_Centauri"),
    adsQueryUrl: adsName("Proxima Centauri"),
    primarySources: [
      {
        title: "Anglada-Escudé et al. — A terrestrial planet candidate in a temperate orbit around Proxima Centauri",
        url: "https://ui.adsabs.harvard.edu/abs/2016Natur.536..437A",
        year: 2016,
      },
    ],
  },
  "Alpha Centauri A": {
    id: "Alpha Centauri A",
    whyMatters:
      "Alpha Centauri A is the brighter of the Sun-like binary at the heart of the closest stellar system to us (4.37 light-years). It is essentially a slightly older, slightly larger sibling of our Sun (G2V), and the only such star within walking distance, astronomically speaking. Together with Alpha Centauri B and Proxima Centauri it is the target of the Breakthrough Starshot concept — a fleet of laser-pushed gram-scale probes that could in principle make the journey in a couple of human generations.",
    simbadUrl: simbad("alf Cen A"),
    wikipediaUrl: wiki("Alpha_Centauri"),
    adsQueryUrl: adsName("Alpha Centauri A"),
  },
  "Alpha Centauri B": {
    id: "Alpha Centauri B",
    whyMatters:
      "Alpha Centauri B is the K1V companion to Alpha Cen A — slightly cooler and dimmer than the Sun. The pair orbit each other every 80 years on a moderately eccentric orbit. Sun-like binaries are extremely common, so studying this nearby example tells us how planet formation works around two stars at once — the inner habitable zones are stable, the outer disks get truncated. A signal once thought to be a planet here (Alpha Cen Bb, 2012) was later attributed to data artefacts.",
    simbadUrl: simbad("alf Cen B"),
    wikipediaUrl: wiki("Alpha_Centauri"),
    adsQueryUrl: adsName("Alpha Centauri B"),
  },
  "Barnard's Star": {
    id: "Barnard's Star",
    whyMatters:
      "Barnard's Star is the fastest-moving star in our sky — its proper motion is over 10 arcseconds per year, which means it visibly crosses a moon's diameter every two centuries. At 5.96 light-years it is the second-closest stellar system to the Sun. It is a low-mass red dwarf that has been intensively monitored for planets for half a century, and a sub-Earth-mass planet on a 3.15-day orbit, Barnard b, was confirmed in 2024.",
    simbadUrl: simbad("Barnard's Star"),
    wikipediaUrl: wiki("Barnard%27s_Star"),
    adsQueryUrl: adsName("Barnard's Star"),
    primarySources: [
      {
        title: "González Hernández et al. — A sub-Earth-mass planet orbiting Barnard's star",
        url: "https://ui.adsabs.harvard.edu/abs/2024A%26A...690A..79G",
        year: 2024,
      },
    ],
  },
  Aldebaran: {
    id: "Aldebaran",
    whyMatters:
      "Aldebaran is a red giant 65 light-years away that forms the angry eye of Taurus the bull. It is not actually part of the Hyades cluster behind it — it just lies between us and them on the sky, a happy accident for skywatchers. As an evolved giant about 44× the Sun's radius, it is a preview of the late life of any Sun-like star: hydrogen exhausted in the core, atmosphere puffed up, slowly losing mass into the interstellar medium.",
    simbadUrl: simbad("Aldebaran"),
    wikipediaUrl: wiki("Aldebaran"),
    adsQueryUrl: adsName("Aldebaran"),
  },
  Capella: {
    id: "Capella",
    whyMatters:
      "Capella looks like a single yellow point of light, but it is actually two G-type giant stars locked in a tight 104-day orbit, plus a distant pair of red dwarfs — a four-star system 43 light-years away. It is the brightest star in Auriga and one of the brightest X-ray sources in the sky thanks to coronal activity in the close giants. As nearby evolved Sun-analogues, the inner pair are heavily used to calibrate models of post-main-sequence stellar evolution.",
    simbadUrl: simbad("Capella"),
    wikipediaUrl: wiki("Capella"),
    adsQueryUrl: adsName("Capella"),
  },
  Deneb: {
    id: "Deneb",
    whyMatters:
      "Deneb is one of the most intrinsically luminous stars visible to the unaided eye — about 200,000 times brighter than the Sun, but so distant (roughly 2,600 light-years) that it appears as just one corner of the Summer Triangle. It is a blue-white A2 supergiant burning through its fuel hundreds of times faster than our Sun and will end as a supernova within the next few million years. Deneb is also the prototype of its own class of variable stars, the Alpha Cygni variables.",
    simbadUrl: simbad("Deneb"),
    wikipediaUrl: wiki("Deneb"),
    adsQueryUrl: adsName("Deneb"),
  },
  Altair: {
    id: "Altair",
    whyMatters:
      "Altair is so close (16.7 light-years) and so fast-rotating (one rotation every 9 hours) that interferometers have actually imaged its squashed, oblate shape. Its equator is more than 20% wider than its poles, and the poles run hotter than the equator — a phenomenon called gravity darkening. Together with Vega and Deneb, Altair forms the Summer Triangle, one of the easiest navigational asterisms in the northern sky.",
    simbadUrl: simbad("Altair"),
    wikipediaUrl: wiki("Altair"),
    adsQueryUrl: adsName("Altair"),
    primarySources: [
      {
        title: "Monnier et al. — Imaging the surface of Altair",
        url: "https://ui.adsabs.harvard.edu/abs/2007Sci...317..342M",
        year: 2007,
      },
    ],
  },
  Spica: {
    id: "Spica",
    whyMatters:
      "Spica is a hot blue binary system about 250 light-years away, and the brightest star in Virgo. Its two stars orbit each other every four days at distances so close they are physically distorted into egg shapes by mutual gravity — when one passes in front of the other we see slight dips in brightness. Spica is also the star that Hipparchus used in 127 BCE to discover the precession of the equinoxes by comparing his observations to older Babylonian records.",
    simbadUrl: simbad("Spica"),
    wikipediaUrl: wiki("Spica"),
    adsQueryUrl: adsName("Spica"),
  },
  Procyon: {
    id: "Procyon",
    whyMatters:
      "Procyon is the eighth-brightest star in the sky and one of the Sun's nearest neighbours at 11.5 light-years. Like Sirius, it has a white-dwarf companion (Procyon B, discovered in 1896 from its gravitational tug on Procyon A) — one of the earliest direct confirmations that stars end their lives as compact remnants. Procyon A itself is a subgiant just leaving the main sequence: a preview of the Sun's next chapter.",
    simbadUrl: simbad("Procyon"),
    wikipediaUrl: wiki("Procyon"),
    adsQueryUrl: adsName("Procyon"),
  },
  Mizar: {
    id: "Mizar",
    whyMatters:
      "Mizar in the handle of the Big Dipper was the first telescopic double star ever recorded (Riccioli, 1650) and the first spectroscopic binary ever discovered (Pickering, 1889) — making it a milestone in two separate eras of how astronomy detects unseen companions. Together with its naked-eye companion Alcor and three more spectroscopic components, Mizar is actually a sextuple star system, 83 light-years away.",
    simbadUrl: simbad("Mizar"),
    wikipediaUrl: wiki("Mizar"),
    adsQueryUrl: adsName("Mizar"),
  },
  Algol: {
    id: "Algol",
    whyMatters:
      "Algol — the 'Demon Star' — dims by a full magnitude every 68.75 hours because a cooler companion star passes in front of the brighter one as seen from Earth. It was the first eclipsing binary ever identified (Goodricke, 1782) and led directly to the modern science of variable stars. It is also a textbook example of the 'Algol paradox': the less massive star is more evolved, because mass transfer between the pair has rewritten their life stories.",
    simbadUrl: simbad("Algol"),
    wikipediaUrl: wiki("Algol"),
    adsQueryUrl: adsName("Algol"),
  },
  Castor: {
    id: "Castor",
    whyMatters:
      "Castor looks like a single bright star in Gemini, but high-resolution observations reveal six stars in three pairs, all gravitationally bound — a wonderful demonstration that the stellar density we see with the naked eye is often deeply misleading. The brightest pair are A-type main-sequence stars, joined by a more distant pair of red-dwarf eclipsing binaries. The whole system sits about 51 light-years away.",
    simbadUrl: simbad("Castor"),
    wikipediaUrl: wiki("Castor_(star)"),
    adsQueryUrl: adsName("Castor"),
  },
  Pollux: {
    id: "Pollux",
    whyMatters:
      "Pollux is the nearest giant star to the Sun (34 light-years), and it was one of the first giants found to host an exoplanet — Pollux b, a 2.3-Jupiter-mass world in a 590-day orbit (Hatzes et al., 2006). That discovery was a big deal because it confirmed that planet hosting is not limited to main-sequence stars: when a star puffs up into a giant, its planets really can hang on through the makeover.",
    simbadUrl: simbad("Pollux"),
    wikipediaUrl: wiki("Pollux_(star)"),
    adsQueryUrl: adsName("Pollux"),
  },
  Fomalhaut: {
    id: "Fomalhaut",
    whyMatters:
      "Fomalhaut, 25 light-years away, is one of the most famous debris-disk systems in the sky: Hubble imaged a sharply-defined ring of dust around it in 2008 and a moving point source inside the ring once interpreted as an exoplanet, Fomalhaut b. JWST has since shown the system is more complex — multiple dust belts and an inner asteroid-belt analogue — and the original 'planet' is most likely an expanding dust cloud from a giant collision.",
    simbadUrl: simbad("Fomalhaut"),
    wikipediaUrl: wiki("Fomalhaut"),
    adsQueryUrl: adsName("Fomalhaut"),
    primarySources: [
      {
        title: "Gáspár et al. — Spatially resolved imaging of the inner Fomalhaut disk using JWST/MIRI",
        url: "https://ui.adsabs.harvard.edu/abs/2023NatAs...7..790G",
        year: 2023,
      },
    ],
  },
  Achernar: {
    id: "Achernar",
    whyMatters:
      "Achernar is the most flattened bright star known: it spins so fast — equatorial velocity around 250 km/s — that interferometric images show its equator is more than 50% wider than its polar diameter. It is a hot B-type star 139 light-years away in the far southern sky, and as one of the brightest stars never visible from most of the northern hemisphere it remained nameless to most ancient European cultures despite being the ninth-brightest star overall.",
    simbadUrl: simbad("Achernar"),
    wikipediaUrl: wiki("Achernar"),
    adsQueryUrl: adsName("Achernar"),
  },
  Canopus: {
    id: "Canopus",
    whyMatters:
      "Canopus is the second-brightest star in the sky and an F-type yellow-white supergiant 310 light-years away. Because it is so bright and so far from the ecliptic, it is the most-used navigational star for interplanetary spacecraft — Voyager, Cassini, Galileo, and many others have used star-trackers locked onto Canopus to determine their orientation in deep space. It is also one of the few stars luminous enough to be visible during partial daytime through a good telescope.",
    simbadUrl: simbad("Canopus"),
    wikipediaUrl: wiki("Canopus"),
    adsQueryUrl: adsName("Canopus"),
  },
  Mira: {
    id: "Mira",
    whyMatters:
      "Mira ('the wonderful') is the prototype of a class of pulsating red giants — Mira variables — that swell and shrink on roughly 11-month cycles, changing in brightness by a factor of more than 1,000. It was the first variable star ever identified (Fabricius, 1596), kicking off the entire study of stellar variability. GALEX even discovered that Mira is dragging a 13-light-year-long comet-like tail of shed material behind it through the interstellar medium.",
    simbadUrl: simbad("Mira"),
    wikipediaUrl: wiki("Mira"),
    adsQueryUrl: adsName("Mira"),
    primarySources: [
      {
        title: "Martin et al. — A turbulent wake as a tracer of 30,000 years of Mira's mass loss history",
        url: "https://ui.adsabs.harvard.edu/abs/2007Natur.448..780M",
        year: 2007,
      },
    ],
  },
  Regulus: {
    id: "Regulus",
    whyMatters:
      "Regulus is the bright heart of Leo, 79 light-years away — a quadruple-star system whose primary is a hot blue main-sequence star spinning so fast it is on the edge of breaking apart. Because Regulus sits right on the ecliptic, the Moon and planets regularly pass in front of it, making it one of the very few first-magnitude stars that gets occulted with any frequency. Hipparcos parallaxes pinned its distance and made it a calibrator for the cosmic distance ladder.",
    simbadUrl: simbad("Regulus"),
    wikipediaUrl: wiki("Regulus"),
    adsQueryUrl: adsName("Regulus"),
  },
  Bellatrix: {
    id: "Bellatrix",
    whyMatters:
      "Bellatrix — the 'Amazon Star' — is a hot blue B2-type star marking Orion's left shoulder, around 250 light-years away. It is one of the closest hot stars to Earth, useful as a comparison star for spectroscopy of more distant blue giants. Unlike its Orion neighbours Betelgeuse and Rigel, Bellatrix is not expected to end as a supernova — it lacks the mass — and will instead finish as a heavy white dwarf.",
    simbadUrl: simbad("Bellatrix"),
    wikipediaUrl: wiki("Bellatrix"),
    adsQueryUrl: adsName("Bellatrix"),
  },
  Alnilam: {
    id: "Alnilam",
    whyMatters:
      "Alnilam is the middle star of Orion's Belt — a blue supergiant about 2,000 light-years away and roughly 500,000 times more luminous than the Sun, one of the most intrinsically bright stars in the catalogue. It is shedding mass through a strong stellar wind and will go supernova within a few million years. The fact that Orion's Belt looks so neat is partly a coincidence of perspective; the three belt stars are not all at the same distance.",
    simbadUrl: simbad("Alnilam"),
    wikipediaUrl: wiki("Alnilam"),
    adsQueryUrl: adsName("Alnilam"),
  },
  Alnitak: {
    id: "Alnitak",
    whyMatters:
      "Alnitak is a triple-star system at the easternmost end of Orion's Belt, dominated by a hot O-type supergiant about 1,260 light-years away. Its UV radiation lights up the famous Flame Nebula and helps illuminate the surrounding molecular cloud where new stars (including the Horsehead) are forming. As one of the closest O stars to the Sun, it is a key calibrator for the luminosity of massive stars across the galaxy.",
    simbadUrl: simbad("Alnitak"),
    wikipediaUrl: wiki("Alnitak"),
    adsQueryUrl: adsName("Alnitak"),
  },
  Mintaka: {
    id: "Mintaka",
    whyMatters:
      "Mintaka is the westernmost star of Orion's Belt and an eclipsing binary system — two hot O/B-type stars in a five-day orbit that periodically dim each other. It is also remarkably close to the celestial equator (within a third of a degree), so it rises due east and sets due west from almost anywhere on Earth, making it a useful natural cardinal-direction marker for any culture that pays attention to Orion.",
    simbadUrl: simbad("Mintaka"),
    wikipediaUrl: wiki("Mintaka"),
    adsQueryUrl: adsName("Mintaka"),
  },
  Hadar: {
    id: "Hadar",
    whyMatters:
      "Hadar (Beta Centauri) is the eleventh-brightest star in the sky and a triple system of hot blue B-type giants about 390 light-years away in the southern constellation Centaurus. Along with Alpha Centauri it forms one of the two 'pointer stars' that anyone south of the equator can use to find the Southern Cross. Hadar is massive enough that all three of its stars will eventually end as supernovae.",
    simbadUrl: simbad("Hadar"),
    wikipediaUrl: wiki("Beta_Centauri"),
    adsQueryUrl: adsName("Hadar"),
  },
  Acrux: {
    id: "Acrux",
    whyMatters:
      "Acrux is the brightest star of the Southern Cross and the southernmost first-magnitude star, never visible above about 25° N latitude. It is a multiple system of hot blue B-type stars about 320 light-years away. The Southern Cross asterism appears on the flags of Australia, New Zealand, Brazil, Papua New Guinea, and Samoa, which makes Acrux one of the most flag-worthy stars in the sky.",
    simbadUrl: simbad("Acrux"),
    wikipediaUrl: wiki("Acrux"),
    adsQueryUrl: adsName("Acrux"),
  },
  Gacrux: {
    id: "Gacrux",
    whyMatters:
      "Gacrux marks the top of the Southern Cross and is the closest red giant to Earth, about 88 light-years away. Its noticeable reddish hue contrasts strongly with the surrounding blue stars of the cross, which is a tidy demonstration that the same constellation can host stars at completely different stages of stellar evolution.",
    simbadUrl: simbad("Gacrux"),
    wikipediaUrl: wiki("Gacrux"),
    adsQueryUrl: adsName("Gacrux"),
  },
  Sadr: {
    id: "Sadr",
    whyMatters:
      "Sadr (Gamma Cygni) sits at the heart of the Northern Cross and is a yellow F-type supergiant about 1,800 light-years away, roughly 33,000 times more luminous than the Sun. It is embedded in a sprawling nebular complex of glowing hydrogen called the Sadr region, much of which is invisible to the naked eye but stunning in narrowband images — a reminder that the night sky is mostly hiding what is there.",
    simbadUrl: simbad("Sadr"),
    wikipediaUrl: wiki("Gamma_Cygni"),
    adsQueryUrl: adsName("Gamma Cygni"),
  },
  Alphard: {
    id: "Alphard",
    whyMatters:
      "Alphard is the brightest star of Hydra, 'the solitary one' — it sits alone in a relatively faint patch of sky, which is why early Arab astronomers named it that. It is an orange giant about 180 light-years away, slowly losing mass through a moderate stellar wind. As a typical evolved K-type giant only 25 parsecs further than Pollux, Alphard is a calibrator for stellar-atmosphere models in the same regime.",
    simbadUrl: simbad("Alphard"),
    wikipediaUrl: wiki("Alphard"),
    adsQueryUrl: adsName("Alphard"),
  },
  Mirfak: {
    id: "Mirfak",
    whyMatters:
      "Mirfak is the brightest star of Perseus and a yellow-white F-type supergiant about 590 light-years away. It is the dominant member of the Alpha Persei Moving Group — a loose open cluster of young stars all drifting together through the galaxy, which is a great natural laboratory for studying coeval star formation. Mirfak is around 50 million years old and roughly 5,000 times brighter than the Sun.",
    simbadUrl: simbad("Mirfak"),
    wikipediaUrl: wiki("Mirfak"),
    adsQueryUrl: adsName("Mirfak"),
  },
  Schedar: {
    id: "Schedar",
    whyMatters:
      "Schedar is the brightest star of Cassiopeia, the easily-spotted 'W' (or 'M') asterism near Polaris. It is an orange giant 228 light-years away, about 33× the Sun's radius. Schedar's noticeable colour is a quick lesson for new stargazers that not every bright star is white — once you notice the orange of Schedar, the reds of Antares and Aldebaran become obvious by comparison.",
    simbadUrl: simbad("Schedar"),
    wikipediaUrl: wiki("Schedar"),
    adsQueryUrl: adsName("Schedar"),
  },
  Diphda: {
    id: "Diphda",
    whyMatters:
      "Diphda (Beta Ceti) is an orange giant about 96 light-years away in the constellation Cetus the whale, and one of the brightest X-ray emitters among nearby giants — a sign that its corona is still magnetically active even though it has left the main sequence. It is sometimes used as a substitute pole-finder in the southern hemisphere because Cetus straddles the celestial equator and Diphda is easy to identify.",
    simbadUrl: simbad("Diphda"),
    wikipediaUrl: wiki("Beta_Ceti"),
    adsQueryUrl: adsName("Beta Ceti"),
  },
  Dubhe: {
    id: "Dubhe",
    whyMatters:
      "Dubhe is one of the two pointer stars at the end of the Big Dipper's bowl — draw a line from Merak through Dubhe and you hit Polaris, which is the simplest naked-eye trick for finding north anywhere in the northern hemisphere. It is an orange giant 123 light-years away, the only Dipper star not part of the larger Ursa Major moving group: the other six are all gravitationally associated, but Dubhe is just passing through.",
    simbadUrl: simbad("Dubhe"),
    wikipediaUrl: wiki("Dubhe"),
    adsQueryUrl: adsName("Dubhe"),
  },
  M15: {
    id: "M15",
    whyMatters:
      "M15 is one of the oldest known globular clusters — its stars are roughly 12 billion years old, only a billion shy of the universe itself — and one of the densest, with a core that has undergone gravothermal collapse. At its centre sits either a swarm of stellar-mass black holes or a single intermediate-mass black hole; the question is still open. M15 also contains one of the few planetary nebulae found inside a globular cluster, a rare and short-lived sight.",
    simbadUrl: simbad("M15"),
    wikipediaUrl: wiki("Messier_15"),
    adsQueryUrl: adsName("M15"),
  },
  M92: {
    id: "M92",
    whyMatters:
      "M92 is one of the brightest globular clusters in the northern sky and one of the oldest objects in the Milky Way — roughly 12-14 billion years old. It is sometimes overlooked because it shares the constellation Hercules with the more famous M13, but it is nearly as bright. Because it is so old and metal-poor, M92 is repeatedly used as a benchmark for stellar-evolution models at the very edge of cosmological ages.",
    simbadUrl: simbad("M92"),
    wikipediaUrl: wiki("Messier_92"),
    adsQueryUrl: adsName("M92"),
  },
  M11: {
    id: "M11",
    whyMatters:
      "The Wild Duck Cluster is one of the richest and most compact open clusters in our galaxy, with about 2,900 stars packed within 21 light-years, 6,200 light-years away. Its name comes from the V-shaped pattern of its brightest stars, which reminded Admiral Smyth of a flock of ducks. Most of M11's stars are roughly 220 million years old — older than typical open clusters, which usually disperse on shorter timescales.",
    simbadUrl: simbad("M11"),
    wikipediaUrl: wiki("Wild_Duck_Cluster"),
    adsQueryUrl: adsName("M11"),
  },
  M2: {
    id: "M2",
    whyMatters:
      "M2 is a large, dense globular cluster about 37,500 light-years away in Aquarius, containing roughly 150,000 stars. It is one of the oldest objects in the Milky Way at about 13 billion years, and like other ancient globulars it is essentially a fossil record of star formation in the very early universe — its stars are stripped of heavier elements, hinting at gas that had seen only one or two earlier generations of supernovae.",
    simbadUrl: simbad("M2"),
    wikipediaUrl: wiki("Messier_2"),
    adsQueryUrl: adsName("M2"),
  },

  /* ───────────────────── MESSIER + DSOs ───────────────────── */
  M1: {
    id: "M1",
    whyMatters:
      "The Crab Nebula is the expanding wreckage of a supernova that Chinese and Japanese astronomers recorded in 1054 CE as a 'guest star' bright enough to see in daytime for weeks. At the centre sits the Crab Pulsar — the spinning neutron star left behind — which became, in 1968, the first pulsar firmly tied to a supernova remnant, proving Baade and Zwicky's 1934 prediction that supernovae produce neutron stars. The Crab is the brightest persistent source of high-energy gamma rays in the sky.",
    simbadUrl: simbad("M1"),
    wikipediaUrl: wiki("Crab_Nebula"),
    adsQueryUrl: adsName("Crab Nebula"),
    primarySources: [
      {
        title: "Staelin & Reifenstein — Pulsating radio sources near the Crab Nebula",
        url: "https://ui.adsabs.harvard.edu/abs/1968Sci...162.1481S",
        year: 1968,
      },
    ],
  },
  M13: {
    id: "M13",
    whyMatters:
      "M13, the Great Globular Cluster in Hercules, is a tight knot of around 300,000 stars about 25,000 light-years away — a relic of the early universe, with stars roughly 11.65 billion years old. In 1974 the Arecibo radio telescope beamed the famous Arecibo Message in its direction: a 1,679-bit picture of humans, our DNA, and the solar system. It is one of the easiest globular clusters to see with binoculars from the northern hemisphere.",
    simbadUrl: simbad("M13"),
    wikipediaUrl: wiki("Messier_13"),
    adsQueryUrl: adsName("M13"),
  },
  M16: {
    id: "M16",
    whyMatters:
      "M16, the Eagle Nebula, is best known for the Hubble image known as the 'Pillars of Creation' — towering columns of cold gas and dust about 6,500 light-years away in which new stars are actively forming. JWST's near-infrared and mid-infrared images of the pillars in 2022 saw through the dust to count the embedded protostars directly. The cluster of bright young stars at the centre, NGC 6611, is responsible for ionising and slowly evaporating the pillars from the outside in.",
    simbadUrl: simbad("M16"),
    wikipediaUrl: wiki("Eagle_Nebula"),
    adsQueryUrl: adsName("Eagle Nebula"),
  },
  M20: {
    id: "M20",
    whyMatters:
      "The Trifid Nebula is a striking combination of three nebula types in one frame: a pink emission nebula lit up by a hot young star, a blue reflection nebula scattering its light, and dark dust lanes cutting the whole region into three lobes (hence 'trifid'). It is around 5,200 light-years away in Sagittarius, in a particularly star-rich stretch of the Milky Way that is easy to spot in summer.",
    simbadUrl: simbad("M20"),
    wikipediaUrl: wiki("Trifid_Nebula"),
    adsQueryUrl: adsName("Trifid Nebula"),
  },
  M27: {
    id: "M27",
    whyMatters:
      "The Dumbbell Nebula was the first planetary nebula ever discovered — Charles Messier himself catalogued it in 1764 — and it is one of the brightest of its kind, easy to see in a small telescope. It is the shroud of gas a Sun-like star sheds as it dies; the white dwarf at the centre is the exposed core of that star. In about 5 billion years, our Sun will produce something very much like the view we have of M27 today.",
    simbadUrl: simbad("M27"),
    wikipediaUrl: wiki("Dumbbell_Nebula"),
    adsQueryUrl: adsName("Dumbbell Nebula"),
  },
  M31: {
    id: "M31",
    whyMatters: {
      curious:
        "Andromeda is the most distant thing you can see with just your eyes — a whole other galaxy, 2.5 million light-years away. The light hitting your eyeballs from it left when our ancestors were just figuring out how to walk upright. And it's heading right for us.",
      student:
        "M31 is the closest large spiral to us (d ≈ 765 kpc, 2.5 Mly) and the most distant object visible to the unaided eye. Hubble's 1923 detection of Cepheid variables in M31 (Hubble 1925) ended the Great Debate by proving spiral 'nebulae' were galaxies external to the Milky Way — the founding measurement of extragalactic astronomy. Andromeda and the Milky Way are approaching each other at ~110 km/s and will merge in ~4.5 Gyr into an elliptical sometimes called 'Milkomeda'.",
      expert:
        "M31, SAb spiral, d = 765 ± 28 kpc (Riess+2012 Cepheid+TRGB), MV = −21.5, total mass ~1.5 × 10¹² M⊙ (rotation curve + satellite kinematics, Watkins+2010). Hosts SMBH P3 at ~1.4 × 10⁸ M⊙ (Bender+2005). Cepheid distance scale was first established here (Hubble 1925, V₀ ≈ 285 km/s recession-free intrinsic motion); modern Gaia + HST proper motions give Δμ ≈ 40 ± 30 km/s tangential, confirming a near head-on Milky Way encounter at T ≈ 4.5 Gyr (van der Marel+2012). Resolved-stellar-population work by PHAT, PHAST, and now JWST is the deepest CMD of any external spiral and underpins much of our age-metallicity calibration for unresolved galaxies.",
    },
    simbadUrl: simbad("M31"),
    wikipediaUrl: wiki("Andromeda_Galaxy"),
    adsQueryUrl: adsName("M31"),
    primarySources: [
      {
        title: "Hubble — Cepheids in spiral nebulae",
        url: "https://ui.adsabs.harvard.edu/abs/1925Obs....48..139H",
        year: 1925,
      },
    ],
  },
  M33: {
    id: "M33",
    whyMatters:
      "The Triangulum Galaxy is the third-largest member of the Local Group, after Andromeda and the Milky Way, and one of the few galaxies far enough north and big enough on the sky to be seen with the naked eye from a dark site — though only barely. At 2.7 million light-years it is a much smaller, more loosely-wound spiral than M31, and Hubble and JWST have used its individual stars to refine the cosmic distance ladder.",
    simbadUrl: simbad("M33"),
    wikipediaUrl: wiki("Triangulum_Galaxy"),
    adsQueryUrl: adsName("M33"),
  },
  M42: {
    id: "M42",
    whyMatters: {
      curious:
        "The Orion Nebula is a giant cloud of glowing gas where new stars are being born right now. You can see it with your naked eye just below the three belt stars of Orion — that fuzzy 'middle star' in his sword is the closest stellar nursery to Earth.",
      student:
        "M42 is the closest active high-mass star-forming region to Earth (d = 412 pc) and is visible to the naked eye below Orion's Belt. The Trapezium cluster at its core (~2 000 stars in a few light-years) ionises the surrounding gas; Hubble and JWST have catalogued hundreds of 'proplyds' — protoplanetary disks being photoevaporated by UV from the OB stars — which is a live tutorial on how solar systems like ours form and survive radiation fields.",
      expert:
        "M42 = NGC 1976, H II region in the Orion A molecular cloud, d = 412 ± 12 pc (Gaia DR2 trigonometric on the Trapezium, Kounkel+2017), age ~2-3 Myr. Trapezium cluster (Θ¹ Ori A-F) ionises ~10⁴ M⊙ of molecular gas; θ¹ Ori C (O6V+B0V binary) dominates the ionising flux at ~10⁴⁹ photons/s. O'Dell & Wen (1994) first resolved >150 proplyds; ALMA + JWST have since detected silicate dust, water ice, PAHs, and even prestellar Jupiter-Mass Binary Objects (JuMBOs, McCaughrean & Pearson 2023) in the cluster. The closest analog to the radiation environment of typical Milky Way star formation and the calibration target for IMF, disk-truncation, and brown-dwarf mass-function studies.",
    },
    simbadUrl: simbad("M42"),
    wikipediaUrl: wiki("Orion_Nebula"),
    adsQueryUrl: adsName("Orion Nebula"),
    primarySources: [
      {
        title: "O'Dell & Wen — Postrefurbishment-Mission Hubble Space Telescope images of the Orion Nebula",
        url: "https://ui.adsabs.harvard.edu/abs/1994ApJ...436..194O",
        year: 1994,
      },
    ],
  },
  M45: {
    id: "M45",
    whyMatters: {
      curious:
        "The Pleiades — also called the Seven Sisters — are a little cluster of blue baby stars that humans have been telling stories about for thousands of years. They are 444 light-years away and only about 100 million years old (the dinosaurs were already dying out when these stars switched on).",
      student:
        "The Pleiades are a young (~115 Myr), nearby (d = 136 pc) open cluster containing a tight knot of B-type stars still embedded in a reflection nebula they happen to be drifting through — not their natal cloud. The cluster appears in nearly every premodern culture's sky lore, including the 3600-year-old Nebra sky disc. As one of the best-resolved young clusters within reach, it is a key calibrator for pre-main-sequence stellar models and brown-dwarf mass functions.",
      expert:
        "M45 = NGC 1432/35, open cluster, d = 136.2 ± 1.2 pc (Gaia DR3), age 112 ± 5 Myr (Stauffer+1998 lithium depletion boundary). ~1000 confirmed members down to brown-dwarf masses; total mass ≈ 800 M⊙. The blue reflection nebulosity (Maia, Merope, Alcyone surroundings) is interstellar dust the cluster is currently transiting, not pre-stellar material. Used as the second rung of the cosmic distance ladder for nearby open-cluster main-sequence fitting; the historical Hipparcos value (118 pc) vs Gaia (136 pc) is a textbook example of zero-point systematics. Several confirmed brown-dwarf candidates (e.g. Teide 1, Calar 3) used to anchor the lithium-depletion-boundary technique for sub-stellar ages.",
    },
    simbadUrl: simbad("M45"),
    wikipediaUrl: wiki("Pleiades"),
    adsQueryUrl: adsName("Pleiades"),
  },
  M51: {
    id: "M51",
    whyMatters: {
      curious:
        "The Whirlpool is two galaxies caught in slow-motion crash — a beautiful big spiral with a smaller companion yanking on one of its arms. It is the first galaxy where anyone ever drew the spiral shape, back in 1845, decades before we even knew what galaxies were.",
      student:
        "M51 is the textbook grand-design spiral, currently mid-interaction with NGC 5195 which has hooked its outer arm and is pulling it open. Lord Rosse's 1845 sketch of M51 with the Birr Castle 72-inch was the first observation of spiral structure in any object, predating the realisation that 'nebulae' could be other galaxies. SN 2011dh, a Type IIb in one of its arms, became the modern benchmark for hydrogen-stripped core-collapse supernova progenitor studies.",
      expert:
        "M51a = NGC 5194, SA(s)bc grand-design spiral, d = 8.58 ± 0.10 Mpc (Cepheid + SBF, McQuinn+2017), MV ≈ −21. Currently in tidal interaction with NGC 5195 (M51b), with a near-passage ~70 Myr ago having induced the prominent arm-driven spiral pattern (Salo & Laurikainen 2000 N-body modelling). HST PHANGS-HST + JWST PHANGS resolve thousands of young clusters and HII regions, making M51 the canonical laboratory for resolved star-formation and feedback at sub-pc scales. Type IIb SN 2011dh (Maund+2011 progenitor: 13 M⊙ yellow supergiant) anchors the IIb progenitor mass distribution.",
    },
    simbadUrl: simbad("M51"),
    wikipediaUrl: wiki("Whirlpool_Galaxy"),
    adsQueryUrl: adsName("M51"),
  },
  M57: {
    id: "M57",
    whyMatters:
      "The Ring Nebula in Lyra is the most-photographed planetary nebula in the northern sky — a glowing torus of gas blown off by a dying Sun-like star, viewed nearly down the polar axis so it looks like a smoke ring. JWST imaging in 2023 resolved fine knots and filaments in the outer halo, hinting at multiple mass-loss episodes during the star's final transition. The white dwarf at the centre is what is left of the original star's core.",
    simbadUrl: simbad("M57"),
    wikipediaUrl: wiki("Ring_Nebula"),
    adsQueryUrl: adsName("Ring Nebula"),
  },
  M77: {
    id: "M77",
    whyMatters:
      "M77 is the brightest and most-studied Seyfert galaxy — a spiral galaxy with a luminous, active nucleus powered by a supermassive black hole feeding on gas. It was used by Carl Seyfert in 1943 as one of the founding members of the class that now bears his name. At 47 million light-years, it is also one of the closest active galactic nuclei, which makes it a critical natural laboratory for understanding what quasars looked like up close.",
    simbadUrl: simbad("M77"),
    wikipediaUrl: wiki("Messier_77"),
    adsQueryUrl: adsName("M77"),
  },
  M81: {
    id: "M81",
    whyMatters:
      "Bode's Galaxy is a beautifully symmetric grand-design spiral about 12 million light-years away, and the dominant member of the M81 Group — one of the nearest galaxy groups to our own Local Group. It is gravitationally interacting with its rough-looking neighbour M82, and tidal streams of stars and gas have been mapped between them. M81 hosts a 70-million-solar-mass supermassive black hole, one of the closest such targets for studying AGN physics.",
    simbadUrl: simbad("M81"),
    wikipediaUrl: wiki("Messier_81"),
    adsQueryUrl: adsName("M81"),
  },
  M82: {
    id: "M82",
    whyMatters:
      "The Cigar Galaxy is the prototype starburst galaxy — its central regions are forming stars about ten times faster than the Milky Way, driven by tidal pummeling from its neighbour M81. The starburst drives a galactic-scale superwind that vents hot gas above and below the disk, visible in dramatic Hα and X-ray images. M82 is also where the unusually nearby Type Ia supernova SN 2014J went off, giving us a rare close-up of that kind of explosion only 12 million light-years away.",
    simbadUrl: simbad("M82"),
    wikipediaUrl: wiki("Messier_82"),
    adsQueryUrl: adsName("M82"),
  },
  M87: {
    id: "M87",
    whyMatters: {
      curious:
        "M87 is a gigantic galaxy with a black hole at its centre weighing 6.5 billion Suns. In 2019, scientists released the first ever picture of a black hole — and that picture was of M87's. It shoots a 5,000-light-year jet of plasma out into space.",
      student:
        "M87 is a giant elliptical at the heart of the Virgo Cluster, hosting a ~6.5 × 10⁹ M⊙ supermassive black hole. The Event Horizon Telescope's 2019 image of its shadow was the first direct image of a black hole's event horizon — and a non-trivial test of general relativity in the strong-field regime. M87's ~5 kpc relativistic jet, first noted by Heber Curtis in 1918, is the visible synchrotron exhaust of accretion onto that supermassive black hole.",
      expert:
        "M87 = NGC 4486, cD/E1 galaxy, d = 16.8 ± 0.8 Mpc (SBF, Mei+2007), MV ≈ −22.6. SMBH M87* mass M = (6.5 ± 0.7) × 10⁹ M⊙ (EHT 2019, consistent with prior gas-dynamical Walsh+2013 = 3.5 × 10⁹ M⊙ and stellar-dynamical Gebhardt+2011 = 6.6 × 10⁹ M⊙). EHT 230-GHz VLBI resolves a ring of diameter 42 ± 3 μas matching the prediction θ_shadow = (1 + √27) GM/c²d for a Kerr black hole. The kpc-scale jet shows superluminal apparent motion in HST monitoring (Biretta+1999) and is the prototype FR I morphology. M87 anchors the M-σ relation at the high-mass end and is a cornerstone target for next-generation EHT extensions including time-resolved 'movies'.",
    },
    simbadUrl: simbad("M87"),
    wikipediaUrl: wiki("Messier_87"),
    adsQueryUrl: adsName("M87"),
    primarySources: [
      {
        title: "Event Horizon Telescope Collaboration — First M87 Event Horizon Telescope results",
        url: "https://ui.adsabs.harvard.edu/abs/2019ApJ...875L...1E",
        year: 2019,
      },
    ],
  },
  M101: {
    id: "M101",
    whyMatters:
      "The Pinwheel Galaxy is a face-on spiral about 21 million light-years away — slightly bigger than the Milky Way and with much more visible asymmetry, almost certainly the result of past gravitational encounters with its smaller companions. It hosts many bright HII regions where new stars are being born, and SN 2011fe — the closest, best-studied Type Ia supernova of the modern era — went off there in 2011, refining how we calibrate the cosmic distance ladder.",
    simbadUrl: simbad("M101"),
    wikipediaUrl: wiki("Pinwheel_Galaxy"),
    adsQueryUrl: adsName("M101"),
  },
  M104: {
    id: "M104",
    whyMatters: {
      curious:
        "The Sombrero Galaxy really does look like a Mexican hat — a bright bulge with a dark dust brim, seen almost edge-on from Earth. It is wrapped in about 2,000 globular star clusters, ten times more than our own Milky Way has.",
      student:
        "M104 is a near-edge-on (i ≈ 84°) Sa spiral 9.6 Mpc away, with a luminous bulge and a sharply defined dust ring that gives it its hat-like silhouette. It hosts a ~10⁹ M⊙ supermassive black hole — among the largest known in the local universe — measured from gas-disk kinematics (Kormendy+1996). Its ~2 000 globular clusters (~10× the Milky Way's population) hint at a major-merger or accretion-rich formation history; recent halo-stellar-population studies see it as a spheroid-dominated lenticular cloaked by a thin spiral disk.",
      expert:
        "M104 = NGC 4594, morphology debated between Sa spiral and S0/Sa transition, d = 9.55 ± 0.34 Mpc (SBF, Tonry+2001), MV ≈ −22.4, V_rec ≈ 1024 km/s. SMBH mass M• = (1.0 ± 0.1) × 10⁹ M⊙ from STIS gas kinematics (Kormendy+1996) — one of the highest M•/M_bulge ratios known. Hosts ~1900 ± 200 globular clusters (Harris+2010, deep ACS catalog), with metallicity bimodality consistent with two-phase accretion. Spitzer + HST observations resolve the dust ring at high inclination and identify a low-luminosity AGN with extended X-ray + radio emission. Frequent target for the M-σ relation, dust-extinction reddening calibration, and AGN-feedback in low-Eddington nuclei.",
    },
    simbadUrl: simbad("M104"),
    wikipediaUrl: wiki("Sombrero_Galaxy"),
    adsQueryUrl: adsName("Sombrero Galaxy"),
  },
  M3: {
    id: "M3",
    whyMatters:
      "M3 is one of the brightest globular clusters in the sky — 500,000 ancient stars locked into a ball about 180 light-years across, sitting some 33,900 light-years from Earth. It is famously rich in RR Lyrae variable stars (over 200 catalogued), making it a key training ground for using those stars as standard candles to measure distances in the Milky Way halo.",
    simbadUrl: simbad("M3"),
    wikipediaUrl: wiki("Messier_3"),
    adsQueryUrl: adsName("M3"),
  },
  M5: {
    id: "M5",
    whyMatters:
      "M5 is one of the older known globular clusters in our galaxy, with stars about 13 billion years old — nearly as old as the universe itself. At 24,500 light-years it is also one of the easier globulars to resolve into individual stars in a backyard telescope. As a near-fossil of the early Milky Way, M5 is a benchmark for testing stellar-evolution models on metal-poor populations.",
    simbadUrl: simbad("M5"),
    wikipediaUrl: wiki("Messier_5"),
    adsQueryUrl: adsName("M5"),
  },
  M8: {
    id: "M8",
    whyMatters:
      "The Lagoon Nebula is a giant star-forming region in Sagittarius, 4,100 light-years away, bright enough to be visible to the unaided eye from a dark site. The lagoon-like dark dust lane that cuts across it gives the nebula its name. Inside, the young open cluster NGC 6530 is in the act of clearing out its birth gas, and Hubble and VLT observations have caught dozens of Herbig-Haro jets — fingerprints of protostars actively accreting.",
    simbadUrl: simbad("M8"),
    wikipediaUrl: wiki("Lagoon_Nebula"),
    adsQueryUrl: adsName("Lagoon Nebula"),
  },
  M17: {
    id: "M17",
    whyMatters:
      "The Omega Nebula (also called the Swan Nebula) is one of the most massive and luminous star-forming regions in the Milky Way, about 5,500 light-years away. The bright hot cluster at its core is producing some of the most massive young stars known to us, including a number of O-type stars. The dust and ionised hydrogen mix here is so thick that infrared instruments routinely uncover protostars that visible-light surveys completely miss.",
    simbadUrl: simbad("M17"),
    wikipediaUrl: wiki("Omega_Nebula"),
    adsQueryUrl: adsName("Omega Nebula"),
  },
  M22: {
    id: "M22",
    whyMatters:
      "M22 is one of the brightest globular clusters in the sky and one of the closest to Earth (about 10,600 light-years), making it an easy summer target for binoculars from southern latitudes. It is one of only four globular clusters known to contain a planetary nebula, and it appears to harbour two stellar-mass black holes — a surprise, because globular clusters were long thought to fling their black holes out via three-body interactions.",
    simbadUrl: simbad("M22"),
    wikipediaUrl: wiki("Messier_22"),
    adsQueryUrl: adsName("M22"),
  },
  M44: {
    id: "M44",
    whyMatters:
      "The Beehive Cluster (Praesepe) is one of the closest open clusters to Earth — about 580 light-years — and was already noted by Hipparchus, Galileo, and Ptolemy. Its few hundred stars are mostly main-sequence solar analogues around 600-800 million years old, which makes it a benchmark cluster for calibrating ages of stars elsewhere through gyrochronology — using the relationship between a star's spin rate and its age.",
    simbadUrl: simbad("M44"),
    wikipediaUrl: wiki("Beehive_Cluster"),
    adsQueryUrl: adsName("M44"),
  },
  M53: {
    id: "M53",
    whyMatters:
      "M53 is a globular cluster about 58,000 light-years away, near the galactic halo. It has unusually low metallicity, meaning its stars formed very early from gas that had been barely enriched by previous supernovae. Clusters like M53 are time capsules of conditions in the infant Milky Way.",
    simbadUrl: simbad("M53"),
    wikipediaUrl: wiki("Messier_53"),
    adsQueryUrl: adsName("M53"),
  },
  M80: {
    id: "M80",
    whyMatters:
      "M80 is one of the densest globular clusters in the Milky Way, about 32,600 light-years away. Hubble identified an unusually rich population of 'blue stragglers' here — stars that look hotter and younger than they should, almost certainly the products of stellar collisions or mergers in the cluster's crowded core. The 1860 nova T Scorpii flared up inside M80, briefly outshining the entire cluster.",
    simbadUrl: simbad("M80"),
    wikipediaUrl: wiki("Messier_80"),
    adsQueryUrl: adsName("M80"),
  },
  M94: {
    id: "M94",
    whyMatters:
      "M94 is an unusual spiral galaxy about 16 million light-years away in Canes Venatici, with a bright inner star-forming ring and a fainter outer disk that for years masqueraded as the edge of the galaxy. M94 was one of the first galaxies to challenge the assumption that all spirals are dark-matter dominated — its dynamics inside the inner disk can be modelled with little or no dark matter, sparking active debate.",
    simbadUrl: simbad("M94"),
    wikipediaUrl: wiki("Messier_94"),
    adsQueryUrl: adsName("M94"),
  },

  /* ───────────────────── COSMIC LANDMARKS ───────────────────── */
  "Sgr A*": {
    id: "Sgr A*",
    whyMatters: {
      curious:
        "At the centre of our galaxy sits a black hole 4 million times heavier than the Sun. We see stars whipping around it at thousands of kilometres per second, and in 2022 we finally took its picture — a dark hole rimmed with glowing gas.",
      student:
        "Sgr A* is the ~4.3 × 10⁶ M⊙ supermassive black hole at the dynamical centre of the Milky Way, 8.18 kpc away. Decades of high-resolution astrometric monitoring of the S-stars (especially S2, with a 16-year orbit) determined its mass and tested GR (gravitational redshift, Schwarzschild precession), winning Genzel and Ghez the 2020 Nobel Prize. The Event Horizon Telescope released a horizon-scale image of its shadow in 2022 — only the second black hole ever directly imaged.",
      expert:
        "Sgr A*, d = 8.178 ± 0.013 kpc (GRAVITY 2019), M = (4.30 ± 0.01) × 10⁶ M⊙ via S-star monitoring (Do+2019, GRAVITY+2022). Sub-Eddington accretion at L_bol ≈ 10⁻⁸ L_Edd dominated by a radiatively inefficient flow. GRAVITY observations of S2's 2018 pericentre detected the 200 km/s gravitational redshift and the 12-arcmin Schwarzschild precession of its orbit — direct GR tests in the strong-field regime. EHT 2022 ring diameter 51.8 ± 2.3 μas consistent with the predicted shadow θ = (1 + √27) GM/c²d for the measured mass. Flares observed in NIR and X-ray come from hotspots orbiting at ~6-10 R_s. Joint EHT + GRAVITY astrometry constrains the spin parameter a* but remains degenerate.",
    },
    simbadUrl: simbad("Sgr A*"),
    wikipediaUrl: wiki("Sagittarius_A*"),
    adsQueryUrl: adsName("Sagittarius A*"),
    primarySources: [
      {
        title: "Event Horizon Telescope Collaboration — First Sagittarius A* Event Horizon Telescope results",
        url: "https://ui.adsabs.harvard.edu/abs/2022ApJ...930L..12E",
        year: 2022,
      },
      {
        title: "GRAVITY Collaboration — Detection of the gravitational redshift in the orbit of the star S2 near Sgr A*",
        url: "https://ui.adsabs.harvard.edu/abs/2018A%26A...615L..15G",
        year: 2018,
      },
    ],
  },
  "M87*": {
    id: "M87*",
    whyMatters: {
      curious:
        "This is the first black hole humans ever photographed — a dark sphere bigger than our entire solar system, surrounded by a halo of glowing gas. To take its picture, astronomers turned the whole planet into one giant telescope.",
      student:
        "M87* is the ~6.5 × 10⁹ M⊙ supermassive black hole at the centre of M87, and the first whose shadow has been directly imaged (EHT 2019). The EHT collaboration combined eight millimetre-wave observatories into an Earth-sized very-long-baseline interferometric array with ~20 μas resolution. The bright asymmetric ring is synchrotron emission from gas orbiting at relativistic speeds just outside the photon ring, with Doppler boosting making the south side appear brighter.",
      expert:
        "Supermassive black hole at the dynamical centre of M87, M = (6.5 ± 0.7) × 10⁹ M⊙, d = 16.8 Mpc, Schwarzschild radius R_s ≈ 1.9 × 10¹³ m ≈ 0.13 mpc. EHT 230 GHz VLBI 2017 observations resolve a ring of diameter 42 ± 3 μas with brightness asymmetry consistent with GRMHD models of magnetically arrested accretion (MAD) onto a Kerr black hole with spin |a*| > 0.5. Linear polarisation map (EHT 2021 Paper VII) reveals a coherent helical magnetic-field structure. Driver of the ~5 kpc relativistic jet first noted by Curtis (1918); HST monitoring shows knot-by-knot superluminal motion in the inner kpc.",
    },
    simbadUrl: simbad("M87"),
    wikipediaUrl: wiki("Messier_87"),
    adsQueryUrl: adsName("M87 black hole"),
    primarySources: [
      {
        title: "Event Horizon Telescope Collaboration — First M87 Event Horizon Telescope results. I. The shadow of the supermassive black hole",
        url: "https://ui.adsabs.harvard.edu/abs/2019ApJ...875L...1E",
        year: 2019,
      },
    ],
  },
  "Cygnus X-1": {
    id: "Cygnus X-1",
    whyMatters: {
      curious:
        "Cygnus X-1 was the first thing scientists agreed had to be a black hole — an invisible heavyweight pulling gas off a giant blue companion star and frying it into X-rays. Stephen Hawking bet against it being a black hole as a kind of joke insurance — and finally lost the bet in 1990.",
      student:
        "Cygnus X-1 is a high-mass X-ray binary: a ~21 M⊙ stellar-mass black hole accreting from the stellar wind of an O-type blue supergiant (HDE 226868). It was the first compelling stellar-mass black-hole candidate (Webster & Murdin 1972; Bolton 1972), inferred from the mass function exceeding the neutron-star upper limit. The famous Hawking-Thorne 1974 bet (Hawking betting against it being a black hole as an 'insurance policy') was conceded by Hawking in 1990 when evidence became overwhelming.",
      expert:
        "Cyg X-1, d = 2.22⁺⁰·¹⁸₋₀.₁₇ kpc (radio parallax, Reid+2011 / Miller-Jones+2021), HDE 226868 = O9.7 Iab, P_orb = 5.5996 d. Mass measurements (Miller-Jones+2021 VLBA, Orosz+2011 Roche-tomography): M_BH = 21.2 ± 2.2 M⊙, M_⋆ = 40.6⁺⁷·⁷₋₇.₁ M⊙, i = 27.5°. Accretion via focused stellar wind; X-ray spectral states (low-hard, high-soft) provide the canonical state-transition phenomenology for black-hole binaries. Dimensionless spin a* > 0.95 inferred from accretion-disk continuum fitting (Gou+2014) and Fe-Kα reflection. First confirmed stellar-mass black hole and reference object for hard-state corona physics, jet launching (steady compact radio jet), and X-ray polarimetry (IXPE 2022 detection of a high-polarised hard-state corona).",
    },
    simbadUrl: simbad("Cygnus X-1"),
    wikipediaUrl: wiki("Cygnus_X-1"),
    adsQueryUrl: adsName("Cygnus X-1"),
    primarySources: [
      {
        title: "Webster & Murdin — Cygnus X-1 — a spectroscopic binary with a heavy companion?",
        url: "https://ui.adsabs.harvard.edu/abs/1972Natur.235...37W",
        year: 1972,
      },
    ],
  },
  "Crab Pulsar": {
    id: "Crab Pulsar",
    whyMatters: {
      curious:
        "The Crab Pulsar is a tiny city-sized dead star that spins 30 times every second — and the leftover from a star explosion that lit up the sky in the year 1054, bright enough to see in the daytime. It is still throwing out so much energy that it lights up the whole Crab Nebula around it.",
      student:
        "The Crab Pulsar is the rapidly rotating neutron star at the heart of the Crab Nebula — the remnant of a Type II supernova recorded by Chinese astronomers in 1054 CE. It was the first pulsar firmly identified with a supernova remnant (Staelin & Reifenstein 1968), proving Baade & Zwicky's 1934 prediction that core-collapse supernovae make neutron stars. Its rotational spin-down energy (~5 × 10³⁸ erg/s) powers the entire nebula's synchrotron emission across the radio-to-TeV-gamma-ray spectrum.",
      expert:
        "PSR B0531+21, P = 33.392 ms, Ṗ = 4.21 × 10⁻¹³ s/s, characteristic age τ_c = P/2Ṗ ≈ 1240 yr (factor of ~1.3 larger than true 970 yr age), surface dipolar B ≈ 3.8 × 10¹² G, spin-down luminosity Ė ≈ 4.6 × 10³⁸ erg/s. Located in SN 1054 remnant at d = 2.0 ± 0.5 kpc. Powers the Crab Nebula synchrotron emission from radio through ~100 TeV via a relativistic e±-dominated wind terminating at the X-ray torus/jet structure imaged by Chandra. Pulses detected at every accessible wavelength from radio to >1 TeV; giant-pulse phenomenon (Cordes+2004) involves nanosecond-scale radio bursts with brightness temperatures ~10³⁷ K. Reference 'standard candle' for high-energy astrophysics calibration and IPTA pulsar-timing-array cross-validation.",
    },
    simbadUrl: simbad("Crab Pulsar"),
    wikipediaUrl: wiki("Crab_Pulsar"),
    adsQueryUrl: adsName("Crab Pulsar"),
  },
  "Vela Pulsar": {
    id: "Vela Pulsar",
    whyMatters:
      "The Vela Pulsar spins about 11 times per second and is one of the brightest persistent gamma-ray sources in the sky — about 1,000 light-years away, the remnant of a supernova that detonated roughly 11,000 years ago. It is the prototype 'glitching' pulsar: every few years it suddenly speeds up by tiny amounts, a phenomenon thought to reveal the strange superfluid state of matter inside neutron stars.",
    simbadUrl: simbad("Vela Pulsar"),
    wikipediaUrl: wiki("Vela_Pulsar"),
    adsQueryUrl: adsName("Vela Pulsar"),
  },
  "Cas A": {
    id: "Cas A",
    whyMatters: {
      curious:
        "Cassiopeia A is the youngest known wreckage of an exploded star in our galaxy — the explosion only reached Earth about 340 years ago, though almost nobody noticed it through the dust. JWST has now mapped every glowing piece of the wreckage, including atoms forged in the heart of the blast itself.",
      student:
        "Cas A is the youngest known galactic supernova remnant — the explosion light reached Earth around 1680 CE but was barely recorded, presumably obscured by interstellar dust. At d ≈ 3.4 kpc it is the brightest extrasolar radio source in the sky. JWST MIRI imaging (Milisavljevic+2024) and Chandra X-ray spectroscopy resolve the expanding stratified debris, including direct detection of ⁴⁴Ti, Fe, and Si layers forged in core-collapse nucleosynthesis — the strongest constraints on the explosion mechanism's asymmetry from any individual remnant.",
      expert:
        "G111.7-2.1, d = 3.4 ± 0.1 kpc, age ~340 yr, expanding shock at ~5000 km/s. Brightest radio source in the sky outside the solar system (S₁ GHz ≈ 2720 Jy). Central compact object: cooling neutron star with no detected pulsations, surface T ≈ 2 MK, possibly hosting carbon atmosphere (Ho & Heinke 2009). Chandra ACIS deep mapping (Hwang+2004) resolves ejecta knots of Si, S, Ar, Ca, Fe with reverse-shock heating; ⁴⁴Ti detection by NuSTAR (Grefenstette+2014) constrains asymmetric ejecta dynamics. JWST MIRI 'Green Monster' feature (Milisavljevic+2024) identified as circumstellar material shocked by the forward blast. Reference object for core-collapse explosion models, neutron-star superfluidity (cooling curve, Page+2011), and pulsar-wind-nebula non-detections.",
    },
    simbadUrl: simbad("Cas A"),
    wikipediaUrl: wiki("Cassiopeia_A"),
    adsQueryUrl: adsName("Cassiopeia A"),
  },
  "Tycho's SN": {
    id: "Tycho's SN",
    whyMatters:
      "SN 1572 was a Type Ia supernova bright enough that Tycho Brahe observed it in daytime — his careful astrometry showed it never moved relative to the stars, demolishing the Aristotelian doctrine that the heavens beyond the Moon were unchangeable. The expanding remnant has been mapped in X-rays and radio, and light echoes from the explosion are still bouncing off interstellar dust today, allowing modern instruments to literally re-record the spectrum of a 450-year-old supernova.",
    simbadUrl: simbad("SN 1572"),
    wikipediaUrl: wiki("SN_1572"),
    adsQueryUrl: adsName("SN 1572"),
    primarySources: [
      {
        title: "Krause et al. — Tycho Brahe's 1572 supernova as a standard type Ia as revealed by its light-echo spectrum",
        url: "https://ui.adsabs.harvard.edu/abs/2008Natur.456..617K",
        year: 2008,
      },
    ],
  },
  "3C 273": {
    id: "3C 273",
    whyMatters:
      "3C 273 was the first quasar ever identified — a star-like blue point with an enormous redshift (z = 0.158) that Maarten Schmidt cracked in 1963, instantly revealing that it lay over two billion light-years away and was therefore intrinsically more luminous than entire galaxies. Quasars turned out to be supermassive black holes feeding voraciously on their host galaxies. 3C 273 is still one of the brightest and best-studied quasars, and a touchstone for AGN physics.",
    simbadUrl: simbad("3C 273"),
    wikipediaUrl: wiki("3C_273"),
    adsQueryUrl: adsName("3C 273"),
    primarySources: [
      {
        title: "Schmidt — 3C 273: A star-like object with large red-shift",
        url: "https://ui.adsabs.harvard.edu/abs/1963Natur.197.1040S",
        year: 1963,
      },
    ],
  },
  "Centaurus A": {
    id: "Centaurus A",
    whyMatters:
      "Centaurus A is the closest active galaxy with a large radio jet — a giant elliptical 13 million light-years away with a striking dust lane crossing it, the visible scar of having recently eaten a spiral galaxy. The central supermassive black hole is launching twin radio jets larger than the full moon on the sky, making Cen A one of the most spectacular targets in radio astronomy and a benchmark laboratory for understanding AGN feedback in nearby galaxies.",
    simbadUrl: simbad("Centaurus A"),
    wikipediaUrl: wiki("Centaurus_A"),
    adsQueryUrl: adsName("Centaurus A"),
  },
  "Tabby's Star": {
    id: "Tabby's Star",
    whyMatters: {
      curious:
        "Tabby's Star is the one star where, for a few months in 2015, even serious scientists asked 'could this be aliens building stuff around their sun?' It dimmed in patterns no normal planet could explain. The answer turned out to be more boring (dust), but the question was real.",
      student:
        "KIC 8462852 caught attention in 2015 when Kepler observed irregular dimming events of up to 22% — far deeper and more asymmetric than any normal planetary transit. Brief but serious speculation about Dyson swarms followed. Multiwavelength follow-up (Boyajian+2018, Deeg+2018) showed wavelength-dependent dipping consistent with circumstellar dust, ruling out solid megastructures. The episode remains a clean case study of how follow-up photometry and spectroscopy resolved a genuinely anomalous Kepler light curve.",
      expert:
        "KIC 8462852, F3V star, d = 451 pc (Gaia DR2), V ≈ 11.7, M ≈ 1.43 M⊙, R ≈ 1.58 R⊙, Teff ≈ 6750 K, age ~1.5 Gyr. Kepler photometry 2009-13 (Boyajian+2016) showed isolated dipping events with depths up to 22% lasting hours to days, plus a secular ~0.16 mag dimming over the 4-yr baseline (Schaefer 2016, debated). Coordinated 2017-18 photometric + spectroscopic + polarimetric campaigns (Boyajian+2018) found chromatic dipping with shallower UV depths — incompatible with optically thick occulters; consistent with sub-μm circumstellar dust clouds. Detailed dust-cloud architectures (e.g. fragmenting exomoon, Wright & Sigurdsson 2016; broken-up planet) remain open; SETI follow-up at Allen, BL, and FAST detected no anomalous narrowband signals.",
    },
    simbadUrl: simbad("KIC 8462852"),
    wikipediaUrl: wiki("Tabby%27s_Star"),
    adsQueryUrl: adsName("KIC 8462852"),
    primarySources: [
      {
        title: "Boyajian et al. — Planet Hunters IX. KIC 8462852 — Where's the flux?",
        url: "https://ui.adsabs.harvard.edu/abs/2016MNRAS.457.3988B",
        year: 2016,
      },
    ],
  },

  /* ───────────────────── FAMOUS TRANSIENTS ───────────────────── */
  "SN 1987A": {
    id: "SN 1987A",
    whyMatters: {
      curious:
        "In 1987 a star exploded close enough to see from Earth without a telescope. Hours before the light arrived, three buried detectors on three continents felt a flash of neutrinos passing through the Earth — the death throes of the star, sent ahead of the light show.",
      student:
        "SN 1987A was the closest naked-eye supernova since Kepler's of 1604 — a Type II core-collapse in the Large Magellanic Cloud at 50 kpc. Hours before optical detection, Kamiokande-II, IMB, and Baksan independently recorded ~25 neutrinos from the core-collapse event, the first observational confirmation that ~99% of a Type II supernova's energy is emitted as neutrinos (Hirata+1987). Decades of HST and ALMA imaging are tracking the shock wave's interaction with a pre-existing circumstellar ring of stellar material, and JWST in 2024 finally detected the long-sought compact remnant in its centre.",
      expert:
        "SN 1987A in the LMC, d = 51.4 kpc; progenitor Sk −69° 202, B3 Ia blue supergiant with M_ZAMS ≈ 18-20 M⊙ — the first BSG-progenitor SN, surprising because the canonical pre-SN model was a red supergiant. Total energy ~1 × 10⁴⁴ J = 10⁵¹ erg; neutrino burst totalling ~3 × 10⁵³ erg in ~10 s, mean neutrino energy ~12-15 MeV across detectors. Triple-ring CSM (HST 1990s) consistent with prior binary-merger mass loss. ALMA molecular-ring resolved cold dust ~0.5 M⊙ (Indebetouw+2014); JWST/MIRI 2024 IR excess + NeII line ratios provide strongest evidence yet for the long-elusive central neutron star (Fransson+2024). Reference event for neutrino astrophysics, ν-mass limits, light-curve modelling of ⁵⁶Ni decay, and circumstellar-interaction physics.",
    },
    simbadUrl: simbad("SN 1987A"),
    wikipediaUrl: wiki("SN_1987A"),
    adsQueryUrl: adsName("SN 1987A"),
    primarySources: [
      {
        title: "Hirata et al. — Observation of a neutrino burst from the supernova SN 1987A",
        url: "https://ui.adsabs.harvard.edu/abs/1987PhRvL..58.1490H",
        year: 1987,
      },
    ],
  },
  GW150914: {
    id: "GW150914",
    whyMatters: {
      curious:
        "On 14 September 2015 we 'heard' two black holes crash into each other for the first time. The collision happened 1.3 billion years ago, and it shook the fabric of space itself enough that, when the ripples finally reached Earth, two giant detectors wobbled by less than a thousandth of the width of a proton.",
      student:
        "GW150914 was the first direct detection of gravitational waves, observed by LIGO Hanford and Livingston on 14 September 2015. The 0.2-second chirp encoded the inspiral, merger, and ringdown of two black holes (36⁺⁵₋₄ M⊙ + 29⁺⁴₋₄ M⊙ → 62⁺⁴₋₄ M⊙) at a luminosity distance of ~410 Mpc. About 3 M⊙c² of rest mass was radiated as gravitational waves in a fraction of a second. The discovery confirmed a century-old GR prediction (Einstein 1916), proved binary stellar-mass black holes exist and merge within a Hubble time, and earned the 2017 Nobel Prize in Physics.",
      expert:
        "GW150914 (Abbott+2016 PRL 116:061102). Detected at H1 and L1 with SNR_H = 19.7, SNR_L = 13.3, network SNR 24, false-alarm rate < 1 / 200 000 yr. Inferred source parameters (LALInference, low-spin priors): m₁ = 36.2⁺⁵·²₋₃·⁸ M⊙, m₂ = 29.1⁺³·⁷₋₄·⁴ M⊙, M_f = 62.3⁺³·⁷₋₃·¹ M⊙, χ_f = 0.68⁺⁰·⁰⁵₋⁰·⁰⁶, E_GW = 3.0⁺⁰·⁵₋⁰·⁵ M⊙c², d_L = 410⁺¹⁶⁰₋¹⁸⁰ Mpc (z ≈ 0.09), sky-localisation ~600 deg² (HL-only). Peak GW luminosity ~3.6 × 10⁵⁶ erg/s exceeded the combined EM luminosity of the observable universe. Ringdown frequency f = 250 Hz, decay time 4 ms consistent with Kerr quasinormal mode. Inaugurated multi-messenger GW astronomy; later GW170817 (BNS) and the GWTC-3 catalogue (90+ events) followed.",
    },
    wikipediaUrl: wiki("GW150914"),
    adsQueryUrl: adsName("GW150914"),
    primarySources: [
      {
        title: "Abbott et al. (LIGO/Virgo) — Observation of gravitational waves from a binary black hole merger",
        url: "https://ui.adsabs.harvard.edu/abs/2016PhRvL.116f1102A",
        year: 2016,
      },
    ],
  },
  "1I/'Oumuamua": {
    id: "1I/'Oumuamua",
    whyMatters: {
      curious:
        "'Oumuamua was the first thing we ever saw fly through our solar system from another star. It zipped past us in 2017, was the shape of a tumbling cigar, sped up slightly more than gravity should have allowed, then vanished back into deep space before we could send anything to look at it.",
      student:
        "'Oumuamua, detected by Pan-STARRS in October 2017, was the first confirmed interstellar object — a hyperbolic-orbit visitor that no Sun-bound body could follow (e = 1.20). It gave us ~2.5 months of observations before fading and exhibited unusual non-gravitational acceleration with no visible cometary tail (Micheli+2018), implying outgassing or radiation-pressure forces from a low-mass body. Its true nature — H₂- or N₂-ice chunk, fragmented comet, fluffy fractal aggregate — remains debated, and it motivated the design of rapid-response interstellar-object missions like ESA Comet Interceptor.",
      expert:
        "1I/2017 U1 ('Oumuamua), hyperbolic orbit e = 1.20, v∞ = 26.33 km/s, q = 0.255 AU, i = 122.74°. Light curve amplitude 2.5 mag, period 7.34 hr, implying extreme axis ratio (≥6:1) and tumbling rotation. No detected cometary activity in Spitzer 4.5-μm photometry (Trilling+2018) → upper limit on water outgassing <9 × 10²⁵ molecules/s. Non-gravitational acceleration a_NG ≈ 4.92 × 10⁻⁶ m/s² @ 1.4 AU (Micheli+2018), ruling out plain inert rock; proposed sources include H₂ ice sublimation (Seligman & Laughlin 2020) or solar-radiation pressure on a low-density (ρ ≲ 0.1 g/cm³) aggregate. Galactic-frame velocity matches the Local Standard of Rest to within a few km/s, consistent with origin in a young (~50 Myr) nearby stellar system. Provided the first observational constraints on the size-frequency distribution of interstellar minor bodies.",
    },
    wikipediaUrl: wiki("%CA%BBOumuamua"),
    adsQueryUrl: adsName("Oumuamua"),
    primarySources: [
      {
        title: "Meech et al. — A brief visit from a red and extremely elongated interstellar asteroid",
        url: "https://ui.adsabs.harvard.edu/abs/2017Natur.552..378M",
        year: 2017,
      },
    ],
  },
  "Comet Hale-Bopp": {
    id: "Comet Hale-Bopp",
    whyMatters:
      "Comet Hale-Bopp was the great comet of 1997 — visible to the naked eye for 18 months, longer than any comet in recorded history, with a brilliant blue ion tail and a yellow dust tail spread across half the sky. It is enormous for a comet (nucleus about 60 km across) and on a very long orbit that will bring it back to the inner solar system around the year 4400. Comets like Hale-Bopp are essentially deep-frozen samples of the early solar nebula.",
    wikipediaUrl: wiki("Comet_Hale%E2%80%93Bopp"),
    adsQueryUrl: adsName("Hale-Bopp"),
  },
  "Comet NEOWISE": {
    id: "Comet NEOWISE",
    whyMatters:
      "Comet NEOWISE (C/2020 F3) was the brightest naked-eye comet visible from the northern hemisphere since Hale-Bopp in 1997 — discovered in March 2020 by the NEOWISE infrared survey satellite, sweeping past the Sun in July and then putting on a spectacular show in evening twilight. Sodium emission from its tail was unusually strong, which is rare for comets and gave researchers a fresh chemical look at material vapourised so close to the Sun.",
    wikipediaUrl: wiki("Comet_NEOWISE"),
    adsQueryUrl: adsName("Comet NEOWISE"),
  },
};

/** Normalise an id for tolerant lookup (case + decorations). */
function normalise(id: string): string {
  return id
    .toLowerCase()
    .replace(/^messier\s+/, "m")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALISED_MAP: Map<string, ObjectCitation> = (() => {
  const m = new Map<string, ObjectCitation>();
  for (const [key, value] of Object.entries(OBJECT_CITATIONS)) {
    m.set(normalise(key), value);
  }
  // A few common aliases that the catalog uses elsewhere in the app.
  const aliases: Array<[string, string]> = [
    ["Crab Nebula", "M1"],
    ["Andromeda Galaxy", "M31"],
    ["Andromeda", "M31"],
    ["Orion Nebula", "M42"],
    ["Pleiades", "M45"],
    ["Whirlpool Galaxy", "M51"],
    ["Whirlpool", "M51"],
    ["Ring Nebula", "M57"],
    ["Eagle Nebula", "M16"],
    ["Dumbbell Nebula", "M27"],
    ["Trifid Nebula", "M20"],
    ["Lagoon Nebula", "M8"],
    ["Omega Nebula", "M17"],
    ["Pinwheel Galaxy", "M101"],
    ["Sombrero Galaxy", "M104"],
    ["Sombrero", "M104"],
    ["Cigar Galaxy", "M82"],
    ["Triangulum Galaxy", "M33"],
    ["Triangulum", "M33"],
    ["Bode's Galaxy", "M81"],
    ["Beehive Cluster", "M44"],
    ["Beehive", "M44"],
    ["Praesepe", "M44"],
    ["Sagittarius A*", "Sgr A*"],
    ["SgrA*", "Sgr A*"],
    ["Luna", "Moon"],
    ["Sol", "Sun"],
    ["Proxima Cen", "Proxima Centauri"],
    ["Alpha Cen A", "Alpha Centauri A"],
    ["Alpha Cen B", "Alpha Centauri B"],
    ["alf Cen A", "Alpha Centauri A"],
    ["alf Cen B", "Alpha Centauri B"],
    ["Barnards Star", "Barnard's Star"],
    ["Oumuamua", "1I/'Oumuamua"],
    ["'Oumuamua", "1I/'Oumuamua"],
    ["1I/Oumuamua", "1I/'Oumuamua"],
    ["SN1572", "Tycho's SN"],
    ["SN 1572", "Tycho's SN"],
    ["Tycho", "Tycho's SN"],
    ["Tycho Supernova", "Tycho's SN"],
    ["Tycho's Supernova", "Tycho's SN"],
    ["Cassiopeia A", "Cas A"],
    ["KIC 8462852", "Tabby's Star"],
    ["Boyajian's Star", "Tabby's Star"],
  ];
  for (const [alias, key] of aliases) {
    const c = OBJECT_CITATIONS[key];
    if (c) m.set(normalise(alias), c);
  }
  return m;
})();

/** Tolerant lookup. Returns null when no citation is available. */
export function citationFor(id: string): ObjectCitation | null {
  if (!id) return null;
  const hit = NORMALISED_MAP.get(normalise(id));
  return hit ?? null;
}

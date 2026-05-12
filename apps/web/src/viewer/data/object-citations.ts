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

export type ObjectCitation = {
  /** Catalog id — must match the display name used elsewhere in the app. */
  id: string;
  /** One paragraph, 3-5 sentences, editorial voice. */
  whyMatters: string;
  /** SIMBAD by-identifier URL, if SIMBAD has the object. */
  simbadUrl?: string;
  /** Canonical English Wikipedia article. */
  wikipediaUrl?: string;
  /** ADS NASA URL — name-search, or specific abstract for landmark results. */
  adsQueryUrl?: string;
  /** 1-3 landmark papers. Real titles, real years, real DOIs/abstracts. */
  primarySources?: Array<{ title: string; url: string; year: number }>;
};

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
    whyMatters:
      "Every joule of energy that has ever warmed a tree, a beach, or a brain on Earth came out of the Sun's core, where four hydrogen nuclei are crushed together into a single helium nucleus about a hundred billion trillion trillion times per second. The Sun is an ordinary middle-aged G-type star, which means studying it is also studying the most common kind of life-hosting environment in the galaxy. Its 11-year activity cycle drives the aurorae, sets our space-weather forecasts, and occasionally fries a power grid. Without the Sun there would be no solar system, no biosphere, and no astronomy.",
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
    whyMatters:
      "Mercury is a fossil of how rocky worlds are built. It is mostly iron core under a thin rocky skin — likely the scorched remnant of a larger Mars-sized body whose outer layers were blown off by an early impact. NASA's MESSENGER mission found water ice in permanently shadowed polar craters, just a few hundred kilometers from a surface that reaches 430 °C in the noon Sun, which is a beautifully extreme thing to discover next door. Its orbit precesses in a way Newton could not explain — and that extra tilt was the first observational confirmation of Einstein's general relativity.",
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
    whyMatters:
      "Venus is what happens when a planet gets the climate wrong. It is almost Earth's twin in size and gravity, but a runaway greenhouse trapped carbon dioxide in the atmosphere until the surface settled at 462 °C under 92 bars of pressure — hot enough to melt lead, crushing enough to flatten a deep-sea submarine. Studying Venus is the best way we have to understand the upper limits of climate feedback, and the 2020 claim of phosphine in its clouds reopened the wild question of whether anything biological could persist in the temperate cloud deck 50 km up.",
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
    whyMatters:
      "Earth is the only place we know of where matter has organised itself into something that can wonder about matter. The combination of liquid water, plate tectonics that recycle carbon on geological timescales, a magnetic field that deflects the solar wind, and a single oversized Moon that stabilises the axial tilt is not subtle — change any one of those and the climate record looks very different. From orbit, Earth is also the calibration target for every exoplanet biosignature search: every spectrum we hope to read on another world is compared to ours first.",
    simbadUrl: simbad("Earth"),
    wikipediaUrl: wiki("Earth"),
    adsQueryUrl: adsName("Earth"),
  },
  Moon: {
    id: "Moon",
    whyMatters:
      "The Moon is unusually big for the planet it orbits, which is exactly why Earth has a stable climate over hundreds of millions of years — without it, our axial tilt would wobble chaotically. Apollo samples nailed down its age (4.51 Gyr) and confirmed the giant-impact origin: roughly 60 million years after Earth formed, a Mars-sized body called Theia hit us, and the Moon condensed from the debris ring. Lunar craters are also our cleanest record of the inner solar system's bombardment history, because the Moon has no weather to erase them.",
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
    whyMatters:
      "Mars is the only other world in this solar system that ever clearly had rivers, lakes, and possibly a northern ocean. Roughly 3.5 billion years ago its core dynamo died, the magnetic field collapsed, and the solar wind stripped most of the atmosphere into space — and the planet we see today is what is left. Robotic rovers (Spirit, Opportunity, Curiosity, Perseverance) keep finding organic molecules and habitable past chemistry in rocks at Gale and Jezero craters, which is why every serious search for life beyond Earth still treats Mars as suspect number one.",
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
    whyMatters:
      "Jupiter is the heaviest thing in the solar system after the Sun — 2.5 times the mass of every other planet combined — and its gravity helped sculpt the orbits the inner planets ended up in. The Galileo probe and now Juno have been measuring its deep winds and gravitational moments, which tell us its core is not the neat rock-iron ball textbooks used to draw but a diffuse, partly-dissolved mush of heavy elements blurred into hydrogen. Its four largest moons (Io, Europa, Ganymede, Callisto) include the best candidate ocean worlds within reach of a flyby mission.",
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
    whyMatters:
      "Saturn's rings look permanent in any textbook photo, but Cassini measurements suggest they are geologically young — perhaps only 100-400 million years old — and slowly raining onto the planet. Saturn itself is less dense than water and rotates so fast it bulges visibly at the equator. Its moon Titan is the only place beyond Earth with a thick atmosphere and standing surface liquid (lakes of methane and ethane), and Enceladus is shooting plumes of salty water from a subsurface ocean directly into space, where Cassini flew through them and found organic chemistry.",
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
    whyMatters:
      "Uranus is tipped on its side — 98° axial tilt — almost certainly because something big hit it during the chaotic last stages of planet formation. It is an 'ice giant', meaning its bulk is water, methane, and ammonia under enormous pressure, not the metallic hydrogen of Jupiter and Saturn. We have only ever flown past it once (Voyager 2 in 1986), and almost every modern question about its atmosphere, faint rings, and 27 moons is waiting for a dedicated mission that is being planned but has not launched.",
    simbadUrl: simbad("Uranus"),
    wikipediaUrl: wiki("Uranus"),
    adsQueryUrl: adsName("Uranus"),
  },
  Neptune: {
    id: "Neptune",
    whyMatters:
      "Neptune was the first planet found by maths before it was found by a telescope: Le Verrier predicted its position from the way Uranus's orbit was being tugged off course, and Galle pointed a telescope there in 1846 and saw it. It hosts the strongest sustained winds in the solar system (2,100 km/h), and its largest moon, Triton, orbits backwards relative to Neptune's spin — a clear sign it was captured from the Kuiper belt rather than forming in place. Triton even has nitrogen geysers, which is a wild detail for a world at −235 °C.",
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
    whyMatters:
      "Sirius is the brightest star in our night sky — partly because it is intrinsically luminous (an A1V main-sequence star, 25× the Sun's luminosity), but mostly because at 8.6 light-years it is one of our nearest neighbours. It is a binary: the visible star Sirius A has a tiny white-dwarf companion, Sirius B, the first white dwarf ever identified (1862), and a critical anchor for our theory of stellar end-states. Ancient Egyptians timed the flooding of the Nile to Sirius's heliacal rising.",
    simbadUrl: simbad("Sirius"),
    wikipediaUrl: wiki("Sirius"),
    adsQueryUrl: adsName("Sirius"),
  },
  Vega: {
    id: "Vega",
    whyMatters:
      "Vega is the standard candle of stellar photometry — by definition, its visible-band magnitude is essentially zero, and other stars are measured relative to it. IRAS detected an infrared excess around Vega in 1984 that turned out to be a debris disc of dust and proto-planetary material, kicking off the modern field of exoplanet system architecture. Because of Earth's 26,000-year axial precession, Vega was the North Star around 12,000 BCE and will be again around 14,000 CE.",
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
    whyMatters:
      "Polaris sits within one degree of the north celestial pole right now, which has made it the navigator's anchor for centuries — but the pole drifts on a 26,000-year cycle and will leave Polaris behind in a few millennia. It is also a Cepheid variable, the class of stars Henrietta Leavitt used to calibrate cosmic distances in 1912, and the closest Cepheid to us, which makes it a crucial pin in the cosmic distance ladder. Polaris is actually a multiple-star system; the main star is a yellow supergiant about 2,500 times brighter than the Sun.",
    simbadUrl: simbad("Polaris"),
    wikipediaUrl: wiki("Polaris"),
    adsQueryUrl: adsName("Polaris"),
  },
  Betelgeuse: {
    id: "Betelgeuse",
    whyMatters:
      "Betelgeuse is a red supergiant so swollen that if you plopped it down where the Sun is, its surface would extend past the orbit of Jupiter. It is in the last fraction of a percent of its life and will go supernova sometime in the next 100,000 years — when it does, it will be bright enough to read by at night for weeks. In 2019-2020 it dimmed unexpectedly, which turned out to be a giant dust cloud crossing our line of sight, not the supernova itself.",
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
    whyMatters:
      "Proxima Centauri is the closest star to the Sun — 4.246 light-years away — and it hosts at least one Earth-mass planet in its habitable zone, Proxima b, discovered in 2016. It is a small, cool red dwarf (M5.5Ve) prone to violent flares, which complicates the question of whether anything could live on Proxima b. As a red dwarf it will fuse hydrogen for trillions of years, long after Sun-like stars have died, which means dim red stars like this one will outlast almost everything else in the universe.",
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
    whyMatters:
      "The Andromeda Galaxy is the closest large spiral galaxy to ours — about 2.5 million light-years away — and the most distant object the unaided eye can see. Edwin Hubble's measurement of Cepheid variables in M31 in 1923 proved that 'spiral nebulae' were galaxies in their own right, outside the Milky Way. The collision between M31 and the Milky Way is already underway and will fully merge in about 4.5 billion years to form an elliptical galaxy informally called 'Milkomeda'.",
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
    whyMatters:
      "The Orion Nebula is the closest large star-forming region to Earth — about 1,344 light-years away — and one of the only nebulae visible to the unaided eye (look just below Orion's Belt). Inside it, Hubble and JWST have catalogued hundreds of protoplanetary disks ('proplyds'), young stars in the act of building solar systems exactly the way ours formed 4.6 billion years ago. M42 is essentially a live tutorial on how stars and planets are born.",
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
    whyMatters:
      "The Pleiades — the 'Seven Sisters' — are a young open cluster only about 100 million years old, just 444 light-years away. The bright B-type stars are still surrounded by wisps of the blue reflection nebula they swept through, not the nebula they were born in. Cultures from the Greeks to the Maori to the Lakota independently noticed the seven brightest stars, and the Pleiades shows up on the Nebra sky disc — one of the oldest known sky maps, over 3,600 years old.",
    simbadUrl: simbad("M45"),
    wikipediaUrl: wiki("Pleiades"),
    adsQueryUrl: adsName("Pleiades"),
  },
  M51: {
    id: "M51",
    whyMatters:
      "The Whirlpool Galaxy is a textbook 'grand design' spiral, 23 million light-years away, currently mid-interaction with a smaller companion galaxy (NGC 5195) tugging at one of its spiral arms. Lord Rosse drew the first-ever sketch of spiral structure in any galaxy when he observed M51 in 1845. SN 2011dh, a Type IIb supernova, went off in one of its arms and gave astronomers a rare look at the structure of a hydrogen-poor massive-star explosion.",
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
    whyMatters:
      "M87 is a giant elliptical galaxy at the heart of the Virgo Cluster, 53.5 million light-years away. It hosts one of the most massive known black holes — about 6.5 billion solar masses — and that black hole was the very first to ever be imaged directly, by the Event Horizon Telescope collaboration in 2019. The famous one-sided jet of plasma streaming out of M87's nucleus, first noted by Heber Curtis in 1918, is the visible exhaust of that monster.",
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
    whyMatters:
      "The Sombrero Galaxy is a near-edge-on spiral 28 million light-years away with a luminous bulge and a sharply defined ring of dust that gives it its hat-like silhouette. It hosts a billion-solar-mass supermassive black hole at its core and is one of the most striking targets in any backyard telescope. Sombrero is rich in globular clusters (around 2,000 of them) — far more than the Milky Way — which raises interesting questions about its merger history.",
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
    whyMatters:
      "Sagittarius A* is the supermassive black hole at the centre of our Milky Way — about 4.3 million times the mass of the Sun, 27,000 light-years away. Decades of patient orbital monitoring of stars whipping around it in our galactic core (the S-cluster) won Reinhard Genzel and Andrea Ghez the 2020 Nobel Prize in Physics. The Event Horizon Telescope released the direct image of its shadow in 2022, three years after they did the same for M87*.",
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
    whyMatters:
      "M87* is the supermassive black hole at the centre of the giant elliptical galaxy M87 — and the very first black hole humanity has ever imaged. The Event Horizon Telescope linked radio dishes across the planet into a virtual Earth-sized telescope and resolved the dark shadow of the event horizon in 2019, almost exactly the size and shape predicted by general relativity. The bright ring is light from gas orbiting at relativistic speeds just outside the point of no return.",
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
    whyMatters:
      "Cygnus X-1 was the first object widely accepted as a black hole — a 21-solar-mass dark companion orbiting a blue supergiant, devouring its stellar wind through an accretion disk that shines brightly in X-rays. The 1974 Hawking-Thorne bet, where Stephen Hawking wagered that Cygnus X-1 was *not* a black hole as a 'insurance policy', is one of the most famous wagers in physics history; he conceded in 1990. It is about 7,200 light-years away.",
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
    whyMatters:
      "The Crab Pulsar is a neutron star spinning 30 times per second at the heart of the Crab Nebula — the corpse of a star that exploded in 1054 CE. It was the first pulsar firmly identified with a supernova remnant (Staelin & Reifenstein, 1968), instantly confirming the long-suspected link between core-collapse supernovae and neutron stars. Its rotation is slowly winding down, and the energy released by that spin-down powers the entire Crab Nebula's glow.",
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
    whyMatters:
      "Cassiopeia A is the youngest known supernova remnant in our galaxy — the explosion happened roughly 340 years ago, though the light's arrival appears not to have been clearly recorded (the dust along the line of sight may have hidden it). It is the brightest extrasolar radio source in the sky. JWST and Chandra have mapped its expanding debris to extraordinary detail, including molecules of titanium and iron that were forged in the explosion itself.",
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
    whyMatters:
      "Tabby's Star (KIC 8462852) caught everyone's attention in 2015 when Kepler caught it dimming by up to 22% in irregular dips no normal transit could explain — briefly fueling serious speculation about Dyson swarms or alien megastructures. Multiwavelength follow-up has since pinned the cause on uneven clouds of dust orbiting the star, not aliens, but the episode is a great example of how careful follow-up resolved a genuinely puzzling light curve.",
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
    whyMatters:
      "SN 1987A was the closest naked-eye supernova since Kepler's of 1604 — a Type II core collapse in the Large Magellanic Cloud, 168,000 light-years away. Hours before the optical light reached us, three neutrino detectors on three continents recorded a coordinated burst of around 25 neutrinos, the first direct confirmation that core-collapse supernovae are powered by neutrino emission. We have been watching the shock wave plough into a pre-existing ring of stellar material ever since.",
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
    whyMatters:
      "GW150914 was the first direct detection of gravitational waves — ripples in spacetime predicted by Einstein in 1916 and finally caught by LIGO on 14 September 2015. The signal lasted just 0.2 seconds and revealed the merger of two black holes, 36 and 29 solar masses, about 1.3 billion light-years away. The discovery won the 2017 Nobel Prize in Physics and inaugurated a completely new way to observe the universe: by listening to spacetime itself.",
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
    whyMatters:
      "'Oumuamua was the first confirmed interstellar object to pass through our solar system, spotted by Pan-STARRS in October 2017. It zipped through on a hyperbolic trajectory that no Sun-bound object could follow, gave us about two weeks of data before disappearing back into interstellar space, and behaved oddly — it accelerated slightly more than gravity alone could explain, with no visible cometary tail. Its true nature (a tumbling fragment of a dead comet? a chunk of nitrogen ice?) is still debated.",
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

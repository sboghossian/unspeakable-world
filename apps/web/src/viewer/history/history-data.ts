/**
 * Today in Space History — a date-keyed catalog of milestones across
 * the space age (1957–present) plus the foundational pre-modern
 * discoveries that made it possible. Entries are stored as
 * month / day / year so the panel can look up "what happened on this
 * calendar day" across every recorded year.
 *
 * Categories:
 *   - launch          Spacecraft / crewed vehicle lift-off.
 *   - mission-arrival Orbit insertion, flyby, landing, docking, EVA.
 *   - first           Inaugural achievement of its kind.
 *   - discovery       New body, signal, or scientific result.
 *   - milestone       Anniversaries, program transitions, deployments.
 *   - loss            Loss of crew or vehicle.
 *   - observation     Famous observations / image releases.
 *
 * Dates use the calendar in common use at the time of the event
 * (Gregorian after 1582 in the West; pre-1582 events are recorded on
 * their conventionally cited date). Editorial voice: one to two
 * sentences, factual, neutral.
 */

export type SpaceHistoryEntry = {
  id: string;
  /** Month 1-12 */
  month: number;
  /** Day 1-31 */
  day: number;
  /** Year of the event */
  year: number;
  /** What happened — 1-2 sentence summary in editorial voice */
  event: string;
  category:
    | "launch"
    | "discovery"
    | "first"
    | "mission-arrival"
    | "loss"
    | "milestone"
    | "observation";
  /** Optional link to Wikipedia / NASA / etc */
  link?: string;
};

export const SPACE_HISTORY: SpaceHistoryEntry[] = [
  // ── JANUARY ────────────────────────────────────────────────────────
  {
    id: "ceres-discovery",
    month: 1,
    day: 1,
    year: 1801,
    event:
      "Giuseppe Piazzi discovers Ceres from Palermo Observatory, the first object found in the asteroid belt and later reclassified as a dwarf planet.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Ceres_(dwarf_planet)",
  },
  {
    id: "new-horizons-arrokoth",
    month: 1,
    day: 1,
    year: 2019,
    event:
      "New Horizons performs its closest approach to Arrokoth (2014 MU69), the most distant object ever explored by a spacecraft at the time.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/feature/new-horizons-spacecraft-completes-flyby-of-kuiper-belt-object-arrokoth",
  },
  {
    id: "luna-1-launch",
    month: 1,
    day: 2,
    year: 1959,
    event:
      "The Soviet Union launches Luna 1, the first spacecraft to escape Earth's gravity and the first to fly past the Moon.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Luna_1",
  },
  {
    id: "spirit-landing",
    month: 1,
    day: 4,
    year: 2004,
    event:
      "NASA's Spirit rover bounces to a safe landing in Gusev crater, beginning the Mars Exploration Rover mission.",
    category: "mission-arrival",
    link: "https://mars.nasa.gov/mer/mission/timeline/surfaceops/",
  },
  {
    id: "galileo-moons",
    month: 1,
    day: 7,
    year: 1610,
    event:
      "Galileo Galilei first observes three of Jupiter's largest moons through his telescope; Callisto is added on January 13, completing the Galilean satellites.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Galilean_moons",
  },
  {
    id: "luna-21-launch",
    month: 1,
    day: 8,
    year: 1973,
    event:
      "Luna 21 lifts off carrying Lunokhod 2, the second successful Soviet lunar rover.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Luna_21",
  },
  {
    id: "first-exoplanets-pulsar",
    month: 1,
    day: 9,
    year: 1992,
    event:
      "Wolszczan and Frail announce the first confirmed exoplanets, two terrestrial-mass bodies orbiting pulsar PSR B1257+12.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/PSR_B1257%2B12",
  },
  {
    id: "huygens-titan-landing",
    month: 1,
    day: 14,
    year: 2005,
    event:
      "ESA's Huygens probe parachutes through Titan's haze and touches down, the first landing on a world in the outer Solar System.",
    category: "mission-arrival",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Cassini-Huygens",
  },
  {
    id: "stardust-return",
    month: 1,
    day: 15,
    year: 2006,
    event:
      "NASA's Stardust capsule lands in Utah, returning the first samples of cometary dust (from comet 81P/Wild) ever collected.",
    category: "mission-arrival",
    link: "https://stardust.jpl.nasa.gov/home/index.html",
  },
  {
    id: "columbia-launch-sts-107",
    month: 1,
    day: 16,
    year: 2003,
    event:
      "Space Shuttle Columbia launches on STS-107; foam debris strikes the left wing 82 seconds into flight.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/STS-107",
  },
  {
    id: "new-horizons-launch",
    month: 1,
    day: 19,
    year: 2006,
    event:
      "New Horizons launches from Cape Canaveral toward Pluto on an Atlas V 551, the fastest spacecraft ever to leave Earth at the time.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/newhorizons/main/index.html",
  },
  {
    id: "jwst-l2-arrival",
    month: 1,
    day: 24,
    year: 2022,
    event:
      "James Webb Space Telescope completes its 30-day cruise and inserts into a halo orbit around Sun-Earth L2.",
    category: "mission-arrival",
    link: "https://webb.nasa.gov/content/about/milestones/index.html",
  },
  {
    id: "opportunity-landing",
    month: 1,
    day: 25,
    year: 2004,
    event:
      "Opportunity lands in Meridiani Planum, beginning a 15-year mission that would far outlive its 90-sol design lifetime.",
    category: "mission-arrival",
    link: "https://mars.nasa.gov/mer/mission/timeline/surfaceops/",
  },
  {
    id: "apollo-1-fire",
    month: 1,
    day: 27,
    year: 1967,
    event:
      "Astronauts Gus Grissom, Ed White, and Roger Chaffee die in a cabin fire during a Apollo 1 plugs-out test at Launch Complex 34.",
    category: "loss",
    link: "https://www.nasa.gov/apollo1/",
  },
  {
    id: "challenger-loss",
    month: 1,
    day: 28,
    year: 1986,
    event:
      "Space Shuttle Challenger breaks apart 73 seconds after launch on STS-51-L, killing all seven crew including teacher Christa McAuliffe.",
    category: "loss",
    link: "https://www.nasa.gov/challenger/",
  },
  {
    id: "explorer-1-launch",
    month: 1,
    day: 31,
    year: 1958,
    event:
      "Explorer 1 becomes the first U.S. satellite, lofted by a Juno I; its Geiger counter would discover the Van Allen radiation belts.",
    category: "launch",
    link: "https://www.jpl.nasa.gov/missions/explorer-1",
  },
  {
    id: "apollo-14-launch",
    month: 1,
    day: 31,
    year: 1971,
    event:
      "Apollo 14 launches; Alan Shepard, Stuart Roosa, and Edgar Mitchell head for the Fra Mauro highlands.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo14.html",
  },

  // ── FEBRUARY ───────────────────────────────────────────────────────
  {
    id: "columbia-loss",
    month: 2,
    day: 1,
    year: 2003,
    event:
      "Space Shuttle Columbia disintegrates over Texas during re-entry, killing all seven STS-107 crew members.",
    category: "loss",
    link: "https://www.nasa.gov/columbia/",
  },
  {
    id: "luna-9-landing",
    month: 2,
    day: 3,
    year: 1966,
    event:
      "Luna 9 makes the first soft landing on the Moon and returns the first panoramic photos from the lunar surface.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Luna_9",
  },
  {
    id: "apollo-14-landing",
    month: 2,
    day: 5,
    year: 1971,
    event:
      "Apollo 14's Antares lands at Fra Mauro; Shepard later hits two golf balls on the lunar surface.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo14.html",
  },
  {
    id: "starman-launch",
    month: 2,
    day: 6,
    year: 2018,
    event:
      "Falcon Heavy makes its maiden flight, sending a Tesla Roadster carrying a mannequin (Starman) onto a heliocentric orbit.",
    category: "launch",
    link: "https://www.spacex.com/vehicles/falcon-heavy/",
  },
  {
    id: "ligo-announcement",
    month: 2,
    day: 11,
    year: 2016,
    event:
      "LIGO announces the first direct detection of gravitational waves — GW150914, from a binary black-hole merger observed five months earlier.",
    category: "discovery",
    link: "https://www.ligo.caltech.edu/news/ligo20160211",
  },
  {
    id: "near-eros-landing",
    month: 2,
    day: 12,
    year: 2001,
    event:
      "NEAR Shoemaker becomes the first spacecraft to land on an asteroid, touching down softly on Eros.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-008A",
  },
  {
    id: "voyager-1-pale-blue-dot",
    month: 2,
    day: 14,
    year: 1990,
    event:
      "From 6.06 billion km out, Voyager 1 turns to take its final family portrait of the Solar System, including the Pale Blue Dot image of Earth.",
    category: "observation",
    link: "https://science.nasa.gov/resource/pale-blue-dot/",
  },
  {
    id: "pluto-discovery",
    month: 2,
    day: 18,
    year: 1930,
    event:
      "Clyde Tombaugh discovers Pluto at Lowell Observatory by comparing photographic plates of the sky around Gemini.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Pluto",
  },
  {
    id: "perseverance-landing",
    month: 2,
    day: 18,
    year: 2021,
    event:
      "Perseverance lands in Jezero crater on Mars, carrying the Ingenuity helicopter and a sample-caching system for a future return mission.",
    category: "mission-arrival",
    link: "https://mars.nasa.gov/mars2020/",
  },
  {
    id: "mir-launch",
    month: 2,
    day: 19,
    year: 1986,
    event:
      "The Soviet Union launches the Mir core module, kicking off the first long-duration modular space station program.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Mir",
  },
  {
    id: "john-glenn-orbit",
    month: 2,
    day: 20,
    year: 1962,
    event:
      "John Glenn becomes the first American to orbit Earth, completing three laps in Friendship 7 during Mercury-Atlas 6.",
    category: "first",
    link: "https://www.nasa.gov/centers/glenn/about/bios/jhglennbio.html",
  },
  {
    id: "mariner-6-launch",
    month: 2,
    day: 24,
    year: 1969,
    event:
      "Mariner 6 launches from Cape Kennedy on a flyby mission to Mars.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Mariner_6_and_7",
  },
  {
    id: "kepler-launch",
    month: 3,
    day: 7,
    year: 2009,
    event:
      "NASA launches the Kepler space telescope, which will discover thousands of exoplanets by monitoring stellar brightness in Cygnus.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/kepler/main/index.html",
  },

  // ── MARCH ──────────────────────────────────────────────────────────
  {
    id: "voyager-1-jupiter-flyby",
    month: 3,
    day: 5,
    year: 1979,
    event:
      "Voyager 1 makes its closest approach to Jupiter, revealing Io's volcanism and the planet's faint ring system.",
    category: "mission-arrival",
    link: "https://voyager.jpl.nasa.gov/mission/science/jupiter/",
  },
  {
    id: "yuri-gagarin-birth",
    month: 3,
    day: 9,
    year: 1934,
    event:
      "Yuri Gagarin is born in Klushino, USSR; he would become the first human in space 27 years later.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Yuri_Gagarin",
  },
  {
    id: "hera-cruise-start",
    month: 3,
    day: 12,
    year: 2025,
    event:
      "ESA's Hera mission ends its commissioning phase and begins its cruise to the Didymos-Dimorphos asteroid system.",
    category: "milestone",
    link: "https://www.esa.int/Space_Safety/Hera",
  },
  {
    id: "uranus-discovery",
    month: 3,
    day: 13,
    year: 1781,
    event:
      "William Herschel discovers Uranus from his garden in Bath, England — the first planet found since antiquity and the first found with a telescope.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Uranus",
  },
  {
    id: "messenger-mercury-orbit-insertion",
    month: 3,
    day: 17,
    year: 2011,
    event:
      "MESSENGER becomes the first spacecraft to orbit Mercury, beginning a four-year survey of the innermost planet.",
    category: "mission-arrival",
    link: "https://messenger.jhuapl.edu/",
  },
  {
    id: "first-spacewalk",
    month: 3,
    day: 18,
    year: 1965,
    event:
      "Alexei Leonov performs the first spacewalk, spending 12 minutes outside Voskhod 2 before barely fitting back through the airlock.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Voskhod_2",
  },
  {
    id: "salyut-1-launch",
    month: 4,
    day: 19,
    year: 1971,
    event:
      "The Soviet Union launches Salyut 1, the world's first space station, on a Proton rocket.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Salyut_1",
  },

  // ── APRIL ──────────────────────────────────────────────────────────
  {
    id: "first-image-black-hole",
    month: 4,
    day: 10,
    year: 2019,
    event:
      "The Event Horizon Telescope releases the first image of a black hole's shadow — the supermassive M87*, in the heart of Messier 87.",
    category: "observation",
    link: "https://eventhorizontelescope.org/blog/astronomers-capture-first-image-black-hole",
  },
  {
    id: "yuri-gagarin-vostok-1",
    month: 4,
    day: 12,
    year: 1961,
    event:
      "Yuri Gagarin orbits Earth once aboard Vostok 1, becoming the first human in space; the date is celebrated as Cosmonautics Day.",
    category: "first",
    link: "https://www.esa.int/About_Us/ESA_history/50_years_of_humans_in_space",
  },
  {
    id: "sts-1-launch",
    month: 4,
    day: 12,
    year: 1981,
    event:
      "Twenty years after Gagarin, Space Shuttle Columbia roars off Pad 39A on STS-1, the first orbital flight of a reusable spaceplane.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/shuttle/shuttlemissions/archives/sts-1.html",
  },
  {
    id: "apollo-13-launch",
    month: 4,
    day: 11,
    year: 1970,
    event:
      "Apollo 13 launches toward the Moon; an oxygen tank rupture two days later turns the mission into a successful rescue rather than a landing.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo13.html",
  },
  {
    id: "apollo-13-oxygen-tank",
    month: 4,
    day: 13,
    year: 1970,
    event:
      "An oxygen tank ruptures in Apollo 13's service module 56 hours into the flight; the crew uses the lunar module as a lifeboat for the return.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo13.html",
  },
  {
    id: "apollo-16-launch",
    month: 4,
    day: 16,
    year: 1972,
    event:
      "Apollo 16 lifts off for the Descartes Highlands with John Young, Charlie Duke, and Ken Mattingly.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo16.html",
  },
  {
    id: "ingenuity-first-flight",
    month: 4,
    day: 19,
    year: 2021,
    event:
      "Ingenuity becomes the first aircraft to make a powered, controlled flight on another world, hovering 3 m above Jezero crater.",
    category: "first",
    link: "https://mars.nasa.gov/technology/helicopter/",
  },
  {
    id: "apollo-16-landing",
    month: 4,
    day: 20,
    year: 1972,
    event:
      "Apollo 16's Orion lunar module lands at Descartes; Young and Duke spend three days exploring the highlands.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo16.html",
  },
  {
    id: "hubble-launch",
    month: 4,
    day: 24,
    year: 1990,
    event:
      "Space Shuttle Discovery launches the Hubble Space Telescope into low Earth orbit on STS-31.",
    category: "launch",
    link: "https://hubblesite.org/mission-and-telescope/the-telescope/hubble-history",
  },
  {
    id: "hubble-deployment",
    month: 4,
    day: 25,
    year: 1990,
    event:
      "Astronauts on STS-31 deploy Hubble from Discovery's payload bay, beginning more than three decades of optical-UV observations.",
    category: "first",
    link: "https://hubblesite.org/mission-and-telescope/the-telescope/hubble-history",
  },
  {
    id: "soyuz-1-loss",
    month: 4,
    day: 24,
    year: 1967,
    event:
      "Vladimir Komarov dies when Soyuz 1's parachute fails to deploy; the first in-flight fatality of a spaceflight.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Soyuz_1",
  },

  // ── MAY ────────────────────────────────────────────────────────────
  {
    id: "alan-shepard-mercury",
    month: 5,
    day: 5,
    year: 1961,
    event:
      "Alan Shepard becomes the first American in space aboard Freedom 7, a 15-minute suborbital hop on a Mercury-Redstone rocket.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/mercury/missions/freedom7.html",
  },
  {
    id: "adler-planetarium-opens",
    month: 5,
    day: 12,
    year: 1930,
    event:
      "The Adler Planetarium opens in Chicago, the first modern planetarium in the Western Hemisphere.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Adler_Planetarium",
  },
  {
    id: "luna-5-impact",
    month: 5,
    day: 12,
    year: 1965,
    event:
      "Soviet Luna 5 crashes into the Sea of Clouds after its retro-rocket fails, missing a chance to be the first soft lunar landing.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Luna_5",
  },
  {
    id: "sgr-a-image",
    month: 5,
    day: 12,
    year: 2022,
    event:
      "The Event Horizon Telescope releases the first image of Sagittarius A*, the supermassive black hole at the centre of our own galaxy.",
    category: "observation",
    link: "https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy",
  },
  {
    id: "skylab-launch",
    month: 5,
    day: 14,
    year: 1973,
    event:
      "NASA launches Skylab, the first American space station, atop the final flight of a Saturn V.",
    category: "launch",
    link: "https://www.nasa.gov/skylab/",
  },
  {
    id: "hubble-first-light",
    month: 5,
    day: 20,
    year: 1990,
    event:
      "Hubble's 'first light' captures the open cluster NGC 3532, revealing spherical aberration in its primary mirror that would be corrected in 1993.",
    category: "observation",
    link: "https://www.nasa.gov/feature/goddard/2020/hubble-s-first-light-image",
  },
  {
    id: "spacex-dragon-iss",
    month: 5,
    day: 25,
    year: 2012,
    event:
      "Dragon C2+ becomes the first commercial spacecraft to dock with the International Space Station, opening the cargo era of private spaceflight.",
    category: "first",
    link: "https://www.spacex.com/updates/",
  },
  {
    id: "crew-dragon-demo-2",
    month: 5,
    day: 30,
    year: 2020,
    event:
      "Bob Behnken and Doug Hurley launch on Crew Dragon Demo-2, the first crewed flight from U.S. soil since the Shuttle was retired in 2011.",
    category: "first",
    link: "https://www.nasa.gov/specials/dm2/",
  },

  // ── JUNE ───────────────────────────────────────────────────────────
  {
    id: "falcon-9-first-flight",
    month: 6,
    day: 4,
    year: 2010,
    event:
      "SpaceX's Falcon 9 successfully reaches orbit on its maiden flight from Cape Canaveral.",
    category: "launch",
    link: "https://www.spacex.com/vehicles/falcon-9/",
  },
  {
    id: "valentina-tereshkova",
    month: 6,
    day: 16,
    year: 1963,
    event:
      "Valentina Tereshkova launches aboard Vostok 6, becoming the first woman in space; she orbits Earth 48 times.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Valentina_Tereshkova",
  },
  {
    id: "sally-ride-sts-7",
    month: 6,
    day: 18,
    year: 1983,
    event:
      "Sally Ride becomes the first American woman in space on STS-7 aboard Challenger.",
    category: "first",
    link: "https://www.nasa.gov/feature/sally-ride-astronaut/",
  },
  {
    id: "spaceshipone-burst",
    month: 6,
    day: 21,
    year: 2004,
    event:
      "SpaceShipOne becomes the first privately funded crewed vehicle to cross the Kármán line, piloted by Mike Melvill.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/SpaceShipOne",
  },
  {
    id: "tunguska-event",
    month: 6,
    day: 30,
    year: 1908,
    event:
      "An asteroid or comet airbursts above the Stony Tunguska River, flattening 2,000 square kilometres of Siberian forest in the largest impact event of modern history.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Tunguska_event",
  },

  // ── JULY ───────────────────────────────────────────────────────────
  {
    id: "cassini-saturn-arrival",
    month: 7,
    day: 1,
    year: 2004,
    event:
      "Cassini fires its main engine for 96 minutes and slips into orbit around Saturn, beginning a 13-year tour of the ringed planet and its moons.",
    category: "mission-arrival",
    link: "https://solarsystem.nasa.gov/missions/cassini/overview/",
  },
  {
    id: "mariner-4-flyby",
    month: 7,
    day: 4,
    year: 1965,
    event:
      "Mariner 4 returns the first close-up images of Mars during a 9,846 km flyby — a cratered, Moon-like surface that defied expectations.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A",
  },
  {
    id: "crab-supernova",
    month: 7,
    day: 4,
    year: 1054,
    event:
      "Chinese and Arab astronomers record a 'guest star' in Taurus bright enough to be seen in daylight; we now identify its remnant as the Crab Nebula.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/SN_1054",
  },
  {
    id: "sojourner-landing",
    month: 7,
    day: 4,
    year: 1997,
    event:
      "Mars Pathfinder lands at Ares Vallis and deploys the Sojourner rover, the first wheeled vehicle to operate on another planet.",
    category: "first",
    link: "https://mars.nasa.gov/MPF/index1.html",
  },
  {
    id: "deep-impact-tempel",
    month: 7,
    day: 4,
    year: 2005,
    event:
      "Deep Impact's 370 kg copper impactor slams into comet 9P/Tempel 1, excavating a crater and giving the flyby spacecraft its first look inside a cometary nucleus.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/deepimpact/main/",
  },
  {
    id: "jwst-first-images",
    month: 7,
    day: 12,
    year: 2022,
    event:
      "NASA, ESA and CSA release Webb's first science-quality images, including the deepest infrared view of the universe ever captured.",
    category: "observation",
    link: "https://webb.nasa.gov/content/news/firstImages.html",
  },
  {
    id: "new-horizons-pluto",
    month: 7,
    day: 14,
    year: 2015,
    event:
      "New Horizons flies 12,500 km above Pluto, revealing the heart-shaped Tombaugh Regio, towering nitrogen-ice mountains, and a thin haze of atmosphere.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/feature/new-horizons-spacecraft-completes-flyby-of-pluto",
  },
  {
    id: "apollo-11-launch",
    month: 7,
    day: 16,
    year: 1969,
    event:
      "Apollo 11 lifts off from Pad 39A on a Saturn V; Armstrong, Aldrin, and Collins begin a four-day cruise to the Moon.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo11.html",
  },
  {
    id: "shoemaker-levy-9-impact",
    month: 7,
    day: 16,
    year: 1994,
    event:
      "The first fragment of comet Shoemaker-Levy 9 slams into Jupiter at 60 km/s; over six days, 21 fragments produce visible scars on the planet.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Comet_Shoemaker%E2%80%93Levy_9",
  },
  {
    id: "apollo-soyuz-dock",
    month: 7,
    day: 17,
    year: 1975,
    event:
      "Apollo and Soyuz spacecraft dock in orbit; Stafford and Leonov shake hands in the docking tunnel, marking the first international crewed mission.",
    category: "first",
    link: "https://www.nasa.gov/feature/apollo-soyuz",
  },
  {
    id: "apollo-11-moon-landing",
    month: 7,
    day: 20,
    year: 1969,
    event:
      "Neil Armstrong and Buzz Aldrin land in the Sea of Tranquillity aboard Eagle; six and a half hours later, Armstrong steps onto the Moon.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo11.html",
  },
  {
    id: "apollo-11-eva",
    month: 7,
    day: 21,
    year: 1969,
    event:
      "Buzz Aldrin joins Armstrong on the lunar surface; the pair collect 21.55 kg of rock and soil during a 2-hour 31-minute moonwalk.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo11.html",
  },
  {
    id: "apollo-11-splashdown",
    month: 7,
    day: 24,
    year: 1969,
    event:
      "Apollo 11 splashes down in the Pacific Ocean, completing humanity's first round trip to the surface of another world.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo11.html",
  },
  {
    id: "apollo-15-launch",
    month: 7,
    day: 26,
    year: 1971,
    event:
      "Apollo 15 launches; the first 'J-mission' carries a lunar roving vehicle for extended exploration of Hadley Rille.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo15.html",
  },
  {
    id: "apollo-15-landing",
    month: 7,
    day: 30,
    year: 1971,
    event:
      "Apollo 15's Falcon lands at Hadley-Apennine; Scott and Irwin drive 28 km in the first lunar rover.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo15.html",
  },

  // ── AUGUST ─────────────────────────────────────────────────────────
  {
    id: "grail-launch",
    month: 9,
    day: 10,
    year: 2011,
    event:
      "GRAIL launches a pair of probes to map the Moon's gravity field at unprecedented resolution.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/grail/main/index.html",
  },
  {
    id: "curiosity-landing",
    month: 8,
    day: 6,
    year: 2012,
    event:
      "Curiosity executes the 'seven minutes of terror' sky-crane landing in Gale crater, beginning a long-term geological survey of Mount Sharp.",
    category: "mission-arrival",
    link: "https://mars.nasa.gov/msl/home/",
  },
  {
    id: "parker-solar-probe-launch",
    month: 8,
    day: 12,
    year: 2018,
    event:
      "Parker Solar Probe launches on a Delta IV Heavy, beginning a seven-year sequence of Venus flybys that will lower its perihelion into the Sun's corona.",
    category: "launch",
    link: "https://parkersolarprobe.jhuapl.edu/",
  },
  {
    id: "voyager-2-launch",
    month: 8,
    day: 20,
    year: 1977,
    event:
      "Voyager 2 launches on a Titan IIIE — the first of the Voyager pair, on the slower 'Grand Tour' trajectory that will reach all four giant planets.",
    category: "launch",
    link: "https://voyager.jpl.nasa.gov/",
  },
  {
    id: "voyager-2-neptune",
    month: 8,
    day: 25,
    year: 1989,
    event:
      "Voyager 2 makes its closest approach to Neptune, revealing the Great Dark Spot and the geysers of Triton during humanity's first and only flyby of the planet.",
    category: "mission-arrival",
    link: "https://voyager.jpl.nasa.gov/mission/science/neptune/",
  },
  {
    id: "voyager-1-interstellar",
    month: 8,
    day: 25,
    year: 2012,
    event:
      "Voyager 1 crosses the heliopause and becomes the first spacecraft to enter interstellar space, as confirmed by plasma measurements a year later.",
    category: "first",
    link: "https://voyager.jpl.nasa.gov/news/details.php?article_id=23",
  },

  // ── SEPTEMBER ──────────────────────────────────────────────────────
  {
    id: "viking-2-mars-landing",
    month: 9,
    day: 3,
    year: 1976,
    event:
      "Viking 2 lands in Utopia Planitia and joins Viking 1 in performing the first life-detection experiments on the surface of another planet.",
    category: "mission-arrival",
    link: "https://nssdc.gsfc.nasa.gov/planetary/viking.html",
  },
  {
    id: "voyager-1-launch",
    month: 9,
    day: 5,
    year: 1977,
    event:
      "Voyager 1 launches on a Titan IIIE, on a faster trajectory than its twin; it will become the most distant human-made object.",
    category: "launch",
    link: "https://voyager.jpl.nasa.gov/",
  },
  {
    id: "k2-18b-dms-claim",
    month: 9,
    day: 11,
    year: 2023,
    event:
      "A JWST team reports a tentative detection of dimethyl sulfide in the atmosphere of K2-18 b, a sub-Neptune in its star's habitable zone.",
    category: "discovery",
    link: "https://www.nasa.gov/feature/goddard/2023/webb-discovers-methane-carbon-dioxide-in-atmosphere-of-k2-18-b",
  },
  {
    id: "gw150914-detection",
    month: 9,
    day: 14,
    year: 2015,
    event:
      "LIGO's Hanford and Livingston detectors record GW150914, the first direct observation of gravitational waves, from a 1.3 billion-year-old black-hole merger.",
    category: "discovery",
    link: "https://www.ligo.caltech.edu/page/gw150914",
  },
  {
    id: "cassini-grand-finale",
    month: 9,
    day: 15,
    year: 2017,
    event:
      "Cassini plunges into Saturn's atmosphere at 122,000 km/h, ending a 20-year mission rather than risk contaminating Enceladus or Titan.",
    category: "milestone",
    link: "https://solarsystem.nasa.gov/missions/cassini/the-journey/the-grand-finale/",
  },
  {
    id: "neptune-discovery",
    month: 9,
    day: 23,
    year: 1846,
    event:
      "Johann Galle finds Neptune within one degree of the position predicted by Le Verrier — the first planet discovered by mathematical prediction.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Neptune",
  },
  {
    id: "dart-impact",
    month: 9,
    day: 26,
    year: 2022,
    event:
      "DART crashes into Dimorphos at 6.1 km/s, successfully shortening the asteroid's orbit around Didymos by 33 minutes — the first planetary-defence demonstration.",
    category: "first",
    link: "https://www.nasa.gov/planetarydefense/dart",
  },
  {
    id: "osiris-rex-return",
    month: 9,
    day: 24,
    year: 2023,
    event:
      "The OSIRIS-REx sample-return capsule lands in the Utah desert, delivering 121 g of pristine material from asteroid Bennu.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/osiris-rex/",
  },

  // ── OCTOBER ────────────────────────────────────────────────────────
  {
    id: "sputnik-1-launch",
    month: 10,
    day: 4,
    year: 1957,
    event:
      "The Soviet Union launches Sputnik 1, the first artificial satellite, on an R-7 rocket; its beeping radio signal opens the Space Age.",
    category: "first",
    link: "https://www.nasa.gov/sputnik/",
  },
  {
    id: "51-pegasi-b-discovery",
    month: 10,
    day: 6,
    year: 1995,
    event:
      "Michel Mayor and Didier Queloz announce 51 Pegasi b, the first confirmed planet orbiting a Sun-like star — a 'hot Jupiter' that rewrote planet-formation theory.",
    category: "discovery",
    link: "https://exoplanets.nasa.gov/resources/2342/51-pegasi-b-the-discovery-of-a-new-world/",
  },
  {
    id: "luna-3-far-side",
    month: 10,
    day: 7,
    year: 1959,
    event:
      "Luna 3 returns the first photographs of the far side of the Moon, revealing a surface much more heavily cratered than the near side.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1959-008A",
  },
  {
    id: "cassini-huygens-launch",
    month: 10,
    day: 15,
    year: 1997,
    event:
      "Cassini-Huygens launches on a Titan IVB toward Saturn on a seven-year cruise via two Venus, one Earth, and one Jupiter flyby.",
    category: "launch",
    link: "https://solarsystem.nasa.gov/missions/cassini/overview/",
  },
  {
    id: "oumuamua-discovery",
    month: 10,
    day: 19,
    year: 2017,
    event:
      "Pan-STARRS discovers 1I/'Oumuamua, the first known interstellar object passing through the Solar System.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/%CA%BBOumuamua",
  },
  {
    id: "osiris-rex-tag",
    month: 10,
    day: 20,
    year: 2020,
    event:
      "OSIRIS-REx briefly touches Bennu's surface with its TAGSAM head and collects more than half a kilogram of regolith.",
    category: "first",
    link: "https://www.nasa.gov/osiris-rex/",
  },
  {
    id: "first-photo-earth-from-space",
    month: 10,
    day: 24,
    year: 1946,
    event:
      "A V-2 launched from White Sands carries a 35-mm DeVry cine camera above the Kármán line, returning the first photographs of Earth from space.",
    category: "first",
    link: "https://airandspace.si.edu/stories/editorial/earth-space",
  },
  {
    id: "discovery-pulsar",
    month: 10,
    day: 28,
    year: 1971,
    event:
      "Mariner 9 enters orbit around Mars, becoming the first spacecraft to orbit another planet.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-051A",
  },

  // ── NOVEMBER ───────────────────────────────────────────────────────
  {
    id: "laika-launch",
    month: 11,
    day: 3,
    year: 1957,
    event:
      "Sputnik 2 launches with Laika aboard, the first living creature to orbit Earth; she dies within hours from overheating.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Laika",
  },
  {
    id: "mariner-9-orbit",
    month: 11,
    day: 13,
    year: 1971,
    event:
      "Mariner 9 enters orbit around Mars — the first spacecraft to orbit another planet — and waits out a global dust storm before mapping the surface.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-051A",
  },
  {
    id: "voyager-1-saturn",
    month: 11,
    day: 12,
    year: 1980,
    event:
      "Voyager 1 makes its closest approach to Saturn, returning the first detailed images of its rings, Titan's haze, and the moon Mimas.",
    category: "mission-arrival",
    link: "https://voyager.jpl.nasa.gov/mission/science/saturn/",
  },
  {
    id: "zarya-launch",
    month: 11,
    day: 20,
    year: 1998,
    event:
      "Zarya, the first ISS module, launches on a Proton rocket from Baikonur and begins station assembly in low Earth orbit.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/station/structure/elements/zarya.html",
  },
  {
    id: "iss-continuous-occupation",
    month: 11,
    day: 2,
    year: 2000,
    event:
      "Expedition 1 crew Bill Shepherd, Yuri Gidzenko, and Sergei Krikalev arrive aboard Soyuz TM-31, beginning continuous human presence in low Earth orbit.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/station/expeditions/expedition01/",
  },
  {
    id: "philae-landing",
    month: 11,
    day: 12,
    year: 2014,
    event:
      "Rosetta's Philae lander touches down on comet 67P/Churyumov-Gerasimenko, the first soft landing on a cometary nucleus, though its harpoons fail to anchor.",
    category: "first",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Rosetta",
  },

  // ── DECEMBER ───────────────────────────────────────────────────────
  {
    id: "deep-space-1-launch",
    month: 12,
    day: 2,
    year: 1971,
    event:
      "Mars 3 makes the first successful soft landing on Mars, though contact is lost after 14.5 seconds.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Mars_3",
  },
  {
    id: "pioneer-10-jupiter",
    month: 12,
    day: 3,
    year: 1973,
    event:
      "Pioneer 10 makes the first flyby of Jupiter, returning the first close images and characterizing the planet's radiation environment.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-012A",
  },
  {
    id: "hst-first-servicing",
    month: 12,
    day: 2,
    year: 1993,
    event:
      "STS-61 launches; over five spacewalks the crew installs WFPC2 and the COSTAR corrective optics, restoring Hubble's vision after the mirror flaw.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/hubble/servicing/SM1/main.html",
  },
  {
    id: "hst-first-servicing-complete",
    month: 12,
    day: 7,
    year: 1993,
    event:
      "STS-61 astronauts complete the first Hubble servicing mission and release the telescope back to orbit with corrective optics installed.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/hubble/servicing/SM1/main.html",
  },
  {
    id: "apollo-17-launch",
    month: 12,
    day: 7,
    year: 1972,
    event:
      "Apollo 17 launches at night from Pad 39A, carrying the last Apollo crew and Jack Schmitt — the only geologist to walk on the Moon.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo17.html",
  },
  {
    id: "apollo-17-landing",
    month: 12,
    day: 11,
    year: 1972,
    event:
      "Apollo 17 lands in the Taurus-Littrow valley; Cernan and Schmitt spend three days exploring and become the last humans to walk on the Moon to date.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo17.html",
  },
  {
    id: "apollo-8-launch",
    month: 12,
    day: 21,
    year: 1968,
    event:
      "Apollo 8 launches on the third Saturn V; Borman, Lovell and Anders will become the first humans to leave low Earth orbit and orbit the Moon.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo8.html",
  },
  {
    id: "spacex-orbcomm-landing",
    month: 12,
    day: 21,
    year: 2015,
    event:
      "Falcon 9 delivers Orbcomm satellites to orbit and lands its first stage at Cape Canaveral, the first vertical recovery of an orbital-class booster.",
    category: "first",
    link: "https://www.spacex.com/vehicles/falcon-9/",
  },
  {
    id: "apollo-8-lunar-orbit",
    month: 12,
    day: 24,
    year: 1968,
    event:
      "Apollo 8 enters lunar orbit on Christmas Eve; Anders photographs Earthrise during the third orbit and the crew reads from Genesis to a live TV audience.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo8.html",
  },
  {
    id: "jwst-launch",
    month: 12,
    day: 25,
    year: 2021,
    event:
      "James Webb Space Telescope launches aboard an Ariane 5 from Kourou — the largest, most sensitive space observatory ever built begins its month-long deployment.",
    category: "launch",
    link: "https://webb.nasa.gov/",
  },
  {
    id: "apollo-8-return",
    month: 12,
    day: 27,
    year: 1968,
    event:
      "Apollo 8 splashes down in the Pacific after the first round trip from Earth to the Moon and back.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo8.html",
  },

  // ── ADDITIONAL ENTRIES ─────────────────────────────────────────────
  // (Filling out the calendar with more verified milestones.)
  {
    id: "tess-launch",
    month: 4,
    day: 18,
    year: 2018,
    event:
      "TESS launches on a Falcon 9 to begin an all-sky survey for transiting exoplanets around nearby bright stars.",
    category: "launch",
    link: "https://tess.mit.edu/",
  },
  {
    id: "lunar-prospector-launch",
    month: 1,
    day: 7,
    year: 1998,
    event:
      "Lunar Prospector launches to map the Moon's composition and hunt for water ice at the poles, the first NASA Discovery mission.",
    category: "launch",
    link: "https://nssdc.gsfc.nasa.gov/planetary/lunarprosp.html",
  },
  {
    id: "spirit-launch",
    month: 6,
    day: 10,
    year: 2003,
    event:
      "Spirit (MER-A) launches on a Delta II toward Mars at the start of the Mars Exploration Rover programme.",
    category: "launch",
    link: "https://mars.nasa.gov/mer/overview/",
  },
  {
    id: "opportunity-launch",
    month: 7,
    day: 7,
    year: 2003,
    event:
      "Opportunity (MER-B) launches toward Mars, the second rover of the Mars Exploration Rover programme.",
    category: "launch",
    link: "https://mars.nasa.gov/mer/overview/",
  },
  {
    id: "curiosity-launch",
    month: 11,
    day: 26,
    year: 2011,
    event:
      "Mars Science Laboratory launches on an Atlas V from Cape Canaveral with the Curiosity rover bound for Gale crater.",
    category: "launch",
    link: "https://mars.nasa.gov/msl/home/",
  },
  {
    id: "perseverance-launch",
    month: 7,
    day: 30,
    year: 2020,
    event:
      "Mars 2020 launches; the Perseverance rover and the Ingenuity helicopter begin a seven-month cruise to Jezero crater.",
    category: "launch",
    link: "https://mars.nasa.gov/mars2020/",
  },
  {
    id: "mars-express-launch",
    month: 6,
    day: 2,
    year: 2003,
    event:
      "ESA's Mars Express launches on a Soyuz-Fregat with the Beagle 2 lander; the orbiter is still active two decades later.",
    category: "launch",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Mars_Express",
  },
  {
    id: "phoenix-landing",
    month: 5,
    day: 25,
    year: 2008,
    event:
      "Phoenix touches down near Mars' north pole and confirms the presence of subsurface water ice within days of landing.",
    category: "mission-arrival",
    link: "https://nasa.gov/mission_pages/phoenix/",
  },
  {
    id: "insight-landing",
    month: 11,
    day: 26,
    year: 2018,
    event:
      "InSight lands in Elysium Planitia to deploy a seismometer and heat probe, opening the era of Mars geophysics.",
    category: "mission-arrival",
    link: "https://mars.nasa.gov/insight/",
  },
  {
    id: "chang-e-3-landing",
    month: 12,
    day: 14,
    year: 2013,
    event:
      "China's Chang'e 3 lander and the Yutu rover touch down in Mare Imbrium, the first soft lunar landing since 1976.",
    category: "mission-arrival",
    link: "https://en.wikipedia.org/wiki/Chang%27e_3",
  },
  {
    id: "chang-e-4-landing",
    month: 1,
    day: 3,
    year: 2019,
    event:
      "Chang'e 4 lands in Von Kármán crater, the first soft landing on the far side of the Moon, with the Queqiao relay satellite providing comms.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Chang%27e_4",
  },
  {
    id: "chang-e-5-sample-return",
    month: 12,
    day: 16,
    year: 2020,
    event:
      "Chang'e 5's return capsule lands in Inner Mongolia, delivering the first lunar samples returned to Earth since Luna 24 in 1976.",
    category: "mission-arrival",
    link: "https://en.wikipedia.org/wiki/Chang%27e_5",
  },
  {
    id: "tiangong-1-launch",
    month: 9,
    day: 29,
    year: 2011,
    event:
      "China launches Tiangong-1, the country's first space station prototype, demonstrating rendezvous and docking with Shenzhou crews.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Tiangong-1",
  },
  {
    id: "tianhe-launch",
    month: 4,
    day: 29,
    year: 2021,
    event:
      "Tianhe, the core module of China's Tiangong space station, launches on a Long March 5B from Wenchang.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Tianhe_core_module",
  },
  {
    id: "shenzhou-5",
    month: 10,
    day: 15,
    year: 2003,
    event:
      "Yang Liwei becomes the first Chinese astronaut in space aboard Shenzhou 5, completing 14 orbits before returning to Earth.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Shenzhou_5",
  },
  {
    id: "ed-white-eva",
    month: 6,
    day: 3,
    year: 1965,
    event:
      "Ed White becomes the first American to walk in space, spending 23 minutes outside Gemini 4.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/gemini/missions/gemini-iv.html",
  },
  {
    id: "soyuz-11-loss",
    month: 6,
    day: 30,
    year: 1971,
    event:
      "Soyuz 11 cosmonauts Dobrovolski, Volkov and Patsayev die when a valve opens during re-entry, the only deaths to have occurred in space.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Soyuz_11",
  },
  {
    id: "rosetta-launch-real",
    month: 3,
    day: 2,
    year: 2004,
    event:
      "ESA launches Rosetta on an Ariane 5 toward comet 67P/Churyumov-Gerasimenko on a ten-year cruise via three Earth flybys.",
    category: "launch",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Rosetta",
  },
  {
    id: "rosetta-arrival",
    month: 8,
    day: 6,
    year: 2014,
    event:
      "Rosetta becomes the first spacecraft to enter orbit around a comet, settling into a complex trajectory around 67P/Churyumov-Gerasimenko.",
    category: "first",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Rosetta",
  },
  {
    id: "dawn-vesta-arrival",
    month: 7,
    day: 16,
    year: 2011,
    event:
      "Dawn enters orbit around Vesta, the first spacecraft to orbit a body in the main asteroid belt.",
    category: "first",
    link: "https://solarsystem.nasa.gov/missions/dawn/overview/",
  },
  {
    id: "dawn-ceres-arrival",
    month: 3,
    day: 6,
    year: 2015,
    event:
      "Dawn arrives at Ceres, becoming the first spacecraft to orbit two extraterrestrial bodies and the first to orbit a dwarf planet.",
    category: "first",
    link: "https://solarsystem.nasa.gov/missions/dawn/overview/",
  },
  {
    id: "akatsuki-venus-arrival",
    month: 12,
    day: 7,
    year: 2015,
    event:
      "JAXA's Akatsuki successfully enters orbit around Venus on its second attempt, five years after a failed first insertion.",
    category: "mission-arrival",
    link: "https://akatsuki.isas.jaxa.jp/en/",
  },
  {
    id: "hayabusa-itokawa-return",
    month: 6,
    day: 13,
    year: 2010,
    event:
      "JAXA's Hayabusa returns the first asteroid samples to Earth, dropping a capsule of Itokawa dust grains in the Australian outback.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Hayabusa",
  },
  {
    id: "hayabusa2-ryugu-arrival",
    month: 6,
    day: 27,
    year: 2018,
    event:
      "Hayabusa2 rendezvouses with asteroid Ryugu after a three-and-a-half-year cruise, beginning a 17-month survey.",
    category: "mission-arrival",
    link: "https://www.hayabusa2.jaxa.jp/en/",
  },
  {
    id: "hayabusa2-return",
    month: 12,
    day: 6,
    year: 2020,
    event:
      "Hayabusa2 delivers its Ryugu sample capsule to the Woomera test range in Australia, the first sub-surface asteroid samples ever returned.",
    category: "mission-arrival",
    link: "https://www.hayabusa2.jaxa.jp/en/",
  },
  {
    id: "mars-2-launch",
    month: 5,
    day: 19,
    year: 1971,
    event:
      "The Soviet Union launches Mars 2 toward Mars; its lander would crash but the orbiter becomes the first human artifact to reach the surface.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Mars_2",
  },
  {
    id: "venera-7-landing",
    month: 12,
    day: 15,
    year: 1970,
    event:
      "Venera 7 transmits 23 minutes from the surface of Venus, the first soft landing on another planet to return data.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Venera_7",
  },
  {
    id: "venera-9-surface-image",
    month: 10,
    day: 22,
    year: 1975,
    event:
      "Venera 9 transmits the first photograph from the surface of another planet, a 180-degree panorama of Venus.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Venera_9",
  },
  {
    id: "magellan-launch",
    month: 5,
    day: 4,
    year: 1989,
    event:
      "Space Shuttle Atlantis deploys Magellan on STS-30; the spacecraft will radar-map 98% of Venus' surface over four years.",
    category: "launch",
    link: "https://www2.jpl.nasa.gov/magellan/",
  },
  {
    id: "galileo-launch",
    month: 10,
    day: 18,
    year: 1989,
    event:
      "Atlantis releases Galileo on STS-34, beginning a six-year cruise to Jupiter via Venus and two Earth gravity assists.",
    category: "launch",
    link: "https://solarsystem.nasa.gov/missions/galileo/overview/",
  },
  {
    id: "galileo-jupiter-arrival",
    month: 12,
    day: 7,
    year: 1995,
    event:
      "Galileo enters Jupiter orbit and drops an atmospheric probe; the probe transmits 58 minutes of data before being crushed.",
    category: "mission-arrival",
    link: "https://solarsystem.nasa.gov/missions/galileo/overview/",
  },
  {
    id: "juno-launch",
    month: 8,
    day: 5,
    year: 2011,
    event:
      "Juno launches on an Atlas V toward Jupiter to map its gravity, magnetic field, and polar auroras from a highly elliptical orbit.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/juno/main/index.html",
  },
  {
    id: "juno-jupiter-arrival",
    month: 7,
    day: 4,
    year: 2016,
    event:
      "Juno enters polar orbit around Jupiter after a 35-minute engine burn, beginning a multi-year survey of the planet's interior and aurora.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/juno/main/index.html",
  },
  {
    id: "europa-clipper-launch",
    month: 10,
    day: 14,
    year: 2024,
    event:
      "Europa Clipper launches on a Falcon Heavy, beginning a five-and-a-half-year cruise to Jupiter's icy moon to assess its habitability.",
    category: "launch",
    link: "https://europa.nasa.gov/",
  },
  {
    id: "juice-launch",
    month: 4,
    day: 14,
    year: 2023,
    event:
      "ESA's JUICE launches on an Ariane 5 toward Jupiter to characterize the ocean worlds Ganymede, Callisto, and Europa over an 8-year mission.",
    category: "launch",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Juice",
  },
  {
    id: "psyche-launch",
    month: 10,
    day: 13,
    year: 2023,
    event:
      "Psyche launches on a Falcon Heavy toward the metallic asteroid 16 Psyche, expected to arrive in 2029.",
    category: "launch",
    link: "https://psyche.asu.edu/",
  },
  {
    id: "lucy-launch",
    month: 10,
    day: 16,
    year: 2021,
    event:
      "Lucy launches on an Atlas V toward Jupiter's Trojan asteroids on a 12-year tour past eight different worlds.",
    category: "launch",
    link: "https://lucy.swri.edu/",
  },
  {
    id: "lucy-dinkinesh",
    month: 11,
    day: 1,
    year: 2023,
    event:
      "Lucy flies past asteroid Dinkinesh and discovers it has a contact-binary moonlet, later named Selam.",
    category: "discovery",
    link: "https://lucy.swri.edu/",
  },
  {
    id: "spitzer-launch",
    month: 8,
    day: 25,
    year: 2003,
    event:
      "Spitzer Space Telescope launches on a Delta II from Cape Canaveral, the infrared cornerstone of NASA's Great Observatories.",
    category: "launch",
    link: "https://www.spitzer.caltech.edu/",
  },
  {
    id: "chandra-launch",
    month: 7,
    day: 23,
    year: 1999,
    event:
      "Space Shuttle Columbia deploys the Chandra X-ray Observatory on STS-93, with Eileen Collins commanding as the first female shuttle commander.",
    category: "launch",
    link: "https://chandra.harvard.edu/",
  },
  {
    id: "swift-launch",
    month: 11,
    day: 20,
    year: 2004,
    event:
      "Swift launches on a Delta II to locate and study gamma-ray bursts within seconds of their detection.",
    category: "launch",
    link: "https://swift.gsfc.nasa.gov/",
  },
  {
    id: "fermi-launch",
    month: 6,
    day: 11,
    year: 2008,
    event:
      "Fermi Gamma-ray Space Telescope launches on a Delta II, opening the high-energy sky to surveys of pulsars, blazars, and dark-matter searches.",
    category: "launch",
    link: "https://fermi.gsfc.nasa.gov/",
  },
  {
    id: "iras-launch",
    month: 1,
    day: 25,
    year: 1983,
    event:
      "IRAS launches on a Delta and conducts the first all-sky infrared survey, discovering hundreds of thousands of new sources.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Infrared_Astronomical_Satellite",
  },
  {
    id: "wmap-launch",
    month: 6,
    day: 30,
    year: 2001,
    event:
      "WMAP launches on a Delta II to map the cosmic microwave background and pin down cosmological parameters at unprecedented precision.",
    category: "launch",
    link: "https://map.gsfc.nasa.gov/",
  },
  {
    id: "planck-launch",
    month: 5,
    day: 14,
    year: 2009,
    event:
      "ESA's Planck and Herschel space telescopes launch together on an Ariane 5 to map the CMB and the cold dusty universe respectively.",
    category: "launch",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Planck",
  },
  {
    id: "gaia-launch",
    month: 12,
    day: 19,
    year: 2013,
    event:
      "ESA's Gaia launches on a Soyuz-Fregat to chart the positions and motions of more than a billion stars in the Milky Way.",
    category: "launch",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Gaia",
  },
  {
    id: "ariel-pillars-creation",
    month: 4,
    day: 1,
    year: 1995,
    event:
      "Hubble captures the iconic 'Pillars of Creation' in the Eagle Nebula, columns of gas and dust forming new stars.",
    category: "observation",
    link: "https://hubblesite.org/contents/news-releases/1995/news-1995-44",
  },
  {
    id: "hubble-deep-field",
    month: 12,
    day: 18,
    year: 1995,
    event:
      "Hubble begins the ten-day exposure that will become the Hubble Deep Field, revealing thousands of galaxies in a patch of sky the size of a tennis ball at 100 metres.",
    category: "observation",
    link: "https://hubblesite.org/contents/news-releases/1996/news-1996-01",
  },
  {
    id: "halley-1986-perihelion",
    month: 2,
    day: 9,
    year: 1986,
    event:
      "Halley's Comet reaches perihelion during its most recent return; a flotilla of spacecraft (Giotto, Vega 1/2, Sakigake, Suisei, ICE) studies it in detail.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Halley%27s_Comet",
  },
  {
    id: "giotto-halley",
    month: 3,
    day: 14,
    year: 1986,
    event:
      "ESA's Giotto flies within 596 km of Halley's nucleus, returning the first close-up images of a cometary nucleus.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Giotto_(spacecraft)",
  },
  {
    id: "vega-1-halley",
    month: 3,
    day: 6,
    year: 1986,
    event:
      "Soviet probe Vega 1 flies past Halley's Comet at 8,890 km, returning the first images and pinpointing the nucleus for Giotto's closer approach.",
    category: "mission-arrival",
    link: "https://en.wikipedia.org/wiki/Vega_1",
  },
  {
    id: "cassini-titan-discovery",
    month: 3,
    day: 25,
    year: 1655,
    event:
      "Christiaan Huygens discovers Titan, Saturn's largest moon, by spotting a faint companion star that orbits the planet every 16 days.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Titan_(moon)",
  },
  {
    id: "saturn-rings-discovery",
    month: 7,
    day: 30,
    year: 1610,
    event:
      "Galileo first observes Saturn through a telescope and notes its 'companions' — actually the rings, which his optics could not resolve.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Galileo_Galilei",
  },
  {
    id: "halley-1758-return",
    month: 12,
    day: 25,
    year: 1758,
    event:
      "Farmer-astronomer Johann Palitzsch recovers Halley's Comet on Christmas night, vindicating Edmond Halley's posthumous prediction.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Halley%27s_Comet",
  },
  {
    id: "first-radio-signal-jupiter",
    month: 4,
    day: 6,
    year: 1955,
    event:
      "Bernard Burke and Kenneth Franklin detect decametric radio emissions from Jupiter, the first natural radio source identified beyond the Sun.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Bernard_F._Burke",
  },
  {
    id: "wow-signal",
    month: 8,
    day: 15,
    year: 1977,
    event:
      "Jerry Ehman records the 'Wow! signal' from the Big Ear radio telescope, a 72-second narrowband transmission near the hydrogen line that has never repeated.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Wow!_signal",
  },
  {
    id: "first-pulsar",
    month: 11,
    day: 28,
    year: 1967,
    event:
      "Jocelyn Bell Burnell records the first pulsar (PSR B1919+21) at Cambridge, initially nicknamed LGM-1 for 'little green men'.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/PSR_B1919%2B21",
  },
  {
    id: "first-quasar-3c273",
    month: 3,
    day: 5,
    year: 1963,
    event:
      "Maarten Schmidt identifies 3C 273 as a quasar at redshift 0.158, the first quasi-stellar object recognized as extragalactic.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/3C_273",
  },
  {
    id: "discovery-cmb",
    month: 5,
    day: 20,
    year: 1964,
    event:
      "Arno Penzias and Robert Wilson detect the cosmic microwave background as an unexplained 'antenna temperature' at Holmdel, NJ.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Discovery_of_cosmic_microwave_background_radiation",
  },
  {
    id: "supernova-1987a",
    month: 2,
    day: 23,
    year: 1987,
    event:
      "SN 1987A is observed in the Large Magellanic Cloud, the closest naked-eye supernova since Kepler's in 1604 and the first to be detected via neutrinos.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/SN_1987A",
  },
  {
    id: "discovery-eris",
    month: 1,
    day: 5,
    year: 2005,
    event:
      "Mike Brown's team announces the discovery of Eris, a trans-Neptunian object slightly smaller than Pluto whose discovery prompts the IAU's planet redefinition.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Eris_(dwarf_planet)",
  },
  {
    id: "pluto-demoted",
    month: 8,
    day: 24,
    year: 2006,
    event:
      "The IAU adopts a formal definition of 'planet' at its Prague General Assembly; Pluto, Eris, and Ceres are classified as dwarf planets.",
    category: "milestone",
    link: "https://www.iau.org/news/pressreleases/detail/iau0603/",
  },
  {
    id: "first-spacewalk-untethered",
    month: 2,
    day: 7,
    year: 1984,
    event:
      "Bruce McCandless makes the first untethered spacewalk, flying free of Challenger on a Manned Maneuvering Unit during STS-41-B.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/shuttle/shuttlemissions/archives/sts-41B.html",
  },
  {
    id: "first-female-spacewalk",
    month: 7,
    day: 25,
    year: 1984,
    event:
      "Svetlana Savitskaya becomes the first woman to walk in space, performing welding experiments outside Salyut 7.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Svetlana_Savitskaya",
  },
  {
    id: "kathy-sullivan-eva",
    month: 10,
    day: 11,
    year: 1984,
    event:
      "Kathy Sullivan becomes the first American woman to walk in space during STS-41-G.",
    category: "first",
    link: "https://www.nasa.gov/centers/johnson/about/people/orgs/bios/sullivan.html",
  },
  {
    id: "soyuz-1-launch",
    month: 4,
    day: 23,
    year: 1967,
    event:
      "Soyuz 1 launches with Vladimir Komarov aboard for the maiden crewed flight of the spacecraft type that is still in use today.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Soyuz_1",
  },
  {
    id: "ariane-1-maiden",
    month: 12,
    day: 24,
    year: 1979,
    event:
      "Ariane 1 makes its maiden flight from Kourou, giving Europe independent access to space.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Ariane_1",
  },
  {
    id: "long-march-1-first-flight",
    month: 4,
    day: 24,
    year: 1970,
    event:
      "China launches Dong Fang Hong 1 on a Long March 1 rocket, becoming the fifth nation to reach orbit independently.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Dong_Fang_Hong_1",
  },
  {
    id: "asuka-japan-first-sat",
    month: 2,
    day: 11,
    year: 1970,
    event:
      "Japan launches Ohsumi on a Lambda-4S rocket, becoming the fourth country to reach orbit independently.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/%C5%8Csumi_(satellite)",
  },
  {
    id: "iss-bicentennial",
    month: 12,
    day: 4,
    year: 1998,
    event:
      "STS-88 Endeavour attaches the Unity node to Zarya, marking the first U.S. contribution to the International Space Station assembly.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/shuttle/shuttlemissions/archives/sts-88.html",
  },
  {
    id: "shenzhou-1",
    month: 11,
    day: 20,
    year: 1999,
    event:
      "China launches Shenzhou 1, the uncrewed maiden flight of its human spaceflight programme.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Shenzhou_1",
  },
  {
    id: "ssa-iss-100k-orbits",
    month: 5,
    day: 16,
    year: 2016,
    event:
      "The International Space Station completes its 100,000th orbit of Earth.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/station/main/index.html",
  },
  {
    id: "starship-orbital-flight-3",
    month: 3,
    day: 14,
    year: 2024,
    event:
      "Starship's third integrated test flight reaches space, demonstrates payload-bay door operation, and completes a re-entry attempt over the Indian Ocean.",
    category: "milestone",
    link: "https://www.spacex.com/vehicles/starship/",
  },
  {
    id: "ax-1-first-private-crew",
    month: 4,
    day: 8,
    year: 2022,
    event:
      "Axiom Mission 1 launches on a Crew Dragon, the first all-private astronaut mission to the International Space Station.",
    category: "first",
    link: "https://www.axiomspace.com/missions/axiom-mission-1",
  },
  {
    id: "ax-2-crew-2",
    month: 5,
    day: 21,
    year: 2023,
    event:
      "Axiom Mission 2 launches the first Saudi woman to space, Rayyanah Barnawi, along with three other private astronauts.",
    category: "milestone",
    link: "https://www.axiomspace.com/missions/axiom-mission-2",
  },
  {
    id: "polaris-dawn-eva",
    month: 9,
    day: 12,
    year: 2024,
    event:
      "Jared Isaacman and Sarah Gillis perform the first commercial spacewalk from Polaris Dawn's Crew Dragon, demonstrating SpaceX's new EVA suit.",
    category: "first",
    link: "https://polarisprogram.com/dawn/",
  },
  {
    id: "spacex-mechazilla-catch",
    month: 10,
    day: 13,
    year: 2024,
    event:
      "Starship's IFT-5 demonstrates the first 'Mechazilla' catch of a Super Heavy booster by the launch tower's chopstick arms.",
    category: "first",
    link: "https://www.spacex.com/vehicles/starship/",
  },
  {
    id: "spacex-starlink-first-flight",
    month: 5,
    day: 23,
    year: 2019,
    event:
      "SpaceX launches the first 60 operational Starlink satellites on a Falcon 9 from Cape Canaveral.",
    category: "launch",
    link: "https://www.spacex.com/updates/",
  },
  {
    id: "ariane-5-maiden",
    month: 6,
    day: 4,
    year: 1996,
    event:
      "The maiden flight of Ariane 5 ends in failure 37 seconds after launch when a software bug overflows in the inertial reference system.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Cluster_(spacecraft)",
  },
  {
    id: "ariane-6-maiden",
    month: 7,
    day: 9,
    year: 2024,
    event:
      "Ariane 6 makes its maiden flight from Kourou, restoring Europe's autonomous heavy-lift capability after the retirement of Ariane 5.",
    category: "first",
    link: "https://www.esa.int/Enabling_Support/Space_Transportation/Ariane",
  },
  {
    id: "sls-artemis-1-launch",
    month: 11,
    day: 16,
    year: 2022,
    event:
      "SLS launches the uncrewed Artemis I Orion capsule on a 25-day mission around the Moon, the first deep-space flight of NASA's new heavy-lift vehicle.",
    category: "launch",
    link: "https://www.nasa.gov/specials/artemis-i/",
  },
  {
    id: "artemis-1-splashdown",
    month: 12,
    day: 11,
    year: 2022,
    event:
      "Orion splashes down in the Pacific after Artemis I, paving the way for crewed Artemis II and III missions.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/specials/artemis-i/",
  },
  {
    id: "jwst-deep-field-release",
    month: 7,
    day: 11,
    year: 2022,
    event:
      "President Biden previews Webb's first deep-field image of the galaxy cluster SMACS 0723, the deepest infrared view of the universe.",
    category: "observation",
    link: "https://www.nasa.gov/feature/goddard/2022/nasa-s-webb-delivers-deepest-infrared-image-of-universe-yet",
  },
  {
    id: "scott-kelly-one-year",
    month: 3,
    day: 1,
    year: 2016,
    event:
      "Scott Kelly returns from a 340-day mission on the ISS, the longest single American spaceflight at the time and part of the Twins Study with Mark Kelly.",
    category: "milestone",
    link: "https://www.nasa.gov/feature/one-year-mission",
  },
  {
    id: "polyakov-record",
    month: 3,
    day: 22,
    year: 1995,
    event:
      "Valeri Polyakov returns from 437 days aboard Mir, still the longest single human spaceflight on record.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Valeri_Polyakov",
  },
  {
    id: "iss-decommission-planned",
    month: 1,
    day: 30,
    year: 2031,
    event:
      "NASA targets a controlled deorbit of the International Space Station, with debris guided into Point Nemo in the South Pacific.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/station/main/index.html",
  },
  {
    id: "voyager-2-uranus",
    month: 1,
    day: 24,
    year: 1986,
    event:
      "Voyager 2 makes its only flyby of Uranus, discovering ten new moons and confirming the planet's unusual sideways rotation.",
    category: "mission-arrival",
    link: "https://voyager.jpl.nasa.gov/mission/science/uranus/",
  },
  {
    id: "voyager-2-jupiter",
    month: 7,
    day: 9,
    year: 1979,
    event:
      "Voyager 2 makes its closest approach to Jupiter, complementing Voyager 1's earlier flyby with images of all four Galilean moons.",
    category: "mission-arrival",
    link: "https://voyager.jpl.nasa.gov/mission/science/jupiter/",
  },
  {
    id: "voyager-2-saturn",
    month: 8,
    day: 26,
    year: 1981,
    event:
      "Voyager 2 makes its closest approach to Saturn, then uses the gravitational assist to head to Uranus.",
    category: "mission-arrival",
    link: "https://voyager.jpl.nasa.gov/mission/science/saturn/",
  },
  {
    id: "pioneer-11-saturn",
    month: 9,
    day: 1,
    year: 1979,
    event:
      "Pioneer 11 becomes the first spacecraft to fly past Saturn, discovering a new ring and the moon Epimetheus.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-019A",
  },
  {
    id: "mariner-10-mercury",
    month: 3,
    day: 29,
    year: 1974,
    event:
      "Mariner 10 makes the first flyby of Mercury, returning the first close-up images of the innermost planet.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-085A",
  },
  {
    id: "iss-soyuz-leak-2018",
    month: 8,
    day: 30,
    year: 2018,
    event:
      "Crews on the ISS find and patch a 2 mm hole in Soyuz MS-09, the source of a slow pressure leak.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Soyuz_MS-09",
  },
  {
    id: "kepler-end-of-mission",
    month: 10,
    day: 30,
    year: 2018,
    event:
      "NASA decommissions the Kepler space telescope after it runs out of fuel; the mission discovered more than 2,600 exoplanets.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/kepler/main/index.html",
  },
  {
    id: "icarus-skylab-fall",
    month: 7,
    day: 11,
    year: 1979,
    event:
      "Skylab re-enters the atmosphere over the Indian Ocean and Western Australia after six years in orbit.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Skylab",
  },
  {
    id: "mir-deorbit",
    month: 3,
    day: 23,
    year: 2001,
    event:
      "After fifteen years in orbit, the Mir space station is deorbited into the South Pacific.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Mir",
  },
  {
    id: "tianwen-1-landing",
    month: 5,
    day: 14,
    year: 2021,
    event:
      "China's Zhurong rover lands in Utopia Planitia, making China the second nation to operate a rover on Mars.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Tianwen-1",
  },
  {
    id: "first-american-female-astronaut-classed",
    month: 1,
    day: 16,
    year: 1978,
    event:
      "NASA selects Astronaut Group 8, including the first six women — Sally Ride, Judith Resnik, Anna Fisher, Kathryn Sullivan, Margaret Rhea Seddon, and Shannon Lucid.",
    category: "milestone",
    link: "https://www.nasa.gov/feature/the-thirty-five-new-guys-nasas-eighth-astronaut-class",
  },
  {
    id: "ham-chimp-flight",
    month: 1,
    day: 31,
    year: 1961,
    event:
      "Ham the chimpanzee survives a 16-minute suborbital Mercury-Redstone 2 flight, demonstrating that the Mercury capsule could safely carry a passenger.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Ham_(chimpanzee)",
  },
  {
    id: "shepard-suborbital",
    month: 7,
    day: 21,
    year: 1961,
    event:
      "Gus Grissom flies Liberty Bell 7 on the second Mercury-Redstone suborbital flight, though the capsule sinks after splashdown.",
    category: "milestone",
    link: "https://www.nasa.gov/mission_pages/mercury/missions/liberty-bell7.html",
  },
  {
    id: "gemini-iv",
    month: 6,
    day: 3,
    year: 1965,
    event:
      "Gemini 4 launches with Jim McDivitt and Ed White; White becomes the first American spacewalker.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/gemini/missions/gemini-iv.html",
  },
  {
    id: "apollo-12-launch",
    month: 11,
    day: 14,
    year: 1969,
    event:
      "Apollo 12 launches into a Florida thunderstorm; lightning strikes the vehicle twice but the crew completes the mission to the Ocean of Storms.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo12.html",
  },
  {
    id: "apollo-12-landing",
    month: 11,
    day: 19,
    year: 1969,
    event:
      "Apollo 12's Intrepid lands within 200 m of the Surveyor 3 probe in Oceanus Procellarum, the first precision lunar landing.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo12.html",
  },
  {
    id: "halley-comet-1986-return",
    month: 11,
    day: 8,
    year: 1985,
    event:
      "Halley's Comet reaches its closest approach to Earth during its 1986 apparition, recovered visually months earlier by amateur astronomers.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Halley%27s_Comet",
  },
  {
    id: "first-tv-from-space-tiros",
    month: 4,
    day: 1,
    year: 1960,
    event:
      "TIROS-1 returns the first television images of Earth from space, inaugurating the era of weather satellites.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/TIROS-1",
  },
  {
    id: "syncom-3-geostationary",
    month: 8,
    day: 19,
    year: 1964,
    event:
      "Syncom 3 reaches geostationary orbit, the first satellite to do so, and broadcasts the Tokyo Olympics to North America.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Syncom",
  },
  {
    id: "first-female-shuttle-commander",
    month: 7,
    day: 23,
    year: 1999,
    event:
      "Eileen Collins commands STS-93, becoming the first female commander of a Space Shuttle mission.",
    category: "first",
    link: "https://www.nasa.gov/feature/eileen-collins-first-woman-shuttle-commander",
  },
  {
    id: "smart-1-impact",
    month: 9,
    day: 3,
    year: 2006,
    event:
      "ESA's SMART-1 ends its mission with a controlled impact on the lunar surface, after demonstrating ion propulsion on a lunar mission.",
    category: "milestone",
    link: "https://www.esa.int/Science_Exploration/Space_Science/SMART-1",
  },
  {
    id: "kaguya-impact",
    month: 6,
    day: 10,
    year: 2009,
    event:
      "JAXA's Kaguya lunar orbiter ends its mission with a controlled impact on the near side of the Moon.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/SELENE",
  },
  {
    id: "messenger-impact",
    month: 4,
    day: 30,
    year: 2015,
    event:
      "MESSENGER runs out of propellant and impacts Mercury, ending a four-year orbital survey of the innermost planet.",
    category: "milestone",
    link: "https://messenger.jhuapl.edu/",
  },
  {
    id: "deep-space-1-launch-real",
    month: 10,
    day: 24,
    year: 1998,
    event:
      "Deep Space 1 launches as the first NASA New Millennium technology demonstrator, validating ion propulsion and autonomous navigation.",
    category: "launch",
    link: "https://www.jpl.nasa.gov/missions/deep-space-1-ds1",
  },
  {
    id: "first-image-of-earth-from-moon",
    month: 8,
    day: 23,
    year: 1966,
    event:
      "Lunar Orbiter 1 returns the first image of Earth taken from the vicinity of the Moon.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Lunar_Orbiter_1",
  },
  {
    id: "earthrise-image",
    month: 12,
    day: 24,
    year: 1968,
    event:
      "Bill Anders captures Earthrise from Apollo 8 in lunar orbit, an image often credited with launching the modern environmental movement.",
    category: "observation",
    link: "https://www.nasa.gov/multimedia/imagegallery/image_feature_1249.html",
  },
  {
    id: "skylab-2-launch",
    month: 5,
    day: 25,
    year: 1973,
    event:
      "Skylab 2 launches with Pete Conrad's crew to perform emergency repairs on the damaged Skylab station, saving the programme.",
    category: "launch",
    link: "https://www.nasa.gov/skylab/",
  },
  {
    id: "spacex-iss-cargo-first",
    month: 5,
    day: 22,
    year: 2012,
    event:
      "SpaceX's Dragon C2+ launches on COTS Demo Flight 2, the first commercial spacecraft on a path to the ISS.",
    category: "launch",
    link: "https://www.spacex.com/",
  },
  {
    id: "boeing-starliner-cft",
    month: 6,
    day: 5,
    year: 2024,
    event:
      "Boeing's Starliner launches Butch Wilmore and Suni Williams on Crew Flight Test, the first crewed flight of the spacecraft.",
    category: "launch",
    link: "https://www.boeing.com/space/starliner/",
  },
  {
    id: "blue-origin-new-shepard-first-crewed",
    month: 7,
    day: 20,
    year: 2021,
    event:
      "Blue Origin's New Shepard launches its first crewed flight, carrying Jeff Bezos, Wally Funk, Mark Bezos, and Oliver Daemen on a brief suborbital hop.",
    category: "first",
    link: "https://www.blueorigin.com/new-shepard",
  },
  {
    id: "virgin-galactic-first-tourist",
    month: 7,
    day: 11,
    year: 2021,
    event:
      "Richard Branson and crew fly to the edge of space aboard VSS Unity, Virgin Galactic's first fully crewed test flight.",
    category: "first",
    link: "https://www.virgingalactic.com/",
  },
  {
    id: "boeing-cst-100-uncrewed",
    month: 5,
    day: 19,
    year: 2022,
    event:
      "Boeing's Starliner OFT-2 successfully docks with the ISS uncrewed, clearing the way for its Crew Flight Test.",
    category: "milestone",
    link: "https://www.boeing.com/space/starliner/",
  },
  {
    id: "spaceil-beresheet",
    month: 4,
    day: 11,
    year: 2019,
    event:
      "Israeli SpaceIL's Beresheet crashes during its final descent to the lunar surface, narrowly missing what would have been the first privately funded landing.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Beresheet",
  },
  {
    id: "chandrayaan-2-vikram-crash",
    month: 9,
    day: 7,
    year: 2019,
    event:
      "ISRO's Chandrayaan-2 Vikram lander loses contact during its descent to the lunar south pole.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Chandrayaan-2",
  },
  {
    id: "chandrayaan-3-landing",
    month: 8,
    day: 23,
    year: 2023,
    event:
      "ISRO's Chandrayaan-3 Vikram lander touches down near the lunar south pole, making India the fourth nation to soft-land on the Moon and the first near the south pole.",
    category: "first",
    link: "https://www.isro.gov.in/Chandrayaan_3.html",
  },
  {
    id: "slim-japan-landing",
    month: 1,
    day: 19,
    year: 2024,
    event:
      "JAXA's SLIM lander touches down within 100 m of its target, making Japan the fifth nation to soft-land on the Moon.",
    category: "first",
    link: "https://www.isas.jaxa.jp/en/missions/spacecraft/current/slim.html",
  },
  {
    id: "ispace-hakuto-crash",
    month: 4,
    day: 25,
    year: 2023,
    event:
      "Japanese company ispace's HAKUTO-R Mission 1 lander loses contact moments before touchdown in Atlas crater.",
    category: "loss",
    link: "https://ispace-inc.com/",
  },
  {
    id: "intuitive-machines-im-1",
    month: 2,
    day: 22,
    year: 2024,
    event:
      "Intuitive Machines' Odysseus lands near the lunar south pole, the first U.S. spacecraft to land on the Moon since Apollo 17 and the first commercial soft landing.",
    category: "first",
    link: "https://www.intuitivemachines.com/im-1",
  },
  {
    id: "soyuz-ms-22-coolant-leak",
    month: 12,
    day: 14,
    year: 2022,
    event:
      "Soyuz MS-22 docked at the ISS suffers a coolant leak, forcing Roscosmos to launch an empty MS-23 to bring the crew home.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Soyuz_MS-22",
  },
  {
    id: "vss-enterprise-loss",
    month: 10,
    day: 31,
    year: 2014,
    event:
      "Virgin Galactic's VSS Enterprise breaks up over the Mojave Desert during a test flight, killing co-pilot Michael Alsbury.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/VSS_Enterprise",
  },
  {
    id: "first-image-mars-mariner-4",
    month: 7,
    day: 15,
    year: 1965,
    event:
      "Mariner 4 transmits the first close-up images of Mars during a 9,846 km flyby, revealing a cratered surface.",
    category: "first",
    link: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A",
  },
  {
    id: "venera-4-arrival",
    month: 10,
    day: 18,
    year: 1967,
    event:
      "Venera 4 transmits the first direct measurements of another planet's atmosphere during its descent to Venus.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Venera_4",
  },
  {
    id: "dawn-vesta-launch",
    month: 9,
    day: 27,
    year: 2007,
    event:
      "NASA's Dawn launches on a Delta II toward the asteroid belt, the first mission designed to orbit two extraterrestrial bodies.",
    category: "launch",
    link: "https://solarsystem.nasa.gov/missions/dawn/overview/",
  },
  {
    id: "first-rocket-into-space-v2",
    month: 6,
    day: 20,
    year: 1944,
    event:
      "A German V-2 missile becomes the first human-made object to cross the Kármán line on a test flight from Peenemünde.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/V-2_rocket",
  },
  {
    id: "robert-goddard-first-liquid-rocket",
    month: 3,
    day: 16,
    year: 1926,
    event:
      "Robert Goddard launches the world's first liquid-fuelled rocket from his aunt's farm in Auburn, Massachusetts; it flies 41 feet.",
    category: "first",
    link: "https://www.nasa.gov/centers-and-facilities/goddard/dr-robert-h-goddard-american-rocketry-pioneer/",
  },
  {
    id: "skylab-decommission",
    month: 2,
    day: 8,
    year: 1974,
    event:
      "The last Skylab crew (SL-4) returns to Earth after 84 days, then the longest crewed spaceflight in history.",
    category: "milestone",
    link: "https://www.nasa.gov/skylab/",
  },
  {
    id: "deep-impact-launch",
    month: 1,
    day: 12,
    year: 2005,
    event:
      "Deep Impact launches on a Delta II for a six-month cruise to comet Tempel 1, where it will deliver a kinetic impactor.",
    category: "launch",
    link: "https://www.nasa.gov/mission_pages/deepimpact/main/",
  },
  {
    id: "messenger-launch",
    month: 8,
    day: 3,
    year: 2004,
    event:
      "MESSENGER launches on a Delta II toward Mercury on a seven-year cruise via Earth, Venus, and three Mercury flybys.",
    category: "launch",
    link: "https://messenger.jhuapl.edu/",
  },
  {
    id: "bepicolombo-launch",
    month: 10,
    day: 20,
    year: 2018,
    event:
      "ESA-JAXA BepiColombo launches on an Ariane 5 toward Mercury, with arrival expected in late 2025 after multiple flybys.",
    category: "launch",
    link: "https://www.esa.int/Science_Exploration/Space_Science/BepiColombo",
  },
  {
    id: "spacex-iss-first-crewed-docking",
    month: 5,
    day: 31,
    year: 2020,
    event:
      "Crew Dragon Endeavour docks with the ISS, completing the first crewed orbital flight of a privately operated spacecraft.",
    category: "first",
    link: "https://www.nasa.gov/specials/dm2/",
  },
  {
    id: "voyager-2-interstellar",
    month: 11,
    day: 5,
    year: 2018,
    event:
      "Voyager 2 crosses the heliopause and becomes the second spacecraft to enter interstellar space.",
    category: "first",
    link: "https://voyager.jpl.nasa.gov/",
  },
  {
    id: "earth-day-mariner",
    month: 4,
    day: 22,
    year: 1970,
    event:
      "The first Earth Day is observed; the Apollo programme's images of a fragile blue planet are cited as one of its catalysts.",
    category: "milestone",
    link: "https://en.wikipedia.org/wiki/Earth_Day",
  },
  {
    id: "tianwen-1-launch",
    month: 7,
    day: 23,
    year: 2020,
    event:
      "China's Tianwen-1 launches on a Long March 5 carrying an orbiter, lander, and the Zhurong rover bound for Mars.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Tianwen-1",
  },
  {
    id: "hope-uae-launch",
    month: 7,
    day: 19,
    year: 2020,
    event:
      "The United Arab Emirates launches its Hope orbiter to Mars on a Japanese H-IIA, becoming the first Arab nation to send a mission to another planet.",
    category: "launch",
    link: "https://www.mbrsc.ae/emirates-mars-mission/",
  },
  {
    id: "smap-launch",
    month: 1,
    day: 31,
    year: 2015,
    event:
      "NASA's Soil Moisture Active Passive mission launches on a Delta II to globally map soil moisture from low Earth orbit.",
    category: "launch",
    link: "https://smap.jpl.nasa.gov/",
  },
  {
    id: "apollo-13-splashdown",
    month: 4,
    day: 17,
    year: 1970,
    event:
      "Apollo 13 splashes down safely in the Pacific after the agency's 'successful failure' lunar mission.",
    category: "mission-arrival",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo13.html",
  },
  {
    id: "mars-observer-launch",
    month: 9,
    day: 25,
    year: 1992,
    event:
      "Mars Observer launches on a Titan III; contact will be lost three days before its scheduled Mars orbit insertion.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Mars_Observer",
  },
  {
    id: "first-tv-image-from-moon-luna-9",
    month: 2,
    day: 4,
    year: 1966,
    event:
      "Luna 9 transmits the first television images from the surface of the Moon, two days after its soft landing.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/Luna_9",
  },
  {
    id: "first-deep-space-relay-deep-space-network",
    month: 12,
    day: 24,
    year: 1963,
    event:
      "NASA officially activates the Deep Space Network with its first three tracking stations at Goldstone, Madrid, and Canberra.",
    category: "milestone",
    link: "https://www.nasa.gov/directorates/somd/space-communications-navigation-program/deep-space-network/",
  },
  {
    id: "first-laser-comm-deep-space",
    month: 12,
    day: 11,
    year: 2023,
    event:
      "NASA's Psyche spacecraft successfully demonstrates the first deep-space laser communication, downlinking video data from beyond the Moon.",
    category: "first",
    link: "https://www.jpl.nasa.gov/missions/psyche/",
  },
  {
    id: "comet-mcnaught-perihelion",
    month: 1,
    day: 12,
    year: 2007,
    event:
      "Comet McNaught (C/2006 P1) reaches perihelion and becomes the brightest comet in 40 years, visible to the naked eye in daylight in the southern hemisphere.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/C/2006_P1",
  },
  {
    id: "comet-hale-bopp-perihelion",
    month: 4,
    day: 1,
    year: 1997,
    event:
      "Comet Hale-Bopp reaches perihelion during a 19-month apparition, the most widely observed comet of the 20th century.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Comet_Hale%E2%80%93Bopp",
  },
  {
    id: "great-comet-1882",
    month: 9,
    day: 17,
    year: 1882,
    event:
      "The Great Comet of 1882 reaches perihelion within 480,000 km of the Sun, briefly visible alongside the Sun in daylight.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Great_Comet_of_1882",
  },
  {
    id: "saturn-1b-first-flight",
    month: 2,
    day: 26,
    year: 1966,
    event:
      "The Saturn IB makes its maiden flight from Cape Kennedy, qualifying the upper stage that would later loft Apollo crews to Skylab and Apollo-Soyuz.",
    category: "launch",
    link: "https://en.wikipedia.org/wiki/Saturn_IB",
  },
  {
    id: "saturn-v-first-flight",
    month: 11,
    day: 9,
    year: 1967,
    event:
      "Apollo 4 makes the maiden flight of the Saturn V, qualifying the launch vehicle for crewed lunar missions.",
    category: "first",
    link: "https://www.nasa.gov/mission_pages/apollo/missions/apollo4.html",
  },
  {
    id: "x-15-space-first",
    month: 7,
    day: 17,
    year: 1962,
    event:
      "X-15 pilot Robert White flies above 80 km, earning the first NASA astronaut wings for a winged-aircraft flight.",
    category: "first",
    link: "https://www.nasa.gov/centers/dryden/history/HistoricAircraft/X-15/index.html",
  },
  {
    id: "north-american-space-station-first",
    month: 4,
    day: 5,
    year: 1991,
    event:
      "Compton Gamma Ray Observatory launches aboard Atlantis on STS-37 as the second of NASA's Great Observatories.",
    category: "launch",
    link: "https://heasarc.gsfc.nasa.gov/docs/cgro/",
  },
  {
    id: "first-american-female-cmdr-iss",
    month: 4,
    day: 9,
    year: 2008,
    event:
      "Peggy Whitson returns to Earth after the first long-duration ISS command by a woman during Expedition 16.",
    category: "first",
    link: "https://www.nasa.gov/feature/peggy-whitson-bio",
  },
  {
    id: "fobos-grunt-loss",
    month: 11,
    day: 9,
    year: 2011,
    event:
      "Russia's Fobos-Grunt sample-return mission to Phobos fails to leave Earth orbit and re-enters two months later.",
    category: "loss",
    link: "https://en.wikipedia.org/wiki/Fobos-Grunt",
  },
  {
    id: "kepler-186f-discovery",
    month: 4,
    day: 17,
    year: 2014,
    event:
      "Kepler discovers Kepler-186f, the first Earth-sized planet found in a habitable zone of another star.",
    category: "discovery",
    link: "https://www.nasa.gov/ames/kepler/nasas-kepler-discovers-first-earth-size-planet-in-the-habitable-zone-of-another-star",
  },
  {
    id: "trappist-1-system-discovery",
    month: 2,
    day: 22,
    year: 2017,
    event:
      "Astronomers announce that the TRAPPIST-1 system contains seven Earth-sized planets, three of them in the habitable zone.",
    category: "discovery",
    link: "https://www.nasa.gov/press-release/nasa-telescope-reveals-largest-batch-of-earth-size-habitable-zone-planets-around",
  },
  {
    id: "proxima-b-discovery",
    month: 8,
    day: 24,
    year: 2016,
    event:
      "Astronomers announce the discovery of Proxima Centauri b, a temperate Earth-mass planet orbiting our nearest stellar neighbour.",
    category: "discovery",
    link: "https://www.eso.org/public/news/eso1629/",
  },
  {
    id: "discovery-makemake",
    month: 3,
    day: 31,
    year: 2005,
    event:
      "Mike Brown's team discovers the dwarf planet Makemake in the classical Kuiper belt.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Makemake",
  },
  {
    id: "discovery-haumea",
    month: 12,
    day: 28,
    year: 2004,
    event:
      "Astronomers at the Sierra Nevada Observatory image the dwarf planet Haumea, later recognized for its egg shape and ring system.",
    category: "discovery",
    link: "https://en.wikipedia.org/wiki/Haumea",
  },
  {
    id: "voyager-1-distance-record",
    month: 2,
    day: 17,
    year: 1998,
    event:
      "Voyager 1 surpasses Pioneer 10 to become the most distant human-made object from the Sun.",
    category: "milestone",
    link: "https://voyager.jpl.nasa.gov/",
  },
  {
    id: "hubble-30-years",
    month: 4,
    day: 24,
    year: 2020,
    event:
      "Hubble marks its 30th anniversary with a 'Cosmic Reef' image of star-forming regions NGC 2014 and NGC 2020.",
    category: "milestone",
    link: "https://hubblesite.org/contents/news-releases/2020/news-2020-21",
  },
  {
    id: "snc-amor-meteor-mars",
    month: 8,
    day: 7,
    year: 1996,
    event:
      "NASA announces possible biosignatures in Martian meteorite ALH 84001, sparking decades of debate on extraterrestrial life.",
    category: "observation",
    link: "https://en.wikipedia.org/wiki/Allan_Hills_84001",
  },
  {
    id: "k2-18b-confirmation",
    month: 8,
    day: 22,
    year: 2024,
    event:
      "A follow-up JWST observation tentatively reaffirms the dimethyl-sulfide signal in K2-18 b's atmosphere, with caveats on the molecule's identification.",
    category: "observation",
    link: "https://exoplanets.nasa.gov/news/k2-18b",
  },
  {
    id: "rosalind-franklin-rover-delay",
    month: 9,
    day: 27,
    year: 2022,
    event:
      "ESA suspends cooperation with Roscosmos on the ExoMars Rosalind Franklin rover after the invasion of Ukraine, delaying the mission to 2028.",
    category: "milestone",
    link: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars",
  },
  {
    id: "first-cubesat-launch",
    month: 6,
    day: 30,
    year: 2003,
    event:
      "The first six CubeSats are launched on a Russian Rockot, demonstrating the new 10 cm-cube university satellite standard.",
    category: "first",
    link: "https://en.wikipedia.org/wiki/CubeSat",
  },
  {
    id: "first-fully-private-orbital-launch",
    month: 9,
    day: 28,
    year: 2008,
    event:
      "Falcon 1 reaches orbit on its fourth flight, the first privately developed liquid-fuelled rocket to do so.",
    category: "first",
    link: "https://www.spacex.com/vehicles/falcon-1/",
  },
  {
    id: "rocket-lab-electron-orbit",
    month: 1,
    day: 21,
    year: 2018,
    event:
      "Rocket Lab's Electron reaches orbit on its second flight, ushering in the era of small dedicated launchers.",
    category: "first",
    link: "https://www.rocketlabusa.com/launch/electron/",
  },
];

/**
 * Return all entries whose month-day equals today's local date.
 * Sorted newest-year first so the most recent events appear first.
 */
export function eventsForToday(date: Date = new Date()): SpaceHistoryEntry[] {
  return eventsForMonthDay(date.getMonth() + 1, date.getDate());
}

export function eventsForMonthDay(
  month: number,
  day: number,
): SpaceHistoryEntry[] {
  return SPACE_HISTORY.filter((e) => e.month === month && e.day === day).sort(
    (a, b) => b.year - a.year,
  );
}

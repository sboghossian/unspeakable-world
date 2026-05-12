/**
 * 🛰 Mission Catalog — a reference of the major spacecraft and human-
 * spaceflight programs of the space age. Past, present, and approved
 * future missions; one short line each.
 *
 * Scope rule for inclusion: a mission only earns a row if a reasonably
 * curious adult should plausibly recognize it OR if it's actively
 * returning science data right now. We don't list every cubesat.
 *
 * Status semantics:
 *   - "active": currently operating, returning data
 *   - "historical": mission ended (decommissioned, lost, or success)
 *   - "upcoming": confirmed program with a published launch target
 *   - "extended": past primary mission but still operating
 */

export type Agency =
  | "NASA"
  | "ESA"
  | "JAXA"
  | "Roscosmos"
  | "CNSA"
  | "ISRO"
  | "SpaceX"
  | "Blue Origin"
  | "Rocket Lab"
  | "ULA"
  | "Multi-agency";

export type MissionKind =
  | "space-telescope"
  | "solar"
  | "planetary"
  | "lunar"
  | "asteroid-comet"
  | "human-spaceflight"
  | "earth-observation"
  | "exoplanet"
  | "deep-space"
  | "commercial";

export type MissionEntry = {
  id: string;
  name: string;
  agency: Agency;
  kind: MissionKind;
  status: "active" | "extended" | "historical" | "upcoming";
  launch: string;       // ISO yyyy-mm or yyyy-mm-dd
  endDate?: string;     // present only if historical
  target: string;       // "Sun", "Mars", "JWST L2", "Beyond heliopause", etc.
  summary: string;      // one short paragraph
  link: string;         // canonical mission page (NASA, ESA, etc.)
};

export const MISSIONS_CATALOG: MissionEntry[] = [
  // ─── Active space telescopes ─────────────────────────────────────
  {
    id: "jwst",
    name: "JWST · James Webb Space Telescope",
    agency: "NASA",
    kind: "space-telescope",
    status: "active",
    launch: "2021-12-25",
    target: "Sun-Earth L2",
    summary:
      "6.5-m gold-coated segmented mirror, cooled to ~50 K. Operating in mid + near infrared. Deepest galactic redshifts ever recorded; first JWST exoplanet atmospheres.",
    link: "https://webb.nasa.gov",
  },
  {
    id: "hst",
    name: "Hubble Space Telescope",
    agency: "NASA",
    kind: "space-telescope",
    status: "extended",
    launch: "1990-04-24",
    target: "Low Earth Orbit (540 km)",
    summary:
      "2.4-m UV/visible/near-IR observatory. Five astronaut servicing missions kept it running 35+ years. Hubble Deep Field rewrote the early-universe story.",
    link: "https://hubblesite.org",
  },
  {
    id: "chandra",
    name: "Chandra X-ray Observatory",
    agency: "NASA",
    kind: "space-telescope",
    status: "extended",
    launch: "1999-07-23",
    target: "Highly elliptical Earth orbit",
    summary:
      "0.1–10 keV X-ray imaging at 0.5-arcsec resolution. Revealed the supermassive BH at Sgr A*, mapped hot gas in galaxy clusters, found the first stellar-mass IMBH candidates.",
    link: "https://chandra.harvard.edu",
  },
  {
    id: "fermi",
    name: "Fermi Gamma-ray Space Telescope",
    agency: "NASA",
    kind: "space-telescope",
    status: "active",
    launch: "2008-06-11",
    target: "Low Earth Orbit (550 km)",
    summary:
      "Gamma-ray pair-conversion telescope; LAT instrument scans the full sky every 3 hours. Detected the first GW170817 short GRB counterpart and the Galactic Center 'Fermi Bubbles'.",
    link: "https://fermi.gsfc.nasa.gov",
  },
  {
    id: "tess",
    name: "TESS · Transiting Exoplanet Survey Satellite",
    agency: "NASA",
    kind: "exoplanet",
    status: "extended",
    launch: "2018-04-18",
    target: "P/2 lunar resonance orbit",
    summary:
      "All-sky transit survey of bright nearby stars. 7,000+ planet candidates and 400+ confirmed exoplanets, including the TRAPPIST-1-like TOI-700 system.",
    link: "https://tess.mit.edu",
  },
  {
    id: "gaia",
    name: "Gaia",
    agency: "ESA",
    kind: "space-telescope",
    status: "historical",
    launch: "2013-12-19",
    endDate: "2025-03-27",
    target: "Sun-Earth L2",
    summary:
      "1.7 billion stars surveyed with sub-milliarcsec astrometry. Decommissioned March 2025 after a decade of mission-defining data; DR4 release expected 2026.",
    link: "https://www.cosmos.esa.int/web/gaia",
  },
  {
    id: "euclid",
    name: "Euclid",
    agency: "ESA",
    kind: "space-telescope",
    status: "active",
    launch: "2023-07-01",
    target: "Sun-Earth L2",
    summary:
      "Dark-matter and dark-energy mission. 1.2-m visible + NISP near-IR telescope mapping the 3D distribution of 1.5 billion galaxies out to z=2.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Euclid",
  },
  {
    id: "ixpe",
    name: "IXPE · Imaging X-ray Polarimetry Explorer",
    agency: "NASA",
    kind: "space-telescope",
    status: "active",
    launch: "2021-12-09",
    target: "Equatorial LEO",
    summary:
      "First dedicated X-ray polarimetry mission. Measuring the geometry of magnetar emission regions and BH accretion disk corona.",
    link: "https://ixpe.msfc.nasa.gov",
  },
  {
    id: "nicer",
    name: "NICER · Neutron-star Interior Composition Explorer",
    agency: "NASA",
    kind: "space-telescope",
    status: "active",
    launch: "2017-06-03",
    target: "ISS-mounted",
    summary:
      "Soft X-ray timing instrument on the ISS. Measured the radii of PSR J0030+0451 and J0740+6620, constraining the neutron-star equation of state.",
    link: "https://heasarc.gsfc.nasa.gov/docs/nicer/",
  },
  {
    id: "swift",
    name: "Swift · Neil Gehrels Swift Observatory",
    agency: "NASA",
    kind: "space-telescope",
    status: "active",
    launch: "2004-11-20",
    target: "LEO 600 km",
    summary:
      "GRB rapid-response observatory with X-ray, UV, and optical telescopes. Slewing 50° in 50 s. Discovered the kilonova counterpart of GW170817.",
    link: "https://swift.gsfc.nasa.gov",
  },

  // ─── Upcoming space telescopes ───────────────────────────────────
  {
    id: "roman",
    name: "Nancy Grace Roman Space Telescope",
    agency: "NASA",
    kind: "space-telescope",
    status: "upcoming",
    launch: "2027-05",
    target: "Sun-Earth L2",
    summary:
      "2.4-m IR survey telescope with FOV 100× wider than Hubble. Will measure dark energy via baryon acoustic oscillations + supernova standard candles.",
    link: "https://roman.gsfc.nasa.gov",
  },
  {
    id: "plato",
    name: "PLATO",
    agency: "ESA",
    kind: "exoplanet",
    status: "upcoming",
    launch: "2026-12",
    target: "Sun-Earth L2",
    summary:
      "26-telescope array hunting Earth-sized planets in habitable zones of bright G/K stars. Designed to find genuine Earth analogs around Sun-like hosts.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Plato",
  },
  {
    id: "ariel",
    name: "ARIEL",
    agency: "ESA",
    kind: "exoplanet",
    status: "upcoming",
    launch: "2029",
    target: "Sun-Earth L2",
    summary:
      "First dedicated exoplanet atmosphere characterizer. Will spectroscope ~1,000 transiting exoplanets to build a chemical census of warm worlds.",
    link: "https://arielmission.space",
  },
  {
    id: "habitable-worlds-observatory",
    name: "Habitable Worlds Observatory",
    agency: "NASA",
    kind: "space-telescope",
    status: "upcoming",
    launch: "2040s",
    target: "Sun-Earth L2",
    summary:
      "6-m UV/optical/IR flagship targeting biosignatures on ~25 nearby Earth-like exoplanets. Decadal Survey 2020 top recommendation; in early formulation.",
    link: "https://science.nasa.gov/astrophysics/programs/habitable-worlds-observatory/",
  },

  // ─── Active solar / heliospheric ─────────────────────────────────
  {
    id: "psp",
    name: "Parker Solar Probe",
    agency: "NASA",
    kind: "solar",
    status: "active",
    launch: "2018-08-12",
    target: "Sun (perihelion 9 R☉)",
    summary:
      "First spacecraft to 'touch' the Sun. Multiple Venus gravity assists shrink perihelion; first crossed the Alfvén surface 2021. Direct sampling of the corona.",
    link: "https://parkersolarprobe.jhuapl.edu",
  },
  {
    id: "solar-orbiter",
    name: "Solar Orbiter",
    agency: "ESA",
    kind: "solar",
    status: "active",
    launch: "2020-02-10",
    target: "Sun (perihelion 0.28 AU)",
    summary:
      "Complementary perspective to Parker — closer than Mercury, with imaging instruments. First polar-region images of the Sun.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter",
  },
  {
    id: "soho",
    name: "SOHO",
    agency: "Multi-agency",
    kind: "solar",
    status: "extended",
    launch: "1995-12-02",
    target: "Sun-Earth L1",
    summary:
      "ESA/NASA solar workhorse. The white-light coronagraph LASCO has discovered 5,000+ comets — more comets than any other instrument in history.",
    link: "https://soho.nascom.nasa.gov",
  },
  {
    id: "sdo",
    name: "SDO · Solar Dynamics Observatory",
    agency: "NASA",
    kind: "solar",
    status: "active",
    launch: "2010-02-11",
    target: "Geosynchronous orbit",
    summary:
      "Full-disk Sun every 12 seconds across 10 EUV channels. 1 TB/day downlink. Defines space-weather situational awareness for the modern era.",
    link: "https://sdo.gsfc.nasa.gov",
  },

  // ─── Active planetary / interplanetary ──────────────────────────
  {
    id: "voyager-1",
    name: "Voyager 1",
    agency: "NASA",
    kind: "deep-space",
    status: "active",
    launch: "1977-09-05",
    target: "Interstellar space (165 AU+)",
    summary:
      "First human-made object in interstellar space (2012). Powered by RTGs; instruments shut down progressively. Will operate until ~2030. The Golden Record is its passenger.",
    link: "https://voyager.jpl.nasa.gov",
  },
  {
    id: "voyager-2",
    name: "Voyager 2",
    agency: "NASA",
    kind: "deep-space",
    status: "active",
    launch: "1977-08-20",
    target: "Interstellar space (140 AU+)",
    summary:
      "Only spacecraft to visit Uranus (1986) and Neptune (1989). Crossed the heliopause 2018. Still returning plasma-wave data.",
    link: "https://voyager.jpl.nasa.gov",
  },
  {
    id: "new-horizons",
    name: "New Horizons",
    agency: "NASA",
    kind: "deep-space",
    status: "active",
    launch: "2006-01-19",
    target: "Kuiper Belt (~60 AU)",
    summary:
      "Pluto flyby July 2015 — first close-up of Pluto and Charon. Arrokoth flyby January 2019 (most distant body ever visited). Now mapping the Kuiper Belt's outer reaches.",
    link: "https://www.nasa.gov/mission/new-horizons/",
  },
  {
    id: "juno",
    name: "Juno",
    agency: "NASA",
    kind: "planetary",
    status: "extended",
    launch: "2011-08-05",
    target: "Jupiter (polar orbit)",
    summary:
      "Polar-orbiting Jupiter mission. Found a 'dilute core', deep ammonia bands, polar cyclone clusters. Mission extended through 2025 with Ganymede + Europa flybys.",
    link: "https://www.missionjuno.swri.edu",
  },
  {
    id: "perseverance",
    name: "Perseverance / Ingenuity",
    agency: "NASA",
    kind: "planetary",
    status: "active",
    launch: "2020-07-30",
    target: "Mars (Jezero Crater)",
    summary:
      "Caching rock samples for the planned Mars Sample Return. Ingenuity flew 72 powered flights — first aircraft on another planet — before retirement in 2024.",
    link: "https://mars.nasa.gov/mars2020/",
  },
  {
    id: "curiosity",
    name: "Curiosity",
    agency: "NASA",
    kind: "planetary",
    status: "extended",
    launch: "2011-11-26",
    target: "Mars (Gale Crater)",
    summary:
      "Nuclear-powered rover climbing Mt. Sharp. Confirmed ancient habitability; detected complex organics and seasonal methane variations.",
    link: "https://mars.nasa.gov/msl/",
  },
  {
    id: "bepi-colombo",
    name: "BepiColombo",
    agency: "Multi-agency",
    kind: "planetary",
    status: "active",
    launch: "2018-10-20",
    target: "Mercury (orbit insertion 2026)",
    summary:
      "ESA + JAXA two-spacecraft stack en route to Mercury. Most complex inner-system gravity-assist trajectory ever flown.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/BepiColombo",
  },
  {
    id: "juice",
    name: "JUICE · Jupiter Icy Moons Explorer",
    agency: "ESA",
    kind: "planetary",
    status: "active",
    launch: "2023-04-14",
    target: "Ganymede orbit (2034)",
    summary:
      "Will become the first spacecraft to orbit a moon of another planet. Mission focus: liquid-water oceans inside Ganymede, Callisto, and Europa.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Juice",
  },
  {
    id: "lucy",
    name: "Lucy",
    agency: "NASA",
    kind: "asteroid-comet",
    status: "active",
    launch: "2021-10-16",
    target: "Jupiter Trojan asteroids",
    summary:
      "12-year tour of Trojan asteroids in Jupiter's L4/L5 swarms — pristine samples of the outer-solar-system material that formed the giant planets.",
    link: "https://www.nasa.gov/mission/lucy/",
  },
  {
    id: "osiris-apex",
    name: "OSIRIS-APEX",
    agency: "NASA",
    kind: "asteroid-comet",
    status: "active",
    launch: "2016-09-08",
    target: "Apophis (2029 encounter)",
    summary:
      "Extended mission of OSIRIS-REx (which delivered Bennu samples in 2023). Will rendezvous with Apophis after its historic close Earth approach in April 2029.",
    link: "https://www.asteroidmission.org",
  },
  {
    id: "dart",
    name: "DART · Double Asteroid Redirection Test",
    agency: "NASA",
    kind: "asteroid-comet",
    status: "historical",
    launch: "2021-11-24",
    endDate: "2022-09-26",
    target: "Dimorphos (Didymos system)",
    summary:
      "First planetary-defense kinetic-impactor test. Shortened Dimorphos's orbit by 33 minutes — proof that humanity can deflect a hazardous asteroid.",
    link: "https://www.nasa.gov/planetarydefense/dart/",
  },
  {
    id: "hera",
    name: "Hera",
    agency: "ESA",
    kind: "asteroid-comet",
    status: "active",
    launch: "2024-10-07",
    target: "Didymos / Dimorphos (2026)",
    summary:
      "Post-DART forensic mission. Will map the crater DART left and measure Dimorphos's exact mass to calibrate kinetic-impactor models.",
    link: "https://www.heramission.space",
  },
  {
    id: "europa-clipper",
    name: "Europa Clipper",
    agency: "NASA",
    kind: "planetary",
    status: "active",
    launch: "2024-10-14",
    target: "Europa flybys (2030+)",
    summary:
      "Nearly 50 close passes of Europa's icy shell to map its subsurface ocean. Largest interplanetary spacecraft NASA has ever built.",
    link: "https://europa.nasa.gov",
  },
  {
    id: "dragonfly",
    name: "Dragonfly",
    agency: "NASA",
    kind: "planetary",
    status: "upcoming",
    launch: "2028-07",
    target: "Titan (arrival 2034)",
    summary:
      "Quadcopter that will hop across Titan's dunes and impact craters, sampling prebiotic chemistry in the densest atmosphere outside Venus.",
    link: "https://dragonfly.jhuapl.edu",
  },
  {
    id: "mars-sample-return",
    name: "Mars Sample Return",
    agency: "Multi-agency",
    kind: "planetary",
    status: "upcoming",
    launch: "2030s",
    target: "Mars + Earth return",
    summary:
      "NASA/ESA program to retrieve the cached Perseverance samples and return them to Earth. Architecture being re-baselined after 2024 review.",
    link: "https://mars.nasa.gov/msr/",
  },

  // ─── Lunar / Artemis ─────────────────────────────────────────────
  {
    id: "artemis-i",
    name: "Artemis I",
    agency: "NASA",
    kind: "lunar",
    status: "historical",
    launch: "2022-11-16",
    endDate: "2022-12-11",
    target: "Lunar distant retrograde orbit",
    summary:
      "Uncrewed test flight of SLS + Orion. Demonstrated lunar transfer, free-return, and entry profile at 11 km/s for the upcoming crewed Artemis II.",
    link: "https://www.nasa.gov/mission/artemis-i/",
  },
  {
    id: "artemis-ii",
    name: "Artemis II",
    agency: "NASA",
    kind: "lunar",
    status: "upcoming",
    launch: "2026-04",
    target: "Lunar flyby (crewed)",
    summary:
      "First crewed Moon flyby since Apollo 17 (1972). Four astronauts on a free-return trajectory testing Orion's life support before Artemis III lands.",
    link: "https://www.nasa.gov/mission/artemis-ii/",
  },
  {
    id: "artemis-iii",
    name: "Artemis III",
    agency: "NASA",
    kind: "lunar",
    status: "upcoming",
    launch: "2027-09",
    target: "Lunar south pole",
    summary:
      "First crewed lunar landing of the 21st century. SpaceX Starship HLS lands two astronauts at a south-pole site near water-ice deposits.",
    link: "https://www.nasa.gov/mission/artemis-iii/",
  },
  {
    id: "chang-e-6",
    name: "Chang'e 6",
    agency: "CNSA",
    kind: "lunar",
    status: "historical",
    launch: "2024-05-03",
    endDate: "2024-06-25",
    target: "Lunar far side (South Pole-Aitken)",
    summary:
      "First sample return from the far side of the Moon. Returned ~1.9 kg from the South Pole-Aitken basin — ancient impact-melt material 4.2 Gyr old.",
    link: "https://en.wikipedia.org/wiki/Chang%27e_6",
  },
  {
    id: "chandrayaan-3",
    name: "Chandrayaan-3 · Vikram + Pragyan",
    agency: "ISRO",
    kind: "lunar",
    status: "historical",
    launch: "2023-07-14",
    endDate: "2023-09-04",
    target: "Lunar south pole",
    summary:
      "First successful landing near the lunar south pole. Pragyan rover detected sulfur and confirmed elemental composition expected at a polar landing site.",
    link: "https://www.isro.gov.in/Chandrayaan3.html",
  },
  {
    id: "slim",
    name: "SLIM · Smart Lander for Investigating Moon",
    agency: "JAXA",
    kind: "lunar",
    status: "historical",
    launch: "2023-09-06",
    endDate: "2024-08-23",
    target: "Lunar Shioli crater",
    summary:
      "First Japanese lunar lander. Achieved precision landing within 100 m of its target (vs the usual ~kilometers). Landed nose-down but still functioning.",
    link: "https://global.jaxa.jp/projects/sas/slim/",
  },

  // ─── Human spaceflight ───────────────────────────────────────────
  {
    id: "iss",
    name: "International Space Station",
    agency: "Multi-agency",
    kind: "human-spaceflight",
    status: "active",
    launch: "1998-11-20",
    target: "LEO (~400 km)",
    summary:
      "Continuously crewed since November 2000. NASA + Roscosmos + ESA + JAXA + CSA. Planned deorbit 2030 via a SpaceX-built USDV deorbit vehicle.",
    link: "https://www.nasa.gov/international-space-station/",
  },
  {
    id: "tiangong",
    name: "Tiangong Space Station",
    agency: "CNSA",
    kind: "human-spaceflight",
    status: "active",
    launch: "2021-04-29",
    target: "LEO (~389 km)",
    summary:
      "China's first long-duration crewed station. Three-module T-shape. Crews of 3 rotate every ~6 months on Shenzhou ferries.",
    link: "https://en.wikipedia.org/wiki/Tiangong_space_station",
  },
  {
    id: "crew-dragon",
    name: "Crew Dragon",
    agency: "SpaceX",
    kind: "human-spaceflight",
    status: "active",
    launch: "2020-05-30",
    target: "LEO / ISS / private orbital",
    summary:
      "First U.S. commercially-operated crewed spacecraft. NASA Commercial Crew Program + private flights (Inspiration4, Axiom missions, Polaris Dawn).",
    link: "https://www.spacex.com/vehicles/dragon/",
  },
  {
    id: "starliner",
    name: "Boeing Starliner CST-100",
    agency: "NASA",
    kind: "human-spaceflight",
    status: "active",
    launch: "2024-06-05",
    target: "LEO / ISS",
    summary:
      "Boeing's NASA Commercial Crew vehicle. The 2024 Crew Flight Test returned uncrewed due to thruster issues; crew returned via Crew Dragon. Status: under review.",
    link: "https://www.boeing.com/space/starliner/",
  },
  {
    id: "starship",
    name: "Starship",
    agency: "SpaceX",
    kind: "commercial",
    status: "active",
    launch: "2023-04-20",
    target: "Orbital / Mars / lunar HLS",
    summary:
      "Largest rocket ever flown. Fully-reusable two-stage architecture. Multiple successful catches of the Super Heavy booster by the launch tower (Mechazilla).",
    link: "https://www.spacex.com/vehicles/starship/",
  },

  // ─── Iconic historical ────────────────────────────────────────────
  {
    id: "apollo-11",
    name: "Apollo 11",
    agency: "NASA",
    kind: "lunar",
    status: "historical",
    launch: "1969-07-16",
    endDate: "1969-07-24",
    target: "Lunar Mare Tranquillitatis",
    summary:
      "First crewed lunar landing. Armstrong + Aldrin walked on the surface for 2 hours 32 minutes. Returned 21.5 kg of lunar rock.",
    link: "https://www.nasa.gov/mission/apollo-11/",
  },
  {
    id: "galileo",
    name: "Galileo",
    agency: "NASA",
    kind: "planetary",
    status: "historical",
    launch: "1989-10-18",
    endDate: "2003-09-21",
    target: "Jupiter (orbiter + atmospheric probe)",
    summary:
      "Discovered subsurface oceans on Europa, Ganymede, Callisto. Watched Comet Shoemaker-Levy 9 hit Jupiter in 1994. Intentionally crashed into Jupiter to protect Europa.",
    link: "https://solarsystem.nasa.gov/missions/galileo/",
  },
  {
    id: "cassini",
    name: "Cassini-Huygens",
    agency: "Multi-agency",
    kind: "planetary",
    status: "historical",
    launch: "1997-10-15",
    endDate: "2017-09-15",
    target: "Saturn system",
    summary:
      "13 years orbiting Saturn. Huygens probe landed on Titan (2005). Found cryovolcanic jets on Enceladus venting an ocean to space. Grand Finale: 22 dives between Saturn and its rings.",
    link: "https://solarsystem.nasa.gov/missions/cassini/",
  },
  {
    id: "rosetta",
    name: "Rosetta + Philae",
    agency: "ESA",
    kind: "asteroid-comet",
    status: "historical",
    launch: "2004-03-02",
    endDate: "2016-09-30",
    target: "Comet 67P/Churyumov-Gerasimenko",
    summary:
      "First spacecraft to orbit and land on a comet. Philae bounced and ended up wedged in a crack; Rosetta crashed onto 67P at end-of-mission. Detected glycine and phosphorus.",
    link: "https://www.esa.int/Science_Exploration/Space_Science/Rosetta",
  },
  {
    id: "spirit-opportunity",
    name: "Spirit + Opportunity (MER)",
    agency: "NASA",
    kind: "planetary",
    status: "historical",
    launch: "2003-06-10",
    endDate: "2018-06-10",
    target: "Mars (Gusev Crater / Meridiani Planum)",
    summary:
      "Twin rovers designed for 90 Martian days each. Spirit lasted 7 years, Opportunity 15. Found definitive evidence of past liquid water on Mars.",
    link: "https://mars.nasa.gov/mer/",
  },
  {
    id: "kepler",
    name: "Kepler / K2",
    agency: "NASA",
    kind: "exoplanet",
    status: "historical",
    launch: "2009-03-07",
    endDate: "2018-10-30",
    target: "Earth-trailing heliocentric",
    summary:
      "Stared at 150,000 stars in Cygnus to find Earth-sized transits. 2,800+ confirmed exoplanets. Reaction-wheel failure 2013; reborn as K2 ecliptic survey.",
    link: "https://www.nasa.gov/mission/kepler/",
  },
  {
    id: "wmap",
    name: "WMAP",
    agency: "NASA",
    kind: "space-telescope",
    status: "historical",
    launch: "2001-06-30",
    endDate: "2010-09-08",
    target: "Sun-Earth L2",
    summary:
      "Mapped the cosmic microwave background to 14% precision. Pinned the age of the universe at 13.77 Gyr; founded ΛCDM precision cosmology.",
    link: "https://wmap.gsfc.nasa.gov",
  },
  {
    id: "planck",
    name: "Planck",
    agency: "ESA",
    kind: "space-telescope",
    status: "historical",
    launch: "2009-05-14",
    endDate: "2013-10-23",
    target: "Sun-Earth L2",
    summary:
      "Refined CMB maps to a precision WMAP couldn't reach. Set the modern values: Hubble constant 67.4 km/s/Mpc (in tension with local SH0ES); 26.8% dark matter; 68.2% dark energy.",
    link: "https://www.cosmos.esa.int/web/planck",
  },
  {
    id: "spitzer",
    name: "Spitzer Space Telescope",
    agency: "NASA",
    kind: "space-telescope",
    status: "historical",
    launch: "2003-08-25",
    endDate: "2020-01-30",
    target: "Earth-trailing heliocentric",
    summary:
      "Cryogenic infrared observatory. Discovered the largest Saturn ring (the Phoebe Ring) and confirmed TRAPPIST-1's 7-planet system.",
    link: "https://www.spitzer.caltech.edu",
  },
  {
    id: "herschel",
    name: "Herschel Space Observatory",
    agency: "ESA",
    kind: "space-telescope",
    status: "historical",
    launch: "2009-05-14",
    endDate: "2013-04-29",
    target: "Sun-Earth L2",
    summary:
      "Largest space telescope at launch (3.5 m). Far-IR and submm survey of cold dust and star-forming regions. Confirmed water in Saturn's plumes.",
    link: "https://sci.esa.int/web/herschel",
  },
];

export function missionsByStatus(status: MissionEntry["status"]): MissionEntry[] {
  return MISSIONS_CATALOG.filter((m) => m.status === status);
}

export function missionsByAgency(agency: Agency): MissionEntry[] {
  return MISSIONS_CATALOG.filter((m) => m.agency === agency);
}

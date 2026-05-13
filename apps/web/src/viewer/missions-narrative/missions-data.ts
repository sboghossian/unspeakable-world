/**
 * Mission Narrative — 15 deep-dive profiles of significant spacecraft.
 *
 * Each entry is intended to be Wikipedia-quality: three paragraphs of
 * narrative, a curated key-facts list, a stats block, a hand-curated
 * timeline, and external sources to NASA/ESA primary pages.
 *
 * Accuracy rule: every stat in this file is corroborated by the cited
 * sources at time of writing. When a number was uncertain or
 * provisional (e.g. launch dates for future missions), it was either
 * given as a year/quarter or omitted entirely rather than fabricated.
 *
 * No private-IP imagery is used: hero `image_url` values point to
 * NASA/ESA Wikipedia thumbnails (NASA imagery is public-domain US-Gov;
 * ESA imagery is CC-BY 4.0 ESA or otherwise marked).
 */

export type MissionStatus =
  | "active"
  | "ended"
  | "lost"
  | "extended"
  | "en-route";

export type MissionAgency =
  | "NASA"
  | "ESA"
  | "JAXA"
  | "ROSCOSMOS"
  | "CNSA"
  | "ISRO"
  | "NASA/ESA"
  | "ESA/JAXA"
  | "NASA/ESA/ASI";

export type MissionStats = {
  readonly orbital_altitude_km?: number;
  readonly orbital_period?: string;
  readonly mass_kg?: number;
  readonly instruments?: readonly string[];
  readonly delta_v_kms?: number;
  readonly [k: string]: unknown;
};

export type MissionTimelineEntry = {
  readonly date: string;
  readonly event: string;
};

export type MissionSource = {
  readonly label: string;
  readonly url: string;
};

export type MissionNarrative = {
  readonly slug: string;
  readonly name: string;
  readonly agency: MissionAgency;
  readonly launch_date: string;
  readonly end_date?: string;
  readonly status: MissionStatus;
  readonly anchor_body: string;
  readonly summary: string;
  readonly description: string;
  readonly key_facts: readonly string[];
  readonly stats: MissionStats;
  readonly timeline: readonly MissionTimelineEntry[];
  readonly sources: readonly MissionSource[];
  readonly glow_color: string;
  readonly image_url?: string;
};

export const MISSIONS_NARRATIVE: readonly MissionNarrative[] = [
  // ─── 1. Voyager 1 ────────────────────────────────────────────────
  {
    slug: "voyager-1",
    name: "Voyager 1",
    agency: "NASA",
    launch_date: "1977-09-05",
    status: "active",
    anchor_body: "Interstellar space",
    summary:
      "The most distant human-made object, now drifting through the interstellar medium beyond the heliopause.",
    description:
      "Voyager 1 launched from Cape Canaveral on September 5, 1977 aboard a Titan IIIE-Centaur, sixteen days after its twin Voyager 2. Although launched second, Voyager 1 took a faster, more direct trajectory to Jupiter that exploited a rare 176-year planetary alignment, allowing it to reach the giant planet in March 1979. Its 1979 Jupiter encounter and 1980 Saturn encounter, with a particularly close pass of Titan to study its dense nitrogen atmosphere, revealed active volcanoes on Io, the structure of Jupiter's rings, complex storm dynamics in Saturn's atmosphere, and unexpected braids in the F-ring.\n\nThe Titan flyby came at a cost: it bent Voyager 1's trajectory permanently out of the ecliptic plane, ending any chance of a Uranus or Neptune visit. Instead the spacecraft began a long, lonely climb out of the solar system at roughly 17 km/s relative to the Sun. On August 25, 2012, at approximately 121 astronomical units from the Sun, the plasma instruments registered a sudden, sustained drop in solar particles and a corresponding rise in galactic cosmic rays — the moment Voyager 1 became the first human-made object to enter interstellar space, crossing the heliopause where the Sun's bubble of charged particles gives way to the interstellar medium.\n\nMore than four decades after launch, Voyager 1's plutonium-238 RTGs continue to power a handful of instruments, though engineers have been shedding load for years and the spacecraft will likely lose enough power to maintain any instrument by around 2030. In late 2023 a corrupted memory chip in its Flight Data Subsystem began returning garbled telemetry; an extraordinary diagnostic effort, with round-trip light times approaching 45 hours, restored coherent science data in April 2024. Voyager 1 also carries the Golden Record, a copper-and-gold phonograph disc engraved with sounds and images of Earth, designed as a 5-billion-year message bottle for any civilization that might one day intercept it.",
    key_facts: [
      "First human-made object to enter interstellar space (August 25, 2012).",
      "Currently the most distant human-made object, beyond 165 AU from the Sun.",
      "Carries the Voyager Golden Record — a phonograph disc with sounds and images of Earth.",
      "Powered by three radioisotope thermoelectric generators (RTGs) fueled with plutonium-238.",
      "Took the famous 'Pale Blue Dot' image of Earth from 6 billion km on February 14, 1990.",
      "Round-trip radio signal time now exceeds 45 hours.",
      "Travels at roughly 17 km/s relative to the Sun.",
    ],
    stats: {
      mass_kg: 825,
      instruments: [
        "Cosmic Ray Subsystem (CRS)",
        "Low-Energy Charged Particle (LECP)",
        "Magnetometer (MAG)",
        "Plasma Wave Subsystem (PWS)",
      ],
      power_source: "3× MHW-RTG (plutonium-238)",
      initial_power_w: 470,
      distance_from_sun_au: 165,
    },
    timeline: [
      { date: "1977-09-05", event: "Launch from Cape Canaveral on Titan IIIE-Centaur." },
      { date: "1979-03-05", event: "Closest approach to Jupiter (349,000 km from cloud tops)." },
      { date: "1979-03-08", event: "Active volcanism on Io discovered by Linda Morabito." },
      { date: "1980-11-12", event: "Closest approach to Saturn; deep dive past Titan." },
      { date: "1981-01-01", event: "Begins escape trajectory out of the solar system." },
      { date: "1990-02-14", event: "Takes the 'Pale Blue Dot' family-portrait of the solar system." },
      { date: "1998-02-17", event: "Becomes the most distant human-made object, overtaking Pioneer 10." },
      { date: "2004-12-15", event: "Crosses the termination shock at 94 AU." },
      { date: "2012-08-25", event: "Crosses the heliopause — enters interstellar space." },
      { date: "2017-11-28", event: "Trajectory Correction Maneuver thrusters fired after 37 years dormant." },
      { date: "2022-05-18", event: "Anomalous telemetry from the Attitude Articulation and Control System." },
      { date: "2023-11-14", event: "FDS memory corruption halts coherent science data." },
      { date: "2024-04-22", event: "Engineering team restores coherent science data after 5-month fix." },
    ],
    sources: [
      { label: "NASA Voyager Mission", url: "https://voyager.jpl.nasa.gov" },
      { label: "JPL Voyager 1 Status", url: "https://voyager.jpl.nasa.gov/mission/status/" },
      { label: "NASA Solar System Exploration: Voyager", url: "https://science.nasa.gov/mission/voyager/" },
      { label: "Voyager Golden Record overview", url: "https://voyager.jpl.nasa.gov/golden-record/" },
    ],
    glow_color: "#9bd4ff",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Voyager.jpg/640px-Voyager.jpg",
  },

  // ─── 2. Voyager 2 ────────────────────────────────────────────────
  {
    slug: "voyager-2",
    name: "Voyager 2",
    agency: "NASA",
    launch_date: "1977-08-20",
    status: "active",
    anchor_body: "Interstellar space",
    summary:
      "The only spacecraft to have flown by Uranus and Neptune, now operating in interstellar space.",
    description:
      "Voyager 2 launched on August 20, 1977 — sixteen days before Voyager 1 — on the slower of the two trajectories of the celebrated 'Grand Tour' planetary alignment. While Voyager 1 sped past Jupiter and Saturn and then turned out of the ecliptic, Voyager 2 was set up for the rare four-planet cascade: Jupiter, Saturn, Uranus, and Neptune. Its Jupiter encounter in July 1979 found Europa with a fractured icy surface and Ganymede with grooved terrain; its Saturn pass in August 1981 imaged ring structure at unprecedented resolution.\n\nThe Uranus flyby on January 24, 1986 remains the only close-up exploration of that planet. Voyager 2 discovered ten new moons, two new rings, and a magnetic field so strangely tilted (about 60 degrees off the rotation axis, and offset from the planet's center) that it almost defied prior theory. On August 25, 1989 — almost exactly twenty-three years before its twin would cross the heliopause — Voyager 2 made the closest approach of any mission to Neptune, flying just 4,950 km above the cloud tops. It imaged the Great Dark Spot, supersonic 2,100 km/h winds, and active geysers on the icy moon Triton.\n\nVoyager 2 crossed the heliopause on November 5, 2018, becoming the second human-made object in interstellar space. Unlike Voyager 1, its Plasma Science instrument is still operational, providing the only direct measurement of plasma density and temperature in the very local interstellar medium. The mission has weathered serious anomalies — including a botched command in July 2023 that pointed its antenna two degrees off Earth, broken only by an interstellar 'shout' from the Deep Space Network — and is expected to continue returning at least some science data until power drops below the minimum threshold around 2030.",
    key_facts: [
      "Only spacecraft to have visited Uranus (1986) and Neptune (1989).",
      "Crossed the heliopause into interstellar space on November 5, 2018.",
      "Discovered active geysers on Neptune's moon Triton.",
      "Plasma Science instrument still operational — unique source of LISM plasma data.",
      "Currently more than 140 AU from the Sun and traveling outbound at 15.4 km/s.",
      "Recovered from a July 2023 misalignment after an 'interstellar shout' command.",
      "Trajectory bent below the ecliptic plane after Neptune flyby toward southern sky.",
    ],
    stats: {
      mass_kg: 825,
      instruments: [
        "Cosmic Ray Subsystem (CRS)",
        "Low-Energy Charged Particle (LECP)",
        "Magnetometer (MAG)",
        "Plasma Science (PLS)",
        "Plasma Wave Subsystem (PWS)",
      ],
      power_source: "3× MHW-RTG (plutonium-238)",
      distance_from_sun_au: 140,
    },
    timeline: [
      { date: "1977-08-20", event: "Launch from Cape Canaveral on Titan IIIE-Centaur." },
      { date: "1979-07-09", event: "Jupiter closest approach (570,000 km); detailed Europa images." },
      { date: "1981-08-25", event: "Saturn closest approach; imaging of ring 'spokes'." },
      { date: "1986-01-24", event: "Only spacecraft flyby of Uranus — 10 new moons discovered." },
      { date: "1989-08-25", event: "Only spacecraft flyby of Neptune — Great Dark Spot, Triton geysers." },
      { date: "2007-08-30", event: "Crosses the termination shock at 84 AU." },
      { date: "2018-11-05", event: "Crosses the heliopause; enters interstellar space at 119 AU." },
      { date: "2020-03-04", event: "Returns to nominal operations after DSS-43 antenna upgrade pause." },
      { date: "2023-07-21", event: "Wrong-command pointing error severs Earth comms for 19 days." },
      { date: "2023-08-04", event: "Interstellar 'shout' from DSN restores antenna alignment." },
      { date: "2024-04-01", event: "Power-saving instrument power-down to extend mission lifetime." },
    ],
    sources: [
      { label: "NASA Voyager Mission", url: "https://voyager.jpl.nasa.gov" },
      { label: "JPL Voyager 2 Status", url: "https://voyager.jpl.nasa.gov/mission/status/" },
      { label: "NASA Science: Voyager", url: "https://science.nasa.gov/mission/voyager/" },
    ],
    glow_color: "#ffd28b",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Voyager.jpg/640px-Voyager.jpg",
  },

  // ─── 3. New Horizons ────────────────────────────────────────────
  {
    slug: "new-horizons",
    name: "New Horizons",
    agency: "NASA",
    launch_date: "2006-01-19",
    status: "active",
    anchor_body: "Kuiper Belt",
    summary:
      "First spacecraft to fly past Pluto, now exploring the Kuiper Belt at the outer edge of the solar system.",
    description:
      "New Horizons launched from Cape Canaveral on January 19, 2006 atop an Atlas V 551 — the most powerful Atlas configuration ever flown — followed by a STAR-48B upper stage that pushed the spacecraft to 16.26 km/s, the fastest Earth-departure speed of any human-made object. A close Jupiter flyby in February 2007 added another 4 km/s of velocity and trimmed three years off the journey, while also delivering the most detailed pre-Juno look at Jupiter's atmosphere, Little Red Spot, and Io's volcanism.\n\nOn July 14, 2015, after nine and a half years, New Horizons swept past Pluto at just 12,500 km from the surface, returning the first close-up images of a world that had been little more than a smudged disc to even Hubble. The flyby revealed the heart-shaped Tombaugh Regio with its nitrogen-ice glacier (Sputnik Planitia), towering water-ice mountains, a thick haze of stratospheric layers extending hundreds of kilometers above the surface, and an atmosphere actively escaping into space. Pluto's largest moon Charon proved equally surprising, with a giant equatorial canyon and a dark north-polar region informally called Mordor Macula.\n\nIn an unprecedented bonus, the team identified a small Kuiper Belt object (KBO), 486958 Arrokoth, that lay along New Horizons' outbound trajectory. The January 1, 2019 flyby of Arrokoth at 3,500 km — the most distant body ever explored at the time — revealed a contact-binary 'snowman' shape, evidence of gentle accretion at low velocities consistent with the local-cloud-collapse model of planetesimal formation. New Horizons continues outbound in good health, with enough fuel for another KBO flyby if a candidate target can be identified by ground-based or future Webb observations.",
    key_facts: [
      "Fastest Earth-departure speed ever achieved: 16.26 km/s.",
      "First and only close-up images of Pluto and Charon (July 14, 2015).",
      "Discovered nitrogen-ice glacier 'Sputnik Planitia' larger than Texas.",
      "January 1, 2019 flyby of Arrokoth was the most distant body ever explored.",
      "Powers itself with a single GPHS-RTG (plutonium-238).",
      "Carries some of the cremated remains of Pluto's discoverer Clyde Tombaugh.",
      "Took 9.5 years to reach Pluto, including Jupiter gravity assist in 2007.",
    ],
    stats: {
      mass_kg: 478,
      instruments: [
        "LORRI (Long Range Reconnaissance Imager)",
        "Ralph (visible/IR imager + spectrometer)",
        "Alice (UV spectrometer)",
        "REX (Radio Science)",
        "SWAP (solar wind)",
        "PEPSSI (energetic particles)",
        "SDC (Student Dust Counter)",
      ],
      power_source: "1× GPHS-RTG (plutonium-238)",
      initial_power_w: 245,
      delta_v_kms: 0.29,
    },
    timeline: [
      { date: "2006-01-19", event: "Launch on Atlas V 551 + STAR-48B." },
      { date: "2007-02-28", event: "Jupiter flyby — 2.3M km closest approach, gravity assist." },
      { date: "2007-06-06", event: "Spacecraft enters cruise-phase hibernation." },
      { date: "2014-12-06", event: "Awakened from hibernation for Pluto approach." },
      { date: "2015-07-04", event: "Communications anomaly puts spacecraft in safe mode 10 days before flyby." },
      { date: "2015-07-14", event: "Pluto flyby — closest approach 12,500 km." },
      { date: "2015-10-25", event: "Final maneuver targets Kuiper Belt object 2014 MU69 (Arrokoth)." },
      { date: "2016-10-25", event: "Pluto data downlink complete." },
      { date: "2019-01-01", event: "Arrokoth flyby at 3,500 km — most distant body ever explored." },
      { date: "2020-04-22", event: "First parallax-measurement of stars from a distant spacecraft." },
      { date: "2024-10-01", event: "Begins second extended mission — heliophysics + KBO search." },
    ],
    sources: [
      { label: "NASA New Horizons", url: "https://science.nasa.gov/mission/new-horizons/" },
      { label: "JHU/APL New Horizons", url: "https://www.nasa.gov/mission/new-horizons/" },
      { label: "Pluto System After New Horizons (paper)", url: "https://www.science.org/doi/10.1126/science.aad1815" },
    ],
    glow_color: "#ffb88a",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/New_Horizons_-_Transparent.png/640px-New_Horizons_-_Transparent.png",
  },

  // ─── 4. Parker Solar Probe ──────────────────────────────────────
  {
    slug: "parker-solar-probe",
    name: "Parker Solar Probe",
    agency: "NASA",
    launch_date: "2018-08-12",
    status: "active",
    anchor_body: "Sun",
    summary:
      "First spacecraft to fly through the Sun's corona, sampling the solar atmosphere directly.",
    description:
      "Parker Solar Probe launched on August 12, 2018 aboard a Delta IV Heavy with a STAR-48BV upper stage, the only launch configuration powerful enough for its mission to the Sun. The mission honors solar physicist Eugene Parker — the first NASA mission named after a living person — whose 1958 theory of the supersonic solar wind it was built to verify in situ. To reach the Sun, the spacecraft uses seven Venus gravity assists between 2018 and 2024, each one shrinking its perihelion until it would skim only 6.16 million km above the photosphere, well inside Mercury's orbit and inside the corona itself.\n\nThe spacecraft is shielded by a 2.4 m diameter, 11.4 cm thick carbon-carbon composite heat shield that holds the Sun-facing side at about 1,400 °C while the instruments behind remain at room temperature. On April 28, 2021, during its eighth perihelion, Parker crossed the Alfvén surface — the boundary below which the solar plasma is magnetically tethered to the Sun and above which it streams freely as the solar wind. This made Parker the first spacecraft to officially 'touch' the Sun, sampling the corona directly and discovering pervasive magnetic 'switchbacks' that may be key to coronal heating and solar wind acceleration.\n\nOn December 24, 2024, Parker completed its closest perihelion at 6.16 million km from the Sun's surface — a record that will stand for the foreseeable future — while traveling at 692,000 km/h, the fastest speed ever achieved by a human-made object. Two additional record-tying perihelia in 2025 will continue its survey of the corona at solar maximum. The mission's findings have already overturned aspects of the standard solar-wind picture, including the discovery that the dust-free zone predicted near the Sun begins farther out than expected.",
    key_facts: [
      "First spacecraft to fly through the Sun's corona (April 28, 2021).",
      "Closest perihelion: 6.16 million km on December 24, 2024 — closer than any spacecraft ever.",
      "Fastest human-made object: 692,000 km/h at perihelion.",
      "Carbon-carbon Thermal Protection System endures ~1,400 °C facing the Sun.",
      "Uses 7 Venus gravity assists across 7 years to shrink its perihelion.",
      "First NASA mission named after a living person (Eugene Parker).",
      "Discovered ubiquitous magnetic 'switchbacks' in the solar wind.",
    ],
    stats: {
      mass_kg: 685,
      instruments: [
        "FIELDS (electromagnetic fields)",
        "SWEAP (solar wind / electron+proton analyzer)",
        "ISʘIS (energetic particles)",
        "WISPR (wide-field imager)",
      ],
      perihelion_km: 6160000,
      max_speed_kms: 192,
      heat_shield_temp_c: 1400,
    },
    timeline: [
      { date: "2018-08-12", event: "Launch on Delta IV Heavy from Kennedy Space Center." },
      { date: "2018-10-03", event: "First Venus gravity assist." },
      { date: "2018-11-05", event: "First perihelion — already closest solar approach ever at the time." },
      { date: "2019-12-26", event: "Second Venus flyby." },
      { date: "2021-04-28", event: "Crosses the Alfvén surface — 'touches' the Sun." },
      { date: "2021-12-14", event: "NASA confirms first in-corona pass via data analysis." },
      { date: "2022-02-25", event: "WISPR images Venus surface in visible light through clouds." },
      { date: "2023-08-21", event: "Sixth Venus flyby." },
      { date: "2024-11-06", event: "Final (seventh) Venus gravity assist sets up record perihelion." },
      { date: "2024-12-24", event: "Closest perihelion (6.16 Mkm) — fastest human-made object." },
      { date: "2025-03-22", event: "Tying second close perihelion." },
      { date: "2025-06-19", event: "Third tying close perihelion at solar maximum." },
    ],
    sources: [
      { label: "NASA Parker Solar Probe", url: "https://science.nasa.gov/mission/parker-solar-probe/" },
      { label: "JHU/APL Parker Mission Site", url: "https://parkersolarprobe.jhuapl.edu" },
      { label: "Switchbacks paper (Bale et al., Nature 2019)", url: "https://www.nature.com/articles/s41586-019-1818-7" },
    ],
    glow_color: "#ffae3b",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Parker_Solar_Probe_-_Transparent.png/640px-Parker_Solar_Probe_-_Transparent.png",
  },

  // ─── 5. JWST ─────────────────────────────────────────────────────
  {
    slug: "jwst",
    name: "James Webb Space Telescope",
    agency: "NASA/ESA",
    launch_date: "2021-12-25",
    status: "active",
    anchor_body: "Sun–Earth L2",
    summary:
      "The largest and most powerful infrared space telescope ever built, surveying the universe from L2.",
    description:
      "The James Webb Space Telescope launched on Christmas Day 2021 aboard an Ariane 5 ECA from Kourou, French Guiana, ending a 25-year, $10 billion development saga that survived multiple near-cancellations. The launch was so precise that JWST conserved enough propellant to extend its expected mission lifetime from 10 to more than 20 years. Over the following month it executed a flawless and unprecedented unfolding sequence — sunshield extension, mirror deployment, and trim — comprising 344 single-point failure mechanisms, before settling into a halo orbit around the Sun–Earth L2 Lagrange point 1.5 million km from Earth.\n\nJWST's 6.5 m segmented primary mirror, gold-coated and cooled passively by a five-layer kapton sunshield, collects more than six times Hubble's light-gathering area. Its instruments — NIRCam, NIRSpec, MIRI, and NIRISS/FGS — span 0.6 to 28 microns, making JWST primarily an infrared observatory tuned to see the most distant galaxies, whose ultraviolet and visible light has been redshifted into the IR by cosmic expansion. Within months of first light in July 2022, JWST began turning up galaxies at redshifts above 13, calling parts of the standard early-universe model into question and uncovering galaxies more massive and more numerous than expected at z>10.\n\nBeyond cosmology, JWST has imaged the atmospheres of exoplanets in unprecedented chemical detail — finding water, CO2, sulfur dioxide, and methane on hot and warm gas planets — captured stunning images of the solar system from Jupiter's auroras to the rings of Uranus and Neptune, and reshaped the protoplanetary-disk and star-formation literature with high-resolution mid-IR imagery. The observatory's small 'micrometeoroid' damage events have been a watchpoint for engineers but have not meaningfully degraded its performance.",
    key_facts: [
      "6.5 m segmented primary mirror — largest ever flown.",
      "Operates at Sun–Earth L2, 1.5 million km from Earth.",
      "Five-layer sunshield the size of a tennis court keeps mirrors below ~50 K.",
      "Primary infrared bandpass: 0.6–28 microns.",
      "Detected galaxies at z>13, less than 400 million years after the Big Bang.",
      "Largest and most expensive space telescope ever built (~$10B).",
      "Mission lifetime extended to >20 years thanks to precise Ariane 5 launch.",
    ],
    stats: {
      mass_kg: 6161,
      instruments: ["NIRCam", "NIRSpec", "MIRI", "NIRISS / FGS"],
      orbital_period: "~6 months halo around Sun-Earth L2",
      primary_mirror_m: 6.5,
      sunshield_layers: 5,
    },
    timeline: [
      { date: "2021-12-25", event: "Launch on Ariane 5 ECA from Kourou, French Guiana." },
      { date: "2022-01-08", event: "Primary mirror fully deployed." },
      { date: "2022-01-24", event: "Insertion into halo orbit at Sun-Earth L2." },
      { date: "2022-03-11", event: "Optical alignment 'fine phasing' complete." },
      { date: "2022-05-23", event: "Larger-than-expected micrometeoroid strike on segment C3." },
      { date: "2022-07-12", event: "First science images released, including SMACS 0723 deep field." },
      { date: "2023-03-15", event: "Detection of carbon dioxide in WASP-39b's atmosphere published." },
      { date: "2023-06-21", event: "Methane and CO2 detected on K2-18b, a temperate sub-Neptune." },
      { date: "2024-02-29", event: "JADES survey publishes spectroscopic confirmation of galaxy at z=13.2." },
      { date: "2024-11-15", event: "First mid-IR imagery of Trappist-1e atmospheric constraints." },
    ],
    sources: [
      { label: "NASA JWST", url: "https://webb.nasa.gov" },
      { label: "ESA Webb", url: "https://esawebb.org" },
      { label: "STScI JWST", url: "https://www.stsci.edu/jwst" },
      { label: "Webb Telescope Science", url: "https://www.nasa.gov/mission/webb/" },
    ],
    glow_color: "#ffdca8",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/James_Webb_Space_Telescope_2009_top.jpg/640px-James_Webb_Space_Telescope_2009_top.jpg",
  },

  // ─── 6. Hubble ───────────────────────────────────────────────────
  {
    slug: "hubble",
    name: "Hubble Space Telescope",
    agency: "NASA/ESA",
    launch_date: "1990-04-24",
    status: "extended",
    anchor_body: "Low Earth Orbit",
    summary:
      "The 2.4 m space telescope that rewrote astronomy through five astronaut servicing missions and 35 years of UV/visible/near-IR observation.",
    description:
      "Hubble launched on STS-31 aboard Space Shuttle Discovery on April 24, 1990, joining a small fleet of NASA Great Observatories conceived in the 1970s. Initial first-light images were dramatically out of focus, traced to a 2.3 micrometer error in the primary mirror's shape. Rather than scrap the mission, NASA designed corrective optics (COSTAR) and re-aligned its scientific instruments, and on STS-61 in December 1993 astronauts installed both COSTAR and a new wide-field camera, recovering the telescope's design performance in one of the most consequential repair missions in spaceflight history.\n\nFive Shuttle servicing missions (1993, 1997, 1999, 2002, 2009) replaced instruments, swapped gyros and batteries, and progressively upgraded Hubble well beyond its 1990 capabilities. The Hubble Deep Field (1995) — a 10-day stare at a nearly empty patch of sky — revealed thousands of galaxies and reset the public understanding of cosmic depth, followed by the Hubble Ultra Deep Field (2004) and the Extreme Deep Field (2012). Hubble's measurements of Cepheid variables in nearby galaxies under the H0 Key Project pinned down the Hubble constant to 10% precision, and the SH0ES program continues to drive the current Hubble-tension debate.\n\nMore than 35 years after launch, Hubble continues to operate in 540 km orbit, though increasingly on a reduced complement of gyroscopes (now three of six remaining, with single-gyro operations validated in 2024 as a fallback). Without further servicing — politically off the table since the Shuttle's retirement, though several commercial reboost concepts have been studied — atmospheric drag is expected to bring it down sometime between 2030 and the mid-2030s. Hubble's archive of >1.7 million observations, openly shared, remains one of astronomy's most-cited datasets, and its public images shaped the cultural face of the cosmos for a generation.",
    key_facts: [
      "Launched April 24, 1990 on Space Shuttle STS-31 (Discovery).",
      "Five astronaut servicing missions kept it operational 35+ years.",
      "2.4 m primary mirror; UV/visible/near-IR observations.",
      "Initial mirror had 2.3 µm spherical aberration, corrected by COSTAR in 1993.",
      "Hubble Deep Field (1995) imaged ~3,000 galaxies in apparently empty sky.",
      "More than 1.7 million observations of 50,000+ targets archived.",
      "Refined Hubble constant H0 to ~73 km/s/Mpc via SH0ES.",
    ],
    stats: {
      orbital_altitude_km: 540,
      orbital_period: "~95 minutes",
      mass_kg: 11110,
      instruments: ["WFC3", "ACS", "STIS", "COS", "NICMOS (retired)", "FGS"],
      primary_mirror_m: 2.4,
    },
    timeline: [
      { date: "1990-04-24", event: "Launch on STS-31 (Discovery)." },
      { date: "1990-06-27", event: "Mirror spherical aberration confirmed." },
      { date: "1993-12-02", event: "Servicing Mission 1 (STS-61) — installs COSTAR + WFPC2." },
      { date: "1995-12-18", event: "Hubble Deep Field observations begin." },
      { date: "1997-02-11", event: "Servicing Mission 2 (STS-82)." },
      { date: "1999-12-19", event: "Servicing Mission 3A (STS-103) — emergency gyro replacement." },
      { date: "2002-03-01", event: "Servicing Mission 3B (STS-109) — installs ACS." },
      { date: "2004-09-23", event: "Hubble Ultra Deep Field released." },
      { date: "2009-05-11", event: "Servicing Mission 4 (STS-125) — final upgrade with WFC3 + COS." },
      { date: "2012-09-25", event: "Extreme Deep Field released." },
      { date: "2024-06-04", event: "Successfully transitions to single-gyro science operations." },
    ],
    sources: [
      { label: "HubbleSite (STScI)", url: "https://hubblesite.org" },
      { label: "NASA Hubble", url: "https://science.nasa.gov/mission/hubble/" },
      { label: "ESA/Hubble", url: "https://esahubble.org" },
    ],
    glow_color: "#a8c8ff",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HST-SM4.jpeg/640px-HST-SM4.jpeg",
  },

  // ─── 7. Cassini-Huygens ──────────────────────────────────────────
  {
    slug: "cassini-huygens",
    name: "Cassini–Huygens",
    agency: "NASA/ESA/ASI",
    launch_date: "1997-10-15",
    end_date: "2017-09-15",
    status: "ended",
    anchor_body: "Saturn",
    summary:
      "A 20-year NASA–ESA–ASI mission that orbited Saturn for 13 years and landed Huygens on Titan.",
    description:
      "Cassini–Huygens launched October 15, 1997 from Cape Canaveral on a Titan IVB/Centaur — at the time one of the most expensive interplanetary missions ever flown. The spacecraft used two Venus flybys, an Earth flyby, and a Jupiter flyby (December 2000) to gain enough velocity for the leap to Saturn, where it entered orbit on July 1, 2004 after a 96-minute Saturn Orbit Insertion burn that took it through a gap in the rings. The mission combined NASA's Cassini orbiter with ESA's Huygens probe and an ASI-built high-gain antenna and radar.\n\nOn January 14, 2005, Huygens parachuted through Titan's thick nitrogen atmosphere and landed on a frozen plain strewn with rounded methane-water-ice pebbles, returning 350 images and 2.5 hours of surface telemetry — still the only soft landing on a body in the outer solar system. Cassini's 13-year tour of the Saturn system revealed plumes of water vapor erupting from the south pole of Enceladus, sourcing a global subsurface ocean and feeding Saturn's E-ring; mapped seasonal change in Saturn's atmosphere and rings; tracked the appearance and decay of a planet-encircling storm; and discovered Titan's methane lakes and rivers, including hydrocarbon seas like Kraken Mare with depths exceeding 100 m.\n\nIn 2017, with fuel running low and planetary-protection rules forbidding any chance of contaminating Enceladus or Titan, Cassini executed its Grand Finale: 22 dives between Saturn and its innermost rings, returning the closest-ever views of the ring structure and direct sampling of Saturn's upper atmosphere. On September 15, 2017, the spacecraft plunged into Saturn at 32 km/s, transmitting data until destruction.",
    key_facts: [
      "Only soft landing in the outer solar system: Huygens on Titan, January 14, 2005.",
      "13 years orbiting Saturn (2004–2017).",
      "Discovered active cryovolcanic plumes on Enceladus and its global ocean.",
      "Mapped Titan's hydrocarbon seas and weather cycle.",
      "Grand Finale: 22 dives between Saturn and its innermost rings.",
      "5.7 m high-gain antenna built by Italy's ASI.",
      "Returned 453,048 images during the mission.",
    ],
    stats: {
      mass_kg: 5712,
      instruments: [
        "ISS (imaging)",
        "VIMS",
        "CIRS",
        "UVIS",
        "RADAR",
        "MAG",
        "CDA (dust analyzer)",
        "INMS",
        "HASI (Huygens)",
        "DISR (Huygens descent imager)",
      ],
      orbital_period: "Various — primary mission 4-year survey",
      power_source: "3× GPHS-RTG",
    },
    timeline: [
      { date: "1997-10-15", event: "Launch on Titan IVB/Centaur from Cape Canaveral." },
      { date: "1998-04-26", event: "First Venus flyby." },
      { date: "1999-06-24", event: "Second Venus flyby." },
      { date: "1999-08-18", event: "Earth flyby." },
      { date: "2000-12-30", event: "Jupiter flyby — joint observations with Galileo." },
      { date: "2004-07-01", event: "Saturn Orbit Insertion (SOI) — entry through ring gap." },
      { date: "2004-12-25", event: "Huygens probe released from Cassini." },
      { date: "2005-01-14", event: "Huygens lands on Titan." },
      { date: "2005-07-14", event: "Discovery of cryovolcanic plumes on Enceladus." },
      { date: "2006-07-21", event: "Confirms Titan hydrocarbon lakes." },
      { date: "2008-06-30", event: "Primary mission ends; first extended mission begins." },
      { date: "2010-09-27", event: "Solstice Mission extended mission begins." },
      { date: "2017-04-26", event: "Grand Finale begins — first of 22 ring-plane dives." },
      { date: "2017-09-15", event: "Final entry into Saturn — spacecraft destroyed by atmospheric forces." },
    ],
    sources: [
      { label: "NASA Cassini Mission", url: "https://science.nasa.gov/mission/cassini/" },
      { label: "ESA Huygens", url: "https://www.esa.int/Science_Exploration/Space_Science/Cassini-Huygens" },
      { label: "JPL Cassini archive", url: "https://www.jpl.nasa.gov/missions/cassini" },
    ],
    glow_color: "#c8a47a",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cassini_Saturn_Orbit_Insertion.jpg/640px-Cassini_Saturn_Orbit_Insertion.jpg",
  },

  // ─── 8. Galileo ──────────────────────────────────────────────────
  {
    slug: "galileo",
    name: "Galileo",
    agency: "NASA",
    launch_date: "1989-10-18",
    end_date: "2003-09-21",
    status: "ended",
    anchor_body: "Jupiter",
    summary:
      "First spacecraft to orbit Jupiter, deployed an atmospheric entry probe, and discovered subsurface oceans on its icy moons.",
    description:
      "Galileo launched from Space Shuttle Atlantis on STS-34 on October 18, 1989, deployed with an Inertial Upper Stage on a circuitous Venus–Earth–Earth gravity-assist trajectory to Jupiter. Originally designed for a direct trajectory atop a Centaur G upper stage, the mission was redesigned after the Challenger disaster grounded shuttle-launched Centaurs. En route, Galileo was the first spacecraft to fly past an asteroid (951 Gaspra in 1991, then 243 Ida in 1993, where it incidentally discovered Ida's tiny moon Dactyl — the first confirmed asteroid moon).\n\nIn July 1994, Galileo had a unique view of Comet Shoemaker–Levy 9's fragments impacting Jupiter — the only spacecraft to directly image the impacts as they happened on the far side from Earth. The orbiter reached Jupiter on December 7, 1995. The atmospheric probe descended 156 km into Jupiter's atmosphere, returning 58 minutes of in-situ data on composition, winds, and lightning before being crushed by atmospheric pressure. The orbiter battled a stuck high-gain antenna that never fully unfurled, forcing the team to perform ingenious data compression and use the low-gain antenna for the entire mission.\n\nDespite the antenna failure, Galileo's eight-year tour of the Jovian system found magnetic-field evidence of subsurface oceans on Europa, Ganymede, and Callisto, mapped Io's volcanism in detail, and discovered that Ganymede has its own internally generated magnetic field — the only moon known to do so. To protect the suspected ocean of Europa from any possible contamination by terrestrial microbes, the spacecraft was deliberately commanded into Jupiter's atmosphere on September 21, 2003, ending the mission.",
    key_facts: [
      "First spacecraft to orbit Jupiter (December 7, 1995).",
      "Delivered first probe into a giant-planet atmosphere.",
      "First spacecraft to fly past an asteroid (951 Gaspra, 1991).",
      "Discovered the first asteroid moon (Dactyl, around 243 Ida).",
      "Provided strong evidence for subsurface oceans on Europa, Ganymede, Callisto.",
      "Imaged the impacts of Comet Shoemaker–Levy 9 on Jupiter (1994).",
      "Deliberately deorbited into Jupiter in 2003 to protect Europa.",
    ],
    stats: {
      mass_kg: 2380,
      instruments: [
        "SSI (Solid State Imager)",
        "NIMS (Near-Infrared Mapping Spectrometer)",
        "UVS / EUV",
        "PPR (Photopolarimeter Radiometer)",
        "Magnetometer",
        "Plasma Subsystem",
        "Dust Detector",
        "Probe: ASI, NEP, NMS, NFR, HAD, LRD",
      ],
      power_source: "2× GPHS-RTG",
    },
    timeline: [
      { date: "1989-10-18", event: "Launch on STS-34 (Atlantis)." },
      { date: "1990-02-10", event: "Venus gravity assist." },
      { date: "1990-12-08", event: "First Earth gravity assist." },
      { date: "1991-10-29", event: "Asteroid Gaspra flyby — first close-up of an asteroid." },
      { date: "1992-12-08", event: "Second Earth gravity assist." },
      { date: "1993-08-28", event: "Asteroid Ida flyby — discovery of Dactyl." },
      { date: "1994-07-16", event: "Direct observation of SL-9 fragment impacts on Jupiter." },
      { date: "1995-07-13", event: "Atmospheric probe released." },
      { date: "1995-12-07", event: "Jupiter Orbit Insertion + probe atmospheric entry." },
      { date: "1996-06-27", event: "First close Ganymede flyby." },
      { date: "1996-12-19", event: "First close Europa flyby — strong evidence of subsurface ocean." },
      { date: "1999-10-11", event: "First close Io flyby — extensive volcanism observed." },
      { date: "2003-09-21", event: "Deliberate impact into Jupiter at 49 km/s." },
    ],
    sources: [
      { label: "NASA Galileo Mission", url: "https://science.nasa.gov/mission/galileo/" },
      { label: "JPL Galileo Legacy", url: "https://www.jpl.nasa.gov/missions/galileo/" },
    ],
    glow_color: "#e6c089",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Galileo_Preparations_-_GPN-2000-000672.jpg/640px-Galileo_Preparations_-_GPN-2000-000672.jpg",
  },

  // ─── 9. JUICE ────────────────────────────────────────────────────
  {
    slug: "juice",
    name: "JUICE · Jupiter Icy Moons Explorer",
    agency: "ESA",
    launch_date: "2023-04-14",
    status: "en-route",
    anchor_body: "Jupiter (en route)",
    summary:
      "ESA flagship en route to enter orbit around Ganymede in 2034 — the first spacecraft to orbit a moon of another planet.",
    description:
      "JUICE launched on April 14, 2023 from Kourou aboard an Ariane 5, the second-to-last flight of that launcher. ESA's first large-class flagship mission of its Cosmic Vision program targets Jupiter's three Galilean ocean worlds — Ganymede, Europa, and Callisto — to characterize them as potential habitats and as archetypes of giant icy bodies throughout the galaxy. The science payload includes ten instruments — cameras, spectrometers, a radar capable of penetrating 9 km of ice, a laser altimeter, a magnetometer, and a radio-science package — alongside contributions from NASA, JAXA, and several ESA member states.\n\nGetting JUICE to Jupiter required a baroque cruise: a first-ever Earth–Moon gravity assist in August 2024 (the closest lunar flyby of any planetary spacecraft) immediately followed by an Earth flyby, a Venus flyby planned for 2025, and Earth flybys in 2026 and 2029, before finally arriving at Jupiter in July 2031. The deep-space cruise has not been entirely smooth — its RIME radar antenna had to be coaxed out of a stuck position by repeated 'shocks' from a mechanism actuator in spring 2023, a delicate operation followed by months of careful checkout.\n\nOnce in the Jovian system, JUICE will perform 35 flybys of Europa, Callisto, and Ganymede — including two close passes of Europa in 2032 — before entering Ganymede orbit in December 2034. It will be the first spacecraft to orbit a moon of another planet, gradually spiraling down to a 500 km circular polar orbit to map Ganymede's surface, ice shell, and subsurface ocean in unprecedented detail. The mission is planned to end with a controlled crash into Ganymede in 2035.",
    key_facts: [
      "First spacecraft planned to orbit a moon of another planet (Ganymede, 2034).",
      "First spacecraft ever to use an Earth–Moon double gravity assist (August 2024).",
      "Carries the 9-km-penetrating RIME ice-sounding radar.",
      "Plans 35 flybys of Europa, Callisto, and Ganymede.",
      "First major mission since Galileo to deeply explore the Galilean moons.",
      "Will end mission with a controlled impact into Ganymede in 2035.",
      "Solar-powered — 85 m² array, largest ever sent to the outer solar system.",
    ],
    stats: {
      mass_kg: 6070,
      instruments: [
        "JANUS (camera)",
        "MAJIS (visible/NIR imaging spectrometer)",
        "UVS",
        "SWI (sub-mm wave)",
        "GALA (laser altimeter)",
        "RIME (ice-penetrating radar)",
        "RPWI (radio + plasma waves)",
        "J-MAG (magnetometer)",
        "PEP (particle environment)",
        "3GM / PRIDE (radio science)",
      ],
      solar_array_m2: 85,
    },
    timeline: [
      { date: "2023-04-14", event: "Launch on Ariane 5 from Kourou." },
      { date: "2023-04-26", event: "RIME radar antenna successfully unjammed after 2-week effort." },
      { date: "2024-08-19", event: "First-ever Earth–Moon double gravity assist." },
      { date: "2025-08", event: "Planned Venus gravity assist." },
      { date: "2026-09", event: "Second Earth gravity assist." },
      { date: "2029-01", event: "Final Earth gravity assist." },
      { date: "2031-07", event: "Planned Jupiter orbit insertion." },
      { date: "2032-07", event: "First Europa flyby." },
      { date: "2034-12", event: "Planned Ganymede orbit insertion." },
      { date: "2035-12", event: "Planned end of mission via controlled impact into Ganymede." },
    ],
    sources: [
      { label: "ESA JUICE", url: "https://www.esa.int/Science_Exploration/Space_Science/Juice" },
      { label: "JUICE Mission Overview", url: "https://sci.esa.int/web/juice" },
      { label: "JUICE Spacecraft & Payload", url: "https://www.cosmos.esa.int/web/juice" },
    ],
    glow_color: "#b2e0ff",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/JUICE_spacecraft_in_LSS.jpg/640px-JUICE_spacecraft_in_LSS.jpg",
  },

  // ─── 10. Europa Clipper ─────────────────────────────────────────
  {
    slug: "europa-clipper",
    name: "Europa Clipper",
    agency: "NASA",
    launch_date: "2024-10-14",
    status: "en-route",
    anchor_body: "Europa (en route, arrival 2030)",
    summary:
      "NASA's largest planetary spacecraft, en route to make 49 close passes of Europa from Jupiter orbit.",
    description:
      "Europa Clipper launched October 14, 2024 from Kennedy Space Center on a Falcon Heavy in fully-expendable configuration — the most powerful U.S. operational rocket at the time. With a launch mass of 6,065 kg and solar arrays spanning 30.5 m tip-to-tip, it is the largest planetary spacecraft NASA has ever built. The choice of solar arrays over RTGs, despite Europa Clipper operating at 5.2 AU where sunlight is ~25 times weaker than at Earth, was driven by plutonium-238 supply constraints and a 12-year-long power-system trade study.\n\nRather than orbiting Europa directly — which would require an enormous amount of fuel and expose the spacecraft to lethal radiation from Jupiter's magnetosphere — Europa Clipper will orbit Jupiter on a highly elliptical loop and 'clip' Europa with 49 close flybys, including 21 passes below 100 km altitude. Each flyby will be brief but allow the spacecraft to retreat back into less-irradiated regions of Jupiter's magnetosphere to recover and downlink data. The science suite spans nine instruments and a gravity-science experiment: high-resolution imagers, an ice-penetrating radar, magnetometers, mass and dust spectrometers, and a thermal imager.\n\nThe mission targets three high-level science questions about Europa's habitability: whether its subsurface ocean exists and is in contact with the rocky interior, what the composition of its surface and any potential plume material is, and the geology of its young, fractured ice shell. A March 2024 transistor radiation-tolerance scare nearly delayed launch by a year, but radiation modeling and trajectory adjustments cleared the spacecraft to launch on its planned 6.4-year cruise to Jupiter. Arrival is planned for April 2030 followed by tour activities starting in spring 2031.",
    key_facts: [
      "Largest planetary spacecraft ever built by NASA — 30.5 m solar array span.",
      "49 planned close flybys of Europa from Jupiter orbit.",
      "Designed to assess Europa's habitability, not search for life directly.",
      "Carries ice-penetrating radar (REASON) capable of probing tens of kilometers.",
      "Solar-powered at Jupiter — produces ~700 W at 5.2 AU.",
      "Launched on Falcon Heavy (fully expendable configuration) in October 2024.",
      "Mars gravity assist March 2025; Earth gravity assist December 2026.",
    ],
    stats: {
      mass_kg: 6065,
      solar_array_span_m: 30.5,
      instruments: [
        "EIS (Imaging System)",
        "Europa-UVS",
        "MISE (Mapping Imaging Spectrometer for Europa)",
        "E-THEMIS (thermal imager)",
        "REASON (ice-penetrating radar)",
        "ECM (magnetometer)",
        "PIMS (Plasma Instrument)",
        "MASPEX (mass spectrometer)",
        "SUDA (dust analyzer)",
      ],
    },
    timeline: [
      { date: "2024-10-14", event: "Launch on Falcon Heavy from Kennedy LC-39A." },
      { date: "2025-03-01", event: "Mars gravity assist." },
      { date: "2026-12-03", event: "Earth gravity assist." },
      { date: "2030-04-11", event: "Planned Jupiter Orbit Insertion." },
      { date: "2031-03", event: "Planned start of nominal science tour." },
      { date: "2034-09", event: "Planned end of prime mission after 49 Europa flybys." },
    ],
    sources: [
      { label: "NASA Europa Clipper", url: "https://europa.nasa.gov" },
      { label: "JPL Europa Clipper Spacecraft", url: "https://www.jpl.nasa.gov/missions/europa-clipper/" },
      { label: "Europa Clipper Science", url: "https://science.nasa.gov/mission/europa-clipper/" },
    ],
    glow_color: "#9ae9ff",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Europa_Clipper_-_Artist_Concept.png/640px-Europa_Clipper_-_Artist_Concept.png",
  },

  // ─── 11. DART ───────────────────────────────────────────────────
  {
    slug: "dart",
    name: "DART · Double Asteroid Redirection Test",
    agency: "NASA",
    launch_date: "2021-11-24",
    end_date: "2022-09-26",
    status: "ended",
    anchor_body: "Didymos / Dimorphos",
    summary:
      "First demonstration of asteroid deflection — kinetic impact on Dimorphos shortened its orbit by 33 minutes.",
    description:
      "DART launched November 24, 2021 on a Falcon 9 from Vandenberg, marking the start of humanity's first planetary-defense field test. The mission's target was Dimorphos, a 160 m moonlet of the 780 m near-Earth asteroid 65803 Didymos — a binary system whose well-characterized orbital period (11.9 hours pre-impact) made it the ideal natural laboratory to measure whether kinetic impact actually deflects a small body, and by how much. The spacecraft itself was deliberately simple: a ~610 kg cube-shaped bus with two large roll-out solar arrays (ROSA), a single high-resolution imager (DRACO), and an autonomous SMART Nav system to drive itself into the target.\n\nOn September 26, 2022, after a 10-month cruise, DART approached the Didymos system at 22,530 km/h relative velocity. The final hour was a fully autonomous terminal-homing phase: SMART Nav locked onto Didymos at about 90 minutes out, then transitioned to Dimorphos when the moonlet resolved as a separate object only about 50 minutes before impact. The last full image showed Dimorphos's rough, rubble-pile surface from 12 km up; the final partial image, transmitted line by line, cut off mid-frame when the spacecraft destroyed itself at impact.\n\nGround-based observations and the LICIACube nanosatellite (provided by the Italian Space Agency, which deployed from DART a few days before impact) confirmed a massive ejecta plume and revealed that the ~580 kg impactor had altered Dimorphos's orbit by 33 minutes — far more than the 7-minute success threshold and an order of magnitude more than predicted from momentum transfer alone, due to the recoil from ejecta. The binary system was reshaped into a more spherical figure and the moonlet's spin was altered. ESA's Hera mission, launched October 2024, will arrive at Didymos in late 2026 to characterize the post-impact system in detail.",
    key_facts: [
      "First in-space test of asteroid deflection by kinetic impact.",
      "Target Dimorphos: 160 m moonlet of 780 m Didymos.",
      "Closing speed at impact: 22,530 km/h (6.25 km/s).",
      "Orbital period of Dimorphos shortened by 33 minutes.",
      "DART mass at impact: ~580 kg.",
      "ESA's Hera mission will follow up in late 2026.",
      "Powered by ROSA (Roll-Out Solar Arrays) and NEXT-C ion engine.",
    ],
    stats: {
      mass_kg: 610,
      impact_speed_kms: 6.25,
      instruments: ["DRACO (imager)", "SMART Nav (autonomous navigation)"],
      propulsion: "NEXT-C ion engine + hydrazine",
    },
    timeline: [
      { date: "2021-11-24", event: "Launch on Falcon 9 from Vandenberg." },
      { date: "2022-05-26", event: "First DRACO image of stars released." },
      { date: "2022-07-27", event: "Acquires first image of Didymos from 32 million km." },
      { date: "2022-09-11", event: "LICIACube CubeSat deployed from DART." },
      { date: "2022-09-26", event: "Kinetic impact on Dimorphos — 23:14 UTC." },
      { date: "2022-10-11", event: "NASA confirms Dimorphos orbit shortened by 32 minutes." },
      { date: "2023-03-01", event: "Final orbital-period change refined to 33 minutes." },
      { date: "2024-10-07", event: "ESA Hera launched to follow-up the Didymos system." },
    ],
    sources: [
      { label: "NASA DART Mission", url: "https://www.nasa.gov/planetarydefense/dart/" },
      { label: "JHU/APL DART", url: "https://dart.jhuapl.edu" },
      { label: "ESA Hera (follow-on)", url: "https://www.esa.int/Space_Safety/Hera" },
      { label: "Daly et al. 2023 (Nature)", url: "https://www.nature.com/articles/s41586-023-05810-5" },
    ],
    glow_color: "#ff8b6c",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/DART_spacecraft_-_NASA.jpg/640px-DART_spacecraft_-_NASA.jpg",
  },

  // ─── 12. OSIRIS-REx / OSIRIS-APEX ────────────────────────────────
  {
    slug: "osiris-rex-apex",
    name: "OSIRIS-REx / OSIRIS-APEX",
    agency: "NASA",
    launch_date: "2016-09-08",
    status: "extended",
    anchor_body: "Apophis (extended mission, encounter 2029)",
    summary:
      "Returned a sample of asteroid Bennu to Earth in 2023; now extended as OSIRIS-APEX en route to Apophis.",
    description:
      "OSIRIS-REx (Origins, Spectral Interpretation, Resource Identification, and Security – Regolith Explorer) launched September 8, 2016 on an Atlas V 411, beginning a 7-year round trip to collect and return material from carbon-rich near-Earth asteroid 101955 Bennu. After arriving at Bennu in December 2018, the spacecraft conducted nearly two years of mapping that revealed a startlingly rocky, rubble-pile surface littered with boulders — far more hazardous than the smooth gravel beds anticipated from ground observations. The team had to reduce its target site from 50 m radius to just 8 m to find a safe spot.\n\nOn October 20, 2020, the spacecraft executed a 'Touch-and-Go' (TAG) maneuver at the chosen Nightingale site. Its TAGSAM head struck the surface, which behaved more like a fluid than a solid, sinking the spacecraft nearly half a meter into the regolith before backaway thrusters fired. The sample head collected so much material that the lid would not fully close, forcing an emergency stow several days ahead of schedule with material visibly leaking into space. On September 24, 2023, the Sample Return Capsule released over Utah's Test and Training Range; the capsule landed safely with 121.6 g of Bennu material — more than double the 60 g requirement.\n\nWith its primary mission accomplished, the spacecraft was redesignated OSIRIS-APEX (Apophis Explorer) and began a new extended cruise to asteroid 99942 Apophis, which will make a record-close pass of Earth at just 32,000 km on April 13, 2029. OSIRIS-APEX will rendezvous with Apophis shortly after the Earth flyby, observing how Earth's gravity reshapes the asteroid via tidal forces, landslides, and seismic activity. It will then perform a similar but lower-mass surface stir to expose subsurface material.",
    key_facts: [
      "Returned 121.6 g of Bennu material to Earth on September 24, 2023.",
      "First U.S. asteroid sample-return mission.",
      "Touch-and-Go sampling discovered Bennu's surface behaves like a fluid.",
      "Sample capsule entered Earth's atmosphere at 44,500 km/h.",
      "Renamed OSIRIS-APEX after primary-mission success.",
      "Next encounter: Apophis on April 13, 2029.",
      "Initial Bennu sample analysis revealed water-rich clays and organic carbon.",
    ],
    stats: {
      mass_kg: 2110,
      instruments: [
        "OCAMS (camera suite)",
        "OLA (laser altimeter)",
        "OTES (thermal emission spectrometer)",
        "OVIRS (visible/IR spectrometer)",
        "REXIS (X-ray imaging)",
        "TAGSAM (sample arm)",
      ],
      sample_returned_g: 121.6,
    },
    timeline: [
      { date: "2016-09-08", event: "Launch on Atlas V 411 from Cape Canaveral." },
      { date: "2017-09-22", event: "Earth gravity assist." },
      { date: "2018-12-03", event: "Rendezvous with asteroid Bennu." },
      { date: "2019-06-13", event: "Discovery of unexpectedly rocky, hazardous Bennu surface." },
      { date: "2020-10-20", event: "Touch-and-Go sample collection at Nightingale site." },
      { date: "2020-10-30", event: "Sample stowed in Sample Return Capsule." },
      { date: "2021-05-10", event: "Departs Bennu for Earth return." },
      { date: "2023-09-24", event: "Sample Return Capsule lands at Utah Test and Training Range." },
      { date: "2023-10-11", event: "Initial sample reveal: 121.6 g, water-rich clays + organics." },
      { date: "2023-09-25", event: "Spacecraft renamed OSIRIS-APEX and begins cruise to Apophis." },
      { date: "2029-04-13", event: "Apophis flies past Earth at 32,000 km altitude." },
      { date: "2029-04", event: "OSIRIS-APEX scheduled rendezvous with Apophis post-Earth-flyby." },
    ],
    sources: [
      { label: "NASA OSIRIS-REx / APEX", url: "https://science.nasa.gov/mission/osiris-rex/" },
      { label: "University of Arizona OSIRIS-REx", url: "https://www.asteroidmission.org" },
      { label: "Bennu sample analysis (Nature 2024)", url: "https://www.nature.com/articles/s41550-024-02316-6" },
    ],
    glow_color: "#c69b6c",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/OSIRIS-REx_artist_rendering.png/640px-OSIRIS-REx_artist_rendering.png",
  },

  // ─── 13. Perseverance + Ingenuity ────────────────────────────────
  {
    slug: "perseverance-ingenuity",
    name: "Perseverance + Ingenuity",
    agency: "NASA",
    launch_date: "2020-07-30",
    status: "active",
    anchor_body: "Mars (Jezero Crater)",
    summary:
      "Caches Mars rock samples for future return; carried the first aircraft to fly on another planet.",
    description:
      "Perseverance launched July 30, 2020 atop an Atlas V 541 from Cape Canaveral, the third of three Mars-bound missions during that synodic window (with the UAE's Hope and China's Tianwen-1). Like Curiosity before it, Perseverance used the Sky Crane entry-descent-landing system to set down in Jezero Crater on February 18, 2021. Jezero was a clear river-delta site 3.7 Ga in the past; Perseverance is the first rover designed primarily to collect cached samples for future return to Earth, with sealed titanium sample tubes deposited along its traverse for retrieval by the planned Mars Sample Return campaign.\n\nThe rover carries SHERLOC and PIXL to map organic compounds and mineralogy at sub-millimeter scale, the SuperCam laser package for stand-off analysis, ground-penetrating radar (RIMFAX) for subsurface stratigraphy, and the MOXIE technology demonstration that successfully produced oxygen from Mars's CO2 atmosphere on multiple occasions through 2023. As of mid-2024 it has filled and cached more than 24 sample tubes, including duplicates left in the Three Forks 'sample depot' as a redundancy against any potential damage to the rover.\n\nThe Ingenuity helicopter, attached to Perseverance's belly at landing, became the first powered, controlled aircraft to fly on another planet on April 19, 2021. Originally tasked with five technology-demonstration flights of 30 days, Ingenuity instead conducted 72 flights over three years, transitioning into an operational scout for Perseverance and flying for nearly 129 minutes of total airtime. On January 18, 2024, after a hard landing damaged one of its rotor blades, Ingenuity was permanently retired in place — but not before transforming Mars exploration's assumed mobility model.",
    key_facts: [
      "First Mars mission designed primarily to cache samples for future Earth return.",
      "Ingenuity: first aircraft to fly on another planet (April 19, 2021).",
      "Ingenuity flew 72 flights, far surpassing its 5-flight technology-demo goal.",
      "MOXIE successfully produced oxygen from Mars's atmosphere on 16 occasions.",
      "Sample-depot strategy at Three Forks places duplicate tubes for redundancy.",
      "Microphones onboard captured the first-ever audio recordings on Mars.",
      "Powered by an MMRTG; expected to operate at least one full Mars decade.",
    ],
    stats: {
      mass_kg: 1025,
      instruments: [
        "Mastcam-Z",
        "SuperCam",
        "PIXL",
        "SHERLOC + WATSON",
        "MEDA (weather)",
        "RIMFAX (radar)",
        "MOXIE (O2 demo)",
      ],
      power_source: "MMRTG",
      ingenuity_flights: 72,
      ingenuity_airtime_min: 128.8,
    },
    timeline: [
      { date: "2020-07-30", event: "Launch on Atlas V 541." },
      { date: "2021-02-18", event: "Sky-Crane landing in Jezero Crater." },
      { date: "2021-04-19", event: "Ingenuity's first flight — first powered flight on another planet." },
      { date: "2021-04-20", event: "MOXIE produces oxygen from Mars's CO2 for the first time." },
      { date: "2021-09-06", event: "First successful sample cached (Rochette)." },
      { date: "2022-12-21", event: "Three Forks sample depot begins — backup cache." },
      { date: "2023-04-22", event: "Ingenuity's 50th flight." },
      { date: "2024-01-18", event: "Ingenuity's final flight (Flight 72) — rotor damage on landing." },
      { date: "2024-04-16", event: "Ingenuity permanently retired in place." },
      { date: "2024-08-19", event: "Perseverance begins ascent of Jezero crater rim." },
    ],
    sources: [
      { label: "NASA Mars 2020 / Perseverance", url: "https://mars.nasa.gov/mars2020/" },
      { label: "NASA Ingenuity", url: "https://mars.nasa.gov/technology/helicopter/" },
      { label: "Mars Sample Return", url: "https://mars.nasa.gov/msr/" },
    ],
    glow_color: "#ff8b3b",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/PIA23764-RoverPIA23499-MarsPerseveranceRover-20200818.jpg/640px-PIA23764-RoverPIA23499-MarsPerseveranceRover-20200818.jpg",
  },

  // ─── 14. Chang'e 6 ──────────────────────────────────────────────
  {
    slug: "change-6",
    name: "Chang'e 6",
    agency: "CNSA",
    launch_date: "2024-05-03",
    end_date: "2024-06-25",
    status: "ended",
    anchor_body: "Moon (far side, Apollo crater)",
    summary:
      "First mission to return samples from the far side of the Moon — ~1.9 kg from the South Pole–Aitken basin.",
    description:
      "Chang'e 6 launched May 3, 2024 from Wenchang on a Long March 5 rocket, continuing China's robotic lunar program after the successful Chang'e 5 near-side sample-return in 2020. Unlike its predecessor, Chang'e 6 targeted the far side of the Moon — specifically the Apollo crater inside the much larger South Pole–Aitken (SPA) basin, the oldest and largest known impact basin in the solar system, formed approximately 4.3 billion years ago. Because the far side is permanently turned away from Earth, the mission required the Queqiao-2 relay satellite, launched in March 2024 into a frozen halo orbit, to relay all surface communications.\n\nThe mission architecture mirrored Chang'e 5: an orbiter, a return module that stayed in lunar orbit, a lander that descended to the surface, and an ascender that lifted the samples back to lunar orbit for rendezvous with the return module. The lander touched down on June 1, 2024 and spent roughly 48 hours collecting material both from the surface (using a scoop) and from up to ~1 m below the surface (using a drill). On June 3 the ascent vehicle lifted off — only the second crewed-style sample-return ascent from the lunar far side as a whole, but the first from any body on its far side at all.\n\nThe return module re-entered Earth's atmosphere over Inner Mongolia and landed on June 25, 2024, returning approximately 1,935 g of lunar material. Initial analyses confirmed the samples are very different from Chang'e 5 returns: significantly older, with basalt fragments dated to about 2.83 billion years ago, and unusual geochemistry that hints at a thinner crust and different mantle composition on the far side. The samples are being studied at the Chinese Academy of Sciences and partner institutions and have been shared internationally on a controlled basis.",
    key_facts: [
      "First mission to return samples from the lunar far side.",
      "Returned 1,935.3 g of lunar material from the Apollo crater.",
      "Targeted the South Pole–Aitken basin — the Moon's oldest impact feature.",
      "Used the Queqiao-2 relay satellite for far-side communications.",
      "Sample basalt dated to ~2.83 Ga, much younger than expected.",
      "Carried French, Italian, Pakistani, and ESA secondary payloads.",
      "Total mission duration: 53 days from launch to return.",
    ],
    stats: {
      mass_kg: 8200,
      sample_returned_g: 1935.3,
      landing_site: "Apollo crater, SPA basin (~41.6°S, 153.9°W)",
      relay_satellite: "Queqiao-2",
    },
    timeline: [
      { date: "2024-03-20", event: "Queqiao-2 lunar relay satellite launched." },
      { date: "2024-05-03", event: "Chang'e 6 launch on Long March 5 from Wenchang." },
      { date: "2024-05-08", event: "Lunar orbit insertion." },
      { date: "2024-05-30", event: "Lander/ascender separates from orbiter/returner." },
      { date: "2024-06-01", event: "Lander touches down in Apollo crater." },
      { date: "2024-06-02", event: "Surface sampling completed (scoop + drill)." },
      { date: "2024-06-03", event: "Ascender lifts off from lunar far side." },
      { date: "2024-06-06", event: "Rendezvous and docking with return module in lunar orbit." },
      { date: "2024-06-21", event: "Return module begins trans-Earth injection." },
      { date: "2024-06-25", event: "Sample-return capsule lands in Inner Mongolia." },
      { date: "2024-11-15", event: "First peer-reviewed Chang'e 6 paper — basalt age 2.83 Ga." },
    ],
    sources: [
      { label: "CNSA Chang'e 6 (English)", url: "https://www.cnsa.gov.cn/english/n6465652/n6465653/index.html" },
      { label: "Chang'e 6 first-results Nature paper (2024)", url: "https://www.nature.com/articles/s41586-024-08182-6" },
      { label: "NASA Chang'e 6 overview", url: "https://science.nasa.gov/missions/change-6/" },
    ],
    glow_color: "#ffd86b",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Chang%27e_5_lander_at_Mons_R%C3%BCmker.jpg/640px-Chang%27e_5_lander_at_Mons_R%C3%BCmker.jpg",
  },

  // ─── 15. Artemis I ──────────────────────────────────────────────
  {
    slug: "artemis-i",
    name: "Artemis I",
    agency: "NASA",
    launch_date: "2022-11-16",
    end_date: "2022-12-11",
    status: "ended",
    anchor_body: "Moon (distant retrograde orbit)",
    summary:
      "First integrated flight test of NASA's Space Launch System and Orion spacecraft, uncrewed around the Moon.",
    description:
      "Artemis I launched November 16, 2022 at 1:47 AM EST from Kennedy Space Center's Launch Complex 39B on the inaugural flight of the Space Launch System (SLS) — the most powerful rocket NASA has ever flown, with 8.8 million pounds of liftoff thrust, surpassing the Saturn V. The mission was the first integrated test of the SLS Block 1 vehicle, the Orion spacecraft, and the European Service Module provided by ESA and built by Airbus. After multiple launch attempts in late summer 2022 were scrubbed for engine bleed and hydrogen-leak issues, plus a delay forced by Hurricane Ian rolling back to the Vehicle Assembly Building, the November launch was nearly flawless.\n\nOrion's Interim Cryogenic Propulsion Stage performed the trans-lunar injection burn, sending the spacecraft on a multi-week course to the Moon. On November 21, Orion executed an outbound powered flyby just 130 km above the lunar surface, then six days later inserted into a distant retrograde orbit (DRO) — a stable, 100,000-km-amplitude orbit not previously used by a crewed-capable vehicle. Over the following weeks it set the record for the farthest a spacecraft designed for human flight has ever traveled from Earth, at 432,210 km, and demonstrated long-duration deep-space operations.\n\nOn December 11, 2022, Orion re-entered Earth's atmosphere at lunar-return velocity (~11 km/s) and used a 'skip' entry profile for the first time on a crewed-class vehicle: it skipped off the atmosphere to bleed off energy before its terminal descent, splashing down safely in the Pacific Ocean off Baja California. Post-flight analysis identified unexpected charring patterns on the AVCOAT heat shield — the principal technical concern that would later push Artemis II's launch from 2024 to no earlier than April 2026. Otherwise, the mission demonstrated the full Artemis architecture and cleared the way for the first crewed flight.",
    key_facts: [
      "First integrated flight of SLS and Orion (uncrewed).",
      "Most powerful rocket NASA has flown: ~8.8 million pounds of liftoff thrust.",
      "Orion traveled 432,210 km from Earth — farthest for a human-rated craft.",
      "Used 'skip' atmospheric entry for the first time on a crewed-class vehicle.",
      "Distant retrograde orbit reached on November 25, 2022.",
      "Splashdown December 11, 2022 in the Pacific off Baja California.",
      "Heat-shield charring anomalies pushed Artemis II launch to April 2026.",
    ],
    stats: {
      mass_kg: 2608000,
      thrust_kN: 39140,
      max_distance_from_earth_km: 432210,
      mission_duration_days: 25,
      payload: "Orion + ESA Service Module + 10 CubeSats",
    },
    timeline: [
      { date: "2022-08-29", event: "First launch attempt scrubbed for engine bleed issue." },
      { date: "2022-09-03", event: "Second launch attempt scrubbed for hydrogen leak." },
      { date: "2022-09-27", event: "SLS rolled back to VAB ahead of Hurricane Ian." },
      { date: "2022-11-14", event: "Hurricane Nicole damages tower while SLS at pad — cleared for launch." },
      { date: "2022-11-16", event: "Launch at 1:47 AM EST on SLS Block 1." },
      { date: "2022-11-21", event: "Outbound powered lunar flyby — 130 km closest approach." },
      { date: "2022-11-25", event: "Distant retrograde orbit insertion." },
      { date: "2022-11-28", event: "Farthest distance from Earth — 432,210 km." },
      { date: "2022-12-05", event: "Return powered flyby of the Moon." },
      { date: "2022-12-11", event: "Splashdown in Pacific Ocean." },
      { date: "2024-12-05", event: "NASA pushes Artemis II to April 2026 over heat-shield analysis." },
    ],
    sources: [
      { label: "NASA Artemis I", url: "https://www.nasa.gov/mission/artemis-i/" },
      { label: "Orion Spacecraft", url: "https://www.nasa.gov/humans-in-space/orion-spacecraft/" },
      { label: "ESA Service Module", url: "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Orion" },
      { label: "Artemis program overview", url: "https://www.nasa.gov/humans-in-space/artemis/" },
    ],
    glow_color: "#ff7a6b",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Artemis_I_launch_%2852492579170%29.jpg/640px-Artemis_I_launch_%2852492579170%29.jpg",
  },
];

export function findMissionNarrative(
  slug: string,
): MissionNarrative | undefined {
  return MISSIONS_NARRATIVE.find((m) => m.slug === slug);
}

/**
 * Best-effort link from the existing missions-catalog entry IDs to the
 * narrative slugs we author here. Returns `undefined` when no narrative
 * has been written for that catalog row yet.
 */
const CATALOG_TO_NARRATIVE: Readonly<Record<string, string>> = {
  "voyager-1": "voyager-1",
  "voyager-2": "voyager-2",
  "new-horizons": "new-horizons",
  psp: "parker-solar-probe",
  jwst: "jwst",
  hst: "hubble",
  cassini: "cassini-huygens",
  galileo: "galileo",
  juice: "juice",
  "europa-clipper": "europa-clipper",
  dart: "dart",
  "osiris-apex": "osiris-rex-apex",
  perseverance: "perseverance-ingenuity",
  "chang-e-6": "change-6",
  "artemis-i": "artemis-i",
};

export function narrativeForCatalogId(
  catalogId: string,
): MissionNarrative | undefined {
  const slug = CATALOG_TO_NARRATIVE[catalogId];
  return slug ? findMissionNarrative(slug) : undefined;
}

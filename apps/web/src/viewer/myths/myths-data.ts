/**
 * Common Space Myths — a curated list of the most-repeated
 * misconceptions about space, astronomy and cosmology, paired with
 * the actual physics each one gets wrong.
 *
 * Every `reality` is meant to be scientifically defensible: 3-5
 * sentences of factual explanation. Each entry carries one or more
 * citation links to NASA, ESA, peer-reviewed work, or Wikipedia (in
 * descending order of preference). When two sources disagree we go
 * with the primary mission/agency wording.
 *
 * Categories:
 *   - solar-system      Sun, planets, moons, asteroids, comets.
 *   - stars-and-galaxies  Stars, stellar evolution, galaxies.
 *   - cosmology         Big Bang, expansion, dark matter, BHs.
 *   - space-travel      Astronaut physiology, vacuum, ISS, suits.
 *   - physics           Light, gravity, time, relativity in space.
 *   - history           Apollo, "first" claims, observational lore.
 */

export type MythCategory =
  | "solar-system"
  | "stars-and-galaxies"
  | "cosmology"
  | "space-travel"
  | "physics"
  | "history";

export type Myth = {
  id: string;
  myth: string;
  reality: string;
  category: MythCategory;
  sources?: { title: string; url: string }[];
};

export const CATEGORY_LABELS: Record<MythCategory, string> = {
  "solar-system": "Solar System",
  "stars-and-galaxies": "Stars & Galaxies",
  cosmology: "Cosmology",
  "space-travel": "Space Travel",
  physics: "Physics",
  history: "History",
};

export const SPACE_MYTHS: Myth[] = [
  {
    id: "dark-side-moon",
    myth: "The dark side of the Moon is always dark.",
    reality:
      "Both lunar hemispheres receive equal amounts of sunlight over a lunar month. The Moon is tidally locked to Earth, so we only ever see one face — the *near* side — but the *far* side cycles through a full day/night cycle every 29.5 days just like the near side does. \"Far\" side is the correct term; \"dark\" side is a Pink-Floyd-era confusion.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — The Moon's Far Side",
        url: "https://moon.nasa.gov/news/100/lunar-far-side/",
      },
    ],
  },
  {
    id: "no-gravity-iss",
    myth: "There is no gravity in space (or on the ISS).",
    reality:
      "Earth's gravity at the ISS's 400 km altitude is still about 89 % of its surface value. Astronauts appear weightless because the station is in continuous free fall around Earth — it accelerates toward the planet at the same rate as everything inside it, so they never push on the floor. The correct term is microgravity, not zero gravity.",
    category: "space-travel",
    sources: [
      {
        title: "NASA — What Is Microgravity?",
        url: "https://www.nasa.gov/centers/glenn/about/fs21grc.html",
      },
    ],
  },
  {
    id: "freeze-instantly",
    myth: "You would freeze instantly if exposed to the vacuum of space.",
    reality:
      "Vacuum is one of the best thermal insulators we know of — Thermos flasks use one for exactly this reason. With no air to conduct heat away, an unprotected human body would actually struggle to *shed* heat fast enough and would slowly cool only by radiation, on the order of hours. You would die first from decompression and hypoxia, not freezing.",
    category: "space-travel",
    sources: [
      {
        title: "NASA — Human Body in a Vacuum",
        url: "https://web.archive.org/web/20090117085030/http://imagine.gsfc.nasa.gov/docs/ask_astro/answers/970603.html",
      },
    ],
  },
  {
    id: "explode-in-vacuum",
    myth: "Your body would explode if you stepped out of an airlock without a suit.",
    reality:
      "Human skin is an elastic pressure vessel and easily contains one atmosphere. In a sudden vacuum you would experience ebullism (water vaporising in soft tissue), severe hypoxia, and lose consciousness in about 15 seconds, dying within 1 – 2 minutes if not repressurised. NASA accident records and dog experiments in the 1960s confirm survivable brief exposures without rupture.",
    category: "space-travel",
    sources: [
      {
        title: "NASA Technical Report — Rapid (Explosive) Decompression",
        url: "https://ntrs.nasa.gov/citations/19660005052",
      },
    ],
  },
  {
    id: "great-wall-space",
    myth: "The Great Wall of China is the only human structure visible from space.",
    reality:
      "From low-Earth orbit the Great Wall is essentially invisible — it is roughly 5 – 9 m wide and runs the same colour as the surrounding terrain. Astronauts Yang Liwei (Shenzhou 5) and Chris Hadfield both reported failing to spot it. Highways, airports, and cities at night are far easier to pick out from the ISS, and nothing on Earth is visible from the Moon.",
    category: "history",
    sources: [
      {
        title: "NASA Earth Observatory — China's Wall Less Visible Than Thought",
        url: "https://earthobservatory.nasa.gov/images/4710/chinas-wall-less-visible-from-space-than-thought",
      },
    ],
  },
  {
    id: "black-hole-vacuum",
    myth: "Black holes are cosmic vacuum cleaners that suck in everything around them.",
    reality:
      "A black hole's gravity at any given distance is identical to that of an ordinary object of the same mass. If the Sun were swapped for a one-solar-mass black hole, Earth's orbit would not change. Black holes only \"swallow\" matter that crosses the event horizon or that loses angular momentum via an accretion disk — they have no special long-range pull.",
    category: "cosmology",
    sources: [
      {
        title: "NASA — Black Hole Myths",
        url: "https://science.nasa.gov/universe/black-holes/",
      },
    ],
  },
  {
    id: "asteroid-belt-dense",
    myth: "The asteroid belt is densely packed and dangerous to fly through.",
    reality:
      "The main belt holds perhaps 1 – 2 million bodies larger than 1 km spread across a volume the size of Earth's orbit — average separation is roughly one million kilometres. Every uncrewed mission sent through (Pioneer 10/11, Voyager 1/2, Galileo, Cassini, Juno, Hayabusa, Dawn) has crossed it without incident, and none could even attempt a close encounter without dedicated targeting.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Asteroid Belt Overview",
        url: "https://science.nasa.gov/solar-system/asteroids/",
      },
    ],
  },
  {
    id: "sun-is-yellow",
    myth: "The Sun is yellow.",
    reality:
      "The Sun is a G2V star whose spectrum peaks in the green and emits roughly equally across the visible band, so the integrated colour above the atmosphere is essentially white — astronauts and high-altitude photographs both confirm this. The yellow tint we see from the ground is Rayleigh scattering robbing the beam of its blue end, which is the same physics that makes the sky blue.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "NASA — What Color Is the Sun?",
        url: "https://spaceplace.nasa.gov/sun-colors/en/",
      },
    ],
  },
  {
    id: "pluto-too-small",
    myth: "Pluto was demoted from planethood because it is too small.",
    reality:
      "The 2006 IAU definition requires a planet to (1) orbit the Sun, (2) be massive enough to be roughly round, and (3) have *cleared its orbital neighbourhood*. Pluto fails the third test because it shares its zone with thousands of Kuiper-belt objects — including some of comparable mass like Eris. Size was a motivation for revisiting the definition, not the criterion itself.",
    category: "solar-system",
    sources: [
      {
        title: "IAU — Pluto and the Solar System",
        url: "https://www.iau.org/public/themes/pluto/",
      },
    ],
  },
  {
    id: "expanding-into",
    myth: "The universe is expanding into something.",
    reality:
      "General relativity describes expansion as a stretching of space itself between gravitationally unbound objects — there is no edge moving outwards into a pre-existing void. Every observer sees galaxies receding from them, but no observer is at any \"centre\". The question \"what is it expanding into?\" presupposes an external geometry that the theory does not require and the data do not support.",
    category: "cosmology",
    sources: [
      {
        title: "NASA — What Is the Expansion of the Universe?",
        url: "https://science.nasa.gov/universe/cosmology/",
      },
    ],
  },
  {
    id: "big-bang-explosion",
    myth: "The Big Bang was an explosion in empty space.",
    reality:
      "The Big Bang is the model's name for the hot, dense, *uniform* early state from which the observable universe expanded. It happened everywhere at once and had no centre and no shockwave moving through an outside medium. The cosmic microwave background — observed in every direction with near-identical temperature — is the leftover thermal glow of that state, not the receding light of a blast.",
    category: "cosmology",
    sources: [
      {
        title: "NASA — Big Bang Cosmology",
        url: "https://science.nasa.gov/universe/the-big-bang/",
      },
    ],
  },
  {
    id: "sun-supernova",
    myth: "The Sun will end its life as a supernova.",
    reality:
      "Only stars above roughly 8 solar masses end as core-collapse supernovae. The Sun, at one solar mass, will swell into a red giant in about 5 billion years, shed its outer layers as a planetary nebula, and leave behind an Earth-sized white dwarf made mostly of carbon and oxygen. No explosion is involved in this evolutionary path.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "NASA — How Will the Sun Die?",
        url: "https://science.nasa.gov/sun/",
      },
    ],
  },
  {
    id: "space-silent",
    myth: "Outer space is completely silent.",
    reality:
      "Sound waves need a medium dense enough to carry mechanical compressions, and the interstellar medium is far too thin for audible-frequency sound. But space is *full* of low-frequency plasma waves and radio emissions: the Parker Solar Probe records solar-wind waves, Voyager has streamed plasma oscillations from interstellar space, and Chandra translated pressure waves in the Perseus cluster gas into audible tones.",
    category: "physics",
    sources: [
      {
        title: "NASA — Sonifications from Space",
        url: "https://chandra.harvard.edu/sound/",
      },
    ],
  },
  {
    id: "comet-tail-motion",
    myth: "Comet tails stream behind them because of how fast they move.",
    reality:
      "Comet tails always point *away from the Sun*, regardless of which way the comet is travelling — on the outbound leg of an orbit a comet flies tail-first. The ion tail is shaped by the solar wind and the dust tail by radiation pressure on micron-scale grains. Motion through space is incidental; the Sun is what sculpts both tails.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Anatomy of a Comet",
        url: "https://science.nasa.gov/solar-system/comets/",
      },
    ],
  },
  {
    id: "mercury-hottest",
    myth: "Mercury is the hottest planet because it's closest to the Sun.",
    reality:
      "Mercury's day-side reaches about 430 °C but its night-side drops to −180 °C because it has effectively no atmosphere to retain heat. Venus, with its 96 % CO₂ atmosphere and the strongest runaway greenhouse in the solar system, sits at roughly 465 °C *everywhere on its surface, day and night*. Venus wins on mean temperature by a wide margin.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Venus Facts",
        url: "https://science.nasa.gov/venus/facts/",
      },
    ],
  },
  {
    id: "stars-bigger-planets",
    myth: "All stars are bigger than all planets.",
    reality:
      "Neutron stars — the cores left over from massive-star supernovae — pack 1 – 2 solar masses into a sphere just 20 – 25 km across, smaller than most cities. White dwarfs are about the size of Earth. Jupiter, by comparison, is 140 000 km across. So end-of-life stellar remnants can be vastly smaller than the gas-giant planets that still orbit ordinary main-sequence stars.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "NASA — Neutron Stars",
        url: "https://science.nasa.gov/universe/neutron-stars/",
      },
    ],
  },
  {
    id: "north-star-brightest",
    myth: "The North Star (Polaris) is the brightest star in the sky.",
    reality:
      "Polaris shines at apparent magnitude 1.98, ranking only the 48th brightest star in Earth's night sky. Sirius, in Canis Major, is the actual brightest at magnitude −1.46, almost 25 times brighter to the eye. Polaris is celebrated because it sits within 1° of the north celestial pole — a navigation aid, not a luminosity record.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "Wikipedia — List of Brightest Stars",
        url: "https://en.wikipedia.org/wiki/List_of_brightest_stars",
      },
    ],
  },
  {
    id: "earth-circular-orbit",
    myth: "Earth orbits the Sun in a perfect circle.",
    reality:
      "Earth's orbit has an eccentricity of about 0.0167, making it a slightly squashed ellipse. The perihelion–aphelion distance varies by roughly 5 million km — Earth is closest to the Sun in early January and furthest in early July. This eccentricity is small compared to Mercury's (0.21) or most comets', but it is not zero.",
    category: "solar-system",
    sources: [
      {
        title: "NASA Earth Fact Sheet",
        url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html",
      },
    ],
  },
  {
    id: "moon-receding-meters",
    myth: "The Moon is drifting away from Earth at meters per year.",
    reality:
      "Lunar laser ranging — bouncing pulses off Apollo retro-reflectors since 1969 — measures the recession at 3.82 ± 0.07 cm per year, not meters. Tidal coupling transfers angular momentum from Earth's spin to the lunar orbit, slowing the day and lifting the Moon outward. The effect is real and measured to sub-millimeter precision, but it is centimeter-scale.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Lunar Laser Ranging",
        url: "https://tmurphy.physics.ucsd.edu/apollo/apollo.html",
      },
    ],
  },
  {
    id: "photons-have-mass",
    myth: "Photons must have mass since they carry energy and momentum.",
    reality:
      "In the Standard Model the photon is exactly massless; experimental upper limits sit around 10⁻¹⁸ eV/c². Momentum p = E/c for a photon — energy alone is enough, no rest mass required. This is why photons travel at the invariant speed c and why they bend in gravitational fields without needing mass (general relativity couples to energy, not mass).",
    category: "physics",
    sources: [
      {
        title: "Particle Data Group — Photon",
        url: "https://pdg.lbl.gov/2023/listings/rpp2023-list-photon.pdf",
      },
    ],
  },
  {
    id: "time-dilation-light-speed",
    myth: "Time dilation only happens at speeds near the speed of light.",
    reality:
      "Special-relativistic time dilation scales as 1/√(1 − v²/c²) and is non-zero at any speed; it just becomes noticeable as v approaches c. GPS satellites moving at 14 000 km/h must be corrected by 7 µs/day for their motion, plus 45 µs/day for their weaker gravitational potential — without those corrections, GPS positions would drift by ~10 km per day.",
    category: "physics",
    sources: [
      {
        title: "Ashby — Relativity and the Global Positioning System",
        url: "https://www.aapt.org/doorway/tgru/articles/Ashbyarticle.pdf",
      },
    ],
  },
  {
    id: "venus-cloud-water",
    myth: "Venus's thick clouds are made of water vapour like Earth's.",
    reality:
      "Venus's upper-atmosphere clouds are 75 – 96 % sulfuric acid droplets, with a haze layer of more concentrated H₂SO₄ below. Below the clouds the atmosphere is supercritical CO₂ at 92 bar surface pressure. Water has been stripped almost entirely from the planet — the D/H ratio is more than 100× Earth's, evidence that any ocean Venus once had escaped to space billions of years ago.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Venus Atmosphere",
        url: "https://science.nasa.gov/venus/",
      },
    ],
  },
  {
    id: "mars-blue-sunset",
    myth: "Mars has red sunsets like Earth's but more dramatic.",
    reality:
      "Mars actually has *blue* sunsets. The fine dust suspended in its thin atmosphere preferentially forward-scatters red wavelengths, so the disk-near solar halo glows blue while the rest of the sky is butterscotch. Rovers from Pathfinder onward have photographed this directly — it is one of the most genuinely alien sights humans have imaged.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Blue Sunset on Mars",
        url: "https://mars.nasa.gov/resources/21433/blue-sunset-on-mars/",
      },
    ],
  },
  {
    id: "moon-causes-tides",
    myth: "The Moon causes high tides and the Sun has no effect.",
    reality:
      "The Sun contributes about 46 % of the tidal force the Moon does, despite being 27 million times more massive — because tides depend on the *gradient* of gravity, which falls as 1/r³. When Moon and Sun align (new/full moon) we get the larger spring tides; when they are at right angles (first/last quarter) we get the smaller neap tides. Both bodies matter.",
    category: "physics",
    sources: [
      {
        title: "NOAA — What Causes the Tides?",
        url: "https://oceanservice.noaa.gov/facts/tides.html",
      },
    ],
  },
  {
    id: "shooting-star-is-star",
    myth: "Shooting stars are stars falling out of the sky.",
    reality:
      "A meteor is a sand- to pea-sized piece of debris (typically cometary dust) burning up through atmospheric friction at 70 – 270 km altitude. Stars are millions of times Earth's diameter and lie light-years away — none has ever \"fallen\" through Earth's atmosphere. The streak we see lasts under a second; the grain itself usually vapourises completely before reaching the ground.",
    category: "physics",
    sources: [
      {
        title: "NASA — Meteors and Meteorites",
        url: "https://science.nasa.gov/solar-system/meteors-meteorites/",
      },
    ],
  },
  {
    id: "milky-way-andromeda-collide",
    myth: "When Andromeda hits the Milky Way most stars will collide.",
    reality:
      "Galaxies are mostly empty space — the nearest star to the Sun is about 30 million stellar diameters away. When the Milky Way and Andromeda merge in roughly 4.5 billion years, simulations predict essentially zero direct stellar collisions. The two galaxies' gas clouds *will* shock and trigger star formation, and many stars will be flung into new orbits, but stars themselves will pass like dust motes.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "NASA — Milky Way / Andromeda Collision",
        url: "https://science.nasa.gov/missions/hubble/nasas-hubble-shows-milky-way-is-destined-for-head-on-collision/",
      },
    ],
  },
  {
    id: "moon-rotate",
    myth: "The Moon doesn't rotate — that's why we always see the same face.",
    reality:
      "The Moon rotates exactly once on its axis for each orbit around Earth (27.3 days), a state called synchronous rotation or tidal locking. If it did not rotate at all we would actually see *every* part of it over the course of a month. You can demonstrate this with two coins by walking one around the other while keeping the same face inward.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Why Does the Moon Always Show the Same Face?",
        url: "https://moon.nasa.gov/inside-and-out/dynamic-moon/tidal-locking/",
      },
    ],
  },
  {
    id: "stars-twinkle",
    myth: "Stars twinkle and planets do not, because stars are farther away.",
    reality:
      "Twinkling (scintillation) comes from turbulent cells in Earth's atmosphere refracting a beam of starlight, and the cells are small enough to bend a point source noticeably. Planets present a *resolved disk* — many adjacent paths through the atmosphere average out, leaving a steady glow. Distance is incidental; the deciding factor is angular size.",
    category: "physics",
    sources: [
      {
        title: "Sky & Telescope — Why Stars Twinkle",
        url: "https://skyandtelescope.org/astronomy-resources/why-do-stars-twinkle/",
      },
    ],
  },
  {
    id: "saturn-only-rings",
    myth: "Saturn is the only planet with rings.",
    reality:
      "All four giant planets have rings. Jupiter's are dust-thin and were first imaged by Voyager 1 in 1979; Uranus's were discovered in 1977 by stellar occultation; Neptune's were confirmed by Voyager 2 in 1989. Saturn's rings dominate because they are brighter and made of ~99 % water ice, but they are not unique — they may also be relatively young (under 100 million years).",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Planetary Rings",
        url: "https://science.nasa.gov/saturn/planet-rings/",
      },
    ],
  },
  {
    id: "milky-way-from-earth",
    myth: "The fuzzy band in the night sky is the *galaxy next door*.",
    reality:
      "The Milky Way's faint river of light is our *own* galaxy seen edge-on from inside the disk. We sit roughly 26 000 light-years out from the centre, halfway through a 100 000-light-year-wide spiral. The Andromeda galaxy (M31) is the nearest large neighbour but appears as a small fuzzy patch in Andromeda the constellation, not the band itself.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "NASA — The Milky Way Galaxy",
        url: "https://science.nasa.gov/milky-way/",
      },
    ],
  },
  {
    id: "blue-flame-hottest",
    myth: "Red stars are hot and blue stars are cool — like fire.",
    reality:
      "Stellar colour traces effective temperature directly via Planck's law. The hottest stars (spectral type O) are blue-white at 30 000 K+, the coolest (M, L, T dwarfs) are red at under 4 000 K, with the Sun (G2V) sitting in the middle at ~5 770 K. Campfire intuition is backwards because we usually see red embers (cooler) and blue gas flames (hotter) at temperatures *both* far lower than any star.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "NASA — Stellar Classification",
        url: "https://science.nasa.gov/universe/stars/",
      },
    ],
  },
  {
    id: "lightning-no-strike-twice",
    myth: "Lightning never strikes the same place twice.",
    reality:
      "Tall conducting structures attract repeat strikes. The Empire State Building is hit roughly 20 – 25 times per year and was famously photographed taking eight hits in a single storm. The same applies to mountaintop observatories and rocket launchpads — anything tall and grounded is *more* likely to be struck again, not less.",
    category: "physics",
    sources: [
      {
        title: "NOAA — Lightning Myths",
        url: "https://www.weather.gov/safety/lightning-myths",
      },
    ],
  },
  {
    id: "season-distance",
    myth: "Seasons are caused by Earth's varying distance from the Sun.",
    reality:
      "Seasons are driven by Earth's 23.4° axial tilt, which changes the angle of sunlight and the length of day at a given latitude. Distance is a minor effect: Earth is actually closest to the Sun in early January, in the middle of Northern Hemisphere winter. The Southern Hemisphere has summer at the same moment, which is impossible if distance were the cause.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — What Causes the Seasons?",
        url: "https://spaceplace.nasa.gov/seasons/en/",
      },
    ],
  },
  {
    id: "polaris-forever",
    myth: "Polaris has always been and will always be the North Star.",
    reality:
      "Earth's rotation axis precesses around the ecliptic pole on a 26 000-year cycle (axial precession). Five thousand years ago Thuban in Draco was the pole star; in roughly 12 000 years it will be Vega in Lyra; Polaris itself only became the closest naked-eye star to the pole within the last few hundred years and is still drifting toward exact alignment around 2102.",
    category: "history",
    sources: [
      {
        title: "Wikipedia — Axial Precession",
        url: "https://en.wikipedia.org/wiki/Axial_precession",
      },
    ],
  },
  {
    id: "moon-landing-faked",
    myth: "The Moon landings were faked in a Hollywood studio.",
    reality:
      "Apollo returned 382 kg of lunar samples to over 500 laboratories worldwide, left five working laser retroreflectors that any university can still bounce pulses off, and was tracked independently by Soviet, British, Australian, and amateur radio operators. LRO has imaged the descent stages and rover tracks since 2009. No alternative explanation matches the simultaneous evidence from independent adversarial parties.",
    category: "history",
    sources: [
      {
        title: "NASA LRO — Apollo Landing Sites",
        url: "https://www.nasa.gov/feature/goddard/lro/lro-shows-apollo-landing-sites-from-different-perspective",
      },
    ],
  },
  {
    id: "all-orbits-circle",
    myth: "Satellites orbit in circles because gravity pulls them straight down.",
    reality:
      "All bound orbits are conic sections — circles are just the special case of an ellipse with zero eccentricity. Real satellites travel ellipses, parabolas, or hyperbolas depending on energy. A satellite stays up because its sideways velocity is high enough that the ground curves away as fast as gravity pulls it down — Newton's cannonball, not a tug-of-war.",
    category: "physics",
    sources: [
      {
        title: "NASA — Orbital Mechanics",
        url: "https://science.nasa.gov/learn/basics-of-space-flight/chapter3-1/",
      },
    ],
  },
  {
    id: "black-holes-tear-open",
    myth: "Black holes are wormholes or portals to other places.",
    reality:
      "Schwarzschild black holes are vacuum solutions of Einstein's equations with a curvature singularity inside the event horizon — nothing crosses out. The mathematical maximally-extended Schwarzschild geometry does contain a \"white-hole\" region, but it is not realised by any black hole formed from collapse. No physical mechanism is known by which matter could exit a black hole intact, much less arrive somewhere else.",
    category: "cosmology",
    sources: [
      {
        title: "NASA — What Are Black Holes?",
        url: "https://science.nasa.gov/universe/black-holes/anatomy/",
      },
    ],
  },
  {
    id: "no-weather-space",
    myth: "There is no weather in space.",
    reality:
      "\"Space weather\" describes solar-wind conditions, coronal mass ejections, geomagnetic storms, and high-energy particle showers — all of which actively damage satellites, disrupt HF radio, and threaten astronauts. NOAA operates a dedicated Space Weather Prediction Center; the 1989 Quebec blackout and the 2003 Halloween storms are documented cases where space weather caused billions in damage on the ground.",
    category: "physics",
    sources: [
      {
        title: "NOAA Space Weather Prediction Center",
        url: "https://www.swpc.noaa.gov/",
      },
    ],
  },
  {
    id: "milky-way-center-bh",
    myth: "The supermassive black hole at the Milky Way's centre is about to swallow us.",
    reality:
      "Sagittarius A* is roughly 26 000 light-years away, holds about 4.3 million solar masses, and is on a remarkably *quiet* accretion diet — far below Eddington luminosity. The Sun is in a stable, nearly circular orbit around the galactic centre with a 230-million-year period. Sgr A* poses no threat over astronomically meaningful timescales.",
    category: "cosmology",
    sources: [
      {
        title: "Event Horizon Telescope — Sgr A*",
        url: "https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy",
      },
    ],
  },
  {
    id: "earth-spin-feel",
    myth: "If Earth were really spinning we would feel it.",
    reality:
      "At the equator Earth's surface moves at 465 m/s eastward — but uniform velocity is undetectable from inside a closed system (Galilean relativity). What you *can* detect is the spin's *acceleration*: the equatorial bulge, the Coriolis deflection of long-range artillery, and Foucault's pendulum (Paris, 1851), which slowly rotates its swing plane and could not do so on a stationary Earth.",
    category: "physics",
    sources: [
      {
        title: "Wikipedia — Foucault Pendulum",
        url: "https://en.wikipedia.org/wiki/Foucault_pendulum",
      },
    ],
  },
  {
    id: "edge-of-space",
    myth: "Space begins at a sharp line called the Kármán line.",
    reality:
      "Atmospheric density falls off exponentially, with no physical boundary. The 100-km Kármán line is an *administrative* convention chosen by the FAI because that's where lifting flight becomes impractical. The US uses 80 km. The ISS at 400 km still grazes enough atmosphere to require reboosts of about 2 km per month, and trace atmosphere persists to thousands of kilometres.",
    category: "space-travel",
    sources: [
      {
        title: "FAI — 100 km Altitude Boundary",
        url: "https://www.fai.org/page/icare-boundary",
      },
    ],
  },
  {
    id: "voyager-left-solar-system",
    myth: "Voyager 1 has left the solar system.",
    reality:
      "Voyager 1 crossed the heliopause — the boundary of the Sun's plasma bubble — in August 2012 and is now in interstellar space. But the solar system as defined by gravitational influence extends out to the Oort Cloud, perhaps 100 000 AU away. Voyager will not reach the inner Oort Cloud for another 300 years and will not exit it for tens of thousands of years.",
    category: "space-travel",
    sources: [
      {
        title: "NASA — Voyager Mission Status",
        url: "https://voyager.jpl.nasa.gov/mission/status/",
      },
    ],
  },
  {
    id: "earth-water-comets",
    myth: "Earth's water all came from comets.",
    reality:
      "The D/H ratio in most comets (Halley, Hyakutake, Hale-Bopp) is roughly twice Earth's seawater value, ruling them out as the dominant source. Carbonaceous chondrite meteorites match Earth's D/H far better and are now thought to have delivered most of our water during late accretion. Some Jupiter-family comets have Earth-like D/H, so comets are not zero — just not the main contributor.",
    category: "solar-system",
    sources: [
      {
        title: "Alexander et al. — D/H in Carbonaceous Chondrites",
        url: "https://www.science.org/doi/10.1126/science.1223474",
      },
    ],
  },
  {
    id: "rocket-pushes-air",
    myth: "Rockets push against the atmosphere to fly, so they can't work in space.",
    reality:
      "Rocket thrust is Newton's third law applied to ejected propellant — momentum out the back equals momentum forward, regardless of whether anything is outside the nozzle. In fact rockets are *more* efficient in vacuum because there is no back-pressure on the exhaust and no aerodynamic drag. Robert Goddard's 1920 paper showing this got him ridiculed by the New York Times, which apologised in 1969.",
    category: "space-travel",
    sources: [
      {
        title: "NASA — How Rockets Work",
        url: "https://www.nasa.gov/audience/forstudents/k-4/stories/nasa-knows/what-is-a-rocket-k4.html",
      },
    ],
  },
  {
    id: "dark-matter-is-matter",
    myth: "Dark matter is just ordinary matter we haven't lit up yet.",
    reality:
      "The cosmic microwave background, Big Bang nucleosynthesis abundances, and galaxy-cluster lensing independently constrain the *baryonic* matter density to ~5 % of the cosmic energy budget — far too little to explain the ~27 % needed for observed galactic rotation and structure formation. Whatever dark matter is, it interacts gravitationally but is non-baryonic; the leading candidates (WIMPs, axions, primordial black holes) are not ordinary protons and neutrons.",
    category: "cosmology",
    sources: [
      {
        title: "Planck Collaboration — Cosmological Parameters",
        url: "https://www.aanda.org/articles/aa/full_html/2020/09/aa33910-18/aa33910-18.html",
      },
    ],
  },
  {
    id: "galileo-invented-telescope",
    myth: "Galileo invented the telescope.",
    reality:
      "The refracting telescope was patented by Hans Lipperhey in the Netherlands in 1608, and the design spread to Italy within months. Galileo's contribution in 1609 was to *build a much better one* (about 20×) and to point it at the sky systematically — discovering lunar craters, the Galilean moons, Venusian phases and sunspots. He improved and exploited the instrument; he did not invent it.",
    category: "history",
    sources: [
      {
        title: "Wikipedia — History of the Telescope",
        url: "https://en.wikipedia.org/wiki/History_of_the_telescope",
      },
    ],
  },
  {
    id: "moon-affects-mood",
    myth: "The Moon's gravity affects your mood or behaviour.",
    reality:
      "The Moon's tidal force on a human body is about 0.00001 % of Earth's surface gravity — orders of magnitude weaker than the pull of nearby furniture. Meta-analyses of psychiatric admissions, crime statistics and birth rates find no correlation with lunar phase that survives controls. The persistence of the belief is a well-documented case of confirmation bias.",
    category: "physics",
    sources: [
      {
        title: "Rotton & Kelly — Much Ado About the Full Moon",
        url: "https://psycnet.apa.org/record/1985-25864-001",
      },
    ],
  },
  {
    id: "jupiter-failed-star",
    myth: "Jupiter is a failed star.",
    reality:
      "To sustain hydrogen fusion a body needs about 80 Jupiter masses (the brown-dwarf / red-dwarf boundary). Jupiter is 75 to 80 times too light to have ever ignited core fusion. The phrase \"failed star\" is sometimes applied to brown dwarfs (13 – 80 Jupiter masses, which briefly fuse deuterium) but it is a poor description of any planet, including Jupiter.",
    category: "solar-system",
    sources: [
      {
        title: "NASA — Jupiter Facts",
        url: "https://science.nasa.gov/jupiter/facts/",
      },
    ],
  },
  {
    id: "earth-perfect-sphere",
    myth: "Earth is a perfect sphere.",
    reality:
      "Earth is an oblate spheroid: rotation flattens it so the equatorial radius (6378.1 km) exceeds the polar radius (6356.8 km) by 21 km. The geoid — the equipotential surface of mean sea level — has additional bumps and dips of up to ±100 m due to mantle density variations. \"Sphere\" is a 0.3 %-accurate approximation; precision navigation uses the WGS84 ellipsoid.",
    category: "physics",
    sources: [
      {
        title: "NASA — Earth's Shape",
        url: "https://www.nasa.gov/audience/forstudents/k-4/stories/nasa-knows/what-is-earth-k4.html",
      },
    ],
  },
  {
    id: "antimatter-evil",
    myth: "Antimatter is the opposite of matter and would destroy the universe if it touched anything.",
    reality:
      "An antiparticle has opposite charge and quantum numbers but the same mass as its partner; when they meet, they annihilate to photons or lighter particles, converting all of their rest energy to radiation (E = mc²). The reaction is localised — a positron meeting an electron releases ~1 MeV, comparable to a γ-ray photon. CERN produces nanograms of antihydrogen routinely and contains it with magnetic traps; \"destroying the universe\" requires comparable amounts of matter, not a chain reaction.",
    category: "physics",
    sources: [
      {
        title: "CERN — Antimatter",
        url: "https://home.cern/science/physics/antimatter",
      },
    ],
  },
  {
    id: "supernova-near-extinct",
    myth: "A nearby supernova will sterilise Earth at any moment.",
    reality:
      "To strip the ozone layer enough to cause a mass extinction a supernova needs to lie within roughly 25 – 50 light-years. The nearest plausible candidate, Betelgeuse, is about 550 light-years away — far enough that even its eventual core-collapse will only briefly outshine the full Moon, with no biological effects on Earth. No known star within the danger radius is near end of life.",
    category: "stars-and-galaxies",
    sources: [
      {
        title: "Gehrels et al. — Ozone Depletion from Nearby Supernovae",
        url: "https://iopscience.iop.org/article/10.1086/345585",
      },
    ],
  },
  {
    id: "blackhole-no-light",
    myth: "Black holes emit absolutely nothing.",
    reality:
      "Classical black holes are perfectly black, but quantum field theory in curved spacetime predicts thermal Hawking radiation with a temperature inversely proportional to mass (T ≈ 6 × 10⁻⁸ K for a solar-mass BH). Stellar BHs are colder than the CMB and grow rather than evaporate, but primordial micro-BHs would have detonated by now. Hawking radiation is unobserved directly but the theoretical case is robust.",
    category: "cosmology",
    sources: [
      {
        title: "Hawking 1974 — Black Hole Explosions?",
        url: "https://www.nature.com/articles/248030a0",
      },
    ],
  },
];

export function mythsByCategory(cat: MythCategory | "all"): Myth[] {
  if (cat === "all") return SPACE_MYTHS;
  return SPACE_MYTHS.filter((m) => m.category === cat);
}

export function mythCountByCategory(): Record<MythCategory, number> {
  const counts: Record<MythCategory, number> = {
    "solar-system": 0,
    "stars-and-galaxies": 0,
    cosmology: 0,
    "space-travel": 0,
    physics: 0,
    history: 0,
  };
  for (const m of SPACE_MYTHS) counts[m.category] += 1;
  return counts;
}

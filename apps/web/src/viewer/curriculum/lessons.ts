import type { Lesson } from "./types";

/**
 * Curriculum seed — the first three "Where are we?" lessons.
 *
 * Narration voice is the same smart-older-sibling tone the Grand Tour uses:
 * vivid, factual, never condescending. Scene steps drive the existing
 * `#solar?focus=<Body>` hash format the SolarFlight scene already listens
 * for.
 *
 * Durations:
 *   narrate steps without an explicit `durationMs` auto-pace on word count
 *   in the runner. Where pacing matters (e.g. silent stargazing close-out)
 *   we set a deliberate value here.
 */

export const LESSONS: Lesson[] = [
  {
    id: "where-are-we-standing",
    title: "Where are we standing?",
    summary:
      "Your address in the universe — Earth, its rotation, and why we have seasons.",
    ageTier: "teen",
    durationMin: 5,
    steps: [
      {
        kind: "narrate",
        text: "Right now, you're on a ball of rock and water, spinning at roughly 1,670 km/h at the equator, orbiting a fusion reactor 150 million kilometres away. This lesson is about where 'here' is.",
      },
      { kind: "scene", hash: "#solar?focus=Earth" },
      {
        kind: "narrate",
        text: "Earth rotates west-to-east — that's why the Sun appears to rise in the east. The 23.5° axial tilt is why we have seasons. The tilt is fixed in space, so for half the year the northern hemisphere leans toward the Sun, and for the other half it leans away.",
      },
      { kind: "wait", ms: 4000 },
      {
        kind: "quiz",
        question:
          "Earth rotates from west to east. Which direction does the Sun therefore appear to move across the sky?",
        options: [
          "East to west",
          "West to east",
          "South to north",
          "North to south",
        ],
        answerIndex: 0,
        explanation:
          "Because we're rotating eastward, everything in the sky appears to move the opposite direction — east to west.",
      },
      {
        kind: "narrate",
        text: "Next time you watch a sunset, remember: the Sun isn't moving. You are.",
      },
    ],
  },
  {
    id: "how-big-is-the-sun",
    title: "How big is the Sun?",
    summary:
      "A trip to the star at the centre of everything — and a sense of just how massive it is.",
    ageTier: "teen",
    durationMin: 6,
    steps: [
      {
        kind: "narrate",
        text: "If Earth were a marble, the Sun would be a beach ball 30 metres away. Let's actually go look.",
      },
      { kind: "scene", hash: "#solar?focus=Sun" },
      {
        kind: "narrate",
        text: "The Sun is 1.4 million km across — that's 109 Earths lined up edge-to-edge. By volume, you could fit about 1.3 million Earths inside it. The Sun contains 99.86% of all the mass in the solar system.",
      },
      {
        kind: "quiz",
        question:
          "Roughly how many Earths could fit inside the Sun by volume?",
        options: ["13", "1,300", "1.3 million", "130 million"],
        answerIndex: 2,
        explanation:
          "Volume scales with the cube of radius. The Sun's radius is ~109× Earth's, so its volume is ~109³ ≈ 1.3 million.",
      },
      {
        kind: "narrate",
        text: "Every second the Sun converts 4 million tonnes of matter into pure energy via fusion. That energy is what reaches Earth as sunlight eight minutes later — making every plant, every animal, every photograph you've ever taken possible.",
      },
    ],
  },
  {
    id: "solar-system-true-scale",
    title: "The Solar System in true scale",
    summary:
      "A flight from Mercury to Neptune that shows how mostly-empty the neighbourhood really is.",
    ageTier: "teen",
    durationMin: 7,
    steps: [
      {
        kind: "narrate",
        text: "Most diagrams of the solar system lie. They squish the planets close together so you can see them all on one page. The truth is that the solar system is mostly empty space.",
      },
      { kind: "scene", hash: "#solar?focus=Mercury" },
      {
        kind: "narrate",
        text: "Light from the Sun reaches Mercury in three minutes. From here Earth looks like a bright blue star.",
      },
      { kind: "scene", hash: "#solar?focus=Earth" },
      {
        kind: "narrate",
        text: "Sunlight reaches Earth in 8 minutes 20 seconds. This is the closest the Sun ever feels to us.",
      },
      { kind: "scene", hash: "#solar?focus=Jupiter" },
      {
        kind: "narrate",
        text: "Now we're five times farther from the Sun than Earth. Sunlight took 43 minutes to get here. Jupiter alone has 2.5× the mass of every other planet combined.",
      },
      { kind: "scene", hash: "#solar?focus=Neptune" },
      {
        kind: "narrate",
        text: "Neptune is 30 AU out. Sunlight takes 4 hours and 10 minutes to reach here. From Neptune, the Sun is just the brightest star in the sky.",
      },
      {
        kind: "quiz",
        question:
          "Approximately how long does sunlight take to reach Earth from the Sun?",
        options: ["8 seconds", "8 minutes", "8 hours", "8 days"],
        answerIndex: 1,
        explanation:
          "Light travels 299,792 km every second. The Sun is ~150 million km away, so the trip takes about 8 minutes and 20 seconds.",
      },
      {
        kind: "narrate",
        text: "The next stop after Neptune is the Kuiper Belt, then the Oort Cloud, then four light-years of empty space until the nearest star. We live in a very, very big neighbourhood.",
      },
    ],
  },
  {
    id: "keplers-laws",
    title: "Kepler's laws of planetary motion",
    summary:
      "Three rules — derived from Tycho's data — that turned the heavens into geometry.",
    ageTier: "teen",
    durationMin: 9,
    steps: [
      {
        kind: "narrate",
        text: "For decades, Tycho Brahe measured planetary positions from a Danish island, naked-eye, to an accuracy of one arc-minute. When he died in 1601 he left a mountain of data to his assistant, Johannes Kepler. Kepler spent eight years wrestling with the orbit of Mars before he saw it: planets don't move in circles.",
      },
      { kind: "scene", hash: "#solar?focus=Mars" },
      {
        kind: "narrate",
        text: "Law 1 — every planet orbits the Sun in an ellipse, with the Sun at one focus. Mars is the most eccentric of the bright planets: its distance to the Sun varies by 42 million km between perihelion and aphelion. Circles were a 2,000-year-old prejudice. Ellipses fit the data.",
      },
      {
        kind: "quiz",
        question: "Which shape best describes a planetary orbit?",
        options: ["Circle", "Parabola", "Ellipse", "Helix"],
        answerIndex: 2,
        explanation:
          "Kepler's first law: planets trace ellipses with the Sun at one focus. A circle is a special case where both foci coincide, but real orbits are always at least slightly elliptical.",
      },
      { kind: "scene", hash: "#solar?focus=Earth" },
      {
        kind: "narrate",
        text: "Law 2 — a line drawn from the Sun to a planet sweeps out equal areas in equal times. Earth moves about 30 km/s on average, but it's roughly 1 km/s faster at perihelion in early January than at aphelion in July. Planets accelerate when they're close to the Sun and slow down when they're far. It's gravity, doing its bookkeeping.",
      },
      {
        kind: "quiz",
        question:
          "If a planet sweeps equal areas in equal times, when does it move fastest?",
        options: ["Aphelion", "Perihelion", "Mid-orbit", "All the same"],
        answerIndex: 1,
        explanation:
          "At perihelion the planet is closest to the Sun, so the radial line is shortest — to sweep the same area, the planet must cover more arc length, i.e. move faster.",
      },
      {
        kind: "narrate",
        text: "Law 3 — the square of a planet's orbital period is proportional to the cube of its semi-major axis. T² ∝ a³. Double a planet's distance from the Sun and its year gets 2.83× longer. This is the law Newton later derived from gravity itself, in 1687.",
      },
      {
        kind: "quiz",
        question:
          "If planet A is 4× further from the Sun than planet B, planet A's orbital period is approximately…",
        options: ["4× as long", "8× as long", "16× as long", "64× as long"],
        answerIndex: 1,
        explanation:
          "T² = a³, so T = a^(3/2). With a = 4, T = 4^1.5 = 8. Distance quadruples; the year takes eight times longer.",
      },
      {
        kind: "narrate",
        text: "Kepler never knew why the laws worked — that took Newton and the inverse-square law of gravity. But the three rules he extracted from Tycho's numbers are still exact today, and every spacecraft we've ever launched flies on them.",
      },
    ],
  },
  {
    id: "why-planets-differ",
    title: "Why planets aren't all the same",
    summary:
      "A cross-section tour from Mercury to Neptune — and why composition decides everything.",
    ageTier: "teen",
    durationMin: 7,
    steps: [
      {
        kind: "narrate",
        text: "The planets formed from the same disk of gas and dust 4.6 billion years ago, but they look nothing alike. The reason is simple: the inner solar system was too hot for ice, and the outer solar system was cold enough to hoard hydrogen. Open the cross-section panel as we go — the layers tell the story.",
      },
      { kind: "scene", hash: "#solar?focus=Mercury" },
      {
        kind: "narrate",
        text: "Mercury — a small rocky world, 4,880 km across, with a startlingly large iron core that takes up 85% of its radius. Possibly the leftover after a giant impact stripped off the lighter mantle. No atmosphere, no weather, just craters and 600°C day-night swings.",
      },
      { kind: "scene", hash: "#solar?focus=Earth" },
      {
        kind: "narrate",
        text: "Earth — rocky, but with a liquid water ocean on the surface and a molten iron-nickel outer core that spins like a dynamo, generating a magnetic field strong enough to deflect the solar wind. Without that field, the atmosphere would have been stripped away. Without the atmosphere, no us.",
      },
      { kind: "scene", hash: "#solar?focus=Jupiter" },
      {
        kind: "narrate",
        text: "Jupiter — 318 Earth masses, but mostly hydrogen and helium. The pressure inside is so extreme that 10,000 km down, hydrogen turns metallic and conducts electricity. That sloshing metal generates a magnetic field 20,000× stronger than Earth's. There's a small, dilute core in there somewhere, but Jupiter is essentially a failed star.",
      },
      { kind: "scene", hash: "#solar?focus=Neptune" },
      {
        kind: "narrate",
        text: "Neptune — an ice giant. The 'ice' here is planetary-science slang for water, methane, and ammonia, but at these pressures and temperatures they exist as a hot ionic fluid — neither solid nor gas. Neptune's blue colour is methane in the upper atmosphere absorbing red light. Wind speeds top 2,000 km/h, the fastest in the solar system.",
      },
      {
        kind: "quiz",
        question:
          "What gives gas giants their layered structure of metallic hydrogen, molecular hydrogen, and atmosphere?",
        options: [
          "Temperature alone",
          "Pressure alone",
          "Both pressure and composition",
          "Magnetic fields",
        ],
        answerIndex: 2,
        explanation:
          "Hydrogen behaves differently at different pressures — molecular at the surface, metallic deep inside. Combined with the planet's mix of H, He, and ices, that pressure profile sets every layer.",
      },
      {
        kind: "narrate",
        text: "Same starting material, wildly different outcomes — because distance from the Sun decided what could condense, and mass decided what could be held onto. Planetary diversity is geometry plus chemistry.",
      },
    ],
  },
  {
    id: "moons-rings-asteroids",
    title: "Moons, rings, asteroids — the leftovers",
    summary:
      "A tour of the solar system's small bodies — and why Hollywood lies about asteroid belts.",
    ageTier: "teen",
    durationMin: 7,
    steps: [
      {
        kind: "narrate",
        text: "Planets get the headlines, but the solar system is mostly leftovers — moons, rings, asteroids, comets. They're where the real history is preserved, because they're too small to have remelted.",
      },
      { kind: "scene", hash: "#solar?focus=Saturn" },
      {
        kind: "narrate",
        text: "Saturn's rings are 99% water ice and 1% dust, spread across 280,000 km — but they're only about 10 metres thick. If you scaled the rings to the size of a football field, they'd be thinner than a sheet of paper. They might be the debris of a moon that wandered too close and tore itself apart.",
      },
      { kind: "scene", hash: "#solar?focus=Jupiter" },
      {
        kind: "narrate",
        text: "Jupiter has 95 known moons, but the four big ones — Io, Europa, Ganymede, Callisto — were spotted by Galileo in 1610 and broke the geocentric model overnight. Io is the most volcanically active body in the solar system, squeezed by tidal forces. Europa has a subsurface ocean with more liquid water than every ocean on Earth combined.",
      },
      {
        kind: "narrate",
        text: "Between Mars and Jupiter sits the asteroid belt — about a million rocks larger than 1 km. In the movies, ships dodge through it. In reality, the average spacing between asteroids is around a million kilometres. Probes routinely fly through and find absolutely nothing for thousands of kilometres in every direction.",
      },
      {
        kind: "narrate",
        text: "Out past Neptune is the Kuiper Belt — a doughnut of icy bodies including Pluto, Eris, Makemake, and Haumea. These are the leftovers from the disk that never glommed onto a planet. Short-period comets — anything with an orbit under 200 years — come from here. Halley's Comet is one of them.",
      },
      {
        kind: "quiz",
        question:
          "If you stood on a typical main-belt asteroid, how many other asteroids would you typically see overhead with the naked eye?",
        options: ["Thousands", "Hundreds", "Dozens", "None"],
        answerIndex: 3,
        explanation:
          "The belt is enormous and the asteroids are tiny — average spacing is around a million kilometres. You'd see stars and the Sun, but no other asteroids. Hollywood lies.",
      },
      {
        kind: "narrate",
        text: "Everywhere we point a spacecraft we find more small bodies. They're the unfinished business of planet formation, and the best record we have of what the early solar system was made of.",
      },
    ],
  },
  {
    id: "sun-is-a-star",
    title: "The Sun is a star. Are other stars like it?",
    summary:
      "An H-R-diagram field trip from a red supergiant to a blue main-sequence beast.",
    ageTier: "teen",
    durationMin: 8,
    steps: [
      {
        kind: "narrate",
        text: "The Sun looks special because we're three light-minutes away from it. From any other star system, our Sun would just be a yellow dot — a perfectly ordinary G2V main-sequence star. So what does the rest of the population look like?",
      },
      { kind: "scene", hash: "#sky?ra=86.13&dec=-2.49" },
      {
        kind: "narrate",
        text: "Betelgeuse — the red shoulder of Orion, an M-type red supergiant. It's roughly 700× the Sun's radius. If you swapped it for the Sun, its surface would extend past the orbit of Mars. It's only 10 million years old but already nearly out of fuel, and it'll go supernova within the next 100,000 years — possibly tomorrow.",
      },
      { kind: "scene", hash: "#sky?ra=78.63&dec=8.20" },
      {
        kind: "narrate",
        text: "Bellatrix — Orion's left shoulder, a B2 III blue giant. Surface temperature around 22,000 K, six times hotter than the Sun, and 6,400× as luminous. Massive stars burn through their hydrogen ferociously: Bellatrix is only 25 million years old and already past the main sequence. Live fast, die young.",
      },
      { kind: "scene", hash: "#sky?ra=101.27&dec=-16.72" },
      {
        kind: "narrate",
        text: "Sirius — the brightest star in our sky, only 8.6 light-years away. An A1V main-sequence star, twice the Sun's mass, 25× as luminous, white-hot at 9,940 K. It also has a tiny companion: Sirius B, a white dwarf the size of Earth with the mass of the Sun. The end state of stars like ours.",
      },
      {
        kind: "quiz",
        question:
          "Which type of star has the SHORTEST main-sequence lifetime?",
        options: [
          "Red dwarfs",
          "Yellow stars like the Sun",
          "Blue O-type giants",
          "White dwarfs",
        ],
        answerIndex: 2,
        explanation:
          "Higher mass means higher core temperature and pressure, so fusion runs much faster. A 50-solar-mass O-type giant burns out in a few million years; a red dwarf can live for trillions.",
      },
      {
        kind: "narrate",
        text: "Plot stars by colour against brightness and they fall on a diagonal band — the main sequence — that's been the spine of stellar astrophysics for a century. The Sun sits modestly in the middle of it, and it has another five billion years to go.",
      },
    ],
  },
  {
    id: "nearest-star",
    title: "How far is the nearest star?",
    summary:
      "Proxima Centauri is 4.24 light-years away. Here's what that actually means.",
    ageTier: "teen",
    durationMin: 6,
    steps: [
      {
        kind: "narrate",
        text: "The Sun is one star. There are about 400 billion others in our galaxy. The closest one is called Proxima Centauri — a small red dwarf, only 12% the Sun's mass, currently 4.24 light-years away.",
      },
      { kind: "scene", hash: "#sky?ra=217.42&dec=-62.68" },
      {
        kind: "narrate",
        text: "Proxima is an M5.5Ve red dwarf, far too dim to see with the naked eye despite being our nearest stellar neighbour. In 2016 astronomers found a planet around it — Proxima b — roughly Earth-mass, in the habitable zone, though probably tidally locked and bathed in stellar flares.",
      },
      {
        kind: "narrate",
        text: "4.24 light-years means light itself — the fastest thing in the universe — takes 4.24 years to make the trip. Voyager 1, the fastest spacecraft humans have ever built, is moving at 17 km/s. At that speed, it would take Voyager about 73,000 years to reach Proxima. We have not been a species for that long.",
      },
      {
        kind: "narrate",
        text: "Here's the brutal scale: the distance from the Sun to Neptune is 30 AU. The distance from the Sun to Proxima is 268,000 AU. The gulf between neighbouring stars is roughly 1,000× the gulf between the Sun and Neptune. Stars in a galaxy are not crowded. They're flecks of light in an ocean.",
      },
      {
        kind: "quiz",
        question:
          "If the Sun were the size of a basketball, how far away would Proxima Centauri be on the same scale?",
        options: ["10 m", "1 km", "100 km", "6,300 km"],
        answerIndex: 3,
        explanation:
          "A basketball-sized Sun puts Earth about 25 m away. On that same scale, Proxima sits roughly 6,300 km away — about the distance from New York to Paris. That's just to the nearest one.",
      },
      {
        kind: "narrate",
        text: "Every star you see at night is at least this far away. Most are much, much further. The night sky is a snapshot of light that left its source years, centuries, or millennia ago.",
      },
    ],
  },
  {
    id: "constellations-human-invention",
    title: "Constellations are a human invention",
    summary:
      "Orion's stars look neighbourly — until you ask how far away each one actually is.",
    ageTier: "teen",
    durationMin: 6,
    steps: [
      {
        kind: "narrate",
        text: "Turn on the constellation overlay and the sky snaps into shapes — a hunter, a bear, a swan. Every culture has drawn its own. Here's the secret: none of those shapes are physically real.",
      },
      { kind: "scene", hash: "#viewer?ra=83.82&dec=-1.20&fov=30&c=1" },
      {
        kind: "narrate",
        text: "This is Orion — the most recognisable constellation in the northern sky. The hunter's belt, his shoulders, his sword — seven naked-eye stars connected by lines that humans drew. Now look at how far away each one really is.",
      },
      { kind: "scene", hash: "#sky?ra=88.79&dec=7.41" },
      {
        kind: "narrate",
        text: "Betelgeuse — the red shoulder — sits 642 light-years from us. Bellatrix, the bluer shoulder right next to it on the sky, is only 250 light-years away. They're separated by nearly 400 light-years along our line of sight. They aren't neighbours; they only look adjacent because we're looking at them from one specific angle in the galaxy.",
      },
      {
        kind: "narrate",
        text: "Fly to any other star system and Orion vanishes. The pattern only exists from Earth. Constellations are coordinates we drew on the dome of the sky — useful for navigation, beautiful as mythology, but not physical groups. The stars inside one are no more related to each other than three random people who happen to line up on a city street.",
      },
      {
        kind: "quiz",
        question:
          "Why isn't a constellation a 'real' physical group of stars?",
        options: [
          "The stars are too dim to be related",
          "The stars are at completely different distances from us",
          "Constellations only contain one star each",
          "The stars are moving too fast to be grouped",
        ],
        answerIndex: 1,
        explanation:
          "A constellation is a 2D pattern projected onto the sky. The stars inside it are at wildly different distances — Betelgeuse and Bellatrix differ by ~400 ly along our sightline. From any other vantage point in the galaxy, the pattern dissolves.",
      },
      {
        kind: "narrate",
        text: "The shapes are ours. The stars are simply where they are.",
      },
    ],
  },
  {
    id: "milky-way-place-we-live",
    title: "The Milky Way is a place we live in",
    summary:
      "Pull back from the Sun until our whole galaxy fits in the frame — and meet the black hole at its centre.",
    ageTier: "teen",
    durationMin: 7,
    steps: [
      {
        kind: "narrate",
        text: "Everything we've looked at so far — the planets, the Sun, the few hundred stars you can name — fits inside a tiny patch of one galaxy. Time to zoom out.",
      },
      { kind: "scene", hash: "#galactic" },
      {
        kind: "narrate",
        text: "This is the Milky Way: a barred spiral disc roughly 100,000 light-years across, with somewhere between 100 and 400 billion stars. We sit 26,000 light-years from the centre, in a minor spiral feature called the Orion Spur — a quiet suburb between the Sagittarius and Perseus arms.",
      },
      { kind: "scene", hash: "#sky?ra=266.4168&dec=-29.0078" },
      {
        kind: "narrate",
        text: "At the centre is Sagittarius A* — a supermassive black hole with 4.3 million solar masses crammed into a region smaller than Mercury's orbit. We can't see it in visible light because 26,000 ly of galactic dust sits in the way, but X-ray and infrared cut right through. The Event Horizon Telescope imaged its shadow in 2022.",
      },
      {
        kind: "narrate",
        text: "Every star you can see with the naked eye lives inside this same disc. The faint band of light you call 'the Milky Way' on a dark night is the disc itself, viewed edge-on from inside it. You are literally looking out through the body of your own galaxy.",
      },
      {
        kind: "quiz",
        question: "Roughly how many stars does the Milky Way contain?",
        options: [
          "1 billion",
          "100–400 billion",
          "10 trillion",
          "1 quadrillion",
        ],
        answerIndex: 1,
        explanation:
          "Modern surveys converge on 100–400 billion stars, depending on how you count low-mass red dwarfs. Most are far too dim to see individually — they're hidden in the diffuse glow of the disc.",
      },
      {
        kind: "narrate",
        text: "One galaxy down. Roughly two trillion to go.",
      },
    ],
  },
  {
    id: "other-galaxies-milky-ways",
    title: "Other galaxies, other Milky Ways",
    summary:
      "Andromeda is 2.5 million light-years away — and on a collision course with us.",
    ageTier: "teen",
    durationMin: 6,
    steps: [
      {
        kind: "narrate",
        text: "The Milky Way is one galaxy out of about two trillion in the observable universe. The nearest large one — Andromeda, M31 — is close enough that you can see it with the naked eye on a dark night, as a faint smudge in the constellation of the same name.",
      },
      { kind: "scene", hash: "#sky?ra=10.6847&dec=41.2691" },
      {
        kind: "narrate",
        text: "Andromeda is 2.5 million light-years away. The photons hitting your eye when you look at it left M31 when our ancestors were Homo habilis, just figuring out how to chip stone tools. Everything that has ever happened in recorded human history is younger than the light from this one galaxy.",
      },
      {
        kind: "narrate",
        text: "M31 is bigger than the Milky Way — about a trillion stars — and it's coming for us. Andromeda is moving toward the Milky Way at 110 km/s. In 4.5 billion years the two galaxies will collide, slingshot through each other, and over the next billion years settle into a single elliptical galaxy astronomers have already nicknamed Milkomeda.",
      },
      {
        kind: "narrate",
        text: "Don't worry about the stars colliding. Galaxies are mostly empty space — the chance of any two stars hitting is essentially zero. But the night sky changes utterly. The sky won't be black and starry anymore; it'll have another galaxy's disc smeared across it.",
      },
      {
        kind: "quiz",
        question: "How long does light from Andromeda take to reach us?",
        options: [
          "2.5 years",
          "2,500 years",
          "2.5 million years",
          "25 million years",
        ],
        answerIndex: 2,
        explanation:
          "Andromeda is 2.5 million light-years away, so its light takes 2.5 million years to reach us. Looking at it is literal time travel — you're seeing it as it was when our genus first appeared on Earth.",
      },
      {
        kind: "narrate",
        text: "Every fuzzy patch in a deep telescope image is another disc of a hundred billion suns. The universe is built out of galaxies the way a beach is built out of sand.",
      },
    ],
  },
  {
    id: "redshift-universe-past",
    title: "The universe has a past you can see",
    summary:
      "Redshift turns colour into distance — and lets us look billions of years backward in time.",
    ageTier: "teen",
    durationMin: 7,
    steps: [
      {
        kind: "narrate",
        text: "When a galaxy moves away from us, the light it emits gets stretched on the way here. Blue lines slide toward red. The faster the galaxy recedes, the larger the shift. Astronomers call the ratio z — and it's how we measure the universe.",
      },
      { kind: "scene", hash: "#sky?ra=187.278&dec=2.052" },
      {
        kind: "narrate",
        text: "This is 3C 273, the first quasar ever identified — Maarten Schmidt cracked its spectrum in 1963. Its lines were shifted so far to the red that nothing nearby could explain it. The only answer was distance: 3C 273 sits about 2.4 billion light-years away, in a galaxy whose central black hole is devouring matter so violently it outshines the Milky Way by a factor of four trillion.",
      },
      {
        kind: "narrate",
        text: "We're seeing 3C 273 as it was 2.4 billion years ago — when Earth had no multicellular life and the atmosphere was just beginning to fill with oxygen. The light spent longer crossing space to reach us than complex life has existed on this planet.",
      },
      {
        kind: "narrate",
        text: "The bigger the redshift, the further back you're looking. The James Webb Space Telescope has now found galaxies at z = 14 — light that left them when the universe was only 290 million years old. Telescopes are time machines that only point one direction: backwards.",
      },
      {
        kind: "quiz",
        question: "What does a galaxy's redshift z directly tell you?",
        options: [
          "The galaxy's temperature",
          "How fast it's moving away from us",
          "The galaxy's age",
          "The galaxy's mass",
        ],
        answerIndex: 1,
        explanation:
          "Redshift is a Doppler measurement: it gives you recession velocity directly. Combined with Hubble's law (v ≈ H₀ × d), that velocity then converts to distance — and distance, divided by the speed of light, converts to look-back time.",
      },
      {
        kind: "narrate",
        text: "Every spectrum is a fossil. Read the lines, and you read the history of the cosmos.",
      },
    ],
  },
  {
    id: "cosmic-web",
    title: "The cosmic web",
    summary:
      "Galaxies aren't scattered — they cluster on filaments separated by gigantic empty voids.",
    ageTier: "teen",
    durationMin: 7,
    steps: [
      {
        kind: "narrate",
        text: "If you sprinkled two trillion galaxies through space at random, the sky would be a uniform fog. Instead, when we map them in three dimensions, galaxies clump along thin sheets and filaments separated by enormous empty regions. The structure has a name: the cosmic web.",
      },
      { kind: "scene", hash: "#universe" },
      {
        kind: "narrate",
        text: "The largest single structure we know — the Sloan Great Wall — is a filament of galaxy clusters 1.4 billion light-years long. The largest empty region — the Boötes Void — is 330 million light-years across and contains only about 60 galaxies, where a typical region of that size would hold ten thousand.",
      },
      {
        kind: "narrate",
        text: "We didn't design these patterns. They were seeded 380,000 years after the Big Bang as tiny density fluctuations — one part in 100,000, recorded in the cosmic microwave background — and amplified by gravity over 13.8 billion years. The web you're looking at is the universe's slow self-assembly.",
      },
      {
        kind: "narrate",
        text: "And the threads of the web aren't made of stars. They're made of something we cannot see directly. Galaxies are just glowing markers stuck to the surface of vast invisible filaments — and those filaments are dark matter.",
      },
      {
        kind: "quiz",
        question: "What dominates the mass of the cosmic web?",
        options: [
          "Stars",
          "Interstellar gas",
          "Dark matter",
          "Black holes",
        ],
        answerIndex: 2,
        explanation:
          "Dark matter is roughly 85% of all the matter in the universe and about 27% of its total energy budget. We've never detected a dark matter particle directly — only its gravitational pull on galaxies, on light, and on the shape of the web itself.",
      },
      {
        kind: "narrate",
        text: "Everything you've ever seen, every star and every galaxy, is decoration on a scaffolding made of stuff we can't see. The visible universe is the foam on a much darker ocean.",
      },
    ],
  },
  {
    id: "how-we-know-m87",
    title: "How we know all this",
    summary:
      "The first photograph of a black hole — and the year of work it took to make it.",
    ageTier: "teen",
    durationMin: 8,
    steps: [
      {
        kind: "narrate",
        text: "It's fair to ask: how does anyone actually know what's true about something 55 million light-years away? Here's one example, end to end.",
      },
      { kind: "scene", hash: "#sky?ra=187.706&dec=12.391" },
      {
        kind: "narrate",
        text: "This is M87* — the supermassive black hole at the heart of the elliptical galaxy M87, in the Virgo Cluster. It weighs 6.5 billion solar masses, more than 1,500× heavier than the one at the centre of our own galaxy. On April 10, 2019, the Event Horizon Telescope collaboration published the first photograph of its shadow.",
      },
      {
        kind: "narrate",
        text: "It is not actually a photograph in the camera-shutter sense. The EHT is eight radio telescopes spread across Earth — Hawaii to Spain to Antarctica — observing M87 simultaneously and combining their signals into a synthetic dish the size of the planet. The technique is called very-long-baseline interferometry, VLBI. The observation took five nights in April 2017; the image took two years of analysis to extract.",
      },
      {
        kind: "narrate",
        text: "The dark central region in the EHT image is about 2.5 times the Schwarzschild radius of the black hole. That's not the event horizon itself — it's the photon sphere, the radius at which a beam of light is bent by exactly 90° and orbits the black hole. The bright ring is light wrapping around behind the hole and being focused back toward us.",
      },
      {
        kind: "narrate",
        text: "General relativity, formulated by Einstein in 1915, predicted that this is exactly what you'd see if you could resolve a black hole's shadow. A hundred and four years later, the measurement matched the prediction to within a few percent. That's how we know.",
      },
      {
        kind: "quiz",
        question:
          "The EHT's M87* image directly confirmed which prediction of general relativity?",
        options: [
          "Gravitational waves",
          "Light bending into a photon ring around an event horizon",
          "Hawking radiation",
          "The existence of dark matter",
        ],
        answerIndex: 1,
        explanation:
          "The bright crescent in the image is light forced onto curved paths around the black hole — GR predicts a photon ring at 2.5× the Schwarzschild radius, and the measurement landed there. Hawking radiation is far too faint to detect this way, and dark matter and gravitational waves are unrelated tests.",
      },
      {
        kind: "narrate",
        text: "Every claim in this curriculum is the end of a chain like this one: a prediction, an instrument, a measurement, a comparison. The universe is knowable. It just takes patience.",
      },
    ],
  },
  {
    id: "what-we-still-dont-know",
    title: "What we still don't know",
    summary:
      "Dark matter, dark energy, the question of life elsewhere — the honest map of our ignorance.",
    ageTier: "teen",
    durationMin: 8,
    steps: [
      {
        kind: "narrate",
        text: "End of the tour. Time for the uncomfortable confession: we have a pretty good map of the universe, but we don't know what most of it is made of.",
      },
      {
        kind: "narrate",
        text: "Roughly 5% of the universe's energy is ordinary matter — atoms, the stuff stars and people are built from. About 27% is dark matter, which clumps under gravity but doesn't emit, absorb, or scatter light. The remaining 68% is dark energy, a uniform pressure stretching space itself, accelerating the expansion of the cosmos. We have detected both only through their gravitational effects. We do not know what they are.",
      },
      {
        kind: "narrate",
        text: "Next question: is there life anywhere else? As of today, no biosignature has been confirmed on any exoplanet. The most discussed recent candidate is JWST's tentative detection of dimethyl sulphide in the atmosphere of K2-18 b in 2023 — a molecule produced only by living organisms on Earth — but the signal is weak, contested, and being re-checked.",
      },
      { kind: "scene", hash: "#sky?ra=346.622&dec=-5.041" },
      {
        kind: "narrate",
        text: "This is TRAPPIST-1, a red dwarf 40 light-years away with seven Earth-sized planets in orbit — three of them in the habitable zone where liquid water could exist on the surface. JWST is scanning their atmospheres right now, looking for water, methane, oxygen, anything anomalous. We may have an answer to 'are we alone' within the next decade. We may not.",
      },
      {
        kind: "narrate",
        text: "And the biggest open problems beneath everything: we have no working theory that combines quantum mechanics with general relativity. Why dark energy has the value it does is unexplained. Whether our universe is the only one is genuinely unknown. These aren't gaps in a textbook — they're cliffs at the edge of the map.",
      },
      {
        kind: "quiz",
        question:
          "Which of these is honestly the BIGGEST unsolved problem in physics today?",
        options: [
          "What dark energy is",
          "How consciousness arises",
          "How to unify quantum mechanics and gravity",
          "Where life on Earth came from",
        ],
        answerIndex: 0,
        explanation:
          "This is a judgment call — quantum gravity is a defensible answer too, since solving it would likely tell us what dark energy is and what happens inside a black hole. Dark energy is currently the biggest measured thing in the universe that nobody can explain. Consciousness and abiogenesis are huge open questions, but they sit further from fundamental physics.",
      },
      {
        kind: "narrate",
        text: "You now know roughly what the human species knows about the universe. Most of the work is still ahead of us. That's the good news.",
      },
    ],
  },
];

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
];

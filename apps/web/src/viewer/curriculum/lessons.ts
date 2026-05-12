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
];

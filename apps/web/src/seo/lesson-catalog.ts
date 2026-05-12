/**
 * SEO mirror of the existing curriculum lesson list at
 * `apps/web/src/viewer/curriculum/lessons.ts`. We deliberately re-export
 * a slim, public-facing slice (id, title, summary, age tier, duration,
 * step count) rather than rendering the full narration / quiz / scene
 * tree on the static page — the lesson body itself is gated by the
 * interactive viewer.
 *
 * Keeping this list in sync with the source-of-truth curriculum is a
 * lightweight maintenance task: when a lesson is added or removed from
 * `LESSONS` in the viewer, mirror the change here. We do not import
 * the runtime curriculum module directly because it pulls in React
 * narration types we want to keep out of the build-time SEO pipeline.
 *
 * Lesson count: 15. The curriculum was rebuilt as a 15-lesson
 * "Where are we, what is everything, what do we still not know" arc;
 * earlier sprint plans referenced an 8-lesson seed.
 */

export type SeoLesson = {
  id: string;
  title: string;
  summary: string;
  ageTier: "kid" | "teen" | "adult";
  durationMin: number;
  /** Total number of steps in the lesson (narration + scene + wait + quiz). */
  stepCount: number;
  /**
   * Slugs of related objects in `FAMOUS_OBJECTS` that the lesson visits
   * or references. Used to surface internal links from each lesson page.
   */
  relatedObjectSlugs: string[];
};

export const LESSONS: SeoLesson[] = [
  {
    id: "where-are-we-standing",
    title: "Where are we standing?",
    summary:
      "Your address in the universe — Earth, its rotation, and why we have seasons.",
    ageTier: "teen",
    durationMin: 5,
    stepCount: 6,
    relatedObjectSlugs: ["m45", "m42", "m31", "m44", "hyades"],
  },
  {
    id: "how-big-is-the-sun",
    title: "How big is the Sun?",
    summary:
      "A trip to the star at the centre of everything — and a sense of just how massive it is.",
    ageTier: "teen",
    durationMin: 6,
    stepCount: 5,
    relatedObjectSlugs: ["m45", "hyades", "m44", "m42", "m31"],
  },
  {
    id: "solar-system-true-scale",
    title: "The Solar System in true scale",
    summary:
      "A flight from Mercury to Neptune that shows how mostly-empty the neighbourhood really is.",
    ageTier: "teen",
    durationMin: 7,
    stepCount: 9,
    relatedObjectSlugs: ["m45", "m44", "m42", "hyades", "m31"],
  },
  {
    id: "keplers-laws",
    title: "Kepler's laws of planetary motion",
    summary:
      "Three rules — derived from Tycho's data — that turned the heavens into geometry.",
    ageTier: "teen",
    durationMin: 9,
    stepCount: 9,
    relatedObjectSlugs: ["m42", "m45", "hyades", "m44", "m31"],
  },
  {
    id: "why-planets-differ",
    title: "Why planets aren't all the same",
    summary:
      "A cross-section tour from Mercury to Neptune — and why composition decides everything.",
    ageTier: "teen",
    durationMin: 7,
    stepCount: 10,
    relatedObjectSlugs: ["m42", "m45", "m44", "hyades", "m31"],
  },
  {
    id: "moons-rings-asteroids",
    title: "Moons, rings, asteroids — the leftovers",
    summary:
      "A tour of the solar system's small bodies — and why Hollywood lies about asteroid belts.",
    ageTier: "teen",
    durationMin: 7,
    stepCount: 7,
    relatedObjectSlugs: ["m42", "m45", "m44", "hyades", "m31"],
  },
  {
    id: "sun-is-a-star",
    title: "The Sun is a star. Are other stars like it?",
    summary:
      "An H-R-diagram field trip from a red supergiant to a blue main-sequence beast.",
    ageTier: "teen",
    durationMin: 8,
    stepCount: 8,
    relatedObjectSlugs: ["m42", "m45", "hyades", "m44", "m31"],
  },
  {
    id: "nearest-star",
    title: "How far is the nearest star?",
    summary:
      "Proxima Centauri is 4.24 light-years away. Here's what that actually means.",
    ageTier: "teen",
    durationMin: 6,
    stepCount: 6,
    relatedObjectSlugs: ["m45", "hyades", "m44", "m42", "m31"],
  },
  {
    id: "constellations-human-invention",
    title: "Constellations are a human invention",
    summary:
      "Orion's stars look neighbourly — until you ask how far away each one actually is.",
    ageTier: "teen",
    durationMin: 6,
    stepCount: 6,
    relatedObjectSlugs: ["m42", "m43", "m45", "horsehead-nebula", "m78"],
  },
  {
    id: "milky-way-place-we-live",
    title: "The Milky Way is a place we live in",
    summary:
      "Pull back from the Sun until our whole galaxy fits in the frame — and meet the black hole at its centre.",
    ageTier: "teen",
    durationMin: 7,
    stepCount: 6,
    relatedObjectSlugs: ["sgr-a-star", "m22", "m4", "m54", "crab-pulsar"],
  },
  {
    id: "other-galaxies-milky-ways",
    title: "Other galaxies, other Milky Ways",
    summary:
      "Andromeda is 2.5 million light-years away — and on a collision course with us.",
    ageTier: "teen",
    durationMin: 6,
    stepCount: 6,
    relatedObjectSlugs: ["m31", "m32", "m110", "m33", "m81"],
  },
  {
    id: "redshift-universe-past",
    title: "The universe has a past you can see",
    summary:
      "Redshift turns colour into distance — and lets us look billions of years backward in time.",
    ageTier: "teen",
    durationMin: 7,
    stepCount: 6,
    relatedObjectSlugs: ["m87", "m87-star", "m31", "m33", "m51"],
  },
  {
    id: "cosmic-web",
    title: "The cosmic web",
    summary:
      "Galaxies aren't scattered — they cluster on filaments separated by gigantic empty voids.",
    ageTier: "teen",
    durationMin: 7,
    stepCount: 6,
    relatedObjectSlugs: ["m87", "m31", "m51", "m33", "m81"],
  },
  {
    id: "how-we-know-m87",
    title: "How we know all this",
    summary:
      "The first photograph of a black hole — and the year of work it took to make it.",
    ageTier: "teen",
    durationMin: 8,
    stepCount: 7,
    relatedObjectSlugs: ["m87-star", "m87", "sgr-a-star", "crab-pulsar", "gw170817"],
  },
  {
    id: "what-we-still-dont-know",
    title: "What we still don't know",
    summary:
      "Dark matter, dark energy, the question of life elsewhere — the honest map of our ignorance.",
    ageTier: "teen",
    durationMin: 8,
    stepCount: 7,
    relatedObjectSlugs: ["m45", "m31", "m42", "m87-star", "sgr-a-star"],
  },
];

/**
 * Offline backend — a hand-curated Q&A table covering ~30 of the most
 * common astronomy questions a casual stargazer might ask, plus a tiny
 * "tell me about <X>" handler for popular objects (Sun, M31, Saturn,
 * black holes, etc.). All answers cite Wikipedia URLs so the user can
 * read more, matching the citation contract of the LLM backends.
 *
 * Matching is a cheap token-overlap score against the entry's `triggers`
 * — *not* a full search engine. If the best score is below the floor we
 * return a friendly fallback that points to the SIMBAD/Wikipedia tier.
 *
 * This is the failsafe for when Ollama isn't installed / the user
 * disabled local models. It's not meant to feel smart; it's meant to
 * always answer *something* helpful.
 */

import type {
  ChatOptions,
  ChatResult,
  Citation,
  CopilotBackend,
  Message,
} from "../types";

const TOOL_REFUSAL_PREFIX =
  "I can't control the viewer with this backend. " +
  "Try the Cloudflare backend in settings to enable tool-calling. ";

type Entry = {
  /** Words / short phrases that strongly suggest this entry matches. */
  triggers: string[];
  answer: string;
  citations: Citation[];
};

const ENTRIES: Entry[] = [
  {
    triggers: ["pulsar"],
    answer:
      "A pulsar is a rapidly rotating neutron star whose magnetic poles sweep beams of radio (and sometimes X-ray or gamma-ray) light past Earth like a lighthouse. We see a pulse every rotation, anywhere from milliseconds to several seconds apart. The first pulsar, CP 1919, was discovered in 1967 by Jocelyn Bell Burnell.",
    citations: [
      { label: "Wikipedia: Pulsar", url: "https://en.wikipedia.org/wiki/Pulsar" },
    ],
  },
  {
    triggers: ["magnetar"],
    answer:
      "A magnetar is a neutron star with an extreme magnetic field — about 1,000× stronger than an ordinary pulsar's, and a quadrillion times Earth's. Their fields drive starquakes and occasional giant flares; some are thought to be the engines behind certain fast radio bursts.",
    citations: [
      { label: "Wikipedia: Magnetar", url: "https://en.wikipedia.org/wiki/Magnetar" },
    ],
  },
  {
    triggers: ["pulsar vs magnetar", "difference between pulsar and magnetar"],
    answer:
      "Both are neutron stars, but a magnetar has a magnetic field roughly 1,000× stronger than a typical pulsar. Pulsars are powered by their rotation, magnetars by the decay of that monstrous field. Pulsars beam steady pulses; magnetars erupt in bursts and giant flares.",
    citations: [
      { label: "Wikipedia: Magnetar", url: "https://en.wikipedia.org/wiki/Magnetar" },
      { label: "Wikipedia: Pulsar", url: "https://en.wikipedia.org/wiki/Pulsar" },
    ],
  },
  {
    triggers: ["black hole"],
    answer:
      "A black hole is a region of spacetime where gravity is so intense that nothing — not even light — can escape once it crosses the event horizon. Stellar-mass black holes form when massive stars collapse; supermassive black holes (millions to billions of solar masses) sit at the centers of most galaxies, including our own Sgr A*.",
    citations: [
      { label: "Wikipedia: Black hole", url: "https://en.wikipedia.org/wiki/Black_hole" },
    ],
  },
  {
    triggers: ["event horizon"],
    answer:
      "The event horizon is the one-way boundary around a black hole. Cross it and no signal you send out — light, radio, particles — can ever climb back. For a non-rotating black hole, the horizon is a sphere whose radius is the Schwarzschild radius, 2GM/c².",
    citations: [
      { label: "Wikipedia: Event horizon", url: "https://en.wikipedia.org/wiki/Event_horizon" },
    ],
  },
  {
    triggers: ["cosmic microwave background", "cmb"],
    answer:
      "The cosmic microwave background is the afterglow of the Big Bang: light that was emitted ~380,000 years after the universe began, when the plasma cooled enough for neutral atoms to form. It's now stretched into the microwave band and fills the sky at about 2.725 K. WMAP and Planck mapped its tiny temperature ripples, which seeded all later structure.",
    citations: [
      { label: "Wikipedia: Cosmic microwave background", url: "https://en.wikipedia.org/wiki/Cosmic_microwave_background" },
    ],
  },
  {
    triggers: ["big bang"],
    answer:
      "The Big Bang is the prevailing model for the origin of the universe: a hot, dense early state that has been expanding and cooling for about 13.8 billion years. Evidence includes the cosmic microwave background, the abundances of light elements (H, He, Li) from primordial nucleosynthesis, and the redshift–distance relation observed in distant galaxies.",
    citations: [
      { label: "Wikipedia: Big Bang", url: "https://en.wikipedia.org/wiki/Big_Bang" },
    ],
  },
  {
    triggers: ["dark matter"],
    answer:
      "Dark matter is matter that doesn't emit, absorb, or reflect light, but whose gravity shapes galaxies, galaxy clusters, and gravitational-lensing maps. It outweighs ordinary (baryonic) matter ~5:1. We don't know what it's made of — leading candidates are WIMPs, axions, and primordial black holes.",
    citations: [
      { label: "Wikipedia: Dark matter", url: "https://en.wikipedia.org/wiki/Dark_matter" },
    ],
  },
  {
    triggers: ["dark energy"],
    answer:
      "Dark energy is the name for whatever is accelerating the expansion of the universe. It makes up about 68% of the total energy content of the cosmos. The simplest version is Einstein's cosmological constant Λ — an inherent energy density of empty space — but other models (quintessence, evolving fields) are still alive.",
    citations: [
      { label: "Wikipedia: Dark energy", url: "https://en.wikipedia.org/wiki/Dark_energy" },
    ],
  },
  {
    triggers: ["andromeda", "m31"],
    answer:
      "M31, the Andromeda Galaxy, is the nearest large spiral galaxy to the Milky Way — about 2.5 million light-years away and the most distant object visible to the unaided eye from a dark site. It contains roughly a trillion stars and is on a collision course with our galaxy; the merger ('Milkomeda') begins in about 4–5 billion years.",
    citations: [
      { label: "Wikipedia: Andromeda Galaxy", url: "https://en.wikipedia.org/wiki/Andromeda_Galaxy" },
    ],
  },
  {
    triggers: ["milky way"],
    answer:
      "The Milky Way is our home galaxy: a barred spiral roughly 100,000 light-years across, with 100–400 billion stars and a supermassive black hole (Sgr A*) at its center. Our solar system sits in the Orion Arm, about 26,000 light-years from the galactic center.",
    citations: [
      { label: "Wikipedia: Milky Way", url: "https://en.wikipedia.org/wiki/Milky_Way" },
    ],
  },
  {
    triggers: ["sun", "the sun", "tell me about the sun"],
    answer:
      "The Sun is a G2V main-sequence star — middle-aged at 4.6 billion years, with another ~5 billion years of hydrogen fusion ahead of it before it expands into a red giant. It's 1.39 million km across (109× Earth's diameter), holds 99.86% of the solar system's mass, and its surface temperature is about 5,772 K.",
    citations: [
      { label: "Wikipedia: Sun", url: "https://en.wikipedia.org/wiki/Sun" },
    ],
  },
  {
    triggers: ["how big is the sun", "size of the sun", "sun diameter"],
    answer:
      "The Sun's diameter is about 1.39 million kilometers (864,000 miles) — roughly 109 times Earth's diameter. You could line up 109 Earths across its face, or fit about 1.3 million Earths inside it.",
    citations: [
      { label: "Wikipedia: Sun", url: "https://en.wikipedia.org/wiki/Sun" },
    ],
  },
  {
    triggers: ["sun infrared", "sun look different infrared", "sun in infrared"],
    answer:
      "Each wavelength reveals a different layer of the Sun. Visible light shows the photosphere (~5,800 K). Near-infrared peers slightly deeper and cooler features stand out. Ultraviolet and X-ray light show the much hotter chromosphere and corona (millions of K) — so the Sun looks calm in visible light but seethes with loops and flares in EUV/X-ray imagery from missions like SDO.",
    citations: [
      { label: "Wikipedia: Solar Dynamics Observatory", url: "https://en.wikipedia.org/wiki/Solar_Dynamics_Observatory" },
      { label: "NASA SDO", url: "https://sdo.gsfc.nasa.gov/" },
    ],
  },
  {
    triggers: ["nearest star", "closest star", "how far is the nearest star"],
    answer:
      "The nearest star system is Alpha Centauri, about 4.37 light-years away. Within it, Proxima Centauri is the closest individual star at ~4.24 light-years and hosts at least one confirmed Earth-mass planet, Proxima b, in its habitable zone.",
    citations: [
      { label: "Wikipedia: Alpha Centauri", url: "https://en.wikipedia.org/wiki/Alpha_Centauri" },
      { label: "Wikipedia: Proxima Centauri", url: "https://en.wikipedia.org/wiki/Proxima_Centauri" },
    ],
  },
  {
    triggers: ["light year", "what is a light year"],
    answer:
      "A light-year is the distance light travels in one year — about 9.46 trillion kilometers (5.88 trillion miles). It's a unit of distance, not time. The nearest star (Proxima Centauri) is 4.24 light-years away; the Milky Way is ~100,000 light-years across.",
    citations: [
      { label: "Wikipedia: Light-year", url: "https://en.wikipedia.org/wiki/Light-year" },
    ],
  },
  {
    triggers: ["parsec"],
    answer:
      "A parsec is about 3.26 light-years, or roughly 30.86 trillion kilometers. It's defined as the distance at which 1 AU subtends an angle of 1 arcsecond — the natural unit for stellar parallax measurements. Astronomers usually quote galactic distances in kpc (thousands) or Mpc (millions of parsecs).",
    citations: [
      { label: "Wikipedia: Parsec", url: "https://en.wikipedia.org/wiki/Parsec" },
    ],
  },
  {
    triggers: ["redshift"],
    answer:
      "Redshift is the stretching of light's wavelength toward the red end of the spectrum as a source moves away from us, or as the universe itself expands. For nearby galaxies it's a Doppler shift; for very distant ones it's cosmological. The redshift parameter z = (λ_observed − λ_emitted) / λ_emitted.",
    citations: [
      { label: "Wikipedia: Redshift", url: "https://en.wikipedia.org/wiki/Redshift" },
    ],
  },
  {
    triggers: ["supernova"],
    answer:
      "A supernova is the explosive death of a star. Type Ia happens when a white dwarf in a binary system tips over the Chandrasekhar limit and detonates. Core-collapse types (II, Ib, Ic) happen when a star above ~8 solar masses runs out of fuel and its iron core implodes. A supernova can briefly outshine its entire host galaxy.",
    citations: [
      { label: "Wikipedia: Supernova", url: "https://en.wikipedia.org/wiki/Supernova" },
    ],
  },
  {
    triggers: ["nebula"],
    answer:
      "A nebula is a cloud of gas and dust in space. Some are stellar nurseries where new stars form (emission nebulae like Orion's M42). Others are the ejected shells of dying stars (planetary nebulae like the Ring Nebula, or supernova remnants like the Crab).",
    citations: [
      { label: "Wikipedia: Nebula", url: "https://en.wikipedia.org/wiki/Nebula" },
    ],
  },
  {
    triggers: ["exoplanet", "extrasolar planet"],
    answer:
      "An exoplanet is a planet that orbits a star other than the Sun. As of the 2020s, over 5,000 are confirmed — most discovered by NASA's Kepler and TESS missions via the transit method (watching a star dim slightly when a planet crosses in front of it). A small fraction are Earth-sized and in their star's habitable zone.",
    citations: [
      { label: "NASA Exoplanet Archive", url: "https://exoplanetarchive.ipac.caltech.edu/" },
      { label: "Wikipedia: Exoplanet", url: "https://en.wikipedia.org/wiki/Exoplanet" },
    ],
  },
  {
    triggers: ["habitable zone", "goldilocks zone"],
    answer:
      "The habitable zone is the orbital region around a star where liquid water could exist on a rocky planet's surface — not so close it boils, not so far it freezes. It depends on the star's luminosity: cooler red dwarfs have tight, close-in zones; Sun-like stars have wider zones around 1 AU.",
    citations: [
      { label: "Wikipedia: Habitable zone", url: "https://en.wikipedia.org/wiki/Circumstellar_habitable_zone" },
    ],
  },
  {
    triggers: ["saturn ring", "rings of saturn", "saturn"],
    answer:
      "Saturn's rings are mostly water ice in chunks ranging from dust grains to house-sized boulders, spread in a disk just 10–20 meters thick but ~280,000 km across. They likely formed within the last 100 million years — possibly from a shattered moon. They're slowly raining onto the planet and may disappear in tens of millions of years.",
    citations: [
      { label: "Wikipedia: Rings of Saturn", url: "https://en.wikipedia.org/wiki/Rings_of_Saturn" },
    ],
  },
  {
    triggers: ["jupiter"],
    answer:
      "Jupiter is the largest planet in the solar system — a gas giant 11× Earth's diameter and 318× its mass. It has at least 95 moons (the four Galilean ones — Io, Europa, Ganymede, Callisto — are visible in binoculars) and a Great Red Spot storm that has raged for at least 200 years.",
    citations: [
      { label: "Wikipedia: Jupiter", url: "https://en.wikipedia.org/wiki/Jupiter" },
    ],
  },
  {
    triggers: ["mars"],
    answer:
      "Mars is the fourth planet — a cold desert world about half Earth's diameter, with a thin CO₂ atmosphere, two small moons (Phobos and Deimos), and the largest volcano in the solar system (Olympus Mons, 22 km tall). Several rovers are currently active there, most prominently NASA's Perseverance.",
    citations: [
      { label: "Wikipedia: Mars", url: "https://en.wikipedia.org/wiki/Mars" },
    ],
  },
  {
    triggers: ["moon", "the moon"],
    answer:
      "The Moon is Earth's only natural satellite — about a quarter of Earth's diameter and 1/81 its mass, 384,400 km away on average. It formed ~4.5 billion years ago, probably from debris of a Mars-sized impactor. It's tidally locked, so we always see the same face from Earth.",
    citations: [
      { label: "Wikipedia: Moon", url: "https://en.wikipedia.org/wiki/Moon" },
    ],
  },
  {
    triggers: ["constellation"],
    answer:
      "A constellation is a region of the sky bounded by IAU-defined lines — 88 in total cover the whole celestial sphere. The bright connect-the-dots patterns inside (the 'asterisms') are how people have organized the night sky for thousands of years; different cultures have very different sky stories.",
    citations: [
      { label: "Wikipedia: Constellation", url: "https://en.wikipedia.org/wiki/Constellation" },
    ],
  },
  {
    triggers: ["meteor", "shooting star", "meteor shower"],
    answer:
      "A meteor — a 'shooting star' — is a grain of dust or pebble burning up in Earth's atmosphere at tens of km/s. Meteor showers happen when Earth crosses the dust trail of a comet (e.g. Perseids from Comet Swift–Tuttle, Geminids from asteroid 3200 Phaethon). If a fragment survives to the ground it's a meteorite.",
    citations: [
      { label: "Wikipedia: Meteor shower", url: "https://en.wikipedia.org/wiki/Meteor_shower" },
    ],
  },
  {
    triggers: ["comet"],
    answer:
      "A comet is a small icy body that grows a glowing coma and one or more tails when it gets close enough to the Sun for ice to sublimate. Short-period comets (orbit < 200 years) come from the Kuiper belt; long-period ones from the Oort cloud, far beyond Pluto.",
    citations: [
      { label: "Wikipedia: Comet", url: "https://en.wikipedia.org/wiki/Comet" },
    ],
  },
  {
    triggers: ["asteroid"],
    answer:
      "Asteroids are rocky leftovers from the early solar system, mostly orbiting in the main belt between Mars and Jupiter. Near-Earth asteroids (NEAs) are tracked by surveys like Catalina and ATLAS for impact risk; the largest, Ceres, is now classified as a dwarf planet.",
    citations: [
      { label: "Wikipedia: Asteroid", url: "https://en.wikipedia.org/wiki/Asteroid" },
    ],
  },
  {
    triggers: ["aurora", "northern lights", "southern lights"],
    answer:
      "Auroras are light shows in the upper atmosphere, caused by solar-wind particles funnelling along Earth's magnetic field and exciting oxygen and nitrogen at altitudes of 100–300 km. Green is excited oxygen at ~100 km; red is oxygen higher up. Strong solar storms push the aurora oval toward the equator.",
    citations: [
      { label: "Wikipedia: Aurora", url: "https://en.wikipedia.org/wiki/Aurora" },
    ],
  },
  {
    triggers: ["solar flare"],
    answer:
      "A solar flare is a sudden brightening on the Sun, caused by a snap of twisted magnetic field lines releasing energy stored in the corona. The biggest flares are X-class; they can disrupt radio communications and, when paired with a coronal mass ejection aimed at Earth, drive geomagnetic storms and auroras.",
    citations: [
      { label: "Wikipedia: Solar flare", url: "https://en.wikipedia.org/wiki/Solar_flare" },
    ],
  },
  {
    triggers: ["above 60", "currently above", "tonight's targets", "what is above", "altitude"],
    answer:
      "I can't compute live sky positions from this chat tier — but the viewer already can! Open the 'Tonight's Targets' panel (binoculars icon, top-right) to see every catalogued object currently above 30° altitude at your location, sorted by brightness. The sky inspector also shows a 24-hour altitude curve for whatever you click.",
    citations: [],
  },
];

const FALLBACK_ANSWER =
  "I don't have a canned answer for that in offline mode. Try clicking on a sky object to pull its full SIMBAD + Wikipedia entry, or start a local Ollama server for richer answers (Settings → Backend).";

const FALLBACK_CITATIONS: Citation[] = [
  {
    label: "Ollama install guide",
    url: "https://ollama.com/download",
  },
];

/** Token-overlap score between question and a trigger phrase. */
function score(question: string, trigger: string): number {
  const q = question.toLowerCase();
  const t = trigger.toLowerCase();
  if (q.includes(t)) return t.length * 2; // strong: whole phrase appears
  const qTokens = new Set(q.split(/[^a-z0-9]+/).filter(Boolean));
  const tTokens = t.split(/[^a-z0-9]+/).filter(Boolean);
  if (tTokens.length === 0) return 0;
  let hits = 0;
  for (const tok of tTokens) {
    if (qTokens.has(tok)) hits += tok.length;
  }
  return hits;
}

/** Find the best matching entry, or null if none clears the threshold. */
export function lookupAnswer(question: string): Entry | null {
  let best: { entry: Entry; score: number } | null = null;
  for (const entry of ENTRIES) {
    for (const trig of entry.triggers) {
      const s = score(question, trig);
      if (!best || s > best.score) best = { entry, score: s };
    }
  }
  if (!best || best.score < 4) return null;
  return best.entry;
}

export class OfflineBackend implements CopilotBackend {
  readonly id = "offline";
  readonly label = "Offline (built-in)";

  available(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async chat(messages: Message[], opts: ChatOptions): Promise<ChatResult> {
    // Take the last user message; ignore prior history (this tier has no memory).
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const question = lastUser?.content ?? "";
    const match = lookupAnswer(question);
    // When the host is connected the user is hoping for an action, not a
    // canned definition. The offline tier can't tool-call, so we prepend a
    // one-line apology and still ship the best matching prose underneath.
    const wantsAction = Boolean(opts.host) && looksActionable(question);
    const prefix = wantsAction ? TOOL_REFUSAL_PREFIX : "";
    const text = prefix + (match?.answer ?? FALLBACK_ANSWER);
    const citations = match?.citations ?? FALLBACK_CITATIONS;

    // Simulate streaming so the UI behaves the same as the LLM path.
    if (opts.onToken) {
      const chunks = text.match(/[^\s]+\s*/g) ?? [text];
      for (const chunk of chunks) {
        if (opts.signal?.aborted) break;
        opts.onToken(chunk);
        await new Promise((r) => window.setTimeout(r, 8));
      }
    }
    return { text, citations };
  }
}

/** Heuristic: did the user ask for an action ("fly to", "show", "enable")? */
function looksActionable(q: string): boolean {
  const s = q.toLowerCase();
  return (
    /\b(fly|go|take me|show me|jump|move|navigate)\b/.test(s) ||
    /\b(enable|disable|turn on|turn off|hide|toggle|switch)\b/.test(s) ||
    /\b(snapshot|screenshot|capture|save view)\b/.test(s)
  );
}

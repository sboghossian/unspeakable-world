import type { InfoPayload, InfoSection } from "../ui/InfoPanel";

/**
 * Shared static facts for solar-system bodies. Both Universe Mode and
 * Solar Flight Mode read this and project it into the unified InfoPanel
 * payload. The legacy `BodyFacts` shape is kept (detail/wikipedia/facts)
 * because the Universe scene's hit data still flows through it; the
 * `toInfoPayload` helper converts on the fly.
 */
export type BodyFacts = {
  detail: string;
  wikipedia: string;
  /** Heterogeneous physical / orbital facts (display order preserved). */
  facts: Array<{ label: string; value: string }>;
};

export const BODY_INFO: Record<string, BodyFacts> = {
  Sun: {
    detail:
      "Yellow-dwarf G2V main-sequence star at the centre of the solar system. Holds 99.86% of the system's mass and powers life on Earth via fusion of hydrogen into helium.",
    wikipedia: "https://en.wikipedia.org/wiki/Sun",
    facts: [
      { label: "Type", value: "G2V main-sequence star" },
      { label: "Mass", value: "1.989 × 10³⁰ kg (333,000 ⊕)" },
      { label: "Radius", value: "695,700 km (109 ⊕)" },
      { label: "Surface temp.", value: "5,778 K" },
      { label: "Core temp.", value: "15.7 million K" },
      { label: "Luminosity", value: "3.828 × 10²⁶ W" },
      { label: "Age", value: "4.6 billion years" },
      { label: "Composition", value: "73% H · 25% He · 2% heavier" },
      { label: "Rotation", value: "25.4 d (equator) · 35 d (poles)" },
    ],
  },
  Mercury: {
    detail:
      "Smallest and innermost planet. No moons, almost no atmosphere, and the most extreme day-night temperature swing in the solar system.",
    wikipedia: "https://en.wikipedia.org/wiki/Mercury_(planet)",
    facts: [
      { label: "Distance from Sun", value: "0.39 AU (57.9 M km)" },
      { label: "Year", value: "88 Earth days" },
      { label: "Day (solar)", value: "176 Earth days" },
      { label: "Radius", value: "2,440 km (0.38 ⊕)" },
      { label: "Mass", value: "0.055 ⊕" },
      { label: "Gravity", value: "3.7 m/s² (0.38 g)" },
      { label: "Temp. range", value: "−173 °C to +427 °C" },
      { label: "Moons", value: "0" },
      { label: "Atmosphere", value: "Trace exosphere (Na, K, O₂, H₂)" },
    ],
  },
  Venus: {
    detail:
      "Earth's twin in size but a runaway-greenhouse hellscape. Hottest planet in the solar system thanks to a 96% CO₂ atmosphere and 92-bar surface pressure.",
    wikipedia: "https://en.wikipedia.org/wiki/Venus",
    facts: [
      { label: "Distance from Sun", value: "0.72 AU (108.2 M km)" },
      { label: "Year", value: "224.7 Earth days" },
      { label: "Day (sidereal)", value: "243 Earth days (retrograde)" },
      { label: "Radius", value: "6,051 km (0.95 ⊕)" },
      { label: "Mass", value: "0.815 ⊕" },
      { label: "Gravity", value: "8.87 m/s² (0.90 g)" },
      { label: "Surface temp.", value: "+462 °C" },
      { label: "Surface pressure", value: "92 bar (≈ 900 m underwater)" },
      { label: "Moons", value: "0" },
    ],
  },
  Earth: {
    detail:
      "Only known planet harbouring life. 71% ocean cover, a magnetic field that shields the surface from solar wind, and a single large moon that stabilises the axial tilt.",
    wikipedia: "https://en.wikipedia.org/wiki/Earth",
    facts: [
      { label: "Distance from Sun", value: "1.00 AU (149.6 M km)" },
      { label: "Year", value: "365.25 days" },
      { label: "Day", value: "23 h 56 min (sidereal)" },
      { label: "Radius", value: "6,371 km" },
      { label: "Mass", value: "5.972 × 10²⁴ kg" },
      { label: "Gravity", value: "9.81 m/s² (1 g)" },
      { label: "Surface temp.", value: "−88 °C to +58 °C (avg +15 °C)" },
      { label: "Atmosphere", value: "78% N₂ · 21% O₂ · 1% Ar/CO₂/…" },
      { label: "Moons", value: "1 (Luna)" },
    ],
  },
  Mars: {
    detail:
      "Cold desert world with the largest volcano (Olympus Mons, 21.9 km) and longest canyon (Valles Marineris, 4,000 km) in the solar system. Active rovers + ancient riverbeds.",
    wikipedia: "https://en.wikipedia.org/wiki/Mars",
    facts: [
      { label: "Distance from Sun", value: "1.52 AU (227.9 M km)" },
      { label: "Year", value: "687 Earth days (1.88 yr)" },
      { label: "Day (sol)", value: "24 h 37 min" },
      { label: "Radius", value: "3,390 km (0.53 ⊕)" },
      { label: "Mass", value: "0.107 ⊕" },
      { label: "Gravity", value: "3.71 m/s² (0.38 g)" },
      { label: "Surface temp.", value: "−143 °C to +35 °C" },
      { label: "Atmosphere", value: "95% CO₂ · 6 mbar (very thin)" },
      { label: "Moons", value: "2 (Phobos, Deimos)" },
    ],
  },
  Jupiter: {
    detail:
      "Largest planet — a gas giant 2.5× the mass of all other planets combined. Great Red Spot is a 350-year-old storm wider than Earth. Four Galilean moons visible in binoculars.",
    wikipedia: "https://en.wikipedia.org/wiki/Jupiter",
    facts: [
      { label: "Distance from Sun", value: "5.20 AU (778.5 M km)" },
      { label: "Year", value: "11.86 Earth years" },
      { label: "Day", value: "9 h 56 min" },
      { label: "Radius", value: "69,911 km (11 ⊕)" },
      { label: "Mass", value: "318 ⊕ (1/1047 ☉)" },
      { label: "Gravity", value: "24.79 m/s² (2.53 g)" },
      { label: "Composition", value: "90% H · 10% He · trace methane" },
      { label: "Magnetic field", value: "20,000× Earth's strength" },
      { label: "Moons", value: "95 (Io, Europa, Ganymede, Callisto…)" },
    ],
  },
  Saturn: {
    detail:
      "Iconic ringed gas giant. The rings span 282,000 km but are < 1 km thick. Titan, its largest moon, has a thick nitrogen atmosphere and methane lakes.",
    wikipedia: "https://en.wikipedia.org/wiki/Saturn",
    facts: [
      { label: "Distance from Sun", value: "9.58 AU (1.43 B km)" },
      { label: "Year", value: "29.45 Earth years" },
      { label: "Day", value: "10 h 42 min" },
      { label: "Radius", value: "58,232 km (9.13 ⊕)" },
      { label: "Mass", value: "95.2 ⊕" },
      { label: "Gravity", value: "10.44 m/s² (1.06 g)" },
      { label: "Density", value: "0.687 g/cm³ (less dense than water)" },
      { label: "Rings", value: "282,000 km wide · ~1 km thick" },
      { label: "Moons", value: "146 (Titan, Enceladus, Mimas…)" },
    ],
  },
  Uranus: {
    detail:
      "Pale-cyan ice giant tipped on its side (98° axial tilt) — likely from a primordial collision. Coldest minimum temperature of any planet (−224 °C).",
    wikipedia: "https://en.wikipedia.org/wiki/Uranus",
    facts: [
      { label: "Distance from Sun", value: "19.2 AU (2.87 B km)" },
      { label: "Year", value: "84 Earth years" },
      { label: "Day", value: "17 h 14 min (retrograde)" },
      { label: "Radius", value: "25,362 km (4.0 ⊕)" },
      { label: "Mass", value: "14.5 ⊕" },
      { label: "Axial tilt", value: "97.77° (rolls along orbit)" },
      { label: "Min. temp.", value: "−224 °C (coldest planet)" },
      { label: "Composition", value: "Water/methane/ammonia ices + H/He" },
      { label: "Moons", value: "27 (Titania, Oberon, Miranda…)" },
    ],
  },
  Neptune: {
    detail:
      "Outermost planet. Strongest sustained winds in the solar system (up to 2,100 km/h). Discovered in 1846 from mathematical predictions of Uranus's orbit.",
    wikipedia: "https://en.wikipedia.org/wiki/Neptune",
    facts: [
      { label: "Distance from Sun", value: "30.1 AU (4.50 B km)" },
      { label: "Year", value: "164.8 Earth years" },
      { label: "Day", value: "16 h 6 min" },
      { label: "Radius", value: "24,622 km (3.88 ⊕)" },
      { label: "Mass", value: "17.1 ⊕" },
      { label: "Gravity", value: "11.15 m/s² (1.14 g)" },
      { label: "Avg. temp.", value: "−214 °C" },
      { label: "Wind speeds", value: "Up to 2,100 km/h" },
      { label: "Moons", value: "16 (Triton…)" },
    ],
  },
};

const ORBIT_LABELS = new Set([
  "Distance from Sun",
  "Year",
  "Day",
  "Day (sol)",
  "Day (solar)",
  "Day (sidereal)",
  "Rotation",
  "Axial tilt",
]);

/**
 * Convert a `BodyFacts` row into the unified `InfoPayload`. Splits the
 * heterogeneous facts array into `physical` and `orbit` sections by
 * label, and packs the prose into an `overview` section.
 */
export function bodyFactsToPayload(
  name: string,
  kind: InfoPayload["kind"],
  facts: BodyFacts,
): InfoPayload {
  const physical: Array<[string, string]> = [];
  const orbit: Array<[string, string]> = [];
  for (const f of facts.facts) {
    if (ORBIT_LABELS.has(f.label)) orbit.push([f.label, f.value]);
    else physical.push([f.label, f.value]);
  }
  const sections: InfoSection[] = [];
  if (facts.detail) sections.push({ kind: "overview", text: facts.detail });
  if (physical.length > 0) sections.push({ kind: "physical", rows: physical });
  if (orbit.length > 0) sections.push({ kind: "orbit", rows: orbit });
  if (facts.wikipedia)
    sections.push({
      kind: "links",
      items: [{ label: "Wikipedia", href: facts.wikipedia }],
    });
  return { kind, name, sections };
}

/** Convenience: payload for a named body (returns null if unknown). */
export function payloadForBody(
  name: string,
  kind: InfoPayload["kind"],
): InfoPayload | null {
  const f = BODY_INFO[name];
  if (!f) return null;
  return bodyFactsToPayload(name, kind, f);
}

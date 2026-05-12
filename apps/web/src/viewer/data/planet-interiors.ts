/**
 * Layered cross-section data for every focusable body in solar flight.
 *
 * Each `layers` entry's `outer` is the OUTER radius (as a fraction of the
 * planet's mean radius). Layers are ordered from innermost to outermost,
 * so layer N spans from `layers[N-1].outer` (or 0) up to `layers[N].outer`.
 *
 * Numbers are rounded to two decimals — these are illustrative, not a
 * publication. Sources: NASA fact-sheets, NSSDC, USGS, InSight (Mars
 * core, 2021), Juno (Jupiter dilute core, 2022), Cassini (Saturn moments).
 */

export type InteriorLayer = {
  /** Label rendered next to the layer. */
  name: string;
  /** Outer radius fraction (0..1). */
  outer: number;
  /** Layer fill colour — passed straight to SVG. */
  color: string;
  /** Short caption shown on hover / focus. */
  detail: string;
};

export type Interior = {
  body: string;
  /** Mean radius in km — surfaced in the panel header. */
  radiusKm: number;
  /** Top-line summary of the structure as a whole. */
  summary: string;
  layers: InteriorLayer[];
};

export const PLANET_INTERIORS: Record<string, Interior> = {
  Sun: {
    body: "Sun",
    radiusKm: 695_700,
    summary:
      "Fusion-powered plasma ball. The radiative zone takes a million years to leak the core's energy outward.",
    layers: [
      {
        name: "Core",
        outer: 0.25,
        color: "#fff7a8",
        detail: "15.7 MK · proton-proton fusion · 99% of the Sun's energy made here",
      },
      {
        name: "Radiative zone",
        outer: 0.7,
        color: "#ffd24f",
        detail: "Photons random-walk outward — a single one takes ~170,000 years to escape",
      },
      {
        name: "Convective zone",
        outer: 0.99,
        color: "#ff8b27",
        detail: "Boiling plasma carries heat to the surface (~2 MK → 5,800 K)",
      },
      {
        name: "Photosphere",
        outer: 1.0,
        color: "#fff2c1",
        detail: "The Sun's visible surface — 5,778 K, ~500 km thick",
      },
    ],
  },
  Mercury: {
    body: "Mercury",
    radiusKm: 2_440,
    summary:
      "Iron-rich. Mercury's core is unusually massive (~85% of its radius) — a major clue to its violent formation.",
    layers: [
      {
        name: "Inner core",
        outer: 0.34,
        color: "#c8aa6e",
        detail: "Solid iron-nickel · the largest core fraction of any planet",
      },
      {
        name: "Outer core",
        outer: 0.85,
        color: "#a18249",
        detail: "Liquid Fe-S · drives Mercury's weak magnetic field",
      },
      {
        name: "Mantle",
        outer: 0.97,
        color: "#7a5e3a",
        detail: "Thin silicate layer — only ~420 km thick",
      },
      {
        name: "Crust",
        outer: 1.0,
        color: "#a9a6a0",
        detail: "Heavily cratered silicate · 35 km thick",
      },
    ],
  },
  Venus: {
    body: "Venus",
    radiusKm: 6_052,
    summary:
      "Earth's twin in mass and radius, but no global magnetic field — the core may not be fully convecting.",
    layers: [
      {
        name: "Core",
        outer: 0.5,
        color: "#d7a96b",
        detail: "Fe-Ni · likely partly liquid — no detectable dynamo",
      },
      {
        name: "Mantle",
        outer: 0.97,
        color: "#9a6a3b",
        detail: "Hot silicate · drives the resurfacing volcanism",
      },
      {
        name: "Crust",
        outer: 1.0,
        color: "#caa178",
        detail: "Basalt · 30 km · global age ~500 Myr",
      },
    ],
  },
  Earth: {
    body: "Earth",
    radiusKm: 6_371,
    summary:
      "The dynamo in the outer core sustains the magnetic field that shields the biosphere. Solid inner core grows ~1 mm/yr.",
    layers: [
      {
        name: "Inner core",
        outer: 0.19,
        color: "#ffd17b",
        detail: "Solid Fe-Ni · 5,400 K · 1,220 km radius",
      },
      {
        name: "Outer core",
        outer: 0.55,
        color: "#ff9533",
        detail: "Liquid Fe-Ni · convects → magnetic field",
      },
      {
        name: "Lower mantle",
        outer: 0.85,
        color: "#7a3a16",
        detail: "Solid silicate (bridgmanite) · 2,890 km deep",
      },
      {
        name: "Upper mantle",
        outer: 0.985,
        color: "#a7572a",
        detail: "Olivine + pyroxene · partially molten asthenosphere",
      },
      {
        name: "Crust",
        outer: 1.0,
        color: "#3aa3ff",
        detail: "Continental 35 km · oceanic 7 km · floats on the mantle",
      },
    ],
  },
  Moon: {
    body: "Moon",
    radiusKm: 1_737,
    summary:
      "Tiny iron core, thick mantle, and an Apollo-confirmed partial-melt zone just above the core-mantle boundary.",
    layers: [
      {
        name: "Inner core",
        outer: 0.13,
        color: "#ffd17b",
        detail: "Solid Fe · 240 km radius",
      },
      {
        name: "Outer core",
        outer: 0.2,
        color: "#ff9533",
        detail: "Liquid Fe · 90 km thick",
      },
      {
        name: "Partial-melt zone",
        outer: 0.27,
        color: "#c45a2a",
        detail: "Detected by Apollo seismometers · ~150 km thick",
      },
      {
        name: "Lower mantle",
        outer: 0.79,
        color: "#5a4030",
        detail: "Solid silicate",
      },
      {
        name: "Upper mantle",
        outer: 0.995,
        color: "#867060",
        detail: "Olivine + pyroxene · 600 km",
      },
      {
        name: "Crust",
        outer: 1.0,
        color: "#d9d4cb",
        detail: "Plagioclase feldspar · 50 km (50% thicker on far side)",
      },
    ],
  },
  Mars: {
    body: "Mars",
    radiusKm: 3_390,
    summary:
      "InSight (2021) showed the Martian core is surprisingly large and fully liquid — yet the planet has no global dynamo.",
    layers: [
      {
        name: "Core",
        outer: 0.5,
        color: "#cf6a3a",
        detail: "Liquid Fe-S · 1,830 km radius · InSight RISE measurement",
      },
      {
        name: "Mantle",
        outer: 0.95,
        color: "#7a3818",
        detail: "Silicate · cooled enough to shut off the dynamo ~4 Gyr ago",
      },
      {
        name: "Crust",
        outer: 1.0,
        color: "#c14a23",
        detail: "Basaltic · 40-60 km thick (thicker than Earth's, by fraction)",
      },
    ],
  },
  Jupiter: {
    body: "Jupiter",
    radiusKm: 69_911,
    summary:
      "Mostly hydrogen. Juno's gravity data points to a 'dilute core' — rock smeared through the deep interior rather than a sharp boundary.",
    layers: [
      {
        name: "Dilute core",
        outer: 0.1,
        color: "#5a3a20",
        detail: "Rock + ice mixed into metallic-H — Juno's surprise (2022)",
      },
      {
        name: "Metallic hydrogen",
        outer: 0.78,
        color: "#3a4a8a",
        detail: "H₂ ionised by 4 Mbar pressure · conducts electricity → magnetic field",
      },
      {
        name: "Molecular hydrogen",
        outer: 0.99,
        color: "#c6b08b",
        detail: "Liquid H₂ + He · the visible cloud bands sit on top",
      },
      {
        name: "Atmosphere",
        outer: 1.0,
        color: "#e8c9a0",
        detail: "Ammonia, ammonium-hydrosulfide, water-ice clouds",
      },
    ],
  },
  Saturn: {
    body: "Saturn",
    radiusKm: 58_232,
    summary:
      "Less massive than Jupiter — its metallic-hydrogen layer is thinner and the core fraction is larger. The famous 6,000-km/h winds live in the outermost atmosphere.",
    layers: [
      {
        name: "Rocky core",
        outer: 0.2,
        color: "#5a3a20",
        detail: "Ice + rock · 9-22 ⊕ mass",
      },
      {
        name: "Metallic hydrogen",
        outer: 0.5,
        color: "#3a4a8a",
        detail: "Liquid metallic H · less than half Saturn's radius",
      },
      {
        name: "Molecular hydrogen",
        outer: 0.99,
        color: "#e2c184",
        detail: "Liquid H₂ + He · helium-rain layer here",
      },
      {
        name: "Atmosphere",
        outer: 1.0,
        color: "#f5d99a",
        detail: "Pale yellow bands · 1,800 km/h equatorial jet",
      },
    ],
  },
  Uranus: {
    body: "Uranus",
    radiusKm: 25_362,
    summary:
      "An 'ice giant' — most of the mass is water + ammonia + methane in a hot, ionic fluid state, NOT ice in the everyday sense.",
    layers: [
      {
        name: "Rocky core",
        outer: 0.2,
        color: "#5a3a20",
        detail: "Silicate + Fe · ~0.55 ⊕ mass",
      },
      {
        name: "Ionic mantle",
        outer: 0.8,
        color: "#3aa9c4",
        detail: "Hot H₂O / NH₃ / CH₄ at 5,000+ K · superionic ice possible",
      },
      {
        name: "Atmosphere",
        outer: 1.0,
        color: "#9ad4e2",
        detail: "H₂ + He + CH₄ — methane absorbs red, giving the cyan tint",
      },
    ],
  },
  Neptune: {
    body: "Neptune",
    radiusKm: 24_622,
    summary:
      "Almost a Uranus twin, but denser and with an internal heat source 2.6× what it gets from the Sun. Strongest winds in the solar system (~2,100 km/h).",
    layers: [
      {
        name: "Rocky core",
        outer: 0.2,
        color: "#5a3a20",
        detail: "Silicate + Fe · ~1.0 ⊕ mass",
      },
      {
        name: "Ionic mantle",
        outer: 0.8,
        color: "#1e6cc4",
        detail: "Hot water + ammonia + methane · drives the off-axis magnetic field",
      },
      {
        name: "Atmosphere",
        outer: 1.0,
        color: "#2f7dff",
        detail: "H₂ + He + CH₄ · supersonic winds, dark spots",
      },
    ],
  },
};

export function interiorFor(body: string): Interior | null {
  return PLANET_INTERIORS[body] ?? null;
}

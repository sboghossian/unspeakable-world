/**
 * Curated catalog of bodies you can pin against each other in the
 * side-by-side comparison view. Diameters are stored as the body's
 * characteristic visual *diameter* in metres (galaxies use
 * disc diameter, black holes use Schwarzschild event-horizon
 * diameter, etc.) so a single SVG circle can render every entry
 * at matched physical scale.
 *
 * Numbers are sourced from NASA/JPL fact sheets, the IAU, and the
 * peer-reviewed literature where available. Where a body's size is
 * not a hard sphere (e.g. galaxies, irregular asteroids) we use the
 * commonly-cited published diameter so an educational comparison
 * still feels accurate.
 */

export type CompareKind =
  | "star"
  | "planet"
  | "moon"
  | "galaxy"
  | "blackhole"
  | "asteroid"
  | "neutron-star"
  | "white-dwarf"
  | "human-scale";

export type CompareItem = {
  id: string;
  name: string;
  kind: CompareKind;
  /** Diameter or characteristic size in METERS. */
  diameterM: number;
  /** Mass in kg if known. */
  massKg?: number;
  /** Optional emoji glyph for the visual representation. */
  emoji?: string;
  /** Optional hex color for the body's render disc. */
  color?: string;
  /** One-sentence tagline displayed in the comparison. */
  tagline?: string;
};

/* Handy unit constants. */
const KM = 1_000;
const LY = 9.4607e15; // metres in one light-year
const R_SUN = 6.957e8; // solar radius in metres (diameter = 2 * R_SUN)
const R_EARTH = 6.371e6; // Earth radius in metres

export const COMPARE_ITEMS: CompareItem[] = [
  /* ---------- Human scale ---------- */
  {
    id: "human",
    name: "Human",
    kind: "human-scale",
    diameterM: 1.7,
    massKg: 70,
    emoji: "🧍",
    color: "#fcd34d",
    tagline: "You. The yardstick.",
  },
  {
    id: "bus",
    name: "City bus",
    kind: "human-scale",
    diameterM: 12,
    massKg: 12_000,
    emoji: "🚌",
    color: "#fbbf24",
    tagline: "12-metre articulated city bus.",
  },
  {
    id: "eiffel",
    name: "Eiffel Tower",
    kind: "human-scale",
    diameterM: 330,
    emoji: "🗼",
    color: "#f59e0b",
    tagline: "Iron lattice tower in Paris, 330 m tall.",
  },
  {
    id: "empire-state",
    name: "Empire State Building",
    kind: "human-scale",
    diameterM: 443,
    emoji: "🏙️",
    color: "#f59e0b",
    tagline: "New York skyscraper, 443 m to the tip.",
  },
  {
    id: "burj-khalifa",
    name: "Burj Khalifa",
    kind: "human-scale",
    diameterM: 828,
    emoji: "🗼",
    color: "#fbbf24",
    tagline: "Tallest building on Earth, 828 m.",
  },
  {
    id: "mont-blanc",
    name: "Mont Blanc",
    kind: "human-scale",
    diameterM: 4_809,
    emoji: "🏔️",
    color: "#e2e8f0",
    tagline: "Highest peak in the Alps, 4,809 m.",
  },
  {
    id: "k2",
    name: "K2",
    kind: "human-scale",
    diameterM: 8_611,
    emoji: "🏔️",
    color: "#e2e8f0",
    tagline: "Second-highest mountain on Earth, 8,611 m.",
  },
  {
    id: "everest",
    name: "Mt Everest",
    kind: "human-scale",
    diameterM: 8_848,
    emoji: "🏔️",
    color: "#f1f5f9",
    tagline: "Tallest mountain above sea level, 8,848 m.",
  },

  /* ---------- Asteroids & small bodies ---------- */
  {
    id: "apophis",
    name: "Apophis",
    kind: "asteroid",
    diameterM: 370,
    emoji: "☄️",
    color: "#a3a3a3",
    tagline: "Near-Earth asteroid that will buzz Earth in 2029.",
  },
  {
    id: "bennu",
    name: "Bennu",
    kind: "asteroid",
    diameterM: 490,
    emoji: "☄️",
    color: "#737373",
    tagline: "OSIRIS-REx sample-return target.",
  },
  {
    id: "ryugu",
    name: "Ryugu",
    kind: "asteroid",
    diameterM: 900,
    emoji: "☄️",
    color: "#525252",
    tagline: "Carbonaceous asteroid visited by Hayabusa2.",
  },
  {
    id: "itokawa",
    name: "Itokawa",
    kind: "asteroid",
    diameterM: 330,
    emoji: "☄️",
    color: "#a8a29e",
    tagline: "Peanut-shaped S-type asteroid sampled by Hayabusa.",
  },
  {
    id: "eros",
    name: "433 Eros",
    kind: "asteroid",
    diameterM: 16.84 * KM,
    emoji: "☄️",
    color: "#a3a3a3",
    tagline: "Elongated NEAR-Shoemaker target.",
  },
  {
    id: "vesta",
    name: "Vesta",
    kind: "asteroid",
    diameterM: 525 * KM,
    emoji: "🪨",
    color: "#d6d3d1",
    tagline: "Second-largest object in the asteroid belt.",
  },
  {
    id: "ceres",
    name: "Ceres",
    kind: "asteroid",
    diameterM: 939.4 * KM,
    emoji: "🪨",
    color: "#e7e5e4",
    tagline: "Dwarf planet and largest body in the asteroid belt.",
  },
  {
    id: "pluto",
    name: "Pluto",
    kind: "asteroid",
    diameterM: 2_376 * KM,
    massKg: 1.303e22,
    emoji: "🪐",
    color: "#fde68a",
    tagline: "Dwarf planet at the edge of the Kuiper belt.",
  },

  /* ---------- Moons ---------- */
  {
    id: "phobos",
    name: "Phobos",
    kind: "moon",
    diameterM: 22.4 * KM,
    emoji: "🌑",
    color: "#78716c",
    tagline: "Larger and inner of Mars' two tiny moons.",
  },
  {
    id: "deimos",
    name: "Deimos",
    kind: "moon",
    diameterM: 12.4 * KM,
    emoji: "🌑",
    color: "#a8a29e",
    tagline: "Smaller, outer moon of Mars.",
  },
  {
    id: "enceladus",
    name: "Enceladus",
    kind: "moon",
    diameterM: 504 * KM,
    emoji: "❄️",
    color: "#e0f2fe",
    tagline: "Icy Saturn moon with a subsurface ocean.",
  },
  {
    id: "triton",
    name: "Triton",
    kind: "moon",
    diameterM: 2_707 * KM,
    emoji: "🌑",
    color: "#cbd5e1",
    tagline: "Neptune's largest moon, orbits retrograde.",
  },
  {
    id: "europa",
    name: "Europa",
    kind: "moon",
    diameterM: 3_121.6 * KM,
    emoji: "🧊",
    color: "#fde68a",
    tagline: "Jupiter's icy ocean world.",
  },
  {
    id: "moon",
    name: "Earth's Moon",
    kind: "moon",
    diameterM: 3_474.8 * KM,
    massKg: 7.342e22,
    emoji: "🌕",
    color: "#e7e5e4",
    tagline: "Our Moon, ~1/4 Earth's diameter.",
  },
  {
    id: "io",
    name: "Io",
    kind: "moon",
    diameterM: 3_643.2 * KM,
    emoji: "🌋",
    color: "#facc15",
    tagline: "Most volcanically active body in the solar system.",
  },
  {
    id: "callisto",
    name: "Callisto",
    kind: "moon",
    diameterM: 4_820.6 * KM,
    emoji: "🌑",
    color: "#a8a29e",
    tagline: "Most heavily cratered body known.",
  },
  {
    id: "titan",
    name: "Titan",
    kind: "moon",
    diameterM: 5_149.46 * KM,
    emoji: "🪐",
    color: "#fbbf24",
    tagline: "Saturn's hazy moon with methane lakes.",
  },
  {
    id: "ganymede",
    name: "Ganymede",
    kind: "moon",
    diameterM: 5_268.2 * KM,
    emoji: "🌕",
    color: "#d4d4d8",
    tagline: "Largest moon in the solar system — bigger than Mercury.",
  },

  /* ---------- Planets ---------- */
  {
    id: "mercury",
    name: "Mercury",
    kind: "planet",
    diameterM: 4_879 * KM,
    massKg: 3.3011e23,
    emoji: "☿️",
    color: "#a1a1aa",
    tagline: "Innermost planet, smaller than Ganymede.",
  },
  {
    id: "mars",
    name: "Mars",
    kind: "planet",
    diameterM: 6_779 * KM,
    massKg: 6.4171e23,
    emoji: "♂️",
    color: "#f87171",
    tagline: "The red planet, roughly half Earth's diameter.",
  },
  {
    id: "venus",
    name: "Venus",
    kind: "planet",
    diameterM: 12_104 * KM,
    massKg: 4.8675e24,
    emoji: "♀️",
    color: "#fde68a",
    tagline: "Earth's hellish twin, blanketed in CO₂.",
  },
  {
    id: "earth",
    name: "Earth",
    kind: "planet",
    diameterM: 2 * R_EARTH,
    massKg: 5.972e24,
    emoji: "🌍",
    color: "#60a5fa",
    tagline: "Home. 12,742 km across.",
  },
  {
    id: "neptune",
    name: "Neptune",
    kind: "planet",
    diameterM: 49_244 * KM,
    massKg: 1.024e26,
    emoji: "🔵",
    color: "#3b82f6",
    tagline: "Outermost ice giant, ~4× Earth's diameter.",
  },
  {
    id: "uranus",
    name: "Uranus",
    kind: "planet",
    diameterM: 50_724 * KM,
    massKg: 8.681e25,
    emoji: "🔵",
    color: "#67e8f9",
    tagline: "Sideways ice giant.",
  },
  {
    id: "saturn",
    name: "Saturn",
    kind: "planet",
    diameterM: 116_460 * KM,
    massKg: 5.6834e26,
    emoji: "🪐",
    color: "#fde68a",
    tagline: "Gas giant with iconic rings (rings not included in disc).",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "planet",
    diameterM: 139_820 * KM,
    massKg: 1.8982e27,
    emoji: "🟠",
    color: "#fb923c",
    tagline: "King of planets, ~11× Earth's diameter.",
  },

  /* ---------- Compact objects ---------- */
  {
    id: "neutron-star",
    name: "Neutron star",
    kind: "neutron-star",
    diameterM: 20 * KM,
    massKg: 2.8e30,
    emoji: "⭐",
    color: "#a78bfa",
    tagline: "~1.4 solar masses crammed into a 20-km sphere.",
  },
  {
    id: "white-dwarf",
    name: "White dwarf (Earth-sized)",
    kind: "white-dwarf",
    diameterM: 12_742 * KM,
    massKg: 1.2e30,
    emoji: "⚪",
    color: "#e0e7ff",
    tagline: "Earth-sized stellar corpse, half a solar mass.",
  },
  {
    id: "sirius-b",
    name: "Sirius B",
    kind: "white-dwarf",
    diameterM: 11_700 * KM,
    massKg: 2.02e30,
    emoji: "⚪",
    color: "#dbeafe",
    tagline: "Nearest known white dwarf, companion to Sirius A.",
  },
  {
    id: "sgr-a-star",
    name: "Sgr A*",
    kind: "blackhole",
    diameterM: 2.4e10, // ~24 million km event-horizon diameter
    massKg: 8.26e36, // 4.15 million solar masses
    emoji: "🕳️",
    color: "#0f172a",
    tagline: "Supermassive black hole at the heart of the Milky Way.",
  },
  {
    id: "m87",
    name: "M87*",
    kind: "blackhole",
    diameterM: 3.8e13, // ~38 billion km event-horizon diameter
    massKg: 1.29e40, // 6.5 billion solar masses
    emoji: "🕳️",
    color: "#020617",
    tagline: "First black hole ever imaged (EHT, 2019).",
  },

  /* ---------- Stars ---------- */
  {
    id: "proxima",
    name: "Proxima Centauri",
    kind: "star",
    diameterM: 0.1542 * (2 * R_SUN),
    emoji: "⭐",
    color: "#fca5a5",
    tagline: "Closest star to the Sun, a tiny red dwarf.",
  },
  {
    id: "sun",
    name: "Sun",
    kind: "star",
    diameterM: 2 * R_SUN,
    massKg: 1.989e30,
    emoji: "☀️",
    color: "#fde047",
    tagline: "Our G2V main-sequence star.",
  },
  {
    id: "sirius-a",
    name: "Sirius A",
    kind: "star",
    diameterM: 1.711 * (2 * R_SUN),
    emoji: "✨",
    color: "#bfdbfe",
    tagline: "Brightest star in Earth's night sky.",
  },
  {
    id: "vega",
    name: "Vega",
    kind: "star",
    diameterM: 2.362 * (2 * R_SUN),
    emoji: "✨",
    color: "#dbeafe",
    tagline: "Bright A0V star in Lyra, ancient pole star.",
  },
  {
    id: "arcturus",
    name: "Arcturus",
    kind: "star",
    diameterM: 25.4 * (2 * R_SUN),
    emoji: "⭐",
    color: "#fbbf24",
    tagline: "Orange giant in Boötes — the brightest in the north.",
  },
  {
    id: "rigel",
    name: "Rigel",
    kind: "star",
    diameterM: 78.9 * (2 * R_SUN),
    emoji: "✨",
    color: "#bfdbfe",
    tagline: "Blue supergiant in Orion, ~120,000 L☉.",
  },
  {
    id: "antares",
    name: "Antares",
    kind: "star",
    diameterM: 680 * (2 * R_SUN),
    emoji: "⭐",
    color: "#f87171",
    tagline: "Red supergiant heart of Scorpius.",
  },
  {
    id: "betelgeuse",
    name: "Betelgeuse",
    kind: "star",
    diameterM: 764 * (2 * R_SUN),
    emoji: "⭐",
    color: "#f97316",
    tagline: "Red supergiant in Orion — would swallow Jupiter's orbit.",
  },
  {
    id: "uy-scuti",
    name: "UY Scuti",
    kind: "star",
    diameterM: 1_708 * (2 * R_SUN),
    emoji: "⭐",
    color: "#fb7185",
    tagline: "Long-thought largest known star, ~1,708 R☉.",
  },
  {
    id: "stephenson-2-18",
    name: "Stephenson 2-18",
    kind: "star",
    diameterM: 2_150 * (2 * R_SUN),
    emoji: "⭐",
    color: "#ef4444",
    tagline: "One of the largest stars currently known, ~2,150 R☉.",
  },

  /* ---------- Galaxies & the very large ---------- */
  {
    id: "dwarf-galaxy",
    name: "Dwarf galaxy (typical)",
    kind: "galaxy",
    diameterM: 7_000 * LY,
    emoji: "🌌",
    color: "#c4b5fd",
    tagline: "Typical dwarf galaxy disc diameter, ~7 kly.",
  },
  {
    id: "lmc",
    name: "Large Magellanic Cloud",
    kind: "galaxy",
    diameterM: 32_200 * LY,
    emoji: "🌌",
    color: "#a78bfa",
    tagline: "Satellite galaxy of the Milky Way, ~32 kly across.",
  },
  {
    id: "milky-way",
    name: "Milky Way",
    kind: "galaxy",
    diameterM: 100_000 * LY,
    emoji: "🌌",
    color: "#818cf8",
    tagline: "Our home barred spiral galaxy, ~100 kly across.",
  },
  {
    id: "andromeda",
    name: "Andromeda (M31)",
    kind: "galaxy",
    diameterM: 220_000 * LY,
    emoji: "🌌",
    color: "#6366f1",
    tagline: "Nearest large spiral galaxy, ~220 kly across.",
  },
  {
    id: "ic-1101",
    name: "IC 1101",
    kind: "galaxy",
    diameterM: 6_000_000 * LY,
    emoji: "🌌",
    color: "#4f46e5",
    tagline: "Giant elliptical, one of the largest galaxies known.",
  },
];

/** Format a metres value into a human-friendly string. */
export function formatMeters(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= LY) {
    const ly = m / LY;
    if (ly >= 1_000_000) return `${(ly / 1_000_000).toFixed(2)} Mly`;
    if (ly >= 1_000) return `${(ly / 1_000).toFixed(1)} kly`;
    return `${ly.toFixed(2)} ly`;
  }
  if (m >= 1e9) return `${(m / 1e9).toFixed(2)} Gm`;
  if (m >= 1e6) return `${(m / 1e6).toFixed(2)} Mm`;
  if (m >= KM) return `${(m / KM).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
  if (m >= 1) return `${m.toFixed(1)} m`;
  return `${(m * 100).toFixed(1)} cm`;
}

/** Format a multiplier into a friendly "×" string. */
export function formatMultiplier(x: number): string {
  if (!Number.isFinite(x) || x <= 0) return "—";
  if (x >= 1e12) return `${(x / 1e12).toFixed(2)} trillion×`;
  if (x >= 1e9) return `${(x / 1e9).toFixed(2)} billion×`;
  if (x >= 1e6) return `${(x / 1e6).toFixed(2)} million×`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1)}k×`;
  if (x >= 100) return `${x.toFixed(0)}×`;
  if (x >= 10) return `${x.toFixed(1)}×`;
  return `${x.toFixed(2)}×`;
}

export function findCompareItem(id: string): CompareItem | undefined {
  return COMPARE_ITEMS.find((it) => it.id === id);
}

/**
 * Sky cultures — extended set (Stellarium-style, additive to the
 * existing `viewer/constellations/` Western / Chinese / Polynesian /
 * Lakota cultures).
 *
 * Upstream source: https://github.com/Stellarium/stellarium-skycultures
 * (cultural-data subdirectory, CC BY-SA 4.0; we render the lines and
 * star names without modification, with prominent attribution).
 *
 * Each culture below was hand-transcribed from Stellarium's
 * `constellationship.fab` line-figure file plus `star_names.fab` for
 * the most-recognisable named stars. Bright-star coordinates are
 * J2000 ICRS from Hipparcos / Yale Bright Star (public domain).
 *
 * Coordinates are `[raDeg, decDeg]` and lines are sequences of vertex
 * pairs that the renderer joins with line segments. A `[A,B,C]`
 * sequence draws A-B and B-C; multiple disconnected polylines are
 * separate entries in `lines`.
 */

export type ExtendedSkyCultureId =
  | "arab"
  | "inuit"
  | "egyptian"
  | "maya"
  | "boorong"
  | "norse"
  | "maori"
  | "japanese-moon-stations"
  | "korean"
  | "sami"
  | "tongan"
  | "tukano";

export type SkyCultureFigure = {
  /** Native or common name of the asterism / constellation. */
  name: string;
  /** Optional translation / brief description. */
  detail: string;
  /** One or more polylines (sequence of [raDeg, decDeg] vertices). */
  lines: Array<Array<[number, number]>>;
};

export type SkyCultureStarName = {
  /** Native name of the star, in the culture's tradition. */
  name: string;
  /** Bright-star reference (Bayer / Flamsteed / common). */
  ref: string;
  raDeg: number;
  decDeg: number;
};

export type ExtendedSkyCulture = {
  id: ExtendedSkyCultureId;
  label: string;
  region: string;
  /** Stellarium attribution line — must be displayed when this culture is active. */
  attribution: string;
  figures: SkyCultureFigure[];
  /** Optional named-star sprinkle for the culture. */
  stars: SkyCultureStarName[];
};

/* ─── Bright-star catalog used as the lookup database ───────────────
 *
 * All cultures pick from this small pool of recognised bright stars
 * (Hipparcos J2000), so adding a new asterism stays succinct. */

const S = (
  raDeg: number,
  decDeg: number,
): [number, number] => [raDeg, decDeg];

// Northern bright stars
const POLARIS = S(37.95, 89.26);
const KOCHAB = S(222.68, 74.16);
const PHERKAD = S(230.18, 71.83);
const CAPELLA = S(79.17, 45.998);
const ALDEBARAN = S(68.98, 16.51);
const RIGEL = S(78.63, -8.20);
const BETELGEUSE = S(88.79, 7.4);
const SIRIUS = S(101.29, -16.72);
const PROCYON = S(114.83, 5.22);
const CASTOR = S(113.65, 31.89);
const POLLUX = S(116.33, 28.03);
const REGULUS = S(152.09, 11.97);
const DENEBOLA = S(177.27, 14.57);
const SPICA = S(201.30, -11.16);
const ARCTURUS = S(213.92, 19.18);
const VEGA = S(279.23, 38.78);
const DENEB = S(310.36, 45.28);
const ALTAIR = S(297.7, 8.87);
const FOMALHAUT = S(344.41, -29.62);
const ANTARES = S(247.35, -26.43);
const SHAULA = S(263.4, -37.10);
const CANOPUS = S(95.99, -52.7);
const ACHERNAR = S(24.43, -57.24);
const ACRUX = S(186.65, -63.10);
const GACRUX = S(187.79, -57.11);
const MIMOSA = S(191.93, -59.69);
const HADAR = S(210.96, -60.37);
const ALPHA_CEN = S(219.90, -60.83);
// Big-Dipper stars (used by many circumpolar cultures)
const DUBHE = S(165.46, 61.75);
const MERAK = S(165.93, 56.38);
const PHECDA = S(178.46, 53.69);
const MEGREZ = S(183.86, 57.03);
const ALIOTH = S(193.51, 55.96);
const MIZAR = S(200.98, 54.93);
const ALKAID = S(206.89, 49.31);
// Cassiopeia / Pegasus / Andromeda
const SCHEDAR = S(10.13, 56.54);
const CAPH = S(2.29, 59.15);
const NAVI = S(14.18, 60.72);
const RUCHBAH = S(21.45, 60.24);
const SEGIN = S(28.6, 63.67);
const ALPHERATZ = S(2.1, 29.09);
const MIRACH = S(17.43, 35.62);
const ALMACH = S(30.97, 42.33);
const MARKAB = S(346.19, 15.21);
const SCHEAT = S(345.94, 28.08);
const ALGENIB = S(3.34, 15.18);
const ENIF = S(326.05, 9.88);
// Orion belt + scabbard
const MINTAKA = S(83.00, -0.30);
const ALNILAM = S(84.05, -1.20);
const ALNITAK = S(85.19, -1.94);
const SAIPH = S(86.94, -9.67);
// Scorpius
const DSCHUBBA = S(240.08, -22.62);
const ACRAB = S(241.36, -19.81);
// Lyra/Cygnus
const ALTAIR_ALT = ALTAIR;
const SADR = S(305.56, 40.26);
const ALBIREO = S(292.68, 27.96);
// Cepheus
const ALDERAMIN = S(319.64, 62.59);
const ERRAI = S(354.83, 77.63);
// Pleiades
const ALCYONE = S(56.87, 24.10);

/* ─── 1. Arab (medieval) ────────────────────────────────────────── */

const ARAB: ExtendedSkyCulture = {
  id: "arab",
  label: "Arab (medieval)",
  region: "Arabia · 9th–13th c.",
  attribution:
    "Stellarium sky-cultures · Arabic Moon Mansions (manazil al-qamar) · CC BY-SA 4.0",
  figures: [
    {
      name: "Banat na'sh (Daughters of the Bier)",
      detail: "The Big Dipper as the bier of a slain father and his three daughters following.",
      lines: [[DUBHE, MERAK, PHECDA, MEGREZ, ALIOTH, MIZAR, ALKAID]],
    },
    {
      name: "Al-Jabbar (the Giant)",
      detail: "Orion. The belt is the giant's three-jewelled girdle.",
      lines: [
        [BETELGEUSE, MINTAKA, ALNILAM, ALNITAK, RIGEL],
        [BETELGEUSE, RIGEL],
      ],
    },
    {
      name: "Al-Aqrab (the Scorpion)",
      detail: "Scorpius — claws, heart (Antares) and the curving tail.",
      lines: [
        [DSCHUBBA, ACRAB, ANTARES, S(252.97, -34.29), S(262.69, -37.1), SHAULA],
      ],
    },
    {
      name: "Al-Faras al-A'zam (the Greater Horse)",
      detail: "Pegasus — the Great Square of the celestial winged horse.",
      lines: [[MARKAB, ALGENIB, ALPHERATZ, SCHEAT, MARKAB]],
    },
    {
      name: "Al-Mar'a al-Musalsala (the Chained Woman)",
      detail: "Andromeda — the chained princess linked to Pegasus.",
      lines: [[ALPHERATZ, MIRACH, ALMACH]],
    },
  ],
  stars: [
    { name: "Aldebaran (al-Dabaran)", ref: "α Tau", raDeg: ALDEBARAN[0], decDeg: ALDEBARAN[1] },
    { name: "Betelgeuse (yad al-jauza)", ref: "α Ori", raDeg: BETELGEUSE[0], decDeg: BETELGEUSE[1] },
    { name: "Rigel (rijl al-jauza)", ref: "β Ori", raDeg: RIGEL[0], decDeg: RIGEL[1] },
    { name: "Vega (an-nasr al-waqi')", ref: "α Lyr", raDeg: VEGA[0], decDeg: VEGA[1] },
    { name: "Altair (an-nasr at-ta'ir)", ref: "α Aql", raDeg: ALTAIR[0], decDeg: ALTAIR[1] },
    { name: "Deneb (dhanab ad-dajaja)", ref: "α Cyg", raDeg: DENEB[0], decDeg: DENEB[1] },
    { name: "Fomalhaut (fam al-hut)", ref: "α PsA", raDeg: FOMALHAUT[0], decDeg: FOMALHAUT[1] },
  ],
};

/* ─── 2. Inuit ──────────────────────────────────────────────────── */

const INUIT: ExtendedSkyCulture = {
  id: "inuit",
  label: "Inuit",
  region: "Arctic · MacDonald 1998",
  attribution:
    "Stellarium sky-cultures · Inuit (after John MacDonald, 'The Arctic Sky') · CC BY-SA 4.0",
  figures: [
    {
      name: "Tukturjuit (the Caribou)",
      detail: "The Big Dipper — caribou ranging the polar sky.",
      lines: [[DUBHE, MERAK, PHECDA, MEGREZ, ALIOTH, MIZAR, ALKAID]],
    },
    {
      name: "Aagjuuk (the Two Sunbeams)",
      detail: "Altair + Tarazed — heralds the returning sun after polar night.",
      lines: [[ALTAIR, S(296.56, 10.61)]], // α Aql + γ Aql
    },
    {
      name: "Sivulliik (the First Ones)",
      detail: "Pollux + Castor + the Auriga arc — first stars of the evening sky.",
      lines: [[CASTOR, POLLUX, CAPELLA]],
    },
    {
      name: "Qimmiit (the Dogs)",
      detail: "The Hyades attacking a bear — V-shape of stars near Aldebaran.",
      lines: [[ALDEBARAN, S(67.16, 15.87), S(64.95, 15.63), ALDEBARAN]],
    },
  ],
  stars: [
    { name: "Aagjuuk (Altair)", ref: "α Aql", raDeg: ALTAIR[0], decDeg: ALTAIR[1] },
    { name: "Ullaktut (Orion's belt)", ref: "δε ζ Ori", raDeg: ALNILAM[0], decDeg: ALNILAM[1] },
  ],
};

/* ─── 3. Egyptian (Dendera) ─────────────────────────────────────── */

const EGYPTIAN: ExtendedSkyCulture = {
  id: "egyptian",
  label: "Egyptian",
  region: "Dendera zodiac · c. 50 BCE",
  attribution:
    "Stellarium sky-cultures · Egyptian (after the Dendera ceiling) · CC BY-SA 4.0",
  figures: [
    {
      name: "Sah (Osiris)",
      detail: "Orion as Osiris striding across the southern sky.",
      lines: [
        [BETELGEUSE, MINTAKA, RIGEL],
        [MINTAKA, ALNILAM, ALNITAK, SAIPH, RIGEL],
        [BETELGEUSE, S(81.28, 6.35), MINTAKA], // Bellatrix included
      ],
    },
    {
      name: "Sopdet (Sirius / Isis)",
      detail: "Sirius — heralded the Nile flood at its heliacal rising.",
      lines: [[SIRIUS]],
    },
    {
      name: "Meskhetyu (the Bull's Foreleg)",
      detail: "The Big Dipper as the foreleg of a bull, struck and chained.",
      lines: [[DUBHE, MERAK, PHECDA, MEGREZ, ALIOTH, MIZAR, ALKAID]],
    },
    {
      name: "Hippopotamus",
      detail: "Draco + parts of Ursa Minor — the hippo guarding the bull's foreleg.",
      lines: [
        [KOCHAB, PHERKAD, S(244.93, 75.45), S(257.20, 65.71), S(269.15, 51.49)],
      ],
    },
  ],
  stars: [
    { name: "Sopdet (Sirius)", ref: "α CMa", raDeg: SIRIUS[0], decDeg: SIRIUS[1] },
    { name: "Sah (Orion)", ref: "δ Ori", raDeg: MINTAKA[0], decDeg: MINTAKA[1] },
  ],
};

/* ─── 4. Maya ───────────────────────────────────────────────────── */

const MAYA: ExtendedSkyCulture = {
  id: "maya",
  label: "Maya",
  region: "Mesoamerica · pre-Columbian",
  attribution:
    "Stellarium sky-cultures · Maya (after Tedlock, Aveni) · CC BY-SA 4.0",
  figures: [
    {
      name: "Ek' Balam (the Jaguar)",
      detail: "Gemini stars as the celestial jaguar.",
      lines: [[CASTOR, POLLUX, S(101.32, 20.57), S(99.43, 16.4)]],
    },
    {
      name: "Tres Piedras (the Three Hearthstones)",
      detail: "Three stars of Orion's belt — the cosmic hearth at creation.",
      lines: [[MINTAKA, ALNILAM, ALNITAK]],
    },
    {
      name: "Tzab-ek (the Rattlesnake's Rattle)",
      detail: "The Pleiades — the rattle warning of the coming rains.",
      lines: [[ALCYONE]],
    },
    {
      name: "Way Pop (Scorpion)",
      detail: "Scorpius — the celestial scorpion, marker of the Milky Way crossing.",
      lines: [[DSCHUBBA, ACRAB, ANTARES, S(252.97, -34.29), SHAULA]],
    },
  ],
  stars: [
    { name: "Tzab-ek (Pleiades)", ref: "η Tau", raDeg: ALCYONE[0], decDeg: ALCYONE[1] },
  ],
};

/* ─── 5. Boorong (Aboriginal Australian) ─────────────────────────── */

const BOORONG: ExtendedSkyCulture = {
  id: "boorong",
  label: "Boorong (Aboriginal)",
  region: "Wergaia (NW Victoria) · Stanbridge 1857",
  attribution:
    "Stellarium sky-cultures · Boorong / Wergaia (after W. Stanbridge) · CC BY-SA 4.0",
  figures: [
    {
      name: "Marpean-Kurrk (Arcturus)",
      detail: "Arcturus — mother of Djuit; brings the ant larvae season.",
      lines: [[ARCTURUS]],
    },
    {
      name: "Neilloan (Vega) and Nest",
      detail: "Vega — the malleefowl tending her great nest.",
      lines: [[VEGA, S(282.52, 33.36), S(284.74, 32.69)]], // Vega + ε Lyr + ζ Lyr
    },
    {
      name: "Bunya (Fomalhaut)",
      detail: "Fomalhaut — the ringtail possum at the foot of the great tree.",
      lines: [[FOMALHAUT]],
    },
    {
      name: "Kulkunbulla (Orion's belt)",
      detail: "Three young dancing men — Orion's belt.",
      lines: [[MINTAKA, ALNILAM, ALNITAK]],
    },
    {
      name: "Yurree and Wanjel (Castor & Pollux)",
      detail: "Two hunters chasing Purra (kangaroo).",
      lines: [[CASTOR, POLLUX]],
    },
  ],
  stars: [
    { name: "Marpean-Kurrk (Arcturus)", ref: "α Boo", raDeg: ARCTURUS[0], decDeg: ARCTURUS[1] },
    { name: "Neilloan (Vega)", ref: "α Lyr", raDeg: VEGA[0], decDeg: VEGA[1] },
  ],
};

/* ─── 6. Norse ──────────────────────────────────────────────────── */

const NORSE: ExtendedSkyCulture = {
  id: "norse",
  label: "Norse",
  region: "Scandinavia · pre-Christian",
  attribution:
    "Stellarium sky-cultures · Norse (after Bjørn Jónsson, Snorra Edda) · CC BY-SA 4.0",
  figures: [
    {
      name: "Karlavagnen (the Churl's Wagon)",
      detail: "The Big Dipper as a four-wheeled wagon.",
      lines: [[DUBHE, MERAK, PHECDA, MEGREZ, ALIOTH, MIZAR, ALKAID]],
    },
    {
      name: "Frigg's Distaff (Frigg's Spinning Wheel)",
      detail: "Orion's belt as the spindle of the goddess Frigg.",
      lines: [[MINTAKA, ALNILAM, ALNITAK]],
    },
    {
      name: "Aurvandil's Toe",
      detail: "A single bright star (Rigel) — the frozen toe of Aurvandil tossed to the sky by Thor.",
      lines: [[RIGEL]],
    },
    {
      name: "Loki's Brand",
      detail: "Sirius — Loki's burning torch chasing the wolf.",
      lines: [[SIRIUS]],
    },
  ],
  stars: [
    { name: "Aurvandil's Toe (Rigel)", ref: "β Ori", raDeg: RIGEL[0], decDeg: RIGEL[1] },
  ],
};

/* ─── 7. Maori ──────────────────────────────────────────────────── */

const MAORI: ExtendedSkyCulture = {
  id: "maori",
  label: "Maori",
  region: "Aotearoa / New Zealand",
  attribution:
    "Stellarium sky-cultures · Maori (after Pauline Harris et al.) · CC BY-SA 4.0",
  figures: [
    {
      name: "Matariki (Pleiades)",
      detail: "Seven stars marking the Maori new year (Puanga in some iwi).",
      lines: [[ALCYONE]],
    },
    {
      name: "Te Waka o Tama Rereti (Tama Rereti's Canoe)",
      detail: "Scorpius — the canoe in which Tama Rereti gathered the stars.",
      lines: [[DSCHUBBA, ACRAB, ANTARES, S(252.97, -34.29), SHAULA]],
    },
    {
      name: "Te Punga (the Anchor)",
      detail: "The Southern Cross as the anchor of the great star-canoe.",
      lines: [[ACRUX, GACRUX], [MIMOSA, S(193.0, -57.11)]],
    },
    {
      name: "Te Ra (the Sun's Path)",
      detail: "Bright equatorial markers — Aldebaran, Orion's belt, Sirius — the sun's annual road.",
      lines: [[ALDEBARAN, MINTAKA, SIRIUS]],
    },
  ],
  stars: [
    { name: "Matariki (Pleiades)", ref: "η Tau", raDeg: ALCYONE[0], decDeg: ALCYONE[1] },
    { name: "Atutahi (Canopus)", ref: "α Car", raDeg: CANOPUS[0], decDeg: CANOPUS[1] },
    { name: "Puanga (Rigel)", ref: "β Ori", raDeg: RIGEL[0], decDeg: RIGEL[1] },
  ],
};

/* ─── 8. Japanese (lunar mansions) ──────────────────────────────── */

const JAPANESE: ExtendedSkyCulture = {
  id: "japanese-moon-stations",
  label: "Japanese (28 Sukuyō)",
  region: "Heian Japan · Sukuyō-dō",
  attribution:
    "Stellarium sky-cultures · Japanese 28 Moon Stations (sukuyō) · CC BY-SA 4.0",
  figures: [
    {
      name: "Subaru (Pleiades)",
      detail: "The Pleiades — the heart of the autumn Heian sky.",
      lines: [[ALCYONE]],
    },
    {
      name: "Mitsuboshi (the Three Stars)",
      detail: "Orion's belt as a row of three lanterns.",
      lines: [[MINTAKA, ALNILAM, ALNITAK]],
    },
    {
      name: "Hokuto Shichisei (the Northern Dipper)",
      detail: "The Big Dipper, lord of mortal lifespan in Sukuyō tradition.",
      lines: [[DUBHE, MERAK, PHECDA, MEGREZ, ALIOTH, MIZAR, ALKAID]],
    },
    {
      name: "Tanabata (Vega & Altair)",
      detail: "Vega (Orihime) and Altair (Hikoboshi) across the river of stars.",
      lines: [[VEGA, ALTAIR]],
    },
  ],
  stars: [
    { name: "Subaru (Pleiades)", ref: "η Tau", raDeg: ALCYONE[0], decDeg: ALCYONE[1] },
    { name: "Orihime (Vega)", ref: "α Lyr", raDeg: VEGA[0], decDeg: VEGA[1] },
    { name: "Hikoboshi (Altair)", ref: "α Aql", raDeg: ALTAIR[0], decDeg: ALTAIR[1] },
  ],
};

/* ─── 9. Korean (천상열차분야지도) ─────────────────────────────── */

const KOREAN: ExtendedSkyCulture = {
  id: "korean",
  label: "Korean",
  region: "Joseon · Cheonsang Yeolcha Bunyajido",
  attribution:
    "Stellarium sky-cultures · Korean (after Cheonsang Yeolcha Bunyajido, 1395) · CC BY-SA 4.0",
  figures: [
    {
      name: "Bukdu Chilseong (Northern Dipper, 北斗七星)",
      detail: "The seven stars of the Big Dipper — guardians of fate in Korean tradition.",
      lines: [[DUBHE, MERAK, PHECDA, MEGREZ, ALIOTH, MIZAR, ALKAID]],
    },
    {
      name: "Samtae (Three Towers, 三台)",
      detail: "Three pairs of stars in Ursa Major below the dipper bowl.",
      lines: [[S(154.27, 41.5), S(165.46, 61.75)]],
    },
    {
      name: "Gyeon-u and Jingnyeo (the Cowherd and Weaver)",
      detail: "Altair and Vega, separated by the Milky Way.",
      lines: [[VEGA, ALTAIR]],
    },
  ],
  stars: [
    { name: "Bukdu (Big Dipper)", ref: "α UMa", raDeg: DUBHE[0], decDeg: DUBHE[1] },
  ],
};

/* ─── 10. Sami ──────────────────────────────────────────────────── */

const SAMI: ExtendedSkyCulture = {
  id: "sami",
  label: "Sami",
  region: "Sápmi · Lars Levi Læstadius",
  attribution:
    "Stellarium sky-cultures · Sami (after Læstadius, Lundius) · CC BY-SA 4.0",
  figures: [
    {
      name: "Sarva (the Elk)",
      detail: "Cassiopeia + Andromeda + part of Perseus — the great cosmic elk Sarva.",
      lines: [
        [CAPH, SCHEDAR, NAVI, RUCHBAH, SEGIN],
        [ALPHERATZ, MIRACH, ALMACH],
      ],
    },
    {
      name: "Boahjenásti (Polaris, the World Nail)",
      detail: "Polaris — the celestial nail around which the heavens turn.",
      lines: [[POLARIS]],
    },
    {
      name: "Favtna (Orion's belt)",
      detail: "The hunter Faavn'a, who shot at Sarva with an arrow.",
      lines: [[MINTAKA, ALNILAM, ALNITAK]],
    },
  ],
  stars: [
    { name: "Boahjenásti (Polaris)", ref: "α UMi", raDeg: POLARIS[0], decDeg: POLARIS[1] },
  ],
};

/* ─── 11. Tongan ────────────────────────────────────────────────── */

const TONGAN: ExtendedSkyCulture = {
  id: "tongan",
  label: "Tongan",
  region: "Tonga · navigational tradition",
  attribution:
    "Stellarium sky-cultures · Tongan (after Kirch & Green) · CC BY-SA 4.0",
  figures: [
    {
      name: "Toloa (the Duck)",
      detail: "The Southern Cross as a flying duck.",
      lines: [[ACRUX, GACRUX], [MIMOSA, S(193.0, -57.11)]],
    },
    {
      name: "Houmatoloa (Orion's belt)",
      detail: "Three brothers of the chief — Orion's belt.",
      lines: [[MINTAKA, ALNILAM, ALNITAK]],
    },
    {
      name: "Kapakau-'o-Tafahi",
      detail: "Sirius and surrounding stars — sky guide for sea voyages south from Tafahi.",
      lines: [[SIRIUS, PROCYON]],
    },
  ],
  stars: [
    { name: "Toloa (Acrux)", ref: "α Cru", raDeg: ACRUX[0], decDeg: ACRUX[1] },
  ],
};

/* ─── 12. Tukano (Amazonia) ──────────────────────────────────────── */

const TUKANO: ExtendedSkyCulture = {
  id: "tukano",
  label: "Tukano",
  region: "Northwest Amazon · Reichel-Dolmatoff",
  attribution:
    "Stellarium sky-cultures · Tukano (after Reichel-Dolmatoff) · CC BY-SA 4.0",
  figures: [
    {
      name: "Nyokoaro (the Manioc Squeezer)",
      detail: "Pleiades — emergence marks the start of the manioc-planting season.",
      lines: [[ALCYONE]],
    },
    {
      name: "Bairo (the Snake)",
      detail: "Scorpius — the great anaconda of the southern Milky Way.",
      lines: [
        [DSCHUBBA, ACRAB, ANTARES, S(252.97, -34.29), S(262.69, -37.1), SHAULA],
      ],
    },
    {
      name: "Yebá Yebó (the Hunter)",
      detail: "Orion — hunter pursuing the celestial tapir.",
      lines: [
        [BETELGEUSE, MINTAKA, RIGEL],
        [MINTAKA, ALNILAM, ALNITAK, SAIPH],
      ],
    },
  ],
  stars: [
    { name: "Nyokoaro (Pleiades)", ref: "η Tau", raDeg: ALCYONE[0], decDeg: ALCYONE[1] },
    { name: "Bairo (Antares)", ref: "α Sco", raDeg: ANTARES[0], decDeg: ANTARES[1] },
  ],
};

export const EXTENDED_SKY_CULTURES: Record<
  ExtendedSkyCultureId,
  ExtendedSkyCulture
> = {
  arab: ARAB,
  inuit: INUIT,
  egyptian: EGYPTIAN,
  maya: MAYA,
  boorong: BOORONG,
  norse: NORSE,
  maori: MAORI,
  "japanese-moon-stations": JAPANESE,
  korean: KOREAN,
  sami: SAMI,
  tongan: TONGAN,
  tukano: TUKANO,
};

export const EXTENDED_CULTURE_LIST: ReadonlyArray<ExtendedSkyCultureId> = [
  "arab",
  "inuit",
  "egyptian",
  "maya",
  "boorong",
  "norse",
  "maori",
  "japanese-moon-stations",
  "korean",
  "sami",
  "tongan",
  "tukano",
];

// Suppress "unused" warnings for bright stars only referenced via culture spread.
// (Keeping these named in code makes adding new figures fast.)
export const _UNUSED_BRIGHT: ReadonlyArray<[number, number]> = [
  HADAR,
  ALPHA_CEN,
  SADR,
  ALBIREO,
  ALDERAMIN,
  ERRAI,
  ENIF,
  DENEBOLA,
  REGULUS,
  SPICA,
  ACHERNAR,
  ALTAIR_ALT,
];

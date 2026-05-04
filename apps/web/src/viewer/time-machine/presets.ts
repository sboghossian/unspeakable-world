/**
 * Time-machine presets — curated "jump in time + space" cards.
 *
 * Each preset sets the simulation clock, optionally flies to a target body,
 * and optionally adjusts the time-rate. Used by {@link TimeMachinePanel}.
 */

export type TimeMachinePreset = {
  id: string;
  /** ISO 8601 instant. */
  date: string;
  title: string;
  /** Two-sentence narration shown on the card. */
  body: string;
  /** Scene target name passed to {@link UniverseScene.flyTo}. */
  flyTo?: string;
  /** Sim seconds per wall second. Defaults to 86400 (1 day/sec) when omitted. */
  rate?: number;
  emoji: string;
};

export const PRESETS: readonly TimeMachinePreset[] = [
  {
    id: "apollo-11",
    date: "1969-07-20T20:17:00Z",
    title: "Apollo 11 lunar landing",
    body: "Eagle has landed. First crewed lunar landing.",
    flyTo: "Earth",
    rate: 3600,
    emoji: "🌕",
  },
  {
    id: "voyager-launch",
    date: "1977-09-05T00:00:00Z",
    title: "Voyager 1 launches",
    body: "Voyager 1 launches from Cape Canaveral. 47-year journey to interstellar space begins.",
    flyTo: "Earth",
    rate: 86400,
    emoji: "🚀",
  },
  {
    id: "tunguska",
    date: "1908-06-30T00:14:00Z",
    title: "Tunguska event",
    body: "A 50-m bolide explodes over Siberian taiga. 2,000 km² of forest flattened.",
    flyTo: "Earth",
    rate: 3600,
    emoji: "💥",
  },
  {
    id: "halley-1986",
    date: "1986-04-10T00:00:00Z",
    title: "Halley's Comet at perihelion",
    body: "Halley's Comet at perihelion. Seen by hundreds of millions; next return 2061.",
    flyTo: "Sun",
    rate: 86400,
    emoji: "☄",
  },
  {
    id: "sn1987a",
    date: "1987-02-23T07:35:00Z",
    title: "Supernova 1987A peaks",
    body: "Supernova 1987A peaks. The first naked-eye supernova since 1604, 168,000 ly away in the LMC.",
    flyTo: "Local Group",
    rate: 86400,
    emoji: "✨",
  },
  {
    id: "pale-blue-dot",
    date: "1990-02-14T00:00:00Z",
    title: "Pale Blue Dot",
    body: "Voyager 1 turns its camera back. The Pale Blue Dot photo. Earth: 0.12 px wide.",
    flyTo: "Earth",
    rate: 86400,
    emoji: "🔵",
  },
  {
    id: "shoemaker-levy-9",
    date: "1994-07-16T00:00:00Z",
    title: "Shoemaker–Levy 9 impacts Jupiter",
    body: "Comet fragments crash into Jupiter. First time humans watch a planetary impact in real time.",
    flyTo: "Jupiter",
    rate: 86400,
    emoji: "🪐",
  },
  {
    id: "gw170817",
    date: "2017-08-17T12:41:00Z",
    title: "GW170817 — neutron-star merger",
    body: "First multi-messenger detection: GW + EM. Neutron-star merger 130 Mly away in NGC 4993.",
    flyTo: "Local Group",
    rate: 3600,
    emoji: "🌠",
  },
  {
    id: "eclipse-2024",
    date: "2024-04-08T18:18:00Z",
    title: "Total eclipse — North America",
    body: "Total solar eclipse across North America. Path of totality from Mexico to Newfoundland.",
    flyTo: "Sun",
    rate: 600,
    emoji: "🌑",
  },
  {
    id: "next-eclipse",
    date: "2026-08-12T18:46:00Z",
    title: "Next total eclipse — Iceland & Spain",
    body: "Next total solar eclipse, visible from Iceland and northern Spain. Greatest eclipse 18:46 UT.",
    flyTo: "Sun",
    rate: 600,
    emoji: "🌒",
  },
];

/**
 * Ambient music tracks for navigating the universe.
 *
 * Curated for license-clean, CORS-friendly playback in the browser.
 * Every track is either:
 *
 *   1. Public-domain NASA recording (data sonification or Voyager-era
 *      archive), hosted on archive.org — definitively CORS-enabled.
 *   2. CC-BY ambient music hosted on a known-stable mirror, with
 *      attribution surfaced in the music panel.
 *
 * Tracks should sit somewhere between 3 and 30 minutes — short enough
 * not to bloat the page on first play, long enough that the user isn't
 * pestered by a relooping 90-second clip.
 *
 * Custom tracks: the music panel lets the user paste any audio URL.
 * Those go into `localStorage` under `uw:music:custom-tracks` (not in
 * this file) and live alongside the curated list.
 */

export type MusicTrack = {
  id: string;
  title: string;
  /** Whose recording / composition this is. */
  attribution: string;
  /** Plain-text license summary — surfaced in the UI. */
  license: string;
  /** "ambient" = continuous music; "sonification" = NASA data-as-sound. */
  kind: "ambient" | "sonification";
  /** Direct media URL — must be HTTPS + CORS-enabled. */
  src: string;
  /** Optional link to the source page for attribution clicks. */
  source?: string;
  /** Approximate duration in seconds, for the UI. */
  durationSec?: number;
  /** True if the track is a user-supplied custom URL (set at runtime). */
  custom?: boolean;
};

/**
 * Default catalog. Loaded into the player on first run. Users can hide
 * any of these by adding the id to `uw:music:hidden` localStorage.
 */
export const DEFAULT_TRACKS: MusicTrack[] = [
  {
    id: "voyager-greetings",
    title: "Voyager Golden Record · Greetings in 55 Languages",
    attribution: "NASA / JPL · Voyager Interstellar Mission (1977)",
    license: "Public domain",
    kind: "sonification",
    src: "https://archive.org/download/voyagergoldenrecord/Voyager%20Sounds%20Of%20Earth%2009%20-%20Greetings%20In%2055%20Languages.mp3",
    source: "https://archive.org/details/voyagergoldenrecord",
    durationSec: 230,
  },
  {
    id: "voyager-sounds-of-earth",
    title: "Voyager Golden Record · Sounds of Earth",
    attribution: "NASA / JPL · Voyager Interstellar Mission (1977)",
    license: "Public domain",
    kind: "sonification",
    src: "https://archive.org/download/voyagergoldenrecord/Voyager%20Sounds%20Of%20Earth%2002%20-%20The%20Sounds%20Of%20Earth.mp3",
    source: "https://archive.org/details/voyagergoldenrecord",
    durationSec: 750,
  },
  {
    id: "saturn-radio",
    title: "Saturn's Radio Emissions",
    attribution: "NASA · Cassini RPWS instrument",
    license: "Public domain",
    kind: "sonification",
    src: "https://archive.org/download/SaturnLikeRadioEmissions/saturnemissions.mp3",
    source: "https://archive.org/details/SaturnLikeRadioEmissions",
    durationSec: 110,
  },
  {
    id: "plasma-waves",
    title: "Interstellar Plasma Wave Sounds",
    attribution: "NASA · Voyager 1 PWS instrument",
    license: "Public domain",
    kind: "sonification",
    src: "https://archive.org/download/voyager1plasmaSoundsinterstellarBoundary/InterstellarPlasmaWaveSounds.mp3",
    source: "https://archive.org/details/voyager1plasmaSoundsinterstellarBoundary",
    durationSec: 70,
  },
  {
    id: "jupiter-emissions",
    title: "Jupiter's Auroral Hiss",
    attribution: "NASA · Juno Waves instrument",
    license: "Public domain",
    kind: "sonification",
    src: "https://archive.org/download/jupiter-juno-perijove1/jupiter-juno-perijove1.mp3",
    source: "https://archive.org/details/jupiter-juno-perijove1",
    durationSec: 60,
  },
];

/** localStorage keys for music state. */
export const MUSIC_KEYS = {
  enabled: "uw:music:enabled",
  trackId: "uw:music:track-id",
  volume: "uw:music:volume",
  loop: "uw:music:loop",
  custom: "uw:music:custom-tracks",
  hidden: "uw:music:hidden",
} as const;

/** Read user-added custom tracks (URLs they pasted). */
export function readCustomTracks(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(MUSIC_KEYS.custom);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MusicTrack[];
    return Array.isArray(parsed)
      ? parsed.filter((t) => typeof t.id === "string" && typeof t.src === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeCustomTracks(tracks: MusicTrack[]): void {
  try {
    localStorage.setItem(MUSIC_KEYS.custom, JSON.stringify(tracks));
  } catch {
    /* quota / private mode — silent */
  }
}

/** Full playable catalog = curated minus hidden, plus user custom. */
export function allTracks(): MusicTrack[] {
  let hidden: Set<string>;
  try {
    const raw = localStorage.getItem(MUSIC_KEYS.hidden);
    hidden = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    hidden = new Set();
  }
  return [
    ...DEFAULT_TRACKS.filter((t) => !hidden.has(t.id)),
    ...readCustomTracks().map((t) => ({ ...t, custom: true })),
  ];
}

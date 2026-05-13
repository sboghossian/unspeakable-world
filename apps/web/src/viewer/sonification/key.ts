/**
 * 🎼 Tiny pitch / key helpers for the sonification engine.
 *
 * Western 12-TET, A4 = 440 Hz. The engine ships with a handful of
 * scales the user can pick from — default `C minor` chosen because the
 * minor third + flat sixth read as "meditative" against the long drone
 * pads.
 *
 * Everything is pure / stateless. The engine calls these once per
 * scene state change (B-V → degree → frequency) so we don't bother
 * memoising.
 */

const A4 = 440;
const SEMITONES: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export type ScaleId = "cMinor" | "cMajor" | "aMinor" | "dDorian" | "pentaMinor";

export type ScaleDef = {
  readonly id: ScaleId;
  readonly label: string;
  /** Tonic note, e.g. "C". */
  readonly tonic: keyof typeof SEMITONES;
  /** Scale-degree offsets in semitones (one octave). */
  readonly degrees: readonly number[];
};

export const SCALES: readonly ScaleDef[] = [
  { id: "cMinor", label: "C minor", tonic: "C", degrees: [0, 2, 3, 5, 7, 8, 10] },
  { id: "cMajor", label: "C major", tonic: "C", degrees: [0, 2, 4, 5, 7, 9, 11] },
  { id: "aMinor", label: "A minor", tonic: "A", degrees: [0, 2, 3, 5, 7, 8, 10] },
  { id: "dDorian", label: "D dorian", tonic: "D", degrees: [0, 2, 3, 5, 7, 9, 10] },
  {
    id: "pentaMinor",
    label: "Penta minor (C)",
    tonic: "C",
    degrees: [0, 3, 5, 7, 10],
  },
];

export function getScale(id: ScaleId): ScaleDef {
  const found = SCALES.find((s) => s.id === id);
  // Default to first scale (C minor) — by construction always present.
  return found ?? (SCALES[0] as ScaleDef);
}

/** MIDI-style note → Hz. note=69 returns A4=440. */
export function midiToHz(note: number): number {
  return A4 * Math.pow(2, (note - 69) / 12);
}

/**
 * Snap a continuous "position" in scale-degrees to the nearest pitch
 * in the chosen scale, then convert to Hz. `octave` is offsetted from
 * MIDI octave 4 (the tonic of scale at `octave=0` lands near middle).
 */
export function degreeToHz(
  scale: ScaleDef,
  degree: number,
  octave: number,
): number {
  const len = scale.degrees.length;
  if (len === 0) return midiToHz(60);
  // Wrap degree into [0, len) and track octave overflow.
  let d = Math.round(degree);
  let octShift = 0;
  while (d < 0) {
    d += len;
    octShift -= 1;
  }
  while (d >= len) {
    d -= len;
    octShift += 1;
  }
  const semis = scale.degrees[d] ?? 0;
  const tonicSemi = SEMITONES[scale.tonic] ?? 0;
  // MIDI C4 = 60, so tonic at octave 0 = 60 + tonicSemi.
  const midi = 60 + tonicSemi + semis + (octave + octShift) * 12;
  return midiToHz(midi);
}

/**
 * Map B-V color index to a scale degree. B-V ranges roughly -0.4 (hot
 * blue) to +2.0 (cool red). We map cool stars → low degrees, hot stars
 * → high degrees — feels intuitive (red = "deep", blue = "bright").
 *
 * Returns a continuous degree value the caller can pass to
 * `degreeToHz`. 7-note scales span ~1.5 octaves across the full range.
 */
export function bvToScaleDegree(bv: number): number {
  // Clamp -0.5 .. 2.0 → 0..1
  const clamped = Math.max(-0.5, Math.min(2.0, bv));
  const t = 1 - (clamped + 0.5) / 2.5; // invert: red = low, blue = high
  return t * 10; // ~1.5 octaves of a 7-note scale
}

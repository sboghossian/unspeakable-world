/**
 * 🗓 Upcoming sky events.
 *
 * Pure ephemeris compute — Moon quarters, eclipses (lunar + global solar),
 * planetary peak elongations / oppositions, equinoxes & solstices, plus a
 * hard-coded table of major annual meteor showers (peaks). All results
 * keyed off `now`, sorted forward in time, and trimmed to a window.
 *
 * No fetch. Runs on the main thread in well under a frame.
 */

import {
  Body,
  NextMoonQuarter,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
  SearchMaxElongation,
  SearchMoonQuarter,
  SearchRelativeLongitude,
  Seasons,
} from "astronomy-engine";

export type SkyEventKind =
  | "moon-quarter"
  | "lunar-eclipse"
  | "solar-eclipse"
  | "elongation"
  | "opposition"
  | "season"
  | "meteor";

export type SkyEventTarget =
  | { kind: "body"; name: string }
  | { kind: "radiant"; raDeg: number; decDeg: number };

export type SkyEvent = {
  kind: SkyEventKind;
  /** Compact label, e.g. "Full Moon", "Total Lunar Eclipse", "Geminids peak". */
  title: string;
  /** Optional extra detail line. */
  detail?: string;
  /** Event time. */
  time: Date;
  /** Glyph for the UI list. */
  glyph: string;
  /** Optional sky target the event refers to — clicking the row in the
   *  panel flies the camera there. */
  target?: SkyEventTarget;
};

const MOON_QUARTER_LABELS = [
  "New Moon",
  "First Quarter",
  "Full Moon",
  "Last Quarter",
];
const MOON_QUARTER_GLYPHS = ["🌑", "🌓", "🌕", "🌗"];

/** Major annual meteor showers (UTC peak day + classical radiant). */
const METEOR_SHOWERS: Array<{
  name: string;
  month: number;
  day: number;
  zhr: number;
  /** Radiant in degrees (J2000). */
  raDeg: number;
  decDeg: number;
}> = [
  { name: "Quadrantids", month: 1, day: 4, zhr: 110, raDeg: 232, decDeg: 49.7 },
  { name: "Lyrids", month: 4, day: 22, zhr: 18, raDeg: 272, decDeg: 33 },
  { name: "Eta Aquariids", month: 5, day: 6, zhr: 50, raDeg: 338, decDeg: -1 },
  { name: "Perseids", month: 8, day: 12, zhr: 100, raDeg: 48, decDeg: 58 },
  { name: "Orionids", month: 10, day: 21, zhr: 20, raDeg: 95, decDeg: 16 },
  { name: "Leonids", month: 11, day: 17, zhr: 15, raDeg: 152, decDeg: 22 },
  { name: "Geminids", month: 12, day: 14, zhr: 120, raDeg: 112, decDeg: 33 },
  { name: "Ursids", month: 12, day: 22, zhr: 10, raDeg: 217, decDeg: 75 },
];

/**
 * Return upcoming sky events in the next `windowDays` days, sorted by time.
 * Practical default: 90 days → ~5 moon quarters + 1-2 eclipses + planet
 * events + a couple of meteor peaks. Covers "what's coming soon" without
 * generating a 200-row list.
 */
export function upcomingEvents(now: Date, windowDays = 90): SkyEvent[] {
  const out: SkyEvent[] = [];
  const horizon = new Date(now.getTime() + windowDays * 86400 * 1000);

  // Moon quarters
  try {
    let mq = SearchMoonQuarter(now);
    while (mq && mq.time.date <= horizon) {
      const idx = mq.quarter & 3;
      out.push({
        kind: "moon-quarter",
        title: MOON_QUARTER_LABELS[idx]!,
        time: mq.time.date,
        glyph: MOON_QUARTER_GLYPHS[idx]!,
        target: { kind: "body", name: "Moon" },
      });
      mq = NextMoonQuarter(mq);
    }
  } catch {
    // ignore
  }

  // Lunar eclipses
  try {
    let le = SearchLunarEclipse(now);
    let safety = 0;
    while (le && le.peak.date <= horizon && safety < 6) {
      out.push({
        kind: "lunar-eclipse",
        title: `${capitalize(le.kind)} Lunar Eclipse`,
        detail: le.sd_total > 0
          ? `totality ${(le.sd_total * 2).toFixed(0)} min`
          : `partial ${(le.sd_partial * 2).toFixed(0)} min`,
        time: le.peak.date,
        glyph: "🌖",
        target: { kind: "body", name: "Moon" },
      });
      le = SearchLunarEclipse(new Date(le.peak.date.getTime() + 86400 * 1000));
      safety++;
    }
  } catch {
    // ignore
  }

  // Global solar eclipses
  try {
    let se = SearchGlobalSolarEclipse(now);
    let safety = 0;
    while (se && se.peak.date <= horizon && safety < 6) {
      out.push({
        kind: "solar-eclipse",
        title: `${capitalize(se.kind)} Solar Eclipse`,
        detail: se.distance != null ? `${se.distance.toFixed(0)} km from Earth axis` : undefined,
        time: se.peak.date,
        glyph: "🌒",
        target: { kind: "body", name: "Sun" },
      });
      se = SearchGlobalSolarEclipse(new Date(se.peak.date.getTime() + 86400 * 1000));
      safety++;
    }
  } catch {
    // ignore
  }

  // Planet peak elongations (Mercury, Venus) — best evening / morning shows
  for (const body of [Body.Mercury, Body.Venus]) {
    try {
      const e = SearchMaxElongation(body, now);
      if (e && e.time.date <= horizon) {
        out.push({
          kind: "elongation",
          title: `${bodyName(body)} greatest ${e.visibility} elongation`,
          detail: `${e.elongation.toFixed(1)}° from Sun`,
          time: e.time.date,
          glyph: body === Body.Venus ? "♀" : "☿",
          target: { kind: "body", name: bodyName(body) },
        });
      }
    } catch {
      // ignore
    }
  }

  // Outer-planet oppositions (relative longitude vs Sun = 180°)
  for (const body of [Body.Mars, Body.Jupiter, Body.Saturn]) {
    try {
      const t = SearchRelativeLongitude(body, 180, now);
      if (t && t.date <= horizon) {
        out.push({
          kind: "opposition",
          title: `${bodyName(body)} at opposition`,
          detail: "rises at sunset · all-night visible",
          time: t.date,
          glyph: bodyGlyph(body),
          target: { kind: "body", name: bodyName(body) },
        });
      }
    } catch {
      // ignore
    }
  }

  // Equinoxes & solstices
  try {
    const yr = now.getUTCFullYear();
    for (const y of [yr, yr + 1]) {
      const s = Seasons(y);
      const events: Array<{ when: Date; name: string; glyph: string }> = [
        { when: s.mar_equinox.date, name: "March equinox", glyph: "♈" },
        { when: s.jun_solstice.date, name: "June solstice", glyph: "☀" },
        { when: s.sep_equinox.date, name: "September equinox", glyph: "♎" },
        { when: s.dec_solstice.date, name: "December solstice", glyph: "❄" },
      ];
      for (const e of events) {
        if (e.when > now && e.when <= horizon) {
          out.push({
            kind: "season",
            title: e.name,
            time: e.when,
            glyph: e.glyph,
            target: { kind: "body", name: "Sun" },
          });
        }
      }
    }
  } catch {
    // ignore
  }

  // Meteor showers — emit any peak within the window for the current and
  // next year. Peak time is set to local midnight UTC on the listed day.
  const yr = now.getUTCFullYear();
  for (const y of [yr, yr + 1]) {
    for (const sh of METEOR_SHOWERS) {
      const peak = new Date(Date.UTC(y, sh.month - 1, sh.day, 0, 0, 0));
      if (peak > now && peak <= horizon) {
        out.push({
          kind: "meteor",
          title: `${sh.name} peak`,
          detail: `~${sh.zhr} meteors / hr at ZHR · radiant in ${approxConstellation(sh.raDeg, sh.decDeg)}`,
          time: peak,
          glyph: "☄",
          target: { kind: "radiant", raDeg: sh.raDeg, decDeg: sh.decDeg },
        });
      }
    }
  }

  out.sort((a, b) => a.time.getTime() - b.time.getTime());
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function bodyName(b: Body): string {
  return Body[b] ?? String(b);
}

/** Approximate-constellation lookup for the meteor radiant blurb. The
 *  classical radiants are stable so a few RA/Dec rectangles are enough. */
function approxConstellation(raDeg: number, decDeg: number): string {
  if (raDeg >= 220 && raDeg <= 245 && decDeg > 40) return "Boötes";
  if (raDeg >= 260 && raDeg <= 290 && decDeg > 25) return "Lyra";
  if (raDeg >= 320 && raDeg <= 345 && decDeg < 5) return "Aquarius";
  if (raDeg >= 30 && raDeg <= 60 && decDeg > 50) return "Perseus";
  if (raDeg >= 80 && raDeg <= 105 && decDeg > 8) return "Orion / Gemini";
  if (raDeg >= 100 && raDeg <= 120 && decDeg > 25) return "Gemini";
  if (raDeg >= 145 && raDeg <= 165) return "Leo";
  if (decDeg >= 70) return "Ursa Minor";
  return "the sky";
}

function bodyGlyph(b: Body): string {
  switch (b) {
    case Body.Mercury:
      return "☿";
    case Body.Venus:
      return "♀";
    case Body.Mars:
      return "♂";
    case Body.Jupiter:
      return "♃";
    case Body.Saturn:
      return "♄";
    default:
      return "•";
  }
}

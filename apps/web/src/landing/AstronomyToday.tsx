import { useEffect, useState } from "react";

/**
 * Small bottom-left card on the landing page that surfaces a notable
 * astronomy event that happened on today's calendar date — something
 * to anchor the visitor in real history before they enter the viewer.
 *
 * When the date has multiple matching events, we rotate through them
 * every ~7 seconds. When the date has none, we fall back to the
 * nearest prior event in the past week so the card never goes blank.
 */

type Event = {
  /** Calendar date as `MM-DD`. */
  date: string;
  year: number;
  title: string;
  emoji: string;
};

// Curated highlights. Lean toward dates with a clear single-line story
// — discovery announcements, mission milestones, supernova first-light,
// eclipse anchors. Not exhaustive; expand as needed.
const EVENTS: readonly Event[] = [
  { date: "01-04", year: 1643, title: "Isaac Newton born", emoji: "🍎" },
  { date: "01-07", year: 1610, title: "Galileo discovers Jupiter's moons", emoji: "🪐" },
  { date: "01-31", year: 1958, title: "Explorer 1 — first US satellite", emoji: "🛰️" },
  { date: "02-15", year: 1564, title: "Galileo Galilei born", emoji: "🔭" },
  { date: "02-18", year: 1930, title: "Pluto discovered by Tombaugh", emoji: "🌑" },
  { date: "02-23", year: 1987, title: "Supernova 1987A first light", emoji: "💥" },
  { date: "03-13", year: 1781, title: "Uranus discovered by Herschel", emoji: "🪐" },
  { date: "03-14", year: 1879, title: "Albert Einstein born", emoji: "⚛️" },
  { date: "04-12", year: 1961, title: "Yuri Gagarin — first human in space", emoji: "🚀" },
  { date: "04-24", year: 1990, title: "Hubble Space Telescope launched", emoji: "🔭" },
  { date: "05-25", year: 1961, title: "JFK pledges Apollo Moon landing", emoji: "🌕" },
  { date: "07-04", year: 1054, title: "Crab Supernova recorded by Chinese astronomers", emoji: "💥" },
  { date: "07-04", year: 2005, title: "Deep Impact strikes comet Tempel 1", emoji: "☄️" },
  { date: "07-14", year: 2015, title: "New Horizons flies past Pluto", emoji: "🛰️" },
  { date: "07-16", year: 1994, title: "Shoemaker-Levy 9 strikes Jupiter", emoji: "💥" },
  { date: "07-20", year: 1969, title: "Apollo 11 lunar landing", emoji: "🌕" },
  { date: "08-12", year: 2018, title: "Parker Solar Probe launches", emoji: "☀️" },
  { date: "08-21", year: 2017, title: "Great American Eclipse", emoji: "🌑" },
  { date: "08-25", year: 2012, title: "Voyager 1 enters interstellar space", emoji: "🚀" },
  { date: "08-27", year: 2003, title: "Mars closest approach in 60,000 years", emoji: "🔴" },
  { date: "09-05", year: 1977, title: "Voyager 1 launched", emoji: "🚀" },
  { date: "09-23", year: 1846, title: "Neptune discovered", emoji: "🔵" },
  { date: "10-04", year: 1957, title: "Sputnik 1 — first artificial satellite", emoji: "🛰️" },
  { date: "10-09", year: 1604, title: "Kepler's Supernova first observed", emoji: "💥" },
  { date: "10-15", year: 1997, title: "Cassini-Huygens launched to Saturn", emoji: "🪐" },
  { date: "11-09", year: 1934, title: "Carl Sagan born", emoji: "✨" },
  { date: "11-11", year: 1572, title: "Tycho's Supernova first observed", emoji: "💥" },
  { date: "11-13", year: 1971, title: "Mariner 9 — first Mars orbiter", emoji: "🔴" },
  { date: "11-20", year: 1998, title: "ISS first module Zarya launched", emoji: "🛰️" },
  { date: "12-07", year: 1972, title: "Apollo 17 — last crewed lunar landing", emoji: "🌕" },
  { date: "12-21", year: 1968, title: "Apollo 8 launches toward Moon", emoji: "🌕" },
  { date: "12-25", year: 2021, title: "James Webb Space Telescope launched", emoji: "🔭" },
];

function pickToday(now: Date): Event[] {
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const key = `${mm}-${dd}`;
  const exact = EVENTS.filter((e) => e.date === key);
  if (exact.length > 0) return exact;
  // Fallback: walk backward up to 7 days for any prior match.
  for (let i = 1; i <= 7; i++) {
    const prev = new Date(now);
    prev.setUTCDate(prev.getUTCDate() - i);
    const pmm = String(prev.getUTCMonth() + 1).padStart(2, "0");
    const pdd = String(prev.getUTCDate()).padStart(2, "0");
    const found = EVENTS.filter((e) => e.date === `${pmm}-${pdd}`);
    if (found.length > 0) return found;
  }
  return [];
}

export function AstronomyToday() {
  const [events] = useState<Event[]>(() => pickToday(new Date()));
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const handle = window.setInterval(() => {
      setIdx((i) => (i + 1) % events.length);
    }, 7000);
    return () => window.clearInterval(handle);
  }, [events.length]);

  if (events.length === 0) return null;
  const e = events[idx]!;
  const yearsAgo = new Date().getUTCFullYear() - e.year;

  return (
    <aside
      className="fixed bottom-3 left-3 z-30 max-w-xs rounded-lg border border-white/10 bg-space-900/85 px-3 py-2 shadow-lg backdrop-blur-md"
      aria-label="Today in astronomy history"
    >
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
        Today in astronomy
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span aria-hidden className="text-lg">
          {e.emoji}
        </span>
        <div>
          <div className="text-sm font-medium text-white/90">{e.title}</div>
          <div className="text-[10px] text-white/40">
            {e.year} · {yearsAgo} year{yearsAgo === 1 ? "" : "s"} ago
          </div>
        </div>
      </div>
    </aside>
  );
}

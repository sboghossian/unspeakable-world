import { useMemo, useState } from "react";
import {
  eventsForMonthDay,
  type SpaceHistoryEntry,
} from "../history/history-data";

/**
 * 📅 Today in Space History — a top-bar popover that surfaces every
 * notable space-exploration event recorded for today's calendar date
 * across all years. Users can also page forward / backward to any
 * other month-day with the calendar navigator at the bottom.
 *
 * Visually a sibling of MissionsCatalogPanel / AchievementsPanel.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(month: number): number {
  // Always allow Feb 29 so the catalog can record leap-day events.
  const days: readonly number[] = [
    31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  return days[month - 1] ?? 31;
}

const CATEGORY_LABEL: Record<SpaceHistoryEntry["category"], string> = {
  launch: "Launch",
  discovery: "Discovery",
  first: "First",
  "mission-arrival": "Arrival",
  loss: "Loss",
  milestone: "Milestone",
  observation: "Observation",
};

const CATEGORY_TINT: Record<SpaceHistoryEntry["category"], string> = {
  launch: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  discovery: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200",
  first: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
  "mission-arrival": "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  loss: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  milestone: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  observation: "border-violet-400/40 bg-violet-400/10 text-violet-200",
};

export function HistoryPanel() {
  const [open, setOpen] = useState(false);
  // The cursor stores month-day; year is intentionally absent because
  // events are filed by calendar day across every year.
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<{ month: number; day: number }>({
    month: today.getMonth() + 1,
    day: today.getDate(),
  });

  const events = useMemo(
    () => eventsForMonthDay(cursor.month, cursor.day),
    [cursor],
  );

  const isToday =
    cursor.month === today.getMonth() + 1 && cursor.day === today.getDate();

  const headerLabel = `${MONTH_NAMES[cursor.month - 1]} ${cursor.day}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Today in Space History"
        aria-label="Today in Space History"
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
          open
            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>📅</span>
        <span>today</span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 flex max-h-[80vh] w-[min(540px,94vw)] flex-col rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          {/* Header */}
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-sm text-white/90">
                Today in Space History
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/45">
                {headerLabel}
                {isToday && (
                  <span className="ml-2 text-emerald-300/80">· today</span>
                )}
              </div>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              {events.length} event{events.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* Quick prev / next / today controls */}
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCursor((c) => shiftDay(c, -1))}
              className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10.5px] text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Previous day"
            >
              ← prev
            </button>
            <button
              type="button"
              onClick={() => setCursor((c) => shiftDay(c, 1))}
              className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10.5px] text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Next day"
            >
              next →
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() =>
                  setCursor({
                    month: today.getMonth() + 1,
                    day: today.getDate(),
                  })
                }
                className="rounded border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10.5px] text-cyan-200 hover:bg-cyan-400/20"
              >
                today
              </button>
            )}
          </div>

          {/* List */}
          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {events.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/15 px-3 py-6 text-center font-mono text-[11px] text-white/45">
                <div>nothing recorded for this date</div>
                <div className="mt-1 text-white/30">try another →</div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-md border border-white/10 bg-white/[0.03] p-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-display text-[18px] leading-none text-white/95">
                        {e.year}
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-0 font-mono text-[9px] uppercase tracking-widest ${CATEGORY_TINT[e.category]}`}
                      >
                        {CATEGORY_LABEL[e.category]}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] leading-snug text-white/75">
                      {e.event}
                    </p>
                    {e.link && (
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-block font-mono text-[10.5px] text-cyan-300/80 hover:text-cyan-200 hover:underline"
                      >
                        source →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Calendar selector */}
          <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              jump
            </span>
            <select
              value={cursor.month}
              onChange={(e) => {
                const nextMonth = Number.parseInt(e.target.value, 10);
                setCursor((c) => ({
                  month: nextMonth,
                  day: Math.min(c.day, daysInMonth(nextMonth)),
                }));
              }}
              className="rounded border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[10.5px] text-white/80 outline-none"
              aria-label="Month"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={cursor.day}
              onChange={(e) =>
                setCursor((c) => ({
                  ...c,
                  day: Number.parseInt(e.target.value, 10),
                }))
              }
              className="rounded border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[10.5px] text-white/80 outline-none"
              aria-label="Day"
            >
              {Array.from(
                { length: daysInMonth(cursor.month) },
                (_, i) => i + 1,
              ).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}

function shiftDay(
  cursor: { month: number; day: number },
  delta: number,
): { month: number; day: number } {
  let { month, day } = cursor;
  day += delta;
  while (day < 1) {
    month -= 1;
    if (month < 1) month = 12;
    day += daysInMonth(month);
  }
  while (day > daysInMonth(month)) {
    day -= daysInMonth(month);
    month += 1;
    if (month > 12) month = 1;
  }
  return { month, day };
}

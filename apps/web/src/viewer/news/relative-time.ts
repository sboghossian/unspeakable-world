/**
 * Compact "time since" / "time until" formatter for the news panel.
 *
 *   - Past:    "just now", "3m ago", "2h ago", "yesterday", "3d ago",
 *              "May 7"
 *   - Future:  "T-2h 15m", "T-3d", "T-45m", "T-30s"
 *
 * Anything we can't parse just rolls over to an em-dash. No locale
 * dependency, no Intl.RelativeTimeFormat — we want a NASA-mission-clock
 * vibe, not "in 3 hours".
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isYesterday(then: Date, now: Date): boolean {
  const t = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneDay = 86_400_000;
  return n.getTime() - t.getTime() === oneDay;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso);
  const ms = t.getTime();
  if (!Number.isFinite(ms)) return "—";
  const delta = ms - now.getTime();
  const abs = Math.abs(delta);
  const sec = Math.floor(abs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (delta > 0) {
    if (sec < 60) return `T-${sec}s`;
    if (min < 60) return `T-${min}m`;
    if (hr < 24) {
      const remMin = min - hr * 60;
      return remMin > 0 ? `T-${hr}h ${pad(remMin)}m` : `T-${hr}h`;
    }
    return `T-${day}d`;
  }

  // Past
  if (sec < 45) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (isYesterday(t, now)) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return `${MONTHS[t.getMonth()]} ${t.getDate()}`;
}

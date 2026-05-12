import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchUpcomingLaunches,
  type Launch,
} from "../news/launch-feed";
import { fetchSpaceNews, type NewsItem } from "../news/space-news";
import { relativeTime } from "../news/relative-time";

/**
 * 📰 Space News panel — mission-clock countdown to the next rocket
 * launch plus a rolling feed of the day's space-flight reporting.
 *
 *   - Launches tab — Launch Library 2 upcoming list, soonest first.
 *     Soonest gets a giant T-minus header; anything within 24 h is
 *     highlighted in cyan.
 *   - News tab — Spaceflight News API v4 articles; thumbnail + 120-char
 *     summary; click anywhere in the row to open in a new tab.
 *
 * While the panel is open we refetch every 5 minutes. The feed modules
 * keep a 30-minute localStorage cache so the refetch is usually a
 * no-op, but it means a long-running session won't go stale.
 *
 * Both feeds are silent on error — if either comes back empty *and* the
 * tab is currently selected, we show a quiet "couldn't reach the feed"
 * line and move on.
 */

const REFRESH_MS = 5 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Tab = "launches" | "news";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function bigCountdown(iso: string, now: Date): string {
  const ms = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "LIFTOFF";
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `T- ${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `T- ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function statusTone(abbrev: string): string {
  // Launch Library status abbreviations: Go, TBC, TBD, Hold, Success, Failure
  switch (abbrev.toUpperCase()) {
    case "GO":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
    case "TBC":
      return "border-amber-300/40 bg-amber-300/10 text-amber-200";
    case "TBD":
      return "border-white/15 bg-white/5 text-white/60";
    case "HOLD":
      return "border-rose-400/40 bg-rose-400/10 text-rose-200";
    default:
      return "border-white/15 bg-white/5 text-white/60";
  }
}

export function NewsPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("launches");
  const [launches, setLaunches] = useState<Launch[] | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const tickRef = useRef<number | null>(null);

  // Fetch both feeds on open + every REFRESH_MS while open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      void Promise.all([fetchUpcomingLaunches(10), fetchSpaceNews(10)])
        .then(([ls, ns]) => {
          if (cancelled) return;
          setLaunches(ls);
          setNews(ns);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open]);

  // Tick a clock for countdowns once a second while the launches tab is showing.
  useEffect(() => {
    if (!open || tab !== "launches") return;
    setNow(new Date());
    tickRef.current = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [open, tab]);

  const sortedLaunches = useMemo(() => {
    if (!launches) return null;
    return [...launches].sort(
      (a, b) => new Date(a.net).getTime() - new Date(b.net).getTime(),
    );
  }, [launches]);

  const next = sortedLaunches?.[0] ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Space news & upcoming launches"
        aria-label="Space news"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>📰</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          news
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(420px,94vw)] max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-base" aria-hidden>
                📰
              </span>
              <div className="font-display text-sm text-white/90">
                Space news
              </div>
              {loading && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                  · syncing
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex border-b border-white/5">
            <TabButton
              active={tab === "launches"}
              onClick={() => setTab("launches")}
              label="Launches"
              count={sortedLaunches?.length}
            />
            <TabButton
              active={tab === "news"}
              onClick={() => setTab("news")}
              label="News"
              count={news?.length}
            />
          </div>

          <div className="max-h-[calc(80vh-6.5rem)] overflow-y-auto">
            {tab === "launches" ? (
              <LaunchesTabContent
                launches={sortedLaunches}
                next={next}
                now={now}
                loading={loading}
              />
            ) : (
              <NewsTabContent news={news} now={now} loading={loading} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition ${
        active
          ? "border-b-2 border-cyan-300/70 text-white"
          : "border-b-2 border-transparent text-white/45 hover:text-white/80"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span className="ml-1.5 text-white/30">{count}</span>
      )}
    </button>
  );
}

function LaunchesTabContent({
  launches,
  next,
  now,
  loading,
}: {
  launches: Launch[] | null;
  next: Launch | null;
  now: Date;
  loading: boolean;
}) {
  if (launches === null && loading) {
    return (
      <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
        loading launch manifest…
      </div>
    );
  }
  if (launches === null || launches.length === 0) {
    return (
      <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
        couldn't reach the feed, try again later
      </div>
    );
  }

  return (
    <div>
      {next && (
        <div className="border-b border-white/5 bg-gradient-to-b from-cyan-400/5 to-transparent px-3 py-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-cyan-200/70">
            next liftoff
          </div>
          <div className="mt-1 font-display text-[15px] leading-tight text-white/95">
            {next.name}
          </div>
          <div className="mt-1 font-mono text-[10px] text-white/45">
            {next.provider} · {next.pad}
          </div>
          <div className="mt-2 font-mono text-2xl tabular-nums tracking-wider text-cyan-200">
            {bigCountdown(next.net, now)}
          </div>
        </div>
      )}

      <ul className="divide-y divide-white/5">
        {launches.map((l) => {
          const tMinus = new Date(l.net).getTime() - now.getTime();
          const within24h = tMinus > 0 && tMinus <= ONE_DAY_MS;
          return (
            <li
              key={l.id}
              className={`px-3 py-2.5 ${within24h ? "bg-cyan-400/5" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div
                  className={`min-w-0 truncate font-display text-[12.5px] ${
                    within24h ? "text-cyan-100" : "text-white/85"
                  }`}
                >
                  {l.name}
                </div>
                <span
                  className={`shrink-0 rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-widest ${statusTone(
                    l.status.abbrev,
                  )}`}
                >
                  {l.status.abbrev}
                </span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-white/40">
                {l.mission ? `${l.mission} · ` : ""}
                {l.provider} · {l.pad}
              </div>
              <div className="mt-1 flex items-baseline justify-between font-mono text-[10px] text-white/60">
                <span
                  className={`tabular-nums ${
                    within24h ? "text-cyan-200" : "text-white/65"
                  }`}
                >
                  {relativeTime(l.net, now)}
                </span>
                <span className="text-white/30">
                  {new Date(l.net).toUTCString().slice(5, 22)} UTC
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewsTabContent({
  news,
  now,
  loading,
}: {
  news: NewsItem[] | null;
  now: Date;
  loading: boolean;
}) {
  if (news === null && loading) {
    return (
      <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
        loading headlines…
      </div>
    );
  }
  if (news === null || news.length === 0) {
    return (
      <div className="px-3 py-6 text-center font-mono text-[11px] text-white/40">
        couldn't reach the feed, try again later
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {news.map((n) => (
        <li key={n.id}>
          <a
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className="flex gap-2.5 px-3 py-2.5 transition hover:bg-white/[0.04]"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-white/5">
              {n.imageUrl ? (
                <img
                  src={n.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="flex h-full w-full items-center justify-center text-lg"
                >
                  🛰
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[12.5px] leading-snug text-white/90 line-clamp-2">
                {n.title}
              </div>
              {n.summary && (
                <div className="mt-0.5 font-mono text-[10px] leading-snug text-white/45">
                  {truncate(n.summary, 120)}
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between font-mono text-[9.5px] uppercase tracking-widest text-white/35">
                <span className="truncate">{n.newsSite}</span>
                <span className="shrink-0 tabular-nums">
                  {relativeTime(n.publishedAt, now)}
                </span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

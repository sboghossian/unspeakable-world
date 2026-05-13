import { useMemo } from "react";
import { upcomingEvents, type SkyEvent } from "../events/sky-events";
import { t, useLanguage } from "../../lib/i18n";
import { EmptyState } from "./EmptyState";

/**
 * 🗓 Upcoming sky events button + dropdown.
 *
 * Pure ephemeris. Re-runs on every open so values are fresh against the
 * user's wall clock. Lists the next ~90 days of moon quarters, eclipses,
 * planet oppositions / max elongations, equinoxes / solstices, and the
 * major meteor-shower peaks. Each row is clickable: solar-system events
 * fly to the relevant body, meteor showers fly to the radiant.
 */

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlyToBody?: (name: string) => void;
  onFlyToRadiant?: (raDeg: number, decDeg: number) => void;
};

export function EventsPanel({
  open,
  onOpenChange,
  onFlyToBody,
  onFlyToRadiant,
}: Props) {
  useLanguage();
  const events = useMemo<SkyEvent[]>(() => {
    if (!open) return [];
    return upcomingEvents(new Date(), 90);
    // Recompute every time the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const next = useMemo(() => upcomingEvents(new Date(), 90)[0] ?? null, []);

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title={`${t("panel.events", "Upcoming sky events")} (e)`}
        aria-label={t("panel.events", "Upcoming sky events")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="events-listbox"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          open
            ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-amber-200"
        }`}
      >
        <span aria-hidden>🗓</span>
        <span className="hidden md:inline">{t("panel.events", "events").toLowerCase()}</span>
        {next && !open && (
          <span className="hidden lg:inline text-[10px] text-white/65">
            · {next.glyph} {fmtRelative(next.time)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(380px,94vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 shadow-2xl backdrop-blur">
          <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/65">
            upcoming · next 90 days
          </div>
          {events.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon="🗓"
                title="The sky's calm for now"
                body="No headline events in the next 90 days from your wall clock. Moon phases, oppositions, eclipses and meteor showers will show up here as they approach."
                tone="amber"
                density="compact"
              />
            </div>
          ) : (
            <ul
              id="events-listbox"
              role="listbox"
              aria-label="Upcoming sky events"
              className="max-h-[60vh] overflow-y-auto"
            >
              {events.map((e, i) => {
                const clickable = !!e.target && (onFlyToBody || onFlyToRadiant);
                const handleClick = clickable
                  ? () => {
                      if (!e.target) return;
                      if (e.target.kind === "body") {
                        onFlyToBody?.(e.target.name);
                      } else {
                        onFlyToRadiant?.(e.target.raDeg, e.target.decDeg);
                      }
                      onOpenChange(false);
                    }
                  : undefined;
                return (
                  <li
                    key={`${e.kind}-${e.time.getTime()}-${i}`}
                    onClick={handleClick}
                    role="option"
                    aria-selected="false"
                    aria-label={`${e.title} ${fmtAbsolute(e.time)}${e.detail ? ` ${e.detail}` : ""}`}
                    tabIndex={clickable ? 0 : -1}
                    onKeyDown={
                      clickable && handleClick
                        ? (kev) => {
                            if (kev.key === "Enter" || kev.key === " ") {
                              kev.preventDefault();
                              handleClick();
                            }
                          }
                        : undefined
                    }
                    className={`flex items-start gap-2.5 border-b border-white/5 px-3 py-2 last:border-b-0 ${
                      clickable
                        ? "cursor-pointer hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-block w-5 text-center text-base"
                    >
                      {e.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-sm text-white">
                          {e.title}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-white/55">
                          {fmtRelative(e.time)}
                        </span>
                      </div>
                      {e.detail && (
                        <div className="font-mono text-[10px] text-white/65">
                          {e.detail}
                        </div>
                      )}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[10px] text-white/65">
                          {fmtAbsolute(e.time)}
                        </span>
                        {clickable && (
                          <span className="font-mono text-[10px] text-plasma-300/80">
                            fly →
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-white/5 px-3 py-1.5 font-mono text-[10px] text-white/65">
            via AstronomyEngine + IMO meteor table · pure compute
          </div>
        </div>
      )}
    </div>
  );
}

function fmtRelative(d: Date): string {
  const ms = d.getTime() - Date.now();
  const mins = Math.round(ms / 60000);
  if (Math.abs(mins) < 60) return mins <= 0 ? "now" : `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 14) return `in ${days}d`;
  const weeks = Math.round(days / 7);
  return `in ${weeks}w`;
}

function fmtAbsolute(d: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return d.toLocaleString(undefined, opts);
}

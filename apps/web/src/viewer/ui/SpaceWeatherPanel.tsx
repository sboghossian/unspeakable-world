import { useEffect, useState } from "react";
import {
  fetchSpaceWeather,
  severityFromSnapshot,
  type SpaceWeatherSnapshot,
} from "../space-weather/swpc-feed";

/**
 * ☀ Space weather button + dropdown.
 *
 * Polls NOAA SWPC every 5 minutes whenever the panel is mounted (we keep
 * a quiet background poll even when closed so the badge can flip to red
 * during a storm without the user opening the panel first). Renders the
 * latest planetary K-index, current NOAA G/R/S scales, and the most
 * recent ALERT/WATCH/WARNING messages from SWPC's products feed.
 */

const POLL_MS = 5 * 60 * 1000;

type Props = {
  observer: { lat: number; lon: number } | null;
};

export function SpaceWeatherPanel({ observer }: Props) {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<SpaceWeatherSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      void fetchSpaceWeather()
        .then((s) => {
          if (!cancelled) {
            setSnap(s);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const severity = snap ? severityFromSnapshot(snap) : null;

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Space weather (NOAA SWPC)"
        className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${badgeClass(open, severity)}`}
      >
        <span className="md:hidden">☀</span>
        <span className="hidden md:inline">
          ☀ {snap ? `Kp ${snap.kp.toFixed(0)}` : "…"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(380px,92vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
            space weather · live from NOAA SWPC
          </div>

          {error && !snap && (
            <div className="px-3 py-3 text-xs text-amber-300/80">
              SWPC: {error}
            </div>
          )}
          {!snap && !error && (
            <div className="px-3 py-4 font-mono text-xs text-white/50">
              querying SWPC…
            </div>
          )}

          {snap && (
            <>
              <div className="grid grid-cols-4 gap-2 px-3 py-3">
                <KpTile kp={snap.kp} />
                <ScaleTile name="R" scale={snap.current.R.scale} />
                <ScaleTile name="S" scale={snap.current.S.scale} />
                <ScaleTile name="G" scale={snap.current.G.scale} />
              </div>
              {(snap.sunspots || snap.solarWindKms !== null) && (
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 px-3 py-3">
                  {snap.sunspots && (
                    <SolarTile
                      label="Sunspots"
                      value={snap.sunspots.ssn.toFixed(0)}
                      unit={`SSN · F10.7 ${snap.sunspots.f107.toFixed(0)}`}
                    />
                  )}
                  {snap.solarWindKms !== null && (
                    <SolarTile
                      label="Solar wind"
                      value={`${snap.solarWindKms.toFixed(0)}`}
                      unit="km/s · ACE / DSCOVR"
                    />
                  )}
                </div>
              )}
              <AuroraOutlook kp={snap.kp} observer={observer} />
              <div className="border-t border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
                recent alerts · {snap.alerts.length}
              </div>
              {snap.alerts.length === 0 ? (
                <div className="px-3 py-3 text-xs text-white/40">
                  No recent alerts. Quiet sun, quiet sky.
                </div>
              ) : (
                <ul className="max-h-[55vh] overflow-y-auto">
                  {snap.alerts.map((a, i) => (
                    <li
                      key={`${a.productId}-${i}`}
                      className="border-b border-white/5 px-3 py-2 last:border-b-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-display text-sm text-white">
                          {a.title}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-white/40">
                          {a.productId}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-white/45">
                        {fmtRelative(a.issued)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-white/5 px-3 py-1.5 text-[10px] text-white/30">
                NOAA SWPC · Kp@{fmtClock(snap.kpTime)}Z · auto-refresh 5m
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function badgeClass(open: boolean, sev: "quiet" | "active" | "storm" | null) {
  if (open) {
    if (sev === "storm")
      return "border-rose-400/60 bg-rose-400/15 text-rose-300";
    if (sev === "active")
      return "border-amber-400/50 bg-amber-400/15 text-amber-300";
    return "border-sky-400/50 bg-sky-400/15 text-sky-300";
  }
  if (sev === "storm")
    return "border-rose-400/40 bg-rose-400/10 text-rose-300/90 hover:bg-rose-400/20";
  if (sev === "active")
    return "border-amber-400/30 bg-amber-400/10 text-amber-300/80 hover:bg-amber-400/20";
  return "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-sky-300";
}

function KpTile({ kp }: { kp: number }) {
  const tone =
    kp >= 6 ? "text-rose-300" : kp >= 4 ? "text-amber-300" : "text-sky-300";
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center">
      <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
        Kp
      </div>
      <div className={`font-mono text-lg leading-none ${tone}`}>
        {kp.toFixed(0)}
      </div>
    </div>
  );
}

function SolarTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
        {label}
      </div>
      <div className="font-mono text-sm leading-none text-amber-200">
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-white/40">{unit}</div>
    </div>
  );
}

function ScaleTile({ name, scale }: { name: string; scale: string | null }) {
  const n = parseInt(scale ?? "0", 10) || 0;
  const tone =
    n >= 3 ? "text-rose-300" : n >= 1 ? "text-amber-300" : "text-white/55";
  const label = name === "R" ? "Radio" : name === "S" ? "Solar" : "Geomag";
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center">
      <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
        {label}
      </div>
      <div className={`font-mono text-lg leading-none ${tone}`}>
        {name}
        {n}
      </div>
    </div>
  );
}

/**
 * Aurora viewing outlook for the user's latitude given the current Kp.
 *
 * Uses NOAA's planetary-K-to-equatorward-aurora-boundary table (geomagnetic
 * latitude). We approximate magnetic latitude with geographic latitude —
 * good to ~5° for most populated areas — and report whether the user's
 * sky is poleward of the auroral oval at the moment.
 */
function AuroraOutlook({
  kp,
  observer,
}: {
  kp: number;
  observer: { lat: number; lon: number } | null;
}) {
  if (!observer) {
    return (
      <div className="border-t border-white/5 px-3 py-2 font-mono text-[10px] text-white/35">
        aurora · share your location to get a viewing outlook for tonight
      </div>
    );
  }
  // NOAA Kp → equatorward auroral boundary (geomagnetic latitude).
  const KP_TO_LAT: Record<number, number> = {
    0: 67,
    1: 65,
    2: 63,
    3: 60,
    4: 58,
    5: 55,
    6: 52,
    7: 49,
    8: 45,
    9: 40,
  };
  const k = Math.max(0, Math.min(9, Math.round(kp)));
  const boundary = KP_TO_LAT[k]!;
  const lat = Math.abs(observer.lat);
  const visible = lat >= boundary;
  const margin = lat - boundary;

  let verdict: { label: string; tone: string };
  if (visible && margin >= 5) {
    verdict = { label: "likely overhead — head outside", tone: "text-emerald-300" };
  } else if (visible) {
    verdict = { label: "low on the poleward horizon", tone: "text-emerald-200" };
  } else if (margin >= -3) {
    verdict = { label: "just below your horizon", tone: "text-amber-300" };
  } else {
    verdict = { label: "not visible from your latitude", tone: "text-white/45" };
  }

  return (
    <div className="border-t border-white/5 px-3 py-2.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
        aurora outlook
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`${verdict.tone}`}>{verdict.label}</span>
        <span className="shrink-0 font-mono text-[10px] text-white/40">
          you {lat.toFixed(0)}° · oval ≥ {boundary}°
        </span>
      </div>
    </div>
  );
}

function fmtRelative(d: Date): string {
  const dt = (Date.now() - d.getTime()) / 1000;
  if (dt < 60) return `${Math.round(dt)}s ago`;
  if (dt < 3600) return `${Math.round(dt / 60)}m ago`;
  if (dt < 86400) return `${(dt / 3600).toFixed(1)}h ago`;
  return `${(dt / 86400).toFixed(1)}d ago`;
}

function fmtClock(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

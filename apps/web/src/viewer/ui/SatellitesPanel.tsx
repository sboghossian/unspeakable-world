import { useEffect, useMemo, useRef, useState } from "react";
import {
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
} from "satellite.js";
import { unlock } from "../../lib/achievements";
import { t, useLanguage } from "../../lib/i18n";

/**
 * 🛰 Satellites panel — searchable catalog of every TLE we ship plus a
 * live-position card for the selected one. Modeled on AstroGrid's
 * satellite drawer:
 *
 *   - Search by name
 *   - Group header chips (Stations / Comm / GPS / GEO / Science / …)
 *   - Click a row → live readout: altitude · speed · lat · lon ·
 *     orbital period · inclination · NORAD ID · launch year
 *
 * Reads the same `/data/satellites.json` the scene loads; doesn't
 * couple to the Three.js SatelliteField at all so the panel can render
 * even before the 3D layer has spun up.
 */

type Entry = {
  name: string;
  l1: string;
  l2: string;
  group: string;
};

type LivePos = {
  altKm: number;
  speedKmS: number;
  latDeg: number;
  lonDeg: number;
};

const EARTH_R_KM = 6371;

function tickDate(): Date {
  return new Date();
}

function liveFor(entry: Entry, now: Date): LivePos | null {
  try {
    const satrec = twoline2satrec(entry.l1, entry.l2);
    const out = propagate(satrec, now);
    if (!out || typeof out === "boolean") return null;
    const p = out.position;
    const v = out.velocity;
    if (!p || typeof p === "boolean" || !v || typeof v === "boolean") return null;
    const altKm = Math.hypot(p.x, p.y, p.z) - EARTH_R_KM;
    const speedKmS = Math.hypot(v.x, v.y, v.z);
    const gmst = gstime(now);
    const geo = eciToGeodetic(p, gmst);
    const latDeg = (geo.latitude * 180) / Math.PI;
    const lonDeg = (geo.longitude * 180) / Math.PI;
    return { altKm, speedKmS, latDeg, lonDeg };
  } catch {
    return null;
  }
}

/** Orbital period in minutes from line 2's mean motion (revs/day). */
function orbitalPeriodMin(l2: string): number | null {
  const mm = Number(l2.slice(52, 63).trim());
  if (!Number.isFinite(mm) || mm <= 0) return null;
  return 1440 / mm;
}

/** Inclination in degrees from line 2 cols 9–16. */
function inclination(l2: string): number | null {
  const inc = Number(l2.slice(8, 16).trim());
  return Number.isFinite(inc) ? inc : null;
}

/** NORAD catalog number from line 1 cols 3–7. */
function noradId(l1: string): string | null {
  const id = l1.slice(2, 7).trim();
  return id || null;
}

/** Launch year (4-digit) from line 1 international designator cols 10–11. */
function launchYear(l1: string): number | null {
  const yy = Number(l1.slice(9, 11));
  if (!Number.isFinite(yy)) return null;
  // TLEs use 2-digit years: 57-99 → 1900s, 00-56 → 2000s.
  return yy < 57 ? 2000 + yy : 1900 + yy;
}

const GROUP_LABEL: Record<string, string> = {
  stations: "Space stations",
  weather: "Weather",
  gps: "GPS",
  galileo: "Galileo",
  geo: "GEO",
  intelsat: "Intelsat",
  iridium: "Iridium NEXT",
  science: "Science",
  amateur: "Amateur radio",
  starlink: "Starlink",
};

export function SatellitesPanel() {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [now, setNow] = useState<Date>(tickDate());

  useEffect(() => {
    if (!open || entries) return;
    void fetch("/data/satellites.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) setEntries(data as Entry[]);
      })
      .catch(() => {
        /* ignore — panel just shows empty state */
      });
  }, [open, entries]);

  // Live-position ticker — refresh once a second while a selection exists.
  const liveRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selected) return;
    setNow(tickDate());
    liveRef.current = window.setInterval(() => setNow(tickDate()), 1000);
    return () => {
      if (liveRef.current !== null) {
        window.clearInterval(liveRef.current);
        liveRef.current = null;
      }
    };
  }, [selected]);

  const filtered = useMemo(() => {
    if (!entries) return [] as Entry[];
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 200);
    return entries
      .filter((e) => e.name.toLowerCase().includes(q))
      .slice(0, 200);
  }, [entries, query]);

  const live = useMemo(
    () => (selected ? liveFor(selected, now) : null),
    [selected, now],
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("panel.satellites", "Satellites — live SGP4 positions")}
        className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        🛰 sats
      </button>
    );
  }

  const period = selected ? orbitalPeriodMin(selected.l2) : null;
  const inc = selected ? inclination(selected.l2) : null;
  const norad = selected ? noradId(selected.l1) : null;
  const year = selected ? launchYear(selected.l1) : null;

  return (
    <div className="pointer-events-auto w-[min(420px,92vw)] max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/90 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-base" aria-hidden>
            🛰
          </span>
          <div className="font-display text-sm text-white/90">
            Satellites
          </div>
          {entries && (
            <span className="font-mono text-[10px] text-white/40">
              {entries.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSelected(null);
          }}
          aria-label="Close"
          className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {selected ? (
        <div className="px-3 py-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/45 hover:text-white"
          >
            ← all satellites
          </button>
          <div className="font-display text-base text-white/95">
            {selected.name}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-200/80">
            {GROUP_LABEL[selected.group] ?? selected.group}
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">
              Live position
            </div>
            {live ? (
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs text-white/85">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    Altitude
                  </div>
                  <div className="text-emerald-200">
                    {live.altKm.toFixed(1)} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    Speed
                  </div>
                  <div className="text-emerald-200">
                    {live.speedKmS.toFixed(2)} km/s
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    Latitude
                  </div>
                  <div>
                    {Math.abs(live.latDeg).toFixed(2)}°
                    {live.latDeg >= 0 ? " N" : " S"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    Longitude
                  </div>
                  <div>
                    {Math.abs(live.lonDeg).toFixed(2)}°
                    {live.lonDeg >= 0 ? " E" : " W"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-1 font-mono text-[11px] text-white/40">
                Could not propagate — TLE epoch out of range?
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-xs text-white/80">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                Orbital period
              </div>
              <div>{period ? `${period.toFixed(1)} min` : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                Inclination
              </div>
              <div>{inc !== null ? `${inc.toFixed(2)}°` : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                NORAD ID
              </div>
              <div>{norad ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                Launch year
              </div>
              <div>{year ?? "—"}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex max-h-[calc(80vh-3rem)] flex-col">
          <div className="px-3 py-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search satellite name…"
              className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white/90 placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 pb-2">
            {filtered.map((e) => (
              <button
                key={e.l1}
                type="button"
                onClick={() => {
                  setSelected(e);
                  if (e.name.includes("ISS")) unlock("iss-spotter");
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[11px] text-white/80 transition hover:bg-white/5 hover:text-white"
              >
                <span className="truncate">{e.name}</span>
                <span className="shrink-0 text-[9px] uppercase tracking-widest text-white/30">
                  {GROUP_LABEL[e.group] ?? e.group}
                </span>
              </button>
            ))}
            {!entries && (
              <div className="px-2 py-1.5 font-mono text-[10px] text-white/30">
                loading TLE catalog…
              </div>
            )}
            {entries && filtered.length === 0 && (
              <div className="px-2 py-1.5 font-mono text-[10px] text-white/30">
                no matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

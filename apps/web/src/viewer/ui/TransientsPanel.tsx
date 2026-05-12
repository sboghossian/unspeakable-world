import { useCallback, useEffect, useMemo, useState } from "react";
import { relativeTime } from "../news/relative-time";
import {
  CLASS_GROUPS,
  fetchRecentTransients,
  type ClassGroup,
  type Transient,
} from "../transients/alerce-feed";
import { fetchAtelRecent, type AtelItem } from "../transients/atel-feed";
import { fetchGcnCirculars, type GcnCircular } from "../transients/gcn-feed";
import {
  fetchGraceDbAlerts,
  type GwAlert,
} from "../transients/gracedb-feed";
import type { ExtraMarker } from "../transients/transient-field";
import type { UniverseScene } from "../universe/universe-scene";

/**
 * 💫 Live transients popover — four streams, one panel.
 *
 *   • ZTF / ALeRCE        — supernovae, AGN, variables, CVs
 *   • GW (LIGO/Virgo)     — GraceDB superevents
 *   • GCN circulars       — multi-messenger bulletins (GRBs, X-ray, neutrinos)
 *   • ATel                — Astronomer's Telegram bulletins (via rss2json)
 *
 * Each tab auto-refreshes on its own cadence while the panel is open
 * (30 / 5 / 10 / 15 min respectively) to match each feed's underlying
 * cache TTL.
 *
 * When mounted in Universe Mode (a `scene` prop is passed), the panel
 * also pushes the fetched datasets into the sky overlay's TransientField
 * so the 3D celestial sphere renders pulsing markers (ZTF + any
 * GW/GCN alerts that carry a sky localization).
 */

type Tab = "alerce" | "gw" | "gcn" | "atel";

type Props = {
  scene?: UniverseScene | null;
};

const BADGE_BY_GROUP: Record<ClassGroup | "unknown", string> = {
  supernova: "border-red-400/40 bg-red-400/15 text-red-200",
  agn: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200",
  variable: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  cv: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  unknown: "border-white/10 bg-white/5 text-white/55",
};

const DOT_BY_GROUP: Record<ClassGroup | "unknown", string> = {
  supernova: "bg-red-400",
  agn: "bg-fuchsia-400",
  variable: "bg-amber-400",
  cv: "bg-emerald-400",
  unknown: "bg-white/40",
};

function groupOf(className: string): ClassGroup | "unknown" {
  return CLASS_GROUPS[className] ?? "unknown";
}

function formatFar(far: number): string {
  if (!Number.isFinite(far) || far <= 0) return "—";
  // FAR is in Hz. Convert to "1 per X" units.
  const perSec = 1 / far;
  const perYr = perSec / (365.25 * 86_400);
  if (perYr >= 1000) return `1/${perYr.toExponential(1)} yr`;
  if (perYr >= 1) return `1/${perYr.toFixed(0)} yr`;
  const perDay = perSec / 86_400;
  if (perDay >= 1) return `1/${perDay.toFixed(1)} d`;
  return `1/${perSec.toFixed(0)} s`;
}

function flyTo(raDeg: number, decDeg: number): void {
  const params = new URLSearchParams();
  params.set("ra", raDeg.toFixed(4));
  params.set("dec", decDeg.toFixed(4));
  params.set("fov", "2");
  window.location.hash = `viewer?${params.toString()}`;
}

const TAB_LABELS: Record<Tab, string> = {
  alerce: "ZTF",
  gw: "GW",
  gcn: "GCN",
  atel: "ATel",
};

const TAB_SUBLABELS: Record<Tab, string> = {
  alerce: "ALeRCE",
  gw: "LIGO/Virgo",
  gcn: "circulars",
  atel: "telegrams",
};

const REFRESH_MS: Record<Tab, number> = {
  alerce: 30 * 60 * 1000,
  gw: 5 * 60 * 1000,
  gcn: 10 * 60 * 1000,
  atel: 15 * 60 * 1000,
};

export function TransientsPanel({ scene }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("alerce");

  const [alerce, setAlerce] = useState<Transient[] | null>(null);
  const [gw, setGw] = useState<GwAlert[] | null>(null);
  const [gcn, setGcn] = useState<GcnCircular[] | null>(null);
  const [atel, setAtel] = useState<AtelItem[] | null>(null);

  const [errors, setErrors] = useState<Record<Tab, string | null>>({
    alerce: null,
    gw: null,
    gcn: null,
    atel: null,
  });
  const [loading, setLoading] = useState<Record<Tab, boolean>>({
    alerce: false,
    gw: false,
    gcn: false,
    atel: false,
  });
  const [hasShownInScene, setHasShownInScene] = useState(false);

  const counts = useMemo(() => {
    const out: Record<ClassGroup | "unknown", number> = {
      supernova: 0,
      agn: 0,
      variable: 0,
      cv: 0,
      unknown: 0,
    };
    if (!alerce) return out;
    for (const t of alerce) out[groupOf(t.className)]++;
    return out;
  }, [alerce]);

  // Push GW/GCN markers into the sky overlay whenever those datasets
  // change. Items without finite RA/Dec are dropped by setExtras().
  useEffect(() => {
    if (!scene) return;
    const extras: ExtraMarker[] = [];
    for (const a of gw ?? []) {
      if (Number.isFinite(a.raDeg) && Number.isFinite(a.decDeg)) {
        extras.push({
          oid: a.id,
          raDeg: a.raDeg,
          decDeg: a.decDeg,
          className: a.classification,
          group: "gw",
          href: a.link,
          lastDetection: a.t0,
        });
      }
    }
    for (const c of gcn ?? []) {
      if (
        typeof c.raDeg === "number" &&
        typeof c.decDeg === "number" &&
        Number.isFinite(c.raDeg) &&
        Number.isFinite(c.decDeg)
      ) {
        extras.push({
          oid: `gcn-${c.id}`,
          raDeg: c.raDeg,
          decDeg: c.decDeg,
          className: c.eventName ?? "GCN",
          group: "gcn",
          href: c.link,
          lastDetection: c.createdOn,
        });
      }
    }
    scene.setTransientExtras(extras);
  }, [scene, gw, gcn]);

  const loadTab = useCallback(
    (which: Tab, force: boolean): Promise<void> => {
      setLoading((s) => ({ ...s, [which]: true }));
      setErrors((s) => ({ ...s, [which]: null }));
      const finish = () => {
        setLoading((s) => ({ ...s, [which]: false }));
      };
      if (which === "alerce") {
        return fetchRecentTransients({ force })
          .then((rows) => {
            setAlerce(rows);
            if (rows.length === 0) {
              setErrors((s) => ({
                ...s,
                alerce: "No recent classified alerts.",
              }));
            }
            if (scene) {
              scene.setTransientsData(rows);
              if (!hasShownInScene) {
                scene.setTransients(true);
                setHasShownInScene(true);
              }
            }
          })
          .catch((err: unknown) => {
            setErrors((s) => ({
              ...s,
              alerce: err instanceof Error ? err.message : String(err),
            }));
          })
          .finally(finish);
      }
      if (which === "gw") {
        return fetchGraceDbAlerts(50)
          .then((rows) => {
            setGw(rows);
            if (rows.length === 0) {
              setErrors((s) => ({ ...s, gw: "No recent GW superevents." }));
            }
          })
          .catch((err: unknown) => {
            setErrors((s) => ({
              ...s,
              gw: err instanceof Error ? err.message : String(err),
            }));
          })
          .finally(finish);
      }
      if (which === "gcn") {
        return fetchGcnCirculars(30)
          .then((rows) => {
            setGcn(rows);
            if (rows.length === 0) {
              setErrors((s) => ({ ...s, gcn: "No GCN circulars available." }));
            }
          })
          .catch((err: unknown) => {
            setErrors((s) => ({
              ...s,
              gcn: err instanceof Error ? err.message : String(err),
            }));
          })
          .finally(finish);
      }
      return fetchAtelRecent(20)
        .then((rows) => {
          setAtel(rows);
          if (rows.length === 0) {
            setErrors((s) => ({
              ...s,
              atel: "ATel feed unavailable (silent fail).",
            }));
          }
        })
        .catch((err: unknown) => {
          setErrors((s) => ({
            ...s,
            atel: err instanceof Error ? err.message : String(err),
          }));
        })
        .finally(finish);
    },
    [scene, hasShownInScene],
  );

  // Auto-refresh the active tab on its own cadence while open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadTab(tab, false).then(() => {
      if (cancelled) return;
    });
    const timer = window.setInterval(() => {
      void loadTab(tab, false);
    }, REFRESH_MS[tab]);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, tab, loadTab]);

  const refresh = () => {
    void loadTab(tab, true);
  };

  const activeError = errors[tab];

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          open
            ? "border-rose-400/50 bg-rose-400/15 text-rose-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-rose-300"
        }`}
        title="Live transient alerts (ZTF · GW · GCN · ATel)"
        aria-label="Live transients"
      >
        <span className="md:hidden">💫</span>
        <span className="hidden md:inline">💫 live</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(440px,94vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="flex items-baseline justify-between gap-2 border-b border-white/5 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              live transients
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading[tab]}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {loading[tab] ? "refreshing…" : "refresh"}
            </button>
          </div>

          <div className="flex border-b border-white/5">
            {(["alerce", "gw", "gcn", "atel"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition ${
                  tab === t
                    ? "border-b-2 border-rose-400/70 bg-rose-400/10 text-rose-100"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div>{TAB_LABELS[t]}</div>
                <div className="text-[8px] text-white/35">
                  {TAB_SUBLABELS[t]}
                </div>
              </button>
            ))}
          </div>

          {scene && (tab === "alerce" || tab === "gw" || tab === "gcn") && (
            <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                show on sky
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !hasShownInScene;
                  scene.setTransients(next);
                  setHasShownInScene(next);
                }}
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition ${
                  hasShownInScene
                    ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
                    : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
                }`}
              >
                {hasShownInScene ? "on" : "off"}
              </button>
            </div>
          )}

          {tab === "alerce" && alerce && alerce.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 px-3 py-2">
              {(["supernova", "agn", "variable", "cv"] as const).map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70"
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_BY_GROUP[g]}`}
                    aria-hidden
                  />
                  {g} <span className="text-white/40">·</span> {counts[g]}
                </span>
              ))}
            </div>
          )}

          {tab === "alerce" && (
            <AlerceList
              data={alerce}
              error={activeError}
              onFly={(t) => flyTo(t.raDeg, t.decDeg)}
            />
          )}
          {tab === "gw" && (
            <GwList data={gw} error={activeError} onFly={flyTo} />
          )}
          {tab === "gcn" && (
            <GcnList data={gcn} error={activeError} onFly={flyTo} />
          )}
          {tab === "atel" && <AtelList data={atel} error={activeError} />}

          <div className="border-t border-white/5 px-3 py-1.5 text-[10px] text-white/35">
            {tab === "alerce" && (
              <>
                via{" "}
                <a
                  href="https://alerce.online/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-200"
                >
                  ALeRCE
                </a>{" "}
                · ZTF · refreshes every 30 min
              </>
            )}
            {tab === "gw" && (
              <>
                via{" "}
                <a
                  href="https://gracedb.ligo.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-200"
                >
                  GraceDB
                </a>{" "}
                · LIGO/Virgo/KAGRA · refreshes every 5 min
              </>
            )}
            {tab === "gcn" && (
              <>
                via{" "}
                <a
                  href="https://gcn.nasa.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-200"
                >
                  GCN
                </a>{" "}
                · NASA · refreshes every 10 min
              </>
            )}
            {tab === "atel" && (
              <>
                via{" "}
                <a
                  href="https://www.astronomerstelegram.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-200"
                >
                  ATel
                </a>{" "}
                · refreshes every 15 min
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── per-tab list components ─────────────────────────────────────────── */

function AlerceList(props: {
  data: Transient[] | null;
  error: string | null;
  onFly: (t: Transient) => void;
}) {
  const { data, error, onFly } = props;
  if (data === null && !error) {
    return (
      <div className="px-3 py-4 font-mono text-xs text-white/50">
        querying ALeRCE…
      </div>
    );
  }
  if (error && (!data || data.length === 0)) {
    return <div className="px-3 py-3 text-xs text-amber-300/80">{error}</div>;
  }
  if (!data || data.length === 0) return null;
  return (
    <ul className="max-h-[60vh] overflow-y-auto">
      {data.map((t) => {
        const g = groupOf(t.className);
        return (
          <li
            key={t.oid}
            className="flex items-baseline justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${BADGE_BY_GROUP[g]}`}
                >
                  {t.className}
                </span>
                <a
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-display text-sm text-white hover:text-rose-200"
                  title="Open ALeRCE detail page"
                >
                  {t.oid}
                </a>
              </div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-white/45">
                RA {t.raDeg.toFixed(3)}° · Dec {t.decDeg.toFixed(3)}° ·{" "}
                {relativeTime(t.lastDetection)} ·{" "}
                {(t.classProb * 100).toFixed(0)}% {t.classifier}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onFly(t)}
              className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-rose-400/20 hover:text-rose-200"
              title="Open this RA/Dec in the sky-atlas viewer"
            >
              fly to
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function GwList(props: {
  data: GwAlert[] | null;
  error: string | null;
  onFly: (ra: number, dec: number) => void;
}) {
  const { data, error, onFly } = props;
  if (data === null && !error) {
    return (
      <div className="px-3 py-4 font-mono text-xs text-white/50">
        querying GraceDB…
      </div>
    );
  }
  if (error && (!data || data.length === 0)) {
    return <div className="px-3 py-3 text-xs text-amber-300/80">{error}</div>;
  }
  if (!data || data.length === 0) return null;
  return (
    <ul className="max-h-[60vh] overflow-y-auto">
      {data.map((a) => {
        const hasCoord =
          Number.isFinite(a.raDeg) && Number.isFinite(a.decDeg);
        const isMock = a.id.startsWith("M");
        return (
          <li
            key={a.id}
            className="flex items-baseline justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                    isMock
                      ? "border-white/10 bg-white/5 text-white/55"
                      : "border-sky-400/40 bg-sky-400/15 text-sky-200"
                  }`}
                >
                  {a.classification}
                </span>
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-display text-sm text-white hover:text-sky-200"
                  title="Open GraceDB superevent"
                >
                  {a.id}
                </a>
                {isMock && (
                  <span className="font-mono text-[9px] text-white/35">
                    MDC
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-white/45">
                {relativeTime(a.t0)} · FAR {formatFar(a.far)}
                {a.labels.length > 0 && (
                  <>
                    {" "}
                    · {a.labels.slice(0, 2).join(" · ")}
                    {a.labels.length > 2 && ` +${a.labels.length - 2}`}
                  </>
                )}
              </div>
            </div>
            {hasCoord && (
              <button
                type="button"
                onClick={() => onFly(a.raDeg, a.decDeg)}
                className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-sky-400/20 hover:text-sky-200"
                title="Open most-likely direction in the sky-atlas viewer"
              >
                fly to
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function GcnList(props: {
  data: GcnCircular[] | null;
  error: string | null;
  onFly: (ra: number, dec: number) => void;
}) {
  const { data, error, onFly } = props;
  if (data === null && !error) {
    return (
      <div className="px-3 py-4 font-mono text-xs text-white/50">
        querying GCN…
      </div>
    );
  }
  if (error && (!data || data.length === 0)) {
    return <div className="px-3 py-3 text-xs text-amber-300/80">{error}</div>;
  }
  if (!data || data.length === 0) return null;
  return (
    <ul className="max-h-[60vh] overflow-y-auto">
      {data.map((c) => {
        const hasCoord =
          typeof c.raDeg === "number" &&
          typeof c.decDeg === "number" &&
          Number.isFinite(c.raDeg) &&
          Number.isFinite(c.decDeg);
        return (
          <li
            key={c.id}
            className="flex items-baseline justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                {c.eventName && (
                  <span className="shrink-0 rounded-sm border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-200">
                    {c.eventName}
                  </span>
                )}
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-display text-sm text-white hover:text-amber-200"
                  title="Open circular on GCN"
                >
                  #{c.id} · {c.subject}
                </a>
              </div>
              {c.bodyExcerpt && (
                <div className="mt-0.5 line-clamp-2 font-mono text-[10px] text-white/55">
                  {c.bodyExcerpt}
                </div>
              )}
              <div className="mt-0.5 truncate font-mono text-[9px] text-white/35">
                {relativeTime(c.createdOn)}
                {c.from && ` · ${c.from.replace(/\s*<.*?>$/, "")}`}
              </div>
            </div>
            {hasCoord && (
              <button
                type="button"
                onClick={() => onFly(c.raDeg as number, c.decDeg as number)}
                className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-amber-400/20 hover:text-amber-200"
                title="Open coords in the sky-atlas viewer"
              >
                fly to
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AtelList(props: { data: AtelItem[] | null; error: string | null }) {
  const { data, error } = props;
  if (data === null && !error) {
    return (
      <div className="px-3 py-4 font-mono text-xs text-white/50">
        querying ATel…
      </div>
    );
  }
  if (error && (!data || data.length === 0)) {
    return <div className="px-3 py-3 text-xs text-amber-300/80">{error}</div>;
  }
  if (!data || data.length === 0) return null;
  return (
    <ul className="max-h-[60vh] overflow-y-auto">
      {data.map((it) => (
        <li
          key={it.id}
          className="border-b border-white/5 px-3 py-2 last:border-b-0"
        >
          <a
            href={it.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-display text-sm text-white hover:text-rose-200"
          >
            #{it.id} · {it.title}
          </a>
          {it.bodyExcerpt && (
            <div className="mt-0.5 line-clamp-2 font-mono text-[10px] text-white/55">
              {it.bodyExcerpt}
            </div>
          )}
          <div className="mt-0.5 truncate font-mono text-[9px] text-white/35">
            {relativeTime(it.pubDate)}
          </div>
        </li>
      ))}
    </ul>
  );
}

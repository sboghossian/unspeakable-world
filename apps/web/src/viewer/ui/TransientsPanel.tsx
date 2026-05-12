import { useEffect, useMemo, useState } from "react";
import {
  CLASS_GROUPS,
  fetchRecentTransients,
  type ClassGroup,
  type Transient,
} from "../transients/alerce-feed";
import type { UniverseScene } from "../universe/universe-scene";

/**
 * 💫 Live transients button — ALeRCE ZTF alert feed.
 *
 * Top-bar trigger mirroring AchievementsPanel / NeoPanel. Opens a
 * popover listing the most recent classified transients, each with a
 * classifier badge, a per-class color stripe, and a "fly to" link that
 * pushes a `#viewer?ra=…&dec=…&fov=2` hash so the sky-atlas viewer
 * camera centers on the alert.
 *
 * When mounted with a `scene` prop (Universe Mode), the panel also
 * pushes the fetched dataset into the scene's TransientField so the
 * 3D celestial sphere renders pulsing markers. The SolarFlight viewer
 * mounts it without a `scene` (sky-mode doesn't apply there), and only
 * the popover is shown.
 */

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

function shortAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const dh = (Date.now() - t) / 3600_000;
  if (dh < 1) return `${Math.max(1, Math.round(dh * 60))} min ago`;
  if (dh < 48) return `${dh.toFixed(1)} h ago`;
  return `${(dh / 24).toFixed(1)} d ago`;
}

export function TransientsPanel({ scene }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Transient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasShownInScene, setHasShownInScene] = useState(false);

  const counts = useMemo(() => {
    const out: Record<ClassGroup | "unknown", number> = {
      supernova: 0,
      agn: 0,
      variable: 0,
      cv: 0,
      unknown: 0,
    };
    if (!data) return out;
    for (const t of data) out[groupOf(t.className)]++;
    return out;
  }, [data]);

  // Fetch + auto-refresh while open. 30-minute period to match cache TTL.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = (force: boolean) => {
      setLoading(true);
      void fetchRecentTransients({ force })
        .then((rows) => {
          if (cancelled) return;
          setData(rows);
          setError(rows.length === 0 ? "No recent classified alerts." : null);
          if (scene) {
            scene.setTransientsData(rows);
            if (!hasShownInScene) {
              scene.setTransients(true);
              setHasShownInScene(true);
            }
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load(false);
    const timer = window.setInterval(() => load(false), 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, scene, hasShownInScene]);

  const refresh = () => {
    setLoading(true);
    void fetchRecentTransients({ force: true })
      .then((rows) => {
        setData(rows);
        setError(rows.length === 0 ? "No recent classified alerts." : null);
        if (scene) scene.setTransientsData(rows);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  };

  const flyTo = (t: Transient) => {
    // Sky-atlas viewer uses the #viewer?ra=...&dec=... hash format.
    const params = new URLSearchParams();
    params.set("ra", t.raDeg.toFixed(4));
    params.set("dec", t.decDeg.toFixed(4));
    params.set("fov", "2");
    window.location.hash = `viewer?${params.toString()}`;
  };

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
        title="Live transient alerts from ALeRCE (ZTF)"
        aria-label="Live transients"
      >
        <span className="md:hidden">💫</span>
        <span className="hidden md:inline">💫 live</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(400px,94vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="flex items-baseline justify-between gap-2 border-b border-white/5 px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              live transients · ALeRCE / ZTF
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              {loading ? "refreshing…" : "refresh"}
            </button>
          </div>

          {scene && (
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

          {data && data.length > 0 && (
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

          {data === null && !error && (
            <div className="px-3 py-4 font-mono text-xs text-white/50">
              querying ALeRCE…
            </div>
          )}
          {error && data !== null && data.length === 0 && (
            <div className="px-3 py-3 text-xs text-amber-300/80">{error}</div>
          )}
          {error && data === null && (
            <div className="px-3 py-3 text-xs text-amber-300/80">
              ALeRCE: {error}
            </div>
          )}
          {data && data.length > 0 && (
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
                        {shortAgo(t.lastDetection)} ·{" "}
                        {(t.classProb * 100).toFixed(0)}% {t.classifier}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => flyTo(t)}
                      className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-rose-400/20 hover:text-rose-200"
                      title="Open this RA/Dec in the sky-atlas viewer"
                    >
                      fly to
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-white/5 px-3 py-1.5 text-[10px] text-white/35">
            via{" "}
            <a
              href="https://alerce.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-rose-200"
            >
              ALeRCE
            </a>{" "}
            · ZTF alert broker · refreshes every 30 min
          </div>
        </div>
      )}
    </div>
  );
}

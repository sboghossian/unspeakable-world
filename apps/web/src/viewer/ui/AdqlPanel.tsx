import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_ADQL_QUERY, runAdql, type AdqlResult } from "../power-user/adql-console";
import {
  projectAdqlPoints,
  type AdqlPointsHandle,
} from "../power-user/adql-projection";
import type { Group } from "three";
import { log } from "../../lib/logger";

/**
 * Plain-text ADQL console targeting VizieR's TAP sync endpoint.
 *
 * One textarea, one submit button, a paginated-ish results table (we cap
 * the displayed rows at 200 to keep the DOM small), and a "Plot on sky"
 * button that adds the rows as a point cloud in the scene if the result
 * has detectable RA / Dec columns.
 */

type Props = {
  group: Group | null;
  onMarkDirty?: () => void;
};

const DISPLAY_CAP = 200;

/**
 * Quick-paste pills above the textarea. Each is a single short ADQL snippet
 * tuned to fit comfortably in a phone-screen result table. The labels stay
 * deliberately short so the four chips wrap onto two rows on a 375 px
 * iPhone SE without horizontal scroll.
 */
const QUERY_TEMPLATES: ReadonlyArray<{
  id: string;
  label: string;
  query: string;
}> = [
  {
    id: "bright-stars",
    label: "Bright stars (G<5)",
    query: `-- Brightest Gaia DR3 stars (G < 5). Capped to 200 rows.
SELECT TOP 200 source_id, ra, dec, phot_g_mean_mag
FROM "I/355/gaiadr3"
WHERE phot_g_mean_mag < 5
ORDER BY phot_g_mean_mag ASC`,
  },
  {
    id: "variables-fov",
    label: "Variables in current FOV",
    query: `-- Known variable stars in a 10° cone around RA=83.8 Dec=-5.4 (Orion).
-- Edit the cone center to match your current viewport.
SELECT TOP 200 source_id, ra, dec, phot_g_mean_mag, phot_variable_flag
FROM "I/355/gaiadr3"
WHERE phot_variable_flag = 'VARIABLE'
  AND 1 = CONTAINS(
    POINT('ICRS', ra, dec),
    CIRCLE('ICRS', 83.8, -5.4, 10)
  )`,
  },
  {
    id: "recent-sne",
    label: "Recent SNe",
    query: `-- Recent supernovae from the Asiago catalog (B/sn).
SELECT TOP 200 SN, RAJ2000, DEJ2000, Type, Date, mag
FROM "B/sn/sncat"
WHERE Date >= '2023-01-01'
ORDER BY Date DESC`,
  },
  {
    id: "m-dwarfs-nearby",
    label: "M-dwarfs within 10 pc",
    query: `-- M-dwarfs (cool red stars) within 10 parsecs, via Gaia DR3 parallax.
SELECT TOP 200 source_id, ra, dec, parallax, phot_g_mean_mag, bp_rp
FROM "I/355/gaiadr3"
WHERE parallax > 100
  AND bp_rp > 2.0
  AND phot_g_mean_mag IS NOT NULL
ORDER BY parallax DESC`,
  },
];

export function AdqlPanel({ group, onMarkDirty }: Props) {
  const [query, setQuery] = useState(DEFAULT_ADQL_QUERY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdqlResult | null>(null);
  const [handle, setHandle] = useState<AdqlPointsHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      handle?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setError(null);
    try {
      const r = await runAdql(query, ac.signal);
      setResult(r);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      log.warn("[adql] query failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const plottable = useMemo(() => {
    if (!result) return null;
    if (result.raColumn < 0 || result.decColumn < 0) return null;
    const out: Array<{ raDeg: number; decDeg: number }> = [];
    for (const row of result.rows) {
      const raStr = row[result.raColumn];
      const decStr = row[result.decColumn];
      const ra = raStr === undefined ? Number.NaN : Number.parseFloat(raStr);
      const dec = decStr === undefined ? Number.NaN : Number.parseFloat(decStr);
      if (Number.isFinite(ra) && Number.isFinite(dec)) {
        out.push({ raDeg: ra, decDeg: dec });
      }
    }
    return out;
  }, [result]);

  const onPlot = () => {
    if (!plottable || !group) return;
    handle?.dispose();
    const h = projectAdqlPoints(plottable, group);
    setHandle(h);
    onMarkDirty?.();
  };

  const onClearPoints = () => {
    handle?.dispose();
    setHandle(null);
    onMarkDirty?.();
  };

  const displayed = result ? result.rows.slice(0, DISPLAY_CAP) : [];

  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      <p className="text-xs text-white/60 leading-relaxed">
        ADQL → VizieR TAP. Returns are parsed as VOTable; rows with RA/Dec
        columns (auto-detected via UCD or name) can be plotted as points
        on the sky.
      </p>

      {/* Quick-paste template pills. Wraps onto multiple rows on narrow
          viewports; each chip is ≥36 px tall so it's tap-friendly on
          mobile without dominating the popover. */}
      <div className="flex flex-wrap gap-1.5">
        {QUERY_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setQuery(tpl.query)}
            title="Paste this template into the editor"
            className="min-h-[36px] rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-400/20 active:bg-cyan-400/30"
          >
            {tpl.label}
          </button>
        ))}
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={6}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        inputMode="text"
        className="w-full min-h-[140px] rounded-md border border-white/10 bg-space-950/80 px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-plasma-500/60"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={busy}
          className="min-h-[44px] rounded-md border border-plasma-500/40 bg-plasma-500/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-plasma-300 transition hover:bg-plasma-500/25 disabled:opacity-40"
        >
          {busy ? "running…" : "submit"}
        </button>
        {result && plottable && (
          <button
            type="button"
            onClick={onPlot}
            disabled={!group || plottable.length === 0}
            className="min-h-[44px] rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-40"
          >
            plot on sky ({plottable.length})
          </button>
        )}
        {handle && (
          <button
            type="button"
            onClick={onClearPoints}
            className="min-h-[44px] rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-rose-300 hover:bg-rose-500/20"
          >
            clear points
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-xs text-rose-200 whitespace-pre-wrap break-words">
          ✗ {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border border-white/10 bg-space-950/60">
          <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
            <span>
              {result.rows.length} rows · {result.columns.length} cols
              {result.rows.length > DISPLAY_CAP && ` · showing first ${DISPLAY_CAP}`}
            </span>
            {result.raColumn >= 0 && result.decColumn >= 0 && (
              <span className="text-emerald-300/70">RA/Dec detected ✓</span>
            )}
          </div>
          <div className="max-h-56 overflow-auto">
            <table className="w-full border-collapse font-mono text-[10px]">
              <thead className="sticky top-0 bg-space-950/95 text-white/50">
                <tr>
                  {result.columns.map((c) => (
                    <th
                      key={c.name}
                      className="border-b border-white/10 px-1.5 py-1 text-left font-normal"
                    >
                      {c.name}
                      {c.unit ? (
                        <span className="ml-1 text-white/30">[{c.unit}]</span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((row, i) => (
                  <tr key={i} className="odd:bg-white/[0.02]">
                    {result.columns.map((_c, ci) => (
                      <td key={ci} className="px-1.5 py-0.5 text-white/80">
                        {row[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Bottom-strip time controller — NASA Eyes pattern.
 *
 * Now with a continuous draggable scrubber on top of the existing button
 * row. Mouse position 0..1 maps log-symmetrically around "Now" so the
 * centre is precision-controllable while the edges still reach far into
 * the past / future. The scope selector clamps the maximum range.
 *
 * Scrubbing pauses the auto-play; releasing the thumb leaves it paused
 * (the user can restart with the play button).
 */

const RATES: Array<{ rate: number; label: string }> = [
  { rate: 1, label: "×1" },
  { rate: 60, label: "×60" },
  { rate: 3600, label: "×1h" },
  { rate: 86400, label: "×1d" },
  { rate: 2592000, label: "×30d" },
];

type ScopeKey = "1d" | "1y" | "100y" | "10ky";

const SCOPES: Array<{ key: ScopeKey; label: string; days: number }> = [
  { key: "1d", label: "±1 d", days: 1 },
  { key: "1y", label: "±1 y", days: 365.25 },
  { key: "100y", label: "±100 y", days: 36525 },
  { key: "10ky", label: "±10 ky", days: 3_652_500 },
];

const TICKS_DAYS = [
  { days: 1, label: "1d" },
  { days: 30, label: "1mo" },
  { days: 365.25, label: "1y" },
  { days: 3652.5, label: "10y" },
];

type Props = {
  time: Date;
  playing: boolean;
  rate: number;
  onPlayToggle: () => void;
  onRateChange: (rate: number) => void;
  onTimeChange: (time: Date) => void;
};

export function TimeStrip({
  time,
  playing,
  rate,
  onPlayToggle,
  onRateChange,
  onTimeChange,
}: Props) {
  const iso = useMemo(() => formatIso(time), [time]);
  const [scope, setScope] = useState<ScopeKey>("100y");
  // Anchor "now" — recomputed only when the user clicks the date button.
  const nowRef = useRef<Date>(new Date());
  const [, force] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const scopeDays = SCOPES.find((s) => s.key === scope)?.days ?? 36525;

  // Convert a sliderfraction f∈[0,1] into a delta-days value (log-symmetric).
  const fracToDeltaDays = useCallback(
    (f: number): number => {
      const x = Math.max(0, Math.min(1, f));
      const sign = x === 0.5 ? 0 : x < 0.5 ? -1 : 1;
      const a = Math.abs(x - 0.5) * 2; // 0..1
      // 10^(a*log10(scopeDays+1)) - 1, so f=0.5 maps to 0 days, f=±0.5 to ±scopeDays
      const mag = Math.pow(scopeDays + 1, a) - 1;
      return sign * mag;
    },
    [scopeDays],
  );

  // Convert simTime → fraction relative to nowRef.
  const timeToFrac = useCallback(
    (t: Date): number => {
      const dDays = (t.getTime() - nowRef.current.getTime()) / 86400000;
      const sign = dDays === 0 ? 0 : dDays < 0 ? -1 : 1;
      const mag = Math.abs(dDays);
      const a = Math.log(mag + 1) / Math.log(scopeDays + 1);
      const clamped = Math.max(0, Math.min(1, a));
      return 0.5 + sign * clamped * 0.5;
    },
    [scopeDays],
  );

  const onScrubDay = useCallback(
    (deltaDays: number) => {
      const next = new Date(time.getTime() + deltaDays * 86400_000);
      onTimeChange(next);
    },
    [time, onTimeChange],
  );

  const onJumpNow = useCallback(() => {
    nowRef.current = new Date();
    onTimeChange(new Date());
    force((n) => n + 1);
  }, [onTimeChange]);

  // Pointer-driven scrubbing along the visual track.
  const fracFromEvent = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0.5;
    const rect = el.getBoundingClientRect();
    return (clientX - rect.left) / Math.max(1, rect.width);
  }, []);

  const applyFrac = useCallback(
    (f: number) => {
      const d = fracToDeltaDays(f);
      onTimeChange(new Date(nowRef.current.getTime() + d * 86400_000));
    },
    [fracToDeltaDays, onTimeChange],
  );

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      if (playing) onPlayToggle(); // auto-pause
      applyFrac(fracFromEvent(e.clientX));
    },
    [applyFrac, fracFromEvent, onPlayToggle, playing],
  );

  const onTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      applyFrac(fracFromEvent(e.clientX));
    },
    [applyFrac, fracFromEvent],
  );

  const onTrackPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = false;
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  // Keyboard: arrow keys step by one scope-unit, Shift = 10×.
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      const dir = ev.key === "ArrowLeft" ? -1 : 1;
      const mult = ev.shiftKey ? 10 : 1;
      const unit = scopeUnitDays(scope);
      onScrubDay(dir * mult * unit);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scope, onScrubDay]);

  const frac = timeToFrac(time);
  const thumbPct = `${(frac * 100).toFixed(2)}%`;

  return (
    <div className="pointer-events-auto flex flex-col items-stretch gap-2 rounded-xl border border-white/10 bg-space-950/80 px-3 py-2 backdrop-blur">
      {/* Scrubber row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition ${
                scope === s.key
                  ? "bg-white/15 text-white"
                  : "text-white/45 hover:bg-white/5 hover:text-white/80"
              }`}
              title={`Scrubber range ${s.label}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div
          ref={trackRef}
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerCancel={onTrackPointerUp}
          className="relative h-5 flex-1 cursor-pointer select-none"
          role="presentation"
        >
          {/* Track */}
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" />
          {/* Centre marker (now) */}
          <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-plasma-400/80" />
          {/* Tick marks (only those within scope) */}
          {TICKS_DAYS.filter((t) => t.days <= scopeDays).map((t) => {
            const fr =
              0.5 +
              0.5 *
                (Math.log(t.days + 1) / Math.log(scopeDays + 1));
            const fl =
              0.5 -
              0.5 *
                (Math.log(t.days + 1) / Math.log(scopeDays + 1));
            return (
              <span key={t.label}>
                <span
                  className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-white/25"
                  style={{ left: `${fr * 100}%` }}
                />
                <span
                  className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-white/25"
                  style={{ left: `${fl * 100}%` }}
                />
              </span>
            );
          })}
          {/* Thumb */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-plasma-300 bg-plasma-400 shadow-md"
            style={{ left: thumbPct }}
          />
          {/* A11y range under the visual track */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={frac}
            onChange={(e) => applyFrac(parseFloat(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Time scrubber"
          />
        </div>
      </div>

      {/* Existing controls row */}
      <div className="flex flex-col items-center gap-2 md:flex-row">
        <div className="flex items-center gap-1.5">
          <IconButton onClick={() => onScrubDay(-30)} title="-30 days">
            ⟪
          </IconButton>
          <IconButton onClick={() => onScrubDay(-1)} title="-1 day">
            ⟨
          </IconButton>

          <button
            type="button"
            onClick={onPlayToggle}
            className="rounded-lg border border-plasma-500/40 bg-plasma-500/15 px-3 py-1.5 text-sm text-plasma-400 transition hover:bg-plasma-500/25"
            title={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>

          <IconButton onClick={() => onScrubDay(1)} title="+1 day">
            ⟩
          </IconButton>
          <IconButton onClick={() => onScrubDay(30)} title="+30 days">
            ⟫
          </IconButton>
        </div>

        <div className="flex flex-col items-center px-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            sim time
          </span>
          <button
            type="button"
            onClick={onJumpNow}
            className="font-mono text-sm text-white/90 transition hover:text-plasma-400"
            title="Jump to now"
          >
            {iso}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {RATES.map((r) => (
            <button
              key={r.rate}
              type="button"
              onClick={() => onRateChange(r.rate)}
              className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                r.rate === rate
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
              title={`${r.label} time speed`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function scopeUnitDays(scope: ScopeKey): number {
  switch (scope) {
    case "1d":
      return 1 / 24; // 1 hour
    case "1y":
      return 1; // 1 day
    case "100y":
      return 30; // 1 month
    case "10ky":
      return 365.25; // 1 year
  }
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function formatIso(time: Date): string {
  const y = time.getUTCFullYear().toString().padStart(4, "0");
  const m = (time.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = time.getUTCDate().toString().padStart(2, "0");
  const hh = time.getUTCHours().toString().padStart(2, "0");
  const mm = time.getUTCMinutes().toString().padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}Z`;
}

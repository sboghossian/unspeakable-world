import { useCallback, useMemo } from 'react';

/**
 * Bottom-strip time controller — NASA Eyes pattern.
 *
 * Day 4 cut: dragable date display, play/pause, speed presets.
 * Day 5+ adds keyframed scrubbing, calendar pop-out, and timezone-aware
 * "tonight's sky" anchoring.
 */

const RATES: Array<{ rate: number; label: string }> = [
  { rate: 1, label: '×1' },
  { rate: 60, label: '×60' },
  { rate: 3600, label: '×1h' },
  { rate: 86400, label: '×1d' },
  { rate: 2592000, label: '×30d' },
];

type Props = {
  time: Date;
  playing: boolean;
  rate: number;
  onPlayToggle: () => void;
  onRateChange: (rate: number) => void;
  onTimeChange: (time: Date) => void;
};

export function TimeStrip({ time, playing, rate, onPlayToggle, onRateChange, onTimeChange }: Props) {
  const iso = useMemo(() => formatIso(time), [time]);

  const onScrubDay = useCallback(
    (deltaDays: number) => {
      const next = new Date(time.getTime() + deltaDays * 86400_000);
      onTimeChange(next);
    },
    [time, onTimeChange],
  );

  const onJumpNow = useCallback(() => onTimeChange(new Date()), [onTimeChange]);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-space-950/80 px-3 py-2 backdrop-blur md:flex-row">
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
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? '❚❚' : '▶'}
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
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
            }`}
            title={`${r.label} time speed`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
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
  const y = time.getUTCFullYear().toString().padStart(4, '0');
  const m = (time.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = time.getUTCDate().toString().padStart(2, '0');
  const hh = time.getUTCHours().toString().padStart(2, '0');
  const mm = time.getUTCMinutes().toString().padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}Z`;
}

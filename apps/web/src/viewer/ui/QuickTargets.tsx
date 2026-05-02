import { useState } from 'react';

const QUICK = [
  { label: 'Sun', target: 'Sun' as const, accent: 'amber' },
  { label: 'Moon', target: 'Moon' as const, accent: 'gray' },
  { label: 'Mars', target: 'Mars' as const, accent: 'red' },
  { label: 'Jupiter', target: 'Jupiter' as const, accent: 'amber' },
  { label: 'Saturn', target: 'Saturn' as const, accent: 'amber' },
  { label: 'Venus', target: 'Venus' as const, accent: 'amber' },
  { label: 'ISS', target: 'ISS' as const, accent: 'plasma' },
];

type Target = (typeof QUICK)[number]['target'];

type Props = {
  onTarget: (target: Target) => void;
  hasIssFix: boolean;
};

const ACCENT: Record<string, string> = {
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20',
  gray: 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10',
  red: 'border-red-400/30 bg-red-400/10 text-red-300 hover:bg-red-400/20',
  plasma: 'border-plasma-500/40 bg-plasma-500/10 text-plasma-400 hover:bg-plasma-500/20',
};

export function QuickTargets({ onTarget, hasIssFix }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        {open ? 'targets ✕' : 'targets ⌖'}
      </button>

      {open && (
        <div className="flex flex-col items-end gap-1.5">
          {QUICK.map((q) => {
            const disabled = q.target === 'ISS' && !hasIssFix;
            return (
              <button
                key={q.target}
                type="button"
                onClick={() => onTarget(q.target)}
                disabled={disabled}
                className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-wider backdrop-blur transition disabled:cursor-not-allowed disabled:opacity-50 ${ACCENT[q.accent]}`}
                title={disabled ? 'ISS position not yet fetched' : `Fly to ${q.label}`}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

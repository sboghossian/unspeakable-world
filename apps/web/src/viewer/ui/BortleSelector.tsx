import { BORTLE, type BortleClass, writeBortle } from "../observer/bortle";

/**
 * Compact slider that lets the user pick their light-pollution class on
 * the Bortle 1-9 scale. Renders the class number, a one-line label and
 * the naked-eye limiting magnitude so the user understands what they're
 * choosing. Persists to localStorage via writeBortle().
 *
 * Designed to embed inside the TonightTargetsPanel — that panel uses the
 * resulting limiting magnitude to filter the visible-now target list.
 */

type Props = {
  value: BortleClass;
  onChange: (v: BortleClass) => void;
};

export function BortleSelector({ value, onChange }: Props) {
  const data = BORTLE[value];
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          Bortle class
        </span>
        <span className={`font-mono text-[11px] ${data.color}`}>
          {value} · {data.label}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={9}
        step={1}
        value={value}
        onChange={(e) => {
          const next = Math.max(1, Math.min(9, Number(e.target.value))) as BortleClass;
          writeBortle(next);
          onChange(next);
        }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400 outline-none accent-white"
        aria-label="Bortle dark-sky class"
      />
      <div className="flex items-baseline justify-between font-mono text-[10px] text-white/35">
        <span>1 wilderness</span>
        <span>limit {data.limitingMag.toFixed(1)}m</span>
        <span>9 inner-city</span>
      </div>
    </div>
  );
}

/**
 * Tiny inline badge showing the active Bortle class. Used in panel
 * headers next to the title.
 */
export function BortleBadge({ value }: { value: BortleClass }) {
  const data = BORTLE[value];
  return (
    <span
      title={`${data.label} · naked-eye limit ${data.limitingMag.toFixed(1)} mag`}
      className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${data.color}`}
    >
      Bortle {value}
    </span>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  COMPARE_ITEMS,
  findCompareItem,
  formatMeters,
  formatMultiplier,
  type CompareItem,
  type CompareKind,
} from "../compare/compare-data";

/**
 * Side-by-side body comparison overlay.
 *
 * Two pickers, two SVG discs drawn at matched physical scale. If the
 * size ratio is too extreme to render both bodies legibly, an inset
 * shows the smaller body at higher magnification so it stays visible.
 *
 * The button matches the AchievementsPanel idiom — small top-bar chip
 * with the cyan/space-950 backdrop, popover anchored top-right.
 */

const KIND_LABEL: Record<CompareKind, string> = {
  star: "star",
  planet: "planet",
  moon: "moon",
  galaxy: "galaxy",
  blackhole: "black hole",
  asteroid: "asteroid",
  "neutron-star": "neutron",
  "white-dwarf": "white dwarf",
  "human-scale": "earth-scale",
};

const KIND_BADGE: Record<CompareKind, string> = {
  star: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  planet: "border-plasma-500/40 bg-plasma-500/15 text-plasma-400",
  moon: "border-white/20 bg-white/5 text-white/70",
  galaxy: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  blackhole: "border-slate-500/40 bg-slate-900/40 text-slate-300",
  asteroid: "border-stone-500/40 bg-stone-500/10 text-stone-300",
  "neutron-star": "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200",
  "white-dwarf": "border-sky-300/40 bg-sky-300/10 text-sky-200",
  "human-scale": "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
};

const PRESETS: Array<{ label: string; aId: string; bId: string }> = [
  { label: "Sun vs Earth", aId: "sun", bId: "earth" },
  { label: "Earth vs Moon", aId: "earth", bId: "moon" },
  { label: "Sun vs Sirius A", aId: "sun", bId: "sirius-a" },
  { label: "Milky Way vs Andromeda", aId: "milky-way", bId: "andromeda" },
];

const SORTED_ITEMS = [...COMPARE_ITEMS].sort(
  (a, b) => a.diameterM - b.diameterM,
);

const FALLBACK_A: CompareItem =
  findCompareItem("sun") ?? COMPARE_ITEMS[0] ?? SORTED_ITEMS[0]!;
const FALLBACK_B: CompareItem =
  findCompareItem("earth") ?? COMPARE_ITEMS[1] ?? SORTED_ITEMS[1]!;

export function ComparePanel() {
  const [open, setOpen] = useState(false);
  const [aId, setAId] = useState("sun");
  const [bId, setBId] = useState("earth");

  const a = findCompareItem(aId) ?? FALLBACK_A;
  const b = findCompareItem(bId) ?? FALLBACK_B;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Compare two objects"
        aria-label="Compare"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>⚖</span>
        <span className="font-mono text-[10px] tracking-widest">COMPARE</span>
      </button>
      {open && (
        <div
          className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(640px,94vw)] max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-4 backdrop-blur"
          role="dialog"
          aria-label="Compare two objects"
        >
          <div className="mb-3 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              Side-by-side comparison
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close compare"
              className="font-mono text-[10px] uppercase tracking-widest text-white/45 hover:text-white"
            >
              close
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setAId(p.aId);
                  setBId(p.bId);
                }}
                className="rounded-md border border-plasma-500/30 bg-plasma-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-plasma-400 transition hover:bg-plasma-500/20 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <CompareItemPicker
              label="Object A"
              value={a}
              onChange={(item) => setAId(item.id)}
              accent="left"
            />
            <CompareItemPicker
              label="Object B"
              value={b}
              onChange={(item) => setBId(item.id)}
              accent="right"
            />
          </div>

          <CompareCanvas a={a} b={b} />
          <CompareReadout a={a} b={b} />
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Picker                                                                    */
/* -------------------------------------------------------------------------- */

type PickerProps = {
  label: string;
  value: CompareItem;
  onChange: (item: CompareItem) => void;
  accent: "left" | "right";
};

function CompareItemPicker({ label, value, onChange, accent }: PickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED_ITEMS.slice(0, 8);
    return SORTED_ITEMS.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.kind.toLowerCase().includes(q) ||
        (it.tagline?.toLowerCase().includes(q) ?? false),
    ).slice(0, 12);
  }, [query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(ev.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const accentRing =
    accent === "left"
      ? "focus:ring-plasma-500/40"
      : "focus:ring-amber-400/40";

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: value.color ?? "#ffffff" }}
        />
        <input
          ref={inputRef}
          value={open ? query : value.name}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = results[highlight];
              if (pick) {
                onChange(pick);
                setOpen(false);
                inputRef.current?.blur();
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search bodies…"
          className={`flex-1 bg-transparent font-display text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 ${accentRing} rounded-sm`}
        />
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${KIND_BADGE[value.kind]}`}
        >
          {KIND_LABEL[value.kind]}
        </span>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-white/10 bg-space-950/95 py-1 shadow-2xl backdrop-blur">
          {results.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                  setQuery("");
                }}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition ${
                  highlight === i ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.color ?? "#ffffff" }}
                />
                <span className="flex-1 truncate font-display text-[12px] text-white/85">
                  {item.name}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-white/40">
                  {formatMeters(item.diameterM)}
                </span>
                <span
                  className={`shrink-0 rounded border px-1 py-px font-mono text-[8px] uppercase tracking-widest ${KIND_BADGE[item.kind]}`}
                >
                  {KIND_LABEL[item.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Visual                                                                    */
/* -------------------------------------------------------------------------- */

const CANVAS_W = 600;
const CANVAS_H = 300;
const MARGIN = 24;

function CompareCanvas({ a, b }: { a: CompareItem; b: CompareItem }) {
  const dA = Math.max(a.diameterM, 1e-9);
  const dB = Math.max(b.diameterM, 1e-9);
  const larger = dA >= dB ? a : b;
  const smaller = dA >= dB ? b : a;
  const dLarger = Math.max(larger.diameterM, 1e-9);
  const dSmaller = Math.max(smaller.diameterM, 1e-9);
  const ratio = dLarger / dSmaller;

  // Pick a scale so the larger fits inside the canvas with a little
  // breathing room. Each body gets its own half of the canvas.
  const halfW = CANVAS_W / 2 - MARGIN;
  const maxDiameterPx = Math.min(halfW * 2, CANVAS_H - MARGIN * 2);
  const metersPerPx = dLarger / maxDiameterPx;

  const largerPxDia = dLarger / metersPerPx;
  const smallerPxDia = dSmaller / metersPerPx;

  // Centre x for each body.
  const aCx = CANVAS_W * 0.27;
  const bCx = CANVAS_W * 0.73;
  const cy = CANVAS_H / 2;

  const showInset = ratio > 1000;
  const insetMagnification = Math.min(ratio / 50, 5000);

  // Tag positions: name above, size below the disc.
  return (
    <div className="rounded-lg border border-white/10 bg-gradient-to-b from-space-900/80 to-space-950/90 p-2">
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${a.name} compared to ${b.name} at matched physical scale`}
      >
        <defs>
          <radialGradient id="uw-compare-glow-a" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="uw-compare-glow-b" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="uw-compare-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(125,211,252,0.06)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#uw-compare-grid)" />

        {/* divider */}
        <line
          x1={CANVAS_W / 2}
          y1={MARGIN / 2}
          x2={CANVAS_W / 2}
          y2={CANVAS_H - MARGIN / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 4"
        />

        <Disc
          item={a}
          cx={aCx}
          cy={cy}
          diameterPx={a === larger ? largerPxDia : smallerPxDia}
          glowId="uw-compare-glow-a"
        />
        <Disc
          item={b}
          cx={bCx}
          cy={cy}
          diameterPx={b === larger ? largerPxDia : smallerPxDia}
          glowId="uw-compare-glow-b"
        />

        {showInset && (
          <InsetMagnifier
            item={smaller}
            x={smaller === a ? aCx - 60 : bCx - 60}
            y={CANVAS_H - 80}
            magnification={insetMagnification}
            actualPxDia={smallerPxDia}
          />
        )}

        {/* Labels */}
        <text
          x={aCx}
          y={20}
          textAnchor="middle"
          className="fill-white/80 font-display"
          fontSize="13"
        >
          {a.name}
        </text>
        <text
          x={bCx}
          y={20}
          textAnchor="middle"
          className="fill-white/80 font-display"
          fontSize="13"
        >
          {b.name}
        </text>
        <text
          x={aCx}
          y={CANVAS_H - 8}
          textAnchor="middle"
          className="fill-white/45 font-mono"
          fontSize="10"
        >
          ⌀ {formatMeters(a.diameterM)}
        </text>
        <text
          x={bCx}
          y={CANVAS_H - 8}
          textAnchor="middle"
          className="fill-white/45 font-mono"
          fontSize="10"
        >
          ⌀ {formatMeters(b.diameterM)}
        </text>
      </svg>
    </div>
  );
}

function Disc({
  item,
  cx,
  cy,
  diameterPx,
  glowId,
}: {
  item: CompareItem;
  cx: number;
  cy: number;
  diameterPx: number;
  glowId: string;
}) {
  // Floor at 2 px so it's still visible when extremely small.
  const r = Math.max(1, diameterPx / 2);
  const color = item.color ?? "#7dd3fc";
  const showEmoji = !item.color && item.emoji;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r + 6}
        fill={color}
        opacity={0.08}
        filter="blur(8px)"
      />
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${glowId})`} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.75"
      />
      {showEmoji && r >= 14 && (
        <text
          x={cx}
          y={cy + r * 0.18}
          textAnchor="middle"
          fontSize={r * 0.8}
          opacity={0.9}
        >
          {item.emoji}
        </text>
      )}
      {r < 4 && (
        <line
          x1={cx}
          y1={cy + r + 2}
          x2={cx}
          y2={cy + r + 14}
          stroke="rgba(125,211,252,0.6)"
          strokeWidth="1"
        />
      )}
    </g>
  );
}

function InsetMagnifier({
  item,
  x,
  y,
  magnification,
  actualPxDia,
}: {
  item: CompareItem;
  x: number;
  y: number;
  magnification: number;
  actualPxDia: number;
}) {
  const r = Math.max(8, Math.min(28, (actualPxDia * magnification) / 2));
  const boxW = 120;
  const boxH = 60;
  const color = item.color ?? "#7dd3fc";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={boxW}
        height={boxH}
        rx={6}
        fill="rgba(3,5,10,0.85)"
        stroke="rgba(125,211,252,0.35)"
        strokeDasharray="3 3"
      />
      <text
        x={x + 8}
        y={y + 14}
        className="fill-plasma-400 font-mono"
        fontSize="9"
      >
        ZOOM ×{formatMultiplier(magnification).replace("×", "")}
      </text>
      <circle cx={x + 30} cy={y + 38} r={r} fill={color} />
      <circle
        cx={x + 30}
        cy={y + 38}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.75"
      />
      <text
        x={x + 60}
        y={y + 34}
        className="fill-white/85 font-display"
        fontSize="10"
      >
        {item.name}
      </text>
      <text
        x={x + 60}
        y={y + 48}
        className="fill-white/45 font-mono"
        fontSize="8"
      >
        ⌀ {formatMeters(item.diameterM)}
      </text>
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/*  Readout                                                                   */
/* -------------------------------------------------------------------------- */

function CompareReadout({ a, b }: { a: CompareItem; b: CompareItem }) {
  const dA = a.diameterM;
  const dB = b.diameterM;
  const ratio = Math.max(dA, dB) / Math.max(Math.min(dA, dB), 1e-9);
  const volRatio = ratio ** 3;
  const larger = dA >= dB ? a : b;
  const smaller = dA >= dB ? b : a;

  const massA = a.massKg;
  const massB = b.massKg;
  const haveMass = typeof massA === "number" && typeof massB === "number";
  const massRatio = haveMass
    ? Math.max(massA, massB) / Math.max(Math.min(massA, massB), 1e-30)
    : null;

  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-md border border-plasma-500/20 bg-plasma-500/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-plasma-400">
          Diameter ratio
        </div>
        <div className="font-display text-sm text-white/90">
          <span className="text-white">{larger.name}</span> is{" "}
          <span className="font-mono text-plasma-400">
            {formatMultiplier(ratio)}
          </span>{" "}
          the diameter of{" "}
          <span className="text-white">{smaller.name}</span>.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
            Volume ratio
          </div>
          <div className="font-display text-sm text-white/85">
            {formatMultiplier(volRatio)}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
            Mass ratio
          </div>
          <div className="font-display text-sm text-white/85">
            {massRatio !== null ? formatMultiplier(massRatio) : "—"}
          </div>
        </div>
      </div>
      {(a.tagline || b.tagline) && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/35">
              {a.name}
            </div>
            <div className="font-display text-[12px] text-white/70">
              {a.tagline ?? "—"}
            </div>
          </div>
          <div className="rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/35">
              {b.name}
            </div>
            <div className="font-display text-[12px] text-white/70">
              {b.tagline ?? "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

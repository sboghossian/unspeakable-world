import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  SPACE_MYTHS,
  mythsByCategory,
  type Myth,
  type MythCategory,
} from "../myths/myths-data";

/**
 * 🔍 Common Space Myths panel — debunks the most-repeated
 * misconceptions about space, astronomy and cosmology. Each card
 * shows the myth (red, strikethrough) over the reality (green, with
 * the actual physics), plus citation chips linking to NASA / peer-
 * reviewed sources. Filterable by category, expandable per-card.
 *
 * Visual idiom matches AchievementsPanel: h-7 top-bar button, dark
 * space-950 popover, white/10 borders, font-display headings,
 * font-mono metadata.
 */

type FilterKey = "all" | MythCategory;

const FILTER_ORDER: FilterKey[] = [
  "all",
  "solar-system",
  "stars-and-galaxies",
  "cosmology",
  "space-travel",
  "physics",
  "history",
];

function filterLabel(key: FilterKey): string {
  if (key === "all") return "All";
  return CATEGORY_LABELS[key];
}

function MythCard({ myth }: { myth: Myth }) {
  const [expanded, setExpanded] = useState(false);
  const hasSources = !!myth.sources && myth.sources.length > 0;

  return (
    <li
      className={`rounded-md border px-2.5 py-2 transition ${
        expanded
          ? "border-cyan-400/40 bg-cyan-400/[0.04]"
          : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2 text-left"
      >
        <span
          aria-hidden
          className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-rose-300/70"
        >
          Myth
        </span>
        <span className="flex-1 font-display text-[12px] leading-snug text-rose-200/90 line-through decoration-rose-400/60 decoration-1">
          {myth.myth}
        </span>
        <span
          aria-hidden
          className={`shrink-0 font-mono text-[10px] text-white/40 transition ${
            expanded ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
      </button>
      <div
        className={`mt-1.5 flex items-start gap-2 ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        <span
          aria-hidden
          className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-emerald-300/80"
        >
          Reality
        </span>
        <p className="flex-1 font-mono text-[11px] leading-relaxed text-emerald-100/90">
          {myth.reality}
        </p>
      </div>
      {expanded && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/35">
            {CATEGORY_LABELS[myth.category]}
          </span>
          {hasSources &&
            myth.sources?.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-cyan-400/30 bg-cyan-400/5 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200/90 transition hover:border-cyan-300/60 hover:bg-cyan-400/15 hover:text-cyan-100"
              >
                <span aria-hidden>↗</span>
                {s.title}
              </a>
            ))}
        </div>
      )}
    </li>
  );
}

export function MythsPanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  const visible = useMemo(() => mythsByCategory(filter), [filter]);
  const total = SPACE_MYTHS.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Space Myths (${total})`}
        aria-label="Space Myths"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>🔍</span>
        <span className="font-mono text-[10px] tracking-widest">
          MYTHS
        </span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(420px,94vw)] max-h-[75vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              Common Space Myths
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              {visible.length} / {total}
            </div>
          </div>
          <p className="mb-2 font-mono text-[10px] leading-relaxed text-white/45">
            Debunking the stereotypes — each card pairs a familiar
            misconception with the actual physics, plus a link to a
            primary source.
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FILTER_ORDER.map((key) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition ${
                    active
                      ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                      : "border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:bg-white/10 hover:text-white/85"
                  }`}
                >
                  {filterLabel(key)}
                </button>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <div className="rounded-md border border-white/5 bg-white/[0.02] p-3 text-center font-mono text-[11px] text-white/45">
              No myths in this category.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {visible.map((m) => (
                <MythCard key={m.id} myth={m} />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

import { useMemo, useState } from "react";
import {
  MISSIONS_CATALOG,
  type Agency,
  type MissionEntry,
} from "../missions-catalog/missions-catalog-data";
import {
  narrativeForCatalogId,
  type MissionNarrative,
} from "../missions-narrative/missions-data";
import { EmptyState } from "./EmptyState";
import { MissionNarrativePanel } from "./MissionNarrativePanel";

/**
 * 🛰 Missions Catalog — a reference encyclopedia of major spacecraft +
 * human-spaceflight programs. Filterable by status (active / upcoming
 * / extended / historical) and by agency. Click a row → expanded view
 * with the canonical mission link.
 */

const STATUS_LABEL: Record<MissionEntry["status"], string> = {
  active: "Active",
  extended: "Extended",
  upcoming: "Upcoming",
  historical: "Historical",
};

const STATUS_TINT: Record<MissionEntry["status"], string> = {
  active: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  extended: "border-teal-400/40 bg-teal-400/10 text-teal-200",
  upcoming: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  historical: "border-white/15 bg-white/5 text-white/55",
};

const AGENCY_FLAG: Record<Agency, string> = {
  NASA: "🇺🇸",
  ESA: "🇪🇺",
  JAXA: "🇯🇵",
  Roscosmos: "🇷🇺",
  CNSA: "🇨🇳",
  ISRO: "🇮🇳",
  SpaceX: "🚀",
  "Blue Origin": "🔵",
  "Rocket Lab": "⚡",
  ULA: "🛸",
  "Multi-agency": "🌐",
};

const STATUS_ORDER: MissionEntry["status"][] = [
  "active",
  "upcoming",
  "extended",
  "historical",
];

export function MissionsCatalogPanel() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MissionEntry["status"] | "all">("all");
  const [agencyFilter, setAgencyFilter] = useState<Agency | "all">("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeNarrative, setActiveNarrative] = useState<MissionNarrative | null>(
    null,
  );

  const agencies = useMemo(() => {
    const s = new Set<Agency>();
    for (const m of MISSIONS_CATALOG) s.add(m.agency);
    return Array.from(s).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = MISSIONS_CATALOG;
    if (statusFilter !== "all") out = out.filter((m) => m.status === statusFilter);
    if (agencyFilter !== "all") out = out.filter((m) => m.agency === agencyFilter);
    if (q) {
      out = out.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.target.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q),
      );
    }
    // Sort by status (active first) then by launch date desc
    return [...out].sort((a, b) => {
      const sa = STATUS_ORDER.indexOf(a.status);
      const sb = STATUS_ORDER.indexOf(b.status);
      if (sa !== sb) return sa - sb;
      return b.launch.localeCompare(a.launch);
    });
  }, [statusFilter, agencyFilter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: MISSIONS_CATALOG.length };
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const m of MISSIONS_CATALOG) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Missions catalog — past, present, and upcoming spacecraft"
        aria-label="Missions catalog"
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
          open
            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>🛰</span>
        <span>missions</span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 flex max-h-[80vh] w-[min(540px,94vw)] flex-col rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div className="font-display text-sm text-white/90">
              Missions catalog
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
              {filtered.length} of {MISSIONS_CATALOG.length}
            </div>
          </div>

          {/* Status chips */}
          <div className="mb-2 flex flex-wrap gap-1">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label={`All · ${counts["all"]}`}
            />
            {STATUS_ORDER.map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={`${STATUS_LABEL[s]} · ${counts[s] ?? 0}`}
                tint={STATUS_TINT[s]}
              />
            ))}
          </div>

          {/* Agency + search */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <select
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value as Agency | "all")}
              className="rounded border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[10.5px] text-white/80 outline-none"
            >
              <option value="all">All agencies</option>
              {agencies.map((a) => (
                <option key={a} value={a}>
                  {AGENCY_FLAG[a]} {a}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search…"
              className="flex-1 rounded border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[10.5px] text-white/85 placeholder:text-white/35 outline-none focus:border-white/30"
            />
          </div>

          {/* List */}
          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            {filtered.length === 0 ? (
              <EmptyState
                icon="🛰"
                title="No missions match those filters"
                body="The catalog is alive and well — your filters just narrowed it to nothing. Try clearing the search or widening the status / agency."
                tone="cyan"
                density="compact"
                cta={{
                  label: "Clear filters",
                  onClick: () => {
                    setStatusFilter("all");
                    setAgencyFilter("all");
                    setQuery("");
                  },
                }}
              />
            ) : (
              <ul className="space-y-1.5">
                {filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((cur) => (cur === m.id ? null : m.id))
                      }
                      className="w-full rounded-md border border-white/10 bg-white/[0.03] p-2 text-left transition hover:bg-white/[0.06]"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-display text-[12px] text-white/90">
                          <span aria-hidden>{AGENCY_FLAG[m.agency]}</span>
                          <span>{m.name}</span>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-1.5 py-0 font-mono text-[9px] uppercase tracking-widest ${STATUS_TINT[m.status]}`}
                        >
                          {STATUS_LABEL[m.status]}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-white/45">
                        <span>{m.launch}</span>
                        <span>·</span>
                        <span className="truncate">{m.target}</span>
                      </div>
                      {expandedId === m.id && (
                        <div className="mt-2 border-t border-white/10 pt-2">
                          <p className="font-mono text-[10.5px] leading-snug text-white/65">
                            {m.summary}
                          </p>
                          {m.endDate && (
                            <div className="mt-1 font-mono text-[10px] text-white/40">
                              Ended {m.endDate}
                            </div>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <a
                              href={m.link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-block font-mono text-[10.5px] text-cyan-300/80 hover:text-cyan-200 hover:underline"
                            >
                              mission page →
                            </a>
                            {narrativeForCatalogId(m.id) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const n = narrativeForCatalogId(m.id);
                                  if (n) setActiveNarrative(n);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-cyan-400/40 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[10.5px] text-cyan-200 transition hover:bg-cyan-400/20"
                                title="Open in-product mission profile"
                              >
                                <span aria-hidden>ℹ</span>
                                <span>read mission profile</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {activeNarrative && (
        <MissionNarrativePanel
          mission={activeNarrative}
          onClose={() => setActiveNarrative(null)}
        />
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tint?: string;
}) {
  const baseActive = tint ?? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 font-mono text-[10px] transition ${
        active ? baseActive : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

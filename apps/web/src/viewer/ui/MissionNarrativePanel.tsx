import { useEffect, useMemo, useState } from "react";
import { TabList } from "./primitives";
import type {
  MissionNarrative,
  MissionStatus,
} from "../missions-narrative/missions-data";

/**
 * 📖 Mission Narrative Panel
 *
 * A 720 px-wide scrollable modal that renders one mission's rich
 * profile: hero, summary, and tabs for Overview · Stats · Timeline ·
 * Sources. Driven entirely by a `MissionNarrative` record passed in
 * from the catalog panel — no fetching, no global state. Closing the
 * modal is the parent's responsibility (`onClose`).
 */

type Tab = "overview" | "stats" | "timeline" | "sources";

const STATUS_LABEL: Record<MissionStatus, string> = {
  active: "Active",
  ended: "Ended",
  lost: "Lost",
  extended: "Extended",
  "en-route": "En route",
};

const STATUS_TINT: Record<MissionStatus, string> = {
  active: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  ended: "border-white/15 bg-white/5 text-white/55",
  lost: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  extended: "border-teal-400/40 bg-teal-400/15 text-teal-200",
  "en-route": "border-amber-400/40 bg-amber-400/10 text-amber-200",
};

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "timeline", label: "Timeline" },
  { id: "sources", label: "Sources" },
];

export type MissionNarrativePanelProps = {
  readonly mission: MissionNarrative;
  readonly onClose: () => void;
};

export function MissionNarrativePanel({
  mission,
  onClose,
}: MissionNarrativePanelProps) {
  const [tab, setTab] = useState<Tab>("overview");

  // Reset to "overview" whenever the mission changes
  useEffect(() => {
    setTab("overview");
  }, [mission.slug]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const paragraphs = useMemo(
    () =>
      mission.description
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [mission.description],
  );

  const accent = mission.glow_color;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[90vh] w-[min(720px,96vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-narrative-title"
      >
        {/* Hero */}
        <div className="relative">
          {mission.image_url ? (
            <img
              src={mission.image_url}
              alt={mission.name}
              loading="lazy"
              className="h-44 w-full object-cover opacity-90"
            />
          ) : (
            <div className="h-44 w-full bg-gradient-to-br from-white/[0.04] to-white/[0.01]" />
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-1"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to top, rgba(8,10,18,0.95) 0%, rgba(8,10,18,0.4) 50%, rgba(8,10,18,0) 100%)`,
            }}
            aria-hidden
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission profile"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-space-950/70 font-mono text-[12px] text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white"
          >
            ✕
          </button>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/55">
                {mission.agency} · launched {mission.launch_date}
                {mission.end_date ? ` · ended ${mission.end_date}` : ""}
              </div>
              <h2
                id="mission-narrative-title"
                className="mt-0.5 font-display text-xl text-white"
              >
                {mission.name}
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STATUS_TINT[mission.status]}`}
              style={{
                borderColor: `${accent}66`,
              }}
            >
              {STATUS_LABEL[mission.status]}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div
          className="border-y border-white/10 px-4 py-3"
          style={{ background: `linear-gradient(90deg, ${accent}10, transparent 60%)` }}
        >
          <p className="font-mono text-[12px] leading-snug text-white/85">
            {mission.summary}
          </p>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/65">
            Anchor: {mission.anchor_body}
          </div>
        </div>

        {/* Tabs */}
        <TabList variant="panel" label="Mission profile sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-md px-3 py-1.5 font-mono text-[11px] transition ${
                tab === t.id
                  ? "border-x border-t border-white/15 bg-space-950 text-white"
                  : "text-white/65 hover:text-white/90"
              }`}
              role="tab"
              id={`mission-tab-${t.id}`}
              aria-controls={`mission-tabpanel-${t.id}`}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
            >
              {t.label}
            </button>
          ))}
        </TabList>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          role="tabpanel"
          id={`mission-tabpanel-${tab}`}
          aria-labelledby={`mission-tab-${tab}`}
        >
          {tab === "overview" && (
            <OverviewTab paragraphs={paragraphs} keyFacts={mission.key_facts} />
          )}
          {tab === "stats" && <StatsTab stats={mission.stats} />}
          {tab === "timeline" && (
            <TimelineTab timeline={mission.timeline} accent={accent} />
          )}
          {tab === "sources" && <SourcesTab sources={mission.sources} />}
        </div>
      </div>
    </div>
  );
}

// ─── Tab bodies ──────────────────────────────────────────────────────

function OverviewTab({
  paragraphs,
  keyFacts,
}: {
  paragraphs: readonly string[];
  keyFacts: readonly string[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="font-mono text-[12px] leading-relaxed text-white/85"
          >
            {p}
          </p>
        ))}
      </div>
      <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/55">
          Key facts
        </div>
        <ul className="space-y-1.5">
          {keyFacts.map((f, i) => (
            <li
              key={i}
              className="flex gap-2 font-mono text-[11.5px] leading-snug text-white/80"
            >
              <span aria-hidden className="text-white/65">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatsTab({
  stats,
}: {
  stats: Readonly<Record<string, unknown>>;
}) {
  const entries = Object.entries(stats);
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-center font-mono text-[11px] text-white/65">
        no stats recorded
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <table className="w-full font-mono text-[11.5px]">
        <tbody>
          {entries.map(([k, v], i) => (
            <tr
              key={k}
              className={
                i % 2 === 0 ? "bg-white/[0.03]" : "bg-transparent"
              }
            >
              <td className="w-2/5 border-b border-white/5 px-3 py-2 align-top font-mono text-[10.5px] uppercase tracking-widest text-white/55">
                {prettyKey(k)}
              </td>
              <td className="border-b border-white/5 px-3 py-2 align-top text-white/85">
                {renderStatValue(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineTab({
  timeline,
  accent,
}: {
  timeline: readonly { readonly date: string; readonly event: string }[];
  accent: string;
}) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-center font-mono text-[11px] text-white/65">
        no timeline entries
      </div>
    );
  }
  return (
    <ol className="relative space-y-3 border-l border-white/10 pl-4">
      {timeline.map((t, i) => (
        <li key={`${t.date}-${i}`} className="relative">
          <span
            className="absolute -left-[21px] top-1.5 inline-block h-2.5 w-2.5 rounded-full border"
            style={{ backgroundColor: accent, borderColor: `${accent}aa` }}
            aria-hidden
          />
          <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/55">
            {t.date}
          </div>
          <div className="font-mono text-[12px] leading-snug text-white/85">
            {t.event}
          </div>
        </li>
      ))}
    </ol>
  );
}

function SourcesTab({
  sources,
}: {
  sources: readonly { readonly label: string; readonly url: string }[];
}) {
  if (sources.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/15 px-3 py-4 text-center font-mono text-[11px] text-white/65">
        no sources recorded
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {sources.map((s) => (
        <li
          key={s.url}
          className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
        >
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="block font-mono text-[12px] text-cyan-300/85 hover:text-cyan-200 hover:underline"
          >
            {s.label}
          </a>
          <div className="mt-0.5 truncate font-mono text-[10px] text-white/65">
            {s.url}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function prettyKey(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\bkm\b/g, "km")
    .replace(/\bkg\b/g, "kg")
    .replace(/\bw\b/g, "W")
    .replace(/\bau\b/g, "AU")
    .replace(/\bkms\b/g, "km/s")
    .replace(/\bc\b/g, "°C")
    .replace(/\bm2\b/g, "m²");
}

function renderStatValue(v: unknown): React.ReactNode {
  if (v == null) return "—";
  if (Array.isArray(v)) {
    return (
      <ul className="space-y-0.5">
        {v.map((item, i) => (
          <li key={i} className="text-white/85">
            {typeof item === "string" || typeof item === "number"
              ? String(item)
              : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === "number") {
    return v.toLocaleString();
  }
  if (typeof v === "string" || typeof v === "boolean") {
    return String(v);
  }
  return <code className="text-white/70">{JSON.stringify(v)}</code>;
}

import { useEffect, useState, type ReactElement } from "react";

import { fetchGroundedSummary, type GroundedSummary } from "../info/grounded-summary";
import { getPulsarAudio } from "../sonification/pulsar-audio";
import {
  getSettings,
  onSettingsChange,
  updateSettings,
  type ExplanationTier,
} from "../../lib/settings";
import { pickWhyMatters, type TieredText } from "../data/object-citations";
import type { CollectionItem } from "../../lib/collections";
import { AddToCollectionMenu } from "./CollectionsPanel";

/**
 * Unified inspector card. Shared between Universe Mode, Solar Flight, and
 * (future) Galactic Mode. Sky Atlas keeps its SIMBAD-driven `SkyInfoPanel`.
 *
 * Sections are typed so each renderer can pick the right layout without a
 * runtime "what is this?" check. All sections start expanded; clicking the
 * header toggles. The card lives floating on the right, glass-morphism
 * styled, and scrolls if its content overflows the viewport.
 */

export type InfoSection =
  | { kind: "identification"; rows: Array<[string, string]> }
  | { kind: "physical"; rows: Array<[string, string]> }
  | { kind: "orbit"; rows: Array<[string, string]> }
  | { kind: "spectral"; rows: Array<[string, string]> }
  | { kind: "location"; rows: Array<[string, string]> }
  | { kind: "overview"; text: string }
  | { kind: "facts"; items: string[] }
  | { kind: "links"; items: Array<{ label: string; href: string }> }
  | {
      kind: "image";
      url: string;
      thumbUrl?: string;
      credit: string;
      caption?: string;
    }
  | {
      kind: "grounded";
      /** Lookup name(s) for Wikipedia REST. */
      candidates: string[];
    }
  | {
      kind: "sonification";
      /** Period in seconds. Click rate = 1/periodSec. */
      periodSec: number;
      /** Optional human label, e.g. "Crab Pulsar (B0531+21)". */
      label?: string;
      /** Friendly note if the period implies an audible-rate pulsar. */
      note?: string;
    }
  | {
      kind: "lightcone";
      /** World-space (LY) center. */
      centerLY: { x: number; y: number; z: number };
      /** Object name, used as fallback overlay title. */
      name: string;
      /** Optional curated preset that pre-fills the years slider. */
      currentAgeYears?: number;
    }
  | {
      kind: "references";
      /**
       * Editorial "why does this matter?" copy. Either a single string
       * (rendered for every tier) or a tiered record. The InfoPanel
       * surfaces a Curious / Student / Expert toggle when tiered text
       * is provided.
       */
      whyMatters: TieredText;
      /** Optional archive shortcuts — SIMBAD, Wikipedia, NASA ADS. */
      archives?: Array<{ label: string; href: string }>;
      /** Optional landmark primary papers. */
      primarySources?: Array<{ title: string; url: string; year: number }>;
    };

export type InfoPayload = {
  kind:
    | "Sun"
    | "Planet"
    | "Moon"
    | "Star"
    | "DSO"
    | "Mission"
    | "Satellite"
    | "Landmark"
    | "Pulsar";
  name: string;
  subtitle?: string;
  sections: InfoSection[];
};

type Props = {
  payload: InfoPayload;
  onClose: () => void;
  onFlyHere?: () => void;
  onSurface?: () => void;
  /** Universe Mode: open the light cone tool centered on this object. */
  onStartLightCone?: (centerLY: { x: number; y: number; z: number }, name: string, currentAgeYears?: number) => void;
};

const SECTION_TITLE: Record<InfoSection["kind"], string> = {
  identification: "identification",
  physical: "physical",
  orbit: "orbit",
  spectral: "spectral",
  location: "location",
  overview: "overview",
  facts: "facts",
  links: "links",
  image: "image",
  grounded: "✨ ai summary",
  sonification: "sonification",
  lightcone: "light cone",
  references: "why it matters",
};

const KIND_TONE: Record<InfoPayload["kind"], string> = {
  Sun: "text-amber-300/90",
  Planet: "text-emerald-300/90",
  Moon: "text-slate-300/90",
  Star: "text-cyan-300/90",
  DSO: "text-violet-300/90",
  Mission: "text-orange-300/90",
  Satellite: "text-cyan-300/90",
  Landmark: "text-fuchsia-300/90",
  Pulsar: "text-amber-200/90",
};

const KIND_TO_COLLECTION_TYPE: Record<
  InfoPayload["kind"],
  CollectionItem["type"]
> = {
  Sun: "body",
  Planet: "body",
  Moon: "body",
  Star: "star",
  DSO: "dso",
  Mission: "exotic",
  Satellite: "exotic",
  Landmark: "exotic",
  Pulsar: "exotic",
};

export function InfoPanel({
  payload,
  onClose,
  onFlyHere,
  onSurface,
  onStartLightCone,
}: Props): ReactElement {
  return (
    <aside
      className="pointer-events-auto absolute right-3 top-20 z-30 flex w-[min(360px,92vw)] flex-col rounded-xl border border-white/10 bg-space-950/95 shadow-2xl backdrop-blur"
      style={{ maxHeight: "calc(100vh - 9rem)" }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div>
          <div
            className={`font-mono text-[10px] uppercase tracking-[0.25em] ${
              KIND_TONE[payload.kind]
            }`}
          >
            {payload.kind}
          </div>
          <div className="font-display text-xl text-white">{payload.name}</div>
          {payload.subtitle && (
            <div className="mt-0.5 font-mono text-[11px] text-white/55">
              {payload.subtitle}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {payload.sections.map((section, i) =>
          section.kind === "image" ? (
            <ImageHero key={`image-${i}`} section={section} />
          ) : (
            <Section
              key={`${section.kind}-${i}`}
              title={SECTION_TITLE[section.kind]}
              section={section}
              onStartLightCone={onStartLightCone}
              objectName={payload.name}
            />
          ),
        )}
      </div>

      <div className="flex gap-2 border-t border-white/5 px-4 py-3">
        {onFlyHere && (
          <button
            type="button"
            onClick={onFlyHere}
            className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/25"
          >
            ↗ fly here
          </button>
        )}
        {onSurface && (
          <button
            type="button"
            onClick={onSurface}
            className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-amber-200 hover:bg-amber-400/25"
          >
            🪐 surface
          </button>
        )}
        <AddToCollectionMenu
          item={{
            type: KIND_TO_COLLECTION_TYPE[payload.kind],
            id: payload.name,
            label: payload.name,
          }}
        />
      </div>
    </aside>
  );
}

function Section({
  title,
  section,
  onStartLightCone,
  objectName,
}: {
  title: string;
  section: InfoSection;
  onStartLightCone?: Props["onStartLightCone"];
  objectName: string;
}): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-3 last:mb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-white/5 pb-1 font-mono text-[10px] uppercase tracking-widest text-white/45 hover:text-white/70"
      >
        <span>{title}</span>
        <span className="text-white/30">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-2">
          {renderBody(section, onStartLightCone, objectName)}
        </div>
      )}
    </section>
  );
}

function renderBody(
  section: InfoSection,
  onStartLightCone: Props["onStartLightCone"],
  objectName: string,
): ReactElement {
  switch (section.kind) {
    case "identification":
    case "physical":
    case "orbit":
    case "spectral":
    case "location":
      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          {section.rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                {k}
              </dt>
              <dd className="text-white/85">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "overview":
      return (
        <p className="text-sm leading-relaxed text-white/75">{section.text}</p>
      );
    case "facts":
      return (
        <ul className="list-disc space-y-1 pl-4 text-[12.5px] text-white/75">
          {section.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "links":
      return (
        <div className="flex flex-wrap gap-2">
          {section.items.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-cyan-300 hover:bg-white/10 hover:text-cyan-200"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      );
    case "image":
      return <ImageHero section={section} />;
    case "grounded":
      return <GroundedBody candidates={section.candidates} />;
    case "sonification":
      return <SonificationBlock section={section} />;
    case "lightcone":
      return (
        <LightConeBlock
          section={section}
          objectName={objectName}
          onStart={onStartLightCone}
        />
      );
    case "references":
      return <ReferencesBlock section={section} />;
  }
}

/**
 * Visual tokens for the Curious / Student / Expert pill toggle.
 * Curious is gold (warm, inviting), Student cyan (default, neutral),
 * Expert violet (precision). Kept inline so the block stays self-contained.
 */
const TIER_TONE: Record<
  ExplanationTier,
  { active: string; inactive: string; label: string }
> = {
  curious: {
    active: "border-amber-300/60 bg-amber-300/15 text-amber-100",
    inactive: "border-white/10 bg-white/5 text-white/55 hover:bg-white/10",
    label: "curious",
  },
  student: {
    active: "border-cyan-400/60 bg-cyan-400/15 text-cyan-100",
    inactive: "border-white/10 bg-white/5 text-white/55 hover:bg-white/10",
    label: "student",
  },
  expert: {
    active: "border-violet-400/60 bg-violet-400/15 text-violet-100",
    inactive: "border-white/10 bg-white/5 text-white/55 hover:bg-white/10",
    label: "expert",
  },
};

const TIERS: readonly ExplanationTier[] = ["curious", "student", "expert"];

function ReferencesBlock({
  section,
}: {
  section: Extract<InfoSection, { kind: "references" }>;
}): ReactElement {
  const [tier, setTier] = useState<ExplanationTier>(
    getSettings().explanationTier,
  );
  useEffect(() => onSettingsChange((s) => setTier(s.explanationTier)), []);
  const tiered = typeof section.whyMatters !== "string";
  const body = pickWhyMatters(section.whyMatters, tier);
  return (
    <div className="space-y-3">
      {tiered && (
        <div
          role="tablist"
          aria-label="Explanation tier"
          className="flex gap-1"
        >
          {TIERS.map((t) => {
            const active = t === tier;
            const tone = TIER_TONE[t];
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => updateSettings({ explanationTier: t })}
                className={`flex-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest transition ${
                  active ? tone.active : tone.inactive
                }`}
              >
                {tone.label}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-sm leading-relaxed text-white/80">{body}</p>
      {section.archives && section.archives.length > 0 && (
        <div>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-white/35">
            archives
          </div>
          <div className="flex flex-wrap gap-1.5">
            {section.archives.map((a) => (
              <a
                key={a.href}
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300 hover:bg-white/10 hover:text-cyan-200"
              >
                {a.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      {section.primarySources && section.primarySources.length > 0 && (
        <div>
          <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-white/35">
            primary sources
          </div>
          <ul className="space-y-1.5">
            {section.primarySources.map((s) => (
              <li key={s.url} className="text-[12px] leading-snug text-white/70">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  {s.title}
                </a>
                <span className="ml-1 font-mono text-[10px] text-white/40">
                  ({s.year})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroundedBody({
  candidates,
}: {
  candidates: string[];
}): ReactElement {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: GroundedSummary }
    | { status: "empty" }
  >({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    const primary = candidates[0] ?? "";
    fetchGroundedSummary(primary, candidates)
      .then((data) => {
        if (cancelled) return;
        if (!data) return setState({ status: "empty" });
        setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "empty" });
      });
    return () => {
      cancelled = true;
    };
  }, [candidates]);
  if (state.status === "loading") {
    return (
      <div className="space-y-1.5">
        <div className="h-2 w-full animate-pulse rounded bg-white/10" />
        <div className="h-2 w-[92%] animate-pulse rounded bg-white/10" />
        <div className="h-2 w-[78%] animate-pulse rounded bg-white/10" />
        <div className="mt-2 font-mono text-[10px] text-white/40">
          Fetching summary…
        </div>
      </div>
    );
  }
  if (state.status === "empty") {
    return (
      <div className="font-mono text-[11px] text-white/40">
        No public archive entry found.
      </div>
    );
  }
  const { summary, sources } = state.data;
  return (
    <div className="space-y-2">
      <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
        {summary}
      </p>
      <div>
        <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-white/35">
          sources
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300 hover:bg-white/10"
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      </div>
      <div className="font-mono text-[9px] text-white/30">
        Aggregated from public archives. May be outdated.
      </div>
    </div>
  );
}

function SonificationBlock({
  section,
}: {
  section: Extract<InfoSection, { kind: "sonification" }>;
}): ReactElement {
  const [playing, setPlaying] = useState(false);
  const [enabled, setEnabled] = useState(getSettings().sonificationOn);
  useEffect(() => {
    return onSettingsChange((s) => setEnabled(s.sonificationOn));
  }, []);
  useEffect(() => {
    return () => {
      const audio = getPulsarAudio();
      if (audio.isPlaying()) audio.stop();
    };
  }, []);
  const audibleHz = section.periodSec > 0 ? 1 / section.periodSec : 0;
  const periodLabel =
    section.periodSec >= 1
      ? `${section.periodSec.toFixed(3)} s`
      : `${(section.periodSec * 1000).toFixed(2)} ms`;
  const handle = (): void => {
    const audio = getPulsarAudio();
    if (playing) {
      audio.stop();
      setPlaying(false);
      return;
    }
    audio.play(section.periodSec, {
      volume: getSettings().sonificationVolume,
    });
    setPlaying(true);
  };
  return (
    <div className="space-y-2 text-[12.5px]">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          period
        </dt>
        <dd className="text-white/85">{periodLabel}</dd>
        <dt className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          click rate
        </dt>
        <dd className="text-white/85">{audibleHz.toFixed(2)} Hz</dd>
      </dl>
      {section.note && (
        <div className="font-mono text-[10px] text-amber-200/80">{section.note}</div>
      )}
      <button
        type="button"
        onClick={handle}
        disabled={!enabled}
        className={`mt-1 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
          !enabled
            ? "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
            : playing
              ? "border-rose-400/50 bg-rose-400/15 text-rose-200 hover:bg-rose-400/25"
              : "border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
        }`}
      >
        {!enabled
          ? "🔇 sonification disabled"
          : playing
            ? "■ stop"
            : "▶ listen"}
      </button>
    </div>
  );
}

function LightConeBlock({
  section,
  objectName,
  onStart,
}: {
  section: Extract<InfoSection, { kind: "lightcone" }>;
  objectName: string;
  onStart: Props["onStartLightCone"];
}): ReactElement {
  if (!onStart) {
    return (
      <div className="font-mono text-[10px] text-white/35">
        light cone tool unavailable in this view
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() =>
        onStart(section.centerLY, section.name || objectName, section.currentAgeYears)
      }
      className="flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/50 bg-cyan-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
    >
      ◎ start light cone here
    </button>
  );
}


function ImageHero({
  section,
}: {
  section: Extract<InfoSection, { kind: "image" }>;
}): ReactElement | null {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  const src = section.thumbUrl ?? section.url;
  return (
    <a
      href={section.url}
      target="_blank"
      rel="noreferrer"
      className="mb-3 block overflow-hidden rounded-md border border-white/10 bg-black/40"
      title={section.caption ?? "Open full image"}
    >
      <div className="relative">
        <img
          src={src}
          alt={section.caption ?? "Object imagery"}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-48 w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 font-mono text-[10px] leading-snug text-white/85">
          {section.caption && (
            <div className="truncate text-white/95">{section.caption}</div>
          )}
          <div className="truncate text-white/70">{section.credit}</div>
        </div>
      </div>
    </a>
  );
}

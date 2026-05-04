import { useEffect, useState, type ReactElement } from "react";

import { fetchGroundedSummary, type GroundedSummary } from "../info/grounded-summary";

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
    | "Landmark";
  name: string;
  subtitle?: string;
  sections: InfoSection[];
};

type Props = {
  payload: InfoPayload;
  onClose: () => void;
  onFlyHere?: () => void;
  onSurface?: () => void;
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
};

export function InfoPanel({
  payload,
  onClose,
  onFlyHere,
  onSurface,
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
            />
          ),
        )}
      </div>

      {(onFlyHere || onSurface) && (
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
        </div>
      )}
    </aside>
  );
}

function Section({
  title,
  section,
}: {
  title: string;
  section: InfoSection;
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
      {open && <div className="mt-2">{renderBody(section)}</div>}
    </section>
  );
}

function renderBody(section: InfoSection): ReactElement {
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
  }
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

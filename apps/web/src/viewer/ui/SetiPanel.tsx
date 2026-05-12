import { useMemo, useState } from "react";
import {
  BIOSIGNATURE_CANDIDATES,
  FERMI_PARADOX_ANSWERS,
  INTERSTELLAR_VISITORS,
  SETI_CANDIDATES,
  UAP_CASES,
  type SignalStatus,
} from "../seti/seti-data";
import {
  DRAKE_PRESETS,
  drakeEquation,
  type DrakeParams,
} from "../seti/drake";

/**
 * 👽 "Are we alone?" panel — five-tab popover surfacing an
 * evidence-based catalog of SETI candidates, interstellar visitors,
 * biosignature claims, an interactive Drake equation, and notable UAP
 * cases with their official explanations.
 *
 * Editorial stance: skeptical. UAP entries lead with the official /
 * prosaic explanation; status badges are honest ("explained" /
 * "disputed" / "unexplained"); sources are peer-reviewed or
 * AARO/NASA/SETI-Institute/Mick-West.
 *
 * Exported but NOT mounted by this commit — the parent wires it in
 * separately.
 */

type Tab = "signals" | "visitors" | "biosignatures" | "drake" | "uap";

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "signals", label: "Signals" },
  { id: "visitors", label: "Visitors" },
  { id: "biosignatures", label: "Biosignatures" },
  { id: "drake", label: "Drake" },
  { id: "uap", label: "UAP" },
];

export function SetiPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("signals");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Are we alone? — SETI, biosignatures, Drake, UAP"
        aria-label="Are we alone?"
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>👽</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          SETI
        </span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(440px,94vw)] max-h-[78vh] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="flex items-baseline justify-between border-b border-white/5 px-3 pb-2 pt-3">
            <div className="font-display text-sm text-white/90">
              Are we alone?
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              evidence-based
            </div>
          </div>
          <nav className="flex gap-1 border-b border-white/5 px-2 py-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
                  tab === t.id
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="max-h-[60vh] overflow-y-auto">
            {tab === "signals" && <SignalsTab />}
            {tab === "visitors" && <VisitorsTab />}
            {tab === "biosignatures" && <BiosignaturesTab />}
            {tab === "drake" && <DrakeTab />}
            {tab === "uap" && <UapTab />}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared bits

function StatusBadge({ status }: { status: SignalStatus }) {
  const cls =
    status === "explained"
      ? "border-rose-400/40 bg-rose-400/10 text-rose-200"
      : status === "unexplained"
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
        : "border-amber-400/40 bg-amber-400/10 text-amber-200";
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[10px] uppercase tracking-widest text-sky-300/70 hover:text-sky-200"
    >
      {children}
    </a>
  );
}

function flyToSky(raDeg: number, decDeg: number) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set("ra", raDeg.toFixed(3));
  params.set("dec", decDeg.toFixed(3));
  window.location.hash = `#viewer?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Signals

function SignalsTab() {
  return (
    <ul className="divide-y divide-white/5">
      {SETI_CANDIDATES.map((s) => (
        <li key={s.id} className="px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13px] text-white">
                {s.name}{" "}
                <span className="font-mono text-[10px] text-white/40">
                  · {s.year}
                </span>
              </div>
              <div className="font-mono text-[10px] text-white/45">
                {s.instrument}
              </div>
            </div>
            <StatusBadge status={s.status} />
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-white/70">
            {s.currentBestExplanation}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <ExternalLink href={s.link}>source</ExternalLink>
            {s.raDeg !== null && s.decDeg !== null && (
              <button
                type="button"
                onClick={() => flyToSky(s.raDeg as number, s.decDeg as number)}
                className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                fly to {s.raDeg.toFixed(1)}°, {s.decDeg.toFixed(1)}°
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Visitors

function VisitorsTab() {
  return (
    <ul className="divide-y divide-white/5">
      {INTERSTELLAR_VISITORS.map((v) => (
        <li key={v.id} className="px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-display text-[13px] text-white">
              {v.name}{" "}
              <span className="font-mono text-[10px] text-white/40">
                · {v.year}
              </span>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-white/50">
              e = {v.eccentricity.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] text-white/55">
            <div>peri: {v.perihelionDate}</div>
            <div>v∞: {v.vInfinityKmS.toFixed(1)} km/s</div>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-white/70">
            {v.peculiarity}
          </p>
          <div className="mt-1.5">
            <ExternalLink href={v.link}>source</ExternalLink>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Biosignatures

function BiosignaturesTab() {
  return (
    <ul className="divide-y divide-white/5">
      {BIOSIGNATURE_CANDIDATES.map((b) => (
        <li key={b.id} className="px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13px] text-white">
                {b.name}
              </div>
              <div className="font-mono text-[10px] text-white/45">
                {b.hostStarType} · {b.distanceLY.toFixed(1)} ly ·{" "}
                {b.massEarth.toFixed(2)} M⊕
              </div>
            </div>
            <span className="shrink-0 rounded border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-sky-200">
              {b.insolationFraction.toFixed(2)} S⊕
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-white/70">
            {b.biosignatureStatus}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-violet-200">
              JWST: {b.jwstStatus}
            </span>
            <ExternalLink href={b.link}>source</ExternalLink>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Drake

type SliderSpec = {
  key: keyof DrakeParams;
  label: string;
  /** log10 of min, max. */
  logMin: number;
  logMax: number;
  unit?: string;
};

const DRAKE_SLIDERS: ReadonlyArray<SliderSpec> = [
  { key: "Rstar", label: "R★ · star-formation rate", logMin: -1, logMax: 2, unit: "/yr" },
  { key: "fp", label: "fp · stars with planets", logMin: -3, logMax: 0 },
  { key: "ne", label: "ne · habitable planets / system", logMin: -3, logMax: 1 },
  { key: "fl", label: "fl · life arises", logMin: -6, logMax: 0 },
  { key: "fi", label: "fi · intelligence arises", logMin: -6, logMax: 0 },
  { key: "fc", label: "fc · emits detectable signal", logMin: -6, logMax: 0 },
  { key: "L", label: "L · civilisation lifetime", logMin: 1, logMax: 9, unit: "yr" },
];

function DrakeTab() {
  const [params, setParams] = useState<DrakeParams>(DRAKE_PRESETS["drake-1961"]);
  const N = useMemo(() => drakeEquation(params), [params]);

  const set = (k: keyof DrakeParams, v: number) =>
    setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          N = R★ · fp · ne · fl · fi · fc · L
        </div>
        <div className="font-display text-base text-emerald-200">
          N ≈ {formatScientific(N)}
        </div>
      </div>
      <div className="mb-3 flex gap-1.5">
        {(["pessimist", "drake-1961", "modern"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setParams(DRAKE_PRESETS[id])}
            className="flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {id === "drake-1961" ? "Drake 1961" : id}
          </button>
        ))}
      </div>
      <div className="space-y-2.5">
        {DRAKE_SLIDERS.map((s) => {
          const v = params[s.key];
          const logV = Math.log10(Math.max(1e-12, v));
          return (
            <div key={s.key}>
              <div className="flex items-baseline justify-between">
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/55">
                  {s.label}
                </label>
                <span className="font-mono text-[10px] text-white/80">
                  {formatScientific(v)}
                  {s.unit ? ` ${s.unit}` : ""}
                </span>
              </div>
              <input
                type="range"
                min={s.logMin}
                max={s.logMax}
                step={0.05}
                value={logV}
                onChange={(e) => {
                  const next = Math.pow(10, parseFloat(e.target.value));
                  set(s.key, next);
                }}
                className="mt-0.5 w-full accent-emerald-400"
                aria-label={s.label}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-white/45">
        The Drake equation is a framework, not a measurement. Every term
        spans orders of magnitude in the literature — small input changes
        move N by many decades.
      </p>
    </div>
  );
}

function formatScientific(x: number): string {
  if (!Number.isFinite(x) || x === 0) return "0";
  const abs = Math.abs(x);
  if (abs >= 0.01 && abs < 1000) {
    return abs >= 10 ? x.toFixed(0) : x.toFixed(2);
  }
  const exp = Math.floor(Math.log10(abs));
  const mantissa = x / Math.pow(10, exp);
  const sup = toSuperscript(exp);
  return `${mantissa.toFixed(1)} × 10${sup}`;
}

function toSuperscript(n: number): string {
  const map: Record<string, string> = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return String(n)
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

// ---------------------------------------------------------------------------
// UAP — skeptical framing

function UapTab() {
  return (
    <div>
      <div className="border-b border-white/5 bg-amber-400/[0.04] px-3 py-2 text-[11px] leading-snug text-amber-100/80">
        Documented cases reviewed against current evidence. Most have prosaic
        explanations — see source links. Inclusion here is not endorsement.
      </div>
      <ul className="divide-y divide-white/5">
        {UAP_CASES.map((c) => (
          <li key={c.id} className="px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-display text-[13px] text-white">
                  {c.name}{" "}
                  <span className="font-mono text-[10px] text-white/40">
                    · {c.year}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  {c.location}
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="mt-1.5">
              <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                Official explanation
              </div>
              <p className="text-[12px] leading-snug text-white/80">
                {c.officialExplanation}
              </p>
            </div>
            <div className="mt-1.5">
              <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                Original claim
              </div>
              <p className="text-[11px] leading-snug text-white/55">
                {c.originalClaim}
              </p>
            </div>
            <div className="mt-1.5">
              <ExternalLink href={c.link}>source</ExternalLink>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-3 py-2 text-[10px] text-white/35">
        Fermi paradox · named answers in the literature:{" "}
        {FERMI_PARADOX_ANSWERS.map((a) => a.name).join(" · ")}
      </div>
    </div>
  );
}

/**
 * Multi-wavelength toggle.
 *
 * Bottom-sheet pattern: chips for each available wavelength, a cross-fade
 * slider when an overlay is active, plus toggles for the 88 IAU
 * constellation lines and the equatorial / ecliptic / galactic grid.
 */

import { useEffect, useState } from "react";
import {
  listRuntimeSurveys,
  subscribeRuntimeSurveys,
} from "../power-user/custom-hips";
import type { Survey } from "../hips/surveys";

const LAYERS = [
  { id: "halpha" as const, label: "Hα", sub: "Finkbeiner H-alpha", accent: "rose" },
  { id: "2mass" as const, label: "2MASS", sub: "near-IR", accent: "orange" },
  { id: "spitzer" as const, label: "Spitzer", sub: "MIPS 24μm mid-IR", accent: "amber" },
  { id: "allwise" as const, label: "WISE", sub: "mid-IR", accent: "red" },
  { id: "iris" as const, label: "IRAS", sub: "IRIS color far-IR", accent: "orange" },
  { id: "akari" as const, label: "AKARI", sub: "FIS far-IR color", accent: "amber" },
  { id: "herschel" as const, label: "Herschel", sub: "PACS far-IR (partial sky)", accent: "rose" },
  { id: "galex" as const, label: "UV", sub: "GALEX AIS", accent: "blue" },
  {
    id: "integral" as const,
    label: "X-ray",
    sub: "INTEGRAL hard X-ray",
    accent: "purple",
  },
  { id: "rass" as const, label: "ROSAT", sub: "RASS soft X-ray 0.1-2.4 keV", accent: "purple" },
  {
    id: "erosita" as const,
    label: "eROSITA",
    sub: "eROSITA-DE DR1 RGB (German half-sky)",
    accent: "purple",
  },
  { id: "nvss" as const, label: "Radio", sub: "NVSS 1.4 GHz", accent: "teal" },
  { id: "hi4pi" as const, label: "HI 21cm", sub: "HI4PI neutral hydrogen", accent: "teal" },
  { id: "fermi" as const, label: "γ-ray", sub: "Fermi LAT 1-300 GeV", accent: "lime" },
  { id: "planck" as const, label: "CMB", sub: "Planck HFI sub-mm", accent: "fuchsia" },
  { id: "gaia" as const, label: "Gaia", sub: "Gaia DR3 Bp·G·Rp flux", accent: "cyan" },
];

const ACCENT: Record<string, { active: string; idle: string }> = {
  orange: {
    active: "border-orange-400/40 bg-orange-400/15 text-orange-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  amber: {
    active: "border-amber-400/40 bg-amber-400/15 text-amber-200",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  red: {
    active: "border-red-400/40 bg-red-400/15 text-red-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  rose: {
    active: "border-rose-400/40 bg-rose-400/15 text-rose-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  blue: {
    active: "border-sky-400/40 bg-sky-400/15 text-sky-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  purple: {
    active: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  teal: {
    active: "border-teal-400/40 bg-teal-400/15 text-teal-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  lime: {
    active: "border-lime-400/40 bg-lime-400/15 text-lime-300",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  fuchsia: {
    active: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
  cyan: {
    active: "border-cyan-400/40 bg-cyan-400/15 text-cyan-200",
    idle: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
  },
};

export type SkyCultureChoice =
  | "western"
  | "chinese"
  | "polynesian"
  | "lakota";

type Props = {
  overlayId: string | null;
  overlayMix: number;
  onSetOverlay: (id: string | null) => void;
  onSetMix: (mix: number) => void;
  constellationsVisible: boolean;
  onToggleConstellations: () => void;
  skyCulture: SkyCultureChoice;
  onSetSkyCulture: (id: SkyCultureChoice) => void;
  coordGridVisible: boolean;
  onToggleCoordGrid: () => void;
  starLabelsVisible: boolean;
  onToggleStarLabels: () => void;
  spacecraftVisible: boolean;
  onToggleSpacecraft: () => void;
  exoplanetsVisible: boolean;
  onToggleExoplanets: () => void;
  cosmicLandmarksVisible: boolean;
  onToggleCosmicLandmarks: () => void;
  pulsarsVisible: boolean;
  onTogglePulsars: () => void;
  projection: "3d" | "aitoff";
  onToggleProjection: () => void;
};

export function WavelengthBar({
  overlayId,
  overlayMix,
  onSetOverlay,
  onSetMix,
  constellationsVisible,
  onToggleConstellations,
  skyCulture,
  onSetSkyCulture,
  coordGridVisible,
  onToggleCoordGrid,
  starLabelsVisible,
  onToggleStarLabels,
  spacecraftVisible,
  onToggleSpacecraft,
  exoplanetsVisible,
  onToggleExoplanets,
  cosmicLandmarksVisible,
  onToggleCosmicLandmarks,
  pulsarsVisible,
  onTogglePulsars,
  projection,
  onToggleProjection,
}: Props) {
  const [runtimeSurveys, setRuntimeSurveys] = useState<Survey[]>(
    listRuntimeSurveys(),
  );
  useEffect(
    () => subscribeRuntimeSurveys(setRuntimeSurveys),
    [],
  );
  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-space-950/80 px-3 py-2 backdrop-blur md:flex-row">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        wavelength
      </span>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onSetOverlay(null)}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            overlayId === null
              ? "border-plasma-500/40 bg-plasma-500/15 text-plasma-400"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
        >
          visible
        </button>
        {LAYERS.map((l) => {
          const active = overlayId === l.id;
          const cls = ACCENT[l.accent] ?? ACCENT.orange!;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSetOverlay(active ? null : l.id)}
              className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
                active ? cls.active : cls.idle
              }`}
              title={`${l.label} ${l.sub}`}
            >
              {l.label}
            </button>
          );
        })}
        {/* User-pasted HiPS — appended after the curated list with a
            "user" badge so users can distinguish their own surveys. */}
        {runtimeSurveys.map((s) => {
          const active = overlayId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSetOverlay(active ? null : s.id)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
                active
                  ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
              title={`${s.label} · ${s.attribution}`}
            >
              <span className="truncate max-w-[7rem]">{s.label}</span>
              <span className="rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-1 text-[8px] uppercase tracking-widest text-cyan-200">
                user
              </span>
            </button>
          );
        })}
      </div>

      {overlayId && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            mix
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={overlayMix}
            onChange={(e) => onSetMix(parseFloat(e.target.value))}
            className="h-1 w-32 accent-plasma-500"
            aria-label="Wavelength cross-fade"
          />
          <span className="font-mono text-[10px] text-white/50 w-8 text-right">
            {Math.round(overlayMix * 100)}%
          </span>
        </div>
      )}

      <div className="hidden md:block h-4 w-px bg-white/10" />

      <button
        type="button"
        onClick={onToggleProjection}
        className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
          projection === "aitoff"
            ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
        }`}
        title="Toggle 2D Aitoff projection of the whole sky"
      >
        {projection === "aitoff" ? "2D" : "3D"}
      </button>

      <div className="hidden md:block h-4 w-px bg-white/10" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleConstellations}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            constellationsVisible
              ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle 88 IAU constellation lines (c)"
        >
          ✦ lines
        </button>
        {constellationsVisible && (
          <select
            value={skyCulture}
            onChange={(e) =>
              onSetSkyCulture(e.target.value as SkyCultureChoice)
            }
            aria-label="Sky culture"
            title="Switch between sky cultures — line figures from Western (IAU), Chinese, Polynesian, or Lakota traditions"
            className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-violet-200 outline-none transition hover:bg-violet-500/20"
          >
            <option value="western">IAU</option>
            <option value="chinese">Chinese</option>
            <option value="polynesian">Polynesian</option>
            <option value="lakota">Lakota</option>
          </select>
        )}
        <button
          type="button"
          onClick={onToggleCoordGrid}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            coordGridVisible
              ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle equatorial / ecliptic / galactic grid (g)"
        >
          ⌖ grid
        </button>
        <button
          type="button"
          onClick={onToggleStarLabels}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            starLabelsVisible
              ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle bright-star name labels (n)"
        >
          ★ names
        </button>
        <button
          type="button"
          onClick={onToggleSpacecraft}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            spacecraftVisible
              ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle spacecraft markers — Voyager 1/2, Pioneers, NH, JWST (s)"
        >
          ◇ craft
        </button>
        <button
          type="button"
          onClick={onToggleExoplanets}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            exoplanetsVisible
              ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle 6,278 confirmed exoplanet host systems (x)"
        >
          ⊙ exo
        </button>
        <button
          type="button"
          onClick={onToggleCosmicLandmarks}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            cosmicLandmarksVisible
              ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle named exotic objects — Sgr A*, M87*, Crab Pulsar, GW170817 etc (z)"
        >
          ◉ exotic
        </button>
        <button
          type="button"
          onClick={onTogglePulsars}
          className={`rounded-md border px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition ${
            pulsarsVisible
              ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          }`}
          title="Toggle 3,927 pulsars from SIMBAD (p)"
        >
          ⚡ pulsars
        </button>
      </div>
    </div>
  );
}

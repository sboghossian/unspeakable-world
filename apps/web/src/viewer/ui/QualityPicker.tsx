import { useEffect, useState } from "react";

import { useSettings, type AppSettings } from "../../lib/settings";
import {
  autoDetectQuality,
  getActivePreset,
  subscribeQuality,
  type QualityPreset,
} from "../../lib/quality";

/**
 * ✨ QualityPicker — 5-way radio (Auto / Low / Medium / High / Ultra)
 * that drives the global `quality` setting and shows the resolved
 * preset's actual numbers below the buttons.
 *
 * Lives inside SettingsPanel under its own "Quality preset" section.
 * Only the device-pixel-ratio cap is live-updateable on the running
 * renderer; the other knobs (MSAA, gaia bucket, segments) need a
 * remount, surfaced as a one-line "reload to apply" hint.
 */

type Choice = AppSettings["quality"];

const CHOICES: ReadonlyArray<{ id: Choice; label: string; hint: string }> = [
  { id: "auto", label: "Auto", hint: "device-detected" },
  { id: "low", label: "Low", hint: "mobile-friendly" },
  { id: "medium", label: "Medium", hint: "laptop / iPad" },
  { id: "high", label: "High", hint: "discrete GPU" },
  { id: "ultra", label: "Ultra", hint: "workstation" },
];

export function QualityPicker() {
  const [settings, update] = useSettings();
  const [active, setActive] = useState<QualityPreset>(() => getActivePreset());

  useEffect(() => subscribeQuality(setActive), []);

  // Compute the resolved id to highlight: "auto" defers to autoDetectQuality.
  const resolvedAuto =
    settings.quality === "auto" ? autoDetectQuality() : settings.quality;

  return (
    <div className="mb-2">
      <div className="mb-1 grid grid-cols-5 gap-1">
        {CHOICES.map((c) => {
          const isSelected = settings.quality === c.id;
          // Highlight the bucket that "auto" lands on so the user sees the
          // implicit choice. Slightly different tone vs explicit selection.
          const isAutoResolved =
            settings.quality === "auto" && c.id === resolvedAuto;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => update({ quality: c.id })}
              className={`rounded-md border px-1.5 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
                isSelected
                  ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                  : isAutoResolved
                    ? "border-cyan-400/20 bg-cyan-400/5 text-cyan-200/80"
                    : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
              }`}
              aria-pressed={isSelected}
              title={c.hint}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="mt-1 font-mono text-[9px] text-white/35">
        {settings.quality === "auto"
          ? `auto → ${active.label.toLowerCase()}`
          : "manual override"}
        {" · DPR + render distance + HiPS cap apply live · MSAA, star count, gaia density, procedural galaxy detail need a reload"}
      </div>
      <Stats preset={active} />
    </div>
  );
}

function Stats({ preset }: { preset: QualityPreset }) {
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 rounded-md border border-white/5 bg-white/5 px-2 py-1.5 font-mono text-[10px] text-white/55">
      <Stat label="dpr" value={preset.dpr.toFixed(2)} />
      <Stat label="stars" value={fmtCount(preset.starCount)} />
      <Stat label="gaia" value={fmtCount(preset.gaiaDensityBucket)} />
      <Stat label="segments" value={String(preset.planetSegments)} />
      <Stat
        label="msaa"
        value={preset.msaaSamples === 0 ? "off" : `${preset.msaaSamples}×`}
      />
      <Stat
        label="bloom"
        value={preset.bloomEnabled ? preset.bloomStrength.toFixed(1) : "off"}
      />
      <Stat label="hips" value={`≤ N${preset.hipsMaxOrder}`} />
      <Stat label="shadows" value={preset.shadowsEnabled ? "on" : "off"} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="uppercase tracking-widest text-white/35">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

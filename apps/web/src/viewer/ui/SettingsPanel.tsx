import { idb } from "../../lib/idb-cache";
import {
  useSettings,
  type AppSettings,
  type ExplanationTier,
} from "../../lib/settings";

/**
 * ⚙ Shared settings popover.
 *
 * Single panel reused across Sky Atlas, Solar Flight, Universe and Galactic.
 * Reads + writes via {@link useSettings}, so changes propagate to scene code
 * via the same global event bus.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  /** Position. Different scenes anchor differently. */
  anchor?: "left-rail" | "bottom-right";
};

export function SettingsPanel({ open, onClose, anchor = "left-rail" }: Props) {
  const [s, update] = useSettings();
  if (!open) return null;
  const pos =
    anchor === "bottom-right"
      ? "absolute bottom-44 right-3"
      : "absolute left-72 top-32";
  return (
    <div
      className={`pointer-events-auto ${pos} z-30 w-[min(320px,90vw)] rounded-xl border border-white/15 bg-space-950/90 p-3 backdrop-blur`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
          ⚙ settings
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <Section label="Display">
        <Slider
          label="orbit opacity"
          value={s.orbitOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => update({ orbitOpacity: v })}
        />
        <Slider
          label="grid opacity"
          value={s.gridOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => update({ gridOpacity: v })}
        />
        <Slider
          label="star brightness"
          value={s.starBrightness}
          min={0.1}
          max={2}
          step={0.1}
          onChange={(v) => update({ starBrightness: v })}
        />
        <Slider
          label="fly-to duration"
          value={s.flyToDurationSec}
          min={1}
          max={10}
          step={0.5}
          unit="s"
          onChange={(v) => update({ flyToDurationSec: v })}
        />
      </Section>

      <Section label="Quality">
        <div className="mb-2">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            fps cap
          </div>
          <div className="flex gap-1">
            {([30, 60, 120] as const).map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => update({ fpsCap: cap })}
                className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                  s.fpsCap === cap
                    ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                    : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          label="standby"
          hint="pause render when tab hidden or idle 60 s"
          on={s.standby}
          onChange={(v) => update({ standby: v })}
        />
      </Section>

      <Section label="Visualization">
        <Toggle
          label="real scale"
          hint="planets shown at physical proportion vs Sun"
          on={s.realScale}
          onChange={(v) => update({ realScale: v })}
        />
        <Toggle
          label="real color"
          hint="catalogue B-V colours, not cosmetic"
          on={s.realColor}
          onChange={(v) => update({ realColor: v })}
        />
        <Toggle
          label="show names"
          hint="planet + star labels"
          on={s.showNames}
          onChange={(v) => update({ showNames: v })}
        />
      </Section>

      <Section label="Explanations">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          reader register
        </div>
        <div className="mb-1 flex gap-1">
          {(["curious", "student", "expert"] as const).map((t) => {
            const active = s.explanationTier === t;
            const tone: Record<ExplanationTier, string> = {
              curious: active
                ? "border-amber-300/60 bg-amber-300/15 text-amber-100"
                : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10",
              student: active
                ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10",
              expert: active
                ? "border-violet-400/60 bg-violet-400/15 text-violet-100"
                : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10",
            };
            return (
              <button
                key={t}
                type="button"
                onClick={() => update({ explanationTier: t })}
                className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-widest transition ${tone[t]}`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="font-mono text-[9px] text-white/35">
          voice for the "why it matters" body in the inspector.
        </div>
      </Section>

      <Section label="Sonification">
        <Toggle
          label="🔊 sonification"
          hint="enable pulsar 'listen' button in inspector"
          on={s.sonificationOn}
          onChange={(v) => update({ sonificationOn: v })}
        />
        <Slider
          label="volume"
          value={s.sonificationVolume}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => update({ sonificationVolume: v })}
        />
      </Section>

      <Section label="Data">
        <button
          type="button"
          onClick={clearLocalCache}
          className="w-full rounded-md border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-left font-mono text-[11px] uppercase tracking-widest text-rose-200 hover:bg-rose-400/20"
        >
          ⌫ clear local cache
        </button>
        <div className="mt-1 font-mono text-[9px] text-white/35">
          wipes localStorage + IndexedDB. you'll lose favourites + tour progress.
        </div>
      </Section>
    </div>
  );
}

async function clearLocalCache(): Promise<void> {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    await idb.clearAll();
  } catch {
    /* ignore */
  }
  window.location.reload();
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 border-t border-white/5 pt-2 first:border-t-0 first:pt-0">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
        {label}
      </div>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {label}
        </div>
        <div className="font-mono text-[10px] text-white/65">
          {value.toFixed(2)}
          {unit ?? ""}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full accent-white/70"
        aria-label={label}
      />
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`mb-1.5 w-full rounded-md border px-2.5 py-1.5 text-left font-mono text-[11px] transition ${
        on
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-widest">{label}</span>
        <span className="text-[10px]">{on ? "on" : "off"}</span>
      </div>
      {hint && (
        <div className="mt-0.5 font-mono text-[9px] text-white/35">{hint}</div>
      )}
    </button>
  );
}

export type { AppSettings };

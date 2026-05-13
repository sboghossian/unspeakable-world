import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn, RADIUS } from "../../lib/design-tokens";
import { idb } from "../../lib/idb-cache";
import {
  DEFAULT_SETTINGS,
  updateSettings,
  useSettings,
  type AppSettings,
  type ExplanationTier,
} from "../../lib/settings";
import { useConsent } from "../../lib/consent";
import { setOptOut } from "../../lib/telemetry";
import { useT } from "../../i18n/hooks";
import { FontPicker } from "./FontPicker";
import { LanguagePicker } from "./LanguagePicker";
import { QualityPicker } from "./QualityPicker";

/**
 * ⚙ Shared settings popover.
 *
 * Single panel reused across Sky Atlas, Solar Flight, Universe and Galactic.
 * Reads + writes via {@link useSettings}, so changes propagate to scene code
 * via the same global event bus.
 *
 * Information architecture (wave-7):
 *   1. Performance — quality preset, renderer backend, fps cap, standby
 *   2. Display     — sky projection, font, density (orbit/grid/star),
 *                    real-scale/real-color/names, fly-to duration
 *   3. Audio       — sonification toggle + volume + global mute
 *   4. Identity    — language, explanation register (sky culture stays
 *                    on the wavelength bar — it's per-scene UI state)
 *   5. Power user  — copilot expert config, custom HiPS, FITS, ADQL
 *                    (each lives in its own panel; this group describes
 *                    where to find them rather than duplicating state)
 *   6. Privacy     — telemetry consent, error-tracking consent,
 *                    destructive "clear local data" button
 *
 * Performance + Display are open by default; the rest collapse to one row.
 * Per-group "reset" snaps the fields owned by that group back to their
 * {@link DEFAULT_SETTINGS} value. The global "reset everything" footer
 * wipes localStorage + IndexedDB and reloads. Persistence semantics are
 * unchanged — every write still flows through {@link updateSettings} into
 * the historical `uw.settings.v1` localStorage key.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  /** Position. Different scenes anchor differently. */
  anchor?: "left-rail" | "bottom-right";
};

/** Which group is expanded. Performance + Display default to open. */
type GroupId =
  | "performance"
  | "display"
  | "audio"
  | "identity"
  | "power"
  | "privacy";

const INITIAL_OPEN: Record<GroupId, boolean> = {
  performance: true,
  display: true,
  audio: false,
  identity: false,
  power: false,
  privacy: false,
};

/**
 * Settings keys "owned" by each group. The per-group reset writes
 * {@link DEFAULT_SETTINGS}[k] for every k in the list. Keep these lists
 * authoritative — they double as documentation for which knob lives where.
 */
const GROUP_KEYS: Record<GroupId, ReadonlyArray<keyof AppSettings>> = {
  performance: ["quality", "renderer", "fpsCap", "standby"],
  display: [
    "skyProjection",
    "displayFont",
    "orbitOpacity",
    "gridOpacity",
    "starBrightness",
    "realScale",
    "realColor",
    "showNames",
    "flyToDurationSec",
  ],
  audio: ["sonificationOn", "sonificationVolume", "audioMuted"],
  identity: ["explanationTier"],
  power: [],
  privacy: [],
};

export function SettingsPanel({ open, onClose, anchor = "left-rail" }: Props) {
  const [s, update] = useSettings();
  const [consent, saveConsent] = useConsent();
  const [openMap, setOpenMap] = useState<Record<GroupId, boolean>>(INITIAL_OPEN);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const t = useT();

  // Escape closes the panel — keyboard parity with the X button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus management — focus the first control on open. We don't restore
  // focus on close because the trigger lives in the parent and we don't
  // have its ref; modern callers can call `triggerRef.current?.focus()` in
  // their onClose if needed.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;
  const pos =
    anchor === "bottom-right"
      ? "absolute bottom-44 right-3"
      : "absolute left-72 top-32";

  const toggle = (g: GroupId) =>
    setOpenMap((prev) => ({ ...prev, [g]: !prev[g] }));

  const resetGroup = (g: GroupId): void => {
    const keys = GROUP_KEYS[g];
    if (keys.length === 0) return;
    const partial: Partial<AppSettings> = {};
    for (const k of keys) {
      // Runtime types match DEFAULT_SETTINGS by construction (the key list
      // is hand-curated). TS can't narrow through an indexed write to a
      // heterogeneous record, so we widen via `unknown` here.
      (partial as Record<keyof AppSettings, unknown>)[k] = DEFAULT_SETTINGS[k];
    }
    updateSettings(partial);
  };

  const resetEverything = (): void => {
    const ok = window.confirm(
      "Reset every setting to its default and wipe local cache? This clears your bookmarks, tour progress and saved tours.",
    );
    if (!ok) return;
    void clearLocalCache();
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "pointer-events-auto z-30 w-[min(340px,90vw)] border border-white/15 bg-space-950/90 p-3 backdrop-blur",
        pos,
        RADIUS.lg,
      )}
      role="dialog"
      aria-modal="false"
      aria-label={t("settings.title")}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
          {t("settings.title")}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("settings.close")}
          className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* ─── 1. Performance ─────────────────────────────────────── */}
      <Group
        id="performance"
        label="Performance"
        hint="renderer · quality · fps"
        isOpen={openMap.performance}
        onToggle={toggle}
        onReset={resetGroup}
      >
        <SubLabel>quality preset</SubLabel>
        <QualityPicker />

        <SubLabel>renderer backend</SubLabel>
        <SegBar
          options={[
            { id: "webgl", label: "WebGL2" },
            { id: "auto", label: "Auto" },
            { id: "webgpu", label: "WebGPU" },
          ]}
          value={s.renderer}
          onChange={(v) => update({ renderer: v as AppSettings["renderer"] })}
        />
        <Hint>WebGPU is opt-in · falls back to WebGL2 on failure.</Hint>

        <SubLabel>fps cap</SubLabel>
        <div className="mb-2 flex gap-1">
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

        <Toggle
          label="standby"
          hint="pause render when tab hidden or idle 60 s"
          on={s.standby}
          onChange={(v) => update({ standby: v })}
        />
      </Group>

      {/* ─── 2. Display ─────────────────────────────────────────── */}
      <Group
        id="display"
        label="Display"
        hint="projection · font · density"
        isOpen={openMap.display}
        onToggle={toggle}
        onReset={resetGroup}
      >
        <SubLabel>sky projection</SubLabel>
        <SegBar
          options={[
            { id: "3d", label: "3D sphere" },
            { id: "aitoff", label: "Aitoff (2D)" },
          ]}
          value={s.skyProjection}
          onChange={(v) =>
            update({ skyProjection: v as AppSettings["skyProjection"] })
          }
        />

        <SubLabel>typography</SubLabel>
        <FontPicker />

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
      </Group>

      {/* ─── 3. Audio ──────────────────────────────────────────── */}
      <Group
        id="audio"
        label="Audio"
        hint="sonification · master mute"
        isOpen={openMap.audio}
        onToggle={toggle}
        onReset={resetGroup}
      >
        <Toggle
          label="🔇 global mute"
          hint="silences every audio surface — overrides sonification"
          on={s.audioMuted}
          onChange={(v) => update({ audioMuted: v })}
        />
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
      </Group>

      {/* ─── 4. Identity ───────────────────────────────────────── */}
      <Group
        id="identity"
        label="Identity"
        hint="language · register"
        isOpen={openMap.identity}
        onToggle={toggle}
        onReset={resetGroup}
      >
        <SubLabel>{t("label.language")}</SubLabel>
        <LanguagePicker />
        <Hint>scaffold ~50 strings (more coming).</Hint>

        <SubLabel>reader register</SubLabel>
        <div className="mb-1 flex gap-1">
          {(["curious", "student", "expert"] as const).map((tier) => {
            const active = s.explanationTier === tier;
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
                key={tier}
                type="button"
                onClick={() => update({ explanationTier: tier })}
                className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-widest transition ${tone[tier]}`}
              >
                {tier}
              </button>
            );
          })}
        </div>
        <Hint>voice for the "why it matters" body in the inspector.</Hint>
        <Hint>
          sky culture lives on the wavelength bar — switch between Western
          (IAU), Chinese, Polynesian, Lakota and more there.
        </Hint>
      </Group>

      {/* ─── 5. Power user ─────────────────────────────────────── */}
      <Group
        id="power"
        label="Power user"
        hint="copilot · custom HiPS · FITS · ADQL"
        isOpen={openMap.power}
        onToggle={toggle}
        onReset={resetGroup}
      >
        <Hint>
          These tools open their own panels — they don't live in the global
          settings store. Use the top-bar Copilot button, and the Custom
          HiPS / FITS uploader / ADQL console entries under the power-user
          drawer.
        </Hint>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <PassiveBadge>copilot expert · top-bar</PassiveBadge>
          <PassiveBadge>custom HiPS · drawer</PassiveBadge>
          <PassiveBadge>FITS uploader · drawer</PassiveBadge>
          <PassiveBadge>ADQL console · drawer</PassiveBadge>
        </div>
      </Group>

      {/* ─── 6. Privacy ────────────────────────────────────────── */}
      <Group
        id="privacy"
        label="Privacy"
        hint="opt-in analytics · crash reports · local data"
        isOpen={openMap.privacy}
        onToggle={toggle}
        onReset={null}
      >
        <Hint>
          We never collect personal data. Toggle either signal off any time.
        </Hint>
        <Toggle
          label="usage analytics"
          hint="anonymous events about which layers you toggle"
          on={consent?.telemetry === true}
          onChange={(v) => {
            saveConsent({
              telemetry: v,
              errorTracking: consent?.errorTracking ?? false,
            });
            setOptOut(!v);
          }}
        />
        <Toggle
          label="crash reports"
          hint="sends stack trace + browser version when something throws"
          on={consent?.errorTracking === true}
          onChange={(v) =>
            saveConsent({
              telemetry: consent?.telemetry ?? false,
              errorTracking: v,
            })
          }
        />
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm(
              "Clear local cache? You'll lose bookmarks + tour progress.",
            );
            if (ok) void clearLocalCache();
          }}
          className="mt-1 w-full rounded-md border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-left font-mono text-[11px] uppercase tracking-widest text-rose-200 hover:bg-rose-400/20"
        >
          ⌫ clear local data
        </button>
        <Hint>wipes localStorage + IndexedDB.</Hint>
      </Group>

      {/* ─── Footer: global reset ──────────────────────────────── */}
      <div className="mt-2 border-t border-white/5 pt-2">
        <button
          type="button"
          onClick={resetEverything}
          className="w-full rounded-md border border-rose-400/40 bg-rose-400/5 px-2.5 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-rose-200/85 hover:bg-rose-400/15"
        >
          ⟲ reset everything
        </button>
      </div>
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

/* ─── Sub-components ─────────────────────────────────────────── */

function Group({
  id,
  label,
  hint,
  isOpen,
  onToggle,
  onReset,
  children,
}: {
  id: GroupId;
  label: string;
  hint?: string;
  isOpen: boolean;
  onToggle: (g: GroupId) => void;
  /** `null` opts the group out of the per-group reset affordance. */
  onReset: ((g: GroupId) => void) | null;
  children: ReactNode;
}) {
  return (
    <div className="mb-2 rounded-md border border-white/5 bg-white/[0.015]">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          className="flex flex-1 items-center justify-between text-left"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/65">
            {isOpen ? "▾" : "▸"} {label}
          </span>
          {hint && !isOpen && (
            <span className="ml-2 truncate font-mono text-[9px] text-white/30">
              {hint}
            </span>
          )}
        </button>
        {onReset && isOpen && (
          <button
            type="button"
            onClick={() => onReset(id)}
            className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/55 hover:bg-white/10 hover:text-white/80"
            title={`Reset ${label.toLowerCase()} to defaults`}
          >
            reset
          </button>
        )}
      </div>
      {isOpen && <div className="px-2 pb-2 pt-1">{children}</div>}
    </div>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 font-mono text-[9px] leading-snug text-white/35">
      {children}
    </div>
  );
}

function PassiveBadge({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/5 px-1.5 py-1 font-mono text-[9px] uppercase tracking-widest text-white/45">
      {children}
    </div>
  );
}

function SegBar({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2 flex gap-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-md border px-2 py-1 font-mono text-[11px] transition ${
              active
                ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
            }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
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

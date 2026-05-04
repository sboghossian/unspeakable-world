import { useState } from "react";
import type { UniverseState } from "../universe/universe-scene";
import { SettingsPanel } from "./SettingsPanel";

type ZoneId = "habitable" | "asteroid" | "frost" | "kuiper" | "oort";

type Scene = {
  flyTo(name: string): void;
  setConstellations(on: boolean): void;
  setCoordGrid(on: boolean): void;
  setStarLabels(on: boolean): void;
  setPulsars(on: boolean): void;
  setExoplanets(on: boolean): void;
  setCosmicLandmarks(on: boolean): void;
  setAsteroids(on: boolean): void;
  setComets(on: boolean): void;
  setInterstellar(on: boolean): void;
  setMoons(on: boolean): void;
  setAurora(on: boolean): void;
  setMission(slug: string, on: boolean): void;
  setAllMissions(on: boolean): void;
  getMissionManifest(): Array<{
    slug: string;
    name: string;
    launch: string;
    color: string;
  }>;
  setOverlay(id: string | null): void;
  setOverlayMix(mix: number): void;
  setSolarZone(zone: ZoneId, on: boolean): void;
  toggleAllSolarZones(): void;
};

type Props = {
  state: UniverseState;
  scene: Scene | null;
  onOpenGuide: () => void;
  onOpenTimeMachine: () => void;
};

const TRAVEL: Array<{ label: string; key: string; tone: string }> = [
  { label: "Sun", key: "Sun", tone: "text-amber-200" },
  { label: "Mercury", key: "Mercury", tone: "text-white/70" },
  { label: "Venus", key: "Venus", tone: "text-amber-100" },
  { label: "Earth", key: "Earth", tone: "text-cyan-200" },
  { label: "Mars", key: "Mars", tone: "text-orange-300" },
  { label: "Jupiter", key: "Jupiter", tone: "text-amber-300" },
  { label: "Saturn", key: "Saturn", tone: "text-amber-200" },
  { label: "Uranus", key: "Uranus", tone: "text-cyan-300" },
  { label: "Neptune", key: "Neptune", tone: "text-blue-300" },
  { label: "Galactic Center", key: "Galactic Center", tone: "text-violet-300" },
  { label: "M31 (Andromeda)", key: "M31", tone: "text-violet-200" },
  { label: "Local Group", key: "Local Group", tone: "text-rose-300" },
];

const WAVES: Array<{ id: string; label: string }> = [
  { id: "halpha", label: "Hα" },
  { id: "2mass", label: "2MASS" },
  { id: "allwise", label: "WISE" },
  { id: "galex", label: "UV" },
  { id: "integral", label: "X-ray" },
  { id: "nvss", label: "Radio" },
  { id: "fermi", label: "γ-ray" },
];

export function LeftRail({ state, scene, onOpenGuide, onOpenTimeMachine }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [open, setOpen] = useState<{
    objects: boolean;
    missions: boolean;
    zones: boolean;
    waves: boolean;
    travel: boolean;
  }>({ objects: true, missions: false, zones: false, waves: false, travel: true });

  if (!scene) return null;

  const layerToggle = (
    on: boolean,
    label: string,
    onClick: () => void,
    hint?: string,
  ) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] uppercase tracking-widest transition ${
        on
          ? "bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/20"
          : "text-white/65 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-300" : "bg-white/25"}`}
        />
        {label}
      </span>
      {hint && (
        <span className="font-mono text-[9px] tracking-wider text-white/30">
          {hint}
        </span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <div className="pointer-events-auto absolute left-3 top-32 z-10 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-space-950/85 p-1.5 backdrop-blur">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expand panel"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          ▶
        </button>
        <button
          type="button"
          onClick={() => {
            setCollapsed(false);
            setOpen((o) => ({ ...o, objects: true }));
          }}
          title="Celestial objects"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          ✦
        </button>
        <button
          type="button"
          onClick={() => {
            setCollapsed(false);
            setOpen((o) => ({ ...o, waves: true }));
          }}
          title="Wavelengths"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          ◐
        </button>
        <button
          type="button"
          onClick={() => {
            setCollapsed(false);
            setOpen((o) => ({ ...o, travel: true }));
          }}
          title="Quick travel"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          🚀
        </button>
        <button
          type="button"
          onClick={onOpenTimeMachine}
          title="Time machine"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          🕰
        </button>
        <button
          type="button"
          onClick={onOpenGuide}
          title="User Guide"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          📖
        </button>
        <button
          type="button"
          onClick={() => {
            setCollapsed(false);
            setSettingsOpen(true);
          }}
          title="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-md text-white/70 hover:bg-white/5 hover:text-white"
        >
          ⚙
        </button>
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute left-3 top-32 bottom-32 z-10 flex w-64 flex-col rounded-xl border border-white/10 bg-space-950/85 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          Universe
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse"
          className="rounded-md p-1 font-mono text-xs text-white/50 hover:bg-white/5 hover:text-white"
        >
          ◀
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-2">
        <Section
          label="Celestial objects"
          open={open.objects}
          onToggle={() =>
            setOpen((o) => ({ ...o, objects: !o.objects }))
          }
        >
          {layerToggle(
            state.constellationsOn,
            "✦ Constellations",
            () => scene.setConstellations(!state.constellationsOn),
            "L",
          )}
          {layerToggle(
            state.coordGridOn,
            "⌖ Reference grid",
            () => scene.setCoordGrid(!state.coordGridOn),
            "G",
          )}
          {layerToggle(state.starLabelsOn, "★ Star names", () =>
            scene.setStarLabels(!state.starLabelsOn),
          )}
          {layerToggle(state.pulsarsOn, "⚡ Pulsars (3,927)", () =>
            scene.setPulsars(!state.pulsarsOn),
          )}
          {layerToggle(state.exoplanetsOn, "⊙ Exoplanets (6,278)", () =>
            scene.setExoplanets(!state.exoplanetsOn),
          )}
          {layerToggle(state.cosmicLandmarksOn, "◉ Exotic objects", () =>
            scene.setCosmicLandmarks(!state.cosmicLandmarksOn),
          )}
          {layerToggle(state.asteroidsOn, "💫 Asteroids (~100k)", () =>
            scene.setAsteroids(!state.asteroidsOn),
          )}
          {layerToggle(state.cometsOn, "☄ Comets", () =>
            scene.setComets(!state.cometsOn),
          )}
          {layerToggle(state.interstellarOn, "🪐 Interstellar", () =>
            scene.setInterstellar(!state.interstellarOn),
          )}
          {layerToggle(state.moonsOn, "🌙 Moons", () =>
            scene.setMoons(!state.moonsOn),
          )}
          {layerToggle(
            state.auroraOn,
            "🌌 Aurora",
            () => scene.setAurora(!state.auroraOn),
            "Y",
          )}
        </Section>

        <MissionsSection
          open={open.missions}
          onToggle={() =>
            setOpen((o) => ({ ...o, missions: !o.missions }))
          }
          manifest={scene.getMissionManifest()}
          missions={state.missions}
          onToggleMission={(slug, on) => scene.setMission(slug, on)}
          onToggleAll={(on) => scene.setAllMissions(on)}
        />

        <Section
          label="Solar System zones"
          hint="K"
          open={open.zones}
          onToggle={() => setOpen((o) => ({ ...o, zones: !o.zones }))}
        >
          {layerToggle(state.zones.habitable, "🌱 Habitable zone", () =>
            scene.setSolarZone("habitable", !state.zones.habitable),
          )}
          {layerToggle(state.zones.asteroid, "💫 Asteroid belt", () =>
            scene.setSolarZone("asteroid", !state.zones.asteroid),
          )}
          {layerToggle(state.zones.frost, "❄ Frost line", () =>
            scene.setSolarZone("frost", !state.zones.frost),
          )}
          {layerToggle(state.zones.kuiper, "🪨 Kuiper belt", () =>
            scene.setSolarZone("kuiper", !state.zones.kuiper),
          )}
          {layerToggle(state.zones.oort, "☁ Oort cloud", () =>
            scene.setSolarZone("oort", !state.zones.oort),
          )}
        </Section>

        <Section
          label="Wavelengths"
          open={open.waves}
          onToggle={() => setOpen((o) => ({ ...o, waves: !o.waves }))}
        >
          <button
            type="button"
            onClick={() => scene.setOverlay(null)}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
              state.overlayId === null
                ? "bg-plasma-500/15 text-plasma-300"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>Visible (DSS2)</span>
          </button>
          {WAVES.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() =>
                scene.setOverlay(state.overlayId === w.id ? null : w.id)
              }
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
                state.overlayId === w.id
                  ? "bg-amber-400/15 text-amber-200"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{w.label}</span>
            </button>
          ))}
          {state.overlayId && (
            <div className="mt-2 px-2.5">
              <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-white/40">
                Cross-fade
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={state.overlayMix}
                onChange={(e) =>
                  scene.setOverlayMix(parseFloat(e.target.value))
                }
                className="h-1 w-full accent-amber-400"
                aria-label="Wavelength cross-fade"
              />
            </div>
          )}
        </Section>

        <Section
          label="Quick travel"
          open={open.travel}
          onToggle={() =>
            setOpen((o) => ({ ...o, travel: !o.travel }))
          }
        >
          <div className="grid grid-cols-2 gap-1">
            {TRAVEL.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => scene.flyTo(t.key)}
                className={`rounded-md px-2 py-1 text-left font-mono text-[10.5px] uppercase tracking-wider transition hover:bg-white/5 ${t.tone}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="border-t border-white/5 p-2">
        <button
          type="button"
          onClick={onOpenTimeMachine}
          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          <span>🕰 Time machine</span>
          <span className="text-white/30">›</span>
        </button>
        <button
          type="button"
          onClick={onOpenGuide}
          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          <span>📖 User Guide</span>
          <span className="text-white/30">↗</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
            settingsOpen
              ? "bg-white/10 text-white"
              : "text-white/65 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span>⚙ Settings</span>
          <span className="text-white/30">{settingsOpen ? "✕" : "›"}</span>
        </button>
      </div>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function MissionsSection({
  open,
  onToggle,
  manifest,
  missions,
  onToggleMission,
  onToggleAll,
}: {
  open: boolean;
  onToggle: () => void;
  manifest: Array<{ slug: string; name: string; launch: string; color: string }>;
  missions: Record<string, boolean>;
  onToggleMission: (slug: string, on: boolean) => void;
  onToggleAll: (on: boolean) => void;
}) {
  const items = manifest.slice(0, 8);
  const allOn = items.length > 0 && items.every((m) => missions[m.slug]);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45 transition hover:text-white/80"
      >
        <span>Missions</span>
        <span className={`transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 pb-2">
          <button
            type="button"
            onClick={() => onToggleAll(!allOn)}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
              allOn
                ? "bg-orange-400/15 text-orange-200 hover:bg-orange-400/20"
                : "text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${allOn ? "bg-orange-300" : "bg-white/25"}`}
              />
              All missions
            </span>
          </button>
          {items.map((m) => {
            const on = !!missions[m.slug];
            const year = m.launch.slice(0, 4);
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => onToggleMission(m.slug, !on)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left font-mono text-[11px] uppercase tracking-widest transition ${
                  on
                    ? "bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/20"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  {m.name}
                </span>
                <span className="font-mono text-[9px] tracking-wider text-white/30">
                  ({year})
                </span>
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="px-2.5 py-1.5 font-mono text-[10px] text-white/35">
              loading…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  open,
  onToggle,
  children,
  hint,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45 transition hover:text-white/80"
      >
        <span className="flex items-center gap-2">
          <span>{label}</span>
          {hint && (
            <span className="font-mono text-[9px] tracking-wider text-white/30">
              {hint}
            </span>
          )}
        </span>
        <span className={`transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && <div className="flex flex-col gap-0.5 pb-2">{children}</div>}
    </div>
  );
}

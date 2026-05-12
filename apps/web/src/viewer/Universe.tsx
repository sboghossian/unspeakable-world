import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import {
  UniverseScene,
  type UniverseState,
  type UniverseHit,
} from "./universe/universe-scene";
import { TimeStrip } from "./ui/TimeStrip";
import { EventsPanel } from "./ui/EventsPanel";
import { SkyTonightPanel } from "./ui/SkyTonightPanel";
import { SpaceWeatherPanel } from "./ui/SpaceWeatherPanel";
import { NeoPanel } from "./ui/NeoPanel";
import { TonightSky } from "./ui/TonightSky";
import { SearchBar } from "./ui/SearchBar";
import { SnapshotButton } from "./ui/SnapshotButton";
import { ShareButton } from "./ui/ShareButton";
import { BookmarksPanel } from "./ui/BookmarksPanel";
import { ColorLegend } from "./ui/ColorLegend";
import { LeftRail } from "./ui/LeftRail";
import { InfoPanel } from "./ui/InfoPanel";
import {
  SceneBottomHud,
  formatDistanceLY,
} from "./ui/SceneBottomHud";
import { TopBarActions } from "./ui/TopBarActions";
import { AchievementsPanel } from "./ui/AchievementsPanel";
import { MeasurePanel } from "./ui/MeasurePanel";
import { SurpriseButton } from "./ui/SurpriseButton";
import { ShortcutsOverlay } from "./ui/ShortcutsOverlay";
import { ReportBugButton } from "./ui/ReportBugButton";
import { unlock } from "../lib/achievements";
import {
  LightConeControls,
  type LightConePreset,
} from "./ui/LightConeControls";
import { SearchIndex, type SearchEntry } from "./search/search-index";
import { addBookmark } from "../lib/bookmarks";

const TimeMachinePanel = lazy(() =>
  import("./ui/TimeMachinePanel").then((m) => ({ default: m.TimeMachinePanel })),
);

/**
 * 🌌 Universe Mode — single seamless scene from Earth to the Cosmic Web.
 *
 * One Three.js scene with two coordinate frames (Solar in AU, Galactic
 * in LY). The camera lives at world-origin and the frames re-anchor each
 * tick. Layer visibility cross-fades based on distance from the Sun, so
 * zooming out from a planet smoothly hands off to the Milky Way disk and
 * then to the cosmic web.
 */

type Props = {
  onExit: () => void;
};

const DEFAULT_STATE: UniverseState = {
  trackingTarget: null,
  cameraLogicalPos: { x: 26000, y: 7.9e-5, z: 7.9e-5 },
  distFromSunLY: 1.1e-4,
  speedLY: 4e-6,
  yaw: Math.PI,
  pitch: -0.55,
  scaleLabel: "Inner Solar System",
  time: new Date(),
  tier: "Solar",
  skyTilesVisible: true,
  overlayId: null,
  overlayMix: 0,
  constellationsOn: false,
  coordGridOn: false,
  starLabelsOn: false,
  pulsarsOn: false,
  exoplanetsOn: false,
  cosmicLandmarksOn: false,
  playing: true,
  rate: 86400,
  asteroidsOn: false,
  cometsOn: false,
  interstellarOn: false,
  moonsOn: false,
  missions: {},
  zones: {
    habitable: false,
    asteroid: false,
    frost: false,
    kuiper: false,
    oort: false,
  },
  auroraOn: false,
  lightConeOn: false,
  lightConeCenter: null,
  lightConeYears: 1000,
  lightConeOpacity: 0.35,
  lightConeTargetName: null,
};

export function Universe({ onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<UniverseScene | null>(null);
  const [state, setState] = useState<UniverseState>(DEFAULT_STATE);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [inspect, setInspect] = useState<UniverseHit | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [observer, setObserver] = useState<{ lat: number; lon: number } | null>(
    () => {
      try {
        const raw = localStorage.getItem("uw:observer");
        if (raw) {
          const parsed = JSON.parse(raw) as { lat: number; lon: number };
          if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon))
            return parsed;
        }
      } catch {
        /* ignore */
      }
      return null;
    },
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new UniverseScene(canvas);
    sceneRef.current = scene;
    scene.setOnClick((hit) => setInspect(hit));
    const unsubscribe = scene.subscribe(setState);
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // First-light achievement on mount.
  useEffect(() => {
    unlock("first-light");
  }, []);

  // Cosmologist achievement: distFromSunLY > 1 Mly is well into the
  // cosmic-web tier.
  useEffect(() => {
    if (state.distFromSunLY > 1_000_000) unlock("cosmologist");
  }, [state.distFromSunLY]);

  // Multi-wavelength achievement: cross-fade slider engaged at > 5%.
  useEffect(() => {
    if (state.overlayId && state.overlayMix > 0.05) unlock("multi-wavelength");
  }, [state.overlayId, state.overlayMix]);

  // Global `?` opens the shortcuts overlay; `Esc` closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
      if (e.key === "Escape") setShortcutsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Hotkeys: `K` zone overlays, `Y` aurora, `T` tracking on last target.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      if (e.key === "k" || e.key === "K") {
        sceneRef.current?.toggleAllSolarZones();
        return;
      }
      if (e.key === "y" || e.key === "Y") {
        const on = sceneRef.current && !state.auroraOn;
        sceneRef.current?.setAurora(!!on);
        return;
      }
      if (e.key === "t" || e.key === "T") {
        sceneRef.current?.toggleTrackingOnFocus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.auroraOn]);

  // Hash camera state — read on mount, write debounced on change.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const params = parseUniverseHash(window.location.hash);
    if (params.cx !== null && params.cy !== null && params.cz !== null) {
      scene.setCameraLogical(params.cx, params.cy, params.cz, params.yaw, params.pitch);
    }
    if (params.zones) scene.setZonesFromCsv(params.zones);
    if (params.missions) scene.setMissionsFromCsv(params.missions);
    if (params.track) scene.setTrackingTarget(params.track);
  }, []);

  useEffect(() => {
    let timer = 0;
    const handle = window.setInterval(() => {
      // Debounce-style: only write at most every 500 ms by checking elapsed.
      if (timer && Date.now() - timer < 500) return;
      timer = Date.now();
      const hash = buildUniverseHash(state);
      if (window.location.hash !== `#${hash}`) {
        window.history.replaceState(null, "", `#${hash}`);
      }
    }, 500);
    return () => window.clearInterval(handle);
  }, [state]);

  // Build the search index once mounted.
  useEffect(() => {
    const idx = new SearchIndex();
    idx.setDynamicProvider(() => {
      const PLANETS: Array<{ name: string; mag: number; detail: string }> = [
        { name: "Sun", mag: -26.7, detail: "G2V star" },
        { name: "Moon", mag: -12.7, detail: "Earth's moon" },
        { name: "Mercury", mag: 0.5, detail: "innermost planet" },
        { name: "Venus", mag: -4, detail: "morning / evening star" },
        { name: "Earth", mag: -3.86, detail: "home" },
        { name: "Mars", mag: 0, detail: "the red planet" },
        { name: "Jupiter", mag: -2.5, detail: "gas giant + Galilean moons" },
        { name: "Saturn", mag: 0.5, detail: "ringed planet" },
        { name: "Uranus", mag: 5.7, detail: "ice giant" },
        { name: "Neptune", mag: 7.8, detail: "outermost planet" },
      ];
      const out: SearchEntry[] = PLANETS.map((p) => ({
        id: `planet:${p.name}`,
        label: p.name,
        kind: "planet",
        detail: `mag ${p.mag.toFixed(1)} · ${p.detail}`,
        // direction vector unused in Universe Mode — flyTo uses name string.
        direction: new Vector3(0, 0, 1),
        mag: p.mag,
      }));
      // Plus a few galactic targets that flyTo recognises.
      out.push(
        {
          id: "galactic:Sgr A*",
          label: "Sgr A*",
          kind: "dso",
          detail: "supermassive black hole · galactic center",
          direction: new Vector3(0, 0, 1),
        },
        {
          id: "galactic:Galactic Center",
          label: "Galactic Center",
          kind: "dso",
          detail: "fly to the heart of the Milky Way",
          direction: new Vector3(0, 0, 1),
        },
        {
          id: "galactic:M31",
          label: "M31 (Andromeda)",
          kind: "dso",
          detail: "nearest large galaxy · 2.54 Mly",
          direction: new Vector3(0, 0, 1),
        },
        {
          id: "galactic:Local Group",
          label: "Local Group",
          kind: "dso",
          detail: "Milky Way + Andromeda + 50+ galaxies",
          direction: new Vector3(0, 0, 1),
        },
      );
      return out;
    });
    void idx
      .loadStaticCatalogs()
      .then(() => setSearchIndex(idx))
      .catch((err) => console.warn("[universe-search] load failed", err));
  }, []);

  void useMemo;

  return (
    <div className="relative h-full w-full bg-[#020415]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 h-full w-full focus:outline-none"
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ← exit
          </button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-200/80 backdrop-blur">
            🌌 universe — {state.tier}
          </div>
          <SearchBar
            index={searchIndex}
            onSelect={(entry: SearchEntry) => {
              const m = entry.id.match(/^(planet|galactic):(.+)$/);
              if (m && m[2]) sceneRef.current?.flyTo(m[2]);
              else if (entry.label) {
                // Fallback: try name as fly target.
                sceneRef.current?.flyTo(entry.label);
              }
            }}
          />
          <SnapshotButton
            onCapture={() => {
              const c = canvasRef.current;
              return c ? c.toDataURL("image/png") : null;
            }}
          />
          <ShareButton onPrepare={() => buildUniverseHash(state)} />
          <BookmarksPanel />
          <button
            type="button"
            onClick={() => {
              const hash = buildUniverseHash(state);
              window.history.replaceState(null, "", `#${hash}`);
              addBookmark({
                title: state.scaleLabel,
                url: window.location.href,
                mode: "universe",
              });
            }}
            title="Save the current view as a bookmark"
            className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 font-mono text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ★ save
          </button>
          {state.tier === "Solar" &&
            (state.scaleLabel === "Earth Vicinity" ||
              state.scaleLabel === "Inner Solar System") && (
              <a
                href="#surface/earth"
                title="Land on Earth — high-detail textured 3D surface"
                className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 backdrop-blur transition hover:bg-amber-400/25"
              >
                🪐 surfaces
              </a>
            )}
        </div>

        <div className="pointer-events-auto flex max-w-[60vw] flex-wrap items-center justify-end gap-1.5">
          <EventsPanel
            open={eventsOpen}
            onOpenChange={setEventsOpen}
            onFlyToBody={(name) => sceneRef.current?.flyTo(name)}
          />
          <NeoPanel />
          <SkyTonightPanel observer={observer} />
          <SpaceWeatherPanel observer={observer} />
          <TonightSky
            location={observer}
            onLocationFix={(lat, lon) => {
              setObserver({ lat, lon });
              try {
                localStorage.setItem(
                  "uw:observer",
                  JSON.stringify({ lat, lon }),
                );
              } catch {
                /* ignore */
              }
            }}
            onZenith={() => sceneRef.current?.flyTo("Sun")}
          />
          <SurpriseButton onPick={(name) => sceneRef.current?.flyTo(name)} />
          <MeasurePanel scene={sceneRef.current} />
          <AchievementsPanel />
          <TopBarActions />
        </div>
      </div>

      {/* Left rail — sectioned navigation panel (layers, wavelengths, travel) */}
      <LeftRail
        state={state}
        scene={sceneRef.current}
        onOpenGuide={() => {
          window.location.hash = "#guide";
        }}
        onOpenTimeMachine={() => setTimeMachineOpen(true)}
      />

      {timeMachineOpen && (
        <Suspense fallback={null}>
          <TimeMachinePanel
            open={timeMachineOpen}
            scene={sceneRef.current}
            now={state.time}
            onClose={() => setTimeMachineOpen(false)}
          />
        </Suspense>
      )}

      {/* Cinematic readout (DISTANCE FROM SUN / vicinity / SCREEN SCALE) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[6] flex justify-center">
        <SceneBottomHud
          topLabel="Distance from Sun"
          distance={formatDistanceLY(state.distFromSunLY)}
          vicinity={state.scaleLabel}
          // Universe scene's PerspectiveCamera vfov is 50°; tan(25°) ≈ 0.466.
          // `distFromSunLY` is approximately the camera's distance to the
          // Sun, which doubles as a reasonable "distance to focus" proxy
          // at galactic scales.
          screenScale={formatDistanceLY(state.distFromSunLY * 0.933)}
        />
      </div>

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip label="speed" value={`${fmtDist(state.speedLY)}/s`} />
        </div>
        <TimeStrip
          time={state.time}
          playing={state.playing}
          rate={state.rate}
          onPlayToggle={() => sceneRef.current?.setPlaying(!state.playing)}
          onRateChange={(r) => sceneRef.current?.setTimeRate(r)}
          onTimeChange={(t) => sceneRef.current?.setTime(t)}
        />
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          drag · look · wheel · zoom (shift = fine, ⌘/ctrl = WASD speed) ·
          W A S D · move · 1-8 · planet · ` home · B GC · N M31 · Q/E · up/down
        </div>
      </div>

      {/* Inspector card — unified InfoPanel */}
      {inspect && (
        <InfoPanel
          payload={inspect.payload}
          onClose={() => setInspect(null)}
          onFlyHere={() => sceneRef.current?.flyTo(inspect.name)}
          onSurface={
            inspect.name === "Earth" ||
            inspect.name === "Mars" ||
            inspect.name === "Moon"
              ? () => {
                  window.location.hash = `#surface/${inspect.name.toLowerCase()}`;
                }
              : undefined
          }
          onStartLightCone={(centerLY, name, currentAgeYears) => {
            sceneRef.current?.setLightCone(centerLY, name);
            if (currentAgeYears && currentAgeYears > 0) {
              sceneRef.current?.setLightConeYears(currentAgeYears);
            }
          }}
        />
      )}

      <LightConeControls
        open={state.lightConeOn}
        targetName={state.lightConeTargetName}
        years={state.lightConeYears}
        opacity={state.lightConeOpacity}
        onYearsChange={(y) => sceneRef.current?.setLightConeYears(y)}
        onOpacityChange={(o) => sceneRef.current?.setLightConeOpacity(o)}
        onPreset={(p: LightConePreset) => {
          // Presets fire the cone from the Sun in case nothing is centered.
          // If a center is already set, just update the years.
          if (!state.lightConeCenter) {
            sceneRef.current?.setLightCone({ x: 26000, y: 0, z: 0 }, p.label);
          }
          sceneRef.current?.setLightConeYears(p.ageYears);
        }}
        onStop={() => sceneRef.current?.setLightCone(null)}
      />


      {/* Color legend (bottom-left) */}
      <ColorLegend />

      <ReportBugButton />

      {shortcutsOpen && (
        <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}

type UniverseHashParams = {
  cx: number | null;
  cy: number | null;
  cz: number | null;
  yaw: number;
  pitch: number;
  zones: string | null;
  missions: string | null;
  track: string | null;
};

function parseUniverseHash(hash: string): UniverseHashParams {
  const empty: UniverseHashParams = {
    cx: null,
    cy: null,
    cz: null,
    yaw: NaN,
    pitch: NaN,
    zones: null,
    missions: null,
    track: null,
  };
  const m = hash.match(/^#universe\?(.+)$/);
  if (!m || !m[1]) return empty;
  const params = new URLSearchParams(m[1]);
  const num = (k: string): number => {
    const v = params.get(k);
    if (v === null) return NaN;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const cx = num("cx");
  const cy = num("cy");
  const cz = num("cz");
  return {
    cx: Number.isFinite(cx) ? cx : null,
    cy: Number.isFinite(cy) ? cy : null,
    cz: Number.isFinite(cz) ? cz : null,
    yaw: num("yaw"),
    pitch: num("pitch"),
    zones: params.get("zones"),
    missions: params.get("missions"),
    track: params.get("track"),
  };
}

function buildUniverseHash(state: UniverseState): string {
  const p = new URLSearchParams();
  p.set("cx", state.cameraLogicalPos.x.toPrecision(8));
  p.set("cy", state.cameraLogicalPos.y.toPrecision(8));
  p.set("cz", state.cameraLogicalPos.z.toPrecision(8));
  p.set("yaw", state.yaw.toFixed(4));
  p.set("pitch", state.pitch.toFixed(4));
  const zones = Object.entries(state.zones)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(",");
  if (zones) p.set("zones", zones);
  const missions = Object.entries(state.missions)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(",");
  if (missions) p.set("missions", missions);
  if (state.trackingTarget) p.set("track", state.trackingTarget);
  return `universe?${p.toString()}`;
}

function fmtDist(distLY: number): string {
  if (distLY < 1.5e-5) {
    const m = distLY * 9.461e15; // LY → m
    if (m < 1000) return `${m.toFixed(0)} m`;
    if (m < 1e6) return `${(m / 1000).toFixed(1)} km`;
    return `${(m / 1.496e11).toFixed(3)} AU`;
  }
  if (distLY < 1) return `${(distLY * 63241).toFixed(0)} AU`;
  if (distLY < 1000) return `${distLY.toFixed(2)} LY`;
  if (distLY < 1_000_000) return `${(distLY / 1000).toFixed(2)} kly`;
  if (distLY < 1_000_000_000) return `${(distLY / 1_000_000).toFixed(2)} Mly`;
  return `${(distLY / 1_000_000_000).toFixed(2)} Gly`;
}

function Chip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const cls = accent
    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
    : "border-white/10 bg-space-950/70 text-white/80";
  return (
    <div
      className={`flex items-baseline gap-1.5 rounded-lg border px-3 py-1.5 backdrop-blur ${cls}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

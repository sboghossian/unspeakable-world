import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import {
  UniverseScene,
  type UniverseState,
  type UniverseHit,
} from "./universe/universe-scene";
// Light, always-on chrome — kept eager so the top/bottom bars hydrate
// in one paint. Heavy popovers move to React.lazy below.
import { TimeStrip } from "./ui/TimeStrip";
import { EventsPanel } from "./ui/EventsPanel";
import { SkyTonightPanel } from "./ui/SkyTonightPanel";
import { SpaceWeatherPanel } from "./ui/SpaceWeatherPanel";
import { NeoPanel } from "./ui/NeoPanel";
import { TonightSky } from "./ui/TonightSky";
import { SearchBar } from "./ui/SearchBar";
import { SnapshotButton } from "./ui/SnapshotButton";
import { ShareButton } from "./ui/ShareButton";
import { ColorLegend } from "./ui/ColorLegend";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import {
  DsoDistancesHud,
  type DsoSceneSource,
} from "./ui/DsoDistancesHud";
import { LeftRail } from "./ui/LeftRail";
import {
  SceneBottomHud,
  formatDistanceLY,
} from "./ui/SceneBottomHud";
import { TopBarActions } from "./ui/TopBarActions";
import { GyroButton } from "./ui/GyroButton";
import { MeasurePanel } from "./ui/MeasurePanel";
import { StarTrailsPanel } from "./ui/StarTrailsPanel";
import { SurpriseButton } from "./ui/SurpriseButton";
import { ShortcutsOverlay } from "./ui/ShortcutsOverlay";
import { ReportBugButton } from "./ui/ReportBugButton";
import { SupportRibbon } from "./ui/SupportRibbon";
import { ExploreDrawer, type Group } from "./ui/ExploreDrawer";
import {
  TutorialOverlayV2,
  type TutorialActions,
} from "./ui/TutorialOverlayV2";
import { makeUniverseAdapter } from "./tutor/adapters";
import { useExtraLayersStore } from "./extra-layers/state";
import { TourCard } from "./ui/TourCard";
import { TourRunnerV2, type TourRunnerState } from "./tour/runner-v2";
import { EXTRA_LAYERS } from "./extra-layers/registry";
import { SceneLinkToast } from "./scene-editor/SceneLinkToast";
import {
  applyUniverseCamera,
  captureUniverseCamera,
} from "./scene-editor/universe-bridge";
import { saveScene } from "../lib/scene-editor";
import { useIdle } from "../lib/use-idle";
import { useT } from "../i18n/hooks";
import { unlock } from "../lib/achievements";
import {
  LightConeControls,
  type LightConePreset,
} from "./ui/LightConeControls";
import { SearchIndex, type SearchEntry } from "./search/search-index";
import { addBookmark } from "../lib/bookmarks";
import { log } from "../lib/logger";
import {
  LoadingSkeleton,
  PanelSkeleton,
  useFakeProgress,
} from "./ui/LoadingSkeleton";

/* ────────────────────────────────────────────────────────────────────
 * Lazy panel chunks — same rationale as SolarFlight.tsx. Each panel
 * carries its own static-data island (history-data, myths-data,
 * object-citations, etc.) and the user only ever sees one at a time,
 * so they ship on demand.
 * ──────────────────────────────────────────────────────────────────── */

const TimeMachinePanel = lazy(() =>
  import("./ui/TimeMachinePanel").then((m) => ({ default: m.TimeMachinePanel })),
);
const BookmarksPanel = lazy(() =>
  import("./ui/BookmarksPanel").then((m) => ({ default: m.BookmarksPanel })),
);
const InfoPanel = lazy(() =>
  import("./ui/InfoPanel").then((m) => ({ default: m.InfoPanel })),
);
const AchievementsPanel = lazy(() =>
  import("./ui/AchievementsPanel").then((m) => ({
    default: m.AchievementsPanel,
  })),
);
const MusicPanel = lazy(() =>
  import("./ui/MusicPanel").then((m) => ({ default: m.MusicPanel })),
);
const HistoryPanel = lazy(() =>
  import("./ui/HistoryPanel").then((m) => ({ default: m.HistoryPanel })),
);
const MissionsCatalogPanel = lazy(() =>
  import("./ui/MissionsCatalogPanel").then((m) => ({
    default: m.MissionsCatalogPanel,
  })),
);
const CollectionsPanel = lazy(() =>
  import("./ui/CollectionsPanel").then((m) => ({
    default: m.CollectionsPanel,
  })),
);
const MarsPhotosPanel = lazy(() =>
  import("./ui/MarsPhotosPanel").then((m) => ({ default: m.MarsPhotosPanel })),
);
const ApodArchivePanel = lazy(() =>
  import("./ui/ApodArchivePanel").then((m) => ({
    default: m.ApodArchivePanel,
  })),
);
const JwstPanel = lazy(() =>
  import("./ui/JwstPanel").then((m) => ({ default: m.JwstPanel })),
);
const TransientsPanel = lazy(() =>
  import("./ui/TransientsPanel").then((m) => ({ default: m.TransientsPanel })),
);
const MythsPanel = lazy(() =>
  import("./ui/MythsPanel").then((m) => ({ default: m.MythsPanel })),
);
const NewsPanel = lazy(() =>
  import("./ui/NewsPanel").then((m) => ({ default: m.NewsPanel })),
);
const LessonPanel = lazy(() =>
  import("./ui/LessonPanel").then((m) => ({ default: m.LessonPanel })),
);
const SetiPanel = lazy(() =>
  import("./ui/SetiPanel").then((m) => ({ default: m.SetiPanel })),
);
const ComparePanel = lazy(() =>
  import("./ui/ComparePanel").then((m) => ({ default: m.ComparePanel })),
);
const ExtraLayersPanel = lazy(() =>
  import("./ui/ExtraLayersPanel").then((m) => ({
    default: m.ExtraLayersPanel,
  })),
);
const TutorPanel = lazy(() =>
  import("./ui/TutorPanel").then((m) => ({ default: m.TutorPanel })),
);
const SceneEditorPanel = lazy(() =>
  import("./ui/SceneEditorPanel").then((m) => ({
    default: m.SceneEditorPanel,
  })),
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
  cosmicFlowsOn: false,
  transientsOn: false,
  darkMatterOn: false,
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
  frameTier: "solar",
  focusMode: false,
};

export function Universe({ onExit }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<UniverseScene | null>(null);
  const [state, setState] = useState<UniverseState>(DEFAULT_STATE);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [inspect, setInspect] = useState<UniverseHit | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  // Toggled to true once UniverseScene's first state callback fires —
  // gates the LoadingSkeleton's "Ready" stage. UniverseScene doesn't
  // expose tile/star/dso counts, so the skeleton runs on a short
  // staggered timer (see useFakeProgress).
  const [sceneAlive, setSceneAlive] = useState(false);
  const loadProgress = useFakeProgress(sceneAlive);
  const tourRunnerRef = useRef<TourRunnerV2 | null>(null);
  const [tourState, setTourState] = useState<TourRunnerState>({
    index: null,
    total: 12,
    step: null,
  });
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
    setSceneAlive(true);
    const runner = new TourRunnerV2(scene);
    tourRunnerRef.current = runner;
    const unsubTour = runner.subscribe(setTourState);
    return () => {
      unsubTour();
      runner.exit();
      tourRunnerRef.current = null;
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 🎓 Tutor adapter — broadcasts the live Universe camera (logical pos
  // + yaw/pitch + tracking target). Stable for the panel lifetime;
  // pulls the latest scene state via a ref so we don't re-create the
  // adapter on every render.
  const liveUniverseStateRef = useRef(state);
  useEffect(() => {
    liveUniverseStateRef.current = state;
  }, [state]);
  const tutorAdapter = useMemo(
    () =>
      makeUniverseAdapter(
        () => sceneRef.current,
        () => {
          const s = liveUniverseStateRef.current;
          return {
            cameraLogicalPos: s.cameraLogicalPos,
            yaw: s.yaw,
            pitch: s.pitch,
            trackingTarget: s.trackingTarget,
          };
        },
        {
          getActiveLayers: () => {
            const enabled = useExtraLayersStore.getState().enabled;
            return Object.keys(enabled).filter((id) => enabled[id] === true);
          },
          setActiveLayers: (ids: string[]) => {
            const store = useExtraLayersStore.getState();
            const map: Record<string, boolean> = {};
            for (const id of ids) map[id] = true;
            store.replace(map);
          },
        },
      ),
    [],
  );

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
      if (e.key === "d" || e.key === "D") {
        // d = "distances" — toggle the DSO Distances HUD.
        setDsoHudVisible((v) => !v);
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
    // Camera-preset takes priority over explicit coords so the legacy
    // `#solar` / `#galactic` redirects (which only carry `?preset=…`) land
    // on the right vantage. Explicit coords win when both are present
    // — they're how saved shareable URLs round-trip.
    if (params.cx !== null && params.cy !== null && params.cz !== null) {
      scene.setCameraLogical(params.cx, params.cy, params.cz, params.yaw, params.pitch);
    } else if (params.preset) {
      scene.setPreset(params.preset);
    }
    if (params.zones) scene.setZonesFromCsv(params.zones);
    if (params.missions) scene.setMissionsFromCsv(params.missions);
    if (params.track) scene.setTrackingTarget(params.track);
  }, []);

  // While a scene is playing, suspend the hash-state hydration so the
  // URL hash updater doesn't fight playback for camera authority.
  const [scenePlaying, setScenePlaying] = useState(false);

  // DSO Distances HUD visibility — opt-in. Default OFF. Toggled with D.
  const [dsoHudVisible, setDsoHudVisible] = useState(false);

  useEffect(() => {
    if (scenePlaying) return;
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
  }, [state, scenePlaying]);

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
      .catch((err) => log.warn("[universe-search] load failed", err));
  }, []);

  const idle = useIdle(3500);

  // Drawer groups — every secondary panel lives here. Each group is a
  // tidy row of the existing panel components; when the drawer is
  // closed the children don't mount so the top bar stays uncluttered.
  const exploreGroups: Group[] = [
    {
      label: "Learn",
      children: (
        <>
          <Suspense fallback={<PanelSkeleton />}>
            <LessonPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <MythsPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <ComparePanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <SetiPanel />
          </Suspense>
        </>
      ),
    },
    {
      label: "Live",
      children: (
        <>
          <Suspense fallback={<PanelSkeleton />}>
            <NewsPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <TransientsPanel scene={sceneRef.current} />
          </Suspense>
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
        </>
      ),
    },
    {
      label: "Imagery",
      children: (
        <>
          <Suspense fallback={<PanelSkeleton />}>
            <MarsPhotosPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <ApodArchivePanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <JwstPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <HistoryPanel />
          </Suspense>
        </>
      ),
    },
    {
      label: "Tools",
      children: (
        <>
          <MeasurePanel scene={sceneRef.current} />
          <StarTrailsPanel scene={sceneRef.current} />
          <SurpriseButton onPick={(name) => sceneRef.current?.flyTo(name)} />
          <GyroButton scene={sceneRef.current} />
        </>
      ),
    },
    {
      label: "Catalog",
      children: (
        <>
          <NeoPanel />
          <EventsPanel
            open={eventsOpen}
            onOpenChange={setEventsOpen}
            onFlyToBody={(name) => sceneRef.current?.flyTo(name)}
          />
          <Suspense fallback={<PanelSkeleton />}>
            <MissionsCatalogPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <CollectionsPanel
              onFlyTo={(item) => sceneRef.current?.flyTo(item.id)}
            />
          </Suspense>
        </>
      ),
    },
    {
      label: "Federated data",
      children: (
        <Suspense fallback={<PanelSkeleton />}>
          <ExtraLayersPanel scene={sceneRef.current} />
        </Suspense>
      ),
    },
  ];

  // Focus mode (F key) — hides every overlay so the 3D canvas owns the
  // full viewport. Toggled by the scene's keydown handler; we mirror it
  // through `state.focusMode`. The shared class collapses opacity and
  // pointer events so the user can still drag the canvas underneath.
  const chromeCls = state.focusMode
    ? "opacity-0 pointer-events-none transition-opacity duration-300"
    : "opacity-100 transition-opacity duration-300";

  const layerLabelLookup = useMemo(() => {
    const map = new Map<string, { label: string; icon: string }>();
    for (const e of EXTRA_LAYERS) {
      map.set(e.id, { label: e.meta.label, icon: e.meta.icon });
    }
    return (id: string): { label: string; icon?: string } =>
      map.get(id) ?? { label: id };
  }, []);

  return (
    <div className="relative h-full w-full bg-[#020415]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D Universe viewer — drag to orbit, scroll to zoom, click objects to inspect"
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
      />

      {/* Staged loading skeleton — fades out the moment the scene's
          first state callback fires. Time-driven progress because
          UniverseScene aggregates many catalogs and doesn't expose a
          single tile/star/DSO progress channel. */}
      <LoadingSkeleton progress={loadProgress} />

      {/* Panel-scope error boundary wraps the entire chrome stack so any
          single popover crash (Search, Tonight, Copilot, …) is contained
          without unmounting the 3D scene. The route-level boundary
          upstairs catches scene/canvas crashes; this one catches panels. */}
      <ErrorBoundary scope="panel" label="Universe chrome">

      {/* Bottom-left tier HUD — Universe Mode v2 readout. Always visible
          (even in focus mode) so the user knows which frame is dominant
          and how to get back. Tiny scale chip on the right. */}
      <div
        className={`pointer-events-none absolute bottom-3 left-3 z-[7] flex flex-col items-start gap-1 font-mono text-[11px] uppercase tracking-[0.2em] ${
          state.focusMode ? "opacity-50" : "opacity-100"
        } transition-opacity duration-300`}
      >
        <div className="rounded-md border border-white/10 bg-space-950/70 px-2.5 py-1 text-emerald-200/90 backdrop-blur">
          {state.frameTier === "solar" ? "Solar Tier" : "Galactic Tier"} ·{" "}
          {fmtDistFromSun(state.distFromSunLY)} from Sun
        </div>
        <div className="rounded-md border border-white/5 bg-space-950/50 px-2.5 py-0.5 text-white/50 backdrop-blur">
          {state.frameTier === "solar"
            ? "1 unit = 1 AU"
            : "1 unit = 1 LY"}
        </div>
      </div>

      {/* Top bar — fades to 30% opacity when the user is idle so the
          3D canvas owns the stage. Popovers inside are unaffected.
          Hidden entirely in focus mode (F). */}
      <div
        className={`${chromeCls} pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 ${
          idle ? "opacity-30" : ""
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ← {t("viewer.exit")}
          </button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-200/80 backdrop-blur">
            {t("universe.title")} — {state.tier}
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
          <Suspense fallback={<PanelSkeleton />}>
            <TutorPanel adapter={tutorAdapter} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <BookmarksPanel />
          </Suspense>
          {tourState.index === null && (
            <button
              type="button"
              onClick={() => tourRunnerRef.current?.start(0)}
              title={t("universe.grandTour.title")}
              className="pointer-events-auto rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-500/25"
            >
              {t("universe.grandTour")}
            </button>
          )}
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
            title={t("viewer.save.title")}
            className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 font-mono text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            {t("viewer.save")}
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
          {/* Sandbox capability — n-body launch controls. The Sandbox
              currently owns its own renderer + scene (gravity Verlet
              integrator + projectile mass table), so this button
              deep-links to the legacy Sandbox via setPreset("sandbox")
              instead of mounting an in-universe overlay. A future pass
              will merge the projectile-launch API into UniverseScene
              and flip this to a slide-in panel. */}
          <button
            type="button"
            onClick={() => sceneRef.current?.setPreset("sandbox")}
            title="Gravity sandbox — launch comets, planets, black holes"
            className="rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/20"
          >
            ⚛ sandbox
          </button>
        </div>

        <div className="pointer-events-auto flex max-w-[60vw] flex-wrap items-center justify-end gap-1.5">
          <ExploreDrawer groups={exploreGroups} />
          <Suspense fallback={<PanelSkeleton />}>
            <SceneEditorPanel
              mode="universe"
              onCapture={() => {
                const s = sceneRef.current;
                return s ? captureUniverseCamera(s) : {};
              }}
              onApply={(c) => {
                const s = sceneRef.current;
                if (s) applyUniverseCamera(s, c);
              }}
              onPlayingChange={setScenePlaying}
            />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <MusicPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <AchievementsPanel />
          </Suspense>
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            title="📖 Show me how — 12-step tutorial"
            aria-label="Show me how — open the 12-step tutorial"
            className="pointer-events-auto inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-emerald-200 backdrop-blur transition hover:bg-emerald-400/20"
          >
            <span aria-hidden>📖</span>
            <span className="hidden sm:inline">show me how</span>
          </button>
          <TopBarActions />
        </div>
      </div>

      {/* Left rail — sectioned navigation panel (layers, wavelengths, travel) */}
      <div className={chromeCls}>
        <LeftRail
          state={state}
          scene={sceneRef.current}
          onOpenGuide={() => {
            window.location.hash = "#guide";
          }}
          onOpenTimeMachine={() => setTimeMachineOpen(true)}
        />
      </div>

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
      <div className={`${chromeCls} pointer-events-none absolute inset-x-0 bottom-24 z-[6] flex justify-center`}>
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
      <div className={`${chromeCls} pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3`}>
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
          W A S D · move · 1-8 · planet · ` home · B GC · N M31 · F focus · Q/E · up/down
        </div>
      </div>

      {/* Inspector card — unified InfoPanel. Lazy: object-citations.ts
          (~104 KB) is only fetched when the user actually inspects an
          object. */}
      {inspect && (
        <Suspense fallback={null}>
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
        </Suspense>
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
      <SupportRibbon />

      {/* DSO Distances HUD — opt-in, default OFF. Press D to toggle. */}
      <DsoDistancesHud
        source={
          sceneRef.current
            ? ({
                mode: "universe",
                unitScaleToMeters: 1.495978707e11,
                getCameraWorldPos: () => sceneRef.current!.getCameraWorldPos(),
                getCameraLogicalLY: () =>
                  sceneRef.current!.getCameraLogicalLY(),
              } satisfies DsoSceneSource)
            : null
        }
        visible={dsoHudVisible}
        onDismiss={() => setDsoHudVisible(false)}
      />

      {shortcutsOpen && (
        <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}

      {tutorialOpen && (
        <TutorialOverlayV2
          onClose={() => setTutorialOpen(false)}
          actions={
            {
              openShortcuts: () => setShortcutsOpen(true),
              startGrandTour: () => tourRunnerRef.current?.start(0),
              switchMode: (mode) => {
                if (mode === "viewer") window.location.hash = "#viewer";
                else if (mode === "solar") window.location.hash = "#solar";
                else if (mode === "galactic") window.location.hash = "#galactic";
                else window.location.hash = "#universe";
              },
            } satisfies TutorialActions
          }
        />
      )}

      <SceneLinkToast
        mode="universe"
        onPlay={(scene) => {
          saveScene(scene);
          const first = scene.keyframes[0];
          const s = sceneRef.current;
          if (first && s) applyUniverseCamera(s, first.camera);
        }}
      />

      {/* Grand Tour v2 card — rendered while the runner is active. The
          runner owns camera + layer state; we just plumb the controls. */}
      {tourState.step && tourState.index !== null && (
        <TourCard
          step={tourState.step}
          index={tourState.index}
          total={tourState.total}
          onPrev={() => tourRunnerRef.current?.prev()}
          onNext={() => tourRunnerRef.current?.next()}
          onExit={() => tourRunnerRef.current?.exit()}
          onJump={(i) => tourRunnerRef.current?.jump(i)}
          layerLabel={layerLabelLookup}
          onCapture={() => {
            const c = canvasRef.current;
            if (!c) return;
            const dataUrl = c.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = `unspeakable-tour-${tourState.step?.id ?? "step"}.png`;
            a.click();
          }}
        />
      )}
      </ErrorBoundary>
    </div>
  );
}

type UniversePreset = "solar-flight" | "galactic" | "sandbox" | "free-flight";

type UniverseHashParams = {
  cx: number | null;
  cy: number | null;
  cz: number | null;
  yaw: number;
  pitch: number;
  zones: string | null;
  missions: string | null;
  track: string | null;
  /** Universe Mode v2 camera preset (`?preset=solar-flight|galactic|...`). */
  preset: UniversePreset | null;
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
    preset: null,
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
  const rawPreset = params.get("preset");
  const preset: UniversePreset | null =
    rawPreset === "solar-flight" ||
    rawPreset === "galactic" ||
    rawPreset === "sandbox" ||
    rawPreset === "free-flight"
      ? rawPreset
      : null;
  return {
    cx: Number.isFinite(cx) ? cx : null,
    cy: Number.isFinite(cy) ? cy : null,
    cz: Number.isFinite(cz) ? cz : null,
    yaw: num("yaw"),
    pitch: num("pitch"),
    zones: params.get("zones"),
    missions: params.get("missions"),
    track: params.get("track"),
    preset,
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

/**
 * Compact distance readout for the bottom-left tier HUD. Mirrors `fmtDist`
 * but with a tighter unit set tuned for the "X from Sun" message.
 */
function fmtDistFromSun(distLY: number): string {
  if (distLY < 1.5e-5) {
    const km = distLY * 9.461e12; // LY → km
    if (km < 1) return `${(km * 1000).toFixed(0)} m`;
    if (km < 1e6) return `${km.toFixed(0)} km`;
    return `${(distLY * 63241).toFixed(2)} AU`;
  }
  if (distLY < 1) return `${(distLY * 63241).toFixed(1)} AU`;
  if (distLY < 1000) return `${distLY.toFixed(2)} ly`;
  if (distLY < 1_000_000) return `${(distLY / 1000).toFixed(2)} kly`;
  if (distLY < 1_000_000_000) return `${(distLY / 1_000_000).toFixed(2)} Mly`;
  return `${(distLY / 1_000_000_000).toFixed(2)} Gly`;
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

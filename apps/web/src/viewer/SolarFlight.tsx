import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  SolarFlightScene,
  type SolarFlightHit,
  type SolarFlightState,
} from "./solar/solar-flight";
// Light, always-mounted UI bits stay eagerly imported. Each is < 5 KB
// gzipped and either sits in the persistent chrome (TimeStrip, top bar,
// bottom HUD) or is the immediate inspector card that fires the moment
// the user taps something.
import { TimeStrip } from "./ui/TimeStrip";
import {
  SceneBottomHud,
  formatDistanceAU,
} from "./ui/SceneBottomHud";
import { TopBarActions } from "./ui/TopBarActions";
import { PlanetCrossSection } from "./ui/PlanetCrossSection";
import { ColorLegend } from "./ui/ColorLegend";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { ShortcutsOverlay } from "./ui/ShortcutsOverlay";
import { ReportBugButton } from "./ui/ReportBugButton";
import { SupportRibbon } from "./ui/SupportRibbon";
import {
  DsoDistancesHud,
  type DsoSceneSource,
} from "./ui/DsoDistancesHud";
import { ExploreDrawer, type Group } from "./ui/ExploreDrawer";
import {
  TutorialOverlayV2,
  type TutorialActions,
} from "./ui/TutorialOverlayV2";
import { SceneLinkToast } from "./scene-editor/SceneLinkToast";
import {
  applySolarCamera,
  captureSolarCamera,
} from "./scene-editor/solar-bridge";
import { saveScene } from "../lib/scene-editor";
import { useIdle } from "../lib/use-idle";
import { recordPlanetVisit, unlock } from "../lib/achievements";
import { SnapshotButton } from "./ui/SnapshotButton";
import { ShareButton } from "./ui/ShareButton";
import { makeSolarAdapter } from "./tutor/adapters";
import { useExtraLayersStore } from "./extra-layers/state";
import { addBookmark } from "../lib/bookmarks";
import { getSettings, useSettings } from "../lib/settings";
import { logger } from "../lib/logger";
import { navigate } from "../router";
import { useCopilotStore } from "../lib/copilot-store";
import { useTutorialAutoOpen } from "../lib/use-tutorial-auto-open";
import { useEscClose } from "../lib/use-esc-close";
import { MobileMenuDrawer } from "./ui/MobileMenuDrawer";
import { Button } from "./ui/primitives/Button";
import {
  LoadingSkeleton,
  PanelSkeleton,
  useFakeProgress,
} from "./ui/LoadingSkeleton";

/* ────────────────────────────────────────────────────────────────────
 * Lazy-loaded panel chunks.
 *
 * Each of these is gated behind a button/popover that the user opens
 * on demand — there's no reason to pay for their JS (or their static
 * data files) at first paint. Splitting them out drops the initial
 * SolarFlight chunk from ~520 KB to under 100 KB and lets each panel
 * ship as its own ~20-40 KB chunk.
 *
 * The data weights that motivated the split (per B3's audit):
 *   • object-citations.ts   ~104 KB
 *   • history-data.ts       ~ 92 KB
 *   • myths-data.ts         ~ 40 KB
 *   • lessons-*.json        ~ 38 KB
 *   • missions-catalog.ts   ~ 28 KB
 *   • celestial-art.ts      ~ 23 KB
 *
 * All of these only matter once the relevant panel is on screen.
 * ──────────────────────────────────────────────────────────────────── */

const InfoPanel = lazy(() =>
  import("./ui/InfoPanel").then((m) => ({ default: m.InfoPanel })),
);
const TransientsPanel = lazy(() =>
  import("./ui/TransientsPanel").then((m) => ({ default: m.TransientsPanel })),
);
const SatellitesPanel = lazy(() =>
  import("./ui/SatellitesPanel").then((m) => ({ default: m.SatellitesPanel })),
);
const SpacecraftPanel = lazy(() =>
  import("./ui/SpacecraftPanel").then((m) => ({ default: m.SpacecraftPanel })),
);
const HistoryPanel = lazy(() =>
  import("./ui/HistoryPanel").then((m) => ({ default: m.HistoryPanel })),
);
const MissionsCatalogPanel = lazy(() =>
  import("./ui/MissionsCatalogPanel").then((m) => ({
    default: m.MissionsCatalogPanel,
  })),
);
const AchievementsPanel = lazy(() =>
  import("./ui/AchievementsPanel").then((m) => ({
    default: m.AchievementsPanel,
  })),
);
const MusicPanel = lazy(() =>
  import("./ui/MusicPanel").then((m) => ({ default: m.MusicPanel })),
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
const SceneEditorPanel = lazy(() =>
  import("./ui/SceneEditorPanel").then((m) => ({
    default: m.SceneEditorPanel,
  })),
);
const SettingsPanel = lazy(() =>
  import("./ui/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);
const BookmarksPanel = lazy(() =>
  import("./ui/BookmarksPanel").then((m) => ({ default: m.BookmarksPanel })),
);
const ExtraLayersPanel = lazy(() =>
  import("./ui/ExtraLayersPanel").then((m) => ({
    default: m.ExtraLayersPanel,
  })),
);
const TutorPanel = lazy(() =>
  import("./ui/TutorPanel").then((m) => ({ default: m.TutorPanel })),
);
const MarsRoverInspectorCard = lazy(() =>
  import("./ui/MarsRoverInspectorCard").then((m) => ({
    default: m.MarsRoverInspectorCard,
  })),
);

/**
 * 🚀 Solar System Flight Mode component.
 *
 * Owns its own canvas + Three.js scene. Renders heliocentric planet
 * positions in 3D, drawn orbital paths, a giant background star sphere,
 * and a hand-rolled orbit-around-target camera.
 *
 * Two callbacks let it integrate with the rest of the viewer:
 *   • onExit — switch back to the celestial-sphere mode
 *   • onFlyToFocus(dir) — handed the geocentric direction to the focused
 *     body when the user clicks "view from Earth", so the sky-mode
 *     camera lands on the same target.
 */

type Props = {
  onExit: () => void;
  onFlyToSky: (dir: { x: number; y: number; z: number }) => void;
};

const DEFAULT_STATE: SolarFlightState = (() => {
  const s = getSettings();
  return {
    time: new Date(),
    playing: true,
    timeRate: 86400,
    focus: "Sun",
    cameraDistance: 4,
    yaw: 0,
    pitch: 0.4,
    tracking: true,
    vicinity: "Inner Solar System",
    realScale: s.realScale,
    orbitOpacity: s.orbitOpacity,
    starBrightness: s.starBrightness,
  };
})();

export function SolarFlight({ onExit: _onExit, onFlyToSky }: Props) {
  // Back button always navigates to `#universe` (see Wave B audit fix);
  // parent-provided onExit is kept in the signature for ABI compat.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SolarFlightScene | null>(null);
  const [state, setState] = useState<SolarFlightState>(DEFAULT_STATE);
  const [inspect, setInspect] = useState<SolarFlightHit | null>(null);
  // Flips true the moment the scene constructor returns and the first
  // state pubsub fires — used to gate the LoadingSkeleton's "Ready"
  // stage so the overlay doesn't dismiss before the canvas is painting.
  const [sceneAlive, setSceneAlive] = useState(false);
  const loadProgress = useFakeProgress(sceneAlive);

  // First-light achievement: getting any scene loaded counts.
  useEffect(() => {
    unlock("first-light");
  }, []);

  // Voyager achievement: every focus change that lands on a planet
  // gets recorded; the 8th distinct planet flips the badge.
  useEffect(() => {
    recordPlanetVisit(state.focus);
  }, [state.focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new SolarFlightScene(canvas);
    sceneRef.current = scene;
    scene.setOnClick((hit) => setInspect(hit));
    // Apply current persisted settings on mount.
    const init = getSettings();
    scene.setRealScale(init.realScale);
    scene.setOrbitOpacity(init.orbitOpacity);
    scene.setStarBrightness(init.starBrightness);
    // Restore from #solar hash params if present.
    const params = parseSolarHash(window.location.hash);
    if (params.focus) scene.setFocus(params.focus);
    if (params.dist !== null || params.yaw !== null || params.pitch !== null) {
      scene.setCameraState(
        params.yaw ?? NaN,
        params.pitch ?? NaN,
        params.dist ?? NaN,
      );
    }
    if (params.track !== null) scene.setTracking(params.track);
    if (params.t) {
      const d = new Date(params.t);
      if (!Number.isNaN(d.getTime())) scene.setTime(d);
    }
    if (params.rate !== null) scene.setTimeRate(params.rate);
    const unsubscribe = scene.subscribe(setState);
    // The scene is now mounted + emitting state — let the loading
    // skeleton know it can finish its stage timeline.
    setSceneAlive(true);
    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // While a scene is playing, suspend the hash-state hydration so the
  // URL hash updater doesn't fight playback for camera authority.
  const [scenePlaying, setScenePlaying] = useState(false);

  // Write camera state to hash on change (debounced). Skipped during
  // scene playback.
  useEffect(() => {
    if (scenePlaying) return;
    const handle = window.setTimeout(() => {
      const hash = buildSolarHash(state);
      if (window.location.hash !== `#${hash}`) {
        window.history.replaceState(null, "", `#${hash}`);
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [state, scenePlaying]);

  // Push global settings into the scene whenever they change.
  const [settings] = useSettings();
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setRealScale(settings.realScale);
    scene.setOrbitOpacity(settings.orbitOpacity);
    scene.setStarBrightness(settings.starBrightness);
  }, [settings.realScale, settings.orbitOpacity, settings.starBrightness]);

  const targets = sceneRef.current?.targets() ?? [
    "Sun",
    "Mercury",
    "Venus",
    "Earth",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
  ];
  const [zonesOn, setZonesOn] = useState(false);
  const [trajectoriesOn, setTrajectoriesOn] = useState(false);
  const [satellitesOn, setSatellitesOn] = useState(false);
  const [auroraOn, setAuroraOn] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  useEscClose(sandboxOpen, () => setSandboxOpen(false));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  useTutorialAutoOpen(setTutorialOpen);
  const openCopilot = useCopilotStore((s) => s.setOpen);
  // DSO Distances HUD visibility — opt-in. Default OFF. Toggled with D.
  const [dsoHudVisible, setDsoHudVisible] = useState(false);

  // AstroGrid-style keyboard shortcuts: ` home, 1-8 planet jump, F focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "`") {
        sceneRef.current?.setFocus("Sun");
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setShortcutsOpen(false);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        setFocusMode((v) => !v);
        return;
      }
      if (e.key === "d" || e.key === "D") {
        // d = "distances" — toggle the DSO Distances HUD.
        setDsoHudVisible((v) => !v);
        return;
      }
      const n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= 8) {
        const planets = [
          "Mercury",
          "Venus",
          "Earth",
          "Mars",
          "Jupiter",
          "Saturn",
          "Uranus",
          "Neptune",
        ];
        sceneRef.current?.setFocus(planets[n - 1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [sandboxKind, setSandboxKind] = useState<
    "Comet" | "Earth-class" | "Jupiter-class" | "Brown Dwarf" | "White Dwarf" | "Neutron Star" | "Black Hole"
  >("Comet");
  const [sandboxSpeed, setSandboxSpeed] = useState(30);

  const idle = useIdle(3500);

  // 🎓 Tutor adapter — broadcasts the live solar-flight camera + focus +
  // time-rate. Captures the live state via a ref so the adapter is
  // stable for the lifetime of the panel.
  const liveStateRef = useRef(state);
  useEffect(() => {
    liveStateRef.current = state;
  }, [state]);
  const tutorAdapter = useMemo(
    () =>
      makeSolarAdapter(
        () => sceneRef.current,
        () => {
          const s = liveStateRef.current;
          return {
            focus: s.focus,
            yaw: s.yaw,
            pitch: s.pitch,
            cameraDistance: s.cameraDistance,
            time: s.time,
            timeRate: s.timeRate,
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

  // Drawer groups — mirrors Universe.tsx but with the panels relevant
  // to solar-flight (no SkyTonight / SpaceWeather / TonightSky which
  // are sky-mode features, plus Satellites + Spacecraft for in-system).
  // Each `<Suspense>` boundary is panel-scoped — a single slow chunk
  // won't block its neighbours from hydrating, and the inline
  // PanelSkeleton keeps the drawer layout stable while a chunk lands.
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
            <TransientsPanel />
          </Suspense>
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
      label: "Catalog",
      children: (
        <>
          <Suspense fallback={<PanelSkeleton />}>
            <SatellitesPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <SpacecraftPanel
              active={trajectoriesOn}
              onToggle={(next) => {
                setTrajectoriesOn(next);
                sceneRef.current?.setTrajectories(next);
              }}
              getStatus={() => sceneRef.current?.spacecraftStatus() ?? []}
              onFlyTo={(slug) => {
                if (!trajectoriesOn) {
                  setTrajectoriesOn(true);
                  sceneRef.current?.setTrajectories(true);
                }
                sceneRef.current?.flyToSpacecraft(slug);
              }}
            />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <MissionsCatalogPanel />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <CollectionsPanel
              onFlyTo={(item) => sceneRef.current?.setFocus(item.id)}
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

  return (
    <div className="relative h-full w-full bg-[#000208]">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Interactive 3D Solar System flight viewer — drag to orbit, scroll to zoom, click planets to inspect"
        className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
      />

      {/* Panel-scope boundary: keeps a single popover crash from
          unmounting the canvas. Scene/constructor crashes are caught by
          the route-level ErrorBoundary in App.tsx. */}
      <ErrorBoundary scope="panel" label="Solar Flight chrome">

      {/* Staged loading skeleton — fades out once the scene is alive.
          Time-driven progress because SolarFlightScene doesn't expose
          tile/star/dso counts (those live in the Sky viewer's scene). */}
      <LoadingSkeleton progress={loadProgress} />

      {/* Top bar — back button + focus picker (hidden in focus mode).
          Also fades to 30% when the user is idle so the canvas owns the
          stage; popovers and the bottom time-strip stay solid. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 transition-opacity duration-500 ${
          focusMode ? "opacity-0" : idle ? "opacity-30" : "opacity-100"
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("universe")}
            className="min-h-[44px] rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 uppercase tracking-widest text-white/80 backdrop-blur hover:bg-white/10 hover:text-white"
          >
            ← universe
          </Button>
          <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-200/80 backdrop-blur">
            🚀 solar system flight
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openCopilot(true)}
            title="Cosmic Copilot — ask anything"
            aria-label="Open the Cosmic Copilot chat"
            className="min-h-[44px] gap-1 rounded-lg border border-violet-400/40 bg-violet-400/10 px-2.5 py-1.5 uppercase tracking-widest text-violet-200 backdrop-blur hover:bg-violet-400/20"
          >
            <span aria-hidden>🧠</span>
            <span className="hidden sm:inline">copilot</span>
          </Button>
          <a
            href="#guide"
            title="Open the User Guide — every feature + every keyboard shortcut"
            className="inline-flex min-h-[44px] items-center rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            📖 user guide
          </a>
          <a
            href="#galactic"
            title="Zoom out to the Milky Way galaxy + Local Group + Cosmic Web"
            className="rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/20"
          >
            🌌 galactic →
          </a>
          <SnapshotButton
            onCapture={() => {
              const c = canvasRef.current;
              return c ? c.toDataURL("image/png") : null;
            }}
          />
          <ShareButton onPrepare={() => buildSolarHash(state)} />
          <Suspense fallback={<PanelSkeleton />}>
            <TutorPanel adapter={tutorAdapter} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <BookmarksPanel />
          </Suspense>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              try {
                const hash = buildSolarHash(state);
                window.history.replaceState(null, "", `#${hash}`);
                addBookmark({
                  title: `${state.focus} · ${state.vicinity}`,
                  url: window.location.href,
                  mode: "solar",
                });
              } catch (err) {
                logger.error("[solar] save bookmark failed", err);
              }
            }}
            title="Save the current view as a bookmark"
            className="min-h-[44px] rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
          >
            ★ save
          </Button>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            focus
          </span>
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => sceneRef.current?.setFocus(t)}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                state.focus === t
                  ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                  : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
              }`}
            >
              {t}
            </button>
          ))}
          <PlanetCrossSection focus={state.focus} />
          <ExploreDrawer groups={exploreGroups} />
          <Suspense fallback={<PanelSkeleton />}>
            <SceneEditorPanel
              mode="solar"
              onCapture={() => {
                const s = sceneRef.current;
                return s ? captureSolarCamera(s) : {};
              }}
              onApply={(c) => {
                const s = sceneRef.current;
                if (s) applySolarCamera(s, c);
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTutorialOpen(true)}
            title="📖 Show me how — 12-step tutorial"
            aria-label="Show me how — open the 12-step tutorial"
            className="min-h-[44px] gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 uppercase tracking-widest text-emerald-200 backdrop-blur hover:bg-emerald-400/20"
          >
            <span aria-hidden>📖</span>
            <span className="hidden sm:inline">show me how</span>
          </Button>
          <TopBarActions
            focusActive={focusMode}
            onFocusToggle={() => setFocusMode((v) => !v)}
          />
        </div>
      </div>

      {/* Cinematic readout — DISTANCE FROM SUN / vicinity / SCREEN SCALE.
          Anchors slightly above the action buttons + time strip. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-24 z-[6] flex justify-center transition-opacity ${
          focusMode ? "opacity-0" : "opacity-100"
        }`}
      >
        <SceneBottomHud
          topLabel={`Distance from ${state.focus === "Sun" ? "Sun" : state.focus}`}
          distance={formatDistanceAU(state.cameraDistance)}
          vicinity={state.vicinity}
          // 2·d·tan(25°) ≈ d·0.933 for 50° vertical FOV. Close enough
          // for an at-a-glance "how wide am I seeing" readout.
          screenScale={formatDistanceAU(state.cameraDistance * 0.933)}
          hidden={focusMode}
        />
      </div>

      {/* Bottom bar — action buttons + time strip (hidden in focus mode) */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3 transition-opacity ${
          focusMode ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip label="focus" value={state.focus} accent />
          <button
            type="button"
            onClick={() => sceneRef.current?.setTracking(!state.tracking)}
            title="Tracking — keep camera glued to the focus body as time advances"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              state.tracking
                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⊙ tracking {state.tracking ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => sceneRef.current?.resetNow()}
            title="Reset simulation time to the current wall-clock moment"
            className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/75 backdrop-blur transition hover:bg-white/10"
          >
            ⟲ now
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !zonesOn;
              setZonesOn(next);
              sceneRef.current?.setSolarZones(next);
            }}
            title="Toggle named solar-system zones — habitable zone, frost line, asteroid belt, Kuiper belt"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              zonesOn
                ? "border-teal-400/50 bg-teal-400/15 text-teal-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ◉ zones
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            title="Settings: real-scale toggle, opacity sliders, star brightness"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              settingsOpen
                ? "border-white/30 bg-white/15 text-white"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⚙ settings
          </button>
          <button
            type="button"
            onClick={() => setSandboxOpen((v) => !v)}
            title="Open the Gravity Sandbox — launch projectiles and watch them interact with the Sun + giants"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              sandboxOpen
                ? "border-orange-400/50 bg-orange-400/15 text-orange-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            ⚛ sandbox
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !satellitesOn;
              setSatellitesOn(next);
              sceneRef.current?.setSatellites(next);
            }}
            title="Toggle real satellites around Earth — TLE-driven, propagated live (SGP4)"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              satellitesOn
                ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            🛰 sats
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !auroraOn;
              setAuroraOn(next);
              sceneRef.current?.setAurora(next);
            }}
            title="Toggle the aurora oval over Earth — live from NOAA SWPC OVATION"
            className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
              auroraOn
                ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                : "border-white/10 bg-space-950/70 text-white/65 hover:bg-white/10"
            }`}
          >
            🌌 aurora
          </button>
          {(state.focus === "Earth" ||
            state.focus === "Mars" ||
            // Moon isn't in the focus targets but the chip still surfaces in
            // sky view; only enable for the real solar-flight focus list.
            state.focus === "Moon") && (
            <a
              href={`#surface/${state.focus.toLowerCase()}`}
              title={`Open the surface of ${state.focus} — high-detail textured 3D body`}
              className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-amber-200 backdrop-blur transition hover:bg-amber-400/25"
            >
              🪐 land on {state.focus}
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              const dir = sceneRef.current?.geocentricDirOfFocus();
              if (dir) onFlyToSky(dir);
            }}
            className="rounded-lg border border-violet-400/40 bg-violet-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/25"
          >
            ↗ view from Earth
          </button>
        </div>

        <TimeStrip
          time={state.time}
          playing={state.playing}
          rate={state.timeRate}
          onPlayToggle={() =>
            sceneRef.current?.setPlaying(!state.playing)
          }
          onRateChange={(r) => sceneRef.current?.setTimeRate(r)}
          onTimeChange={(t) => sceneRef.current?.setTime(t)}
        />
      </div>

      {/* Hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-32 z-10 flex justify-center">
        <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 backdrop-blur">
          drag to orbit · wheel to zoom · pick a focus body above
        </div>
      </div>

      {/* Shared settings panel. Only mount when open so the chunk
          download is deferred until the user actually asks for it. */}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            anchor="bottom-right"
          />
        </Suspense>
      )}

      {/* Gravity Sandbox panel */}
      {sandboxOpen && (
        <div className="pointer-events-auto absolute bottom-44 left-3 z-20 w-[min(320px,90vw)] rounded-xl border border-orange-400/30 bg-space-950/90 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-300/80">
              ⚛ gravity sandbox
            </div>
            <button
              type="button"
              onClick={() => setSandboxOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            select projectile
          </div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {(
              [
                "Comet",
                "Earth-class",
                "Jupiter-class",
                "Brown Dwarf",
                "White Dwarf",
                "Neutron Star",
                "Black Hole",
              ] as const
            ).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSandboxKind(k)}
                className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                  sandboxKind === k
                    ? "border-orange-400/50 bg-orange-400/15 text-orange-200"
                    : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mb-1 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              launch speed
            </div>
            <div className="font-mono text-[10px] text-white/65">
              {sandboxSpeed} km/s
            </div>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            step={1}
            value={sandboxSpeed}
            onChange={(e) => setSandboxSpeed(parseInt(e.target.value, 10))}
            className="mb-3 h-1 w-full accent-orange-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                sceneRef.current?.launchProjectile(sandboxKind, sandboxSpeed)
              }
              className="flex-1 rounded-md border border-orange-400/40 bg-orange-400/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-orange-200 hover:bg-orange-400/25"
            >
              ▶ launch
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.clearProjectiles()}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/65 hover:bg-white/10"
            >
              clear
            </button>
          </div>
          <div className="mt-2 font-mono text-[10px] text-white/35">
            n-body integration: leapfrog under Sun + 4 gas giants. Up to 15
            projectiles at a time.
          </div>
        </div>
      )}

      {/* Inspector card — unified InfoPanel. Lazy: a viewer that never
          taps a body never downloads object-citations.ts (~104 KB). */}
      {inspect && (
        <Suspense fallback={null}>
          <InfoPanel
            payload={inspect.payload}
            onClose={() => setInspect(null)}
            onFlyHere={() => {
              sceneRef.current?.setFocus(inspect.name);
              setInspect(null);
            }}
            onSurface={
              inspect.name === "Earth" || inspect.name === "Mars"
                ? () => {
                    window.location.hash = `#surface/${inspect.name.toLowerCase()}`;
                  }
                : undefined
            }
          />
        </Suspense>
      )}

      {/* Mars Rover Image-of-the-Day inspector card — floats top-right
          whenever the federated `mars-rover-iotd` extra layer is enabled. */}
      {!focusMode && (
        <Suspense fallback={null}>
          <MarsRoverInspectorCard scene={sceneRef.current} />
        </Suspense>
      )}

      {!focusMode && <ColorLegend />}

      {!focusMode && <ReportBugButton />}
      {!focusMode && <SupportRibbon />}

      {/* DSO Distances HUD — opt-in, default OFF. Press D to toggle. */}
      {!focusMode && (
        <DsoDistancesHud
          source={
            sceneRef.current
              ? ({
                  mode: "solar",
                  unitScaleToMeters: 1.495978707e11,
                  getCameraWorldPos: () => sceneRef.current!.getCameraWorldPos(),
                } satisfies DsoSceneSource)
              : null
          }
          visible={dsoHudVisible}
          onDismiss={() => setDsoHudVisible(false)}
        />
      )}

      {shortcutsOpen && (
        <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}

      {tutorialOpen && (
        <TutorialOverlayV2
          onClose={() => setTutorialOpen(false)}
          actions={
            {
              openShortcuts: () => setShortcutsOpen(true),
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
        mode="solar"
        onPlay={(scene) => {
          // Persist the shared scene so it shows up in the picker, then
          // apply the first keyframe immediately so the user sees the
          // intended starting view.
          saveScene(scene);
          const first = scene.keyframes[0];
          const s = sceneRef.current;
          if (first && s) applySolarCamera(s, first.camera);
        }}
      />
      </ErrorBoundary>

      {/* Mobile-only hamburger drawer. */}
      <div className="pointer-events-auto absolute right-3 top-3 z-30 md:hidden">
        <MobileMenuDrawer
          mode="solar"
          onShowTutorial={() => setTutorialOpen(true)}
        />
      </div>
    </div>
  );
}

type SolarHashParams = {
  focus: string | null;
  yaw: number | null;
  pitch: number | null;
  dist: number | null;
  track: boolean | null;
  t: string | null;
  rate: number | null;
};

function parseSolarHash(hash: string): SolarHashParams {
  const empty: SolarHashParams = {
    focus: null,
    yaw: null,
    pitch: null,
    dist: null,
    track: null,
    t: null,
    rate: null,
  };
  const m = hash.match(/^#solar\?(.+)$/);
  if (!m || !m[1]) return empty;
  const p = new URLSearchParams(m[1]);
  const num = (k: string): number | null => {
    const v = p.get(k);
    if (v === null) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const trackRaw = p.get("track");
  return {
    focus: p.get("focus"),
    yaw: num("yaw"),
    pitch: num("pitch"),
    dist: num("dist"),
    track: trackRaw === "true" ? true : trackRaw === "false" ? false : null,
    t: p.get("t"),
    rate: num("rate"),
  };
}

function buildSolarHash(state: SolarFlightState): string {
  const p = new URLSearchParams();
  p.set("focus", state.focus);
  p.set("yaw", state.yaw.toFixed(4));
  p.set("pitch", state.pitch.toFixed(4));
  p.set("dist", state.cameraDistance.toPrecision(6));
  p.set("track", String(state.tracking));
  p.set("t", state.time.toISOString());
  p.set("rate", String(state.timeRate));
  return `solar?${p.toString()}`;
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
    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
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

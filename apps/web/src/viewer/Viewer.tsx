import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { log } from "../lib/logger";
import { Vector3 } from "three";
import type { SceneContext } from "./copilot/types";
import type { CopilotHost } from "./copilot";
import { ViewerScene, type ViewerState } from "./scene/scene";
import { isEmbedMode, navigate } from "../router";
import { useT } from "../i18n/hooks";
import { EXTRA_LAYERS } from "./extra-layers/registry";

// Lazy-load the copilot UI — keeps the LLM-y chat code out of the main
// viewer chunk so first paint stays snappy.
const CopilotPanel = lazy(() =>
  import("./ui/CopilotPanel").then((m) => ({ default: m.CopilotPanel })),
);
import { EmbedBadge } from "./ui/EmbedBadge";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";
import { RendererBadge } from "./ui/RendererBadge";
import { TimeStrip } from "./ui/TimeStrip";
import { QuickTargets } from "./ui/QuickTargets";
import { SearchBar } from "./ui/SearchBar";
import { SearchIndex, type SearchEntry } from "./search/search-index";
import { TonightSky } from "./ui/TonightSky";
import { TourCard } from "./ui/TourCard";
import { GRAND_TOUR } from "./tour/tour";
import { FavoritesMenu } from "./ui/FavoritesMenu";
import { AboutOverlay } from "./ui/AboutOverlay";
import { FirstRunHint } from "./ui/FirstRunHint";
import { CenterHud } from "./ui/CenterHud";
import { ColorLegend } from "./ui/ColorLegend";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import {
  DsoDistancesHud,
  type DsoSceneSource,
} from "./ui/DsoDistancesHud";
import { EventsPanel } from "./ui/EventsPanel";
import { NeoPanel } from "./ui/NeoPanel";
import { ShareButton } from "./ui/ShareButton";
import { GyroButton } from "./ui/GyroButton";
import { ArSkyButton } from "./ui/ArSkyButton";
import { SnapshotButton } from "./ui/SnapshotButton";
import { ShortcutsOverlay } from "./ui/ShortcutsOverlay";
import { SkyTonightPanel } from "./ui/SkyTonightPanel";
import { SpaceWeatherPanel } from "./ui/SpaceWeatherPanel";
import { TonightTargetsPanel } from "./ui/TonightTargetsPanel";
import {
  type Favorite,
  isFavorited,
  readFavorites,
  removeFavorite,
  saveFavorite,
} from "./favorites/favorites-store";
import { parseHash, replaceHash, serializeState } from "./share/url-state";
import { WavelengthBar, type SkyCultureChoice } from "./ui/WavelengthBar";
import { getSettings, updateSettings } from "../lib/settings";
import type { SkyProjection } from "./sky-atlas/projection-shader";
import { SkyInfoPanel } from "./ui/SkyInfoPanel";
import { ExtraLayersPanel } from "./ui/ExtraLayersPanel";
import { TutorPanel } from "./ui/TutorPanel";
import { makeSkyAdapter } from "./tutor/adapters";
import { useExtraLayersStore } from "./extra-layers/state";
import { MultimessengerControls } from "./ui/MultimessengerControls";
import { SonificationControls } from "./ui/SonificationControls";
import { JwstLiveBadge } from "./ui/JwstLiveBadge";
import { ObservationLogPanel } from "./ui/ObservationLogPanel";
import { MobileMenuDrawer, type MobileMenuGroup } from "./ui/MobileMenuDrawer";
import { PowerUserPanel } from "./ui/PowerUserPanel";
import {
  TutorialOverlayV2,
  shouldShowTutorialV2,
  type TutorialActions,
} from "./ui/TutorialOverlayV2";
import {
  candidatesFromSimbad,
  wikipediaSummary,
  type WikiSummary,
} from "./info/wikipedia";
import { resolveLocalHit } from "./info/local-resolver";
import {
  simbadConeSearch,
  worldDirectionToRaDec,
  type SimbadHit,
} from "./info/simbad";

type SceneStatus = "init" | "live" | "unsupported" | "error";

function detectWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2"));
  } catch {
    return false;
  }
}

const DEFAULT_STATE: ViewerState = {
  baseTilesLoaded: 0,
  baseTilesTotal: 12,
  detailTiles: 0,
  starCount: 0,
  dsoCount: 0,
  time: new Date(),
  playing: false,
  timeRate: 1,
  fov: 60,
  forward: { x: 0, y: 0, z: -1 },
  iss: null,
  overlayId: null,
  overlayMix: 0,
  constellations: false,
  coordGrid: false,
  starLabels: false,
  spacecraft: false,
  exoplanets: false,
  cosmicLandmarks: false,
  pulsars: false,
  exoplanetCount: 0,
  pulsarCount: 0,
  rendererKind: "webgl",
};

type Inspect = {
  raDeg: number;
  decDeg: number;
  /** Sky direction at click time, kept so "Fly here" can re-apply after the
   *  camera has been moved by something else. */
  dir: Vector3;
  loading: boolean;
  hit: SimbadHit | null;
  error: string | null;
  wiki: WikiSummary | null;
  wikiLoading: boolean;
  /** IAU 3-letter constellation the click landed in (centroid heuristic). */
  constellation: string | null;
};

export function Viewer() {
  const t = useT();
  // Embed mode is computed once at mount. It's driven by the URL the user
  // landed on and we never expect it to flip mid-session — an embedded
  // iframe stays embedded. Captured here so every chrome conditional
  // below reads the same value without an extra subscription.
  const embed = useRef(isEmbedMode()).current;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const [status, setStatus] = useState<SceneStatus>("init");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const inspectGenRef = useRef(0); // race-guard for SIMBAD calls
  const [observer, setObserver] = useState<{ lat: number; lon: number } | null>(
    () => {
      // Cache last-known location across reloads — we never send it anywhere.
      try {
        const raw = localStorage.getItem("uw:observer");
        if (raw) {
          const parsed = JSON.parse(raw) as { lat: number; lon: number };
          if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon))
            return parsed;
        }
      } catch {
        // ignore
      }
      return null;
    },
  );
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => shouldShowTutorialV2());
  const [favorites, setFavorites] = useState<Favorite[]>(() => readFavorites());

  const reloadFavorites = useCallback(() => {
    setFavorites(readFavorites());
  }, []);

  const onToggleFavorite = useCallback(() => {
    if (!inspect?.hit) return;
    const h = inspect.hit;
    if (isFavorited(h.name, h.raDeg, h.decDeg)) {
      // Look up by id; the store uses (name+ra+dec) hashing
      const all = readFavorites();
      const match = all.find(
        (f) =>
          f.name === h.name &&
          Math.abs(f.raDeg - h.raDeg) < 0.01 &&
          Math.abs(f.decDeg - h.decDeg) < 0.01,
      );
      if (match) removeFavorite(match.id);
    } else {
      saveFavorite({
        name: h.name,
        type: h.type,
        raDeg: h.raDeg,
        decDeg: h.decDeg,
      });
    }
    reloadFavorites();
  }, [inspect, reloadFavorites]);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [skyProjection, setSkyProjection] = useState<SkyProjection>(
    () => getSettings().skyProjection,
  );
  const [skyCulture, setSkyCulture] = useState<SkyCultureChoice>("western");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotSeed, setCopilotSeed] = useState<string | null>(null);
  // Off by default — the DSO distances HUD is opt-in via the keyboard
  // shortcut (D) and the Settings panel. Mirrors the same memory tier as
  // Constellations / Star Labels: not persisted across reloads.
  const [dsoHudVisible, setDsoHudVisible] = useState(false);

  const openCopilot = useCallback((seed: string | null) => {
    setCopilotSeed(seed);
    setCopilotOpen(true);
  }, []);

  /**
   * Build a fresh SceneContext snapshot each render — the Copilot panel
   * captures whatever is current at send time. Cheap; no extra fetches.
   */
  const sceneContext = useMemo<SceneContext>(() => {
    // Convert the live world-Y-up forward back to celestial RA/Dec.
    const f = state.forward;
    const xCel = f.x;
    const yCel = -f.z;
    const zCel = f.y;
    const len = Math.hypot(xCel, yCel, zCel) || 1;
    const dec =
      (Math.asin(Math.max(-1, Math.min(1, zCel / len))) * 180) / Math.PI;
    let ra = (Math.atan2(yCel, xCel) * 180) / Math.PI;
    if (ra < 0) ra += 360;

    const overlays: string[] = [];
    if (state.overlayId) overlays.push(`overlay:${state.overlayId}`);
    if (state.constellations) overlays.push("constellations");
    if (state.coordGrid) overlays.push("coord-grid");
    if (state.starLabels) overlays.push("star-labels");
    if (state.spacecraft) overlays.push("spacecraft");
    if (state.exoplanets) overlays.push("exoplanets");
    if (state.cosmicLandmarks) overlays.push("cosmic-landmarks");
    if (state.pulsars) overlays.push("pulsars");

    return {
      focusedObject: inspect?.hit
        ? {
            name: inspect.hit.name,
            type: inspect.hit.type,
            raDeg: inspect.hit.raDeg,
            decDeg: inspect.hit.decDeg,
          }
        : null,
      cameraRaDeg: ra,
      cameraDecDeg: dec,
      fovDeg: state.fov,
      overlays,
      simTimeIso: state.time.toISOString(),
      observer,
    };
  }, [state, inspect, observer]);

  /**
   * Bridge from the Cosmic Copilot's tool-calling layer to the live
   * scene. Every method is best-effort: if the current scene mode
   * doesn't support a capability, we return false and the Copilot
   * apologises in prose. The host is rebuilt when the search index
   * settles so the panel can resolve names against it.
   */
  const copilotHost = useMemo<CopilotHost>(() => {
    return {
      flyTo: async (target: string) => {
        const scene = sceneRef.current;
        if (!scene) return false;
        // 1. Direct solar-body / ISS match — fastest path.
        const direct = scene.bodyDirection(target);
        if (direct) {
          scene.flyTo(direct);
          return true;
        }
        // 2. Local search index (named stars, Messier/NGC, constellations).
        if (searchIndex) {
          const hits = searchIndex.search(target, 1);
          const top = hits[0];
          if (top) {
            scene.flyTo(top.direction);
            return true;
          }
        }
        // 3. No remote name resolver is wired here. The search index
        // covers >1,300 named objects (Messier, NGC, IC, bright stars,
        // constellations); if a name isn't in it we let the Copilot
        // apologise in prose rather than block on a SIMBAD lookup.
        return false;
      },
      setLayer: (layerId: string, enabled: boolean) => {
        const scene = sceneRef.current;
        if (!scene) return false;
        // Built-in catalog toggles live on the scene directly; everything
        // else routes through the EXTRA_LAYERS registry.
        const builtin: Record<string, (v: boolean) => void> = {
          constellations: scene.setConstellations.bind(scene),
          "coord-grid": scene.setCoordGrid.bind(scene),
          "star-labels": scene.setStarLabels.bind(scene),
          spacecraft: scene.setSpacecraft.bind(scene),
          exoplanets: scene.setExoplanets.bind(scene),
          "cosmic-landmarks": scene.setCosmicLandmarks.bind(scene),
          pulsars: scene.setPulsars.bind(scene),
        };
        const builtinFn = builtin[layerId];
        if (builtinFn) {
          builtinFn(enabled);
          return true;
        }
        const known = EXTRA_LAYERS.some((e) => e.id === layerId);
        if (!known) return false;
        scene.setExtraLayer(layerId, enabled);
        return true;
      },
      setTime: (iso: string) => {
        const scene = sceneRef.current;
        if (!scene) return false;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return false;
        scene.setTime(d);
        return true;
      },
      setOverlay: (surveyId: string | null) => {
        const scene = sceneRef.current;
        if (!scene) return false;
        scene.setOverlay(surveyId);
        if (surveyId) scene.setOverlayMix(0.55);
        return true;
      },
      takeSnapshot: () => {
        const scene = sceneRef.current;
        if (!scene) return null;
        const url = scene.snapshotPng();
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch {
          // Pop-up blocked is fine — the result message confirms capture.
        }
        return url;
      },
      setMode: (mode) => {
        try {
          // The copilot tool exposes 'sky' as the all-sky planetarium;
          // internally that's the `viewer` route. Other modes map 1:1.
          const route =
            mode === "sky"
              ? "viewer"
              : mode === "solar"
                ? "solar"
                : mode === "galactic"
                  ? "galactic"
                  : "universe";
          navigate(route);
          return true;
        } catch (err) {
          log.warn("[copilot] setMode navigate failed", err);
          return false;
        }
      },
    };
  }, [searchIndex]);

  // 🎓 Tutor adapter — feeds the live camera state into the broadcast
  // module and applies incoming teacher updates back into the scene.
  // Stable ref so the panel can wire up its publish/poll loops once;
  // the latest overlay id is plumbed through a closure over the state ref.
  const latestOverlayIdRef = useRef<string | null>(null);
  useEffect(() => {
    latestOverlayIdRef.current = state.overlayId;
  }, [state.overlayId]);
  const tutorAdapter = useMemo(
    () =>
      makeSkyAdapter(() => sceneRef.current, {
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
        getOverlayId: () => latestOverlayIdRef.current,
      }),
    [],
  );

  const runTourStep = useCallback((idx: number) => {
    const scene = sceneRef.current;
    const step = GRAND_TOUR[idx];
    if (!scene || !step) return;

    if (step.target.kind === "body") {
      const dir = scene.bodyDirection(step.target.name);
      if (dir) scene.flyTo(dir, 1500);
    } else {
      // Convert celestial RA/Dec to world Y-up direction
      const raRad = (step.target.ra * Math.PI) / 180;
      const decRad = (step.target.dec * Math.PI) / 180;
      const cdec = Math.cos(decRad);
      const x = cdec * Math.cos(raRad);
      const y = cdec * Math.sin(raRad);
      const z = Math.sin(decRad);
      // Same Z-up → Y-up rotation our astronomy groups apply: (x, z, -y)
      scene.flyTo(new Vector3(x, z, -y).normalize(), 1500);
    }
    scene.setFov(step.fov);

    // If the step prefers a wavelength, switch the overlay sphere accordingly.
    if (step.wavelengthHint) {
      const surveyId =
        step.wavelengthHint === "visible"
          ? null
          : step.wavelengthHint === "near-ir"
            ? "2mass"
            : step.wavelengthHint === "mid-ir"
              ? "allwise"
              : step.wavelengthHint === "x-ray"
                ? "integral"
                : null;
      scene.setOverlay(surveyId);
      if (surveyId) scene.setOverlayMix(0.55);
    } else {
      scene.setOverlay(null);
    }
  }, []);

  const startTour = useCallback(() => {
    setTourIndex(0);
    runTourStep(0);
  }, [runTourStep]);

  const nextTour = useCallback(() => {
    setTourIndex((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next >= GRAND_TOUR.length) {
        sceneRef.current?.setOverlay(null);
        return null; // exit at end
      }
      runTourStep(next);
      return next;
    });
  }, [runTourStep]);

  const prevTour = useCallback(() => {
    setTourIndex((prev) => {
      if (prev === null || prev === 0) return prev;
      const next = prev - 1;
      runTourStep(next);
      return next;
    });
  }, [runTourStep]);

  const exitTour = useCallback(() => {
    setTourIndex(null);
    sceneRef.current?.setOverlay(null);
  }, []);

  // Build the local search index once on mount.
  useEffect(() => {
    const idx = new SearchIndex();
    // Dynamic entries: planets / Sun / Moon move with sim time, ISS moves
    // every few seconds. Resolve direction from the live scene each call so
    // search and the "tonight's targets" panel always reflect current sky.
    idx.setDynamicProvider(() => {
      const scene = sceneRef.current;
      if (!scene) return [];
      const out: SearchEntry[] = [];
      const PLANETS: Array<{ name: string; mag: number; detail: string }> = [
        { name: "Sun", mag: -26.7, detail: "G2V star" },
        { name: "Moon", mag: -12.7, detail: "Earth's natural satellite" },
        { name: "Mercury", mag: 0.5, detail: "innermost planet" },
        { name: "Venus", mag: -4, detail: "morning / evening star" },
        { name: "Mars", mag: 0, detail: "the red planet" },
        { name: "Jupiter", mag: -2.5, detail: "gas giant · 4 visible moons" },
        { name: "Saturn", mag: 0.5, detail: "ringed planet" },
        { name: "Uranus", mag: 5.7, detail: "ice giant" },
        { name: "Neptune", mag: 7.8, detail: "outermost planet" },
      ];
      for (const p of PLANETS) {
        const dir = scene.bodyDirection(p.name);
        if (!dir) continue;
        // Convert world-Y-up direction back to celestial RA/Dec for the
        // tonight-targets altitude math.
        const xCel = dir.x;
        const yCel = -dir.z;
        const zCel = dir.y;
        const len = Math.hypot(xCel, yCel, zCel) || 1;
        const dec =
          (Math.asin(Math.max(-1, Math.min(1, zCel / len))) * 180) / Math.PI;
        let ra = (Math.atan2(yCel, xCel) * 180) / Math.PI;
        if (ra < 0) ra += 360;
        out.push({
          id: `planet:${p.name}`,
          label: p.name,
          kind: "planet",
          detail: `mag ${p.mag.toFixed(1)} · ${p.detail}`,
          direction: dir,
          mag: p.mag,
          raDeg: ra,
          decDeg: dec,
        });
      }
      const iss = scene.bodyDirection("ISS");
      if (iss) {
        const xCel = iss.x;
        const yCel = -iss.z;
        const zCel = iss.y;
        const len = Math.hypot(xCel, yCel, zCel) || 1;
        const dec =
          (Math.asin(Math.max(-1, Math.min(1, zCel / len))) * 180) / Math.PI;
        let ra = (Math.atan2(yCel, xCel) * 180) / Math.PI;
        if (ra < 0) ra += 360;
        out.push({
          id: "planet:ISS",
          label: "ISS",
          kind: "planet",
          detail: "International Space Station · live ground track",
          direction: iss,
          mag: -2,
          raDeg: ra,
          decDeg: dec,
        });
      }
      // Cosmic landmarks (Sgr A*, M87*, Crab Pulsar, GW170817, …) — short
      // hand-curated list; always available regardless of layer toggle.
      for (const lm of scene.cosmicLandmarkList()) {
        const cdec = Math.cos((lm.decDeg * Math.PI) / 180);
        const raRad = (lm.raDeg * Math.PI) / 180;
        const decRad = (lm.decDeg * Math.PI) / 180;
        const dirX = cdec * Math.cos(raRad);
        const dirZ = Math.sin(decRad);
        const dirY = -cdec * Math.sin(raRad);
        out.push({
          id: `cosmic:${lm.name}`,
          label: lm.name,
          kind: "dso",
          detail: lm.detail,
          direction: new Vector3(dirX, dirZ, dirY).normalize(),
          raDeg: lm.raDeg,
          decDeg: lm.decDeg,
        });
      }
      // Exoplanets — only the ones with stable host names so search isn't
      // dominated by 6,278 "Kepler-NNN b" rows. We index named planets +
      // every TRAPPIST/Proxima/etc. entry.
      const NAMED_PATTERNS = /^(Proxima|TRAPPIST|TOI|HR|55 Cnc|GJ|HD|HIP|WASP|HAT|K2)/i;
      for (const exo of scene.exoplanetList()) {
        if (!NAMED_PATTERNS.test(exo.name)) continue;
        const cdec = Math.cos((exo.dec * Math.PI) / 180);
        const raRad = (exo.ra * Math.PI) / 180;
        const decRad = (exo.dec * Math.PI) / 180;
        const dirX = cdec * Math.cos(raRad);
        const dirZ = Math.sin(decRad);
        const dirY = -cdec * Math.sin(raRad);
        const distStr = exo.distPc ? ` · ${exo.distPc.toFixed(0)} pc` : "";
        const yearStr = exo.year ? ` · disc ${exo.year}` : "";
        out.push({
          id: `exo:${exo.name}`,
          label: exo.name,
          kind: "dso",
          detail: `Exoplanet${distStr}${yearStr} · ${exo.method ?? "Transit"}`,
          direction: new Vector3(dirX, dirZ, dirY).normalize(),
          raDeg: exo.ra,
          decDeg: exo.dec,
        });
      }
      return out;
    });
    void idx
      .loadStaticCatalogs()
      .then(() => setSearchIndex(idx))
      .catch((err) => log.warn("[search] index load failed", err));
  }, []);

  // Global keyboard shortcuts. We deliberately keep this list small and
  // skip handling when the user is typing in an input — pressing "t" in
  // the search box should not start the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return; // ⌘K is owned by SearchBar

      if (e.key === "i") {
        setAboutOpen((v) => !v);
        return;
      }
      if (e.key === "e") {
        setEventsOpen((v) => !v);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (aboutOpen) setAboutOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (inspect) setInspect(null);
        else if (tourIndex !== null) exitTour();
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        sceneRef.current?.setPlaying(!state.playing);
        return;
      }
      if (e.key === "t") {
        if (tourIndex === null) startTour();
        else exitTour();
        return;
      }
      if (e.key === "c") {
        sceneRef.current?.setConstellations(!state.constellations);
        return;
      }
      if (e.key === "g") {
        sceneRef.current?.setCoordGrid(!state.coordGrid);
        return;
      }
      if (e.key === "n") {
        sceneRef.current?.setStarLabels(!state.starLabels);
        return;
      }
      if (e.key === "s") {
        sceneRef.current?.setSpacecraft(!state.spacecraft);
        return;
      }
      if (e.key === "x") {
        // x = "extrasolar"
        sceneRef.current?.setExoplanets(!state.exoplanets);
        return;
      }
      if (e.key === "z") {
        // z = "exotic"
        sceneRef.current?.setCosmicLandmarks(!state.cosmicLandmarks);
        return;
      }
      if (e.key === "p") {
        // p = "pulsars"
        sceneRef.current?.setPulsars(!state.pulsars);
        return;
      }
      if (e.key === ".") {
        sceneRef.current?.setTime(new Date());
        return;
      }
      if (e.key === "d") {
        // d = "distances" — toggle the DSO Distances HUD.
        setDsoHudVisible((v) => !v);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const dir = e.key === "ArrowRight" ? 1 : -1;
        sceneRef.current?.setTime(
          new Date(state.time.getTime() + dir * state.timeRate * 1000),
        );
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    aboutOpen,
    shortcutsOpen,
    inspect,
    tourIndex,
    startTour,
    exitTour,
    state.playing,
    state.constellations,
    state.coordGrid,
    state.starLabels,
    state.spacecraft,
    state.exoplanets,
    state.cosmicLandmarks,
    state.pulsars,
    state.time,
    state.timeRate,
  ]);

  useEffect(() => {
    if (!detectWebGL2()) {
      setStatus("unsupported");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: ViewerScene;
    try {
      scene = new ViewerScene(canvas);
    } catch (err) {
      setStatus("error");
      setErrorDetail(err instanceof Error ? err.message : String(err));
      return;
    }
    sceneRef.current = scene;
    setStatus("live");
    const unsubscribe = scene.subscribe(setState);
    // Re-apply persisted projection mode so the user's previous choice is
    // honoured on subsequent visits.
    scene.setProjection(skyProjection);

    // Apply hash → scene state once the scene is ready. Wait a tick so the
    // initial Sun-aimed setForward + base-tile loads land first.
    setTimeout(() => {
      const initial = parseHash();
      if (initial.fov !== undefined) scene.setFov(initial.fov);
      if (initial.ra !== undefined && initial.dec !== undefined) {
        const raRad = (initial.ra * Math.PI) / 180;
        const decRad = (initial.dec * Math.PI) / 180;
        const cdec = Math.cos(decRad);
        // Same Z-up → Y-up rotation our astronomy groups apply: (x, z, -y)
        const dir = new Vector3(
          cdec * Math.cos(raRad),
          Math.sin(decRad),
          -cdec * Math.sin(raRad),
        ).normalize();
        scene.flyTo(dir, 600);
      }
      if (initial.time) scene.setTime(initial.time);
      if (initial.overlayId !== undefined) scene.setOverlay(initial.overlayId);
      if (initial.overlayMix !== undefined)
        scene.setOverlayMix(initial.overlayMix);
      if (initial.constellations) scene.setConstellations(true);
      if (initial.coordGrid) scene.setCoordGrid(true);
      if (initial.starLabels) scene.setStarLabels(true);
    }, 60);

    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Debounced URL writeback: keep the hash in sync with the live state so
  // the user's address bar is always a shareable view.
  useEffect(() => {
    if (status !== "live") return;
    const t = window.setTimeout(() => {
      // Convert world-Y-up forward back to celestial RA/Dec (inverse of the
      // astronomy groups' rotation.x = -π/2, i.e. (x, y, z)_world → (x, -z, y)).
      const f = state.forward;
      const xCel = f.x;
      const yCel = -f.z;
      const zCel = f.y;
      const len = Math.hypot(xCel, yCel, zCel) || 1;
      const dec =
        (Math.asin(Math.max(-1, Math.min(1, zCel / len))) * 180) / Math.PI;
      let ra = (Math.atan2(yCel, xCel) * 180) / Math.PI;
      if (ra < 0) ra += 360;
      // Preserve any `layers` selection owned by the ExtraLayersPanel so
      // camera/time/overlay writebacks don't clobber a shared deep-link.
      const existingLayers = parseHash().layers;
      const params = serializeState({
        ra,
        dec,
        fov: state.fov,
        time: state.time,
        overlayId: state.overlayId,
        overlayMix: state.overlayMix,
        constellations: state.constellations,
        coordGrid: state.coordGrid,
        starLabels: state.starLabels,
        ...(existingLayers && existingLayers.length > 0
          ? { layers: existingLayers }
          : {}),
      });
      replaceHash(params);
    }, 250);
    return () => window.clearTimeout(t);
  }, [
    status,
    state.forward,
    state.fov,
    state.time,
    state.overlayId,
    state.overlayMix,
    state.constellations,
    state.coordGrid,
    state.starLabels,
  ]);

  // Tap on sky: open the SIMBAD info panel for that direction *and* fly camera.
  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      if ((e.target as HTMLElement) !== target) return;
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      };
      const dir = unprojectNdcToDirection(state, ndc);
      scene.flyTo(dir);

      // Open the inspector with a SIMBAD cone search at this sky point.
      const { ra, dec } = worldDirectionToRaDec(dir);
      const myGen = ++inspectGenRef.current;

      // Local-first: solar bodies + ISS aren't in SIMBAD. Short-circuit
      // when the click landed on one of them (FOV-scaled tolerance).
      const localHit = resolveLocalHit(scene, dir, state.fov);
      const constellation = searchIndex?.nearestConstellation(dir) ?? null;
      if (localHit) {
        setInspect({
          raDeg: localHit.raDeg,
          decDeg: localHit.decDeg,
          dir: dir.clone(),
          loading: false,
          hit: localHit,
          error: null,
          wiki: null,
          wikiLoading: true,
          constellation,
        });
        void wikipediaSummary([localHit.name]).then((wiki) => {
          if (inspectGenRef.current !== myGen) return;
          setInspect((prev) =>
            prev ? { ...prev, wiki, wikiLoading: false } : prev,
          );
        });
        return;
      }

      setInspect({
        raDeg: ra,
        decDeg: dec,
        dir: dir.clone(),
        loading: true,
        hit: null,
        error: null,
        wiki: null,
        wikiLoading: false,
        constellation,
      });
      // FOV-scaled radius — when zoomed out, search a wider cone, so the user
      // hits *something* even with imprecise clicks.
      // Cone radius scales with FOV but stays small — the Milky Way at large
      // radius returns 250 KB of objects and SIMBAD takes 30s to respond.
      const radiusArcmin = Math.max(1, Math.min(12, state.fov * 0.4));
      simbadConeSearch(ra, dec, radiusArcmin)
        .then((hit) => {
          if (inspectGenRef.current !== myGen) return;
          setInspect((prev) =>
            prev
              ? { ...prev, loading: false, hit, wikiLoading: hit !== null }
              : prev,
          );
          if (!hit) return;
          // Chain Wikipedia lookup — best effort.
          const candidates = candidatesFromSimbad(hit.name, hit.identifiers);
          void wikipediaSummary(candidates).then((wiki) => {
            if (inspectGenRef.current !== myGen) return;
            setInspect((prev) =>
              prev ? { ...prev, wiki, wikiLoading: false } : prev,
            );
          });
        })
        .catch((err: unknown) => {
          if (inspectGenRef.current !== myGen) return;
          const msg = err instanceof Error ? err.message : String(err);
          setInspect((prev) =>
            prev ? { ...prev, loading: false, error: `SIMBAD: ${msg}` } : prev,
          );
        });
    },
    [state, searchIndex],
  );

  return (
    <div className="relative h-full w-full bg-space-950">
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        className="block h-full w-full touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
        role="img"
        aria-label="Interactive 3D sky viewer — drag to pan, pinch or wheel to zoom, tap to inspect objects"
        tabIndex={
          inspect || shortcutsOpen || aboutOpen || eventsOpen || copilotOpen || tutorialOpen
            ? -1
            : 0
        }
      />

      {/* Panel-scope boundary wraps the whole UI chrome so a popover
          crash (Copilot, Events, Tonight, …) doesn't take the 3D scene
          with it. The route-level boundary in App.tsx catches canvas /
          scene-constructor failures upstream. */}
      <ErrorBoundary scope="panel" label="Sky viewer chrome">

      {/* Top bar v3 (Wave-7 declutter) — hidden in embed mode.
          Cap: six fixed right-side buttons on desktop AND mobile —
            ✨ layers · 🧠 ask · share · ★ favorites · ☰ more · 📖 tutorial
          Everything else lives behind the ☰ drawer (desktop reuses
          MobileMenuDrawer via `desktop`) grouped per the cross-mode
          catalogue in `./ui/viewer-menu-groups.ts`. */}
      {!embed && (() => {
        const mobileMenuGroups: MobileMenuGroup[] = [
          {
            label: t("menu.group.live"),
            children: (
              <>
                <NeoPanel />
                <SkyTonightPanel observer={observer} />
                <SpaceWeatherPanel observer={observer} />
                {searchIndex && (
                  <TonightTargetsPanel
                    entries={searchIndex.allEntries()}
                    observer={observer}
                    onSelect={(dir) => sceneRef.current?.flyTo(dir)}
                  />
                )}
                <MultimessengerControls scene={sceneRef.current} />
                <JwstLiveBadge scene={sceneRef.current} />
                <ObservationLogPanel
                  scene={sceneRef.current}
                  searchIndex={searchIndex}
                />
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
                      // ignore quota / privacy-mode errors
                    }
                  }}
                  onZenith={(lat, lon) =>
                    sceneRef.current?.flyToZenith(lat, lon)
                  }
                />
              </>
            ),
          },
          {
            label: t("menu.group.tools"),
            children: (
              <>
                <GyroButton scene={sceneRef.current} />
                <ArSkyButton scene={sceneRef.current} />
                <SnapshotButton
                  onCapture={() => sceneRef.current?.snapshotPng() ?? null}
                />
                <QuickTargets
                  hasIssFix={state.iss !== null}
                  onTarget={(t) => sceneRef.current?.flyToTarget(t)}
                />
                <PowerUserPanel
                  group={sceneRef.current?.powerUserGroup() ?? null}
                  onMarkDirty={() => sceneRef.current?.markDirty()}
                  onActivateOverlay={(id) =>
                    sceneRef.current?.setOverlay(id)
                  }
                />
                <TutorPanel adapter={tutorAdapter} />
              </>
            ),
          },
          {
            label: "audio",
            children: <SonificationControls scene={sceneRef.current} />,
          },
          {
            label: "view",
            children: (
              <button
                type="button"
                onClick={() => setDsoHudVisible((v) => !v)}
                title="Toggle the DSO Distances HUD (shortcut: D)"
                className={`pointer-events-auto inline-flex min-h-[44px] items-center rounded-lg border px-2.5 font-mono text-xs backdrop-blur transition ${
                  dsoHudVisible
                    ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                ⌖ DSO HUD {dsoHudVisible ? "on" : "off"}
              </button>
            ),
          },
          {
            label: t("menu.group.modes"),
            children: (
              <>
                <button
                  type="button"
                  onClick={() => navigate("solar")}
                  title={t("viewer.solar.title")}
                  className="pointer-events-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 font-mono text-xs uppercase tracking-widest text-cyan-200 backdrop-blur transition hover:bg-cyan-400/20"
                >
                  {t("viewer.solar")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("universe")}
                  title="Open Universe Mode v2 — Earth → cosmic web in one seamless scene"
                  className="pointer-events-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 font-mono text-[11px] uppercase tracking-widest text-emerald-200 backdrop-blur transition hover:bg-emerald-400/20"
                >
                  🌌 universe v2
                </button>
                <button
                  type="button"
                  onClick={() => navigate("galactic")}
                  title="Switch to Galactic Mode"
                  className="pointer-events-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 font-mono text-xs uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/20"
                >
                  🌠 galactic
                </button>
                {tourIndex === null && (
                  <button
                    type="button"
                    onClick={startTour}
                    title="Take the guided Sky Tour"
                    className="pointer-events-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 font-mono text-xs uppercase tracking-widest text-violet-300 backdrop-blur transition hover:bg-violet-500/20"
                  >
                    ▶ sky tour
                  </button>
                )}
              </>
            ),
          },
          {
            label: "about · help",
            children: (
              <>
                <button
                  type="button"
                  onClick={() => setAboutOpen(true)}
                  title={t("viewer.about.title")}
                  className="pointer-events-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-space-950/70 px-2.5 font-mono text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
                >
                  {t("viewer.about")}
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(true)}
                  title="Keyboard shortcuts (?)"
                  className="pointer-events-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-space-950/70 px-2.5 font-mono text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
                >
                  ? shortcuts
                </button>
                <button
                  type="button"
                  onClick={() => setEventsOpen(true)}
                  title="90-day events calendar (E)"
                  className="pointer-events-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-space-950/70 px-2.5 font-mono text-xs text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
                >
                  🗓 events
                </button>
                <button
                  type="button"
                  onClick={() => setTutorialOpen(true)}
                  title={t("viewer.tutorial.title")}
                  className="pointer-events-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 font-mono text-xs text-emerald-200 backdrop-blur transition hover:bg-emerald-400/20"
                >
                  {t("viewer.tutorial")}
                </button>
              </>
            ),
          },
        ];

        return (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-4">
          {/* Left — exit only. */}
          <button
            type="button"
            onClick={() => navigate("landing")}
            title={t("viewer.back")}
            aria-label={t("viewer.back")}
            className="pointer-events-auto inline-flex min-h-[36px] shrink-0 items-center rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← {t("viewer.exit")}</span>
          </button>

          {/* Center — SearchBar fills the middle. On mobile the bar
              already collapses to an icon-only ⌘K form internally. */}
          <div className="pointer-events-auto flex min-w-0 flex-1 items-center justify-center px-1">
            <SearchBar
              index={searchIndex}
              onSelect={(entry: SearchEntry) =>
                sceneRef.current?.flyTo(entry.direction)
              }
            />
          </div>

          {/* Right cluster — six fixed slots, identical on desktop +
              mobile so muscle memory survives a resize. */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <ExtraLayersPanel scene={sceneRef.current} />
            <button
              type="button"
              onClick={() => openCopilot(null)}
              title={t("viewer.copilot.title")}
              className="pointer-events-auto inline-flex min-h-[36px] items-center rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-violet-200 backdrop-blur transition hover:bg-violet-400/20"
            >
              {t("viewer.copilot.button")}
            </button>
            <ShareButton />
            <FavoritesMenu
              favorites={favorites}
              onSelect={(dir) => sceneRef.current?.flyTo(dir)}
              onChange={reloadFavorites}
            />
            <MobileMenuDrawer desktop groups={mobileMenuGroups} />
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              title="📖 Show me how — 12-step tutorial"
              aria-label="Show me how — open the 12-step tutorial"
              className="pointer-events-auto inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-xs uppercase tracking-widest text-emerald-200 backdrop-blur transition hover:bg-emerald-400/20"
            >
              <span aria-hidden>📖</span>
              <span className="hidden sm:inline">show me how</span>
            </button>
          </div>

          {/* EventsPanel mount — kept hidden but mounted so the global
              `e` keybind has a single source of truth. The visible
              trigger lives in the "about · help" drawer group. */}
          <div className="sr-only">
            <EventsPanel
              open={eventsOpen}
              onOpenChange={setEventsOpen}
              onFlyToBody={(name) => {
                const dir = sceneRef.current?.bodyDirection(name);
                if (dir) sceneRef.current?.flyTo(dir);
              }}
              onFlyToRadiant={(raDeg, decDeg) => {
                const raRad = (raDeg * Math.PI) / 180;
                const decRad = (decDeg * Math.PI) / 180;
                const cdec = Math.cos(decRad);
                const dir = new Vector3(
                  cdec * Math.cos(raRad),
                  Math.sin(decRad),
                  -cdec * Math.sin(raRad),
                );
                sceneRef.current?.flyTo(dir);
              }}
            />
          </div>
        </div>
        );
      })()}

      {/* Bottom bar (chips + warnings) — sits above the wavelength + time strips.
          Mobile gets a smaller bottom inset + padding so chips don't bleed
          into the time strip on 375 px screens. */}
      {!embed && (
      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex items-end justify-between gap-2 p-2 md:bottom-32 md:p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 md:gap-2">
          <Chip label="FOV" value={`${state.fov.toFixed(1)}°`} />
          <Chip label="zoom" value={fovToZoomLabel(state.fov)} />
          {state.detailTiles > 0 && (
            <Chip label="detail" value={`+${state.detailTiles} tiles`} accent />
          )}
          {state.starCount > 0 && (
            <Chip
              label="HYG"
              value={`${state.starCount.toLocaleString()} stars`}
            />
          )}
          {state.dsoCount > 0 && (
            <Chip label="OpenNGC" value={`${state.dsoCount} deep-sky`} />
          )}
          {state.iss && (
            <Chip
              label="ISS"
              value={`${state.iss.lat.toFixed(1)}°, ${state.iss.lon.toFixed(1)}°`}
              accent
            />
          )}
        </div>

        <div className="hidden rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-300/90 backdrop-blur md:block">
          ⚠ polar seam crack at lat ±41.81° — known issue
        </div>
      </div>
      )}

      {/* Wavelength bar + Time strip (very bottom, centered) */}
      {!embed && status === "live" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-2">
          <WavelengthBar
            overlayId={state.overlayId}
            overlayMix={state.overlayMix}
            onSetOverlay={(id) => sceneRef.current?.setOverlay(id)}
            onSetMix={(mix) => sceneRef.current?.setOverlayMix(mix)}
            constellationsVisible={state.constellations}
            onToggleConstellations={() =>
              sceneRef.current?.setConstellations(!state.constellations)
            }
            skyCulture={skyCulture}
            onSetSkyCulture={(id) => {
              setSkyCulture(id);
              sceneRef.current?.setSkyCulture(id);
            }}
            coordGridVisible={state.coordGrid}
            onToggleCoordGrid={() =>
              sceneRef.current?.setCoordGrid(!state.coordGrid)
            }
            starLabelsVisible={state.starLabels}
            onToggleStarLabels={() =>
              sceneRef.current?.setStarLabels(!state.starLabels)
            }
            spacecraftVisible={state.spacecraft}
            onToggleSpacecraft={() =>
              sceneRef.current?.setSpacecraft(!state.spacecraft)
            }
            exoplanetsVisible={state.exoplanets}
            onToggleExoplanets={() =>
              sceneRef.current?.setExoplanets(!state.exoplanets)
            }
            cosmicLandmarksVisible={state.cosmicLandmarks}
            onToggleCosmicLandmarks={() =>
              sceneRef.current?.setCosmicLandmarks(!state.cosmicLandmarks)
            }
            pulsarsVisible={state.pulsars}
            onTogglePulsars={() =>
              sceneRef.current?.setPulsars(!state.pulsars)
            }
            projection={skyProjection}
            onToggleProjection={() => {
              const next = skyProjection === "aitoff" ? "3d" : "aitoff";
              setSkyProjection(next);
              updateSettings({ skyProjection: next });
              sceneRef.current?.setProjection(next);
            }}
          />
          <TimeStrip
            time={state.time}
            playing={state.playing}
            rate={state.timeRate}
            onPlayToggle={() => sceneRef.current?.setPlaying(!state.playing)}
            onRateChange={(r) => sceneRef.current?.setTimeRate(r)}
            onTimeChange={(t) => sceneRef.current?.setTime(t)}
          />
        </div>
      )}

      {/* Hint (top-center) — desktop only; mobile users discover by tapping */}
      {!embed && status === "live" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 hidden justify-center md:flex">
          <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[11px] uppercase tracking-widest text-white/65 backdrop-blur">
            drag · pinch · wheel · tap
          </div>
        </div>
      )}

      {/* Center-pointing HUD — only when nothing else is grabbing focus */}
      {!embed &&
        status === "live" &&
        !inspect &&
        !shortcutsOpen &&
        !aboutOpen &&
        !eventsOpen &&
        tourIndex === null && (
          <CenterHud
            forward={state.forward}
            fov={state.fov}
            searchIndex={searchIndex}
          />
        )}

      {/* Tour card (top-center; SIMBAD panel hides automatically when tour wins z-30) */}
      {!embed && status === "live" && tourIndex !== null && GRAND_TOUR[tourIndex] && (
        <TourCard
          step={GRAND_TOUR[tourIndex]!}
          index={tourIndex}
          total={GRAND_TOUR.length}
          onPrev={prevTour}
          onNext={nextTour}
          onExit={exitTour}
        />
      )}

      {/* SIMBAD info panel (click on sky) */}
      {!embed && status === "live" && inspect && (
        <SkyInfoPanel
          raDeg={inspect.raDeg}
          decDeg={inspect.decDeg}
          loading={inspect.loading}
          error={inspect.error}
          hit={inspect.hit}
          wiki={inspect.wiki}
          wikiLoading={inspect.wikiLoading}
          isFavorited={
            inspect.hit
              ? favorites.some(
                  (f) =>
                    f.name === inspect.hit!.name &&
                    Math.abs(f.raDeg - inspect.hit!.raDeg) < 0.01 &&
                    Math.abs(f.decDeg - inspect.hit!.decDeg) < 0.01,
                )
              : false
          }
          observer={observer}
          constellation={inspect.constellation}
          onClose={() => setInspect(null)}
          onFlyTo={() => sceneRef.current?.flyTo(inspect.dir)}
          onToggleFavorite={onToggleFavorite}
          onAskCopilot={(seed) => openCopilot(seed)}
        />
      )}

      {/* Cosmic Copilot — slide-in chat (lazy-loaded chunk) */}
      {!embed && status === "live" && copilotOpen && (
        <Suspense fallback={null}>
          <CopilotPanel
            open={copilotOpen}
            onClose={() => setCopilotOpen(false)}
            context={sceneContext}
            seedQuestion={copilotSeed}
            onSeedConsumed={() => setCopilotSeed(null)}
            host={copilotHost}
          />
        </Suspense>
      )}

      {/* Loading skeleton — the 5-stage indicator replaces the legacy
          single-bar veil. Stages glow as the scene streams tiles, stars,
          and DSO data; fades out once the scene is fully interactive. */}
      {status !== "unsupported" && status !== "error" && (
        <LoadingSkeleton
          progress={{
            baseTilesLoaded: state.baseTilesLoaded,
            baseTilesTotal: state.baseTilesTotal,
            starCount: state.starCount,
            dsoCount: state.dsoCount,
            ready:
              status === "live" &&
              state.baseTilesLoaded >= state.baseTilesTotal &&
              state.starCount > 0 &&
              state.dsoCount > 0,
          }}
          onDismiss={() => {
            // The skeleton handles its own unmount on dismiss — no
            // additional viewer state to flip; the live scene is
            // already mounted behind it.
          }}
        />
      )}

      {status === "unsupported" && (
        <FallbackPanel
          title="WebGL2 not available"
          body="The viewer needs WebGL2. Open this in Chrome, Firefox, Edge, or Safari 15+ on a recent device."
        />
      )}

      {status === "error" && (
        <FallbackPanel
          title="The viewer crashed on init"
          body={
            errorDetail ||
            "A renderer error prevented the sky from loading. Try refreshing or reporting this on GitHub."
          }
        />
      )}

      {!embed && shortcutsOpen && (
        <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}

      {!embed && aboutOpen && <AboutOverlay onClose={() => setAboutOpen(false)} />}

      {!embed && tutorialOpen && (
        <TutorialOverlayV2
          onClose={() => setTutorialOpen(false)}
          actions={
            {
              openCopilot: (seed?: string) => openCopilot(seed ?? null),
              openShortcuts: () => setShortcutsOpen(true),
              openAbout: () => setAboutOpen(true),
              openTonight: () => setEventsOpen(true),
              startGrandTour: () => startTour(),
              switchMode: (mode) => {
                try {
                  navigate(mode);
                } catch {
                  // ignore
                }
              },
              setOverlay: (id, mix) => {
                sceneRef.current?.setOverlay(id);
                if (mix !== undefined) sceneRef.current?.setOverlayMix(mix);
                else if (id) sceneRef.current?.setOverlayMix(0.55);
              },
            } satisfies TutorialActions
          }
        />
      )}

      {!embed && status === "live" && <FirstRunHint />}

      {!embed && status === "live" && <ColorLegend />}

      {/* DSO Distances HUD — opt-in (press D). Default OFF. Floats
          bottom-right above the SupportRibbon. */}
      {!embed && status === "live" && (
        <DsoDistancesHud
          source={
            sceneRef.current
              ? ({
                  mode: "sky",
                  unitScaleToMeters: 1,
                  getCameraWorldPos: () => sceneRef.current!.getCameraWorldPos(),
                } satisfies DsoSceneSource)
              : null
          }
          visible={dsoHudVisible}
          onDismiss={() => setDsoHudVisible(false)}
        />
      )}

      {/* WhatsNewV4Toast removed in top-bar v3 — the 12-step Tutorial v2
          now covers every v4 feature with screenshots and "Try it now"
          actions, and tombstones the old `uw:whats-new-v4:seen` key. */}

      {/* Embed-mode corner attribution — opens full app in a new tab. */}
      {embed && status === "live" && <EmbedBadge />}

      {/* Active-renderer badge — hidden in embed mode to keep the
          iframe minimal. Updates if/when the scene swaps to WebGPU. */}
      {!embed && status === "live" && (
        <RendererBadge kind={state.rendererKind} />
      )}
      </ErrorBoundary>
    </div>
  );
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
    ? "border-plasma-500/40 bg-plasma-500/10 text-plasma-400"
    : "border-white/10 bg-space-950/70 text-white/80";
  return (
    <div
      className={`flex items-baseline gap-1 rounded-lg border px-2 py-1 backdrop-blur md:gap-1.5 md:px-3 md:py-1.5 ${cls}`}
    >
      <span className="font-mono text-[9px] uppercase tracking-widest opacity-60 md:text-[10px]">
        {label}
      </span>
      <span className="font-mono text-[11px] md:text-xs">{value}</span>
    </div>
  );
}

function fovToZoomLabel(fov: number): string {
  // 60° is "1×". Smaller FOV is more zoomed in.
  const zoom = 60 / Math.max(fov, 1);
  if (zoom >= 10) return `${zoom.toFixed(0)}×`;
  if (zoom >= 1) return `${zoom.toFixed(1)}×`;
  return `${zoom.toFixed(2)}×`;
}

function FallbackPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-950/95 px-6 backdrop-blur">
      <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center backdrop-blur">
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-amber-400/80">
          can't render
        </div>
        <h2 className="font-display text-xl font-semibold text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-white/60">{body}</p>
        <button
          type="button"
          onClick={() => navigate("landing")}
          className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          ← Back to landing
        </button>
      </div>
    </div>
  );
}

/**
 * Convert canvas NDC (x, y in [-1,1]) into a 3D sky direction, given the
 * current camera state. We construct the camera basis from `forward` and a
 * world up, build a frustum-aligned ray for the click point, and return its
 * normalized direction — which becomes the new camera forward.
 */
function unprojectNdcToDirection(
  state: ViewerState,
  ndc: { x: number; y: number },
): Vector3 {
  const forward = new Vector3(
    state.forward.x,
    state.forward.y,
    state.forward.z,
  ).normalize();
  const worldUp = new Vector3(0, 1, 0);
  // If forward is too close to worldUp, swap to avoid a degenerate basis.
  const right = new Vector3().crossVectors(forward, worldUp);
  if (right.lengthSq() < 1e-6) {
    right.set(1, 0, 0);
  }
  right.normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();

  const fovRad = (state.fov * Math.PI) / 180;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const tanY = Math.tan(fovRad / 2);
  const tanX = tanY * aspect;

  return forward
    .clone()
    .add(right.multiplyScalar(ndc.x * tanX))
    .add(up.multiplyScalar(ndc.y * tanY))
    .normalize();
}

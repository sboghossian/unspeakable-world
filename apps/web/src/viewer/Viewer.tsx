import { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { ViewerScene, type ViewerState } from "./scene/scene";
import { navigate } from "../router";
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
import { EventsPanel } from "./ui/EventsPanel";
import { NeoPanel } from "./ui/NeoPanel";
import { ShareButton } from "./ui/ShareButton";
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
import { WavelengthBar } from "./ui/WavelengthBar";
import { InfoPanel } from "./ui/InfoPanel";
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
    void idx
      .loadStaticCatalogs()
      .then(() => setSearchIndex(idx))
      .catch((err) => console.warn("[search] index load failed", err));
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
      if (e.key === ".") {
        sceneRef.current?.setTime(new Date());
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
        className="block h-full w-full touch-none select-none"
        aria-label="3D sky viewer"
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2 sm:p-4">
        <button
          type="button"
          onClick={() => navigate("landing")}
          title="Back to landing"
          className="pointer-events-auto shrink-0 rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white sm:px-3"
        >
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">← The Unspeakable World</span>
        </button>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {tourIndex === null && (
            <button
              type="button"
              onClick={startTour}
              className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-violet-300 backdrop-blur transition hover:bg-violet-500/20"
              title="Take a guided tour through 8 highlights of the sky"
            >
              <span className="md:hidden">▶</span>
              <span className="hidden md:inline">▶ tour</span>
            </button>
          )}
          <EventsPanel open={eventsOpen} onOpenChange={setEventsOpen} />
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
          <FavoritesMenu
            favorites={favorites}
            onSelect={(dir) => sceneRef.current?.flyTo(dir)}
            onChange={reloadFavorites}
          />
          <ShareButton />
          <SnapshotButton
            onCapture={() => sceneRef.current?.snapshotPng() ?? null}
          />
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            title="About / credits (press i)"
            className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 font-mono text-xs text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            i
          </button>
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (press ?)"
            className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-2.5 py-1.5 font-mono text-xs text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
          >
            ?
          </button>
          <SearchBar
            index={searchIndex}
            onSelect={(entry: SearchEntry) =>
              sceneRef.current?.flyTo(entry.direction)
            }
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
            onZenith={(lat, lon) => sceneRef.current?.flyToZenith(lat, lon)}
          />
          <QuickTargets
            hasIssFix={state.iss !== null}
            onTarget={(t) => sceneRef.current?.flyToTarget(t)}
          />
          <div className="hidden rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs text-white/60 backdrop-blur lg:block">
            DSS2 color · CDS / STScI
          </div>
        </div>
      </div>

      {/* Bottom bar (chips + warnings) — sits above the wavelength + time strips */}
      <div className="pointer-events-none absolute inset-x-0 bottom-32 z-10 flex items-end justify-between gap-2 p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
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

      {/* Wavelength bar + Time strip (very bottom, centered) */}
      {status === "live" && (
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
            coordGridVisible={state.coordGrid}
            onToggleCoordGrid={() =>
              sceneRef.current?.setCoordGrid(!state.coordGrid)
            }
            starLabelsVisible={state.starLabels}
            onToggleStarLabels={() =>
              sceneRef.current?.setStarLabels(!state.starLabels)
            }
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
      {status === "live" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 hidden justify-center md:flex">
          <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[11px] uppercase tracking-widest text-white/40 backdrop-blur">
            drag · pinch · wheel · tap
          </div>
        </div>
      )}

      {/* Center-pointing HUD — only when nothing else is grabbing focus */}
      {status === "live" &&
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
      {status === "live" && tourIndex !== null && GRAND_TOUR[tourIndex] && (
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
      {status === "live" && inspect && (
        <InfoPanel
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
        />
      )}

      {/* Loading veil */}
      {status === "init" && (
        <LoadingVeil
          tilesLoaded={state.baseTilesLoaded}
          total={state.baseTilesTotal}
        />
      )}
      {status === "live" && state.baseTilesLoaded < state.baseTilesTotal && (
        <LoadingVeil
          tilesLoaded={state.baseTilesLoaded}
          total={state.baseTilesTotal}
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

      {shortcutsOpen && (
        <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />
      )}

      {aboutOpen && <AboutOverlay onClose={() => setAboutOpen(false)} />}

      {status === "live" && <FirstRunHint />}
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
      className={`flex items-baseline gap-1.5 rounded-lg border px-3 py-1.5 backdrop-blur ${cls}`}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
        {label}
      </span>
      <span className="font-mono text-xs">{value}</span>
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

function LoadingVeil({
  tilesLoaded,
  total,
}: {
  tilesLoaded: number;
  total: number;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-950/85 backdrop-blur">
      <div className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/50">
        streaming sky
      </div>
      <div className="font-display text-3xl text-white">
        {tilesLoaded}{" "}
        <span className="text-white/30">/ {total} base tiles</span>
      </div>
      <div className="mt-2 font-mono text-xs text-white/30">
        DSS2 · CDS Strasbourg
      </div>
      <div className="mt-4 h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-plasma-500 transition-all duration-300"
          style={{ width: `${(tilesLoaded / total) * 100}%` }}
        />
      </div>
    </div>
  );
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

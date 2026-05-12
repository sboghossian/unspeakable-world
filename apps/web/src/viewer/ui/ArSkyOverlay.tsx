import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import { log } from "../../lib/logger";
import type { ViewerScene, ViewerState } from "../scene/scene";
import {
  ArSkyController,
  directionToCompassAlt,
  projectDirectionToNdc,
  type ArLabel,
  type CameraStartResult,
} from "../ar-sky";
import {
  simbadConeSearch,
  worldDirectionToRaDec,
  type SimbadHit,
} from "../info/simbad";
import { resolveLocalHit } from "../info/local-resolver";
import {
  candidatesFromSimbad,
  wikipediaSummary,
  type WikiSummary,
} from "../info/wikipedia";
import { SkyInfoPanel } from "./SkyInfoPanel";

/**
 * 🛰 AR Sky overlay.
 *
 * Full-screen view that takes over while the user is in AR mode:
 *   - <video> background with the rear camera feed (or solid black if
 *     the user declined / no camera is available).
 *   - Floating label sprites for every visible sky target (planets,
 *     bright stars, ISS, cosmic landmarks).
 *   - HUD with compass heading + pointing altitude.
 *   - "Tap to identify" affordance — anywhere on the overlay triggers a
 *     SIMBAD cone search at the current camera-forward direction and
 *     opens the standard `SkyInfoPanel` with the result.
 *   - "Exit AR" button bottom-right.
 *
 * The overlay subscribes to the scene's state stream so label positions
 * track the gyroscope-driven camera in real time without an extra rAF.
 */

type Props = {
  scene: ViewerScene;
  onExit: () => void;
};

type FailureReason = Extract<CameraStartResult, { ok: false }>["reason"];

type Inspect = {
  raDeg: number;
  decDeg: number;
  dir: Vector3;
  loading: boolean;
  hit: SimbadHit | null;
  error: string | null;
  wiki: WikiSummary | null;
  wikiLoading: boolean;
};

const LABEL_PADDING_NDC = 1.05; // allow labels slightly off-screen so edges don't pop

export function ArSkyOverlay({ scene, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ArSkyController | null>(null);
  const inspectGenRef = useRef(0);
  const [forward, setForward] = useState<Vector3>(() => new Vector3(0, 0, -1));
  const [fov, setFov] = useState(60);
  const [labels, setLabels] = useState<ArLabel[]>([]);
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 360,
    height: typeof window !== "undefined" ? window.innerHeight : 640,
  });
  const [cameraStatus, setCameraStatus] = useState<
    | { kind: "pending" }
    | { kind: "live" }
    | { kind: "fallback"; reason: FailureReason; detail: string }
  >({ kind: "pending" });
  const [askCameraOptIn, setAskCameraOptIn] = useState(true);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [bright, setBright] = useState(false);
  // useCameraRef captures the user's pre-mount opt-in choice without
  // re-triggering the enter effect.
  const useCameraRef = useRef(true);

  // Subscribe to scene state for forward + fov (drives label positions
  // and HUD altitude). VoyagerControls is paused, so the only thing
  // moving the camera is our orientation stream.
  useEffect(() => {
    const unsubscribe = scene.subscribe((s: ViewerState) => {
      setForward(new Vector3(s.forward.x, s.forward.y, s.forward.z));
      setFov(s.fov);
    });
    return () => {
      unsubscribe();
    };
  }, [scene]);

  // Track viewport size so label projection stays accurate during
  // landscape rotation.
  useEffect(() => {
    const onResize = (): void => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Refresh the label list periodically — planets / ISS move with sim
  // time and `bodyDirection` snaps to the live position each call. We
  // poll the ref each tick so the interval picks the controller up as
  // soon as the entry effect installs it.
  useEffect(() => {
    if (askCameraOptIn) return;
    const handle = window.setInterval(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      setLabels(ctrl.visibleLabels());
    }, 800);
    return () => window.clearInterval(handle);
  }, [askCameraOptIn]);

  // Lifecycle: create the controller, enter, and tear down on unmount.
  // We intentionally re-run when the user toggles camera opt-in so the
  // <video> element is freshly attached after a "yes camera" tap.
  useEffect(() => {
    if (askCameraOptIn) return;
    const ctrl = new ArSkyController(scene);
    controllerRef.current = ctrl;
    let cancelled = false;
    const videoEl = videoRef.current;
    if (!videoEl) {
      log.warn("[ar-sky] video element missing");
      return;
    }
    void ctrl
      .enter({
        videoEl,
        useCamera: useCameraRef.current,
        onOrientation: () => {
          /* state updates flow through scene.subscribe */
        },
        onCameraResult: (res) => {
          if (cancelled) return;
          if (res.ok) setCameraStatus({ kind: "live" });
          else
            setCameraStatus({
              kind: "fallback",
              reason: res.reason,
              detail: res.detail,
            });
        },
      })
      .then(() => {
        if (cancelled) return;
        setLabels(ctrl.visibleLabels());
      })
      .catch((err) => log.warn("[ar-sky] enter failed", err));

    return () => {
      cancelled = true;
      ctrl.exit();
      controllerRef.current = null;
    };
  }, [scene, askCameraOptIn]);

  // Compute screen-space positions for every label given the current
  // forward + fov + viewport.
  const aspect = viewport.width / Math.max(1, viewport.height);
  const placedLabels = useMemo(() => {
    type Placed = { label: ArLabel; left: number; top: number };
    const placed: Placed[] = [];
    for (const lab of labels) {
      const proj = projectDirectionToNdc(lab.direction, forward, fov, aspect);
      if (!proj) continue;
      if (Math.abs(proj.ndcX) > LABEL_PADDING_NDC) continue;
      if (Math.abs(proj.ndcY) > LABEL_PADDING_NDC) continue;
      // NDC → CSS pixels. NDC +Y is up, CSS +Y is down → flip.
      const left = ((proj.ndcX + 1) / 2) * viewport.width;
      const top = ((1 - proj.ndcY) / 2) * viewport.height;
      placed.push({ label: lab, left, top });
    }
    return placed;
  }, [labels, forward, fov, aspect, viewport.width, viewport.height]);

  const hudCompass = useMemo(() => directionToCompassAlt(forward), [forward]);

  const handleIdentify = (e: React.MouseEvent<HTMLDivElement>): void => {
    // Only handle clicks on the overlay background — not on the buttons.
    if (e.target !== e.currentTarget && e.target !== videoRef.current) return;
    const scene2 = scene;
    const dir = forward.clone().normalize();
    const { ra, dec } = worldDirectionToRaDec(dir);
    const myGen = ++inspectGenRef.current;

    // Local-first: solar bodies + ISS aren't in SIMBAD.
    const localHit = resolveLocalHit(scene2, dir, fov);
    if (localHit) {
      setInspect({
        raDeg: localHit.raDeg,
        decDeg: localHit.decDeg,
        dir,
        loading: false,
        hit: localHit,
        error: null,
        wiki: null,
        wikiLoading: true,
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
      dir,
      loading: true,
      hit: null,
      error: null,
      wiki: null,
      wikiLoading: false,
    });
    const radiusArcmin = Math.max(1, Math.min(12, fov * 0.4));
    simbadConeSearch(ra, dec, radiusArcmin)
      .then((hit) => {
        if (inspectGenRef.current !== myGen) return;
        setInspect((prev) =>
          prev ? { ...prev, loading: false, hit, wikiLoading: hit !== null } : prev,
        );
        if (!hit) return;
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
  };

  // Initial opt-in card — explains the camera+motion permissions before
  // we trigger the platform prompts. The button click is the user
  // gesture iOS requires for both DeviceOrientationEvent.requestPermission
  // and getUserMedia, so we trigger enter() from inside this handler.
  if (askCameraOptIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/95 backdrop-blur">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-space-950 p-6 text-center shadow-2xl">
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-fuchsia-300/80">
            ar sky
          </div>
          <h2 className="font-display text-2xl text-white">
            Point your phone at the sky
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            AR Sky uses your phone's <strong>motion sensors</strong> to
            line up labels with the real sky and your{" "}
            <strong>rear camera</strong> to show what's actually above
            you.
          </p>
          <p className="mt-3 text-xs text-white/40">
            Both are <strong>opt-in</strong> and nothing leaves your
            device. iOS will ask you to confirm each permission.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                useCameraRef.current = true;
                setAskCameraOptIn(false);
              }}
              className="pointer-events-auto rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-fuchsia-200 transition hover:bg-fuchsia-500/20"
            >
              🛰 enter AR (camera + motion)
            </button>
            <button
              type="button"
              onClick={() => {
                useCameraRef.current = false;
                setAskCameraOptIn(false);
              }}
              className="pointer-events-auto rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/70 transition hover:bg-white/[0.07]"
            >
              motion only · no camera
            </button>
            <button
              type="button"
              onClick={onExit}
              className="pointer-events-auto rounded-lg px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/40 transition hover:text-white/70"
            >
              cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleIdentify}
      className="fixed inset-0 z-50 select-none overflow-hidden bg-black text-white"
    >
      {/* Camera feed — sits behind everything. `object-cover` fills the
          viewport without stretching. Black background shows through
          when the camera was declined / unavailable. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${
          cameraStatus.kind === "live" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Subtle dimming so labels stay readable over a bright sky. The
          "bright" toggle bumps the dim strength when the rear-camera
          view is overexposed (mid-day). */}
      <div
        className={`pointer-events-none absolute inset-0 mix-blend-multiply ${
          bright ? "bg-black/55" : "bg-black/25"
        }`}
      />

      {/* Reticule + tap-to-identify hint at viewport center. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-10 w-10 rounded-full border border-white/50 shadow-[0_0_24px_rgba(255,255,255,0.35)]" />
        <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/70">
          tap to identify
        </div>
      </div>

      {/* Label sprites. We render each as an absolutely positioned div.
          `pointer-events-none` so the underlying container catches the
          tap-to-identify click. */}
      {placedLabels.map(({ label, left, top }) => (
        <ArLabelSprite key={label.id} label={label} left={left} top={top} />
      ))}

      {/* HUD: compass heading + altitude. Top-left so the user's thumb
          (likely on the right) doesn't cover it. */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/15 bg-space-950/60 px-3 py-2 font-mono text-[11px] backdrop-blur">
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/40">
          pointing
        </div>
        <div className="mt-0.5 text-sm tabular-nums text-white">
          {compassRose(hudCompass.azimuthDeg)} ·{" "}
          {hudCompass.azimuthDeg.toFixed(0)}°
        </div>
        <div className="text-[11px] tabular-nums text-white/60">
          alt {hudCompass.altitudeDeg >= 0 ? "+" : ""}
          {hudCompass.altitudeDeg.toFixed(1)}°
        </div>
      </div>

      {/* Status pill — only when something's off (camera fallback). */}
      {cameraStatus.kind === "fallback" && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-200 backdrop-blur">
          {cameraStatus.reason === "permission-denied"
            ? "camera declined — labels only"
            : cameraStatus.reason === "no-camera"
              ? "no rear camera — labels only"
              : "camera unavailable — labels only"}
        </div>
      )}

      {/* Bright-mode toggle: optional — invert label colors for daytime
          AR. Bottom-left so it's reachable with the same thumb as exit. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setBright((v) => !v);
        }}
        className="pointer-events-auto absolute bottom-3 left-3 rounded-lg border border-white/15 bg-space-950/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10"
        title="Toggle high-contrast labels for daytime use"
      >
        {bright ? "☼ bright" : "☾ dim"}
      </button>

      {/* Exit AR — large hit target bottom-right. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="pointer-events-auto absolute bottom-3 right-3 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-fuchsia-200 backdrop-blur transition hover:bg-fuchsia-500/20"
        aria-label="Exit AR Sky mode"
      >
        ✕ exit AR
      </button>

      {/* SIMBAD inspector — opens on tap, dismissable via close button. */}
      {inspect && (
        <SkyInfoPanel
          raDeg={inspect.raDeg}
          decDeg={inspect.decDeg}
          loading={inspect.loading}
          error={inspect.error}
          hit={inspect.hit}
          wiki={inspect.wiki}
          wikiLoading={inspect.wikiLoading}
          observer={null}
          constellation={null}
          onClose={() => setInspect(null)}
          onFlyTo={() => undefined}
        />
      )}
    </div>
  );
}

/** Sprite for a single sky label. Memoised on identity. */
function ArLabelSprite({
  label,
  left,
  top,
}: {
  label: ArLabel;
  left: number;
  top: number;
}) {
  const palette = labelPalette(label.kind);
  return (
    <div
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 ${palette.text}`}
      style={{ left, top }}
    >
      <div
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 backdrop-blur ${palette.chip}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
        <span className="font-mono text-[11px] leading-none">{label.label}</span>
      </div>
      {label.detail && (
        <div className="mt-0.5 text-center font-mono text-[9px] text-white/55">
          {label.detail}
        </div>
      )}
    </div>
  );
}

function labelPalette(kind: ArLabel["kind"]): {
  chip: string;
  text: string;
  dot: string;
} {
  switch (kind) {
    case "sun":
      return {
        chip: "border-amber-300/50 bg-amber-300/15",
        text: "text-amber-100",
        dot: "bg-amber-200",
      };
    case "moon":
      return {
        chip: "border-slate-200/40 bg-slate-200/15",
        text: "text-slate-50",
        dot: "bg-slate-100",
      };
    case "planet":
      return {
        chip: "border-orange-300/40 bg-orange-300/10",
        text: "text-orange-100",
        dot: "bg-orange-200",
      };
    case "iss":
      return {
        chip: "border-emerald-300/50 bg-emerald-300/15",
        text: "text-emerald-100",
        dot: "bg-emerald-200",
      };
    case "star":
      return {
        chip: "border-sky-200/40 bg-sky-200/10",
        text: "text-sky-100",
        dot: "bg-sky-200",
      };
    case "cosmic":
      return {
        chip: "border-fuchsia-300/40 bg-fuchsia-300/10",
        text: "text-fuchsia-100",
        dot: "bg-fuchsia-200",
      };
    case "exoplanet":
      return {
        chip: "border-violet-300/40 bg-violet-300/10",
        text: "text-violet-100",
        dot: "bg-violet-200",
      };
  }
}

const ROSE = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

function compassRose(azDeg: number): string {
  const idx = Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16;
  return ROSE[idx] ?? "N";
}

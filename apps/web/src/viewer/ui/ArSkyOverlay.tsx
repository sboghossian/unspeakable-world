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
import { getCopy } from "../../lib/error-copy";
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
  // Pre-permission card lifecycle: "prompt" → user explains expectations,
  // "entering" → both permissions kicked off in the gesture (still inside
  // the card so we can render a spinner), "live" → overlay is active,
  // "denied-retry" → user can re-grant after a "no".
  const [optIn, setOptIn] = useState<
    "prompt" | "entering" | "live" | "demo"
  >("prompt");
  const [demoMode, setDemoMode] = useState(false);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [bright, setBright] = useState(false);
  // useCameraRef captures the user's pre-mount opt-in choice without
  // re-triggering the enter effect.
  const useCameraRef = useRef(true);
  // Stash the controller across the gesture-bound enter() and the React
  // teardown effect so the same instance is reused.
  const enterStartedRef = useRef(false);

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
    if (optIn !== "live" && optIn !== "demo") return;
    const handle = window.setInterval(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      setLabels(ctrl.visibleLabels());
    }, 800);
    return () => window.clearInterval(handle);
  }, [optIn]);

  // Cleanup: tear down the controller on unmount. We do NOT recreate the
  // controller in an effect — that would break the single-gesture
  // invariant on iOS Safari (the click → setState → rerender → effect
  // chain crosses task boundaries that strip the gesture flag). Instead
  // `beginEnter` below runs inside the click handler.
  useEffect(() => {
    return () => {
      controllerRef.current?.exit();
      controllerRef.current = null;
    };
  }, []);

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

  /**
   * Start AR Sky directly from a click handler. CRITICAL: this is the
   * single user-gesture path iOS Safari demands — both
   * `DeviceOrientationEvent.requestPermission()` and
   * `navigator.mediaDevices.getUserMedia()` must be invoked while the
   * call stack is still rooted in this React synthetic event handler.
   *
   * We deliberately do NOT route this through `setState` → effect because
   * by the time the effect runs we'd be in a fresh task and Safari would
   * silently demote the gesture token, causing the camera prompt to
   * never appear.
   */
  const beginEnter = (useCamera: boolean): void => {
    if (enterStartedRef.current) return;
    enterStartedRef.current = true;
    useCameraRef.current = useCamera;
    const videoEl = videoRef.current;
    if (!videoEl) {
      log.warn("[ar-sky] video element missing at gesture time");
      enterStartedRef.current = false;
      return;
    }
    const ctrl = new ArSkyController(scene);
    controllerRef.current = ctrl;
    // Show the spinner state while the prompts resolve.
    setOptIn("entering");
    // Kick off enter() synchronously — `enter()` itself starts both
    // permission promises *before* its first await, satisfying the
    // gesture invariant.
    void ctrl
      .enter({
        videoEl,
        useCamera,
        onOrientation: () => {
          /* state updates flow through scene.subscribe */
        },
        onCameraResult: (res) => {
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
        setOptIn("live");
        setLabels(ctrl.visibleLabels());
      })
      .catch((err) => {
        log.warn("[ar-sky] enter failed", err);
        // Reset so the user can retry.
        enterStartedRef.current = false;
        setOptIn("prompt");
      });
  };

  /**
   * Demo mode — gyro-driven sky without camera or even orientation
   * permission. Lets the user see the AR experience before granting any
   * real device access.
   */
  const beginDemo = (): void => {
    if (enterStartedRef.current) return;
    enterStartedRef.current = true;
    const ctrl = new ArSkyController(scene);
    controllerRef.current = ctrl;
    setDemoMode(true);
    setOptIn("demo");
    // Fire-and-forget — demo path will skip the camera entirely. We do
    // still ask for orientation since the user pressed a button (counts
    // as a gesture); they can decline and the sky just won't rotate.
    void ctrl
      .enter({
        videoEl: videoRef.current ?? document.createElement("video"),
        useCamera: false,
        onOrientation: () => undefined,
        onCameraResult: (res) => {
          if (!res.ok) {
            setCameraStatus({
              kind: "fallback",
              reason: res.reason,
              detail: res.detail,
            });
          }
        },
      })
      .then(() => setLabels(ctrl.visibleLabels()))
      .catch((err) => log.warn("[ar-sky] demo enter failed", err));
  };

  // The opt-in card is rendered as an overlay on top of the main AR
  // container so the <video> element survives all phase transitions —
  // moving the ref across two different DOM subtrees would orphan the
  // attached MediaStream once the camera permission resolves.
  const showOptInOverlay = optIn === "prompt" || optIn === "entering";

  return (
    <div
      ref={containerRef}
      onClick={showOptInOverlay ? undefined : handleIdentify}
      className="fixed inset-0 z-50 select-none overflow-hidden bg-black text-white"
    >
      {/* Camera feed — sits behind everything. `object-cover` fills the
          viewport without stretching. Black background shows through
          when the camera was declined / unavailable. Rendered from the
          first mount so `videoRef.current` is populated when the click
          handler invokes `beginEnter` — the iOS Safari single-gesture
          invariant depends on this. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${
          cameraStatus.kind === "live" && !showOptInOverlay
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* Pre-permission card. Sits on top of the (still mounted but
          invisible) camera <video> so the same element is reused once
          permissions resolve. */}
      {showOptInOverlay && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-space-950/95 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-space-950 p-6 text-center shadow-2xl">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-fuchsia-300/80">
              ar sky
            </div>
            <h2 className="font-display text-2xl text-white">
              Point your phone at the sky
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              We&apos;ll ask for{" "}
              <strong className="text-fuchsia-200">camera</strong> +{" "}
              <strong className="text-fuchsia-200">motion access</strong> —
              both are needed for AR sky mode. Tap to grant.
            </p>
            <p className="mt-3 text-xs text-white/40">
              Nothing leaves your device. Requires iOS Safari ≥ 13 or recent
              Chrome on Android. You&apos;ll see one prompt for each permission
              after you tap below.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => beginEnter(true)}
                disabled={optIn === "entering"}
                className="pointer-events-auto min-h-[48px] rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-fuchsia-200 transition hover:bg-fuchsia-500/20 disabled:opacity-60"
              >
                {optIn === "entering"
                  ? "requesting permissions…"
                  : "🛰 enter AR (camera + motion)"}
              </button>
              <button
                type="button"
                onClick={() => beginEnter(false)}
                disabled={optIn === "entering"}
                className="pointer-events-auto min-h-[44px] rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/70 transition hover:bg-white/[0.07] disabled:opacity-60"
              >
                motion only · no camera
              </button>
              <button
                type="button"
                onClick={beginDemo}
                disabled={optIn === "entering"}
                className="pointer-events-auto min-h-[44px] rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/55 transition hover:text-white/80 disabled:opacity-60"
                title="Try the AR view without giving any device access"
              >
                👀 sample what AR looks like (demo)
              </button>
              <button
                type="button"
                onClick={onExit}
                disabled={optIn === "entering"}
                className="pointer-events-auto min-h-[44px] rounded-lg px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white/40 transition hover:text-white/70"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Demo-mode badge — lets the user know they're seeing AR without
          camera or real sensor data, so the lack of real-sky alignment
          isn't surprising. */}
      {demoMode && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 backdrop-blur">
          demo mode
        </div>
      )}

      {/* Status pill — only when something's off (camera fallback).
          On `permission-denied` we expose a retry button that re-runs
          beginEnter() inside its own user gesture so the user can give
          a second yes without leaving AR. */}
      {cameraStatus.kind === "fallback" && (
        <div className="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-200 backdrop-blur">
          <span
            title={
              cameraStatus.reason === "permission-denied"
                ? getCopy("permission", {
                    permission: "camera",
                    feature: "AR Sky",
                  }).body
                : undefined
            }
          >
            {cameraStatus.reason === "permission-denied"
              ? "camera declined — labels only"
              : cameraStatus.reason === "no-camera"
                ? "no rear camera — labels only"
                : "camera unavailable — labels only"}
          </span>
          {cameraStatus.reason === "permission-denied" && !demoMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Tear down the existing controller so beginEnter starts
                // clean — `enterStartedRef` is the latch we have to clear
                // for the retry to take effect.
                controllerRef.current?.exit();
                controllerRef.current = null;
                enterStartedRef.current = false;
                setOptIn("prompt");
                setCameraStatus({ kind: "pending" });
              }}
              className="min-h-[36px] rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-300/25"
            >
              retry
            </button>
          )}
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
        className="pointer-events-auto absolute bottom-3 left-3 min-h-[44px] min-w-[44px] rounded-lg border border-white/15 bg-space-950/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/80 backdrop-blur transition hover:bg-white/10"
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
        className="pointer-events-auto absolute bottom-3 right-3 min-h-[44px] rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-fuchsia-200 backdrop-blur transition hover:bg-fuchsia-500/20"
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

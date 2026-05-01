import { useCallback, useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { ViewerScene, type ViewerState } from "./scene/scene";
import { navigate } from "../router";

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
  fov: 60,
  forward: { x: 0, y: 0, z: -1 },
};

export function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ViewerScene | null>(null);
  const [status, setStatus] = useState<SceneStatus>("init");
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [state, setState] = useState<ViewerState>(DEFAULT_STATE);

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

    return () => {
      unsubscribe();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Tap-to-fly: convert click coords to a sky direction and fly camera.
  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      // Discriminate tap from drag end: skip if the user is in mid-drag.
      if ((e.target as HTMLElement) !== target) return;
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      };
      // We need access to the camera's projection to unproject NDC → world.
      // Scene exposes flyTo(direction) so we compute the direction here from NDC
      // by combining the current forward + screen offset under the FOV.
      const dir = unprojectNdcToDirection(state, ndc);
      scene.flyTo(dir);
    },
    [state],
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-4">
        <button
          type="button"
          onClick={() => navigate("landing")}
          className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
        >
          ← The Unspeakable World
        </button>

        <div className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs text-white/60 backdrop-blur">
          DSS2 color · CDS / STScI
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Chip label="FOV" value={`${state.fov.toFixed(1)}°`} />
          <Chip label="zoom" value={fovToZoomLabel(state.fov)} />
          {state.detailTiles > 0 && (
            <Chip label="detail" value={`+${state.detailTiles} tiles`} accent />
          )}
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-300/90 backdrop-blur">
          ⚠ polar seam crack at lat ±41.81° — Day 3+ work
        </div>
      </div>

      {/* Hint (top-center) */}
      {status === "live" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
          <div className="rounded-full border border-white/5 bg-space-950/60 px-4 py-1 font-mono text-[11px] uppercase tracking-widest text-white/40 backdrop-blur">
            drag · pinch · wheel · tap
          </div>
        </div>
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

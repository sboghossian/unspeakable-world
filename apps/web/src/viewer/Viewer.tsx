import { useEffect, useRef, useState } from "react";
import { ViewerScene } from "./scene/scene";
import { navigate } from "../router";

type SceneStatus = "init" | "ready" | "unsupported" | "error";

function detectWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2"));
  } catch {
    return false;
  }
}

export function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(0);
  const [status, setStatus] = useState<SceneStatus>("init");
  const [errorDetail, setErrorDetail] = useState<string>("");

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

    let count = 0;
    Promise.allSettled(
      Array.from({ length: 12 }).map((_, i) => {
        return new Promise<void>((resolve) => {
          const t0 = performance.now();
          const check = () => {
            if (performance.now() - t0 > 5000) return resolve();
            count = Math.min(count + 1, 12);
            setTilesLoaded(count);
            if (count >= 12) return resolve();
            setTimeout(check, 200);
          };
          setTimeout(check, 200 + i * 80);
        });
      }),
    ).then(() => setStatus("ready"));

    return () => scene.dispose();
  }, []);

  return (
    <div className="relative h-full w-full bg-space-950">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
        aria-label="3D sky viewer"
      />

      {/* Top-left overlay: brand + back to landing */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
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

      {/* Bottom hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4">
        <div className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs text-white/40 backdrop-blur">
          drag to look · wheel to zoom · day 2 toy
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-300/90 backdrop-blur">
          ⚠ polar seam crack at lat ±41.81° — known issue, fix on Day 3
        </div>
      </div>

      {/* Loading veil */}
      {status === "init" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-950/90 backdrop-blur">
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/50">
            streaming sky
          </div>
          <div className="font-display text-3xl text-white">
            {tilesLoaded} <span className="text-white/30">/ 12 base tiles</span>
          </div>
          <div className="mt-2 font-mono text-xs text-white/30">
            DSS2 · CDS Strasbourg
          </div>
        </div>
      )}

      {/* WebGL2 unsupported */}
      {status === "unsupported" && (
        <FallbackPanel
          title="WebGL2 not available"
          body="The viewer needs WebGL2. Open this in Chrome, Firefox, Edge, or Safari 15+ on a recent device."
        />
      )}

      {/* Scene threw on init */}
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

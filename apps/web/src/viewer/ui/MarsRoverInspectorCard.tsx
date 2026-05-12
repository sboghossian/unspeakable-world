import { useCallback, useEffect, useRef, useState } from "react";

import { log } from "../../lib/logger";
import type {
  IotdPhoto,
  IotdRover,
  MarsRoverIotdApi,
} from "../mars-rover-iotd";
import { useExtraLayerEnabled } from "../extra-layers/state";

const LAYER_ID = "mars-rover-iotd";

/**
 * Minimal contract any scene must satisfy to host this card. Sky and
 * solar scene classes both implement it now that the extras controller
 * exposes `getExtraLayerApi`.
 */
export type MarsRoverHost = {
  getExtraLayerApi(id: string): unknown;
  ensureExtraLayerLoaded(id: string): Promise<void>;
};

type Props = {
  scene: MarsRoverHost | null;
};

function isMarsRoverIotdApi(v: unknown): v is MarsRoverIotdApi {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.subscribePhotos === "function" &&
    typeof o.fetchSol === "function" &&
    typeof o.refresh === "function"
  );
}

/**
 * 🛻 Mars Rover Inspector Card — floats in the top-right area whenever
 * the `mars-rover-iotd` extra layer is enabled. Subscribes to the layer's
 * photo stream and renders the current image with prev/next sol navigation.
 *
 * The card never registers with the 3D scene: it just subscribes to
 * the federated-layer zustand store. If the layer flips off, the card
 * unmounts on the next render.
 */
export function MarsRoverInspectorCard({ scene }: Props) {
  // Subscribes via the zustand store — re-renders exactly when this
  // layer's enabled bit flips. Previously this component polled
  // localStorage every 750 ms.
  const enabled = useExtraLayerEnabled(LAYER_ID);
  const [photos, setPhotos] = useState<ReadonlyArray<IotdPhoto>>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const apiRef = useRef<MarsRoverIotdApi | null>(null);

  // Whenever the layer is enabled + the scene is mounted, ensure the
  // module is loaded, then subscribe to its photo stream.
  useEffect(() => {
    if (!enabled || !scene) {
      apiRef.current = null;
      return;
    }
    let cancelled = false;
    let unsub: (() => void) | null = null;

    const wire = async () => {
      try {
        await scene.ensureExtraLayerLoaded(LAYER_ID);
      } catch (err) {
        log.warn("[mars-rover-iotd] ensureLoaded failed", err);
      }
      if (cancelled) return;
      // Poll briefly until `getExtraLayerApi` returns the handle — the
      // load can resolve before the mountLayer call lands the API.
      const tryWire = (): boolean => {
        const api = scene.getExtraLayerApi(LAYER_ID);
        if (!isMarsRoverIotdApi(api)) return false;
        apiRef.current = api;
        setLoading(true);
        unsub = api.subscribePhotos((list) => {
          if (cancelled) return;
          setPhotos(list);
          setPhotoIndex(0);
          setImgLoaded(false);
          setLoading(false);
        });
        // Kick a refresh in case the layer was mounted while disabled
        // and never fetched.
        void api.refresh().catch(() => {
          /* swallowed by fetcher */
        });
        return true;
      };
      if (!tryWire()) {
        const id = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(id);
            return;
          }
          if (tryWire()) window.clearInterval(id);
        }, 300);
        // Give up after ~3 s; the layer will retry on next enable.
        window.setTimeout(() => window.clearInterval(id), 3000);
      }
    };
    void wire();

    return () => {
      cancelled = true;
      if (unsub) unsub();
      apiRef.current = null;
    };
  }, [enabled, scene]);

  const current = photos[photoIndex] ?? null;

  const navigateSol = useCallback(
    async (delta: number) => {
      const api = apiRef.current;
      if (!api || !current) return;
      const nextSol = current.sol + delta;
      if (nextSol < 0) return;
      setLoading(true);
      setImgLoaded(false);
      try {
        const list = await api.fetchSol(current.rover, nextSol);
        if (list.length === 0) {
          // Empty sol — restore previous list so the card still shows
          // something useful. The fetchSol push has already cleared
          // photos via the subscriber, so we re-fetch the prior sol.
          await api.fetchSol(current.rover, current.sol);
        }
      } catch (err) {
        log.warn("[mars-rover-iotd] sol navigation failed", err);
      } finally {
        setLoading(false);
      }
    },
    [current],
  );

  if (!enabled) return null;

  return (
    <div className="pointer-events-auto absolute right-3 top-20 z-20 w-[min(360px,92vw)] rounded-xl border border-white/10 bg-space-950/70 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <div className="font-display text-sm text-white/95">
            🛻 Mars Rover Photo
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            NASA / JPL-Caltech
          </div>
        </div>
        {photos.length > 1 && (
          <div className="font-mono text-[10px] text-white/45">
            {photoIndex + 1}/{photos.length}
          </div>
        )}
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black/50">
        {current && (
          <img
            key={current.id}
            src={current.src}
            alt={`Mars rover ${current.rover} sol ${current.sol} via ${current.cameraFullName}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {(loading || (current && !imgLoaded)) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton />
          </div>
        )}
        {!current && !loading && (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center font-mono text-[11px] text-white/55">
            No photo for this sol. The rover may have been quiet — try the
            navigation buttons below.
          </div>
        )}
      </div>

      {current && (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div className="font-mono text-[11px] text-white/85">
              {roverDisplayName(current.rover)} · sol {current.sol}
            </div>
            <div className="font-mono text-[10px] text-white/45">
              {current.earthDate}
            </div>
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-white/55">
            {current.cameraFullName || current.cameraName || "—"}
          </div>
        </>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void navigateSol(-1)}
          disabled={!current || loading || current.sol === 0}
          aria-label="Previous sol"
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← sol −1
        </button>
        {photos.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
              }
              aria-label="Previous photo"
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/75 hover:bg-white/10"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
              aria-label="Next photo"
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/75 hover:bg-white/10"
            >
              ›
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => void navigateSol(1)}
          disabled={!current || loading}
          aria-label="Next sol"
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          sol +1 →
        </button>
      </div>
    </div>
  );
}

function roverDisplayName(r: IotdRover): string {
  return r === "perseverance" ? "Perseverance" : "Curiosity";
}

function Skeleton() {
  return (
    <div
      aria-hidden
      className="h-full w-full animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-white/5"
    />
  );
}

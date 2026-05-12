/**
 * 🛻 mars-rover-iotd — federation module.
 *
 * Wires the NASA Mars Photos API (Curiosity + Perseverance) to a
 * subscriber callback so an inspector card elsewhere in the host UI
 * can render the latest image. This module ships no 3D renderer of
 * its own — it just owns the fetch + cache lifecycle.
 *
 * Source: NASA Mars Photos API (public domain, DEMO_KEY supported but
 * rate-limited; users should set their own key for production).
 */
import type { Group } from "three";
import { log } from "../../lib/logger";
import {
  fetchIotdAcrossRovers,
  fetchMarsIotd,
  type FetchOptions,
  type IotdPhoto,
  type IotdRover,
} from "./iotd-fetcher";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "mars-rover-iotd",
  label: "Mars Rover Photo of the Day",
  icon: "🛻",
  attribution:
    "NASA / JPL-Caltech · Mars Photos API (public domain · DEMO_KEY for unauthenticated)",
  modes: ["solar", "sky"] as const,
  defaultEnabled: false,
  description:
    "Latest rover photos from Curiosity and Perseverance via the NASA Mars Photos API.",
} as const;

export type IotdSubscriber = (photos: ReadonlyArray<IotdPhoto>) => void;

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
  /** Caller passes a NASA API key when available. */
  apiKey?: string;
  /** Push subscriber for the host UI panel. */
  onPhotos?: IotdSubscriber;
  /** Initial sol; if omitted, latest photos are fetched. */
  sol?: number;
};

/**
 * Host-facing API exposed by the mounted layer so React panels can subscribe
 * to photos without driving the 3D scene. Mirrors the registry handle but
 * adds the photo subscriber surface.
 */
export type MarsRoverIotdApi = {
  /** Subscribe to photo updates. Returns an unsubscribe fn. The latest cached photos are pushed immediately. */
  subscribePhotos(cb: IotdSubscriber): () => void;
  /** Force a re-fetch (e.g. user pressed refresh). */
  refresh(): Promise<void>;
  /** Fetch a specific sol for a specific rover and push to subscribers. */
  fetchSol(rover: IotdRover, sol: number): Promise<IotdPhoto[]>;
  /** Latest cached photos pushed to subscribers, or `null` if none yet. */
  getLastPhotos(): ReadonlyArray<IotdPhoto> | null;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  /** Force a re-fetch (e.g. user pressed refresh). */
  refresh(): Promise<void>;
  /** Fetch a specific sol for a specific rover and push to subscriber. */
  fetchSol(rover: IotdRover, sol: number): Promise<IotdPhoto[]>;
  /** Stable host-facing API used by React panels. */
  getApi(): MarsRoverIotdApi;
  dispose(): void;
};

export type { IotdPhoto, IotdRover };

export function mountLayer(opts: MountOptions): MountedLayer {
  let enabled = opts.enabled;
  let currentMode: LayerMode = opts.mode;
  let cancelled = false;

  const fetchOpts: FetchOptions = opts.apiKey === undefined
    ? {}
    : { apiKey: opts.apiKey };
  const sol = opts.sol;

  const supports = (m: LayerMode): boolean => m === "solar" || m === "sky";

  const subscribers = new Set<IotdSubscriber>();
  let lastPhotos: ReadonlyArray<IotdPhoto> | null = null;

  const push = (photos: ReadonlyArray<IotdPhoto>): void => {
    if (cancelled) return;
    lastPhotos = photos;
    if (opts.onPhotos) {
      try {
        opts.onPhotos(photos);
      } catch (err) {
        log.warn("[mars-rover-iotd]", "subscriber threw", err);
      }
    }
    for (const cb of subscribers) {
      try {
        cb(photos);
      } catch (err) {
        log.warn("[mars-rover-iotd]", "subscriber threw", err);
      }
    }
  };

  const refresh = async (): Promise<void> => {
    if (!enabled || !supports(currentMode)) return;
    const list = sol === undefined
      ? await fetchIotdAcrossRovers(fetchOpts)
      : await fetchMarsIotd("curiosity", { ...fetchOpts, sol });
    push(list);
  };

  const fetchSol = (rover: IotdRover, s: number): Promise<IotdPhoto[]> =>
    fetchMarsIotd(rover, { ...fetchOpts, sol: s }).then((list) => {
      push(list);
      return list;
    });

  // Kick off the initial fetch when we're enabled + in a supported mode.
  void refresh();

  const api: MarsRoverIotdApi = {
    subscribePhotos(cb: IotdSubscriber): () => void {
      subscribers.add(cb);
      if (lastPhotos) {
        try {
          cb(lastPhotos);
        } catch (err) {
          log.warn("[mars-rover-iotd]", "subscriber threw", err);
        }
      }
      return () => {
        subscribers.delete(cb);
      };
    },
    refresh,
    fetchSol,
    getLastPhotos(): ReadonlyArray<IotdPhoto> | null {
      return lastPhotos;
    },
  };

  return {
    setEnabled(v: boolean): void {
      const wasEnabled = enabled;
      enabled = v;
      if (!wasEnabled && enabled) void refresh();
    },
    setMode(m: LayerMode): void {
      const prev = currentMode;
      currentMode = m;
      if (!supports(prev) && supports(currentMode)) void refresh();
    },
    refresh,
    fetchSol,
    getApi(): MarsRoverIotdApi {
      return api;
    },
    dispose(): void {
      cancelled = true;
      subscribers.clear();
    },
  };
}

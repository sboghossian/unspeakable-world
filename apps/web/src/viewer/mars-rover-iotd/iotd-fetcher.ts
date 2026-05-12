/**
 * Mars rover Image-of-the-Day fetcher.
 *
 * Upstream NASA endpoint:
 *   https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos?sol={sol}
 *
 * The DEMO_KEY tier (default here) is rate-limited to 30 req/h, 50/day
 * per IP. Users with a personal NASA API key can override via
 * `apiKey:` in the mount options.
 *
 * Caching:
 *   • One entry per `${rover}:${sol}` in localStorage, 24h TTL.
 *   • Latest-photos fallback when `sol` is not provided.
 */
import { log } from "../../lib/logger";

export type IotdRover = "curiosity" | "perseverance";

export type IotdPhoto = {
  id: number;
  sol: number;
  earthDate: string;
  cameraName: string;
  cameraFullName: string;
  src: string;
  rover: IotdRover;
};

type ApiPhoto = {
  id?: number;
  sol?: number;
  earth_date?: string;
  img_src?: string;
  camera?: { name?: string; full_name?: string };
  rover?: { name?: string };
};

const TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(rover: IotdRover, sol: number | "latest"): string {
  return `uw:mars-rover-iotd:${rover}:${sol}:v1`;
}

function readCache(rover: IotdRover, sol: number | "latest"): IotdPhoto[] | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(rover, sol));
    if (!raw) return null;
    const env = JSON.parse(raw) as { at: number; data: IotdPhoto[] };
    if (!env || typeof env.at !== "number" || !Array.isArray(env.data)) return null;
    if (Date.now() - env.at > TTL_MS) return null;
    return env.data;
  } catch {
    return null;
  }
}

function writeCache(
  rover: IotdRover,
  sol: number | "latest",
  data: IotdPhoto[],
): void {
  try {
    window.localStorage.setItem(
      cacheKey(rover, sol),
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    /* quota — silent */
  }
}

function normalise(raw: ApiPhoto, fallbackRover: IotdRover): IotdPhoto | null {
  if (
    !raw ||
    typeof raw.id !== "number" ||
    typeof raw.sol !== "number" ||
    typeof raw.earth_date !== "string" ||
    typeof raw.img_src !== "string"
  ) {
    return null;
  }
  // Rewrite legacy http://jpl URLs so the browser doesn't block them.
  const src = raw.img_src.replace(/^http:\/\//i, "https://");
  const roverName = raw.rover?.name?.toLowerCase();
  const rover: IotdRover =
    roverName === "perseverance" ? "perseverance" : roverName === "curiosity" ? "curiosity" : fallbackRover;
  return {
    id: raw.id,
    sol: raw.sol,
    earthDate: raw.earth_date,
    cameraName: raw.camera?.name ?? "",
    cameraFullName: raw.camera?.full_name ?? raw.camera?.name ?? "",
    src,
    rover,
  };
}

export type FetchOptions = {
  /** NASA API key. DEMO_KEY is the documented fallback. */
  apiKey?: string;
  /** Sol number; omit for the rover's latest photos. */
  sol?: number;
};

export async function fetchMarsIotd(
  rover: IotdRover,
  opts: FetchOptions = {},
): Promise<IotdPhoto[]> {
  const apiKey = opts.apiKey ?? "DEMO_KEY";
  const sol = opts.sol;
  const cacheTag: number | "latest" = sol ?? "latest";
  const cached = readCache(rover, cacheTag);
  if (cached) return cached;
  try {
    const endpoint =
      sol === undefined
        ? `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${encodeURIComponent(apiKey)}`
        : `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      log.warn("[mars-rover-iotd]", "HTTP", res.status, rover, sol);
      return [];
    }
    const body = (await res.json()) as {
      latest_photos?: ApiPhoto[];
      photos?: ApiPhoto[];
    };
    const list = body.latest_photos ?? body.photos ?? [];
    const out = list
      .map((p) => normalise(p, rover))
      .filter((p): p is IotdPhoto => p !== null);
    if (out.length > 0) writeCache(rover, cacheTag, out);
    return out;
  } catch (err) {
    log.warn("[mars-rover-iotd]", "fetch failed", err);
    return [];
  }
}

/** Convenience: latest photo from each rover, deduped. */
export async function fetchIotdAcrossRovers(
  opts: FetchOptions = {},
): Promise<IotdPhoto[]> {
  const rovers: IotdRover[] = ["curiosity", "perseverance"];
  const lists = await Promise.all(rovers.map((r) => fetchMarsIotd(r, opts)));
  const out: IotdPhoto[] = [];
  for (const list of lists) {
    if (list.length > 0) {
      const first = list[0];
      if (first) out.push(first);
    }
  }
  return out;
}

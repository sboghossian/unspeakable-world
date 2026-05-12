/**
 * NASA Mars Rover Photos API — latest_photos endpoint.
 *
 * Endpoint:
 *   https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/latest_photos
 *
 * The DEMO_KEY tier is rate-limited (30 req/h, 50/day per IP). The
 * upstream is also occasionally 4xx-y. We swallow every error path
 * silently — callers always get an array (possibly empty) so the
 * panel can fall through to its empty state without surfacing
 * scary toasts.
 *
 * Results are cached in localStorage for 24 hours per rover under
 * `uw:mars-photos:${rover}:v1`. The cache is the only thing that
 * keeps the panel snappy when DEMO_KEY hits its quota.
 */
import { log } from "../../lib/logger";

export type RoverName = "curiosity" | "perseverance" | "opportunity" | "spirit";

export type RoverPhoto = {
  id: number;
  sol: number;
  earthDate: string;
  camera: { name: string; fullName: string };
  src: string;
  rover: string;
};

type CacheEnvelope = {
  at: number;
  data: RoverPhoto[];
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
const API_KEY = "DEMO_KEY";

function cacheKey(rover: RoverName): string {
  return `uw:mars-photos:${rover}:v1`;
}

function readCache(rover: RoverName): RoverPhoto[] | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(rover));
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope;
    if (!env || typeof env.at !== "number" || !Array.isArray(env.data)) {
      return null;
    }
    if (Date.now() - env.at > TTL_MS) return null;
    return env.data;
  } catch {
    return null;
  }
}

function writeCache(rover: RoverName, data: RoverPhoto[]): void {
  try {
    window.localStorage.setItem(
      cacheKey(rover),
      JSON.stringify({ at: Date.now(), data } satisfies CacheEnvelope),
    );
  } catch {
    /* quota — silent */
  }
}

function normalize(raw: ApiPhoto, fallbackRover: RoverName): RoverPhoto | null {
  if (
    !raw ||
    typeof raw.id !== "number" ||
    typeof raw.sol !== "number" ||
    typeof raw.earth_date !== "string" ||
    typeof raw.img_src !== "string"
  ) {
    return null;
  }
  // NASA serves img_src over http:// for legacy JPL hosts. Rewrite to
  // https:// so the browser doesn't block mixed content on prod.
  const src = raw.img_src.replace(/^http:\/\//i, "https://");
  return {
    id: raw.id,
    sol: raw.sol,
    earthDate: raw.earth_date,
    camera: {
      name: raw.camera?.name ?? "",
      fullName: raw.camera?.full_name ?? raw.camera?.name ?? "",
    },
    src,
    rover: raw.rover?.name ?? fallbackRover,
  };
}

export async function fetchLatestRoverPhotos(
  rover: RoverName,
): Promise<RoverPhoto[]> {
  const cached = readCache(rover);
  if (cached) return cached;
  try {
    const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      log.warn("[mars-rovers]", "non-OK response", res.status, rover);
      return [];
    }
    const body = (await res.json()) as { latest_photos?: ApiPhoto[] };
    const list = Array.isArray(body?.latest_photos) ? body.latest_photos : [];
    const out = list
      .map((p) => normalize(p, rover))
      .filter((p): p is RoverPhoto => p !== null);
    if (out.length > 0) writeCache(rover, out);
    return out;
  } catch (err) {
    log.warn("[mars-rovers]", "fetch failed", err);
    return [];
  }
}

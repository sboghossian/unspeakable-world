/**
 * Upcoming-launch feed backed by The Space Devs' Launch Library 2.
 *
 * We hit the public `ll.thespacedevs.com/2.2.0/launch/upcoming/` endpoint
 * which is CORS-permissive at the time of writing. Responses are cached
 * in `localStorage` for 30 minutes so a panel mount or quick re-open
 * doesn't burn rate-limit quota on the upstream.
 *
 * Anything that goes wrong (network error, parse error, quota-exceeded
 * when writing the cache) resolves silently to whatever we have cached
 * or an empty array. The caller renders an "couldn't reach the feed"
 * line and that's that — no console output.
 */

export type Launch = {
  id: string;
  name: string;
  status: { name: string; abbrev: string };
  net: string; // ISO timestamp
  provider: string;
  pad: string;
  mission?: string;
  url?: string;
  image?: string;
};

const CACHE_KEY = "uw:news:launches:v1";
const TTL_MS = 30 * 60 * 1000;

type CacheEnvelope = {
  at: number;
  data: Launch[];
};

type LL2Status = { name?: string; abbrev?: string };
type LL2Pad = { name?: string; location?: { name?: string } };
type LL2Provider = { name?: string };
type LL2Mission = { name?: string };
type LL2Launch = {
  id?: string;
  name?: string;
  status?: LL2Status;
  net?: string;
  launch_service_provider?: LL2Provider;
  pad?: LL2Pad;
  mission?: LL2Mission;
  url?: string;
  image?: string;
};

function readCache(): Launch[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
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

function writeCache(data: Launch[]): void {
  try {
    const env: CacheEnvelope = { at: Date.now(), data };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(env));
  } catch {
    /* localStorage may be full or blocked — silently skip */
  }
}

function normalize(raw: LL2Launch): Launch | null {
  if (!raw || !raw.id || !raw.name || !raw.net) return null;
  const status = raw.status ?? {};
  const padName = raw.pad?.name ?? "";
  const padLoc = raw.pad?.location?.name ?? "";
  const pad = [padName, padLoc].filter(Boolean).join(", ");
  return {
    id: String(raw.id),
    name: raw.name,
    status: {
      name: status.name ?? "Unknown",
      abbrev: status.abbrev ?? "TBD",
    },
    net: raw.net,
    provider: raw.launch_service_provider?.name ?? "Unknown",
    pad: pad || "—",
    mission: raw.mission?.name,
    url: raw.url,
    image: raw.image,
  };
}

export async function fetchUpcomingLaunches(limit = 10): Promise<Launch[]> {
  const cached = readCache();
  if (cached) return cached;
  try {
    const url = `https://ll.thespacedevs.com/2.2.0/launch/upcoming/?mode=list&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return cached ?? [];
    const body = (await res.json()) as { results?: LL2Launch[] };
    const list = Array.isArray(body?.results) ? body.results : [];
    const out = list
      .map(normalize)
      .filter((x): x is Launch => x !== null)
      .slice(0, limit);
    if (out.length > 0) writeCache(out);
    return out;
  } catch {
    return cached ?? [];
  }
}

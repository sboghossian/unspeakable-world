/**
 * Cloudflare Pages Function — NASA APOD proxy.
 *
 *   GET /api/apod  → 200 with the upstream JSON, cached 1 h at the edge
 *                    503 if NASA_API_KEY is unset (landing card hides)
 *                    502 on upstream 4xx/5xx
 *
 * Why proxy: the landing-page APOD card can't ship our NASA key in the
 * client bundle, and api.nasa.gov doesn't grant a CORS wildcard for the
 * DEMO_KEY anyway. This function adds the key from the Pages env and
 * caches successful responses for 1 hour at the edge.
 *
 * Graceful degrade: with no key we 503, the client treats that as
 * "feature unavailable" and hides the card — no broken UI.
 */

const CACHE_SECONDS = 60 * 60; // 1 hour at the edge
const UPSTREAM = "https://api.nasa.gov/planetary/apod";

type ApodEnv = {
  NASA_API_KEY?: string;
};

function jsonHeaders(extra?: Record<string, string>): Headers {
  const h = new Headers({
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) h.set(k, v);
  }
  return h;
}

export const onRequest: PagesFunction<ApodEnv> = async (ctx) => {
  const req = ctx.request;
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: jsonHeaders({ "cache-control": "no-store" }),
    });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders({ "cache-control": "no-store" }),
    });
  }

  const key = ctx.env.NASA_API_KEY;
  if (!key || key.length === 0) {
    return new Response(JSON.stringify({ error: "no_key" }), {
      status: 503,
      headers: jsonHeaders({ "cache-control": "no-store" }),
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${UPSTREAM}?api_key=${encodeURIComponent(key)}`, {
      cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      headers: {
        accept: "application/json",
        "user-agent":
          "unspeakable-world (unspeakable-world.dashable.dev)",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "apod_upstream" }), {
      status: 502,
      headers: jsonHeaders({ "cache-control": "no-store" }),
    });
  }

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "apod_upstream" }), {
      status: 502,
      headers: jsonHeaders({ "cache-control": "no-store" }),
    });
  }

  // Successful — pass through the JSON with our own cache header.
  const body = await upstream.text();
  return new Response(body, {
    status: 200,
    headers: jsonHeaders({
      "cache-control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
    }),
  });
};

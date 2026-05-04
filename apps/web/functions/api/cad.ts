/**
 * Cloudflare Pages Function — JPL Close-Approach API proxy.
 *
 * Why this exists: NASA JPL's `ssd-api.jpl.nasa.gov/cad.api` is a
 * straight HTTPS endpoint with no `Access-Control-Allow-Origin` header,
 * so a browser fetch from `space.dashable.dev` is blocked. This function
 * forwards the query string to JPL, returns the JSON verbatim, and adds
 * the CORS header the browser needs.
 *
 * The matching dev-time proxy lives in apps/web/vite.config.ts so the
 * NEO panel works the same in `pnpm dev` and on Pages.
 *
 * Cache: 5-minute edge cache. JPL data updates daily at most.
 */

const UPSTREAM = "https://ssd-api.jpl.nasa.gov/cad.api";
const CACHE_SECONDS = 5 * 60;

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const target = `${UPSTREAM}?${url.searchParams.toString()}`;

  // Use Cloudflare's cache-aware fetch so repeated hits within
  // CACHE_SECONDS hit the edge instead of JPL.
  const upstream = await fetch(target, {
    cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    headers: { "user-agent": "unspeakable-world (space.dashable.dev)" },
  });

  const headers = new Headers();
  headers.set(
    "content-type",
    upstream.headers.get("content-type") ?? "application/json",
  );
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("cache-control", `public, max-age=${CACHE_SECONDS}`);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
};

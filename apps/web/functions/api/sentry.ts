/**
 * Cloudflare Pages Function — JPL Sentry impact-risk proxy.
 *
 *   Upstream: https://ssd-api.jpl.nasa.gov/sentry.api
 *
 * Like `cad.api`, Sentry does not send `Access-Control-Allow-Origin`, so
 * we forward through the edge. The Sentry table lists ~1000 NEOs with
 * a non-zero cumulative impact probability; we surface the cumulative
 * probability + Torino + year window as orange-coded solar markers.
 *
 * Cache: 30 minutes — JPL refreshes the table at most a few times a day.
 */

const UPSTREAM = "https://ssd-api.jpl.nasa.gov/sentry.api";
const CACHE_SECONDS = 30 * 60;

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const target = `${UPSTREAM}?${url.searchParams.toString()}`;

  const upstream = await fetch(target, {
    cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    headers: { "user-agent": "unspeakable-world (unspeakable-world.dashable.dev)" },
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

/**
 * Cloudflare Pages Function — Celestrak GP TLE proxy.
 *
 *   Upstream: https://celestrak.org/NORAD/elements/gp.php
 *
 * Celestrak generally sends permissive CORS headers, but the gp.php
 * endpoint is sometimes redirected through a rate-limit layer that
 * strips them, and the response body for the Starlink group is large
 * (~600 KB of plain text). Caching at the edge here keeps our hit
 * count off Celestrak's quota.
 *
 * Cache: 6 hours — Starlink TLE epochs are republished a few times a day
 * and SGP4 stays usable for ≥1 day.
 */

const UPSTREAM = "https://celestrak.org/NORAD/elements/gp.php";
const CACHE_SECONDS = 6 * 60 * 60;
const ALLOWED_GROUPS = new Set([
  "starlink",
  "stations",
  "active",
  "weather",
  "gps-ops",
  "galileo",
]);

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const group = url.searchParams.get("GROUP") ?? "";
  if (!ALLOWED_GROUPS.has(group)) {
    return new Response("bad group", { status: 400 });
  }
  const format = url.searchParams.get("FORMAT") ?? "tle";
  if (format !== "tle" && format !== "json") {
    return new Response("bad format", { status: 400 });
  }
  const target =
    `${UPSTREAM}?GROUP=${encodeURIComponent(group)}` +
    `&FORMAT=${encodeURIComponent(format)}`;

  const upstream = await fetch(target, {
    cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    headers: { "user-agent": "unspeakable-world (unspeakable-world.dashable.dev)" },
  });

  const headers = new Headers();
  headers.set(
    "content-type",
    upstream.headers.get("content-type") ?? "text/plain",
  );
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("cache-control", `public, max-age=${CACHE_SECONDS}`);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
};

/**
 * Cloudflare Pages Function — Lasair (UK ZTF broker) proxy.
 *
 * Lasair's REST API (https://lasair-ztf.lsst.ac.uk/api/) does not send
 * `Access-Control-Allow-Origin`, so the browser cannot call it directly
 * from `unspeakable-world.dashable.dev`. This function forwards the query
 * string to Lasair's `objects/` endpoint and adds the CORS header.
 *
 * Cache: 5 minutes at the edge — matches the panel-side refresh cadence.
 *
 * License note: Lasair is open with attribution. Caller must surface
 * "Data: Lasair / ZTF" in the UI.
 */

const UPSTREAM_BASE = "https://lasair-ztf.lsst.ac.uk/api";
const CACHE_SECONDS = 5 * 60;

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  // Allowed subpaths: "objects", "query" — keep the surface tight so the
  // proxy can't be abused as a generic open relay.
  const sub = url.searchParams.get("endpoint") ?? "objects";
  if (sub !== "objects" && sub !== "query") {
    return new Response("bad endpoint", { status: 400 });
  }
  const params = new URLSearchParams(url.searchParams);
  params.delete("endpoint");

  const target = `${UPSTREAM_BASE}/${sub}/?${params.toString()}`;

  const upstream = await fetch(target, {
    cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    headers: {
      "user-agent": "unspeakable-world (unspeakable-world.dashable.dev)",
      accept: "application/json",
    },
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

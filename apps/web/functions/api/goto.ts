/**
 * Cloudflare Pages Function — GOTO transient-alerts proxy / probe.
 *
 * GOTO publishes alerts via the public HTML page at
 * https://goto-observatory.org/alerts/ — no JSON yet. This function is
 * a placeholder that always returns an empty `items` array so the
 * client's `fetchGotoEvents()` always falls back cleanly to its
 * bundled curated catalogue.
 *
 * When the upstream consortium publishes a JSON endpoint we can flip
 * `UPSTREAM` to point at it and the client picks the new items up
 * without a code change.
 *
 * Cache: 15 minutes — matches half the panel-side refresh cadence.
 */

const CACHE_SECONDS = 15 * 60;

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const sub = url.searchParams.get("endpoint") ?? "alerts";
  if (sub !== "alerts") {
    return new Response("bad endpoint", { status: 400 });
  }

  // Empty payload — the client always merges the bundled curated
  // catalogue, so an empty `items` array is the safe default.
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("cache-control", `public, max-age=${CACHE_SECONDS}`);

  return new Response(JSON.stringify({ items: [] }), {
    status: 200,
    headers,
  });
};

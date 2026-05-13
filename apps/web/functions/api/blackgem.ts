/**
 * Cloudflare Pages Function — BlackGEM transient-alerts proxy / probe.
 *
 * BlackGEM publishes alerts via the public HTML page at
 * https://www.blackgem.org/ — no JSON yet. This function is a
 * placeholder that always returns an empty `items` array so the
 * client's `fetchBlackGemEvents()` always falls back cleanly to its
 * bundled curated catalogue.
 *
 * When the consortium publishes a JSON endpoint we can flip the
 * implementation to forward + cache it without any client change.
 *
 * Cache: 15 minutes.
 */

const CACHE_SECONDS = 15 * 60;

export const onRequest: PagesFunction = async (ctx) => {
  const url = new URL(ctx.request.url);
  const sub = url.searchParams.get("endpoint") ?? "alerts";
  if (sub !== "alerts") {
    return new Response("bad endpoint", { status: 400 });
  }

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

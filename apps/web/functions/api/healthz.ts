/**
 * Cloudflare Pages Function — liveness probe.
 *
 *   GET  /api/healthz  → 200 { ok, version, date }
 *   HEAD /api/healthz  → 200, no body
 *
 * No bindings required, so this stays green even when AI / KV / NASA
 * keys are unset. Use it for uptime checks and deploy-smoke tests.
 *
 * `version` is best-effort:
 *   • In production the Pages runtime exposes the deploy commit on
 *     `process.env.CF_PAGES_COMMIT_SHA`.
 *   • Locally / in tests we fall back to "unknown".
 */

type HealthEnv = Record<string, unknown>;

function corsHeaders(): Headers {
  const h = new Headers();
  h.set("content-type", "application/json");
  h.set("access-control-allow-origin", "*");
  h.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  h.set("cache-control", "no-store");
  return h;
}

function readVersion(): string {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const sha = proc?.env?.CF_PAGES_COMMIT_SHA;
    if (typeof sha === "string" && sha.length > 0) return sha;
  } catch {
    /* ignore — no Node-shape process in some runtimes */
  }
  return "unknown";
}

export const onRequest: PagesFunction<HealthEnv> = async (ctx) => {
  const req = ctx.request;
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: corsHeaders(),
    });
  }
  const body = {
    ok: true,
    version: readVersion(),
    date: new Date().toISOString(),
  };
  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: corsHeaders(),
  });
};

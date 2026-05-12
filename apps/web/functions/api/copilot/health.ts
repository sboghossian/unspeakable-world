/**
 * Cloudflare Pages Function — Copilot health probe.
 *
 * Routes:
 *   HEAD /api/copilot/health → 200 if env.AI binding is present, else 503
 *   GET  /api/copilot/health → same, with a small JSON body for debugging
 *
 * The client backend (`backends/cloudflare.ts`) HEADs this to decide
 * whether to surface "Cloudflare Workers AI" as available. If the AI
 * binding is missing this returns 503 and the Copilot transparently
 * falls back to the always-on Offline table.
 *
 * Co-located with `../copilot.ts` so they share the deployment unit; see
 * that file's header comment for the dashboard binding setup.
 */

type AIBinding = {
  run: (...args: unknown[]) => Promise<unknown>;
};

type KvBinding = {
  get: (key: string) => Promise<string | null>;
};

type CopilotHealthEnv = {
  AI?: AIBinding;
  RATE_LIMIT_KV?: KvBinding;
};

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

function body(env: CopilotHealthEnv): { status: number; payload: string } {
  const hasAi = Boolean(env.AI);
  return {
    status: hasAi ? 200 : 503,
    payload: JSON.stringify({
      ok: hasAi,
      backend: "cloudflare-workers-ai",
      model: DEFAULT_MODEL,
      hasAiBinding: hasAi,
      hasKvBinding: Boolean(env.RATE_LIMIT_KV),
    }),
  };
}

export const onRequestHead: PagesFunction<CopilotHealthEnv> = async (ctx) => {
  const { status } = body(ctx.env);
  return new Response(null, {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};

export const onRequestGet: PagesFunction<CopilotHealthEnv> = async (ctx) => {
  const { status, payload } = body(ctx.env);
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};

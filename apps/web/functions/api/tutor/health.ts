/**
 * Cloudflare Pages Function — tutor health probe.
 *
 * Routes:
 *   HEAD /api/tutor/health → 200 if a KV binding is present, else 503
 *   GET  /api/tutor/health → same, with a small JSON body
 *
 * Static-file routes take precedence over the sibling `[code].ts`
 * dynamic route, so this catches `/api/tutor/health` without colliding
 * with real session codes.
 *
 * The client uses this to decide whether to render the "🎓 Tutor"
 * button as enabled. If the operator hasn't wired a KV binding the
 * button stays visible but its panel shows a "live tutoring isn't
 * enabled on this deployment yet" message.
 */

type KvBinding = {
  get: (key: string) => Promise<string | null>;
};

type TutorHealthEnv = {
  TUTOR_KV?: KvBinding;
  RATE_LIMIT_KV?: KvBinding;
};

function ok(env: TutorHealthEnv): boolean {
  return Boolean(env.TUTOR_KV ?? env.RATE_LIMIT_KV);
}

function body(env: TutorHealthEnv): { status: number; payload: string } {
  const healthy = ok(env);
  return {
    status: healthy ? 200 : 503,
    payload: JSON.stringify({
      ok: healthy,
      backend: "cloudflare-kv",
      hasTutorKv: Boolean(env.TUTOR_KV),
      hasRateLimitKv: Boolean(env.RATE_LIMIT_KV),
    }),
  };
}

export const onRequestHead: PagesFunction<TutorHealthEnv> = async (ctx) => {
  const { status } = body(ctx.env);
  return new Response(null, {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};

export const onRequestGet: PagesFunction<TutorHealthEnv> = async (ctx) => {
  const { status, payload } = body(ctx.env);
  return new Response(payload, {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};

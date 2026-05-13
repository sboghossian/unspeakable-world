/**
 * Cloudflare Pages Function — Cosmic Copilot hosted backend.
 *
 * SETUP (must be done once, outside this repo, in the Cloudflare dashboard):
 *   1. Cloudflare Pages → unspeakable-world → Settings → Functions
 *   2. Under "AI bindings" add:
 *        Variable name: AI
 *        (no value required — Cloudflare wires it automatically)
 *   3. (Optional, for rate limiting) Settings → Functions → KV namespace
 *      bindings, add:
 *        Variable name: RATE_LIMIT_KV
 *        Namespace: a KV namespace you've created in Workers & Pages → KV
 *
 * Without the AI binding the function returns 503 from /health, which
 * causes the client backend's `available()` probe to fail and the
 * Copilot falls back to the always-on Offline table — a clean degrade.
 *
 * Endpoint behaviour:
 *   POST /api/copilot          → SSE stream of Llama 3.1 8B tokens
 *   HEAD /api/copilot/health   → 200 if AI binding present, 503 otherwise
 *   GET  /api/copilot/health   → same, with tiny JSON body
 *
 * Why same-origin only: the viewer is the only thing that should be able
 * to spend the project's free-tier Workers AI quota. We don't accept
 * cross-origin POSTs. CORS-preflight OPTIONS is allowed for completeness
 * but the request must come from the same origin.
 *
 * Streaming: `env.AI.run(..., { stream: true })` returns a ReadableStream
 * of SSE events. We pass it back to the client unchanged with the
 * appropriate `text/event-stream` headers.
 *
 * Rate limit: a simple per-IP token bucket using KV. If the
 * `RATE_LIMIT_KV` binding is absent we log a warning once and skip
 * limiting — preferable to 500-ing on a fresh deploy.
 */

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const RATE_LIMIT_REQUESTS = 30; // requests per window
const RATE_LIMIT_WINDOW_S = 60; // 1 minute window
const RATE_LIMIT_KEY_PREFIX = "copilot:ratelimit:";

let warnedAboutKv = false;
let warnedAboutAi = false;

type AIBinding = {
  run: (
    model: string,
    input: {
      messages: Array<{ role: string; content: string }>;
      stream?: boolean;
      /**
       * OpenAI-shape `tools` array. Workers AI's Llama 3.1 8B Instruct
       * binding supports tool-calling via this field on the non-streaming
       * code path; switching upstream models (e.g. Hermes-2-Pro-Mistral)
       * preserves the same field name.
       */
      tools?: ReadonlyArray<unknown>;
      /**
       * Upper bound on generated tokens. Workers AI's Llama binding
       * defaults to 256, which truncates the long-form responses the
       * lesson translator needs. Callers (the `translate-lessons.ts`
       * bake script) may raise this up to the model's hard ceiling.
       */
      max_tokens?: number;
    },
  ) => Promise<ReadableStream<Uint8Array> | Record<string, unknown>>;
};

type KvBinding = {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ) => Promise<void>;
};

type CopilotEnv = {
  AI?: AIBinding;
  RATE_LIMIT_KV?: KvBinding;
};

type CopilotRequestBody = {
  messages?: Array<{ role?: string; content?: string }>;
  model?: string;
  /**
   * When set, asks the AI binding to expose tool-calling. The function
   * passes this straight through to `env.AI.run` — the model decides
   * whether to emit `tool_calls`. The client (`backends/cloudflare.ts`)
   * runs those calls against its `CopilotHost` and re-issues the chat.
   */
  tools?: ReadonlyArray<unknown>;
  /**
   * Default true (legacy behaviour). The client sets `stream: false`
   * during the tool-probe pass so the function returns a single JSON
   * blob instead of an SSE stream.
   */
  stream?: boolean;
  /**
   * Optional upper bound on the number of tokens the model emits in
   * response. Capped server-side at 4096 to keep one call from
   * monopolising the project's free-tier Workers AI quota.
   */
  max_tokens?: number;
};

/* eslint-disable no-console */
function warn(...args: unknown[]): void {
  // Pages Functions can use console.warn directly — we're not in the
  // browser bundle so the project's "no console.log" rule doesn't apply.
  console.warn("[copilot/function]", ...args);
}
/* eslint-enable no-console */

function clientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf && cf.length > 0) return cf;
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff && xff.length > 0) return xff;
  return null;
}

/** True iff the request is same-origin (or has no Origin header at all). */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetch from page
  try {
    const reqUrl = new URL(req.url);
    const originUrl = new URL(origin);
    return reqUrl.host === originUrl.host;
  } catch {
    return false;
  }
}

/**
 * Token-bucket-ish rate limit. Stores `{count, resetAt}` JSON in KV.
 * Returns `null` if allowed, or a Response if the caller should
 * short-circuit.
 */
async function rateLimit(
  ip: string,
  kv: KvBinding | undefined,
): Promise<Response | null> {
  if (!kv) {
    if (!warnedAboutKv) {
      warn(
        "RATE_LIMIT_KV binding not set — rate limiting disabled. Bind a KV namespace under Pages → Settings → Functions to enable.",
      );
      warnedAboutKv = true;
    }
    return null;
  }

  const key = `${RATE_LIMIT_KEY_PREFIX}${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const raw = await kv.get(key);
  let count = 0;
  let resetAt = now + RATE_LIMIT_WINDOW_S;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count?: number; resetAt?: number };
      if (typeof parsed.resetAt === "number" && parsed.resetAt > now) {
        count = parsed.count ?? 0;
        resetAt = parsed.resetAt;
      }
    } catch {
      // bad value, treat as fresh window
    }
  }

  if (count >= RATE_LIMIT_REQUESTS) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        retryAfter: resetAt - now,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(resetAt - now),
        },
      },
    );
  }

  await kv.put(key, JSON.stringify({ count: count + 1, resetAt }), {
    expirationTtl: Math.max(60, resetAt - now + 5),
  });
  return null;
}

function healthResponse(env: CopilotEnv, includeBody: boolean): Response {
  const ok = Boolean(env.AI);
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (!includeBody) {
    return new Response(null, { status: ok ? 200 : 503, headers });
  }
  return new Response(
    JSON.stringify({
      ok,
      backend: "cloudflare-workers-ai",
      model: DEFAULT_MODEL,
      hasAiBinding: ok,
      hasKvBinding: Boolean(env.RATE_LIMIT_KV),
    }),
    { status: ok ? 200 : 503, headers },
  );
}

export const onRequest: PagesFunction<CopilotEnv> = async (ctx) => {
  const req = ctx.request;
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Health route (mounted at /api/copilot/health by the file-based router
  // via the dedicated `copilot/health.ts` file, but we also answer here
  // if anyone hits `/api/copilot?health=1` or similar — defence in depth).
  if (pathname.endsWith("/copilot/health")) {
    if (req.method === "HEAD") return healthResponse(ctx.env, false);
    if (req.method === "GET") return healthResponse(ctx.env, true);
    return new Response("method not allowed", { status: 405 });
  }

  if (req.method === "OPTIONS") {
    // Same-origin preflight (rare but harmless).
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": req.headers.get("origin") ?? "",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  if (!isSameOrigin(req)) {
    return new Response(
      JSON.stringify({ error: "cross-origin requests are not allowed" }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      },
    );
  }

  if (!ctx.env.AI) {
    if (!warnedAboutAi) {
      warn(
        "AI binding missing — POST /api/copilot will 503 until the binding is configured in the Pages dashboard.",
      );
      warnedAboutAi = true;
    }
    return new Response(
      JSON.stringify({
        error: "ai_binding_missing",
        hint: "Pages → Settings → Functions → AI bindings → add variable name AI",
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const ip = clientIp(req);
  if (!ip) {
    // Without a stable identifier we can't bucket safely. Refuse instead
    // of letting every anonymous caller share a single "unknown" bucket.
    return new Response(JSON.stringify({ error: "no_ip" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const limited = await rateLimit(ip, ctx.env.RATE_LIMIT_KV);
  if (limited) return limited;

  let body: CopilotRequestBody;
  try {
    body = (await req.json()) as CopilotRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m): m is { role: string; content: string } =>
            !!m &&
            typeof m.role === "string" &&
            typeof m.content === "string",
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];
  if (messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array required" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const model =
    typeof body.model === "string" && body.model.startsWith("@cf/")
      ? body.model
      : DEFAULT_MODEL;

  const wantsStream = body.stream !== false;
  const tools =
    Array.isArray(body.tools) && body.tools.length > 0 ? body.tools : undefined;

  const runInput: {
    messages: Array<{ role: string; content: string }>;
    stream: boolean;
    tools?: ReadonlyArray<unknown>;
    max_tokens?: number;
  } = { messages, stream: wantsStream };
  if (tools) runInput.tools = tools;
  if (typeof body.max_tokens === "number" && Number.isFinite(body.max_tokens)) {
    // Clamp to a safe range — 64 is roughly one tweet; 4096 is the
    // typical Llama 3.1 8B context cap on the Cloudflare binding.
    runInput.max_tokens = Math.max(64, Math.min(4096, Math.floor(body.max_tokens)));
  }

  const upstream = await ctx.env.AI.run(model, runInput);

  // Non-streaming path: hand back the parsed JSON object directly. The
  // client uses this when probing for tool calls.
  if (!wantsStream) {
    if (upstream instanceof ReadableStream) {
      // The binding chose to stream anyway — collect it into a JSON-ish
      // response so the contract holds. Best-effort.
      const text = await streamToText(upstream);
      return new Response(JSON.stringify({ response: text }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(upstream ?? {}), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  // Streaming path: env.AI.run returns a ReadableStream when stream:true.
  if (!(upstream instanceof ReadableStream)) {
    return new Response(
      JSON.stringify({
        error: "upstream returned non-streaming response",
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      },
    );
  }

  return new Response(upstream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      // Disable buffering at intermediaries (nginx-style).
      "x-accel-buffering": "no",
    },
  });
};

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return out;
}

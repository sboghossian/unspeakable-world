/**
 * Cloudflare Pages Function — live tutoring session relay.
 *
 *   GET  /api/tutor/:code  → latest state JSON (or 304 via If-None-Match)
 *   PUT  /api/tutor/:code  → teacher pushes a new state
 *   HEAD /api/tutor/:code  → 200 if the session exists, 404 otherwise
 *
 * Wire-format: `TutorState` from `src/viewer/tutor/state-codec.ts`.
 *
 * State is stored in the existing `RATE_LIMIT_KV` namespace under the
 * key `tutor:<code>`. We piggy-back on the Copilot's KV so operators
 * don't need to provision a second namespace; if you'd rather keep
 * tutoring traffic isolated, add a `TUTOR_KV` binding in the dashboard
 * and this function will prefer it (see `kvBinding()` below).
 *
 * Per-session TTL: 4 hours. The KV layer auto-expires the key, so an
 * abandoned session leaves no garbage.
 *
 * Rate limits:
 *   • PUT — at most 1 write/sec per session (teacher debounces too, but
 *           we double-check here so a wild client can't burn quota).
 *   • GET — unlimited. Students poll every 2 s; KV is cached at the
 *           edge so reads stay cheap.
 *
 * Watcher count: each GET bumps a sliding-window counter stored beside
 * the state (`tutor:<code>:watch`). The PUT response surfaces the
 * recent watcher tally in the `x-tutor-watchers` header so the
 * teacher's HUD can show "👁 students watching: N". Approximate by
 * design — KV writes are eventually consistent.
 *
 * Graceful degrade: if no KV binding is present, every method returns
 * `503 Service Unavailable` with a tiny JSON body. The client falls
 * back to a "session unavailable" panel — see `tutor/session.ts`.
 */

const TUTOR_KEY_PREFIX = "tutor:";
const WATCH_KEY_SUFFIX = ":watch";
const SESSION_TTL_S = 4 * 60 * 60; // 4 hours
const PUT_MIN_INTERVAL_MS = 900; // matches teacher-side throttle (with slack)
const WATCH_WINDOW_S = 90;
/** Crockford base32 alphabet (no I/L/O/U). Mirrors state-codec.ts. */
const SESSION_CODE_RE = /^[0-9A-HJKMNPQRSTVWXYZ]{6}$/;

type KvBinding = {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    opts?: { expirationTtl?: number },
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type TutorEnv = {
  TUTOR_KV?: KvBinding;
  RATE_LIMIT_KV?: KvBinding;
};

type StoredEntry = {
  state: string; // already-stringified JSON state from the teacher
  etag: string;
  updatedAt: number;
  lastPutAt: number;
};

type WatchEntry = {
  /** Unix-ms timestamps of recent GETs. */
  hits: number[];
};

/* eslint-disable no-console */
function warn(...args: unknown[]): void {
  console.warn("[tutor/function]", ...args);
}
/* eslint-enable no-console */

function kvBinding(env: TutorEnv): KvBinding | null {
  return env.TUTOR_KV ?? env.RATE_LIMIT_KV ?? null;
}

function unavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "tutor_unavailable",
      hint:
        "Bind a KV namespace named TUTOR_KV (preferred) or reuse RATE_LIMIT_KV in Pages → Settings → Functions.",
    }),
    {
      status: 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  );
}

function isValidCode(code: string): boolean {
  return SESSION_CODE_RE.test(code);
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const reqUrl = new URL(req.url);
    const originUrl = new URL(origin);
    return reqUrl.host === originUrl.host;
  } catch {
    return false;
  }
}

async function loadEntry(
  kv: KvBinding,
  code: string,
): Promise<StoredEntry | null> {
  const raw = await kv.get(`${TUTOR_KEY_PREFIX}${code}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredEntry>;
    if (
      typeof parsed.state === "string" &&
      typeof parsed.etag === "string" &&
      typeof parsed.updatedAt === "number"
    ) {
      return {
        state: parsed.state,
        etag: parsed.etag,
        updatedAt: parsed.updatedAt,
        lastPutAt: parsed.lastPutAt ?? 0,
      };
    }
  } catch {
    /* corrupt entry — treat as missing */
  }
  return null;
}

async function recordWatchHit(kv: KvBinding, code: string): Promise<number> {
  const key = `${TUTOR_KEY_PREFIX}${code}${WATCH_KEY_SUFFIX}`;
  const now = Date.now();
  const cutoff = now - WATCH_WINDOW_S * 1000;
  let hits: number[] = [];
  try {
    const raw = await kv.get(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WatchEntry>;
      if (Array.isArray(parsed.hits)) {
        hits = parsed.hits.filter((t) => typeof t === "number" && t > cutoff);
      }
    }
  } catch {
    /* ignore */
  }
  hits.push(now);
  // Cap at 256 entries so a hot session doesn't bloat the value.
  if (hits.length > 256) hits = hits.slice(-256);
  try {
    await kv.put(key, JSON.stringify({ hits }), {
      expirationTtl: WATCH_WINDOW_S * 2,
    });
  } catch (err) {
    warn("watch put failed", err);
  }
  return uniqueWindowedCount(hits, cutoff);
}

async function readWatcherCount(kv: KvBinding, code: string): Promise<number> {
  const key = `${TUTOR_KEY_PREFIX}${code}${WATCH_KEY_SUFFIX}`;
  try {
    const raw = await kv.get(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<WatchEntry>;
    if (!Array.isArray(parsed.hits)) return 0;
    const cutoff = Date.now() - WATCH_WINDOW_S * 1000;
    return uniqueWindowedCount(parsed.hits, cutoff);
  } catch {
    return 0;
  }
}

/**
 * The hits array conflates polls from N distinct students. We treat
 * "students watching" as the count of hits in the recent window divided
 * by the expected polls-per-student-per-window (window / 2 s).
 */
function uniqueWindowedCount(hits: number[], cutoff: number): number {
  const recent = hits.filter((t) => t > cutoff);
  // Two-second polling cadence — see `tutor/session.ts`.
  const pollsPerStudent = Math.max(1, Math.floor(WATCH_WINDOW_S / 2));
  return Math.max(0, Math.round(recent.length / pollsPerStudent));
}

function makeEtag(payload: string): string {
  // Tiny FNV-1a over the payload — good enough for "did anything change".
  let h = 2166136261 >>> 0;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `"${h.toString(16)}-${payload.length.toString(36)}"`;
}

function noStoreHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  }
  return headers;
}

export const onRequest: PagesFunction<TutorEnv> = async (ctx) => {
  const req = ctx.request;
  const url = new URL(req.url);

  const params = ctx.params as { code?: string | string[] };
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  if (!rawCode) {
    return new Response(JSON.stringify({ error: "missing_code" }), {
      status: 400,
      headers: noStoreHeaders(),
    });
  }
  const code = rawCode.toUpperCase();
  if (!isValidCode(code)) {
    return new Response(JSON.stringify({ error: "invalid_code" }), {
      status: 400,
      headers: noStoreHeaders(),
    });
  }

  const kv = kvBinding(ctx.env);
  if (!kv) {
    warn(
      "No KV binding found — set TUTOR_KV (preferred) or RATE_LIMIT_KV in Pages → Settings → Functions.",
    );
    return unavailableResponse();
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": req.headers.get("origin") ?? "",
        "access-control-allow-methods": "GET, PUT, HEAD, OPTIONS",
        "access-control-allow-headers": "content-type, if-none-match",
        "access-control-max-age": "86400",
      },
    });
  }

  // PUT — teacher writes new state.
  if (req.method === "PUT") {
    if (!isSameOrigin(req)) {
      return new Response(
        JSON.stringify({ error: "cross_origin_blocked" }),
        { status: 403, headers: noStoreHeaders() },
      );
    }
    let body: string;
    try {
      body = await req.text();
    } catch {
      return new Response(JSON.stringify({ error: "read_failed" }), {
        status: 400,
        headers: noStoreHeaders(),
      });
    }
    if (body.length === 0 || body.length > 4096) {
      return new Response(
        JSON.stringify({ error: "payload_size" }),
        { status: 413, headers: noStoreHeaders() },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        { status: 400, headers: noStoreHeaders() },
      );
    }
    if (!parsed || typeof parsed !== "object") {
      return new Response(
        JSON.stringify({ error: "invalid_payload" }),
        { status: 400, headers: noStoreHeaders() },
      );
    }

    const existing = await loadEntry(kv, code);
    const now = Date.now();
    if (existing && now - existing.lastPutAt < PUT_MIN_INTERVAL_MS) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          retryAfterMs: PUT_MIN_INTERVAL_MS - (now - existing.lastPutAt),
        }),
        {
          status: 429,
          headers: noStoreHeaders({
            "retry-after": "1",
          }),
        },
      );
    }

    const etag = makeEtag(body);
    const entry: StoredEntry = {
      state: body,
      etag,
      updatedAt: now,
      lastPutAt: now,
    };
    try {
      await kv.put(
        `${TUTOR_KEY_PREFIX}${code}`,
        JSON.stringify(entry),
        { expirationTtl: SESSION_TTL_S },
      );
    } catch (err) {
      warn("put failed", err);
      return new Response(
        JSON.stringify({ error: "kv_write_failed" }),
        { status: 502, headers: noStoreHeaders() },
      );
    }

    const watchers = await readWatcherCount(kv, code);
    return new Response(
      JSON.stringify({ ok: true, watchers, etag }),
      {
        status: 200,
        headers: noStoreHeaders({
          etag,
          "x-tutor-watchers": String(watchers),
        }),
      },
    );
  }

  // HEAD — existence probe (cheap).
  if (req.method === "HEAD") {
    const entry = await loadEntry(kv, code);
    return new Response(null, {
      status: entry ? 200 : 404,
      headers: noStoreHeaders(entry ? { etag: entry.etag } : undefined),
    });
  }

  // GET — student polls latest state.
  if (req.method === "GET") {
    // Health subroute is handled in functions/api/tutor/health.ts.
    if (url.pathname.endsWith("/health")) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: noStoreHeaders(),
      });
    }
    const entry = await loadEntry(kv, code);
    if (!entry) {
      return new Response(
        JSON.stringify({ error: "session_not_found" }),
        { status: 404, headers: noStoreHeaders() },
      );
    }
    const watchers = await recordWatchHit(kv, code);
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      return new Response(null, {
        status: 304,
        headers: noStoreHeaders({
          etag: entry.etag,
          "x-tutor-watchers": String(watchers),
        }),
      });
    }
    return new Response(entry.state, {
      status: 200,
      headers: noStoreHeaders({
        etag: entry.etag,
        "x-tutor-watchers": String(watchers),
      }),
    });
  }

  return new Response(JSON.stringify({ error: "method_not_allowed" }), {
    status: 405,
    headers: noStoreHeaders({ allow: "GET, HEAD, PUT, OPTIONS" }),
  });
};

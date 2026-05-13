/**
 * 🌌 Unspeakable Cron — sidecar Worker that fires the Pages Function
 * `/api/cron/daily-post` on a daily schedule.
 *
 * Cloudflare Pages Functions don't have native cron support, so this
 * tiny Worker lives alongside the Pages project and exists solely to
 * invoke the endpoint on a `[triggers.crons]` schedule.
 *
 * What it does:
 *   1. Wakes at 09:00 UTC (see wrangler.toml).
 *   2. Fetches `${DAILY_POST_URL}` and parses the JSON envelope.
 *   3. Routes the post to the configured target (`log` for now;
 *      `discord` / `twitter` / `bluesky` / `discussions` are stubs
 *      ready to be wired up when secrets arrive).
 *   4. Emits an INFO log either way so `wrangler tail` shows daily activity.
 *
 * Also exposes a `fetch` handler so the Worker URL itself can be poked
 * manually for debugging:
 *   $ curl https://unspeakable-cron.<acct>.workers.dev/?run=1
 */

type Env = {
  DAILY_POST_URL: string;
  POST_TARGET: string;
  // Optional secrets that activate specific targets — set via
  // `wrangler secret put <NAME>` when ready:
  //   DISCORD_WEBHOOK_URL
  //   TWITTER_BEARER_TOKEN  (write scope)
  //   BLUESKY_HANDLE        (@you.bsky.social)
  //   BLUESKY_APP_PASSWORD  (App password from bsky.app/settings)
  //   GITHUB_TOKEN          (repo + discussions:write scope)
  //   GITHUB_REPO           (owner/repo)
  DISCORD_WEBHOOK_URL?: string;
  TWITTER_BEARER_TOKEN?: string;
  BLUESKY_HANDLE?: string;
  BLUESKY_APP_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
};

type DailyPost = {
  date: string;
  text: string;
  image_url?: string;
  viewer_link?: string;
  sources?: Record<string, unknown>;
};

async function fetchDailyPost(env: Env): Promise<DailyPost> {
  const res = await fetch(env.DAILY_POST_URL, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!res.ok) {
    throw new Error(`daily-post ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as DailyPost;
}

async function postToDiscord(env: Env, post: DailyPost): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return;
  const body = {
    content: post.text,
    embeds: post.image_url
      ? [{ url: post.viewer_link, image: { url: post.image_url } }]
      : undefined,
  };
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postToBluesky(env: Env, post: DailyPost): Promise<void> {
  if (!env.BLUESKY_HANDLE || !env.BLUESKY_APP_PASSWORD) return;
  // Login to get an access JWT.
  const auth = await fetch(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: env.BLUESKY_HANDLE,
        password: env.BLUESKY_APP_PASSWORD,
      }),
    },
  );
  if (!auth.ok) return;
  const { accessJwt, did } = (await auth.json()) as {
    accessJwt: string;
    did: string;
  };
  // Bluesky posts cap at 300 chars; truncate + ellipsis if needed.
  const text =
    post.text.length > 290 ? post.text.slice(0, 287) + "…" : post.text;
  await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessJwt}`,
    },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: text + " #unspeakable-world",
        createdAt: new Date().toISOString(),
      },
    }),
  });
}

async function postToGitHubDiscussion(
  env: Env,
  post: DailyPost,
): Promise<void> {
  // Posting to a GitHub Discussion requires a GraphQL mutation. Sketch
  // only; user supplies GITHUB_TOKEN + GITHUB_REPO when they want this.
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return;
  // Implementation deferred — needs a known category_id.
}

async function dispatchPost(env: Env, post: DailyPost): Promise<void> {
  const targets = env.POST_TARGET.split(",").map((t) => t.trim());
  await Promise.allSettled(
    targets.map((t) => {
      if (t === "discord") return postToDiscord(env, post);
      if (t === "bluesky") return postToBluesky(env, post);
      if (t === "discussions") return postToGitHubDiscussion(env, post);
      return Promise.resolve();
    }),
  );
}

export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      const post = await fetchDailyPost(env);
      await dispatchPost(env, post);
      console.log(
        JSON.stringify({
          level: "info",
          msg: "daily-post fired",
          date: post.date,
          target: env.POST_TARGET,
          preview: post.text.slice(0, 80),
        }),
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "daily-post failed",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const u = new URL(req.url);
    if (u.searchParams.get("run") !== "1") {
      return new Response(
        "Unspeakable cron worker. Fires daily at 09:00 UTC. " +
          "Append `?run=1` to trigger manually.\n",
        { headers: { "content-type": "text/plain" } },
      );
    }
    // Manual trigger for debugging — same code path as scheduled().
    try {
      const post = await fetchDailyPost(env);
      await dispatchPost(env, post);
      return new Response(JSON.stringify({ ok: true, post }, null, 2), {
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        },
      );
    }
  },
};

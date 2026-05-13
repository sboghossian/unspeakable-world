# Self-host The Unspeakable World

The Unspeakable World is MIT-licensed and free forever. If you want your own
copy — for a class, a community, or just because the official deployment is
down — this guide walks you through standing it up on your own Cloudflare
account. The free tier is plenty for everything except the most popular
classroom usage.

## Prereqs

- Node 22 (use `nvm install 22` or similar)
- pnpm 9+ (`npm i -g pnpm`)
- A Cloudflare account (free tier is fine)
- `wrangler` CLI logged in (`pnpm dlx wrangler login`)

## Steps

1. **Fork and clone**

   ```sh
   gh repo fork sboghossian/unspeakable-world --clone
   cd unspeakable-world
   ```

2. **Install deps**

   ```sh
   pnpm install
   ```

3. **Create the Pages project**

   Either click through the Cloudflare dashboard, or:

   ```sh
   pnpm dlx wrangler pages project create unspeakable-world --production-branch main
   ```

4. **Bind resources**

   The web app's Pages Functions read these bindings (see `apps/web/functions/`):

   - `AI` — Workers AI binding (free tier includes a generous monthly budget)
   - `TUTOR_KV` — KV namespace for the Cosmic Copilot cache
   - `RATE_LIMIT_KV` — KV namespace for per-IP rate limiting

   Create the KV namespaces and add the bindings via the dashboard (or
   `wrangler kv:namespace create`). Then set secrets:

   ```sh
   pnpm dlx wrangler pages secret put NASA_API_KEY --project-name unspeakable-world
   ```

   `NASA_API_KEY` is the only required secret; grab a free one at
   <https://api.nasa.gov>. `CF_PAGES_COMMIT_SHA` is injected by Cloudflare
   automatically.

5. **Build and deploy**

   ```sh
   pnpm build
   pnpm dlx wrangler pages deploy apps/web/dist \
     --project-name unspeakable-world \
     --branch main
   ```

6. **(Optional) Sidecar cron worker**

   The cron worker posts daily updates to Discord / Bluesky / GitHub. Skip
   it if you don't want social posts.

   ```sh
   cd apps/cron-worker
   pnpm dlx wrangler secret put DISCORD_WEBHOOK_URL    # optional
   pnpm dlx wrangler secret put BLUESKY_HANDLE         # optional
   pnpm dlx wrangler secret put BLUESKY_APP_PASSWORD   # optional
   pnpm dlx wrangler secret put GITHUB_TOKEN           # optional, for issue posts
   pnpm dlx wrangler secret put GITHUB_REPO            # e.g. yourname/unspeakable-world
   pnpm dlx wrangler secret put DAILY_POST_URL         # your deployed site URL
   pnpm dlx wrangler secret put POST_TARGET            # discord|bluesky|github
   pnpm dlx wrangler deploy
   ```

It's MIT, fork it, change it, host it. No catch.

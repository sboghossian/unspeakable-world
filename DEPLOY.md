# Deployment — unspeakable-world.dashable.dev

The production site is hosted on Cloudflare Pages. This file documents
how to make a deploy succeed when the live URL stops updating.

## Project shape

This is a pnpm + Turborepo monorepo. The web app lives at `apps/web`,
the public output is `apps/web/dist`. Cloudflare Pages should be
configured as:

| Setting                  | Value                                         |
| ------------------------ | --------------------------------------------- |
| Build command            | `pnpm install && pnpm --filter web build`     |
| Build output directory   | `apps/web/dist`                               |
| Root directory           | `/`                                           |
| Node version             | `20`                                          |
| Production branch        | `main`                                        |

## Files this repo ships for CF Pages

- `apps/web/public/_headers` — long-cache hashed assets, short-cache
  HTML so deploys propagate immediately.
- `apps/web/public/_redirects` — `/* → /index.html 200` so the SPA
  hash router (`#universe`, `#solar`, `#viewer`, `#surface/<p>`,
  `#galactic`, `#guide/*`) loads on first visit.

## When the live URL stops updating

1. Open the Cloudflare Pages dashboard for `unspeakable-world`.
2. Check the "Deployments" tab — the most recent commit should appear
   with a green tick. If it's red:
   - Click the failed deploy → "View build log".
   - Common causes:
     - `pnpm-lock.yaml` out of sync after a dep change → push a fresh
       lockfile.
     - Node version too old → set to 20 in dashboard env.
     - Out-of-memory during `vite build` → upgrade to Standard tier
       or split the bundle further.
3. If "Deployments" is missing the latest commit, the GitHub →
   Cloudflare connection is broken. Reconnect under Settings →
   Builds & deployments.

## Verify locally before pushing

```sh
pnpm --filter web build
ls apps/web/dist
```

Should produce hashed assets under `apps/web/dist/assets/` and an
`index.html`. Open `apps/web/dist/index.html` in a browser to verify.

## Daily auto-post cron

`apps/web/functions/api/cron/daily-post.ts` generates a JSON payload
combining today's APOD, a rotating sky-culture, and tonight's brightest
sky event. The endpoint is live at
`https://unspeakable-world.dashable.dev/api/cron/daily-post`.

Cloudflare **Pages Functions do not support cron triggers natively**
(as of 2026-05). Two ways to actually fire it on a schedule:

### Option A — sibling Cloudflare Worker (recommended long-term)

Deploy a tiny separate Worker that just `fetch`es the endpoint. Its
`wrangler.toml`:

```toml
name = "unspeakable-daily-post-cron"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[triggers]
crons = ["0 14 * * *"]   # 14:00 UTC every day
```

Worker body:

```ts
export default {
  async scheduled(_event: ScheduledEvent, _env: unknown, ctx: ExecutionContext) {
    const res = await fetch(
      "https://unspeakable-world.dashable.dev/api/cron/daily-post",
    );
    const payload = await res.json();
    // Forward to Mastodon / Bluesky / X here.
    ctx.waitUntil(Promise.resolve(payload));
  },
};
```

### Option B — external cron (zero infrastructure)

Add a GitHub Actions schedule (or a cron on the Mac Mini) that
`curl`s the endpoint daily and forwards the JSON to whatever poster
you wire up:

```yaml
# .github/workflows/daily-post.yml
on:
  schedule:
    - cron: "0 14 * * *"
jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sf https://unspeakable-world.dashable.dev/api/cron/daily-post \
            | jq -r .text
```

For v1 we use option B — it doesn't require a second deployment unit.
Switch to option A once we have multiple cron jobs (e.g. weekly digest,
monthly newsletter) to amortise the second Worker.

### Optional: NASA API key

Set `NASA_API_KEY` in the Pages project's environment to lift the
30-req/hour `DEMO_KEY` cap. Get one at
<https://api.nasa.gov/>.

# Deployment — space.dashable.dev

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

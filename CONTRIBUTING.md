# Contributing to The Unspeakable World

Thanks for wanting to help. This is an MIT-licensed browser planetarium and
every contribution — from typo fixes to whole new federation modules — is
welcome. Read this once before opening your first PR.

## Code of Conduct

This project follows the
[Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating you agree to uphold it. Report abuse to
`stephane@dashable.dev`.

## Quick start

```bash
git clone https://github.com/sboghossian/unspeakable-world.git
cd unspeakable-world
pnpm install
pnpm --filter @unspeakable/web dev   # http://localhost:5173
```

Build the whole thing:

```bash
pnpm --filter @unspeakable/web typecheck
pnpm --filter @unspeakable/web build
pnpm --filter @unspeakable/web test          # vitest unit tests
pnpm --filter @unspeakable/web test:smoke    # playwright (needs `pnpm test:install-browsers` once)
```

CI runs the same `typecheck` and `build` on every push and PR — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml). If those don't
pass locally, your PR won't merge.

## Filing issues

- **Bugs** — use the
  [bug report template](.github/ISSUE_TEMPLATE/bug.md). Include browser,
  GPU (chrome://gpu → "GL_RENDERER"), and a screenshot or short clip if
  the bug is visual.
- **Feature requests** — use the
  [feature template](.github/ISSUE_TEMPLATE/feature.md). For anything
  larger than a couple of files, open an
  [RFC](RFC/README.md) first.
- **Security** — please email `stephane@dashable.dev` rather than
  opening a public issue.

## Proposing changes

### Small fixes (< ~150 lines, < ~3 files)

Open a PR directly. Reference the issue it closes, attach a screenshot
if visual, and we'll usually merge within a few days.

### Larger changes (new federation modules, schema changes, UI redesigns)

Open an **RFC issue first** using the template at
[`RFC/0000-template.md`](RFC/0000-template.md). See
[`GOVERNANCE.md`](GOVERNANCE.md) for the decision process and the
seven-day comment window.

## Pull request style

- One concern per PR. Refactors and new features in separate PRs make
  review tractable.
- Fill in the
  [PR template](.github/PULL_REQUEST_TEMPLATE.md) — the checklist isn't
  busywork, it's the same checklist the maintainer runs before merge.
- Keep the **conventional commits** style on every commit:
  - `feat: add Voyager 2 trajectory to SPICE layer`
  - `fix: clamp altitude sparkline to horizon when target is circumpolar`
  - `chore: bump three to 0.171.1`
  - `docs: explain how to fetch a new APOD key`
  - `refactor: extract HII region color ramp`
  - `test: cover empty-result path in SIMBAD client`
- A short body explaining **why** is more useful than a long body
  explaining what (the diff already says what).

## Hard constraints (from [`CLAUDE.md`](CLAUDE.md))

These are non-negotiable — PRs that violate them get bounced regardless
of how good the feature is:

- **MIT-compatible licenses only.** No GPL/AGPL dependencies, ever.
- **TypeScript strict** with `noUncheckedIndexedAccess`.
- **No `console.log`** — use `apps/web/src/lib/logger.ts`.
- **Tailwind only** for styling — no inline `style={…}`, no CSS modules.
- **Render-on-demand** — long-running rAF loops must pause when the
  camera is idle (`> 250 ms`).
- **Federate, don't ingest** — large catalogs stream from CDS / IRSA /
  ESASky CDNs. We don't host anything > 10 GB.

## Adding a new federation module

The pattern is documented inline in
`apps/web/src/viewer/extra-layers/registry.ts`. The short version:

1. Create a module under `apps/web/src/viewer/<your-layer>/` exporting
   `LAYER_META` and `mountLayer(opts)`.
2. Add a hard-coded `LayerMeta` mirror + lazy `loader` thunk to
   `EXTRA_LAYERS` in the registry.
3. If you need a baked catalog, add a `bake-<your-layer>.ts` to
   `scripts/` and a `bake:<your-layer>` script to
   `apps/web/package.json`.
4. Cite your data source in the `attribution` field — every catalog we
   ship must be MIT-or-equivalent open.

## Releasing

The project deploys continuously to Cloudflare Pages from `main` — see
[`DEPLOY.md`](DEPLOY.md). There are no formal version tags yet; once
the v1 sprint ends we'll cut `0.1.0` and switch to semver.

## Questions?

Open a
[discussion](https://github.com/sboghossian/unspeakable-world/discussions)
or DM the maintainer.

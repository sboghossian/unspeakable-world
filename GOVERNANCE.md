# Project Governance

## Current state

The Unspeakable World is currently maintained by a single benevolent
dictator: **[@sboghossian](https://github.com/sboghossian)**
(`stephane@dashable.dev`). The project is young — most of the codebase
was written in a 7-day sprint in May 2026 — and a single-maintainer
model is the right speed for now.

We are **explicitly open to RFC proposals** from anyone, including
proposals to expand this governance model. The goal is a healthy
multi-maintainer project once we have a stable v1 and a steady stream
of outside contributors.

## Decision process

### Small fixes — straight to PR

A change is "small" if all of the following are true:

- Touches `< 150` lines and `< 3` files.
- Doesn't change a public API (URL routes, data schemas in
  `apps/web/public/data/`, layer registry IDs, the `LAYER_META`
  contract).
- Doesn't add a new top-level dependency.
- Has no UX surface area beyond what the issue it closes describes.

Open a PR, fill in the
[template](.github/PULL_REQUEST_TEMPLATE.md), and the maintainer
reviews. Typical turnaround: 1–4 days.

### Larger changes — RFC first

Anything that is **not** small needs an RFC issue before code lands:

- New federation modules (any new entry in `EXTRA_LAYERS`).
- New first-class viewer modes (today: `sky`, `solar`, `galactic`,
  `universe`).
- Changes to baked-catalog schemas in `apps/web/public/data/`.
- Removing or renaming an existing layer (these break user bookmarks
  and shared URLs).
- New runtime dependencies > 50 KB gzipped, or any dependency that
  isn't MIT/Apache/BSD/ISC.
- Anything touching the scene class files
  (`apps/web/src/viewer/{Universe,Galactic,SolarFlight,…}.tsx`) beyond
  consuming the existing scene API.

#### RFC process

1. Open an issue using the
   [RFC template](RFC/0000-template.md). Title it `RFC: <one-line
   summary>`.
2. **Seven-day comment window.** The maintainer leaves the issue open
   for at least 7 days so contributors in other time zones get a
   chance to weigh in. Major comments get addressed in-thread; minor
   nits can wait for PR review.
3. **Decision.** After the window closes the maintainer marks the RFC
   as `accepted`, `accepted-with-changes`, `deferred`, or `rejected`,
   with a one-paragraph rationale. Accepted RFCs are committed to the
   repo as `RFC/NNNN-<slug>.md` so the trail of decisions is part of
   the codebase.
4. **Implementation.** The RFC author (or anyone) opens PRs that
   reference the RFC issue.

### Disputes

If you disagree with the maintainer's call on an RFC, say so in the
RFC thread. The maintainer commits to either updating the rationale
or holding the position with a clearer one. There is no formal appeal
process today — that's an honest limitation of the single-maintainer
model and a reason this document will need to grow.

## Code of Conduct

The project follows the
[Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Enforcement contact: `stephane@dashable.dev`. Reports stay
confidential.

## Becoming a maintainer

There is no committer process yet. If you land 5+ non-trivial PRs and
your taste matches the project's hard constraints
(see [`CLAUDE.md`](CLAUDE.md)), the maintainer will reach out about
write access. Until then, every PR is reviewed and merged by the BD.

## License

All contributions are licensed under MIT (see [`LICENSE`](LICENSE)).
By opening a PR you agree to license your contribution under those
terms. There is no CLA.

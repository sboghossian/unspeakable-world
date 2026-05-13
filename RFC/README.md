# RFCs — Request for Comments

This directory holds accepted **Request for Comments** documents for The
Unspeakable World. RFCs are how we discuss and record significant
changes before they ship.

## When you need an RFC

You don't need an RFC for typo fixes, small bug fixes, or contained
refactors — open a PR directly. You **do** need an RFC when the change
is in any of these categories:

- A new federation module (any new entry in `EXTRA_LAYERS`).
- A new top-level viewer mode (today: `sky`, `solar`, `galactic`,
  `universe`).
- Changes to a baked-catalog schema in `apps/web/public/data/`.
- Removing or renaming an existing layer (breaks user bookmarks / shared
  URLs).
- A new runtime dependency > 50 KB gzipped, or any non-permissive
  license (anything not MIT / Apache / BSD / ISC).
- Anything touching the scene class files
  (`apps/web/src/viewer/{Universe,Galactic,SolarFlight,Sandbox,Viewer}.tsx`)
  beyond consuming the existing scene API.

See [`GOVERNANCE.md`](../GOVERNANCE.md) for the full decision process —
in short: open an RFC issue, leave it open 7 days, the maintainer
accepts / defers / rejects, and accepted RFCs get committed here as
`NNNN-<slug>.md`.

## How to write one

1. Copy [`0000-template.md`](0000-template.md) to a working copy in
   your fork (don't bother numbering it yet).
2. Fill in every section. Empty sections are worse than honest "I
   don't know yet".
3. Open a GitHub issue with the title `RFC: <one-line summary>` and
   paste the body in.
4. Wait the 7-day window. Respond to comments inline.
5. If accepted, the maintainer (or you) opens a PR adding your file
   as `RFC/NNNN-<slug>.md` (next free number) with the final accepted
   text.

## Index

<!-- Add accepted RFCs below in order, format: `NNNN — short title (link to file)`. -->

_(none yet — be the first!)_

<!-- Thanks for sending a PR! Fill the relevant sections and delete the rest. -->

## What this PR does

<!-- One paragraph. The "why" matters more than the "what" — the diff already shows the what. -->

## Linked issue / RFC

Closes #<!-- issue number -->
<!-- For larger changes, link the RFC issue and confirm it's been accepted. -->

## Screenshots / clip

<!-- Required for any user-visible change. -->

## Checklist

- [ ] `pnpm --filter @unspeakable/web typecheck` passes locally
- [ ] `pnpm --filter @unspeakable/web build` passes locally
- [ ] `pnpm --filter @unspeakable/web test` passes locally (unit)
- [ ] No new `console.*` calls (used `apps/web/src/lib/logger.ts`)
- [ ] No inline `style={…}` or CSS modules (Tailwind only)
- [ ] Strict TypeScript clean (`noUncheckedIndexedAccess` is on — don't index without a guard)
- [ ] Conventional commit style on every commit
- [ ] `README.md` updated if the feature is user-visible
- [ ] Any new dependency is MIT/Apache/BSD/ISC

## Notes for the reviewer

<!--
Anything weird? Trade-offs you took? Areas you want extra eyes on?
Performance numbers if relevant.
-->

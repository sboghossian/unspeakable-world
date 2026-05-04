# Shared settings + sliders system

- [x] Plan
- [ ] `apps/web/src/lib/settings.ts` — global settings hook + event bus + localStorage
- [ ] `apps/web/src/viewer/ui/SettingsPanel.tsx` — popover with sections
- [ ] Wire into `LeftRail.tsx` (Universe scene)
- [ ] Wire into `universe-scene.ts` (orbitOpacity, starBrightness, standby, settings change reaction)
- [ ] Wire `flyToDurationSec` into universe `flyTo` lerp
- [ ] Refactor `SolarFlight.tsx` to use shared SettingsPanel
- [ ] `tsc --noEmit` clean
- [ ] `pnpm --filter web build` clean
- [ ] Commit on `feat/shared-settings-panel`

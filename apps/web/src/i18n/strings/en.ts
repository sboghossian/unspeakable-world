/**
 * 🇬🇧 English source-of-truth for viewer-UI strings.
 *
 * Flat key → English value map. Keys follow a `area.context.what` shape
 * so a translator can scan one file and know roughly where each string
 * surfaces. New keys go HERE first; translations land in
 * `apps/web/src/i18n/<lang>.json` (already used by the existing
 * `lib/i18n.ts` loader — the `useT` hook reads from the same dictionary).
 *
 * Scope of this first pass (foundational): ~150 of the most-visible
 * top-bar / panel / status strings. Deep panel internals stay in their
 * source files until a follow-up pass.
 *
 * `{param}` placeholders are expanded by `useT` at call time. Example:
 *   t("tour.step", { step: 3, total: 12 }) → "Step 3 of 12"
 *
 * Keep values terse and 2nd-person; see `docs/VOICE.md` for the canon.
 */

export const en = {
  // ─── top-bar / chrome ──────────────────────────────────────────────────
  "viewer.exit": "exit",
  "viewer.exit.long": "← The Unspeakable World",
  "viewer.back": "Back to landing",
  "viewer.search.placeholder": "Search the sky",
  "viewer.search.label": "Search the sky",
  "viewer.copilot.button": "ask",
  "viewer.copilot.title": "Open the Cosmic Copilot — an AI tutor grounded in what you're looking at",
  "viewer.copilot.title.short": "Open the Cosmic Copilot",
  "viewer.about": "i · about",
  "viewer.about.title": "About / credits",
  "viewer.shortcuts": "? · shortcuts",
  "viewer.shortcuts.title": "Keyboard shortcuts",
  "viewer.tutorial": "🎓 tutorial",
  "viewer.tutorial.title": "Re-open the interactive tutorial",
  "viewer.solar": "🚀 solar flight",
  "viewer.solar.title": "Switch to 3D Solar System Flight Mode",
  "viewer.tour": "▶ tour",
  "viewer.tour.title": "Take a guided tour",
  "viewer.tour.v2": "Try Tour v2 in Universe →",
  "viewer.tour.v2.title": "Open Universe Mode v2 and run the 12-step Grand Tour (Earth → CMB → heat death)",
  "viewer.hint": "drag · pinch · wheel · tap",
  "viewer.save": "★ save",
  "viewer.save.title": "Save the current view as a bookmark",
  "viewer.surfaces": "🪐 surfaces",
  "viewer.surfaces.title": "Land on Earth — high-detail textured 3D surface",
  "viewer.sandbox": "⚛ sandbox",
  "viewer.sandbox.title": "Gravity sandbox — launch comets, planets, black holes",

  // ─── universe mode header ──────────────────────────────────────────────
  "universe.title": "🌌 universe",
  "universe.grandTour": "▶ grand tour",
  "universe.grandTour.title": "Start the 12-step Grand Tour through Universe Mode v2",
  "universe.solarTier": "Solar Tier",
  "universe.galacticTier": "Galactic Tier",
  "universe.unitAu": "1 unit = 1 AU",
  "universe.unitLy": "1 unit = 1 LY",

  // ─── layers panel ──────────────────────────────────────────────────────
  "layers.button": "layers",
  "layers.title": "Federated data",
  "layers.subtitle": "{count} overlays · {on} on",
  "layers.tabs.catalogs": "Catalogs",
  "layers.tabs.structure": "3D structure",
  "layers.tabs.alerts": "Live alerts",
  "layers.tabs.imagery": "Imagery & culture",
  "layers.empty": "Scene not ready yet. Try again in a moment.",
  "layers.loading": "loading…",
  "layers.synthetic": "synthetic",
  "layers.escClose": "Esc to close",
  "layers.button.aria": "Extra federated layers",
  "layers.button.title": "Federated data layers ({total} available, {on} on)",

  // ─── copilot panel ─────────────────────────────────────────────────────
  "copilot.title": "🧠 Cosmic Copilot",
  "copilot.placeholder": "What am I looking at?",
  "copilot.placeholder.focused": "Ask about {name}…",
  "copilot.send": "send →",
  "copilot.stop": "stop",
  "copilot.streaming": "streaming…",
  "copilot.reset": "Clear conversation",
  "copilot.settings": "Backend settings",
  "copilot.close": "Close",
  "copilot.tryAsking": "try asking",
  "copilot.sources": "sources",
  "copilot.error.backend":
    "(Backend error — I couldn't reach the model. Try the offline backend from the cog.)",
  "copilot.sample.m31": "What is M31?",
  "copilot.sample.sun": "How big is the Sun?",
  "copilot.sample.pulsar": "What's the difference between a pulsar and a magnetar?",
  "copilot.sample.cmb": "What is the cosmic microwave background?",
  "copilot.sample.tellMe": "Tell me about {name}",
  "copilot.backend.label": "backend",
  "copilot.backend.auto": "auto (Ollama → Cloudflare → offline)",
  "copilot.backend.ollama": "Ollama",
  "copilot.backend.cloudflare": "Cloudflare Workers AI",
  "copilot.backend.offline": "Offline (built-in)",
  "copilot.backend.reachable": "(reachable)",
  "copilot.backend.unreachable": "(unreachable)",

  // ─── tour card ─────────────────────────────────────────────────────────
  "tour.title": "Grand Tour",
  "tour.step": "Step {step} of {total}",
  "tour.label.tour": "tour",
  "tour.label.tourV2": "tour v2",
  "tour.exit": "exit",
  "tour.exit.aria": "Exit tour",
  "tour.prev": "← prev",
  "tour.next": "next →",
  "tour.finish": "finish",
  "tour.snap": "📸 snap",
  "tour.snap.title": "Take a snapshot of this view",
  "tour.goTo": "Go to step {n}",
  "tour.stepN": "Step {n}",

  // ─── settings panel ────────────────────────────────────────────────────
  "settings.title": "⚙ settings",
  "settings.close": "Close settings",
  "settings.groups.display": "Display",
  "settings.groups.quality": "Quality",
  "settings.groups.performance": "Performance",
  "settings.groups.visualization": "Visualization",
  "settings.groups.explanations": "Explanations",
  "settings.groups.sonification": "Sonification",
  "settings.groups.typography": "Typography",
  "settings.groups.language": "Language",
  "settings.groups.data": "Data",
  "settings.orbitOpacity": "orbit opacity",
  "settings.gridOpacity": "grid opacity",
  "settings.starBrightness": "star brightness",
  "settings.flyToDuration": "fly-to duration",
  "settings.preset": "preset",
  "settings.fpsCap": "fps cap",
  "settings.standby": "standby",
  "settings.standby.hint": "pause render when tab hidden or idle 60 s",
  "settings.realScale": "real scale",
  "settings.realScale.hint": "planets shown at physical proportion vs Sun",
  "settings.realColor": "real color",
  "settings.realColor.hint": "catalogue B-V colours, not cosmetic",
  "settings.showNames": "show names",
  "settings.showNames.hint": "planet + star labels",
  "settings.readerRegister": "reader register",
  "settings.readerRegister.hint": "voice for the \"why it matters\" body in the inspector.",
  "settings.sonification.toggle": "🔊 sonification",
  "settings.sonification.hint": "enable pulsar 'listen' button in inspector",
  "settings.volume": "volume",
  "settings.typography.hint": "swaps headline + body face. Applies app-wide.",
  "settings.language.hint": "Pick the UI language. {count} strings translated so far.",
  "settings.clearCache": "⌫ clear local cache",
  "settings.clearCache.hint":
    "Wipes localStorage + IndexedDB. You'll lose favourites and tour progress.",
  "settings.toggle.on": "on",
  "settings.toggle.off": "off",

  // ─── lessons panel ─────────────────────────────────────────────────────
  "lessons.title": "Lessons",
  "lessons.intro":
    "Short, narrated tours of where we are in the universe. Each one takes you somewhere real.",
  "lessons.overall": "Overall",
  "lessons.viewCert": "View certificate",
  "lessons.share": "Share progress",
  "lessons.share.copied": "Copied!",
  "lessons.loading": "loading {locale}…",
  "lessons.status.notStarted": "Not started",
  "lessons.status.inProgress": "In progress",
  "lessons.status.completed": "Completed",
  "lessons.action.start": "Start",
  "lessons.action.resume": "Resume",
  "lessons.action.replay": "Replay",
  "lessons.duration": "{min} min",

  // ─── mobile menu drawer ────────────────────────────────────────────────
  "menu.more": "More tools",
  "menu.more.aria": "Open menu",
  "menu.more.close": "Close menu",
  "menu.more.subtitle": "identify · live · tools · about",
  "menu.group.identify": "identify · info",
  "menu.group.live": "live · tonight",
  "menu.group.tools": "tools",
  "menu.group.modes": "modes",
  "menu.help.desktop": "esc to close",
  "menu.help.mobile": "tap outside · esc to close",

  // ─── shared / common ───────────────────────────────────────────────────
  "common.close": "Close",
  "common.loading": "Loading…",
  "common.cancel": "Cancel",
  "common.done": "done",
  "common.ok": "OK",

  // ─── landing footer ────────────────────────────────────────────────────
  "footer.builtOn": "Built on the shoulders of",
  "footer.license":
    "MIT licensed · Data CC-BY per source · © {author} and contributors · ",
  "footer.about": "About the author →",
  "footer.share": "Share what you see → tag {hashtag} on {twitter} or {bluesky}.",

  // ─── loading skeleton (defensive — F5 may ship later) ──────────────────
  "loading.title": "Loading the sky",
  "loading.stage.connecting": "Connecting…",
  "loading.stage.tiles": "Streaming HiPS tiles",
  "loading.stage.catalogs": "Loading catalogs",
  "loading.stage.scene": "Building the scene",
  "loading.stage.ready": "Ready",

  // ─── interpolation tests + misc ────────────────────────────────────────
  "label.language": "Language",
} as const;

/** All translation keys are derived from the English source. */
export type StringKey = keyof typeof en;

/**
 * 📐 Cross-mode menu group catalogue.
 *
 * One source of truth for *where* a given top-bar item belongs across the
 * four scene modes (Sky · Solar · Universe · Galactic). The four viewers
 * each compose their own MobileMenuDrawer/ExploreDrawer using these
 * canonical group ids — so the user always finds SnapshotButton in
 * "Tools", JwstLiveBadge in "Live", AboutOverlay in "About", etc.
 *
 * This file deliberately only owns *labels* and *ordering*. The actual
 * panel components are mounted by each viewer (they have mode-specific
 * props the shared config can't know about). The viewer maps its own
 * components into these groups and the drawer renders them in the
 * order declared here.
 */
export type MenuGroupId =
  | "live"
  | "tools"
  | "audio"
  | "view"
  | "modes"
  | "about";

export type MenuGroupSpec = {
  /** Stable id — referenced by viewers when composing their group lists. */
  id: MenuGroupId;
  /** Human-readable label rendered as the group heading in the drawer. */
  label: string;
  /** Short hint shown under the drawer title (joined with " · "). */
  hint: string;
};

/**
 * Canonical group order. Every viewer renders the same groups in the
 * same order — only the *contents* of each group differ by mode.
 *
 * Group definitions (cross-mode contract):
 *
 *  - **live**     — anything that streams real-world data (NEO, space
 *                   weather, JWST, multimessenger, ZTF, transients,
 *                   tonight's targets, observation log, news).
 *  - **tools**    — discrete user actions (snapshot, AR/gyro, share,
 *                   favorites/bookmarks, surprise, scene-editor,
 *                   power-user, tutor, copilot trigger).
 *  - **audio**    — sonification + ambient music panels.
 *  - **view**     — toggles that change what the canvas *shows*
 *                   (DSO HUD, CenterHud, RendererBadge, FontPicker,
 *                   light-cone, focus mode).
 *  - **modes**    — cross-mode navigation (Solar, Galactic, Universe,
 *                   Surface, Sandbox, Grand Tour).
 *  - **about**    — i / ? / 🎓 — overlays that explain the app.
 */
export const VIEWER_MENU_GROUPS: readonly MenuGroupSpec[] = [
  { id: "live", label: "live · tonight", hint: "live" },
  { id: "tools", label: "tools", hint: "tools" },
  { id: "audio", label: "audio", hint: "audio" },
  { id: "view", label: "view", hint: "view" },
  { id: "modes", label: "modes", hint: "modes" },
  { id: "about", label: "about · help", hint: "about" },
] as const;

/**
 * Canonical assignment of every shipping top-bar item to a group. Used
 * as a cross-mode lint anchor — when adding a new panel, give it an id
 * here so the four viewers all sort it into the same drawer section.
 *
 * Keys mirror the component name (PascalCase → kebab-case) for grep-ability.
 */
export const ITEM_GROUP: Record<string, MenuGroupId> = {
  // Live · tonight
  "neo-panel": "live",
  "sky-tonight-panel": "live",
  "space-weather-panel": "live",
  "tonight-targets-panel": "live",
  "tonight-sky": "live",
  "multimessenger-controls": "live",
  "jwst-live-badge": "live",
  "jwst-panel": "live",
  "ztf-controls": "live",
  "transients-panel": "live",
  "observation-log-panel": "live",
  "news-panel": "live",
  "events-panel": "live",
  "atel-panel": "live",
  "mars-rover-inspector": "live",
  "apod-archive-panel": "live",

  // Tools
  "gyro-button": "tools",
  "ar-sky-button": "tools",
  "snapshot-button": "tools",
  "share-button": "tools",
  "favorites-menu": "tools",
  "bookmarks-panel": "tools",
  "quick-targets": "tools",
  "power-user-panel": "tools",
  "scene-editor-panel": "tools",
  "tutor-panel": "tools",
  "copilot-trigger": "tools",
  "measure-panel": "tools",
  "star-trails-panel": "tools",
  "surprise-button": "tools",
  "missions-catalog-panel": "tools",
  "collections-panel": "tools",
  "mars-photos-panel": "tools",
  "history-panel": "tools",

  // Audio
  "sonification-controls": "audio",
  "music-panel": "audio",

  // View
  "dso-hud-toggle": "view",
  "center-hud-toggle": "view",
  "renderer-badge": "view",
  "font-picker": "view",
  "language-picker": "view",
  "settings-panel": "view",
  "light-cone-controls": "view",
  "focus-mode": "view",
  "extra-layers-panel": "view",

  // Modes
  "solar-flight": "modes",
  "galactic": "modes",
  "universe": "modes",
  "surface": "modes",
  "sandbox": "modes",
  "grand-tour": "modes",
  "lesson-panel": "modes",

  // About
  "about-overlay": "about",
  "shortcuts-overlay": "about",
  "tutorial-overlay": "about",
  "achievements-panel": "about",
  "myths-panel": "about",
  "compare-panel": "about",
  "seti-panel": "about",
};

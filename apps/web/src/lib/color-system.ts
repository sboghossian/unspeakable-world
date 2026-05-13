/**
 * Color system — single source of truth for the federated event /
 * instrument / layer hex codes used across viewer modules.
 *
 * Historically every module hardcoded its own `#4ec9ff` for IceCube,
 * `#ffb24e` for Auger, `vec3(1.0, 0.36, 0.18)` for FXT shaders, etc.
 * This file collects those into one record so legends, dots and
 * shader callers can `import { EVENT_COLORS } from "../../lib/color-
 * system"` instead.
 *
 * The doc counterpart is `docs/COLOR-SYSTEM.md`.
 */

// ─── Event / instrument colors ───────────────────────────────────────

/** Federated event-source identifiers. Add new ones as new alert
 *  layers come online. */
export type EventTypeId =
  | "icecube"
  | "auger"
  | "ligo"
  | "nanograv"
  | "blackgem"
  | "goto"
  | "fxt"
  | "atel"
  | "ztf"
  | "swift"
  | "chime"
  | "chandra"
  | "kilonova"
  | "grb";

/**
 * Authoritative event-color mapping. Hex sRGB. Each color was chosen so
 * neighbouring event categories remain distinguishable at low marker
 * size on the unit-shell sky (no two within ΔE ~ 20).
 */
export const EVENT_COLORS: Record<EventTypeId, string> = {
  // Multi-messenger primary channels
  icecube: "#4ec9ff", // neutrinos — sky-blue
  auger: "#ffb24e", // UHE cosmic rays — amber
  ligo: "#c78bff", // gravitational waves — violet
  nanograv: "#7cffa1", // pulsar-timing array — green

  // Optical / robotic survey followups
  blackgem: "#ff5be8", // optical kilonova hunt — magenta
  goto: "#5be8ff", // wide-field optical — cyan
  ztf: "#ff9e38", // wide-field optical — orange
  atel: "#fdeb5c", // The Astronomer's Telegram — yellow

  // X-ray / gamma-ray
  fxt: "#ff5c2e", // Einstein Probe / Swift FXTs — red-orange
  swift: "#ff7a3b", // Swift-BAT GRBs — red-orange
  chandra: "#7aa8ff", // Chandra archival X-ray — pale blue

  // Radio
  chime: "#9d7cff", // CHIME FRB — indigo

  // Synthesised / derived
  kilonova: "#ffb4e8", // GW-EM joint kilonova candidates — pink
  grb: "#ff4e4e", // legacy GRB markers — bright red
};

// ─── Layer-group colors ──────────────────────────────────────────────

/** The four top-level layer buckets used in the Extra Layers popover. */
export type LayerGroupId = "catalogs" | "alerts" | "structure" | "imagery";

/**
 * Per-group accent colours. Used in the layer-tab buttons and the
 * status pip on the trigger.
 */
export const LAYER_GROUP_COLORS: Record<LayerGroupId, string> = {
  catalogs: "#7cffa1", // green — encyclopedic / static
  alerts: "#ff9e38", // orange — live / time-sensitive
  structure: "#c78bff", // violet — 3D scaffolding / cosmography
  imagery: "#5be8ff", // cyan — visual / cultural
};

// ─── Mode colors ─────────────────────────────────────────────────────

/** The four scene modes the viewer offers. Each gets its own accent
 *  used in the mode-switcher pill and the active-mode chrome. */
export type SceneModeId = "sky" | "solar" | "galactic" | "universe";

export const MODE_COLORS: Record<SceneModeId, string> = {
  sky: "#7dd3fc", // plasma-400 — atmospheric blue
  solar: "#fbbf24", // amber — solar yellow
  galactic: "#c78bff", // violet — galactic dust lane
  universe: "#7cffa1", // green — cosmic web filament
};

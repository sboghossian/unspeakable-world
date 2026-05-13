/**
 * Quality presets — tune render fidelity to the user's hardware.
 *
 * Five buckets:
 *   - `"auto"`   — defer to `autoDetectQuality()` heuristics. Re-evaluated once
 *                  per page load.
 *   - `"low"`    — mid-range mobile; one detail tile, 25K stars, no bloom.
 *   - `"medium"` — modest laptop / iPad-class; 100K stars, bloom soft.
 *   - `"high"`   — desktop with discrete GPU; 500K stars, MSAA 4×.
 *   - `"ultra"`  — workstation / M-series Mac; 1M Gaia stars, MSAA 8×, bloom.
 *
 * Only `dpr` is meaningfully live-changeable on a mounted three.js renderer.
 * Most of the other knobs (`msaaSamples`, `bloomEnabled`, `gaiaDensityBucket`,
 * `planetSegments`, `proceduralGalaxyDetail`, `hipsMaxOrder`) require either
 * a renderer rebuild or re-baking the scene graph — they are applied at
 * mount time and a UI change toasts the reader to reload.
 *
 * The active preset is derived from the persisted
 * `AppSettings.quality` field and republished whenever settings change.
 * Non-React scene code reads via {@link getActivePreset} and listens via
 * {@link subscribeQuality}; React code can keep using {@link useSettings}.
 */

import { getSettings, onSettingsChange, type AppSettings } from "./settings";

/** Discrete quality buckets. Excludes the `"auto"` sentinel — `auto` resolves
 *  to one of these four at runtime. */
export type QualityId = "low" | "medium" | "high" | "ultra";

/** Concrete tunables a preset resolves to. Plain data so renderers can
 *  destructure without reaching into React or settings. */
export type QualityPreset = {
  id: QualityId;
  label: string;
  /** `window.devicePixelRatio` cap. Low DPI = fewer pixels = faster fill. */
  dpr: number;
  /** Bright-star count for HYG + Gaia layers (truncates the sorted catalog). */
  starCount: number;
  /** Density bucket forwarded to `gaia-stars`. The 100K file is ~2.5 MB,
   *  500K ~12 MB, 1M ~25 MB. */
  gaiaDensityBucket: 100_000 | 500_000 | 1_000_000;
  /** SphereGeometry width/height segments for planet bodies. 32 reads as
   *  faceted in close-ups; 96 is silky-smooth at 4K. */
  planetSegments: number;
  /** Post-FX bloom master switch (deferred — no bloom pass mounted yet). */
  // TODO(wave-8): wire to EffectComposer once F1's post-FX primitives land.
  bloomEnabled: boolean;
  /** Bloom intensity, 0–2. Honoured by the future post-FX pipeline. */
  // TODO(wave-8): consumed by the deferred EffectComposer pass.
  bloomStrength: number;
  /** WebGL `antialias` MSAA sample count. 0 = off, 8 = max. Requires
   *  renderer rebuild to change. */
  msaaSamples: 0 | 2 | 4 | 8;
  /** Cast/receive shadows on the solar-system bodies (deferred). */
  // TODO(wave-8): requires a directional-light + ShadowMap pass on
  // solar-flight; gated on the same post-FX wave as bloom.
  shadowsEnabled: boolean;
  /** Procedural galaxy-disc / dark-matter / asteroid-belt detail. */
  proceduralGalaxyDetail: "off" | "low" | "medium" | "high";
  /** Maximum HiPS HEALPix order the LOD pass will request. 6 = ~12 K tiles
   *  across the whole sky; 9 = ~3 M. The CDN streams whatever we ask for. */
  hipsMaxOrder: number;
  /** Camera far-plane multiplier. `1.0` is the historic default. */
  renderDist: number;
};

const PRESETS: Record<QualityId, QualityPreset> = {
  low: {
    id: "low",
    label: "Low",
    dpr: 1,
    starCount: 25_000,
    gaiaDensityBucket: 100_000,
    planetSegments: 32,
    bloomEnabled: false,
    bloomStrength: 0,
    msaaSamples: 0,
    shadowsEnabled: false,
    proceduralGalaxyDetail: "off",
    hipsMaxOrder: 6,
    renderDist: 0.8,
  },
  medium: {
    id: "medium",
    label: "Medium",
    dpr: 1.5,
    starCount: 100_000,
    gaiaDensityBucket: 100_000,
    planetSegments: 48,
    bloomEnabled: true,
    bloomStrength: 0.4,
    msaaSamples: 2,
    shadowsEnabled: false,
    proceduralGalaxyDetail: "low",
    hipsMaxOrder: 7,
    renderDist: 1.0,
  },
  high: {
    id: "high",
    label: "High",
    dpr: 2,
    starCount: 500_000,
    gaiaDensityBucket: 500_000,
    planetSegments: 64,
    bloomEnabled: true,
    bloomStrength: 0.7,
    msaaSamples: 4,
    shadowsEnabled: true,
    proceduralGalaxyDetail: "medium",
    hipsMaxOrder: 8,
    renderDist: 1.0,
  },
  ultra: {
    id: "ultra",
    label: "Ultra",
    dpr: 2,
    starCount: 1_000_000,
    gaiaDensityBucket: 1_000_000,
    planetSegments: 96,
    bloomEnabled: true,
    bloomStrength: 1.0,
    msaaSamples: 8,
    shadowsEnabled: true,
    proceduralGalaxyDetail: "high",
    hipsMaxOrder: 9,
    renderDist: 1.5,
  },
};

/** Read-only catalog of every concrete preset. Used by the picker UI. */
export const QUALITY_PRESETS: Readonly<Record<QualityId, QualityPreset>> = PRESETS;

const MOBILE_UA_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Resolve `"auto"` to a concrete preset id using cheap, synchronous
 * heuristics. Called once on first read; the result is cached for the
 * lifetime of the page.
 *
 * Heuristics:
 *   - `low`     — mobile UA, or DPR > 2.5 (high-DPI phones eat fill-rate),
 *                 or a recent canvas-2d context loss flagged in
 *                 `sessionStorage`.
 *   - `ultra`   — ≥ 8 GB advertised memory AND ≥ 8 logical cores AND
 *                 devicePixelRatio ≤ 2 (workstation-class).
 *   - `high`    — any other non-mobile desktop.
 *   - `medium`  — fallback (SSR, headless, anything we don't recognise).
 */
export function autoDetectQuality(): QualityId {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return "medium";
  }
  const dpr = window.devicePixelRatio ?? 1;
  const ua = navigator.userAgent ?? "";
  const isMobile = MOBILE_UA_RE.test(ua);
  // Recent canvas-2d crash → caller flagged this in sessionStorage. We
  // never throw if the read fails (private mode, disabled storage).
  let crashed = false;
  try {
    crashed = window.sessionStorage.getItem("uw.canvas2dLost") === "1";
  } catch {
    /* ignore */
  }

  if (isMobile || dpr > 2.5 || crashed) return "low";

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const mem = nav.deviceMemory ?? 0;
  const cores = nav.hardwareConcurrency ?? 0;
  if (mem >= 8 && cores >= 8 && dpr <= 2) return "ultra";
  return "high";
}

let autoCache: QualityId | null = null;
function resolveAuto(): QualityId {
  if (autoCache === null) autoCache = autoDetectQuality();
  return autoCache;
}

function resolveSetting(setting: AppSettings["quality"]): QualityId {
  if (setting === "auto") return resolveAuto();
  return setting;
}

let active: QualityPreset = PRESETS[resolveSetting(getSettings().quality)];

const listeners = new Set<(p: QualityPreset) => void>();

// Bridge: when the user changes the `quality` setting we recompute the
// active preset and notify subscribers. The settings module already
// fires for every field change; we filter here so unrelated edits
// don't re-broadcast a quality event.
onSettingsChange((s) => {
  const next = PRESETS[resolveSetting(s.quality)];
  if (next.id === active.id) return;
  active = next;
  for (const cb of listeners) cb(active);
});

/** Current concrete preset (never `"auto"`). */
export function getActivePreset(): QualityPreset {
  return active;
}

/** Subscribe to preset changes. Returns an unsubscribe thunk. */
export function subscribeQuality(cb: (p: QualityPreset) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/* ─── Field-level convenience getters ─────────────────────────────── *
 * Scene-graph code that only cares about one knob (MSAA, HiPS cap,
 * far-plane multiplier, star-count cap) can pull the value directly
 * without destructuring the whole preset.                            *
 * ────────────────────────────────────────────────────────────────── */

/** Currently active MSAA sample count. `0` = AA disabled. */
export function getMsaaSamples(): QualityPreset["msaaSamples"] {
  return active.msaaSamples;
}

/** Cap on the HEALPix order the HiPS LOD pass will ever request. */
export function getHipsMaxOrder(): number {
  return active.hipsMaxOrder;
}

/** Far-plane multiplier (relative to the historic per-scene default). */
export function getRenderDist(): number {
  return active.renderDist;
}

/** Cap on the bright-star count layers should render. */
export function getStarCountCap(): number {
  return active.starCount;
}

/** Default procedural-galaxy detail bucket. */
export function getProceduralGalaxyDetail(): QualityPreset["proceduralGalaxyDetail"] {
  return active.proceduralGalaxyDetail;
}

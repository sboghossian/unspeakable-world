/**
 * Curated photographic imagery for famous deep-sky objects + planets.
 *
 * License gate (do not regress):
 *   • NASA / STScI / Hubblesite              → public domain (credit only)
 *   • ESA/Hubble (cdn.esahubble.org)         → CC BY 4.0 (credit required)
 *   • ESA/Webb   (cdn.esawebb.org)           → CC BY 4.0 (credit required)
 *
 * URLs hot-link the original CDNs — never proxy or rehost. Wikimedia
 * Commons URLs are forbidden (per-file terms vary).
 *
 * Keys are the normalized object id (uppercase, no spaces / parentheses).
 * Use `lookupImagery(name)` from `body-info.ts` to resolve at runtime.
 */

export type ImageEntry = {
  url: string; // direct CDN URL (HTTPS only)
  thumbUrl?: string; // smaller, falls back to url
  width?: number;
  height?: number;
  credit: string; // exact attribution string per source license
  source: "esa-hubble" | "esa-webb" | "nasa" | "stsci";
  caption?: string;
};

const PLACEHOLDER = "https://placeholder.invalid/missing.jpg";

export const OBJECT_IMAGERY: Record<string, ImageEntry> = {
  // ─── Messier catalog ──────────────────────────────────────────────
  M1: {
    url: "https://cdn.esawebb.org/archives/images/screen/weic2305a.jpg",
    thumbUrl: "https://cdn.esawebb.org/archives/images/thumb300y/weic2305a.jpg",
    credit: "ESA/Webb, NASA & CSA, T. Temim",
    source: "esa-webb",
    caption: "Crab Nebula (M1) — JWST NIRCam + MIRI composite",
  },
  M8: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Lagoon Nebula (M8)",
    // TODO: replace with verified URL
  },
  M16: {
    url: "https://cdn.esawebb.org/archives/images/screen/weic2216a.jpg",
    thumbUrl: "https://cdn.esawebb.org/archives/images/thumb300y/weic2216a.jpg",
    credit: "ESA/Webb, NASA & CSA, STScI",
    source: "esa-webb",
    caption: "Pillars of Creation (M16) — JWST NIRCam",
  },
  M17: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Omega / Swan Nebula (M17)",
    // TODO: replace with verified URL
  },
  M20: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Trifid Nebula (M20)",
    // TODO: replace with verified URL
  },
  M27: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Dumbbell Nebula (M27)",
    // TODO: replace with verified URL
  },
  M31: {
    url: "https://cdn.esahubble.org/archives/images/screen/heic1502a.jpg",
    thumbUrl: "https://cdn.esahubble.org/archives/images/thumb300y/heic1502a.jpg",
    credit: "NASA, ESA, J. Dalcanton, B.F. Williams, L.C. Johnson (PHAT)",
    source: "esa-hubble",
    caption: "Andromeda Galaxy (M31) — Hubble PHAT mosaic",
  },
  M33: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Triangulum Galaxy (M33)",
    // TODO: replace with verified URL
  },
  M42: {
    url: "https://cdn.esawebb.org/archives/images/screen/weic2310a.jpg",
    thumbUrl: "https://cdn.esawebb.org/archives/images/thumb300y/weic2310a.jpg",
    credit: "ESA/Webb, NASA, CSA, M. Zamani (ESA/Webb), PDRs4All ERS Team",
    source: "esa-webb",
    caption: "Orion Nebula (M42) — JWST NIRCam",
  },
  M45: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / AURA Caltech",
    source: "nasa",
    caption: "Pleiades (M45)",
    // TODO: replace with verified URL
  },
  M51: {
    url: "https://cdn.esahubble.org/archives/images/screen/heic0506a.jpg",
    thumbUrl: "https://cdn.esahubble.org/archives/images/thumb300y/heic0506a.jpg",
    credit: "NASA, ESA, S. Beckwith (STScI), Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Whirlpool Galaxy (M51) — Hubble ACS",
  },
  M57: {
    url: "https://cdn.esawebb.org/archives/images/screen/weic2308a.jpg",
    thumbUrl: "https://cdn.esawebb.org/archives/images/thumb300y/weic2308a.jpg",
    credit: "ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson",
    source: "esa-webb",
    caption: "Ring Nebula (M57) — JWST NIRCam",
  },
  M64: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Black Eye Galaxy (M64)",
    // TODO: replace with verified URL
  },
  M74: {
    url: "https://cdn.esawebb.org/archives/images/screen/weic2207a.jpg",
    thumbUrl: "https://cdn.esawebb.org/archives/images/thumb300y/weic2207a.jpg",
    credit: "ESA/Webb, NASA & CSA, J. Lee, PHANGS-JWST Team",
    source: "esa-webb",
    caption: "Phantom Galaxy (M74) — JWST MIRI",
  },
  M81: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Bode's Galaxy (M81)",
    // TODO: replace with verified URL
  },
  M82: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Cigar Galaxy (M82)",
    // TODO: replace with verified URL
  },
  M87: {
    url: PLACEHOLDER,
    credit: "Event Horizon Telescope Collaboration",
    source: "nasa",
    caption: "M87* — first imaged supermassive black hole (EHT 2019)",
    // TODO: replace with verified URL
  },
  M101: {
    url: PLACEHOLDER,
    credit: "NASA, ESA, K. Kuntz (JHU), F. Bresolin (U. Hawaii), Hubble Heritage Team",
    source: "esa-hubble",
    caption: "Pinwheel Galaxy (M101)",
    // TODO: replace with verified URL
  },
  M104: {
    url: "https://cdn.esahubble.org/archives/images/screen/heic0309a.jpg",
    thumbUrl: "https://cdn.esahubble.org/archives/images/thumb300y/heic0309a.jpg",
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Sombrero Galaxy (M104) — Hubble ACS",
  },

  // ─── NGC catalog ──────────────────────────────────────────────────
  NGC1300: {
    url: "https://cdn.esahubble.org/archives/images/screen/heic0501a.jpg",
    thumbUrl: "https://cdn.esahubble.org/archives/images/thumb300y/heic0501a.jpg",
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "NGC 1300 — barred spiral, Hubble ACS",
  },
  NGC1365: {
    url: PLACEHOLDER,
    credit: "ESA/Webb, NASA & CSA, J. Lee, PHANGS-JWST Team",
    source: "esa-webb",
    caption: "NGC 1365 — barred spiral, JWST",
    // TODO: replace with verified URL
  },
  NGC2237: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Rosette Nebula (NGC 2237)",
    // TODO: replace with verified URL
  },
  NGC3132: {
    url: "https://cdn.esawebb.org/archives/images/screen/weic2207b.jpg",
    thumbUrl: "https://cdn.esawebb.org/archives/images/thumb300y/weic2207b.jpg",
    credit: "ESA/Webb, NASA & CSA",
    source: "esa-webb",
    caption: "Southern Ring Nebula (NGC 3132) — JWST NIRCam",
  },
  NGC4414: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "NGC 4414 — flocculent spiral",
    // TODO: replace with verified URL
  },
  NGC6302: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble SM4 ERO Team",
    source: "stsci",
    caption: "Bug Nebula (NGC 6302)",
    // TODO: replace with verified URL
  },
  NGC6543: {
    url: PLACEHOLDER,
    credit: "NASA, ESA, HEIC and the Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Cat's Eye Nebula (NGC 6543)",
    // TODO: replace with verified URL
  },
  NGC6960: {
    url: PLACEHOLDER,
    credit: "NASA, ESA / Hubble Heritage Team",
    source: "stsci",
    caption: "Veil Nebula (NGC 6960)",
    // TODO: replace with verified URL
  },
  NGC7293: {
    url: PLACEHOLDER,
    credit: "NASA, ESA, C.R. O'Dell (Vanderbilt), M. Meixner, P. McCullough (STScI)",
    source: "nasa",
    caption: "Helix Nebula (NGC 7293)",
    // TODO: replace with verified URL
  },
  NGC7635: {
    url: "https://cdn.esahubble.org/archives/images/screen/heic1608a.jpg",
    thumbUrl: "https://cdn.esahubble.org/archives/images/thumb300y/heic1608a.jpg",
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Bubble Nebula (NGC 7635) — Hubble WFC3",
  },

  // ─── Magellanic Clouds ────────────────────────────────────────────
  LMC: {
    url: PLACEHOLDER,
    credit: "ESO / VISTA",
    source: "nasa",
    caption: "Large Magellanic Cloud",
    // TODO: replace with verified URL (ESO/VISTA — confirm CC license before shipping)
  },
  SMC: {
    url: PLACEHOLDER,
    credit: "ESO / VISTA",
    source: "nasa",
    caption: "Small Magellanic Cloud",
    // TODO: replace with verified URL (ESO/VISTA — confirm CC license before shipping)
  },

  // ─── Solar system planet portraits (NASA, public domain) ─────────
  // The science.nasa.gov / solarsystem.nasa.gov portrait URLs have
  // shifted multiple times; rather than hard-code a stale path, leave
  // these as placeholders for a follow-up curation pass.
  SUN: {
    url: PLACEHOLDER,
    credit: "NASA / SDO",
    source: "nasa",
    caption: "Sun — SDO AIA composite",
    // TODO: replace with verified URL
  },
  MERCURY: {
    url: PLACEHOLDER,
    credit: "NASA / Johns Hopkins APL / Carnegie Inst. (MESSENGER)",
    source: "nasa",
    caption: "Mercury — MESSENGER global mosaic",
    // TODO: replace with verified URL
  },
  VENUS: {
    url: PLACEHOLDER,
    credit: "NASA / JPL-Caltech",
    source: "nasa",
    caption: "Venus — Mariner 10 / Magellan composite",
    // TODO: replace with verified URL
  },
  EARTH: {
    url: PLACEHOLDER,
    credit: "NASA / NOAA / DSCOVR EPIC",
    source: "nasa",
    caption: "Earth — DSCOVR EPIC full-disk",
    // TODO: replace with verified URL
  },
  MARS: {
    url: PLACEHOLDER,
    credit: "NASA / JPL-Caltech / MSSS",
    source: "nasa",
    caption: "Mars — Viking / MOLA global mosaic",
    // TODO: replace with verified URL
  },
  JUPITER: {
    url: PLACEHOLDER,
    credit: "NASA / JPL-Caltech / SwRI / MSSS",
    source: "nasa",
    caption: "Jupiter — Juno JunoCam",
    // TODO: replace with verified URL
  },
  SATURN: {
    url: PLACEHOLDER,
    credit: "NASA / JPL-Caltech / Space Science Institute (Cassini)",
    source: "nasa",
    caption: "Saturn — Cassini natural-color portrait",
    // TODO: replace with verified URL
  },
  URANUS: {
    url: PLACEHOLDER,
    credit: "NASA / JPL-Caltech / Voyager 2",
    source: "nasa",
    caption: "Uranus — Voyager 2",
    // TODO: replace with verified URL
  },
  NEPTUNE: {
    url: PLACEHOLDER,
    credit: "NASA / JPL-Caltech / Voyager 2",
    source: "nasa",
    caption: "Neptune — Voyager 2",
    // TODO: replace with verified URL
  },
};

/**
 * Normalize an object name into the lookup key:
 * uppercase, strip spaces / parentheses / dashes / common prefixes.
 */
export function normalizeImageryKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

const CACHE = new Map<string, ImageEntry | null>();

/** Cached lookup; returns null when no entry exists or url is the placeholder. */
export function lookupObjectImagery(name: string): ImageEntry | null {
  const key = normalizeImageryKey(name);
  const cached = CACHE.get(key);
  if (cached !== undefined) return cached;
  const entry = OBJECT_IMAGERY[key] ?? null;
  CACHE.set(key, entry);
  return entry;
}

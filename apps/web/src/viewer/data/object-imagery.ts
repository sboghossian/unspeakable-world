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
 *
 * Verified by `pnpm --filter web verify:imagery` — every entry below was
 * cross-checked against the source archive's "About the Object" metadata
 * before commit. Subjects with no clean public-domain / CC BY portrait
 * are intentionally absent from this map (they fall back to the imagery
 * being skipped — InfoPanel still renders the rest of the payload).
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

const NASA_IMG = "https://images-assets.nasa.gov/image";
const ESA_HUBBLE = "https://cdn.esahubble.org/archives/images";
const ESA_WEBB = "https://cdn.esawebb.org/archives/images";

const nasa = (id: string): { url: string; thumbUrl: string } => ({
  url: `${NASA_IMG}/${id}/${id}~orig.jpg`,
  thumbUrl: `${NASA_IMG}/${id}/${id}~thumb.jpg`,
});
const hub = (id: string): { url: string; thumbUrl: string } => ({
  url: `${ESA_HUBBLE}/screen/${id}.jpg`,
  thumbUrl: `${ESA_HUBBLE}/thumb300y/${id}.jpg`,
});
const webb = (id: string): { url: string; thumbUrl: string } => ({
  url: `${ESA_WEBB}/screen/${id}.jpg`,
  thumbUrl: `${ESA_WEBB}/thumb300y/${id}.jpg`,
});

export const OBJECT_IMAGERY: Record<string, ImageEntry> = {
  // ─── Messier catalog ──────────────────────────────────────────────
  M1: {
    ...webb("weic2305a"),
    credit: "ESA/Webb, NASA & CSA, T. Temim",
    source: "esa-webb",
    caption: "Crab Nebula (M1) — JWST NIRCam + MIRI composite",
  },
  M8: {
    ...hub("heic1808a"),
    credit: "NASA, ESA, STScI",
    source: "esa-hubble",
    caption: "Lagoon Nebula (M8) — Hubble 28th-anniversary release",
  },
  M16: {
    ...webb("weic2216a"),
    credit: "ESA/Webb, NASA & CSA, STScI",
    source: "esa-webb",
    caption: "Pillars of Creation (M16) — JWST NIRCam",
  },
  M17: {
    ...hub("heic0305a"),
    credit: "NASA, ESA & J. Hester (ASU)",
    source: "esa-hubble",
    caption: "Omega / Swan Nebula (M17) — Hubble ACS",
  },
  M20: {
    ...hub("opo9942a"),
    credit: "NASA, ESA, J. Hester (ASU)",
    source: "esa-hubble",
    caption: "Trifid Nebula (M20) — Hubble WFPC2",
  },
  M27: {
    ...hub("opo0306a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Dumbbell Nebula (M27) — Hubble WFPC2",
  },
  M31: {
    ...hub("heic1502a"),
    credit: "NASA, ESA, J. Dalcanton, B.F. Williams, L.C. Johnson (PHAT)",
    source: "esa-hubble",
    caption: "Andromeda Galaxy (M31) — Hubble PHAT mosaic",
  },
  M33: {
    ...hub("heic1901a"),
    credit: "NASA, ESA, M. Durbin, J. Dalcanton, B.F. Williams (UW)",
    source: "esa-hubble",
    caption: "Triangulum Galaxy (M33) — Hubble panchromatic mosaic",
  },
  M42: {
    ...webb("weic2310a"),
    credit: "ESA/Webb, NASA, CSA, M. Zamani (ESA/Webb), PDRs4All ERS Team",
    source: "esa-webb",
    caption: "Orion Nebula (M42) — JWST NIRCam",
  },
  M45: {
    ...nasa("PIA09262"),
    credit: "NASA / JPL-Caltech / J. Stauffer (SSC/Caltech)",
    source: "nasa",
    caption: "Pleiades (M45) — Spitzer IRAC false-colour",
  },
  M51: {
    ...hub("heic0506a"),
    credit: "NASA, ESA, S. Beckwith (STScI), Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Whirlpool Galaxy (M51) — Hubble ACS",
  },
  M57: {
    ...webb("weic2308a"),
    credit: "ESA/Webb, NASA, CSA, M. Barlow, N. Cox, R. Wesson",
    source: "esa-webb",
    caption: "Ring Nebula (M57) — JWST NIRCam",
  },
  // M64 (Black Eye) intentionally omitted — no verified clean Hubble or
  // JWST press-release portrait at time of curation.
  M74: {
    ...webb("weic2207a"),
    credit: "ESA/Webb, NASA & CSA, J. Lee, PHANGS-JWST Team",
    source: "esa-webb",
    caption: "Phantom Galaxy (M74) — JWST MIRI",
  },
  M81: {
    ...hub("heic0710a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Bode's Galaxy (M81) — Hubble ACS",
  },
  M82: {
    ...hub("heic0604a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Cigar Galaxy (M82) — Hubble ACS mosaic",
  },
  M87: {
    ...hub("opo9943a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "M87 — giant elliptical with relativistic jet",
  },
  M101: {
    ...hub("heic0602a"),
    credit:
      "NASA, ESA, K. Kuntz (JHU), F. Bresolin (U. Hawaii), Hubble Heritage Team",
    source: "esa-hubble",
    caption: "Pinwheel Galaxy (M101) — Hubble ACS mosaic",
  },
  M104: {
    ...hub("heic0309a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Sombrero Galaxy (M104) — Hubble ACS",
  },

  // ─── NGC catalog ──────────────────────────────────────────────────
  NGC1300: {
    ...hub("heic0501a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "NGC 1300 — barred spiral, Hubble ACS",
  },
  // NGC1365 omitted — no verified standalone portrait at time of curation.
  // NGC2237 (Rosette) omitted — no verified Hubble standalone portrait.
  NGC3132: {
    ...webb("weic2207b"),
    credit: "ESA/Webb, NASA & CSA",
    source: "esa-webb",
    caption: "Southern Ring Nebula (NGC 3132) — JWST NIRCam",
  },
  NGC4414: {
    ...hub("opo9925a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "NGC 4414 — flocculent spiral, Hubble WFPC2",
  },
  NGC6302: {
    ...hub("heic0407a"),
    credit: "NASA, ESA, A. Zijlstra (UMIST), Hubble Heritage Team",
    source: "esa-hubble",
    caption: "Bug Nebula (NGC 6302) — Hubble WFPC2",
  },
  NGC6543: {
    ...hub("heic0414a"),
    credit: "NASA, ESA, HEIC, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Cat's Eye Nebula (NGC 6543) — Hubble ACS",
  },
  NGC6960: {
    ...hub("heic1520a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Veil Nebula (NGC 6960) — Hubble ACS",
  },
  NGC7293: {
    ...hub("heic0307a"),
    credit:
      "NASA, ESA, C.R. O'Dell (Vanderbilt), M. Meixner, P. McCullough (STScI)",
    source: "esa-hubble",
    caption: "Helix Nebula (NGC 7293) — Hubble + Mosaic",
  },
  NGC7635: {
    ...hub("heic1608a"),
    credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)",
    source: "esa-hubble",
    caption: "Bubble Nebula (NGC 7635) — Hubble WFC3",
  },

  // ─── Magellanic Clouds (NASA images.nasa.gov) ─────────────────────
  LMC: {
    ...nasa("iss071e418742"),
    credit: "NASA / ISS Expedition 71",
    source: "nasa",
    caption: "Large + Small Magellanic Clouds — ISS handheld",
  },
  SMC: {
    ...nasa("PIA16884"),
    credit: "NASA / JPL-Caltech / Spitzer Science Center",
    source: "nasa",
    caption: "Small Magellanic Cloud — Spitzer infrared mosaic",
  },

  // ─── Solar system planet portraits (NASA, public domain) ─────────
  SUN: {
    ...nasa("GSFC_20171208_Archive_e000790"),
    credit: "NASA / SDO",
    source: "nasa",
    caption: "Sun — SDO AIA giant filament",
  },
  MERCURY: {
    ...nasa("PIA15162"),
    credit: "NASA / Johns Hopkins APL / Carnegie Inst. (MESSENGER)",
    source: "nasa",
    caption: "Mercury — MESSENGER global mosaic",
  },
  VENUS: {
    ...nasa("PIA00104"),
    credit: "NASA / JPL-Caltech (Magellan)",
    source: "nasa",
    caption: "Venus — Magellan computer-simulated global view",
  },
  EARTH: {
    ...nasa("iss040e081320"),
    credit: "NASA / ISS Expedition 40",
    source: "nasa",
    caption: "Earth — ISS handheld",
  },
  MARS: {
    ...nasa("PIA00407"),
    credit: "NASA / JPL-Caltech / USGS",
    source: "nasa",
    caption: "Mars — global colour views, Viking",
  },
  JUPITER: {
    ...nasa("PIA22946"),
    credit: "NASA / JPL-Caltech / SwRI / MSSS / K. Gill",
    source: "nasa",
    caption: "Jupiter Marble — Juno JunoCam",
  },
  SATURN: {
    ...nasa("PIA17172"),
    credit: "NASA / JPL-Caltech / Space Science Institute (Cassini)",
    source: "nasa",
    caption: "Saturn — \"The Day the Earth Smiled\" Cassini portrait",
  },
  URANUS: {
    ...nasa("PIA18182"),
    credit: "NASA / JPL-Caltech / Voyager 2",
    source: "nasa",
    caption: "Uranus — Voyager 2",
  },
  NEPTUNE: {
    ...nasa("PIA00046"),
    credit: "NASA / JPL-Caltech / Voyager 2",
    source: "nasa",
    caption: "Neptune — Voyager 2 full-disk",
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

/** Cached lookup; returns null when no entry exists. */
export function lookupObjectImagery(name: string): ImageEntry | null {
  const key = normalizeImageryKey(name);
  const cached = CACHE.get(key);
  if (cached !== undefined) return cached;
  const entry = OBJECT_IMAGERY[key] ?? null;
  CACHE.set(key, entry);
  return entry;
}

/**
 * Central registry of "extra" federated data layers added by the
 * 2026-05 swarm. Each entry pairs a hard-coded `LayerMeta` (so the UI
 * can list every available layer without loading any module code) with
 * a `loader` thunk that dynamically imports the module the first time
 * the layer is toggled on.
 *
 * Keeping the meta colocated here (instead of re-exporting from each
 * module) is the price we pay for code-splitting: the viewer entry
 * chunk drops from ~76 KB of static layer code to just this manifest
 * plus the panel UI. Individual module chunks (gaia-stars, chandra, …)
 * are lazy-loaded on first enable.
 *
 * If you update a module's `LAYER_META`, update the copy here too.
 */
import type { Object3D } from "three";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export type SubLayerDef = {
  readonly id: string;
  readonly label: string;
  readonly color: string;
};

export type LayerMeta = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly attribution: string;
  readonly modes: readonly string[];
  readonly defaultEnabled: boolean;
  readonly description: string;
  readonly subLayers?: ReadonlyArray<SubLayerDef>;
  readonly warning?: string;
  /**
   * True when the module ships physically-motivated synthetic data
   * because the real upstream feed isn't wired up yet. Surfaced as an
   * amber "synthetic" badge in the UI so users aren't misled.
   */
  readonly synthetic?: boolean;
};

export type LayerHandle = {
  setEnabled(enabled: boolean): void;
  setMode?(mode: string): void;
  setTime?(ms: number): void;
  setSubLayer?(id: string, on: boolean): void;
  /**
   * Optional host-facing handle exposing layer-specific helpers (e.g.
   * `mmApi.playChirpById` on multi-messenger). React panels read this
   * via `ExtrasController.getLayerApi(id)` after the layer is loaded.
   */
  getApi?(): unknown;
  dispose(): void;
};

export type MountOpts = {
  parent: Object3D;
  mode: string;
  enabled: boolean;
};

export type ExtraLayerModule = {
  readonly LAYER_META: LayerMeta;
  mountLayer(opts: MountOpts): LayerHandle;
};

export type LayerLoader = () => Promise<ExtraLayerModule>;

export type LayerEntry = {
  readonly id: string;
  readonly loader: LayerLoader;
  readonly meta: LayerMeta;
};

/**
 * Order here is the order shown in the UI toggle panel. Keep visually
 * loudest layers near the top, more niche at the bottom.
 *
 * `loader` thunks are intentionally tiny arrow functions so Vite/Rollup
 * can split each module into its own async chunk. The `meta` block is
 * a hard-coded mirror of the module's exported `LAYER_META` so the
 * panel can list every layer instantly without loading any module.
 */
export const EXTRA_LAYERS: readonly LayerEntry[] = [
  // Sky / catalog overlays
  {
    id: "gaia-stars",
    loader: () =>
      import("../gaia-stars") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "gaia-stars",
      label: "Gaia DR3 (1M stars)",
      icon: "✦",
      attribution: "Gaia DR3 · ESA · CC-BY 4.0",
      modes: ["sky", "galactic", "universe"],
      defaultEnabled: false,
      description: "1M parallax-derived stars from Gaia Data Release 3.",
    },
  },
  {
    id: "exoplanets-full",
    loader: () =>
      import("../exoplanets") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "exoplanets-full",
      label: "Exoplanets (NASA full)",
      icon: "🪐",
      attribution:
        "NASA Exoplanet Archive · IPAC/Caltech · public domain · habitability via PHL @ UPR Arecibo (CC-BY)",
      modes: ["sky", "galactic", "universe"],
      defaultEnabled: false,
      description:
        "All 5,800+ confirmed exoplanets with optional habitability colouring.",
    },
  },
  {
    id: "chandra",
    loader: () => import("../chandra") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "chandra",
      label: "Chandra X-ray",
      icon: "x-ray",
      attribution:
        "Chandra X-ray Observatory / NASA & SAO — Chandra Source Catalog 2.0 (public domain)",
      modes: ["sky", "galactic", "universe"],
      defaultEnabled: false,
      description:
        "Bright X-ray sources from the Chandra Source Catalog 2.0 — XRBs, AGN, SNRs, magnetars, clusters, stellar coronae. Diamond markers colored by hardness ratio.",
    },
  },
  {
    id: "variables",
    loader: () =>
      import("../variables") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "variables",
      label: "Variables & TOIs",
      icon: "wave",
      attribution:
        "AAVSO International Variable Star Index (VSX, CC BY 4.0) and NASA Exoplanet Archive TESS TOI (public domain)",
      modes: ["sky", "galactic", "universe"],
      defaultEnabled: false,
      description:
        "Bright variable stars from the AAVSO VSX (Cepheids, Mira, δ-Scuti, eclipsing binaries, …) and TESS Objects of Interest planet candidates. Pulsating circles and small target reticles.",
    },
  },
  {
    id: "multimessenger",
    loader: () =>
      import("../multimessenger") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "multimessenger",
      label: "Multi-messenger",
      icon: "◈",
      attribution:
        "IceCube · Pierre Auger · LIGO/Virgo · NANOGrav (all open / CC-BY)",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Neutrinos, UHE cosmic rays, gravitational waves, pulsar timing array.",
      subLayers: [
        { id: "icecube", label: "IceCube ν events", color: "#4ec9ff" },
        { id: "auger", label: "Auger UHECR", color: "#ffb24e" },
        { id: "ligo", label: "LIGO GW events", color: "#c78bff" },
        { id: "nanograv", label: "NANOGrav PTA", color: "#7cffa1" },
      ],
    },
  },
  {
    id: "ztf-alerts",
    loader: () =>
      import("../ztf-alerts") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "ztf-alerts",
      label: "ZTF supernova alerts",
      icon: "★",
      attribution: "Lasair · ZTF · open w/ attribution",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Recent ZTF supernova candidates (class SN, p > 0.5, 30-day window).",
    },
  },
  {
    id: "atel",
    loader: () => import("../atel") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "atel",
      label: "ATel bulletins",
      icon: "📡",
      attribution:
        "Astronomer's Telegram · astronomerstelegram.org · open w/ attribution",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Recent Astronomer's Telegram bulletins whose RA/Dec parses out of the title or first paragraph. Refreshed every 15 minutes.",
    },
  },
  {
    id: "fxt",
    loader: () => import("../fxt") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "fxt",
      label: "Fast X-ray transients",
      icon: "💥",
      attribution:
        "Einstein Probe / Swift / Chandra · curated from ATel + GCN circulars (open literature)",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Hand-curated catalogue of well-localised fast X-ray transients from Einstein Probe / Swift / Chandra / archival surveys.",
      synthetic: true,
    },
  },
  {
    id: "goto",
    loader: () => import("../goto") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "goto",
      label: "GOTO transient alerts",
      icon: "🛰️",
      attribution:
        "GOTO Collaboration · goto-observatory.org · open w/ attribution",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "GOTO optical transient discoveries: kilonovae candidates, SNe, TDEs, GRB afterglows. Curated from GCN + TNS circulars (no public JSON yet).",
      synthetic: true,
    },
  },
  {
    id: "blackgem",
    loader: () => import("../blackgem") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "blackgem",
      label: "BlackGEM transient alerts",
      icon: "🔭",
      attribution: "BlackGEM Consortium · blackgem.org · open w/ attribution",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "BlackGEM optical transient discoveries (La Silla southern survey): kilonovae candidates, SNe, TDEs, GRB afterglows. Curated from GCN + TNS circulars.",
      synthetic: true,
    },
  },
  {
    id: "planck-polarization",
    loader: () =>
      import("../planck-polarization") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "planck-polarization",
      label: "Planck Polarization",
      icon: "🪡",
      attribution:
        "ESA / Planck Collaboration · PR3 polarization (CC BY 4.0 ESA)",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Planck PR3 SMICA thermal-dust Q/U · NSIDE 16 downgrade of the 353 GHz polarization map.",
    },
  },
  {
    id: "sky-cultures-extended",
    loader: () =>
      import(
        "../sky-cultures-extended"
      ) as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "sky-cultures-extended",
      label: "Sky Cultures (extended)",
      icon: "🌐",
      attribution:
        "Stellarium sky-cultures (cultural data CC BY-SA 4.0) · attributed in-app per culture",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Twelve additional sky cultures (Arab, Inuit, Egyptian, Maya, Boorong, Norse, Maori, Japanese, Korean, Sami, Tongan, Tukano) drawn as constellation line-figures with native star names.",
    },
  },

  // Galactic / universe 3D structure
  {
    id: "galaxy-cone",
    loader: () =>
      import("../galaxy-cone") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "galaxy-cone",
      label: "Galaxy cone (2MRS+6dFGS)",
      icon: "◌",
      attribution:
        "2MRS · Huchra et al. 2012 · 6dFGS · Jones et al. 2009 · CC-BY",
      modes: ["galactic", "universe"],
      defaultEnabled: false,
      description: "~80K nearby galaxies in 3D, out to z≈0.1.",
    },
  },
  {
    id: "cosmicflows4",
    loader: () =>
      import("../cosmicflows4") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "cosmicflows4",
      label: "Cosmicflows-4 vectors",
      icon: "🌊",
      attribution:
        "Tully et al. 2023 — Cosmicflows-4 (open, please cite ApJ 944 94)",
      modes: ["galactic", "universe"],
      defaultEnabled: false,
      description:
        "~10 000 nearby galaxies plotted with their measured peculiar-velocity vectors in the supergalactic frame.",
      synthetic: true,
    },
  },
  {
    id: "milky-way-real",
    loader: () =>
      import("../milky-way-real") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "milky-way-real",
      label: "Milky Way structure (HII + OB)",
      icon: "🌀",
      attribution:
        "Curated: SIMBAD · Sharpless 1959 · Anderson+ 2014 (WISE HII) · Wright+ 2020 (OB associations) — CC0",
      modes: ["galactic", "universe"],
      defaultEnabled: false,
      description:
        "Famous HII regions (red H-alpha glow) and OB associations (blue clusters). Curated starter set — full WISE/Gaia DR2 catalogs in Phase 2.",
    },
  },

  // Solar / Earth-orbit
  {
    id: "neocp-risk",
    loader: () =>
      import("../neocp-risk") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "neocp-risk",
      label: "NEO impact risk (Sentry)",
      icon: "◆",
      attribution: "JPL Sentry · MPC NEOCP · public domain",
      modes: ["solar"],
      defaultEnabled: false,
      description:
        "Near-Earth objects with non-zero cumulative impact probability. " +
        "Marker positions are symbolic (pseudo-orbits), not ephemerides.",
    },
  },
  {
    id: "starlink-optin",
    loader: () =>
      import("../starlink-optin") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "starlink-optin",
      label: "Starlink constellation",
      icon: "≡",
      attribution: "Celestrak · free for any use",
      modes: ["solar"],
      defaultEnabled: false,
      description:
        "All ~6000 Starlink satellites, propagated client-side via SGP4.",
      warning:
        "May significantly impact dark-sky observation. " +
        "Opt-in: shows the full Starlink shell around Earth.",
    },
  },
  {
    id: "globe-at-night",
    loader: () =>
      import("../globe-at-night") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "globe-at-night",
      label: "Globe at Night",
      icon: "🌃",
      attribution:
        "Globe at Night / NOAA VIIRS Day-Night Band · public-domain US Government",
      modes: ["solar"],
      defaultEnabled: false,
      description:
        "City-lights glow overlay on Earth, blending crowdsourced Globe at Night sky-brightness reports with the NOAA VIIRS night-lights composite.",
    },
  },
  {
    id: "opal-giants",
    loader: () =>
      import("../opal-giants") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "opal-giants",
      label: "OPAL Jupiter & Saturn",
      icon: "🪐",
      attribution: "NASA / ESA / STScI · HST OPAL programme · public domain",
      modes: ["solar"],
      defaultEnabled: false,
      description:
        "Annual Hubble OPAL global maps of Jupiter and Saturn, wrapped on the solar-system planets as a time-sliced cloud-band overlay.",
    },
  },
  {
    id: "mars-rover-iotd",
    loader: () =>
      import("../mars-rover-iotd") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "mars-rover-iotd",
      label: "Mars Rover Photo of the Day",
      icon: "🛻",
      attribution:
        "NASA / JPL-Caltech · Mars Photos API (public domain · DEMO_KEY for unauthenticated)",
      modes: ["solar", "sky"],
      defaultEnabled: false,
      description:
        "Latest rover photos from Curiosity and Perseverance via the NASA Mars Photos API.",
    },
  },
  {
    id: "sonification",
    loader: () =>
      import("../sonification") as unknown as Promise<ExtraLayerModule>,
    meta: {
      id: "sonification",
      label: "Sky Sonification",
      icon: "🎶",
      attribution:
        "Sonification synth · pure Web Audio · The Unspeakable World (MIT)",
      modes: ["sky"],
      defaultEnabled: false,
      description:
        "Turn the visible sky into music. Bright stars → drone pad, pulsars → kick drum, Messier objects → bell, GW events → bass swell. Muted by default — open the panel and press ▶.",
    },
  },
];

export function listExtras(mode: LayerMode): LayerMeta[] {
  return EXTRA_LAYERS.filter((e) => e.meta.modes.includes(mode)).map(
    (e) => e.meta,
  );
}

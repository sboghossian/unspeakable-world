/**
 * Outer Planet Atmospheres Legacy (OPAL) — HST annual cylindrical maps
 * of Jupiter and Saturn.
 *
 * Upstream programme page:
 *   https://archive.stsci.edu/hlsp/opal
 *   (Hubble Legacy Archive, public-domain US Government / STScI)
 *
 * For each planet × year, OPAL releases a small set of equirectangular
 * "global maps" stitched from multiple Hubble visits. The URLs below
 * point at the canonical PNGs (one per planet per year). They're
 * hosted on STScI's HLSP CDN, so no R2 mirror is needed — but if STScI
 * changes layout the renderer falls back to a built-in placeholder
 * texture so the layer never breaks the scene.
 *
 * Bookmark: any new year published by STScI can be added by appending
 * a row below and rebuilding.
 */

export type GiantTarget = "jupiter" | "saturn";

export type OpalMap = {
  /** Calendar year of the OPAL observation. */
  year: number;
  target: GiantTarget;
  /** Caption for tooltip / inspector card. */
  caption: string;
  /** Cylindrical (equirectangular) projection PNG. lon 0..360, lat -90..+90. */
  url: string;
};

/* The URLs below are the public OPAL HLSP equirectangular PNGs. If the
 * fetch fails at runtime the module falls back to the placeholder.
 * (The renderer guards against any one failure breaking the layer.) */

export const OPAL_MAPS: ReadonlyArray<OpalMap> = [
  // ─── Jupiter ────────────────────────────────────────────────────
  {
    year: 2015,
    target: "jupiter",
    caption: "Jupiter — OPAL 2015 baseline · Great Red Spot ~16° wide",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2015/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2015a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2016,
    target: "jupiter",
    caption: "Jupiter — OPAL 2016 · NEB widening",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2016/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2016a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2017,
    target: "jupiter",
    caption: "Jupiter — OPAL 2017 · ovals BA / Red Spot turbulence",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2017/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2017a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2018,
    target: "jupiter",
    caption: "Jupiter — OPAL 2018 · SEB outbreak",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2018/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2018a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2019,
    target: "jupiter",
    caption: "Jupiter — OPAL 2019",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2019/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2019a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2020,
    target: "jupiter",
    caption: "Jupiter — OPAL 2020 · new GRS storm signature",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2020/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2020a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2021,
    target: "jupiter",
    caption: "Jupiter — OPAL 2021",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2021/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2021a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2022,
    target: "jupiter",
    caption: "Jupiter — OPAL 2022",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2022/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2022a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2023,
    target: "jupiter",
    caption: "Jupiter — OPAL 2023",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2023/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2023a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },
  {
    year: 2024,
    target: "jupiter",
    caption: "Jupiter — OPAL 2024",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2024/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2024a_f395n+f502n+f631n_v1_globalmap-flat.png",
  },

  // ─── Saturn ────────────────────────────────────────────────────
  {
    year: 2018,
    target: "saturn",
    caption: "Saturn — OPAL 2018 · summer in N hemisphere",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2018/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2018a_f502n+f631n+f658n_v1_globalmap-flat.png",
  },
  {
    year: 2019,
    target: "saturn",
    caption: "Saturn — OPAL 2019",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2019/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2019a_f502n+f631n+f658n_v1_globalmap-flat.png",
  },
  {
    year: 2020,
    target: "saturn",
    caption: "Saturn — OPAL 2020 · auroral activity captured",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2020/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2020a_f502n+f631n+f658n_v1_globalmap-flat.png",
  },
  {
    year: 2021,
    target: "saturn",
    caption: "Saturn — OPAL 2021",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2021/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2021a_f502n+f631n+f658n_v1_globalmap-flat.png",
  },
  {
    year: 2022,
    target: "saturn",
    caption: "Saturn — OPAL 2022 · ring spokes visible",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2022/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2022a_f502n+f631n+f658n_v1_globalmap-flat.png",
  },
  {
    year: 2023,
    target: "saturn",
    caption: "Saturn — OPAL 2023",
    url:
      "https://archive.stsci.edu/hlsps/opal/yearly/2023/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2023a_f502n+f631n+f658n_v1_globalmap-flat.png",
  },
];

export function mapsForPlanet(target: GiantTarget): OpalMap[] {
  return OPAL_MAPS.filter((m) => m.target === target);
}

export function latestMap(target: GiantTarget): OpalMap | null {
  const list = mapsForPlanet(target);
  if (list.length === 0) return null;
  return list.reduce<OpalMap | null>((acc, cur) => {
    if (!acc) return cur;
    return cur.year > acc.year ? cur : acc;
  }, null);
}

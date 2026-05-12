/**
 * HiPS surveys we know how to stream from CDS / mirrors.
 * Day 2 ships only DSS2 color (visible). Day 6 adds 2MASS + AllWISE.
 */

export type Survey = {
  id: string;
  label: string;
  wavelength:
    | "visible"
    | "near-ir"
    | "mid-ir"
    | "far-ir"
    | "x-ray"
    | "gamma-ray"
    | "radio"
    | "microwave"
    | "catalog";
  baseUrl: string;
  /** Tile file extension at typical orders. */
  format: "jpg" | "png";
  /** Minimum HEALPix order this survey provides (default 0). */
  minOrder?: number;
  /** Maximum order this survey provides. */
  maxOrder: number;
  /** Attribution shown in the UI footer / info panel. */
  attribution: string;
};

export const SURVEYS: Record<string, Survey> = {
  dss2: {
    id: "dss2",
    label: "DSS2 color",
    wavelength: "visible",
    baseUrl: "https://alasky.cds.unistra.fr/DSS/DSSColor",
    format: "jpg",
    maxOrder: 9,
    attribution: "DSS color · CDS / STScI",
  },
  "2mass": {
    id: "2mass",
    label: "2MASS J·H·K",
    wavelength: "near-ir",
    baseUrl: "https://alasky.cds.unistra.fr/2MASS/Color",
    format: "jpg",
    maxOrder: 9,
    attribution: "2MASS color · CDS / IPAC",
  },
  allwise: {
    id: "allwise",
    label: "AllWISE W4·W2·W1",
    wavelength: "mid-ir",
    baseUrl: "https://alasky.cds.unistra.fr/AllWISE/RGB-W4-W2-W1",
    format: "jpg",
    maxOrder: 8,
    attribution: "AllWISE · CDS / IPAC",
  },
  integral: {
    id: "integral",
    label: "INTEGRAL color",
    wavelength: "x-ray",
    baseUrl: "https://skies.esac.esa.int/Integral/color",
    format: "jpg",
    maxOrder: 6,
    attribution: "INTEGRAL hard X-ray · ESA",
  },
  galex: {
    id: "galex",
    label: "GALEX UV",
    wavelength: "microwave", // closest "ultraviolet" bucket we have; UI labels it UV
    baseUrl: "https://alasky.cds.unistra.fr/GALEX/GR6-03-2014/AIS-Color",
    format: "jpg",
    maxOrder: 8,
    attribution: "GALEX AIS color · CDS / Caltech",
  },
  halpha: {
    id: "halpha",
    label: "Hα Finkbeiner",
    wavelength: "visible",
    baseUrl: "https://alasky.cds.unistra.fr/FinkbeinerHalpha",
    format: "jpg",
    maxOrder: 7,
    attribution: "Finkbeiner Hα composite · CDS",
  },
  nvss: {
    id: "nvss",
    label: "NVSS 1.4 GHz",
    wavelength: "radio",
    baseUrl: "https://alasky.cds.unistra.fr/NVSS/intensity",
    format: "jpg",
    maxOrder: 5,
    attribution: "NVSS 1.4 GHz · NRAO",
  },
  fermi: {
    id: "fermi",
    label: "Fermi LAT 1-300 GeV",
    // Fermi is γ-ray, not X-ray — moved to its own bucket as part of
    // the Day-7 wavelength expansion.
    wavelength: "gamma-ray",
    baseUrl: "https://alasky.cds.unistra.fr/Fermi/Color",
    format: "jpg",
    maxOrder: 6,
    attribution: "Fermi LAT γ-ray · NASA",
  },
  planck: {
    id: "planck",
    label: "Planck HFI color",
    wavelength: "microwave",
    // Planck HFI color composite (217/353/545/857 GHz) full-sky HiPS,
    // served by alasky / CDS. Reads as the CMB foreground at sub-mm.
    baseUrl: "https://alasky.cds.unistra.fr/Planck/HFI_Color",
    format: "jpg",
    maxOrder: 5,
    attribution: "Planck HFI · ESA / CDS",
  },
  gaia: {
    id: "gaia",
    label: "Gaia (DR3)",
    // Not a wavelength survey strictly — this is a star-density / flux
    // composite from the Gaia DR3 catalog (Bp · G · Rp). We bucket it as
    // "catalog" so the UI can tag it distinctly from imaging surveys.
    wavelength: "catalog",
    baseUrl:
      "https://alasky.cds.unistra.fr/ancillary/GaiaDR3/color-Rp-G-Bp-flux-map",
    format: "jpg",
    maxOrder: 7,
    attribution: "Gaia DR3 Rp·G·Bp flux map · ESA / CDS",
  },
  // -------------------------------------------------------------------------
  // Day-7 swarm: 7 additional all-sky HiPS overlays. Each URL was probed
  // against the CDS MocServer + a `Norder{N}/Dir0/Npix0` tile fetch with CORS
  // headers verified. See hips-list at aladin.cds.unistra.fr/hips/list.
  // Chandra was checked — no all-sky HiPS exists (only pointed catalog), so
  // it is intentionally absent. The EHT (M87*, Sgr A*) likewise has no
  // full-sky HiPS — those are point-source images, not surveys.
  // -------------------------------------------------------------------------
  rass: {
    id: "rass",
    label: "ROSAT All-Sky",
    wavelength: "x-ray",
    // ROSAT all-sky survey (RASS), 0.1-2.4 keV soft X-ray, full sky.
    baseUrl: "https://alasky.cds.unistra.fr/RASS",
    format: "jpg",
    maxOrder: 4,
    attribution: "ROSAT RASS · MPE / CDS",
  },
  erosita: {
    id: "erosita",
    label: "eROSITA-DE DR1",
    wavelength: "x-ray",
    // eROSITA-DE DR1 RGB rate image — bands 0.2-0.5 / 0.5-1.0 / 1.0-2.0 keV.
    // Covers the German half of the sky (galactic l = 180-360°, ~50%).
    baseUrl:
      "https://erosita.mpe.mpg.de/dr1/erodat/static/hips/eRASS1_RGB_Rate_c010",
    format: "png",
    maxOrder: 6,
    attribution: "eROSITA-DE DR1 · MPE",
  },
  spitzer: {
    id: "spitzer",
    label: "Spitzer MIPS 24μm",
    wavelength: "mid-ir",
    // Spitzer MIPS band 1 — 24 micron mid-IR mosaic, full sky.
    // (The SpitzerI1I2I4color HiPS only covers 1% of the sky, so we
    // pick MIPS1 which is the only Spitzer all-sky HiPS.)
    baseUrl: "https://alasky.cds.unistra.fr/Spitzer/MIPS1",
    format: "jpg",
    maxOrder: 8,
    attribution: "Spitzer MIPS 24μm · NASA / IPAC",
  },
  herschel: {
    id: "herschel",
    label: "Herschel PACS",
    wavelength: "far-ir",
    // Herschel PACS color composite (70 / 100 / 160 μm). Coverage is
    // ~8% sky (Herschel was pointed, not a survey) but extremely high
    // resolution where it covers — Galactic plane HiGAL + KP fields.
    baseUrl: "https://skies.esac.esa.int/Herschel/PACS-color",
    format: "jpg",
    maxOrder: 9,
    attribution: "Herschel PACS · ESA / ESAC",
  },
  iris: {
    id: "iris",
    label: "IRAS IRIS color",
    wavelength: "far-ir",
    // IRAS Improved Reprocessing (IRIS) — 12/60/100 μm color composite,
    // full sky. The canonical successor to the raw IRAS data.
    baseUrl: "https://alasky.cds.unistra.fr/IRISColor",
    format: "jpg",
    maxOrder: 3,
    attribution: "IRAS IRIS · IPAC / CDS",
  },
  hi4pi: {
    id: "hi4pi",
    label: "HI4PI 21 cm",
    wavelength: "radio",
    // HI4PI neutral hydrogen 21 cm column density, full sky.
    // Note: this HiPS ships only as PNG (no JPG variant published).
    baseUrl: "https://alasky.cds.unistra.fr/HI4PI/P_HI4PI_NHI",
    format: "png",
    maxOrder: 3,
    attribution: "HI4PI NHI · MPIfR / ATNF / CDS",
  },
  akari: {
    id: "akari",
    label: "AKARI FIS",
    wavelength: "far-ir",
    // AKARI Far-Infrared Surveyor color composite (N60 60 μm,
    // WideS 90 μm, WideL 140 μm) — full sky.
    baseUrl: "https://alasky.cds.unistra.fr/AKARI-FIS/ColorLSN60",
    format: "jpg",
    maxOrder: 5,
    attribution: "AKARI FIS · JAXA / ISAS / CDS",
  },
};

/**
 * Build a HiPS tile URL.
 * Spec: `{base}/Norder{N}/Dir{D}/Npix{P}.{ext}` where D = floor(P/10000)*10000.
 */
export function tileUrl(survey: Survey, order: number, ipix: number): string {
  const dir = Math.floor(ipix / 10000) * 10000;
  return `${survey.baseUrl}/Norder${order}/Dir${dir}/Npix${ipix}.${survey.format}`;
}

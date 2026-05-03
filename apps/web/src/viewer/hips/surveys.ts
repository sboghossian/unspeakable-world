/**
 * HiPS surveys we know how to stream from CDS / mirrors.
 * Day 2 ships only DSS2 color (visible). Day 6 adds 2MASS + AllWISE.
 */

export type Survey = {
  id: string;
  label: string;
  wavelength: "visible" | "near-ir" | "mid-ir" | "x-ray" | "radio";
  baseUrl: string;
  /** Tile file extension at typical orders. */
  format: "jpg" | "png";
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
};

/**
 * Build a HiPS tile URL.
 * Spec: `{base}/Norder{N}/Dir{D}/Npix{P}.{ext}` where D = floor(P/10000)*10000.
 */
export function tileUrl(survey: Survey, order: number, ipix: number): string {
  const dir = Math.floor(ipix / 10000) * 10000;
  return `${survey.baseUrl}/Norder${order}/Dir${dir}/Npix${ipix}.${survey.format}`;
}

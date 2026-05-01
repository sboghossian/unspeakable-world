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
  // Day 6:
  // '2mass': { ... },
  // 'allwise': { ... },
};

/**
 * Build a HiPS tile URL.
 * Spec: `{base}/Norder{N}/Dir{D}/Npix{P}.{ext}` where D = floor(P/10000)*10000.
 */
export function tileUrl(survey: Survey, order: number, ipix: number): string {
  const dir = Math.floor(ipix / 10000) * 10000;
  return `${survey.baseUrl}/Norder${order}/Dir${dir}/Npix${ipix}.${survey.format}`;
}

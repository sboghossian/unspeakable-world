/**
 * Near-Earth Object close-approach feed via JPL's SBDB Close-Approach API.
 *
 *   https://ssd-api.jpl.nasa.gov/cad.api
 *
 * The endpoint is CORS-open for browsers and free of usage restrictions
 * beyond NASA fair-use. We pull the next ~14 days of approaches within a
 * generous distance bound (0.1 AU ≈ 38× lunar distance).
 */

const ENDPOINT = "https://ssd-api.jpl.nasa.gov/cad.api";

export type NeoApproach = {
  designation: string;
  /** Close-approach date as a JS Date (UTC). */
  date: Date;
  /** Approach distance in AU (au). */
  distAu: number;
  /** Approach distance in lunar distances (1 LD = 384,400 km ≈ 0.00257 AU). */
  distLD: number;
  /** Relative speed in km/s. */
  velKmS: number;
  /** Absolute magnitude H (smaller = larger object, roughly).  */
  absMag: number | null;
};

const AU_TO_LD = 1 / 0.0025695553;

export type NeoFetchOptions = {
  /** Look-ahead window in days. Default 14. */
  daysAhead?: number;
  /** Only include approaches closer than this many AU. Default 0.1. */
  maxDistAu?: number;
  /** Cap on number of results. Default 12. */
  limit?: number;
};

export async function fetchNeoApproaches(
  opts: NeoFetchOptions = {},
): Promise<NeoApproach[]> {
  const daysAhead = opts.daysAhead ?? 14;
  const maxDistAu = opts.maxDistAu ?? 0.1;
  const limit = opts.limit ?? 12;

  const params = new URLSearchParams({
    "date-min": "now",
    "date-max": `+${daysAhead}`,
    "dist-max": String(maxDistAu),
    body: "Earth",
    limit: String(limit),
    sort: "date",
  });
  const url = `${ENDPOINT}?${params.toString()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`JPL CAD HTTP ${res.status}`);
  const json = (await res.json()) as {
    fields: string[];
    data: string[][];
  };
  if (!Array.isArray(json.fields) || !Array.isArray(json.data)) return [];

  const idx = (name: string): number => json.fields.indexOf(name);
  const desI = idx("des");
  const cdI = idx("cd");
  const distI = idx("dist");
  const vRelI = idx("v_rel");
  const hI = idx("h");

  const out: NeoApproach[] = [];
  for (const row of json.data) {
    const des = row[desI] ?? "";
    const cd = row[cdI] ?? "";
    const distAu = parseFloat(row[distI] ?? "NaN");
    const vRel = parseFloat(row[vRelI] ?? "NaN");
    const hVal = parseFloat(row[hI] ?? "NaN");
    const date = parseCloseApproachDate(cd);
    if (!Number.isFinite(distAu) || !Number.isFinite(vRel) || !date) continue;

    out.push({
      designation: des,
      date,
      distAu,
      distLD: distAu * AU_TO_LD,
      velKmS: vRel,
      absMag: Number.isFinite(hVal) ? hVal : null,
    });
  }
  return out;
}

/** "2026-May-05 19:37" → Date (UTC). */
function parseCloseApproachDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const month = months[m[2]!];
  if (month === undefined) return null;
  return new Date(Date.UTC(+m[1]!, month, +m[3]!, +m[4]!, +m[5]!));
}

/**
 * Rough size estimate from absolute magnitude H, assuming an albedo of 0.14
 * (typical S-type asteroid). Returns diameter in meters. Useful for the UI
 * label "~120 m"; not science-grade.
 */
export function approxDiameterMeters(absMag: number, albedo = 0.14): number {
  return (1329 / Math.sqrt(albedo)) * Math.pow(10, -0.2 * absMag) * 1000;
}

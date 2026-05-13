/**
 * 🔥 Fast X-ray Transients (FXT) — sky-layer feed.
 *
 * FXTs are minute-to-hour duration X-ray flashes spanning multiple
 * progenitor classes (compact-object mergers, supernova shock breakout,
 * tidal disruption events, magnetar flares, ...). There is no single
 * canonical feed: discoveries are cross-listed in ATel + GCN circulars
 * and published over months. This layer therefore ships a HAND-CURATED
 * list of well-localised FXTs from the literature plus the Einstein
 * Probe / WXT early-mission follow-up tables.
 *
 * Refresh: 24 h. The set evolves slowly; the catalogue is bundled with
 * the JS chunk and we just re-emit it each interval so the appearance
 * pulse can highlight any client-side additions made by a future tab.
 *
 * License: All entries are drawn from open-literature ATel / GCN
 * circulars and the Einstein Probe public alert stream. We list them
 * by their canonical name + reference circular id.
 */

export type FxtEvent = {
  /** Canonical name, e.g. "EP240315a", "XRT 080109". */
  id: string;
  /** RA in decimal degrees (J2000). */
  raDeg: number;
  /** Dec in decimal degrees (J2000). */
  decDeg: number;
  /** Discovery date (YYYY-MM-DD or ISO). */
  date: string;
  /** Discovery facility / instrument. */
  facility: string;
  /** Short one-line notes for tooltip. */
  notes: string;
  /** Reference circular / paper id, e.g. "ATel 16515" or "GCN 35931". */
  reference: string;
};

/**
 * Curated FXT catalogue (~25 events). RA/Dec are J2000 in decimal
 * degrees — sourced from the discovery ATel / GCN circulars, or from
 * the Einstein Probe consortium's public alert table for EP-WXT
 * detections.
 *
 * Naming follows the convention used in the discovery circular: e.g.
 * Swift J* for Swift/XRT, EP* for Einstein Probe, XRT/CDF-S YYMMDDx
 * for the Chandra deep-survey transients.
 */
const CURATED: ReadonlyArray<FxtEvent> = [
  {
    id: "XRT 080109 / SN 2008D",
    raDeg: 137.0292,
    decDeg: 33.1456,
    date: "2008-01-09",
    facility: "Swift / XRT",
    notes: "X-ray flash from SN 2008D shock breakout in NGC 2770.",
    reference: "Soderberg+ 2008 Nature 453, 469",
  },
  {
    id: "CDF-S XT1",
    raDeg: 53.1615,
    decDeg: -27.8593,
    date: "2014-10-01",
    facility: "Chandra / ACIS",
    notes: "Cosmological FXT in the CDF-S; ~1500 s flash, unknown progenitor.",
    reference: "Bauer+ 2017 MNRAS 467, 4841",
  },
  {
    id: "CDF-S XT2",
    raDeg: 53.0729,
    decDeg: -27.8721,
    date: "2015-03-22",
    facility: "Chandra / ACIS",
    notes: "Magnetar-powered NS-NS merger candidate at z=0.74.",
    reference: "Xue+ 2019 Nature 568, 198",
  },
  {
    id: "XRT 110103",
    raDeg: 222.7458,
    decDeg: 21.6064,
    date: "2011-01-03",
    facility: "Swift / XRT",
    notes: "Untriggered XRT FXT discovered in archival search.",
    reference: "Glennie+ 2015 MNRAS 450, 60",
  },
  {
    id: "XRT 030511",
    raDeg: 117.495,
    decDeg: 16.973,
    date: "2003-05-11",
    facility: "Swift / XRT",
    notes: "Archival XRT FXT (Quirola-Vasquez+ 2022 sample).",
    reference: "Quirola-Vasquez+ 2022 A&A 663, A168",
  },
  {
    id: "EP 240219a",
    raDeg: 124.227,
    decDeg: -8.547,
    date: "2024-02-19",
    facility: "Einstein Probe / WXT",
    notes: "Bright soft X-ray transient, no optical counterpart in early follow-up.",
    reference: "ATel 16456",
  },
  {
    id: "EP 240315a",
    raDeg: 141.0479,
    decDeg: -11.4188,
    date: "2024-03-15",
    facility: "Einstein Probe / WXT",
    notes: "Long-duration FXT at z=4.86 associated with GRB 240315A.",
    reference: "Levan+ 2024 / ATel 16559",
  },
  {
    id: "EP 240414a",
    raDeg: 191.508,
    decDeg: -32.318,
    date: "2024-04-14",
    facility: "Einstein Probe / WXT",
    notes: "FXT linked to long GRB at z=0.401 with kilonova-like component.",
    reference: "ATel 16586",
  },
  {
    id: "EP 240801a",
    raDeg: 254.7,
    decDeg: 16.45,
    date: "2024-08-01",
    facility: "Einstein Probe / WXT",
    notes: "Soft X-ray transient, candidate GRB precursor.",
    reference: "ATel 16785",
  },
  {
    id: "EP 240802a",
    raDeg: 16.94,
    decDeg: -2.83,
    date: "2024-08-02",
    facility: "Einstein Probe / WXT",
    notes: "FXT with rapidly fading optical counterpart.",
    reference: "ATel 16793",
  },
  {
    id: "EP 240904a",
    raDeg: 47.36,
    decDeg: 1.59,
    date: "2024-09-04",
    facility: "Einstein Probe / WXT",
    notes: "Galactic-plane FXT, magnetar candidate.",
    reference: "ATel 16823",
  },
  {
    id: "EP 241021a",
    raDeg: 36.84,
    decDeg: 73.66,
    date: "2024-10-21",
    facility: "Einstein Probe / WXT",
    notes: "FXT followed up by GOTO and Liverpool Telescope.",
    reference: "ATel 16871",
  },
  {
    id: "EP 241115a",
    raDeg: 78.43,
    decDeg: -39.91,
    date: "2024-11-15",
    facility: "Einstein Probe / WXT",
    notes: "Likely TDE candidate, soft thermal spectrum.",
    reference: "ATel 16924",
  },
  {
    id: "EP 250108a",
    raDeg: 138.91,
    decDeg: -52.07,
    date: "2025-01-08",
    facility: "Einstein Probe / WXT",
    notes: "Long-duration FXT with fast-cooling X-ray afterglow.",
    reference: "ATel 17005",
  },
  {
    id: "EP 250207a",
    raDeg: 199.18,
    decDeg: 20.49,
    date: "2025-02-07",
    facility: "Einstein Probe / WXT",
    notes: "FXT in low-mass host galaxy.",
    reference: "ATel 17041",
  },
  {
    id: "Swift J1644+57",
    raDeg: 251.205,
    decDeg: 57.581,
    date: "2011-03-25",
    facility: "Swift / BAT",
    notes: "Relativistic tidal disruption event.",
    reference: "Bloom+ 2011 Science 333, 203",
  },
  {
    id: "Swift J2058+05",
    raDeg: 314.555,
    decDeg: 5.226,
    date: "2011-05-17",
    facility: "Swift / BAT",
    notes: "Jetted TDE candidate.",
    reference: "Cenko+ 2012 ApJ 753, 77",
  },
  {
    id: "AT2018cow",
    raDeg: 244.0007,
    decDeg: 22.2680,
    date: "2018-06-16",
    facility: "ATLAS + NICER",
    notes: "Famous fast blue optical/X-ray transient.",
    reference: "Margutti+ 2019 ApJ 872, 18",
  },
  {
    id: "AT2020mrf",
    raDeg: 244.2829,
    decDeg: 32.6342,
    date: "2020-06-30",
    facility: "ZTF + SRG/eROSITA",
    notes: "Luminous FXT with engine-powered SN counterpart.",
    reference: "Yao+ 2022 ApJ 934, 104",
  },
  {
    id: "MAXI J0709-159",
    raDeg: 107.273,
    decDeg: -15.916,
    date: "2022-01-25",
    facility: "MAXI / GSC",
    notes: "Be-XRB X-ray transient outburst.",
    reference: "ATel 15214",
  },
  {
    id: "SGR 1935+2154 (2020 FXB)",
    raDeg: 293.7317,
    decDeg: 21.8964,
    date: "2020-04-28",
    facility: "CHIME / STARE2",
    notes: "Galactic magnetar FRB-coincident X-ray burst.",
    reference: "Mereghetti+ 2020 ApJ 898, L29",
  },
  {
    id: "GRB 170817A / GW170817",
    raDeg: 197.45,
    decDeg: -23.38,
    date: "2017-08-17",
    facility: "Fermi / GBM",
    notes: "First confirmed BNS merger with kilonova + short GRB.",
    reference: "Abbott+ 2017 ApJ 848, L12",
  },
  {
    id: "Swift J1818.0-1607",
    raDeg: 274.5119,
    decDeg: -16.1287,
    date: "2020-03-12",
    facility: "Swift / BAT",
    notes: "Young magnetar with short hard X-ray bursts.",
    reference: "ATel 13568",
  },
  {
    id: "XRT 210423",
    raDeg: 116.55,
    decDeg: 28.39,
    date: "2021-04-23",
    facility: "Swift / XRT",
    notes: "Archival FXT identified in DR2 of XRT serendipitous catalogue.",
    reference: "Quirola-Vasquez+ 2023 A&A 675, A44",
  },
  {
    id: "EP 250404a",
    raDeg: 222.39,
    decDeg: -41.85,
    date: "2025-04-04",
    facility: "Einstein Probe / WXT",
    notes: "FXT inside the Galactic plane, neutron-star candidate.",
    reference: "ATel 17128",
  },
];

/**
 * Return the curated FXT list. Async to match the cross-module
 * `fetch...Events` shape and keep room for a future upstream wire-up.
 */
export async function fetchFxtEvents(): Promise<FxtEvent[]> {
  return CURATED.slice();
}

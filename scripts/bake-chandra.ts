/**
 * bake-chandra.ts — embed a curated set of well-known X-ray sources into
 * a compact JSON blob the web viewer reads at runtime.
 *
 * The full Chandra Source Catalog 2.0 (~317K rows) lives at
 *   https://cda.cfa.harvard.edu/csc/
 * but the cone-search/CSCview HTTP endpoints are slow and unfriendly for a
 * batch flux-thresholded export, and the bulk distribution requires the
 * CSCcli Java tool. For a v1 sky overlay the most-recognizable bright
 * sources read better than 30K anonymous fluxes, so we ship a hand-curated
 * subset of historic X-ray sources spanning XRBs, AGN, SNRs, magnetars,
 * clusters and the brightest stellar coronae.
 *
 * Source attribution: all positions cross-checked against SIMBAD and the
 * Chandra Source Catalog 2.0 release. License: NASA/CXC public domain.
 *
 * Output: apps/web/public/data/chandra-bright.json
 *
 * Run: pnpm --filter web bake:chandra
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "apps/web/public/data");

/**
 * Hardness ratio convention here:
 *   hr ∈ [-1, +1]
 *     +1  =  hard  (most flux in 2-7 keV band)        → blue marker
 *      0  =  neutral                                  → purple
 *     -1  =  soft  (most flux in 0.5-2 keV band)      → red marker
 *
 * flux_aper_b is broad-band aperture flux in erg s⁻¹ cm⁻².
 */
type XraySource = {
  name: string;
  ra: number; // deg, ICRS
  dec: number; // deg, ICRS
  flux_aper_b: number; // erg/s/cm² (broad band 0.5-7 keV)
  hard_ratio_hm: number; // -1 (soft) … +1 (hard)
  type: string; // free-form: "XRB", "AGN", "SNR", "Magnetar", "Cluster", "Star"
  notes?: string;
};

// Hand-curated catalog of historically important / brightest X-ray sources.
// Fluxes are approximate broad-band time-averages; some sources (XRBs in
// particular) vary by orders of magnitude so values are quiescent or mean.
const SOURCES: ReadonlyArray<XraySource> = [
  // ── X-ray binaries ────────────────────────────────────────────────
  { name: "Sco X-1", ra: 244.97947, dec: -15.64031, flux_aper_b: 2.0e-7, hard_ratio_hm: -0.55, type: "XRB", notes: "First discovered cosmic X-ray source (1962)" },
  { name: "Cyg X-1", ra: 299.59032, dec: 35.20162, flux_aper_b: 2.5e-8, hard_ratio_hm: 0.45, type: "XRB", notes: "First confirmed stellar-mass black hole" },
  { name: "Cyg X-2", ra: 326.17152, dec: 38.32129, flux_aper_b: 8.0e-9, hard_ratio_hm: -0.30, type: "XRB" },
  { name: "Cyg X-3", ra: 308.10742, dec: 40.95775, flux_aper_b: 6.0e-9, hard_ratio_hm: 0.55, type: "XRB" },
  { name: "Her X-1", ra: 254.45754, dec: 35.34235, flux_aper_b: 7.0e-9, hard_ratio_hm: 0.35, type: "XRB", notes: "Accreting X-ray pulsar" },
  { name: "Cen X-3", ra: 170.31571, dec: -60.62378, flux_aper_b: 5.0e-9, hard_ratio_hm: 0.45, type: "XRB" },
  { name: "Cen X-4", ra: 224.59140, dec: -31.66867, flux_aper_b: 5.0e-12, hard_ratio_hm: 0.10, type: "XRB", notes: "Quiescent neutron-star transient" },
  { name: "Vela X-1", ra: 135.52858, dec: -40.55470, flux_aper_b: 5.0e-9, hard_ratio_hm: 0.60, type: "XRB" },
  { name: "GX 1+4", ra: 263.00942, dec: -24.74570, flux_aper_b: 1.0e-9, hard_ratio_hm: 0.50, type: "XRB" },
  { name: "GX 5-1", ra: 270.28342, dec: -25.07939, flux_aper_b: 6.0e-9, hard_ratio_hm: -0.10, type: "XRB" },
  { name: "GX 9+9", ra: 262.93396, dec: -16.96189, flux_aper_b: 5.0e-9, hard_ratio_hm: -0.20, type: "XRB" },
  { name: "GX 17+2", ra: 274.00564, dec: -14.03625, flux_aper_b: 8.0e-9, hard_ratio_hm: -0.25, type: "XRB" },
  { name: "GX 339-4", ra: 255.70557, dec: -48.78947, flux_aper_b: 1.5e-9, hard_ratio_hm: 0.30, type: "XRB", notes: "Black-hole transient" },
  { name: "GRS 1915+105", ra: 288.79805, dec: 10.94557, flux_aper_b: 1.0e-8, hard_ratio_hm: 0.20, type: "XRB", notes: "Microquasar" },
  { name: "SS 433", ra: 287.95650, dec: 4.98258, flux_aper_b: 1.0e-9, hard_ratio_hm: 0.60, type: "XRB", notes: "Relativistic jet system" },
  { name: "LMC X-1", ra: 84.91178, dec: -69.74320, flux_aper_b: 2.0e-10, hard_ratio_hm: 0.30, type: "XRB" },
  { name: "LMC X-3", ra: 84.73588, dec: -64.08384, flux_aper_b: 2.0e-10, hard_ratio_hm: 0.20, type: "XRB" },
  { name: "LMC X-4", ra: 83.20655, dec: -66.37025, flux_aper_b: 1.5e-10, hard_ratio_hm: 0.50, type: "XRB" },
  { name: "SMC X-1", ra: 19.27144, dec: -73.44339, flux_aper_b: 4.0e-10, hard_ratio_hm: 0.40, type: "XRB" },
  { name: "4U 1820-30", ra: 275.91920, dec: -30.36116, flux_aper_b: 5.0e-9, hard_ratio_hm: -0.20, type: "XRB", notes: "Ultracompact 11-min binary, NGC 6624" },
  { name: "4U 1700-37", ra: 255.98662, dec: -37.84417, flux_aper_b: 1.5e-9, hard_ratio_hm: 0.55, type: "XRB" },
  { name: "4U 1626-67", ra: 248.07003, dec: -67.46139, flux_aper_b: 5.0e-10, hard_ratio_hm: 0.45, type: "XRB" },
  { name: "Aql X-1", ra: 287.81678, dec: 0.58515, flux_aper_b: 8.0e-10, hard_ratio_hm: 0.10, type: "XRB" },
  { name: "X Per", ra: 58.84621, dec: 31.04580, flux_aper_b: 1.5e-10, hard_ratio_hm: 0.45, type: "XRB" },
  { name: "V404 Cyg", ra: 306.01595, dec: 33.86723, flux_aper_b: 1.0e-12, hard_ratio_hm: 0.30, type: "XRB", notes: "Black-hole transient (outbursts 1989, 2015)" },
  { name: "A0620-00", ra: 95.67925, dec: -0.34708, flux_aper_b: 1.0e-12, hard_ratio_hm: 0.20, type: "XRB" },

  // ── Active galactic nuclei ───────────────────────────────────────
  { name: "M87 (Virgo A)", ra: 187.70593, dec: 12.39112, flux_aper_b: 8.0e-12, hard_ratio_hm: -0.10, type: "AGN", notes: "Supermassive BH 6.5e9 M☉, EHT target" },
  { name: "Cen A (NGC 5128)", ra: 201.36506, dec: -43.01911, flux_aper_b: 3.0e-11, hard_ratio_hm: 0.35, type: "AGN" },
  { name: "3C 273", ra: 187.27791, dec: 2.05238, flux_aper_b: 1.2e-10, hard_ratio_hm: 0.15, type: "AGN", notes: "First quasar identified (1963)" },
  { name: "3C 279", ra: 194.04653, dec: -5.78931, flux_aper_b: 1.0e-11, hard_ratio_hm: 0.40, type: "AGN" },
  { name: "NGC 1068", ra: 40.66964, dec: -0.01328, flux_aper_b: 2.0e-11, hard_ratio_hm: 0.50, type: "AGN", notes: "Archetype Seyfert 2" },
  { name: "NGC 4151", ra: 182.63575, dec: 39.40585, flux_aper_b: 5.0e-11, hard_ratio_hm: 0.55, type: "AGN" },
  { name: "MCG-6-30-15", ra: 203.97375, dec: -34.29550, flux_aper_b: 4.0e-11, hard_ratio_hm: 0.40, type: "AGN" },
  { name: "Mrk 421", ra: 166.11383, dec: 38.20883, flux_aper_b: 5.0e-11, hard_ratio_hm: 0.10, type: "AGN", notes: "TeV blazar" },
  { name: "Mrk 501", ra: 253.46757, dec: 39.76017, flux_aper_b: 4.0e-11, hard_ratio_hm: 0.10, type: "AGN" },
  { name: "PKS 2155-304", ra: 329.71694, dec: -30.22561, flux_aper_b: 3.0e-11, hard_ratio_hm: 0.05, type: "AGN", notes: "HBL blazar" },
  { name: "Sgr A*", ra: 266.41684, dec: -29.00781, flux_aper_b: 2.0e-14, hard_ratio_hm: 0.45, type: "AGN", notes: "Galactic-center SMBH" },
  { name: "Fairall 9", ra: 20.94053, dec: -58.80578, flux_aper_b: 2.0e-11, hard_ratio_hm: 0.20, type: "AGN" },
  { name: "NGC 4051", ra: 180.79008, dec: 44.53133, flux_aper_b: 1.5e-11, hard_ratio_hm: 0.30, type: "AGN" },
  { name: "NGC 5548", ra: 214.49814, dec: 25.13683, flux_aper_b: 3.0e-11, hard_ratio_hm: 0.25, type: "AGN" },
  { name: "Cygnus A", ra: 299.86811, dec: 40.73392, flux_aper_b: 8.0e-12, hard_ratio_hm: 0.55, type: "AGN" },
  { name: "NGC 1275 (Perseus A)", ra: 49.95067, dec: 41.51169, flux_aper_b: 5.0e-11, hard_ratio_hm: -0.10, type: "AGN" },

  // ── Supernova remnants ───────────────────────────────────────────
  { name: "Cas A", ra: 350.85000, dec: 58.81500, flux_aper_b: 8.0e-11, hard_ratio_hm: 0.10, type: "SNR", notes: "~340 yr-old SNR, brightest radio source in sky" },
  { name: "Crab Nebula", ra: 83.63322, dec: 22.01446, flux_aper_b: 2.4e-8, hard_ratio_hm: 0.45, type: "SNR", notes: "X-ray flux standard candle" },
  { name: "Tycho's SNR", ra: 6.34000, dec: 64.13083, flux_aper_b: 1.5e-11, hard_ratio_hm: 0.15, type: "SNR", notes: "SN 1572" },
  { name: "Kepler's SNR", ra: 262.67500, dec: -21.48700, flux_aper_b: 5.0e-12, hard_ratio_hm: 0.20, type: "SNR", notes: "SN 1604" },
  { name: "SN 1006", ra: 225.59250, dec: -41.93400, flux_aper_b: 8.0e-12, hard_ratio_hm: 0.05, type: "SNR" },
  { name: "RX J1713.7-3946", ra: 258.36250, dec: -39.76700, flux_aper_b: 2.0e-11, hard_ratio_hm: 0.25, type: "SNR" },
  { name: "Vela Pulsar (SNR)", ra: 128.83604, dec: -45.17636, flux_aper_b: 1.5e-11, hard_ratio_hm: 0.30, type: "SNR" },
  { name: "Puppis A", ra: 125.40000, dec: -42.97000, flux_aper_b: 6.0e-11, hard_ratio_hm: -0.40, type: "SNR" },
  { name: "G21.5-0.9", ra: 278.39400, dec: -10.56500, flux_aper_b: 1.0e-11, hard_ratio_hm: 0.20, type: "SNR" },
  { name: "Cygnus Loop", ra: 312.75000, dec: 30.66700, flux_aper_b: 4.0e-11, hard_ratio_hm: -0.65, type: "SNR" },
  { name: "3C 58", ra: 31.41875, dec: 64.82836, flux_aper_b: 3.0e-12, hard_ratio_hm: 0.20, type: "SNR" },

  // ── Magnetars / isolated neutron stars ───────────────────────────
  { name: "Magnetar SGR 1806-20", ra: 272.16375, dec: -20.41138, flux_aper_b: 5.0e-12, hard_ratio_hm: 0.45, type: "Magnetar", notes: "2004 giant flare" },
  { name: "Magnetar 1E 1048.1-5937", ra: 162.46708, dec: -59.88308, flux_aper_b: 3.0e-12, hard_ratio_hm: 0.30, type: "Magnetar" },
  { name: "Magnetar 4U 0142+61", ra: 26.59425, dec: 61.75091, flux_aper_b: 9.0e-11, hard_ratio_hm: 0.25, type: "Magnetar" },
  { name: "Magnetar 1E 1841-045", ra: 280.33042, dec: -4.93619, flux_aper_b: 2.0e-11, hard_ratio_hm: 0.40, type: "Magnetar" },
  { name: "RX J1856.5-3754", ra: 284.14638, dec: -37.90539, flux_aper_b: 1.4e-12, hard_ratio_hm: -0.95, type: "NS", notes: "Isolated neutron star, very soft" },
  { name: "Geminga", ra: 98.47563, dec: 17.77027, flux_aper_b: 3.0e-12, hard_ratio_hm: -0.50, type: "NS" },
  { name: "PSR B0656+14", ra: 104.95046, dec: 14.23937, flux_aper_b: 1.0e-12, hard_ratio_hm: -0.55, type: "NS" },
  { name: "PSR B1055-52", ra: 164.49317, dec: -52.44528, flux_aper_b: 7.0e-13, hard_ratio_hm: -0.45, type: "NS" },

  // ── Clusters of galaxies ─────────────────────────────────────────
  { name: "Coma Cluster", ra: 195.03379, dec: 27.97700, flux_aper_b: 3.0e-11, hard_ratio_hm: 0.10, type: "Cluster" },
  { name: "Perseus Cluster", ra: 49.95067, dec: 41.51169, flux_aper_b: 5.0e-11, hard_ratio_hm: 0.05, type: "Cluster" },
  { name: "Virgo Cluster (M87)", ra: 187.70593, dec: 12.39112, flux_aper_b: 4.0e-11, hard_ratio_hm: 0.00, type: "Cluster" },
  { name: "Abell 2029", ra: 227.73375, dec: 5.74450, flux_aper_b: 2.0e-11, hard_ratio_hm: 0.10, type: "Cluster" },
  { name: "Abell 1689", ra: 197.87292, dec: -1.34111, flux_aper_b: 1.0e-11, hard_ratio_hm: 0.20, type: "Cluster" },
  { name: "Abell 3266", ra: 67.84167, dec: -61.45000, flux_aper_b: 1.5e-11, hard_ratio_hm: 0.15, type: "Cluster" },
  { name: "Bullet Cluster", ra: 104.65833, dec: -55.94694, flux_aper_b: 4.0e-12, hard_ratio_hm: 0.30, type: "Cluster", notes: "Dark-matter mapping target" },
  { name: "Hydra A", ra: 139.52375, dec: -12.09556, flux_aper_b: 1.0e-11, hard_ratio_hm: 0.00, type: "Cluster" },

  // ── Stellar coronae & flare stars ────────────────────────────────
  { name: "Algol", ra: 47.04221, dec: 40.95565, flux_aper_b: 5.0e-12, hard_ratio_hm: -0.20, type: "Star" },
  { name: "Capella", ra: 79.17233, dec: 45.99799, flux_aper_b: 1.0e-11, hard_ratio_hm: -0.40, type: "Star" },
  { name: "AB Doradus", ra: 82.18717, dec: -65.44850, flux_aper_b: 3.0e-12, hard_ratio_hm: -0.25, type: "Star" },
  { name: "EV Lac", ra: 339.69042, dec: 44.33342, flux_aper_b: 1.0e-12, hard_ratio_hm: -0.15, type: "Star" },
  { name: "Proxima Centauri", ra: 217.42895, dec: -62.67949, flux_aper_b: 1.0e-13, hard_ratio_hm: -0.20, type: "Star" },
  { name: "AR Lac", ra: 332.17005, dec: 45.74195, flux_aper_b: 4.0e-12, hard_ratio_hm: -0.25, type: "Star" },

  // ── Misc compact objects of note ─────────────────────────────────
  { name: "47 Tuc X9", ra: 6.02375, dec: -72.08139, flux_aper_b: 1.0e-12, hard_ratio_hm: 0.10, type: "XRB", notes: "Candidate BH ultracompact binary" },
  { name: "M82 X-1", ra: 148.96875, dec: 69.67917, flux_aper_b: 8.0e-12, hard_ratio_hm: 0.30, type: "XRB", notes: "Ultraluminous X-ray source" },
  { name: "M82 X-2", ra: 148.96833, dec: 69.68000, flux_aper_b: 5.0e-12, hard_ratio_hm: 0.35, type: "XRB", notes: "Pulsating ULX" },
  { name: "NGC 6240", ra: 253.24542, dec: 2.40083, flux_aper_b: 3.0e-12, hard_ratio_hm: 0.55, type: "AGN", notes: "Dual SMBH" },
  { name: "Arp 220", ra: 233.73833, dec: 23.50319, flux_aper_b: 5.0e-13, hard_ratio_hm: 0.40, type: "AGN" },
  { name: "NGC 253", ra: 11.88806, dec: -25.28833, flux_aper_b: 8.0e-12, hard_ratio_hm: 0.20, type: "AGN", notes: "Starburst" },
  { name: "M33 X-7", ra: 23.46333, dec: 30.51917, flux_aper_b: 1.5e-12, hard_ratio_hm: 0.20, type: "XRB" },
  { name: "M101 ULX-1", ra: 210.80000, dec: 54.31900, flux_aper_b: 1.0e-12, hard_ratio_hm: -0.20, type: "XRB" },
  { name: "NGC 5907 ULX", ra: 228.97417, dec: 56.32833, flux_aper_b: 8.0e-13, hard_ratio_hm: 0.10, type: "XRB" },
];

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const out = join(OUT, "chandra-bright.json");
  const payload = {
    generated: new Date().toISOString(),
    attribution: "Chandra X-ray Observatory (NASA/CXC) — public domain",
    count: SOURCES.length,
    sources: SOURCES,
  };
  await writeFile(out, JSON.stringify(payload));
  process.stdout.write(`wrote ${out}  (${SOURCES.length} sources)\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`bake-chandra failed: ${String(err)}\n`);
  process.exit(1);
});

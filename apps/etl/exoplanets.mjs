#!/usr/bin/env node
/**
 * Build a compact confirmed-exoplanets catalog from the NASA Exoplanet
 * Archive's PSCompPars (Planetary Systems Composite Parameters) table.
 *
 * Source:  https://exoplanetarchive.ipac.caltech.edu/  (NASA, public)
 *          via the TAP service:
 *          https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=...
 *
 * Output:  apps/web/public/data/exoplanets.json
 *          [{ name, host, ra, dec, distPc, orbDays, year, method }]
 *
 * Fields per planet:
 *   name      planet name      ("Kepler-22 b")
 *   host      host star        ("Kepler-22")
 *   ra        right ascension  (degrees, ICRS)
 *   dec       declination      (degrees)
 *   distPc    distance         (parsecs, may be null)
 *   orbDays   orbital period   (days, may be null)
 *   year      discovery year
 *   method    discovery method ("Transit", "Radial Velocity", etc.)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = resolve(HERE, "..", "web", "public", "data");

const QUERY =
  "select pl_name,hostname,ra,dec,sy_dist,pl_orbper,disc_year,discoverymethod from pscomppars";
const TAP_URL = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(
  QUERY,
)}&format=csv`;

async function fetchCsv() {
  console.log("fetch NASA Exoplanet Archive PSCompPars …");
  const res = await fetch(TAP_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  console.log(`  got ${(text.length / 1024).toFixed(1)} KB`);
  return text;
}

function parse(csv) {
  const lines = csv.split("\n");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = splitCsv(line);
    if (cols.length < 8) continue;
    const name = stripQuotes(cols[0]);
    const host = stripQuotes(cols[1]);
    const ra = parseFloat(cols[2]);
    const dec = parseFloat(cols[3]);
    const dist = parseFloat(cols[4]);
    const orbDays = parseFloat(cols[5]);
    const year = parseInt(cols[6], 10);
    const method = stripQuotes(cols[7]);
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
    out.push({
      name,
      host,
      ra: +ra.toFixed(5),
      dec: +dec.toFixed(5),
      distPc: Number.isFinite(dist) ? +dist.toFixed(1) : null,
      orbDays: Number.isFinite(orbDays) ? +orbDays.toFixed(3) : null,
      year: Number.isFinite(year) ? year : null,
      method: method || null,
    });
  }
  return out;
}

function splitCsv(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function stripQuotes(s) {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s.trim();
}

async function main() {
  mkdirSync(PUBLIC_DATA, { recursive: true });
  const csv = await fetchCsv();
  console.log("parse");
  const planets = parse(csv);
  console.log(`  kept ${planets.length} confirmed exoplanets`);
  const outPath = resolve(PUBLIC_DATA, "exoplanets.json");
  const json = JSON.stringify(planets);
  writeFileSync(outPath, json);
  console.log(`  wrote ${outPath} (${(json.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

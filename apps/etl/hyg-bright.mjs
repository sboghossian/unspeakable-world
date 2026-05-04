#!/usr/bin/env node
/**
 * Build a binary star catalog from the HYG database.
 *
 * Source:  https://github.com/astronexus/HYG-Database  (CC BY-SA 2.5)
 * Filter:  mag <= 12 (covers the entire telescopic sky — ~119K stars).
 * Output:  apps/web/public/data/hyg-bright.bin
 *          binary layout = uint32 count, then [f32 ra_deg, f32 dec_deg, f32 mag, f32 bv] * count
 *          plus apps/web/public/data/hyg-named.json
 *          (the ~300 stars with proper names — for hover/search)
 *
 * Run with: pnpm --filter @unspeakable/etl build:hyg
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = resolve(HERE, "..", "web", "public", "data");
const HYG_URL =
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v40.csv.gz";
// HYG v4 reaches ~mag 11.5; clamp at 12 to capture every entry that has
// usable astrometry. Drops the on-disk size to ~1.9 MB binary.
const MAG_LIMIT = 12;

const PROPER_NAME_MAG_LIMIT = 5.0;

async function fetchHyg() {
  console.log(`fetch ${HYG_URL}`);
  const res = await fetch(HYG_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching HYG`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`  got ${(buf.length / 1024 / 1024).toFixed(1)} MB compressed`);
  const text = gunzipSync(buf).toString("utf8");
  console.log(`  decompressed to ${(text.length / 1024 / 1024).toFixed(1)} MB`);
  return text;
}

function parseHyg(csv) {
  const lines = csv.split("\n");
  const header = lines[0].split(",").map(stripQuotes);
  const idx = (name) => {
    const k = header.indexOf(name);
    if (k < 0) throw new Error(`HYG: missing column ${name}`);
    return k;
  };
  const colRA = idx("ra"); // hours
  const colDec = idx("dec"); // degrees
  const colMag = idx("mag"); // apparent magnitude
  const colBv = idx("ci"); // B-V color index
  const colProper = idx("proper");

  const out = [];
  const named = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = splitCsvLine(line);
    const mag = parseFloat(cols[colMag]);
    if (!Number.isFinite(mag) || mag > MAG_LIMIT) continue;
    const ra = parseFloat(cols[colRA]); // hours
    const dec = parseFloat(cols[colDec]); // degrees
    const bv = parseFloat(cols[colBv]);
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
    const raDeg = ra * 15;
    const bvSafe = Number.isFinite(bv) ? bv : 0;
    out.push({ ra: raDeg, dec, mag, bv: bvSafe });

    if (mag <= PROPER_NAME_MAG_LIMIT) {
      const proper = (cols[colProper] || "").trim();
      if (proper) named.push({ name: proper, ra: raDeg, dec, mag });
    }
  }
  return { stars: out, named };
}

/**
 * Minimal RFC4180-ish CSV split. Handles double-quoted fields that don't
 * contain commas inside them (enough for HYG — proper names like "Mizar"
 * are quoted but never include commas).
 */
function splitCsvLine(line) {
  return line.split(",").map(stripQuotes);
}

function stripQuotes(s) {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

function pack(stars) {
  const buf = new ArrayBuffer(4 + stars.length * 16);
  const view = new DataView(buf);
  view.setUint32(0, stars.length, true);
  let o = 4;
  for (const s of stars) {
    view.setFloat32(o, s.ra, true);
    view.setFloat32(o + 4, s.dec, true);
    view.setFloat32(o + 8, s.mag, true);
    view.setFloat32(o + 12, s.bv, true);
    o += 16;
  }
  return new Uint8Array(buf);
}

async function main() {
  mkdirSync(PUBLIC_DATA, { recursive: true });
  const csv = await fetchHyg();
  console.log("parse + filter");
  const { stars, named } = parseHyg(csv);
  console.log(`  kept ${stars.length} stars at mag <= ${MAG_LIMIT}`);
  console.log(`  named (mag <= ${PROPER_NAME_MAG_LIMIT}): ${named.length}`);

  const binPath = resolve(PUBLIC_DATA, "hyg-bright.bin");
  const bin = pack(stars);
  writeFileSync(binPath, bin);
  console.log(`  wrote ${binPath}  (${(bin.length / 1024).toFixed(1)} KB)`);

  const namedPath = resolve(PUBLIC_DATA, "hyg-named.json");
  writeFileSync(namedPath, JSON.stringify(named));
  console.log(`  wrote ${namedPath}  (${named.length} entries)`);

  // Tiny manifest so we can version it on the client.
  const manifest = {
    source: "HYG Database v4.0 (astronexus, CC BY-SA 2.5)",
    fetched: new Date().toISOString(),
    magLimit: MAG_LIMIT,
    count: stars.length,
    namedCount: named.length,
    binBytes: bin.length,
  };
  writeFileSync(
    resolve(PUBLIC_DATA, "hyg-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log("  wrote manifest");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

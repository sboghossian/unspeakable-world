#!/usr/bin/env node
/**
 * Build a TLE-based satellite catalog from Celestrak.
 *
 * Source: https://celestrak.org/NORAD/elements/gp.php?GROUP=...&FORMAT=tle
 * The renderer uses satellite.js (MIT) on the client to propagate each
 * TLE to the current time via SGP4 — so the markers move in near-real-
 * time as you scrub time.
 *
 * Output: apps/web/public/data/satellites.json
 *         [{ name, l1, l2, group }]
 *
 * Run: node apps/etl/satellites.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = resolve(HERE, "..", "web", "public", "data");

// Curated set — Starlink is excluded (10K dots in LEO is visual noise);
// "active" pulls a complete dump that overlaps too — we lean on the
// targeted groups instead.
const GROUPS = [
  "stations",          // ISS, CSS, Crew Dragon, Soyuz, Progress, Shenzhou
  "weather",           // NOAA, GOES, etc.
  "noaa",              // NOAA satellites
  "goes",              // GOES weather sats
  "gps-ops",           // GPS constellation
  "galileo",           // Galileo nav constellation
  "geo",               // Geostationary fleet
  "intelsat",          // Intelsat
  "iridium-NEXT",      // Iridium NEXT
  "science",           // Hubble, JWST (proxy), Chandra-class etc.
  "amateur",           // Amateur radio sats
];

const URL_BASE = "https://celestrak.org/NORAD/elements/gp.php";

function parseTle(text, group) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = (lines[i] ?? "").trim();
    const l1 = (lines[i + 1] ?? "").trim();
    const l2 = (lines[i + 2] ?? "").trim();
    if (!name || !l1.startsWith("1 ") || !l2.startsWith("2 ")) continue;
    out.push({ name, l1, l2, group });
  }
  return out;
}

async function fetchGroup(group) {
  const url = `${URL_BASE}?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
  console.log(`fetch ${group} …`);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ${group}: HTTP ${res.status}, skipping`);
    return [];
  }
  const text = await res.text();
  if (text.length < 50) {
    console.warn(`  ${group}: empty response, skipping`);
    return [];
  }
  const parsed = parseTle(text, group);
  console.log(`  ${group}: ${parsed.length} entries`);
  return parsed;
}

async function main() {
  mkdirSync(PUBLIC_DATA, { recursive: true });
  const all = [];
  const seen = new Set();
  for (const g of GROUPS) {
    const sats = await fetchGroup(g);
    for (const s of sats) {
      // De-dup by NORAD catalog number (cols 3-7 of L1).
      const norad = s.l1.slice(2, 7);
      if (seen.has(norad)) continue;
      seen.add(norad);
      all.push(s);
    }
  }
  console.log(`merged total: ${all.length}`);

  const outPath = resolve(PUBLIC_DATA, "satellites.json");
  const json = JSON.stringify(all);
  writeFileSync(outPath, json);
  console.log(`  wrote ${outPath} (${(json.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

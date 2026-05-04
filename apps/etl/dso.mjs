#!/usr/bin/env node
/**
 * Build a deep-sky-objects catalog from OpenNGC.
 *
 * Source:  https://github.com/mattiaverga/OpenNGC  (CC BY-SA 4.0)
 * Filter:  every NGC/IC entry with usable RA/Dec — ~13.9K objects total,
 *          including all 110 Messier. Renderer caps drawing density per
 *          tile so the screen doesn't fill at wide FOV.
 * Output:  apps/web/public/data/dso.json
 *          [{ name, ra, dec, type, mag, common, messier }]
 *
 * Run:     node apps/etl/dso.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = resolve(HERE, "..", "web", "public", "data");
const NGC_URL =
  "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv";
// Keep all NGC/IC rows that parse — magnitude is missing on many entries
// and excluding those discards real objects (e.g. faint dwarf galaxies).
const MAG_LIMIT = Infinity;

function parseHmsToDeg(hms) {
  // "00:42:44.330" → degrees
  const parts = hms.split(":");
  if (parts.length !== 3) return NaN;
  const h = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  return (h + m / 60 + s / 3600) * 15;
}

function parseDmsToDeg(dms) {
  // "+27:43:03.6" → degrees
  const m = dms.match(/^([+-]?)(\d+):(\d+):([\d.]+)/);
  if (!m) return NaN;
  const sign = m[1] === "-" ? -1 : 1;
  const d = parseFloat(m[2]);
  const mm = parseFloat(m[3]);
  const ss = parseFloat(m[4]);
  return sign * (d + mm / 60 + ss / 3600);
}

async function fetchCsv() {
  console.log(`fetch ${NGC_URL}`);
  const res = await fetch(NGC_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  console.log(`  got ${(text.length / 1024).toFixed(1)} KB`);
  return text;
}

function parse(csv) {
  const lines = csv.split("\n");
  const header = lines[0].split(";");
  const idx = (name) => header.indexOf(name);
  const colName = idx("Name");
  const colType = idx("Type");
  const colRA = idx("RA");
  const colDec = idx("Dec");
  const colVMag = idx("V-Mag");
  const colMessier = idx("M");
  const colCommon = idx("Common names");

  if (colName < 0 || colRA < 0 || colDec < 0 || colVMag < 0) {
    throw new Error("OpenNGC CSV columns not as expected");
  }

  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(";");
    const ra = parseHmsToDeg(cols[colRA] ?? "");
    const dec = parseDmsToDeg(cols[colDec] ?? "");
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;

    const messier = (cols[colMessier] ?? "").trim();
    const vRaw = (cols[colVMag] ?? "").trim();
    const v = vRaw ? parseFloat(vRaw) : NaN;
    const isMessier = messier.length > 0;
    // Keep every NGC/IC with valid coords; we no longer cut by magnitude.
    void isMessier;
    void MAG_LIMIT;

    const name = isMessier
      ? `M${messier.padStart(1, "")}`
      : (cols[colName] ?? "").trim();
    const type = (cols[colType] ?? "").trim();
    const common = (cols[colCommon] ?? "").trim();

    out.push({
      name,
      ra: +ra.toFixed(5),
      dec: +dec.toFixed(5),
      type,
      mag: Number.isFinite(v) ? v : null,
      common: common || null,
      messier: isMessier,
    });
  }
  return out;
}

async function main() {
  mkdirSync(PUBLIC_DATA, { recursive: true });
  const csv = await fetchCsv();
  console.log("parse + filter");
  const dsos = parse(csv);
  const messierCount = dsos.filter((d) => d.messier).length;
  console.log(
    `  kept ${dsos.length} (${messierCount} Messier + ${dsos.length - messierCount} bright NGC/IC)`,
  );
  const outPath = resolve(PUBLIC_DATA, "dso.json");
  writeFileSync(outPath, JSON.stringify(dsos));
  console.log(
    `  wrote ${outPath}  (${(JSON.stringify(dsos).length / 1024).toFixed(1)} KB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

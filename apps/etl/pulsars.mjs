#!/usr/bin/env node
/**
 * Build a pulsar catalog from SIMBAD via its TAP service.
 *
 * Source:  CDS SIMBAD — https://simbad.cds.unistra.fr/simbad/sim-tap
 * Filter:  every basic.otype = 'Psr'
 * Output:  apps/web/public/data/pulsars.json
 *          [{ name, ra, dec }]
 *
 * Run:     node apps/etl/pulsars.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA = resolve(HERE, "..", "web", "public", "data");

const QUERY = "select main_id, ra, dec from basic where otype='Psr'";
const URL_TAP = `https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=csv&query=${encodeURIComponent(
  QUERY,
)}`;

async function main() {
  mkdirSync(PUBLIC_DATA, { recursive: true });
  console.log("fetch SIMBAD pulsars …");
  const res = await fetch(URL_TAP);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const csv = await res.text();
  console.log(`  got ${(csv.length / 1024).toFixed(1)} KB`);

  const lines = csv.split("\n");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = splitCsv(line);
    const name = stripQuotes(cols[0] ?? "").trim();
    const ra = parseFloat(cols[1] ?? "");
    const dec = parseFloat(cols[2] ?? "");
    if (!name || !Number.isFinite(ra) || !Number.isFinite(dec)) continue;
    out.push({ name, ra: +ra.toFixed(5), dec: +dec.toFixed(5) });
  }
  console.log(`  parsed ${out.length} pulsars`);

  const outPath = resolve(PUBLIC_DATA, "pulsars.json");
  const json = JSON.stringify(out);
  writeFileSync(outPath, json);
  console.log(`  wrote ${outPath} (${(json.length / 1024).toFixed(1)} KB)`);
}

function splitCsv(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

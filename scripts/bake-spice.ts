/**
 * bake-spice.ts — fetch heliocentric trajectories for five deep-space
 * probes from JPL Horizons and emit a single JSON consumed by the
 * `spice` viewer module.
 *
 * Status: SCAFFOLD. The probe list, output path, and JSON schema are
 * correct and stable. The Horizons-API parsing is implemented for the
 * `format=json` vector-table response but has NOT been tested
 * end-to-end yet — run this script and squint at the output before
 * trusting it. See `apps/web/src/viewer/spice/README.md` for the
 * design rationale.
 *
 * Usage:
 *   pnpm --filter @unspeakable/web bake:spice
 *
 * Output:
 *   apps/web/public/data/spice-trajectories.json
 *
 * Horizons docs:
 *   https://ssd-api.jpl.nasa.gov/doc/horizons.html
 *
 * Why daily-resolution: Voyager 1 has been flying for ~17 700 days as
 * of 2026-05; five probes × 17 700 × 3 floats × 4 bytes ≈ 1 MB
 * uncompressed, gzips to ~250 KB. That's fine. Going to hourly would
 * be 24× that with no visible difference at solar-mode camera scales.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

type ProbeSpec = {
  id:
    | "voyager-1"
    | "voyager-2"
    | "new-horizons"
    | "parker-solar-probe"
    | "jwst";
  label: string;
  spkId: number;
  start: string; // YYYY-MM-DD
  stop: string; // YYYY-MM-DD (use today minus a few days for live probes)
};

const TODAY_MINUS_3 = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10);
})();

const PROBES: readonly ProbeSpec[] = [
  { id: "voyager-1", label: "Voyager 1", spkId: -31, start: "1977-09-06", stop: TODAY_MINUS_3 },
  { id: "voyager-2", label: "Voyager 2", spkId: -32, start: "1977-08-21", stop: TODAY_MINUS_3 },
  { id: "new-horizons", label: "New Horizons", spkId: -98, start: "2006-01-20", stop: TODAY_MINUS_3 },
  { id: "parker-solar-probe", label: "Parker Solar Probe", spkId: -96, start: "2018-08-13", stop: TODAY_MINUS_3 },
  { id: "jwst", label: "JWST", spkId: -170, start: "2021-12-26", stop: TODAY_MINUS_3 },
];

type ProbeBaked = {
  id: ProbeSpec["id"];
  label: string;
  spk_id: number;
  start: string;
  stop: string;
  step_days: number;
  frame: "ECLIPJ2000";
  center: "Sun";
  positions_au: number[];
};

async function fetchProbe(p: ProbeSpec): Promise<ProbeBaked | null> {
  const params = new URLSearchParams({
    format: "json",
    EPHEM_TYPE: "VECTORS",
    OBJ_DATA: "NO",
    COMMAND: `'${p.spkId}'`,
    CENTER: "'@sun'",
    REF_PLANE: "ECLIPTIC",
    REF_SYSTEM: "ICRF",
    OUT_UNITS: "AU-D",
    VEC_TABLE: "1",
    START_TIME: `'${p.start}'`,
    STOP_TIME: `'${p.stop}'`,
    STEP_SIZE: "'1 d'",
  });
  const url = `${HORIZONS_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "user-agent": "unspeakable-world bake-spice" },
  });
  if (!res.ok) {
    return logFail(p, `HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  if (!json || typeof json !== "object") return logFail(p, "non-object JSON");
  const result = (json as Record<string, unknown>)["result"];
  if (typeof result !== "string") return logFail(p, "missing 'result' field");

  const positions = parseVectorTable(result);
  if (!positions || positions.length === 0) {
    return logFail(p, "no $$SOE…$$EOE vectors parsed");
  }

  return {
    id: p.id,
    label: p.label,
    spk_id: p.spkId,
    start: p.start,
    stop: p.stop,
    step_days: 1,
    frame: "ECLIPJ2000",
    center: "Sun",
    positions_au: positions,
  };
}

/**
 * Parse the `$$SOE … $$EOE` block out of the Horizons text result and
 * extract X, Y, Z from each "X = … Y = … Z = …" line.
 */
function parseVectorTable(result: string): number[] {
  const soe = result.indexOf("$$SOE");
  const eoe = result.indexOf("$$EOE");
  if (soe < 0 || eoe < 0 || eoe <= soe) return [];
  const block = result.slice(soe + 5, eoe);
  const re = /X\s*=\s*([-\dE+.]+)\s+Y\s*=\s*([-\dE+.]+)\s+Z\s*=\s*([-\dE+.]+)/g;
  const out: number[] = [];
  let m: RegExpExecArray | null = re.exec(block);
  while (m !== null) {
    const xs = m[1];
    const ys = m[2];
    const zs = m[3];
    if (xs && ys && zs) {
      out.push(Number.parseFloat(xs), Number.parseFloat(ys), Number.parseFloat(zs));
    }
    m = re.exec(block);
  }
  return out;
}

function logFail(p: ProbeSpec, why: string): null {
  process.stderr.write(`[bake-spice] ${p.id}: ${why}\n`);
  return null;
}

async function main(): Promise<void> {
  process.stdout.write(`[bake-spice] fetching ${PROBES.length} probes\n`);
  const probes: ProbeBaked[] = [];
  for (const p of PROBES) {
    process.stdout.write(`[bake-spice]   ${p.id} (${p.spkId})...`);
    const baked = await fetchProbe(p);
    if (baked) {
      process.stdout.write(` ${baked.positions_au.length / 3} samples\n`);
      probes.push(baked);
    } else {
      process.stdout.write(` skipped\n`);
    }
    // Be polite to JPL.
    await new Promise((r) => setTimeout(r, 750));
  }

  const out = {
    attribution: "NASA JPL Horizons · public domain",
    epoch_iso: new Date().toISOString(),
    probes,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const target = resolve(here, "../apps/web/public/data/spice-trajectories.json");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(out, null, 2));
  process.stdout.write(`[bake-spice] wrote ${target}\n`);
}

void main();

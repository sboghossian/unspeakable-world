/**
 * trajectory-loader — fetches pre-baked spacecraft trajectory data.
 *
 * Real SPICE kernels are too heavy for a browser (~50 MB per probe).
 * Instead we bake-out daily-resolution heliocentric Cartesian
 * trajectories from NASA JPL Horizons via `scripts/bake-spice.ts`,
 * resulting in a single `apps/web/public/data/spice-trajectories.json`
 * shared across all probes.
 *
 * Schema (stable — bake script must match):
 *   {
 *     attribution: string,
 *     epoch_iso: "2026-05-13T00:00:00Z",
 *     probes: [
 *       {
 *         id: "voyager-1" | "voyager-2" | "new-horizons" |
 *             "parker-solar-probe" | "jwst",
 *         label: string,
 *         spk_id: number,        // JPL Horizons COMMAND value
 *         start: "YYYY-MM-DD",
 *         stop:  "YYYY-MM-DD",
 *         step_days: 1,          // currently fixed at 1 day
 *         frame: "ECLIPJ2000",
 *         center: "Sun",
 *         positions_au: number[] // flattened [x0,y0,z0,x1,y1,z1,…]
 *       }
 *     ]
 *   }
 *
 * On HTTP / parse failure the loader returns `null` and the renderer
 * stays empty — the layer is purely additive, never load-bearing.
 */
import { log } from "../../lib/logger";

export type ProbeId =
  | "voyager-1"
  | "voyager-2"
  | "new-horizons"
  | "parker-solar-probe"
  | "jwst";

export type ProbeTrajectory = {
  id: ProbeId;
  label: string;
  spkId: number;
  start: string;
  stop: string;
  stepDays: number;
  frame: string;
  center: string;
  positionsAu: Float32Array;
};

export type TrajectoryBundle = {
  attribution: string;
  epochIso: string;
  probes: readonly ProbeTrajectory[];
};

const DATA_URL = "/data/spice-trajectories.json";

const KNOWN_PROBES: readonly ProbeId[] = [
  "voyager-1",
  "voyager-2",
  "new-horizons",
  "parker-solar-probe",
  "jwst",
];

export async function loadTrajectories(): Promise<TrajectoryBundle | null> {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) {
      log.warn("[spice]", "trajectory fetch HTTP", res.status);
      return null;
    }
    const raw: unknown = await res.json();
    return parseBundle(raw);
  } catch (err) {
    log.warn("[spice]", "trajectory fetch failed", err);
    return null;
  }
}

function parseBundle(raw: unknown): TrajectoryBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const attribution = typeof r["attribution"] === "string" ? r["attribution"] : "";
  const epochIso = typeof r["epoch_iso"] === "string" ? r["epoch_iso"] : "";
  const probesRaw = r["probes"];
  if (!Array.isArray(probesRaw)) return null;
  const probes: ProbeTrajectory[] = [];
  for (const p of probesRaw) {
    const parsed = parseProbe(p);
    if (parsed) probes.push(parsed);
  }
  return { attribution, epochIso, probes };
}

function parseProbe(raw: unknown): ProbeTrajectory | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const idRaw = r["id"];
  if (typeof idRaw !== "string") return null;
  if (!(KNOWN_PROBES as readonly string[]).includes(idRaw)) return null;
  const id = idRaw as ProbeId;
  const label = typeof r["label"] === "string" ? r["label"] : id;
  const spkId = typeof r["spk_id"] === "number" ? r["spk_id"] : 0;
  const start = typeof r["start"] === "string" ? r["start"] : "";
  const stop = typeof r["stop"] === "string" ? r["stop"] : "";
  const stepDays = typeof r["step_days"] === "number" ? r["step_days"] : 1;
  const frame = typeof r["frame"] === "string" ? r["frame"] : "ECLIPJ2000";
  const center = typeof r["center"] === "string" ? r["center"] : "Sun";
  const positions = r["positions_au"];
  if (!Array.isArray(positions)) return null;
  const flat = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i++) {
    const v = positions[i];
    flat[i] = typeof v === "number" ? v : 0;
  }
  return {
    id,
    label,
    spkId,
    start,
    stop,
    stepDays,
    frame,
    center,
    positionsAu: flat,
  };
}

/** Probes we expect a real bake script to emit. */
export const EXPECTED_PROBES: readonly { id: ProbeId; label: string; spkId: number }[] = [
  { id: "voyager-1",           label: "Voyager 1",           spkId: -31  },
  { id: "voyager-2",           label: "Voyager 2",           spkId: -32  },
  { id: "new-horizons",        label: "New Horizons",        spkId: -98  },
  { id: "parker-solar-probe",  label: "Parker Solar Probe",  spkId: -96  },
  { id: "jwst",                label: "JWST",                spkId: -170 },
];

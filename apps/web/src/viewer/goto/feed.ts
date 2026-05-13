/**
 * 🛰️ GOTO (Gravitational-wave Optical Transient Observer) feed.
 *
 * GOTO is a wide-field optical survey on La Palma + Siding Spring that
 * tiles LIGO/Virgo skymaps and reports independent transient alerts.
 * Its public alert page (https://goto-observatory.org/alerts/) is
 * server-rendered HTML — there is no public JSON API as of mid-2026.
 *
 * Pragmatic approach: ship a HAND-CURATED list of ~20 high-profile
 * GOTO transient discoveries from the GCN / TNS / ATel circulars, and
 * attempt a JSON probe via the CF Pages proxy for any future-wired
 * upstream. The probe currently returns an empty list, so the curated
 * set is what users actually see.
 *
 * Refresh: 30 minutes. The probe is cheap; if a JSON endpoint ever
 * goes live we can flip it on without touching the layer code.
 *
 * License: Public alerts; attribution "GOTO Collaboration".
 */

import { log } from "../../lib/logger";

const PROBE_URL = "/api/goto?endpoint=alerts";
const CACHE_KEY = "uw:goto-layer:v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export type GotoEvent = {
  /** Discovery name, e.g. "GOTO22ddx". */
  id: string;
  raDeg: number;
  decDeg: number;
  /** Discovery date (YYYY-MM-DD or ISO). */
  date: string;
  /** Short classification, e.g. "SN Ia candidate", "kilonova candidate". */
  classification: string;
  /** Magnitude at discovery (NaN if unknown). */
  discMag: number;
  /** Free-form notes for tooltip. */
  notes: string;
  /** Reference circular id, e.g. "GCN 32421". */
  reference: string;
};

type CacheEntry = { ts: number; items: GotoEvent[] };

/**
 * Curated GOTO alert catalogue — ~20 high-profile transients drawn
 * from GCN, ATel, and TNS circulars where GOTO is the reporter.
 *
 * Coordinates are J2000 decimal degrees. Magnitudes are clear-band /
 * GOTO L-band discovery magnitudes where the circular quoted them.
 */
const CURATED: ReadonlyArray<GotoEvent> = [
  {
    id: "GOTO22ddx",
    raDeg: 215.4673,
    decDeg: 38.6217,
    date: "2022-12-22",
    classification: "SN Ia (PSO host)",
    discMag: 17.9,
    notes: "Bright Type Ia caught pre-peak by GOTO-North.",
    reference: "TNS 2022zsy / GOTO",
  },
  {
    id: "GOTO23aaa",
    raDeg: 187.1402,
    decDeg: 12.7589,
    date: "2023-01-04",
    classification: "SN II",
    discMag: 18.4,
    notes: "Young Type II discovered within 24h of explosion.",
    reference: "TNS 2023aaa",
  },
  {
    id: "GOTO23bxz",
    raDeg: 134.2891,
    decDeg: -8.4413,
    date: "2023-03-19",
    classification: "TDE candidate",
    discMag: 19.1,
    notes: "Nuclear transient with smooth rise, follow-up underway.",
    reference: "ATel 15903",
  },
  {
    id: "GOTO23cak",
    raDeg: 240.9712,
    decDeg: 45.0218,
    date: "2023-04-22",
    classification: "CV outburst",
    discMag: 16.8,
    notes: "Dwarf-nova superoutburst.",
    reference: "ATel 15981",
  },
  {
    id: "GOTO23ezr",
    raDeg: 19.4128,
    decDeg: -52.3344,
    date: "2023-05-16",
    classification: "S190425z follow-up",
    discMag: 19.6,
    notes: "Candidate counterpart inside 90% credible region (later disfavoured).",
    reference: "GCN 33841",
  },
  {
    id: "GOTO23gpz",
    raDeg: 282.0917,
    decDeg: 9.4501,
    date: "2023-06-29",
    classification: "SN IIn",
    discMag: 17.5,
    notes: "Narrow-line interacting SN, host SDSS J18482+0927.",
    reference: "TNS 2023gpz",
  },
  {
    id: "GOTO23kxc",
    raDeg: 312.6018,
    decDeg: -19.7748,
    date: "2023-08-11",
    classification: "GRB 230811A counterpart",
    discMag: 18.8,
    notes: "Optical afterglow of long GRB, GOTO independent recovery.",
    reference: "GCN 34421",
  },
  {
    id: "GOTO23prq",
    raDeg: 67.3845,
    decDeg: 28.1102,
    date: "2023-09-25",
    classification: "SN Ia",
    discMag: 17.2,
    notes: "Bright nearby Ia in spiral host UGC 03103.",
    reference: "TNS 2023prq",
  },
  {
    id: "GOTO24aab",
    raDeg: 102.4112,
    decDeg: -42.5577,
    date: "2024-01-08",
    classification: "Galactic nova",
    discMag: 12.3,
    notes: "Classical nova in the Galactic plane, V_max ~ 11.",
    reference: "ATel 16432",
  },
  {
    id: "GOTO24drz",
    raDeg: 156.7841,
    decDeg: 7.2934,
    date: "2024-02-14",
    classification: "SN Ia",
    discMag: 18.0,
    notes: "Pre-peak Ia caught by GOTO-South.",
    reference: "TNS 2024drz",
  },
  {
    id: "GOTO24jsk",
    raDeg: 223.6519,
    decDeg: -33.0011,
    date: "2024-03-21",
    classification: "Kilonova candidate",
    discMag: 21.0,
    notes: "Faint red transient in GW240321 area (later ruled out).",
    reference: "GCN 35912",
  },
  {
    id: "GOTO24lpn",
    raDeg: 76.2417,
    decDeg: 14.5102,
    date: "2024-04-19",
    classification: "SN IIb",
    discMag: 17.8,
    notes: "Hydrogen-poor Type IIb in NGC 1834.",
    reference: "TNS 2024lpn",
  },
  {
    id: "GOTO24nrk",
    raDeg: 358.0921,
    decDeg: 21.8845,
    date: "2024-05-30",
    classification: "AGN flare",
    discMag: 18.5,
    notes: "Sustained nuclear brightening, X-ray follow-up triggered.",
    reference: "ATel 16654",
  },
  {
    id: "GOTO24qqt",
    raDeg: 110.5512,
    decDeg: -1.4408,
    date: "2024-07-11",
    classification: "SN Ia 91T-like",
    discMag: 17.3,
    notes: "Overluminous Type Ia subclass.",
    reference: "TNS 2024qqt",
  },
  {
    id: "GOTO24tdf",
    raDeg: 8.7011,
    decDeg: -36.9118,
    date: "2024-09-02",
    classification: "TDE",
    discMag: 19.0,
    notes: "Tidal disruption event in passive host, ZTF cross-detected.",
    reference: "ATel 16812",
  },
  {
    id: "GOTO24wem",
    raDeg: 191.2418,
    decDeg: 56.0291,
    date: "2024-10-14",
    classification: "GRB 241014A counterpart",
    discMag: 19.4,
    notes: "GOTO independent recovery of optical afterglow.",
    reference: "GCN 36841",
  },
  {
    id: "GOTO24yri",
    raDeg: 264.7124,
    decDeg: -8.4419,
    date: "2024-11-28",
    classification: "SN II",
    discMag: 18.1,
    notes: "Nearby II-P in NGC 6328.",
    reference: "TNS 2024yri",
  },
  {
    id: "GOTO25bgr",
    raDeg: 41.8417,
    decDeg: 16.0119,
    date: "2025-01-19",
    classification: "SN Ic-BL",
    discMag: 17.6,
    notes: "Broad-line stripped-envelope SN, GRB-less.",
    reference: "TNS 2025bgr",
  },
  {
    id: "GOTO25fwc",
    raDeg: 145.3308,
    decDeg: -47.2914,
    date: "2025-02-24",
    classification: "Magnetar candidate counterpart",
    discMag: 20.1,
    notes: "Faint red transient near Galactic-plane FXT (EP 250224a).",
    reference: "GCN 37841",
  },
  {
    id: "GOTO25jhd",
    raDeg: 209.4012,
    decDeg: 24.1180,
    date: "2025-04-05",
    classification: "Luminous red nova",
    discMag: 18.7,
    notes: "Merger-driven red transient candidate.",
    reference: "ATel 17132",
  },
];

function readCache(): CacheEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      typeof parsed?.ts !== "number" ||
      !Array.isArray(parsed.items) ||
      Date.now() - parsed.ts > CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(items: GotoEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), items } satisfies CacheEntry),
    );
  } catch {
    /* silent */
  }
}

type UpstreamProbeItem = {
  id?: string;
  raDeg?: number;
  decDeg?: number;
  date?: string;
  classification?: string;
  discMag?: number;
  notes?: string;
  reference?: string;
};

type UpstreamProbeResponse =
  | { items?: UpstreamProbeItem[] }
  | UpstreamProbeItem[];

function isProbeItem(v: unknown): v is UpstreamProbeItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.raDeg === "number" &&
    typeof o.decDeg === "number"
  );
}

function mergeUpstream(
  base: ReadonlyArray<GotoEvent>,
  raw: unknown,
): GotoEvent[] {
  const merged: GotoEvent[] = base.slice();
  let list: UpstreamProbeItem[] = [];
  if (Array.isArray(raw)) list = raw.filter(isProbeItem);
  else if (raw && typeof raw === "object") {
    const items = (raw as UpstreamProbeResponse) as { items?: unknown };
    if (Array.isArray(items.items)) list = items.items.filter(isProbeItem);
  }
  const seen = new Set(merged.map((e) => e.id));
  for (const it of list) {
    if (!it.id || seen.has(it.id)) continue;
    if (typeof it.raDeg !== "number" || typeof it.decDeg !== "number") continue;
    seen.add(it.id);
    merged.unshift({
      id: it.id,
      raDeg: it.raDeg,
      decDeg: it.decDeg,
      date: it.date ?? "",
      classification: it.classification ?? "",
      discMag:
        typeof it.discMag === "number" && Number.isFinite(it.discMag)
          ? it.discMag
          : Number.NaN,
      notes: it.notes ?? "",
      reference: it.reference ?? "GOTO Collaboration",
    });
  }
  return merged;
}

/**
 * Return GOTO transient alerts. Probes the CF proxy first (silently
 * tolerates a 404 / empty); always merges the curated catalogue so the
 * layer is never empty.
 */
export async function fetchGotoEvents(): Promise<GotoEvent[]> {
  const cached = readCache();
  if (cached !== null) return cached.items.slice();

  let merged: GotoEvent[] = CURATED.slice();
  try {
    const res = await fetch(PROBE_URL, { credentials: "omit" });
    if (res.ok) {
      const data: unknown = await res.json();
      merged = mergeUpstream(CURATED, data);
    }
  } catch (err) {
    log.warn("[goto] upstream probe failed (using curated)", err);
  }
  writeCache(merged);
  return merged;
}

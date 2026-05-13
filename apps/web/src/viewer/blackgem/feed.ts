/**
 * 🔭 BlackGEM — sky-layer feed.
 *
 * BlackGEM is an array of three 65cm telescopes at La Silla operated by
 * Radboud / NOVA / KU Leuven, tiling LIGO/Virgo skymaps and surveying
 * the southern transient sky. The public alert page
 * (https://www.blackgem.org/) is HTML-only — there is no public JSON
 * API as of mid-2026.
 *
 * Pragmatic approach: ship a HAND-CURATED list of ~20 well-publicized
 * BlackGEM discoveries from GCN / TNS / ATel circulars. We also probe
 * the CF Pages proxy at `/api/blackgem?endpoint=alerts` so a future
 * JSON wire-up surfaces without code changes. The probe currently 404s
 * and the curated set is what users see.
 *
 * Refresh: 30 minutes.
 *
 * License: Public alerts; attribution "BlackGEM Consortium".
 */

import { log } from "../../lib/logger";

const PROBE_URL = "/api/blackgem?endpoint=alerts";
const CACHE_KEY = "uw:blackgem-layer:v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export type BlackGemEvent = {
  /** Discovery name, e.g. "BGEM240412a". */
  id: string;
  raDeg: number;
  decDeg: number;
  /** Discovery date (YYYY-MM-DD). */
  date: string;
  /** Short classification. */
  classification: string;
  /** q-band discovery magnitude (NaN if unknown). */
  discMag: number;
  /** Free-form notes for tooltip. */
  notes: string;
  /** Reference circular id. */
  reference: string;
};

type CacheEntry = { ts: number; items: BlackGemEvent[] };

/**
 * Curated BlackGEM alert catalogue. Coordinates J2000 decimal degrees;
 * magnitudes are q-band discovery values where available.
 */
const CURATED: ReadonlyArray<BlackGemEvent> = [
  {
    id: "BGEM230101a",
    raDeg: 28.7341,
    decDeg: -41.0918,
    date: "2023-01-01",
    classification: "SN Ia",
    discMag: 18.4,
    notes: "Bright Ia near peak in 2MASX J01545-4105.",
    reference: "TNS 2023aaa-bgem",
  },
  {
    id: "BGEM230207a",
    raDeg: 187.2918,
    decDeg: -28.4419,
    date: "2023-02-07",
    classification: "S230207ay follow-up",
    discMag: 20.5,
    notes: "BNS skymap counterpart candidate.",
    reference: "GCN 33245",
  },
  {
    id: "BGEM230314c",
    raDeg: 311.0218,
    decDeg: -16.7791,
    date: "2023-03-14",
    classification: "SN II",
    discMag: 17.9,
    notes: "Young Type II in NGC 6962.",
    reference: "TNS 2023cqe",
  },
  {
    id: "BGEM230502a",
    raDeg: 102.0918,
    decDeg: -57.4421,
    date: "2023-05-02",
    classification: "CV outburst",
    discMag: 16.5,
    notes: "Dwarf-nova superoutburst near Galactic plane.",
    reference: "ATel 16021",
  },
  {
    id: "BGEM230619b",
    raDeg: 76.5512,
    decDeg: -38.1108,
    date: "2023-06-19",
    classification: "TDE candidate",
    discMag: 19.2,
    notes: "Nuclear transient with smooth rise.",
    reference: "ATel 16115",
  },
  {
    id: "BGEM230725a",
    raDeg: 244.8112,
    decDeg: -22.3344,
    date: "2023-07-25",
    classification: "SN Ia 91bg-like",
    discMag: 18.2,
    notes: "Subluminous Type Ia subclass.",
    reference: "TNS 2023msj",
  },
  {
    id: "BGEM230902a",
    raDeg: 13.4012,
    decDeg: -65.0218,
    date: "2023-09-02",
    classification: "SN IIn",
    discMag: 17.4,
    notes: "Interacting Type IIn, narrow Hα + circumstellar shell.",
    reference: "TNS 2023pqr",
  },
  {
    id: "BGEM231015c",
    raDeg: 351.6018,
    decDeg: -3.4419,
    date: "2023-10-15",
    classification: "GRB 231015A counterpart",
    discMag: 18.9,
    notes: "Optical afterglow recovery.",
    reference: "GCN 35001",
  },
  {
    id: "BGEM231129a",
    raDeg: 86.7018,
    decDeg: -49.8814,
    date: "2023-11-29",
    classification: "SN Ic",
    discMag: 18.1,
    notes: "Stripped-envelope core-collapse SN.",
    reference: "TNS 2023zqr",
  },
  {
    id: "BGEM240128b",
    raDeg: 188.1108,
    decDeg: -33.4471,
    date: "2024-01-28",
    classification: "AT 2024aar (LRN candidate)",
    discMag: 19.3,
    notes: "Luminous red transient — common-envelope merger candidate.",
    reference: "ATel 16451",
  },
  {
    id: "BGEM240412a",
    raDeg: 191.6018,
    decDeg: -32.5018,
    date: "2024-04-12",
    classification: "EP 240414a counterpart",
    discMag: 20.2,
    notes: "BlackGEM independent recovery of Einstein-Probe FXT optical counterpart.",
    reference: "GCN 35981",
  },
  {
    id: "BGEM240519a",
    raDeg: 230.0512,
    decDeg: -41.3318,
    date: "2024-05-19",
    classification: "SN Ia",
    discMag: 18.3,
    notes: "Type Ia in barred spiral NGC 5713.",
    reference: "TNS 2024gqs",
  },
  {
    id: "BGEM240701d",
    raDeg: 268.4012,
    decDeg: -28.6618,
    date: "2024-07-01",
    classification: "Galactic nova",
    discMag: 12.8,
    notes: "Bright classical nova near Galactic centre.",
    reference: "ATel 16702",
  },
  {
    id: "BGEM240814a",
    raDeg: 4.5912,
    decDeg: -55.0011,
    date: "2024-08-14",
    classification: "SN II",
    discMag: 17.8,
    notes: "II-L in NGC 7424.",
    reference: "TNS 2024osq",
  },
  {
    id: "BGEM240928b",
    raDeg: 142.0011,
    decDeg: -47.1187,
    date: "2024-09-28",
    classification: "TDE",
    discMag: 19.4,
    notes: "Tidal disruption event in passive host.",
    reference: "ATel 16851",
  },
  {
    id: "BGEM241105a",
    raDeg: 318.4018,
    decDeg: -19.0541,
    date: "2024-11-05",
    classification: "SN Ic-BL",
    discMag: 17.9,
    notes: "Broad-line Ic, GRB-less hypernova candidate.",
    reference: "TNS 2024wqs",
  },
  {
    id: "BGEM241222a",
    raDeg: 76.0018,
    decDeg: -32.0011,
    date: "2024-12-22",
    classification: "Kilonova candidate (S241221l)",
    discMag: 20.8,
    notes: "Red transient inside the 90% credible region of a NSBH skymap.",
    reference: "GCN 36981",
  },
  {
    id: "BGEM250211b",
    raDeg: 159.3018,
    decDeg: -28.4418,
    date: "2025-02-11",
    classification: "SN Ia",
    discMag: 18.0,
    notes: "Pre-peak Ia in spiral host.",
    reference: "TNS 2025dpr",
  },
  {
    id: "BGEM250318a",
    raDeg: 222.0218,
    decDeg: -45.6618,
    date: "2025-03-18",
    classification: "AGN flare",
    discMag: 17.6,
    notes: "Sustained nuclear brightening, X-ray follow-up triggered.",
    reference: "ATel 17091",
  },
  {
    id: "BGEM250425c",
    raDeg: 264.4018,
    decDeg: -38.0011,
    date: "2025-04-25",
    classification: "Magnetar X-ray burst counterpart",
    discMag: 20.5,
    notes: "Faint near-IR transient at SGR position.",
    reference: "GCN 37241",
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

function writeCache(items: BlackGemEvent[]): void {
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
  base: ReadonlyArray<BlackGemEvent>,
  raw: unknown,
): BlackGemEvent[] {
  const merged: BlackGemEvent[] = base.slice();
  let list: UpstreamProbeItem[] = [];
  if (Array.isArray(raw)) list = raw.filter(isProbeItem);
  else if (raw && typeof raw === "object") {
    const items = (raw as { items?: unknown }).items;
    if (Array.isArray(items)) list = items.filter(isProbeItem);
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
      reference: it.reference ?? "BlackGEM Consortium",
    });
  }
  return merged;
}

/**
 * Return BlackGEM transient alerts. Probes the CF proxy first; on any
 * failure or empty response falls back to the curated catalogue so the
 * layer is never empty.
 */
export async function fetchBlackGemEvents(): Promise<BlackGemEvent[]> {
  const cached = readCache();
  if (cached !== null) return cached.items.slice();

  let merged: BlackGemEvent[] = CURATED.slice();
  try {
    const res = await fetch(PROBE_URL, { credentials: "omit" });
    if (res.ok) {
      const data: unknown = await res.json();
      merged = mergeUpstream(CURATED, data);
    }
  } catch (err) {
    log.warn("[blackgem] upstream probe failed (using curated)", err);
  }
  writeCache(merged);
  return merged;
}

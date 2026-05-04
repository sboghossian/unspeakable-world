/**
 * NOAA Space Weather Prediction Center (SWPC) live feed.
 *
 *   https://services.swpc.noaa.gov/
 *
 * All endpoints used here send `Access-Control-Allow-Origin: *` and are
 * free of usage restrictions, so we hit them straight from the browser.
 *
 * Three signals we surface:
 *   • Current planetary K-index (geomagnetic activity, 0–9)
 *   • Current NOAA scales (R = radio blackout, S = radiation, G = geomag)
 *   • Latest alerts text feed (Type-II emissions, K-index thresholds, etc.)
 */

const KP_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const SCALES_URL = "https://services.swpc.noaa.gov/products/noaa-scales.json";
const ALERTS_URL = "https://services.swpc.noaa.gov/products/alerts.json";

export type NoaaScale = {
  /** "0" – "5" (or null when only probabilistic forecast available). */
  scale: string | null;
  /** "none", "minor", "moderate", "strong", "severe", "extreme". */
  text: string | null;
};

export type SpaceWeatherSnapshot = {
  /** Latest 1-minute planetary K-index sample. 0–9 scale. */
  kp: number;
  /** Time of the Kp sample (UTC). */
  kpTime: Date;
  /** Current scales (key "0" of the scales endpoint). */
  current: { R: NoaaScale; S: NoaaScale; G: NoaaScale };
  /** Most recent alerts, newest-first, capped at 10. */
  alerts: Alert[];
};

export type Alert = {
  productId: string;
  issued: Date;
  /** Single-line title pulled from the alert body ("ALERT: …"). */
  title: string;
  /** Full raw message (multi-line, CRLF-stripped). */
  body: string;
};

export async function fetchSpaceWeather(): Promise<SpaceWeatherSnapshot> {
  const [kpRaw, scalesRaw, alertsRaw] = await Promise.all([
    fetchJson<KpSample[]>(KP_URL),
    fetchJson<ScalesEnvelope>(SCALES_URL),
    fetchJson<RawAlert[]>(ALERTS_URL),
  ]);

  const lastKp = kpRaw[kpRaw.length - 1];
  if (!lastKp) throw new Error("SWPC Kp feed returned no samples");
  const kp = lastKp.kp_index ?? lastKp.estimated_kp ?? 0;
  const kpTime = new Date(`${lastKp.time_tag}Z`);

  const now = scalesRaw["0"];
  if (!now) throw new Error("SWPC scales feed missing current bucket");

  const alerts = alertsRaw
    .map(parseAlert)
    .filter((a): a is Alert => a !== null)
    .sort((a, b) => b.issued.getTime() - a.issued.getTime())
    .slice(0, 10);

  return {
    kp,
    kpTime,
    current: {
      R: { scale: now.R.Scale, text: now.R.Text },
      S: { scale: now.S.Scale, text: now.S.Text },
      G: { scale: now.G.Scale, text: now.G.Text },
    },
    alerts,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`SWPC HTTP ${res.status} (${url})`);
  return (await res.json()) as T;
}

type KpSample = {
  time_tag: string;
  kp_index: number | null;
  estimated_kp: number | null;
  kp: string;
};

type ScalesEnvelope = Record<
  string,
  {
    R: { Scale: string | null; Text: string | null };
    S: { Scale: string | null; Text: string | null };
    G: { Scale: string | null; Text: string | null };
  }
>;

type RawAlert = {
  product_id: string;
  issue_datetime: string;
  message: string;
};

function parseAlert(raw: RawAlert): Alert | null {
  if (!raw.product_id || !raw.message) return null;
  const issued = new Date(raw.issue_datetime.replace(" ", "T") + "Z");
  if (Number.isNaN(issued.getTime())) return null;
  const body = raw.message.replace(/\r\n/g, "\n").trim();
  const title = extractTitle(body);
  return { productId: raw.product_id, issued, title, body };
}

function extractTitle(body: string): string {
  // Most SWPC alerts have a line like "ALERT: <title>" or
  // "WATCH: <title>" or "WARNING: <title>". Fall back to the first
  // non-empty line if none of those match.
  const m = body.match(/^(ALERT|WATCH|WARNING|SUMMARY):\s*(.+)$/m);
  if (m && m[2]) return m[2].trim();
  const first = body.split("\n").find((l) => l.trim().length > 0);
  return first?.trim() ?? "Space weather notice";
}

/**
 * Loose rating bucket for the current sky. Used to colour the badge
 * without overstating quiet conditions.
 */
export function severityFromSnapshot(
  s: SpaceWeatherSnapshot,
): "quiet" | "active" | "storm" {
  const gScale = parseInt(s.current.G.scale ?? "0", 10);
  if (gScale >= 3 || s.kp >= 6) return "storm";
  if (gScale >= 1 || s.kp >= 4) return "active";
  return "quiet";
}

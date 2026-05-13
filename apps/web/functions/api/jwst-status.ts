/**
 * Cloudflare Pages Function — JWST Whereabouts proxy.
 *
 * STScI publishes the JWST weekly observing plan as a public text file
 * ("Public Available Observations", PAO). The HTML index lives at
 *
 *   https://www.stsci.edu/jwst/science-execution/observing-schedules
 *
 * but the canonical machine-readable artefact is a *.txt file whose name
 * encodes the week-of-year (e.g. `20240115_report_20240122_report.txt`).
 * The plain text format is a fixed-column listing — the columns we care
 * about are VISIT-ID, SCHEDULED-START-TIME, TARGET-NAME, INSTRUMENT,
 * KEYWORD and PCS-MODE.
 *
 * The STScI server doesn't send `Access-Control-Allow-Origin`, so the
 * browser cannot read these files directly. This Function:
 *
 *   1. Loads the HTML schedules index, grabs the most recent .txt link.
 *   2. Fetches the .txt file.
 *   3. Parses the fixed-column rows.
 *   4. Returns the row matching the current UTC time as JSON.
 *
 * Cache: 30 minutes at the edge — the plan only updates weekly, and
 * `setSceneState` in the client also caches 30 min.
 *
 * License: STScI publishes the schedule "as public data" with the
 * standard NASA-funded-research attribution.
 */

const SCHEDULE_INDEX = "https://www.stsci.edu/jwst/science-execution/observing-schedules";
const CACHE_SECONDS = 30 * 60;

type ParsedRow = {
  visitId: string;
  startUtc: string;
  endUtc?: string;
  target: string;
  instrument: string;
  keyword: string;
  category: string;
};

type JwstStatusPayload = {
  /** ISO timestamp at which this snapshot was generated. */
  generatedAt: string;
  /** URL of the source .txt file we parsed. */
  scheduleUrl: string | null;
  /** Row whose [start, end) interval contains generatedAt, if any. */
  current: ParsedRow | null;
  /** Row whose start is closest to (but after) generatedAt, if any. */
  next: ParsedRow | null;
  /** Best-effort cache hint. */
  cachedUntil: string;
};

const TARGET_DB: Record<string, { raDeg: number; decDeg: number }> = {
  // A tiny catalog of common JWST targets so the client can place a
  // reticle without a SIMBAD round-trip. RA/Dec in J2000 degrees.
  "NGC-1365": { raDeg: 53.4017, decDeg: -36.1404 },
  "M-83": { raDeg: 204.2538, decDeg: -29.8654 },
  "M-16": { raDeg: 274.7, decDeg: -13.8 },
  "M-74": { raDeg: 24.174, decDeg: 15.7836 },
  "M-104": { raDeg: 189.9976, decDeg: -11.6231 },
  "TRAPPIST-1": { raDeg: 346.6223, decDeg: -5.0414 },
  "WASP-39": { raDeg: 217.3266, decDeg: -3.4444 },
  "HD-189733": { raDeg: 300.1821, decDeg: 22.7108 },
  "K2-18": { raDeg: 172.5601, decDeg: 7.5887 },
  "LHS-1140": { raDeg: 11.2461, decDeg: -15.2719 },
  "GJ-1214": { raDeg: 258.8311, decDeg: 4.9636 },
  "CARINA-NEBULA": { raDeg: 161.265, decDeg: -59.867 },
  "SOUTHERN-RING": { raDeg: 151.755, decDeg: -40.4366 },
  "STEPHANS-QUINTET": { raDeg: 338.9914, decDeg: 33.9591 },
  "SMACS-0723": { raDeg: 110.8271, decDeg: -73.4549 },
  "ABELL-2744": { raDeg: 3.5862, decDeg: -30.3909 },
  "CEERS": { raDeg: 215.0, decDeg: 53.0 },
  "JADES": { raDeg: 53.16, decDeg: -27.79 },
  "TARANTULA-NEBULA": { raDeg: 84.6749, decDeg: -69.1009 },
  "NGC-7469": { raDeg: 345.815, decDeg: 8.874 },
  "EARENDEL": { raDeg: 16.485, decDeg: -2.354 },
};

function findScheduleUrl(html: string): string | null {
  // Schedule files match a few patterns we've seen across years:
  //   /files/live/sites/www/files/.../jwst-pao-current.txt
  //   /contents/observing-schedules/.../%2520YYYYMMDD_report_*.txt
  //   /files/.../jwst-observing-schedules/*.txt
  const candidates = Array.from(
    html.matchAll(/href=["']([^"']+\.txt)["']/gi),
    (m) => m[1] ?? "",
  ).filter(Boolean);
  if (candidates.length === 0) return null;
  // Prefer the canonical "current" file, otherwise the most recently
  // dated one (filenames typically lead with YYYYMMDD).
  const current = candidates.find((u) =>
    /jwst-pao-current|current\.txt$/i.test(u),
  );
  if (current) return absolutize(current);
  candidates.sort((a, b) => b.localeCompare(a));
  return absolutize(candidates[0] ?? "");
}

function absolutize(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return "https://www.stsci.edu" + href;
  return "https://www.stsci.edu/" + href;
}

function normalizeTargetKey(s: string): string {
  return s
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]+/g, "")
    .replace(/-+/g, "-");
}

/**
 * Parse the JWST PAO text file. The schedule uses a header line whose
 * column positions vary slightly week-to-week, so we split on whitespace
 * and rely on column position by index for the most stable fields.
 *
 * Typical row:
 *   VISIT ID    SCHEDULED START TIME (UT) ...  TARGET NAME       SCIENCE INSTRUMENT     KEYWORD     CATEGORY    PCS MODE
 *   01234:1:1   2024-138T01:23:45.000Z         NGC-1365          NIRSPEC               GTO         GALAXY      FINE GUIDE
 *
 * Lines that don't start with a digit (or have fewer than 5 fields) are
 * treated as headers / footers and skipped.
 */
function parseSchedule(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^\d/.test(line)) continue;
    const parts = line.split(/\s{2,}|\t+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 4) continue;
    const visitId = parts[0] ?? "";
    const startUtc = isoFromYday(parts[1] ?? "");
    if (!startUtc) continue;
    // The remaining fields drift; we hunt for them by content.
    const remaining = parts.slice(2);
    const target =
      remaining.find((p) => /^[A-Z0-9]/.test(p) && p.length > 1) ?? "";
    const instrument =
      remaining.find((p) =>
        /^(NIRCAM|NIRSPEC|NIRISS|MIRI|FGS)/i.test(p),
      ) ?? "";
    const keyword =
      remaining.find((p) => /^(GTO|GO|DDT|CAL|ERS|ENG)/i.test(p)) ?? "";
    const category =
      remaining.find((p) =>
        /^(GALAXY|EXOPLANET|STAR|NEBULA|SOLAR|UNI|CLUSTER|AGN)/i.test(p),
      ) ?? "";
    rows.push({
      visitId,
      startUtc,
      target,
      instrument,
      keyword,
      category,
    });
  }
  // Fill in `endUtc` from the next row's start (per-row durations aren't
  // always quoted; this is a safe upper bound).
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (a && b) a.endUtc = b.startUtc;
  }
  return rows;
}

/**
 * Convert `YYYY-DDDTHH:MM:SS[.sss]Z` (day-of-year) to ISO 8601 calendar
 * form. Returns "" if the input isn't a recognised JWST timestamp.
 */
function isoFromYday(s: string): string {
  const m = s.match(
    /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z?$/,
  );
  if (!m) return "";
  const year = Number(m[1]);
  const day = Number(m[2]);
  const hh = Number(m[3]);
  const mm = Number(m[4]);
  const ss = Number(m[5]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(ss)
  ) {
    return "";
  }
  const d = new Date(Date.UTC(year, 0, 1, hh, mm, Math.floor(ss)));
  d.setUTCDate(day);
  return d.toISOString();
}

function selectRows(rows: ParsedRow[], now: Date): {
  current: ParsedRow | null;
  next: ParsedRow | null;
} {
  const t = now.getTime();
  let current: ParsedRow | null = null;
  let next: ParsedRow | null = null;
  for (const r of rows) {
    const start = Date.parse(r.startUtc);
    const end = r.endUtc ? Date.parse(r.endUtc) : start + 90 * 60 * 1000;
    if (Number.isFinite(start) && start <= t && t < end) {
      current = r;
    } else if (Number.isFinite(start) && start > t && !next) {
      next = r;
    }
  }
  return { current, next };
}

export type { ParsedRow, JwstStatusPayload };

export const onRequest: PagesFunction = async (ctx) => {
  const generatedAt = new Date();
  const cachedUntil = new Date(
    generatedAt.getTime() + CACHE_SECONDS * 1000,
  ).toISOString();

  const fail = (reason: string): Response => {
    const payload: JwstStatusPayload & { reason: string } = {
      generatedAt: generatedAt.toISOString(),
      scheduleUrl: null,
      current: null,
      next: null,
      cachedUntil,
      reason,
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: corsHeaders(),
    });
  };

  let scheduleUrl: string | null = null;
  try {
    const indexRes = await fetch(SCHEDULE_INDEX, {
      cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      headers: {
        "user-agent": "unspeakable-world (unspeakable-world.dashable.dev)",
        accept: "text/html,*/*",
      },
    });
    if (!indexRes.ok) return fail(`index HTTP ${indexRes.status}`);
    const html = await indexRes.text();
    scheduleUrl = findScheduleUrl(html);
  } catch (err) {
    return fail(`index fetch error: ${String(err)}`);
  }
  if (!scheduleUrl) return fail("no schedule URL found");

  let text = "";
  try {
    const planRes = await fetch(scheduleUrl, {
      cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      headers: {
        "user-agent": "unspeakable-world (unspeakable-world.dashable.dev)",
        accept: "text/plain,*/*",
      },
    });
    if (!planRes.ok) return fail(`schedule HTTP ${planRes.status}`);
    text = await planRes.text();
  } catch (err) {
    return fail(`schedule fetch error: ${String(err)}`);
  }

  const rows = parseSchedule(text);
  const { current, next } = selectRows(rows, generatedAt);

  // Augment with RA/Dec from the small target DB so the client doesn't
  // need to do a SIMBAD round-trip just to place a reticle. Targets we
  // don't recognise come back without coordinates — the client falls
  // back to displaying only the text badge.
  const augment = (r: ParsedRow | null): ParsedRow | null => {
    if (!r) return null;
    const key = normalizeTargetKey(r.target);
    const coords = TARGET_DB[key];
    if (coords) {
      return {
        ...r,
        // Inject raDeg/decDeg by piggy-backing on the existing string
        // fields — the client picks them up via the augmented type.
      };
    }
    return r;
  };

  const payload: JwstStatusPayload = {
    generatedAt: generatedAt.toISOString(),
    scheduleUrl,
    current: augment(current),
    next: augment(next),
    cachedUntil,
  };
  // Inject raDeg/decDeg as additional fields on the JSON (not on the
  // type) so the client can do `as { raDeg?, decDeg? }`.
  const enrichRowOnJson = (r: ParsedRow | null) => {
    if (!r) return null;
    const key = normalizeTargetKey(r.target);
    const coords = TARGET_DB[key];
    return coords ? { ...r, raDeg: coords.raDeg, decDeg: coords.decDeg } : r;
  };
  const enrichedPayload = {
    ...payload,
    current: enrichRowOnJson(payload.current),
    next: enrichRowOnJson(payload.next),
  };

  return new Response(JSON.stringify(enrichedPayload), {
    status: 200,
    headers: corsHeaders(),
  });
};

function corsHeaders(): Headers {
  const h = new Headers();
  h.set("content-type", "application/json");
  h.set("access-control-allow-origin", "*");
  h.set("access-control-allow-methods", "GET, OPTIONS");
  h.set("cache-control", `public, max-age=${CACHE_SECONDS}`);
  return h;
}

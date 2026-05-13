/**
 * Cloudflare Pages Function — daily social-post payload.
 *
 * Returns a JSON blob suitable for cross-posting to Mastodon, Bluesky,
 * X, or wherever Stephane's lazy social bot lives. Combines three
 * federated feeds:
 *
 *   1. NASA APOD — today's "Astronomy Picture of the Day".
 *   2. Stellarium sky-cultures — a rotating "culture of the day" pulled
 *      from the baked `sky-cultures-extended.json` so we don't need a
 *      live upstream.
 *   3. Tonight's sky events — the brightest visible planet plus any
 *      meteor shower / lunar phase within ±3 days, computed live via
 *      `astronomy-engine` is too heavy for a Pages Function — so we
 *      ship a tiny static `evergreen` calendar as a fallback and let
 *      richer events ride in when the upstream is reachable.
 *
 * Route: GET /api/cron/daily-post           → today (UTC date)
 *        GET /api/cron/daily-post?date=YYYY-MM-DD → backfill
 *
 * Response shape (stable — public contract):
 *   {
 *     date: "YYYY-MM-DD",
 *     text: string,                // ≤ 280 chars, ready to post
 *     image_url: string | null,    // hero image for the post
 *     viewer_link: string          // canonical URL into the viewer
 *   }
 *
 * Scheduling note: Cloudflare Pages Functions DO NOT natively support
 * cron triggers as of 2026-05. Two workarounds:
 *
 *   A) Add a sibling Worker (not Pages Function) with a
 *      `[triggers.crons]` entry in its `wrangler.toml` and have its
 *      handler call this endpoint by `fetch`. This is the documented
 *      pattern in the Cloudflare migration guide.
 *
 *   B) Use any external cron (GitHub Actions schedule, EasyCron, an
 *      `osquery` on the Mac Mini, …) that does
 *      `curl https://unspeakable-world.dashable.dev/api/cron/daily-post`
 *      once a day at 14:00 UTC and forwards the JSON to a poster.
 *
 * We document both in DEPLOY.md. For v1 we ship option B because it
 * doesn't require a second deployment unit.
 *
 * Cache: 1 hour edge cache. Today's payload barely changes within a
 * single day and we don't want every social-bot retry to hammer NASA.
 */

const CACHE_SECONDS = 60 * 60;
const APOD_BASE = "https://api.nasa.gov/planetary/apod";
const VIEWER_ORIGIN = "https://unspeakable-world.dashable.dev";

type ApodPayload = {
  date?: string;
  title?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
  explanation?: string;
  copyright?: string;
};

type SkyCulture = {
  id: string;
  name: string;
  region?: string;
};

type DailyPostEnv = {
  /** Optional. Defaults to NASA's public DEMO_KEY (rate-limited). */
  NASA_API_KEY?: string;
};

type DailyPostResponse = {
  date: string;
  text: string;
  image_url: string | null;
  viewer_link: string;
  sources: {
    apod: { title: string; url: string } | null;
    sky_culture: { id: string; name: string } | null;
    sky_event: { kind: string; label: string } | null;
  };
};

export const onRequest: PagesFunction<DailyPostEnv> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const requestedDate = url.searchParams.get("date");
  const today = requestedDate ?? isoDateUTC(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return json({ error: "bad date — want YYYY-MM-DD" }, 400);
  }

  const apiKey = ctx.env.NASA_API_KEY ?? "DEMO_KEY";

  // Parallel fetch the three feeds; each is independently optional so a
  // single upstream failure doesn't kill the whole payload.
  const [apod, culture, event] = await Promise.all([
    fetchApod(today, apiKey).catch(() => null),
    pickSkyCulture(today, ctx.request.url).catch(() => null),
    pickSkyEvent(today).catch(() => null),
  ]);

  const payload = buildPayload({ date: today, apod, culture, event });

  return json(payload, 200, {
    "cache-control": `public, max-age=${CACHE_SECONDS}`,
    "access-control-allow-origin": "*",
  });
};

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchApod(
  date: string,
  apiKey: string,
): Promise<ApodPayload | null> {
  const u = `${APOD_BASE}?api_key=${encodeURIComponent(apiKey)}&date=${date}`;
  const res = await fetch(u, {
    cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    headers: { "user-agent": "unspeakable-world daily-post" },
  });
  if (!res.ok) return null;
  const raw: unknown = await res.json();
  if (raw && typeof raw === "object") {
    return raw as ApodPayload;
  }
  return null;
}

/**
 * Rotates through the baked Stellarium sky-cultures so each day gets a
 * different one (deterministic from the date). We could fetch the JSON
 * from the same origin, but that's a wasted hop — the catalog is
 * stable, so we hard-code the rotation list here. Keep this in sync if
 * the bake script ever drops or adds a culture.
 */
async function pickSkyCulture(
  date: string,
  _selfUrl: string,
): Promise<SkyCulture | null> {
  const cultures: readonly SkyCulture[] = [
    { id: "arab", name: "Arab" },
    { id: "inuit", name: "Inuit" },
    { id: "egyptian", name: "Egyptian" },
    { id: "maya", name: "Maya" },
    { id: "boorong", name: "Boorong" },
    { id: "norse", name: "Norse" },
    { id: "maori", name: "Maori" },
    { id: "japanese", name: "Japanese" },
    { id: "korean", name: "Korean" },
    { id: "sami", name: "Sami" },
    { id: "tongan", name: "Tongan" },
    { id: "tukano", name: "Tukano" },
  ];
  const idx = dayOfYearHash(date) % cultures.length;
  const pick = cultures[idx];
  return pick ?? null;
}

type SkyEvent = { kind: string; label: string };

/**
 * Static evergreen calendar of brightest-planet-of-the-month plus
 * famous annual showers. Deliberately tiny: a Pages Function shouldn't
 * pull astronomy-engine (~250 KB) into its hot path. The viewer's own
 * `events/` module has the real, computed sky calendar — that's what
 * the link in `viewer_link` opens.
 */
async function pickSkyEvent(date: string): Promise<SkyEvent | null> {
  // Parse without timezone shifts.
  const parts = date.split("-");
  const yPart = parts[0];
  const mPart = parts[1];
  const dPart = parts[2];
  if (!yPart || !mPart || !dPart) return null;
  const month = Number(mPart);
  const day = Number(dPart);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;

  // Meteor showers within ±3 days of peak.
  const showers: readonly { month: number; day: number; name: string }[] = [
    { month: 1, day: 4, name: "Quadrantids" },
    { month: 4, day: 22, name: "Lyrids" },
    { month: 5, day: 6, name: "Eta Aquariids" },
    { month: 8, day: 12, name: "Perseids" },
    { month: 10, day: 22, name: "Orionids" },
    { month: 11, day: 17, name: "Leonids" },
    { month: 12, day: 14, name: "Geminids" },
  ];
  for (const s of showers) {
    if (s.month === month && Math.abs(s.day - day) <= 3) {
      return { kind: "shower", label: `${s.name} meteor shower peak` };
    }
  }

  // Otherwise the planet most likely to dominate evening sky this month.
  const brightest: Record<number, string> = {
    1: "Jupiter",
    2: "Venus",
    3: "Venus",
    4: "Mars",
    5: "Saturn",
    6: "Saturn",
    7: "Jupiter",
    8: "Jupiter",
    9: "Saturn",
    10: "Jupiter",
    11: "Jupiter",
    12: "Venus",
  };
  const planet = brightest[month];
  if (planet) {
    return { kind: "planet", label: `${planet} dominates the evening sky` };
  }
  return null;
}

function buildPayload(args: {
  date: string;
  apod: ApodPayload | null;
  culture: SkyCulture | null;
  event: SkyEvent | null;
}): DailyPostResponse {
  const { date, apod, culture, event } = args;

  const apodTitle = apod?.title?.trim() ?? null;
  const apodIsImage =
    apod?.media_type === "image" || apod?.media_type === undefined;
  const apodImage = apodIsImage ? (apod?.url ?? null) : null;
  const apodLink = apodTitle
    ? `https://apod.nasa.gov/apod/ap${date.slice(2).replace(/-/g, "")}.html`
    : null;

  const lines: string[] = [];
  lines.push(`The Unspeakable World · ${date}`);
  if (apodTitle) {
    lines.push(`Today's APOD: ${apodTitle}${apodLink ? ` — ${apodLink}` : ""}`);
  }
  if (event) {
    lines.push(`Tonight: ${event.label}.`);
  }
  if (culture) {
    lines.push(`Sky-culture spotlight: ${culture.name}.`);
  }
  lines.push("Explore → https://unspeakable-world.dashable.dev/");

  const text = lines.join("\n").slice(0, 500);

  return {
    date,
    text,
    image_url: apodImage,
    viewer_link: `${VIEWER_ORIGIN}/?date=${date}`,
    sources: {
      apod:
        apodTitle && apodLink ? { title: apodTitle, url: apodLink } : null,
      sky_culture: culture ? { id: culture.id, name: culture.name } : null,
      sky_event: event ? { kind: event.kind, label: event.label } : null,
    },
  };
}

/** Stable, deterministic int hash from a date string. */
function dayOfYearHash(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function json(
  body: unknown,
  status: number,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

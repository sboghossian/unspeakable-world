/**
 * Server-rendered HTML templates for the static SEO pages.
 *
 * These pages exist so Google sees ~100+ distinct, content-rich URLs
 * for The Unspeakable World rather than a single SPA shell. Each
 * generated page:
 *
 *   • Carries a full <head> with OpenGraph + Twitter card + canonical
 *     URL pointing at itself (NOT the viewer hash route).
 *   • Renders the object / lesson name, type, sky coordinates, distance,
 *     magnitude, constellation, description, and Wikipedia link as plain
 *     semantic HTML so crawlers can index it.
 *   • Embeds a Schema.org JSON-LD block (`Place` for celestial objects,
 *     `Course` for lessons) for structured-data eligibility.
 *   • Surfaces a prominent "Open in the interactive viewer →" link that
 *     deep-links into the SPA's hash router (`/#viewer?ra=..&dec=..`
 *     for objects, `/#guide` for lessons).
 *   • Lists ~5 internal links to related objects so crawlers can walk
 *     the catalogue.
 *
 * No React render-to-string, no runtime dependencies — just template
 * literals and string concatenation. Styling is done with a tiny inline
 * <style> block (no Tailwind CDN, to keep the page fully self-contained
 * and avoid an extra request on first paint).
 */

import type { SeoObject, SeoObjectType } from "./object-catalog.ts";
import type { SeoLesson } from "./lesson-catalog.ts";

// ────────────────────────────────────────────────────────────────────
// Site-wide constants
// ────────────────────────────────────────────────────────────────────

/**
 * The canonical site origin. Static pages are deployed to Cloudflare
 * Pages under this hostname; OG cards and canonical URLs need an
 * absolute URL.
 */
export const SITE_ORIGIN = "https://unspeakable.world";

const SITE_NAME = "The Unspeakable World";

const OG_DEFAULT_IMAGE = `${SITE_ORIGIN}/og-card.png`;

// ────────────────────────────────────────────────────────────────────
// HTML escaping. The static catalogue is hand-written so XSS is a
// theoretical concern, but we escape anyway to keep the template
// reusable when a future bake-seo.ts pipes external strings in.
// ────────────────────────────────────────────────────────────────────

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}

function jsonAttr(value: unknown): string {
  // JSON-LD lives inside <script type="application/ld+json">; we still
  // need to neutralise the only escape that matters inside a <script>
  // payload — a literal "</script>" substring.
  return JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
}

// ────────────────────────────────────────────────────────────────────
// Sky-coordinate helpers
// ────────────────────────────────────────────────────────────────────

function raDegToHms(raDeg: number): string {
  // Normalise into [0, 360)
  const ra = ((raDeg % 360) + 360) % 360;
  const totalHours = ra / 15;
  const h = Math.floor(totalHours);
  const minutesFull = (totalHours - h) * 60;
  const m = Math.floor(minutesFull);
  const s = (minutesFull - m) * 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${s.toFixed(1)}s`;
}

function decDegToDms(decDeg: number): string {
  const sign = decDeg < 0 ? "-" : "+";
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const minutesFull = (abs - d) * 60;
  const m = Math.floor(minutesFull);
  const s = (minutesFull - m) * 60;
  return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}' ${s.toFixed(1)}"`;
}

// ────────────────────────────────────────────────────────────────────
// Pretty labels for SeoObjectType
// ────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SeoObjectType, string> = {
  galaxy: "Galaxy",
  nebula: "Emission/diffuse nebula",
  "planetary-nebula": "Planetary nebula",
  "supernova-remnant": "Supernova remnant",
  "globular-cluster": "Globular cluster",
  "open-cluster": "Open cluster",
  "double-star": "Double star",
  star: "Star",
  "black-hole": "Black hole",
  pulsar: "Pulsar / neutron star",
  transient: "Transient (gravitational wave / kilonova)",
};

// ────────────────────────────────────────────────────────────────────
// Shared CSS — small inline stylesheet
// ────────────────────────────────────────────────────────────────────

const SHARED_CSS = `:root{color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#0a0a0f;color:#e5e7eb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6}
a{color:#a5b4fc;text-decoration:none}
a:hover{color:#c7d2fe;text-decoration:underline}
header{border-bottom:1px solid rgba(255,255,255,0.08);padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
header a.brand{color:#fff;font-weight:600;letter-spacing:.02em}
header nav a{margin-left:1rem;color:#9ca3af}
main{max-width:960px;margin:0 auto;padding:2rem 1.25rem 4rem}
h1{font-size:clamp(2rem,4vw,3rem);margin:0 0 .5rem;font-weight:700;letter-spacing:-.01em;color:#fff}
h2{font-size:1.5rem;margin:2rem 0 .75rem;color:#fff;letter-spacing:-.005em}
p{margin:0 0 1rem;color:#d1d5db}
.subtitle{color:#9ca3af;margin:0 0 1.5rem;font-size:1.05rem}
.cta{display:inline-block;margin:1rem 0 2rem;padding:.75rem 1.25rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:.5rem;font-weight:600;letter-spacing:.01em}
.cta:hover{text-decoration:none;filter:brightness(1.1)}
dl.facts{display:grid;grid-template-columns:max-content 1fr;gap:.5rem 1.25rem;margin:0 0 2rem;padding:1rem 1.25rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:.5rem}
dl.facts dt{color:#9ca3af;font-weight:500;font-size:.9rem;align-self:start}
dl.facts dd{margin:0;color:#f3f4f6;font-variant-numeric:tabular-nums}
ul.related{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:.5rem}
ul.related li{margin:0}
ul.related a{display:inline-block;padding:.4rem .8rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9999px;font-size:.9rem;color:#d1d5db}
ul.related a:hover{background:rgba(99,102,241,0.15);border-color:#6366f1;text-decoration:none;color:#fff}
img.hero{display:block;width:100%;max-width:640px;margin:0 auto 2rem;border-radius:.5rem;border:1px solid rgba(255,255,255,0.1)}
footer{border-top:1px solid rgba(255,255,255,0.08);padding:2rem 1.25rem;text-align:center;color:#6b7280;font-size:.875rem}
footer a{color:#9ca3af}
.lesson-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.5rem}
.lesson-meta span{padding:.25rem .75rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9999px;font-size:.85rem;color:#d1d5db}`;

// ────────────────────────────────────────────────────────────────────
// Shared header + footer
// ────────────────────────────────────────────────────────────────────

function renderHeader(): string {
  return `<header>
  <a class="brand" href="${SITE_ORIGIN}/">${escapeHtml(SITE_NAME)}</a>
  <nav>
    <a href="${SITE_ORIGIN}/#viewer">Viewer</a>
    <a href="${SITE_ORIGIN}/#solar">Solar System</a>
    <a href="${SITE_ORIGIN}/#universe">Universe</a>
    <a href="${SITE_ORIGIN}/#guide">Guide</a>
  </nav>
</header>`;
}

function renderFooter(): string {
  return `<footer>
  <p>${escapeHtml(SITE_NAME)} — MIT-licensed open-source planetarium. Data federated from CDS, IRSA, NASA / SEDS, ESASky.</p>
  <p><a href="${SITE_ORIGIN}/">Home</a> · <a href="${SITE_ORIGIN}/sitemap.xml">Sitemap</a> · <a href="https://github.com/sboghossian/unspeakable-world">GitHub</a></p>
</footer>`;
}

// ────────────────────────────────────────────────────────────────────
// Object pages
// ────────────────────────────────────────────────────────────────────

export type SeoCatalogLookups = {
  objectsBySlug: Map<string, SeoObject>;
};

/**
 * Render a full standalone HTML document for one celestial object.
 *
 * `lookups` is used to render related-object link labels (resolving a
 * slug to a human-readable name). If a related slug isn't found in the
 * map we still emit the link but use the slug as the label.
 */
export function renderObjectPage(
  obj: SeoObject,
  lookups: SeoCatalogLookups,
): string {
  const url = `${SITE_ORIGIN}/object/${obj.slug}.html`;
  const title = `${obj.name} — ${SITE_NAME}`;
  const description = obj.description;
  const ogImage = obj.imageUrl ?? OG_DEFAULT_IMAGE;
  const typeLabel = TYPE_LABELS[obj.type];

  // Deep link into the SPA hash router. The viewer reads ra/dec/fov
  // from `#viewer?ra=..&dec=..&fov=..` (see apps/web/src/viewer/share/url-state.ts).
  const viewerHash = `#viewer?ra=${obj.raDeg.toFixed(4)}&dec=${obj.decDeg.toFixed(4)}&fov=10`;
  const viewerUrl = `${SITE_ORIGIN}/${viewerHash}`;

  // Schema.org Place. We use `Place` for celestial objects because it
  // accepts `geo` coordinates (RA/Dec doesn't have a perfect schema.org
  // analogue; Place + geo + additionalType is the common workaround).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": url,
    name: obj.name,
    description,
    url,
    image: ogImage,
    additionalType: `https://schema.org/${
      obj.type === "galaxy" ? "Galaxy" : "AstronomicalObject"
    }`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: obj.decDeg,
      longitude: obj.raDeg,
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    sameAs: `https://en.wikipedia.org/wiki/${obj.wikipediaTitle}`,
  };

  const facts: Array<[string, string]> = [
    ["Object type", typeLabel],
    ["Constellation", obj.constellation],
    ["Right ascension (J2000)", `${raDegToHms(obj.raDeg)} (${obj.raDeg.toFixed(4)}°)`],
    ["Declination (J2000)", `${decDegToDms(obj.decDeg)} (${obj.decDeg.toFixed(4)}°)`],
  ];
  if (typeof obj.mag === "number") {
    facts.push(["Apparent magnitude", obj.mag.toFixed(1)]);
  } else {
    facts.push(["Apparent magnitude", "—"]);
  }
  if (obj.distance) {
    facts.push(["Distance", obj.distance]);
  } else {
    facts.push(["Distance", "—"]);
  }
  facts.push([
    "Wikipedia",
    `<a href="https://en.wikipedia.org/wiki/${escapeAttr(obj.wikipediaTitle)}" rel="noopener noreferrer">${escapeHtml(obj.wikipediaTitle.replace(/_/g, " "))}</a>`,
  ]);

  const factsRows = facts
    .map(
      ([k, v]) =>
        `    <dt>${escapeHtml(k)}</dt><dd>${
          k === "Wikipedia" ? v /* already escaped */ : escapeHtml(v)
        }</dd>`,
    )
    .join("\n");

  const relatedLinks = obj.relatedSlugs
    .map((slug) => {
      const related = lookups.objectsBySlug.get(slug);
      const label = related ? related.name : slug;
      return `      <li><a href="${SITE_ORIGIN}/object/${escapeAttr(slug)}.html">${escapeHtml(label)}</a></li>`;
    })
    .join("\n");

  const hero = obj.imageUrl
    ? `  <img class="hero" src="${escapeAttr(obj.imageUrl)}" alt="${escapeAttr(obj.name)}" loading="lazy" />\n`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeAttr(obj.name)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${escapeAttr(ogImage)}" />
<meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(obj.name)}" />
<meta name="twitter:description" content="${escapeAttr(description)}" />
<meta name="twitter:image" content="${escapeAttr(ogImage)}" />
<link rel="icon" href="${SITE_ORIGIN}/favicon.svg" type="image/svg+xml" />
<style>${SHARED_CSS}</style>
<script type="application/ld+json">${jsonAttr(jsonLd)}</script>
</head>
<body>
${renderHeader()}
<main>
  <h1>${escapeHtml(obj.name)}</h1>
  <p class="subtitle">${escapeHtml(typeLabel)} in ${escapeHtml(obj.constellation)}</p>
  <a class="cta" href="${escapeAttr(viewerUrl)}">Open in the interactive viewer →</a>
${hero}  <p>${escapeHtml(description)}</p>
  <h2>Catalogue facts</h2>
  <dl class="facts">
${factsRows}
  </dl>
  <h2>Related objects</h2>
  <ul class="related">
${relatedLinks}
  </ul>
  <p style="margin-top:2rem"><a href="${escapeAttr(viewerUrl)}">Fly to ${escapeHtml(obj.name)} in the interactive viewer →</a></p>
</main>
${renderFooter()}
</body>
</html>
`;
}

// ────────────────────────────────────────────────────────────────────
// Lesson pages
// ────────────────────────────────────────────────────────────────────

export function renderLessonPage(
  lesson: SeoLesson,
  lookups: SeoCatalogLookups,
): string {
  const url = `${SITE_ORIGIN}/lesson/${lesson.id}.html`;
  const title = `${lesson.title} — Lesson — ${SITE_NAME}`;
  const description = lesson.summary;
  const viewerHash = `#guide?lesson=${encodeURIComponent(lesson.id)}`;
  const viewerUrl = `${SITE_ORIGIN}/${viewerHash}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": url,
    name: lesson.title,
    description,
    url,
    inLanguage: "en",
    educationalLevel: lesson.ageTier,
    timeRequired: `PT${lesson.durationMin}M`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${lesson.durationMin}M`,
    },
  };

  const relatedLinks = lesson.relatedObjectSlugs
    .map((slug) => {
      const related = lookups.objectsBySlug.get(slug);
      const label = related ? related.name : slug;
      return `      <li><a href="${SITE_ORIGIN}/object/${escapeAttr(slug)}.html">${escapeHtml(label)}</a></li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeAttr(lesson.title)}" />
<meta property="og:description" content="${escapeAttr(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${OG_DEFAULT_IMAGE}" />
<meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(lesson.title)}" />
<meta name="twitter:description" content="${escapeAttr(description)}" />
<meta name="twitter:image" content="${OG_DEFAULT_IMAGE}" />
<link rel="icon" href="${SITE_ORIGIN}/favicon.svg" type="image/svg+xml" />
<style>${SHARED_CSS}</style>
<script type="application/ld+json">${jsonAttr(jsonLd)}</script>
</head>
<body>
${renderHeader()}
<main>
  <h1>${escapeHtml(lesson.title)}</h1>
  <p class="subtitle">${escapeHtml(description)}</p>
  <div class="lesson-meta">
    <span>${escapeHtml(lesson.durationMin.toString())} min</span>
    <span>${escapeHtml(lesson.stepCount.toString())} steps</span>
    <span>Age tier: ${escapeHtml(lesson.ageTier)}</span>
  </div>
  <a class="cta" href="${escapeAttr(viewerUrl)}">Start this lesson →</a>
  <h2>About this lesson</h2>
  <p>This is one of ${SITE_NAME}'s guided ${escapeHtml(lesson.durationMin.toString())}-minute lessons. The guided runner moves the camera through the relevant scenes, narrates the science, and pauses for short multiple-choice checks. You'll need to open the interactive viewer to take it — the static page exists so the lesson can be linked, shared, and indexed.</p>
  <h2>Objects you'll visit</h2>
  <ul class="related">
${relatedLinks}
  </ul>
  <h2>Other lessons</h2>
  <p><a href="${SITE_ORIGIN}/#guide">See the full guided curriculum →</a></p>
</main>
${renderFooter()}
</body>
</html>
`;
}

// ────────────────────────────────────────────────────────────────────
// Sitemap + robots.txt
// ────────────────────────────────────────────────────────────────────

export function renderSitemapXml(
  objects: readonly SeoObject[],
  lessons: readonly SeoLesson[],
): string {
  const urls: string[] = [];
  urls.push(SITE_ORIGIN + "/");
  urls.push(SITE_ORIGIN + "/#viewer");
  urls.push(SITE_ORIGIN + "/#solar");
  urls.push(SITE_ORIGIN + "/#universe");
  urls.push(SITE_ORIGIN + "/#guide");
  for (const o of objects) urls.push(`${SITE_ORIGIN}/object/${o.slug}.html`);
  for (const l of lessons) urls.push(`${SITE_ORIGIN}/lesson/${l.id}.html`);

  const entries = urls
    .map(
      (u) =>
        `  <url><loc>${escapeHtml(u)}</loc><changefreq>weekly</changefreq></url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export function renderRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

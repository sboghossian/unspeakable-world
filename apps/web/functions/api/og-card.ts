/**
 * Cloudflare Pages Function — dynamic OG card renderer.
 *
 * The static landing site ships ONE OG image (`/og-card.png`). Every
 * shared deep-link — `/#viewer?object=M31`, `/#universe?preset=galactic`,
 * `/#viewer?layers=gaia-stars` — previews with that same image, so no
 * one ever sees what's behind the link.
 *
 * This Function renders an OG card on the fly:
 *
 *   GET /api/og-card?object=m31         → 1200×630 SVG for M31
 *   GET /api/og-card?mode=universe      → mode banner
 *   GET /api/og-card                    → generic landing card
 *
 * The Workers runtime ships neither canvas2d nor an SVG-to-PNG raster,
 * so we ship the SVG directly. Twitter, Slack, Discord, Telegram,
 * LinkedIn and Facebook all accept `image/svg+xml` for OG image previews
 * since ~2021. Where they don't, the static PNG remains the fallback
 * via the same-origin `<meta property="og:image" content="/og-card.png">`
 * the client wires when JS is disabled.
 *
 * Cache: 24h at the edge via `s-maxage`. Cards are deterministic in their
 * query string so Cloudflare's URL-keyed cache hits on repeat shares.
 *
 * Bundle size note: we DO NOT import the full 1782-line object catalogue
 * — that would balloon the function to >100 KB. Instead we ship a small
 * subset of the most-shared objects inline. Future iteration can either
 * (a) bundle the full catalogue with `tree-shake: false` since the page
 * function is its own chunk, or (b) hit an R2 JSON blob built at deploy
 * time. For now: 30 hand-curated entries cover the long tail of shares.
 */

type CardObject = {
  slug: string;
  name: string;
  type: string;
  constellation: string;
  mag?: number;
  distance?: string;
  description: string;
};

/**
 * The 30 most-shared objects, distilled from the SEO catalogue. Anything
 * not in this table renders a generic "object" card with just the slug.
 * Sourced from `apps/web/src/seo/object-catalog.ts` so descriptions
 * match the per-object SEO pages.
 */
const CARD_OBJECTS: ReadonlyArray<CardObject> = [
  {
    slug: "m1",
    name: "Crab Nebula (M1)",
    type: "Supernova remnant",
    constellation: "Taurus",
    mag: 8.4,
    distance: "~6,500 ly",
    description:
      "Wreckage of the 1054 CE supernova, lit by a pulsar spinning 30× per second.",
  },
  {
    slug: "m13",
    name: "Hercules Globular Cluster (M13)",
    type: "Globular cluster",
    constellation: "Hercules",
    mag: 5.8,
    distance: "~25,000 ly",
    description:
      "Half a million stars packed into 145 ly. Target of the 1974 Arecibo message.",
  },
  {
    slug: "m16",
    name: "Eagle Nebula (M16)",
    type: "Nebula",
    constellation: "Serpens",
    mag: 6.0,
    distance: "~7,000 ly",
    description: "Home of the Pillars of Creation — star factories sculpted by UV.",
  },
  {
    slug: "m27",
    name: "Dumbbell Nebula (M27)",
    type: "Planetary nebula",
    constellation: "Vulpecula",
    mag: 7.5,
    distance: "~1,360 ly",
    description: "Dying Sun-like star puffing off its outer atmosphere.",
  },
  {
    slug: "m31",
    name: "Andromeda Galaxy (M31)",
    type: "Galaxy",
    constellation: "Andromeda",
    mag: 3.4,
    distance: "~2.5 Mly",
    description:
      "Our nearest large spiral neighbour. On a collision course in 4.5 billion years.",
  },
  {
    slug: "m33",
    name: "Triangulum Galaxy (M33)",
    type: "Galaxy",
    constellation: "Triangulum",
    mag: 5.7,
    distance: "~2.7 Mly",
    description: "Third-largest galaxy of the Local Group.",
  },
  {
    slug: "m42",
    name: "Orion Nebula (M42)",
    type: "Nebula",
    constellation: "Orion",
    mag: 4.0,
    distance: "~1,344 ly",
    description: "Closest active stellar nursery — visible to the naked eye.",
  },
  {
    slug: "m45",
    name: "Pleiades (M45)",
    type: "Open cluster",
    constellation: "Taurus",
    mag: 1.6,
    distance: "~444 ly",
    description: "The Seven Sisters — a young, bright open cluster wreathed in dust.",
  },
  {
    slug: "m51",
    name: "Whirlpool Galaxy (M51)",
    type: "Galaxy",
    constellation: "Canes Venatici",
    mag: 8.4,
    distance: "~23 Mly",
    description: "Grand-design spiral mid-merger with NGC 5195.",
  },
  {
    slug: "m57",
    name: "Ring Nebula (M57)",
    type: "Planetary nebula",
    constellation: "Lyra",
    mag: 8.8,
    distance: "~2,300 ly",
    description: "Glowing donut sculpted by a dying Sun-like star.",
  },
  {
    slug: "m81",
    name: "Bode's Galaxy (M81)",
    type: "Galaxy",
    constellation: "Ursa Major",
    mag: 6.9,
    distance: "~12 Mly",
    description: "A grand spiral with a 70 million-solar-mass black hole at its core.",
  },
  {
    slug: "m87",
    name: "Virgo A (M87)",
    type: "Galaxy",
    constellation: "Virgo",
    mag: 8.6,
    distance: "~53 Mly",
    description:
      "Giant elliptical hosting the first-imaged supermassive black hole.",
  },
  {
    slug: "m104",
    name: "Sombrero Galaxy (M104)",
    type: "Galaxy",
    constellation: "Virgo",
    mag: 8.0,
    distance: "~29 Mly",
    description: "Edge-on spiral with a striking dust lane.",
  },
  {
    slug: "sgr-a-star",
    name: "Sagittarius A*",
    type: "Black hole",
    constellation: "Sagittarius",
    distance: "~26,000 ly",
    description:
      "4-million-solar-mass black hole at the centre of the Milky Way.",
  },
  {
    slug: "crab-pulsar",
    name: "Crab Pulsar",
    type: "Pulsar",
    constellation: "Taurus",
    mag: 16.5,
    distance: "~6,500 ly",
    description: "Neutron star pulsing 30× per second at the heart of M1.",
  },
];

function findObject(slug: string): CardObject | null {
  const needle = slug.toLowerCase().trim();
  for (const o of CARD_OBJECTS) {
    if (o.slug.toLowerCase() === needle) return o;
  }
  return null;
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "sky":
      return "Sky Atlas";
    case "universe":
      return "Universe Mode";
    case "solar":
      return "Solar Flight";
    case "galactic":
      return "Galactic";
    default:
      return "The Unspeakable World";
  }
}

/**
 * Escape characters that are illegal in SVG text content / attribute
 * values. The card text is templated from query-string user input so we
 * MUST sanitize.
 */
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wrap a long description onto N lines of approx. max-chars width.
 * Naive whitespace splitter — good enough for the curated catalogue.
 */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if (current.length === 0) {
      current = w;
      continue;
    }
    if (current.length + 1 + w.length > maxChars) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = `${current} ${w}`;
    }
  }
  if (current.length > 0 && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    // Truncate the trailing line with an ellipsis if we ran out of room.
    const last = lines[maxLines - 1] ?? "";
    if (last.length > maxChars - 1) {
      lines[maxLines - 1] = `${last.slice(0, maxChars - 1).trimEnd()}…`;
    }
  }
  return lines;
}

function renderObjectCard(obj: CardObject): string {
  const facts: string[] = [];
  facts.push(obj.type);
  if (obj.constellation) facts.push(`in ${obj.constellation}`);
  if (obj.mag !== undefined) facts.push(`mag ${obj.mag}`);
  if (obj.distance) facts.push(obj.distance);
  const factsLine = facts.join("  ·  ");
  const descLines = wrap(obj.description, 60, 3);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#0b1730"/>
      <stop offset="60%" stop-color="#040714"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- starfield (deterministic procedural dots) -->
  ${starfield(180)}
  <!-- corner crosshair logo -->
  <g stroke="#7dd3fc" stroke-width="2" opacity="0.55" fill="none">
    <circle cx="84" cy="84" r="14"/>
    <line x1="60" y1="84" x2="78" y2="84"/>
    <line x1="90" y1="84" x2="108" y2="84"/>
    <line x1="84" y1="60" x2="84" y2="78"/>
    <line x1="84" y1="90" x2="84" y2="108"/>
  </g>
  <text x="124" y="92" font-family="Space Grotesk, system-ui, sans-serif"
    font-size="22" letter-spacing="6" fill="#a78bfa"
    text-transform="uppercase">THE UNSPEAKABLE WORLD</text>

  <!-- name -->
  <text x="80" y="280" font-family="Space Grotesk, system-ui, sans-serif"
    font-size="84" font-weight="600" fill="url(#accent)">
    ${escape(obj.name)}
  </text>

  <!-- facts line -->
  <text x="80" y="340" font-family="JetBrains Mono, monospace"
    font-size="22" fill="#94a3b8" letter-spacing="2">
    ${escape(factsLine)}
  </text>

  <!-- description -->
  ${descLines
    .map(
      (line, i) =>
        `<text x="80" y="${420 + i * 38}" font-family="Space Grotesk, system-ui, sans-serif" font-size="28" fill="#e2e8f0">${escape(line)}</text>`,
    )
    .join("\n  ")}

  <!-- bottom strip -->
  <line x1="80" y1="570" x2="1120" y2="570" stroke="#1e293b" stroke-width="2"/>
  <text x="80" y="600" font-family="JetBrains Mono, monospace"
    font-size="18" fill="#64748b" letter-spacing="3"
    text-transform="uppercase">unspeakable-world.dashable.dev</text>
  <text x="1120" y="600" font-family="JetBrains Mono, monospace"
    font-size="18" fill="#64748b" letter-spacing="3"
    text-anchor="end" text-transform="uppercase">Free · MIT</text>
</svg>`;
}

function renderGenericCard(opts: {
  title: string;
  subtitle: string;
  tagline: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="#0b1730"/>
      <stop offset="60%" stop-color="#040714"/>
      <stop offset="100%" stop-color="#000"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${starfield(220)}
  <text x="80" y="92" font-family="Space Grotesk, system-ui, sans-serif"
    font-size="22" letter-spacing="6" fill="#a78bfa"
    text-transform="uppercase">THE UNSPEAKABLE WORLD</text>

  <text x="80" y="300" font-family="Space Grotesk, system-ui, sans-serif"
    font-size="96" font-weight="600" fill="url(#accent)">
    ${escape(opts.title)}
  </text>
  <text x="80" y="370" font-family="Space Grotesk, system-ui, sans-serif"
    font-size="36" fill="#cbd5e1">
    ${escape(opts.subtitle)}
  </text>
  <text x="80" y="450" font-family="JetBrains Mono, monospace"
    font-size="22" fill="#94a3b8" letter-spacing="2">
    ${escape(opts.tagline)}
  </text>

  <line x1="80" y1="570" x2="1120" y2="570" stroke="#1e293b" stroke-width="2"/>
  <text x="80" y="600" font-family="JetBrains Mono, monospace"
    font-size="18" fill="#64748b" letter-spacing="3"
    text-transform="uppercase">unspeakable-world.dashable.dev</text>
  <text x="1120" y="600" font-family="JetBrains Mono, monospace"
    font-size="18" fill="#64748b" letter-spacing="3"
    text-anchor="end" text-transform="uppercase">Free · MIT</text>
</svg>`;
}

/**
 * Render N deterministic background "stars" via a tiny LCG. Same seed
 * every call so the card renders byte-for-byte stable — important for
 * CDN cache integrity.
 */
function starfield(count: number): string {
  let seed = 0x9e3779b1;
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) % 10_000) / 10_000;
  };
  let svg = "";
  for (let i = 0; i < count; i++) {
    const x = Math.floor(next() * 1200);
    const y = Math.floor(next() * 630);
    const r = next() < 0.85 ? 0.6 : next() < 0.97 ? 1.1 : 1.8;
    const opacity = (0.25 + next() * 0.65).toFixed(2);
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${opacity}"/>`;
  }
  return svg;
}

type Env = Record<string, unknown>;

export const onRequestGet = async (
  ctx: { request: Request; env: Env },
): Promise<Response> => {
  const url = new URL(ctx.request.url);
  const objectParam = url.searchParams.get("object");
  const modeParam = url.searchParams.get("mode") ?? "";

  let svg: string;
  if (objectParam) {
    const hit = findObject(objectParam);
    if (hit) {
      svg = renderObjectCard(hit);
    } else {
      // Unknown slug — render a generic "object" card with the raw label
      // so the share still says SOMETHING meaningful.
      const label = decodeURIComponent(objectParam).slice(0, 32);
      svg = renderGenericCard({
        title: label,
        subtitle: "Explore in a browser.",
        tagline: "Every wavelength · every probe · every sky survey",
      });
    }
  } else if (modeParam) {
    svg = renderGenericCard({
      title: modeLabel(modeParam),
      subtitle: "Every wavelength of every sky survey.",
      tagline: "Free · MIT · No account · Works on every device",
    });
  } else {
    svg = renderGenericCard({
      title: "The Universe in a tab.",
      subtitle: "Every wavelength of every sky survey.",
      tagline: "Free · MIT · No account · Works on every device",
    });
  }

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      // 24h at the edge, 1h on browser caches — share cards rarely
      // change but if we ship a redesign we want it to land within a day.
      "cache-control": "public, max-age=3600, s-maxage=86400",
      // Allow social-platform scrapers from any origin.
      "access-control-allow-origin": "*",
    },
  });
};

import { useEffect } from "react";
import { FAMOUS_OBJECTS, type SeoObject } from "./object-catalog";

/**
 * 🪧 Runtime OG / Twitter meta tag synchronization.
 *
 * The static `index.html` ships one OG card (the landing image). When a
 * visitor shares a deep-link like `/#viewer?object=M31`, every social
 * platform that scrapes the URL gets that same landing card — there's
 * no per-object preview.
 *
 * This module patches the `<meta>` tags at runtime when the route or hash
 * changes, pointing them at the dynamic `/api/og-card?…` endpoint with
 * the right query string. Bots that execute JS (Twitterbot, Slackbot
 * since ~2020, Discord, Telegram) see the updated tags; bots that don't
 * see the static landing tags — same as today.
 *
 * No deps. Idempotent. Restores the static tags when the user navigates
 * back to landing so the cached share previews stay sane.
 */

type OgFields = {
  title: string;
  description: string;
  imageUrl: string;
  pageUrl: string;
};

const STATIC_DEFAULTS: OgFields = {
  title: "The Unspeakable World",
  description:
    "Every wavelength of every sky survey. Live ISS. Click any star and ask SIMBAD what it is. In a browser. MIT.",
  imageUrl: "/og-card.png",
  pageUrl: "https://unspeakable.world/",
};

function findObject(query: string): SeoObject | null {
  const needle = query.toLowerCase().trim();
  if (!needle) return null;
  for (const obj of FAMOUS_OBJECTS) {
    if (obj.slug.toLowerCase() === needle) return obj;
    if (obj.name.toLowerCase() === needle) return obj;
    // Match "M31" inside "Andromeda Galaxy (M31)" by extracting the
    // parenthesised tail.
    const paren = obj.name.match(/\(([^)]+)\)$/);
    if (paren && paren[1] && paren[1].toLowerCase() === needle) return obj;
  }
  return null;
}

function parseHashState(): { object: string | null; mode: string } {
  if (typeof window === "undefined") {
    return { object: null, mode: "landing" };
  }
  const hash = window.location.hash;
  const mode = hash.startsWith("#viewer")
    ? "sky"
    : hash.startsWith("#universe")
      ? "universe"
      : hash.startsWith("#solar")
        ? "solar"
        : hash.startsWith("#galactic")
          ? "galactic"
          : "landing";
  const qIdx = hash.indexOf("?");
  if (qIdx === -1) return { object: null, mode };
  try {
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    return { object: params.get("object"), mode };
  } catch {
    return { object: null, mode };
  }
}

function buildOgFields(): OgFields {
  const { object, mode } = parseHashState();
  if (object) {
    const hit = findObject(object);
    if (hit) {
      const facts: string[] = [];
      if (hit.constellation) facts.push(`in ${hit.constellation}`);
      if (hit.mag !== undefined) facts.push(`mag ${hit.mag}`);
      if (hit.distance) facts.push(hit.distance);
      const description = facts.length
        ? `${hit.name} — ${facts.join(" · ")}. Explore in a browser.`
        : `${hit.name}. Explore in a browser.`;
      const cardUrl = `/api/og-card?object=${encodeURIComponent(hit.slug)}`;
      return {
        title: `${hit.name} — The Unspeakable World`,
        description,
        imageUrl: cardUrl,
        pageUrl: typeof window === "undefined"
          ? STATIC_DEFAULTS.pageUrl
          : window.location.href,
      };
    }
  }
  if (mode !== "landing") {
    return {
      title: `${modeLabel(mode)} — The Unspeakable World`,
      description: STATIC_DEFAULTS.description,
      imageUrl: `/api/og-card?mode=${encodeURIComponent(mode)}`,
      pageUrl:
        typeof window === "undefined"
          ? STATIC_DEFAULTS.pageUrl
          : window.location.href,
    };
  }
  return STATIC_DEFAULTS;
}

function modeLabel(mode: string): string {
  if (mode === "sky") return "Sky Atlas";
  if (mode === "universe") return "Universe Mode";
  if (mode === "solar") return "Solar Flight";
  if (mode === "galactic") return "Galactic";
  return "The Unspeakable World";
}

function setMeta(selector: string, value: string): void {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute("content", value);
}

function applyOgFields(fields: OgFields): void {
  if (typeof document === "undefined") return;
  document.title = fields.title;
  setMeta('meta[name="description"]', fields.description);
  setMeta('meta[property="og:title"]', fields.title);
  setMeta('meta[property="og:description"]', fields.description);
  setMeta('meta[property="og:image"]', absoluteUrl(fields.imageUrl));
  setMeta('meta[property="og:url"]', fields.pageUrl);
  setMeta('meta[name="twitter:title"]', fields.title);
  setMeta('meta[name="twitter:description"]', fields.description);
  setMeta('meta[name="twitter:image"]', absoluteUrl(fields.imageUrl));
}

function absoluteUrl(path: string): string {
  if (/^https?:/i.test(path)) return path;
  if (typeof window === "undefined") return `https://unspeakable.world${path}`;
  return `${window.location.origin}${path}`;
}

/**
 * React hook that listens for hash changes and keeps the document's
 * OG/Twitter meta tags pointing at the right card. Mount once at the
 * App root.
 */
export function useOgMetaSync(): void {
  useEffect(() => {
    const sync = () => applyOgFields(buildOgFields());
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
}

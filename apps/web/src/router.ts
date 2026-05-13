import { useSyncExternalStore } from "react";

/**
 * Hash-based router. No deps, no library.
 * `/#viewer` -> 'viewer'. Anything else -> 'landing'.
 *
 * Day 6 will extend this to deep-link camera state and selected objects.
 */

export type Route =
  | "landing"
  | "viewer"
  | "solar"
  | "surface"
  | "galactic"
  | "universe"
  | "sandbox"
  | "guide"
  | "class";

function getRoute(): Route {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  if (hash.startsWith("#class")) return "class";
  if (hash.startsWith("#guide")) return "guide";
  if (hash.startsWith("#sandbox")) return "sandbox";
  if (hash.startsWith("#universe")) return "universe";
  if (hash.startsWith("#galactic")) return "galactic";
  if (hash.startsWith("#surface")) return "surface";
  if (hash.startsWith("#solar")) return "solar";
  if (hash.startsWith("#viewer")) return "viewer";
  return "landing";
}

/**
 * Universe Mode v2 is now the front-door experience. When the user lands
 * on the bare root URL (no hash at all), redirect them to `/#universe`
 * unless they've explicitly opted into the marketing landing page via
 * `?landing=1`. The Hero CTA (owned by C1) routes to `/#universe`, so
 * direct visitors and shared social cards still see the marketing page —
 * only "naked" loads of the SPA front-door fall through to Universe.
 *
 * NOTE: this is intentionally a one-shot side effect, not a render-time
 * transform. We want existing routes (`/#solar`, `/#galactic`, etc.) to
 * continue resolving exactly as before — `App.tsx` owns the deprecation
 * upgrade for those.
 */
export function ensureUniverseDefault(): void {
  if (typeof window === "undefined") return;
  if (window.location.hash) return;
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    // Explicit opt-outs for the marketing page and embed flows.
    if (params.get("landing") === "1") return;
    if (params.get("embed") === "1") return;
  }
  // Use replaceState so the back button doesn't get a phantom `/` entry.
  window.history.replaceState(null, "", `${window.location.pathname}${search}#universe`);
}

/** For #surface/<planet>, return the planet name. */
export function surfacePlanet(): "Earth" | "Mars" | "Moon" {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  const m = hash.match(/^#surface\/(earth|mars|moon)/i);
  if (m && m[1]) {
    const k = m[1].toLowerCase();
    if (k === "mars") return "Mars";
    if (k === "moon") return "Moon";
  }
  return "Earth";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute, () => "landing");
}

/**
 * Embed mode. Detected from either:
 *   • `?embed=1` query param on the host page, OR
 *   • `#embed` token anywhere in the hash (e.g. `#embed`, `#viewer?embed=1`,
 *     `#solar?embed=1&focus=Saturn`).
 *
 * When embedded, the viewer renders chrome-less: no top bar, no left rail,
 * no overlays — just the scene + a tiny "Unspeakable World ↗" corner link
 * that opens the full app in a new tab. Keyboard / mouse interactivity
 * still works so the scene remains explorable inside the iframe.
 */
export function isEmbedMode(): boolean {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    if (params.get("embed") === "1") return true;
  }
  const hash = window.location.hash;
  if (!hash) return false;
  if (hash === "#embed" || hash.startsWith("#embed?")) return true;
  // Inside a sub-route's query string: `#viewer?embed=1&ra=…`
  const qIdx = hash.indexOf("?");
  if (qIdx !== -1) {
    const subParams = new URLSearchParams(hash.slice(qIdx + 1));
    if (subParams.get("embed") === "1") return true;
  }
  return false;
}

export function navigate(route: Route, planet?: "Earth" | "Mars" | "Moon"): void {
  if (route === "surface") {
    window.location.hash = `#surface/${(planet ?? "Earth").toLowerCase()}`;
    return;
  }
  if (route === "galactic") {
    window.location.hash = "#galactic";
    return;
  }
  if (route === "universe") {
    window.location.hash = "#universe";
    return;
  }
  if (route === "guide") {
    window.location.hash = "#guide";
    return;
  }
  if (route === "sandbox") {
    window.location.hash = "#sandbox";
    return;
  }
  window.location.hash =
    route === "solar" ? "#solar" : route === "viewer" ? "#viewer" : "";
}

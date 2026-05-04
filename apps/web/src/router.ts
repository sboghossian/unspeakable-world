import { useSyncExternalStore } from "react";

/**
 * Hash-based router. No deps, no library.
 * `/#viewer` -> 'viewer'. Anything else -> 'landing'.
 *
 * Day 6 will extend this to deep-link camera state and selected objects.
 */

export type Route = "landing" | "viewer" | "solar" | "surface";

function getRoute(): Route {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  if (hash.startsWith("#surface")) return "surface";
  if (hash.startsWith("#solar")) return "solar";
  if (hash.startsWith("#viewer")) return "viewer";
  return "landing";
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

export function navigate(route: Route, planet?: "Earth" | "Mars" | "Moon"): void {
  if (route === "surface") {
    window.location.hash = `#surface/${(planet ?? "Earth").toLowerCase()}`;
    return;
  }
  window.location.hash =
    route === "solar" ? "#solar" : route === "viewer" ? "#viewer" : "";
}

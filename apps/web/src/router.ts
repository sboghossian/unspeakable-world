import { useSyncExternalStore } from "react";

/**
 * Hash-based router. No deps, no library.
 * `/#viewer` -> 'viewer'. Anything else -> 'landing'.
 *
 * Day 6 will extend this to deep-link camera state and selected objects.
 */

export type Route = "landing" | "viewer";

function getRoute(): Route {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  return hash.startsWith("#viewer") ? "viewer" : "landing";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute, () => "landing");
}

export function navigate(route: Route): void {
  window.location.hash = route === "viewer" ? "#viewer" : "";
}

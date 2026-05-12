/**
 * Starlink opt-in TLE constellation — public entry.
 *
 * Fetches the Celestrak Starlink group (~6000 satellites), propagates
 * via SGP4 (`satellite.js`), and draws each satellite as a light-cyan
 * pinprick around Earth in solar mode.
 *
 * This layer is **off by default and gated behind a one-time visual-noise
 * warning** per the integration contract. The host must read
 * `LAYER_META.warning` and surface it next to the toggle. The module
 * never auto-enables.
 *
 * Refresh: 6 hours. SGP4 propagation runs at ~1 Hz inside the field
 * (throttled in starlink-field.ts).
 *
 * License: Celestrak data is free.
 */

import type { Group } from "three";
import { fetchStarlinkTles, type Tle } from "./celestrak-tle";
import { StarlinkField } from "./starlink-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 6 * 60 * 60 * 1000;

export const LAYER_META = {
  id: "starlink-optin",
  label: "Starlink constellation",
  icon: "≡",
  attribution: "Celestrak · free for any use",
  modes: ["solar"] as const,
  defaultEnabled: false,
  description: "All ~6000 Starlink satellites, propagated client-side via SGP4.",
  warning:
    "May significantly impact dark-sky observation. " +
    "Opt-in: shows the full Starlink shell around Earth.",
};

export type LayerMode = "sky" | "solar";

export type LayerHandle = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setTime?(ms: number): void;
  dispose(): void;
};

export type MountOpts = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

/**
 * Build a StarlinkField, attach to `parent`, return a handle.
 *
 * The TLE catalog is fetched on first enable (never on mount when the
 * layer is disabled — avoids paying ~600 KB of bandwidth for users who
 * never opt in). A 6-hour refresh interval kicks in once enabled.
 *
 * The host should call `setTime(ms)` on each frame (or each tick) with
 * the simulation time in milliseconds since epoch; that drives the
 * SGP4 propagation. If the host doesn't call `setTime`, the cloud
 * defaults to wall-clock time.
 */
export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new StarlinkField();
  opts.parent.add(field.group);

  let mode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let fetchInFlight = false;
  let tlesLoaded = false;
  let simTime = new Date();

  const applyVisibility = (): void => {
    field.setVisible(enabled && mode === "solar");
  };

  const refresh = async (): Promise<void> => {
    if (disposed || fetchInFlight) return;
    fetchInFlight = true;
    try {
      const tles: Tle[] = await fetchStarlinkTles();
      if (disposed) return;
      if (tles.length > 0) {
        field.setTles(tles);
        tlesLoaded = true;
      }
    } catch (err) {
      log.warn("[starlink-optin] refresh failed", err);
    } finally {
      fetchInFlight = false;
    }
  };

  const startPolling = (): void => {
    if (timer !== null) return;
    if (!tlesLoaded) void refresh();
    timer = setInterval(() => {
      void refresh();
    }, REFRESH_MS);
  };

  const stopPolling = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  applyVisibility();
  if (enabled && mode === "solar") startPolling();

  // Self-driven propagation tick. We don't depend on the host's rAF —
  // the field throttles to ~1 Hz internally.
  let raf = 0;
  const tick = (): void => {
    if (disposed) return;
    if (field.group.visible) field.update(simTime);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    setEnabled(v: boolean): void {
      if (disposed) return;
      enabled = v;
      applyVisibility();
      if (v && mode === "solar") startPolling();
      else stopPolling();
    },
    setMode(m: LayerMode): void {
      if (disposed) return;
      mode = m;
      applyVisibility();
      if (enabled && mode === "solar") startPolling();
      else stopPolling();
    },
    setTime(ms: number): void {
      if (Number.isFinite(ms)) simTime = new Date(ms);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopPolling();
      cancelAnimationFrame(raf);
      opts.parent.remove(field.group);
      field.dispose();
    },
  };
}

export { fetchStarlinkTles, parseTleText } from "./celestrak-tle";
export type { Tle } from "./celestrak-tle";
export { StarlinkField } from "./starlink-field";

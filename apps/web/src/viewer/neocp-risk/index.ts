/**
 * NEOCP / Sentry impact-risk layer — public entry.
 *
 * Surfaces JPL Sentry's cumulative impact-probability table as orange
 * diamond markers in solar mode. Markers are placed on a deterministic
 * pseudo-orbit (see risk-field.ts); the tooltip surfaces probability,
 * Torino, year window, size.
 *
 * Refresh: 30 minutes. JPL refreshes Sentry a few times a day at most.
 *
 * Source: NASA / JPL Sentry (public domain). MPC NEOCP tabular is
 * referenced in the proxy comments as the structural sibling but the
 * primary feed is Sentry because it exposes structured JSON.
 */

import type { Group } from "three";
import { fetchImpactRisks } from "./sentry-feed";
import { RiskField } from "./risk-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 30 * 60 * 1000;

export const LAYER_META = {
  id: "neocp-risk",
  label: "NEO impact risk (Sentry)",
  icon: "◆",
  attribution: "JPL Sentry · MPC NEOCP · public domain",
  modes: ["solar"] as const,
  defaultEnabled: false,
  description:
    "Near-Earth objects with non-zero cumulative impact probability. " +
    "Marker positions are symbolic (pseudo-orbits), not ephemerides.",
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

export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new RiskField();
  opts.parent.add(field.group);

  let mode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let fetchInFlight = false;

  const applyVisibility = (): void => {
    field.setVisible(enabled && mode === "solar");
  };

  const refresh = async (): Promise<void> => {
    if (disposed || fetchInFlight) return;
    fetchInFlight = true;
    try {
      const items = await fetchImpactRisks({ limit: 200 });
      if (disposed) return;
      field.setData(items);
    } catch (err) {
      log.warn("[neocp-risk] refresh failed", err);
    } finally {
      fetchInFlight = false;
    }
  };

  const startPolling = (): void => {
    if (timer !== null) return;
    void refresh();
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

  let raf = 0;
  const tick = (): void => {
    if (disposed) return;
    if (field.group.visible) field.update();
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
    setTime(_ms: number): void {
      // Marker positions are anchored to a deterministic hash of the
      // designation — no per-frame work needed.
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

export { fetchImpactRisks, FALLBACK_RISKS } from "./sentry-feed";
export type { ImpactRisk } from "./sentry-feed";
export { RiskField, pseudoOrbitPosition } from "./risk-field";

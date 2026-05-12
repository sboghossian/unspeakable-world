/**
 * ZTF / Lasair alert layer — public entry.
 *
 * Surfaces recent ZTF supernova candidates from the Lasair UK broker as
 * flashing markers on the celestial sphere (sky mode only). Pulls fresh
 * data every 5 minutes via the `/api/lasair` edge proxy.
 *
 * Source: Lasair (UK ZTF broker), open with attribution.
 *
 * The layer is OFF by default per the integration contract; the panel
 * toggles it via `setEnabled(true)` and the first enable kicks off the
 * initial fetch.
 */

import type { Group } from "three";
import { fetchRecentZtfAlerts } from "./lasair-feed";
import { ZtfField } from "./ztf-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 5 * 60 * 1000;

export const LAYER_META = {
  id: "ztf-alerts",
  label: "ZTF supernova alerts",
  icon: "★",
  attribution: "Lasair · ZTF · open w/ attribution",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Recent ZTF supernova candidates (class SN, p > 0.5, 30-day window).",
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
 * Build a ZtfField, attach to `parent`, return a handle. The first
 * enable triggers a fetch + sets up a 5-minute refresh interval; on
 * disable or dispose the interval is cleared and the field hidden.
 */
export function mountLayer(opts: MountOpts): LayerHandle {
  const field = new ZtfField();
  opts.parent.add(field.group);

  let mode: LayerMode = opts.mode;
  let enabled = opts.enabled;
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let fetchInFlight = false;

  const applyVisibility = (): void => {
    field.setVisible(enabled && mode === "sky");
  };

  const refresh = async (): Promise<void> => {
    if (disposed || fetchInFlight) return;
    fetchInFlight = true;
    try {
      const items = await fetchRecentZtfAlerts({ limit: 200 });
      if (disposed) return;
      field.setData(items);
    } catch (err) {
      log.warn("[ztf-alerts] refresh failed", err);
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
  if (enabled && mode === "sky") startPolling();

  // Drive the shader clock from rAF so the pulse animates even between
  // refreshes. We schedule a lightweight tick that no-ops when hidden.
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
      if (v && mode === "sky") startPolling();
      else stopPolling();
    },
    setMode(m: LayerMode): void {
      if (disposed) return;
      mode = m;
      applyVisibility();
      if (enabled && mode === "sky") startPolling();
      else stopPolling();
    },
    setTime(_ms: number): void {
      // ZTF detections are anchored to discovery time; no per-frame
      // re-projection is needed.
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

export { fetchRecentZtfAlerts } from "./lasair-feed";
export type { ZtfAlert } from "./lasair-feed";
export { ZtfField } from "./ztf-field";

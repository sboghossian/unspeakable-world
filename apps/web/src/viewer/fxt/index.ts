/**
 * Fast X-ray Transients (FXT) live-alerts layer — public entry.
 *
 * Hand-curated catalogue of ~25 well-localised FXTs (Einstein Probe,
 * Swift, Chandra archival, MAXI, magnetars, jetted TDEs, ...) drawn on
 * the celestial sphere as red-orange flashing markers (sky mode only).
 *
 * Refresh interval is 24 h — the curated set evolves slowly. The pulse
 * still fires on first mount so users see the markers appear.
 *
 * License: All entries are sourced from open-literature circulars
 * (ATel / GCN) and the Einstein Probe public alert tables.
 */

import type { Group } from "three";
import { fetchFxtEvents } from "./feed";
import { FxtField } from "./fxt-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 24 * 60 * 60 * 1000;

export const LAYER_META = {
  id: "fxt",
  label: "Fast X-ray transients",
  icon: "💥",
  attribution:
    "Einstein Probe / Swift / Chandra · curated from ATel + GCN circulars (open literature)",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Hand-curated catalogue of well-localised fast X-ray transients from Einstein Probe / Swift / Chandra / archival surveys.",
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
  const field = new FxtField();
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
      const items = await fetchFxtEvents();
      if (disposed) return;
      field.setData(items);
    } catch (err) {
      log.warn("[fxt] refresh failed", err);
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
      /* FXTs are anchored to discovery time. */
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

export { fetchFxtEvents } from "./feed";
export type { FxtEvent } from "./feed";
export { FxtField } from "./fxt-field";

/**
 * ATel (Astronomer's Telegram) live-alerts layer — public entry.
 *
 * Surfaces recent ATel bulletins that carry a parseable J2000 coordinate
 * as small flashing yellow markers on the celestial sphere (sky mode
 * only). Refreshed every 15 minutes via the rss2json public proxy of
 * the ATel RSS feed.
 *
 * License: ATel is open-access with attribution.
 */

import type { Group } from "three";
import { fetchAtelEvents } from "./feed";
import { AtelField } from "./atel-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 15 * 60 * 1000;

export const LAYER_META = {
  id: "atel",
  label: "ATel bulletins",
  icon: "📡",
  attribution: "Astronomer's Telegram · astronomerstelegram.org · open w/ attribution",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Recent Astronomer's Telegram bulletins whose RA/Dec parses out of the title or first paragraph. Refreshed every 15 minutes.",
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
  const field = new AtelField();
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
      const items = await fetchAtelEvents(80);
      if (disposed) return;
      field.setData(items);
    } catch (err) {
      log.warn("[atel] refresh failed", err);
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
      /* ATel events are anchored to issuance time. */
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

export { fetchAtelEvents } from "./feed";
export type { AtelEvent } from "./feed";
export { AtelField } from "./atel-field";

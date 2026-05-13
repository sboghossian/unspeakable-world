/**
 * BlackGEM live-alerts layer — public entry.
 *
 * Hand-curated catalogue of ~20 BlackGEM discovery alerts pulled from
 * GCN / ATel / TNS circulars, rendered as magenta markers on the
 * celestial sphere (sky mode only). A 30-minute polling loop probes
 * the CF Pages proxy at `/api/blackgem?endpoint=alerts` so a future
 * JSON wire-up can surface without code changes.
 *
 * License: Public alerts; attribution "BlackGEM Consortium".
 */

import type { Group } from "three";
import { fetchBlackGemEvents } from "./feed";
import { BlackGemField } from "./blackgem-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 30 * 60 * 1000;

export const LAYER_META = {
  id: "blackgem",
  label: "BlackGEM transient alerts",
  icon: "🔭",
  attribution: "BlackGEM Consortium · blackgem.org · open w/ attribution",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "BlackGEM optical transient discoveries (La Silla southern survey): kilonovae candidates, SNe, TDEs, GRB afterglows. Curated from GCN + TNS circulars.",
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
  const field = new BlackGemField();
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
      const items = await fetchBlackGemEvents();
      if (disposed) return;
      field.setData(items);
    } catch (err) {
      log.warn("[blackgem] refresh failed", err);
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
      /* BlackGEM alerts are anchored to discovery time. */
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

export { fetchBlackGemEvents } from "./feed";
export type { BlackGemEvent } from "./feed";
export { BlackGemField } from "./blackgem-field";

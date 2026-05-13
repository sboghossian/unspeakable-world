/**
 * GOTO (Gravitational-wave Optical Transient Observer) live-alerts
 * layer — public entry.
 *
 * Hand-curated catalogue of ~20 GOTO discovery alerts pulled from GCN /
 * ATel / TNS circulars, rendered as cyan markers on the celestial
 * sphere (sky mode only). A 30-minute polling loop probes the CF Pages
 * proxy at `/api/goto?endpoint=alerts` so any future JSON wire-up can
 * surface without touching the layer code.
 *
 * License: Public alerts; attribution "GOTO Collaboration".
 */

import type { Group } from "three";
import { fetchGotoEvents } from "./feed";
import { GotoField } from "./goto-field";
import { log } from "../../lib/logger";

const REFRESH_MS = 30 * 60 * 1000;

export const LAYER_META = {
  id: "goto",
  label: "GOTO transient alerts",
  icon: "🛰️",
  attribution: "GOTO Collaboration · goto-observatory.org · open w/ attribution",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "GOTO optical transient discoveries: kilonovae candidates, SNe, TDEs, GRB afterglows. Curated from GCN + TNS circulars (no public JSON yet).",
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
  const field = new GotoField();
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
      const items = await fetchGotoEvents();
      if (disposed) return;
      field.setData(items);
    } catch (err) {
      log.warn("[goto] refresh failed", err);
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
      /* GOTO alerts are anchored to discovery time. */
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

export { fetchGotoEvents } from "./feed";
export type { GotoEvent } from "./feed";
export { GotoField } from "./goto-field";

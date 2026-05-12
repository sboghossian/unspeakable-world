/**
 * 🌃 globe-at-night — federation module.
 *
 * Light-pollution glow overlay wrapped on Earth. Visible only in
 * `solar` mode (planetary scene). Caller positions / sizes the shell
 * via the returned `setEarthTransform` hook so the layer doesn't have
 * to import the host scene's Earth proxy.
 *
 * Source: Globe at Night campaign citizen-science archive +
 * NOAA VIIRS Day/Night Band composite (both public-domain).
 */
import type { Group } from "three";
import { LightPollutionLayer } from "./light-pollution-layer";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "globe-at-night",
  label: "Globe at Night",
  icon: "🌃",
  attribution:
    "Globe at Night / NOAA VIIRS Day-Night Band · public-domain US Government",
  modes: ["solar"] as const,
  defaultEnabled: false,
  description:
    "City-lights glow overlay on Earth, blending crowdsourced Globe at Night sky-brightness reports with the NOAA VIIRS night-lights composite.",
} as const;

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  setTime(ms: number): void;
  /** Caller invokes once Earth's world transform is known. */
  setEarthTransform(x: number, y: number, z: number, radius: number): void;
  dispose(): void;
};

export function mountLayer(opts: MountOptions): MountedLayer {
  const shell = new LightPollutionLayer();
  opts.parent.add(shell.group);

  let currentMode: LayerMode = opts.mode;
  let enabled = opts.enabled;

  const applyVisibility = (): void => {
    shell.setVisible(enabled && currentMode === "solar");
  };
  applyVisibility();

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      applyVisibility();
    },
    setMode(m: LayerMode): void {
      currentMode = m;
      applyVisibility();
    },
    setTime(ms: number): void {
      shell.setTime(ms);
    },
    setEarthTransform(x: number, y: number, z: number, radius: number): void {
      shell.setPosition(x, y, z);
      shell.setRadius(radius);
    },
    dispose(): void {
      opts.parent.remove(shell.group);
      shell.dispose();
    },
  };
}

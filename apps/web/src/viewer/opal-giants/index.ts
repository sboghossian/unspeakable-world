/**
 * 🪐 opal-giants — federation module.
 *
 * Wraps Jupiter and Saturn with HST OPAL (Outer Planet Atmospheres
 * Legacy) annual cylindrical maps. Visible only in `solar` mode. The
 * caller pumps planet positions / radii in via `setPlanetTransform`
 * so the module doesn't reach into the host scene.
 *
 * Source: STScI HLSP OPAL programme · public-domain US Government /
 * STScI archive.
 */
import type { Group } from "three";
import { OpalShell } from "./opal-shell";
import {
  OPAL_MAPS,
  latestMap,
  mapsForPlanet,
  type GiantTarget,
  type OpalMap,
} from "./opal-catalog";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "opal-giants",
  label: "OPAL Jupiter & Saturn",
  icon: "🪐",
  attribution:
    "NASA / ESA / STScI · HST OPAL programme · public domain",
  modes: ["solar"] as const,
  defaultEnabled: false,
  description:
    "Annual Hubble OPAL global maps of Jupiter and Saturn, wrapped on the solar-system planets as a time-sliced cloud-band overlay.",
} as const;

export { OPAL_MAPS, latestMap, mapsForPlanet };
export type { GiantTarget, OpalMap };

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
  /** Initial year — defaults to most recent. */
  year?: number;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  /** Override the year shown for both planets. */
  setYear(year: number): void;
  /** `setTime` mirrors the layer contract — derives the year from ms epoch. */
  setTime(ms: number): void;
  setPlanetTransform(
    target: GiantTarget,
    x: number,
    y: number,
    z: number,
    radius: number,
  ): void;
  dispose(): void;
};

export function mountLayer(opts: MountOptions): MountedLayer {
  const jupiter = new OpalShell("jupiter");
  const saturn = new OpalShell("saturn");
  opts.parent.add(jupiter.group);
  opts.parent.add(saturn.group);

  let enabled = opts.enabled;
  let currentMode: LayerMode = opts.mode;

  const initialYear =
    opts.year ?? latestMap("jupiter")?.year ?? latestMap("saturn")?.year ?? 2024;
  jupiter.setYear(initialYear);
  saturn.setYear(initialYear);

  const applyVisibility = (): void => {
    const on = enabled && currentMode === "solar";
    jupiter.setVisible(on);
    saturn.setVisible(on);
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
    setYear(year: number): void {
      jupiter.setYear(year);
      saturn.setYear(year);
    },
    setTime(ms: number): void {
      // ms epoch → UTC year. Done with Date so leap years etc. are
      // handled correctly; this is called rarely (once per frame at
      // most), no perf concern.
      const y = new Date(ms).getUTCFullYear();
      jupiter.setYear(y);
      saturn.setYear(y);
    },
    setPlanetTransform(
      target: GiantTarget,
      x: number,
      y: number,
      z: number,
      radius: number,
    ): void {
      const shell = target === "jupiter" ? jupiter : saturn;
      shell.setPosition(x, y, z);
      shell.setRadius(radius);
    },
    dispose(): void {
      opts.parent.remove(jupiter.group);
      opts.parent.remove(saturn.group);
      jupiter.dispose();
      saturn.dispose();
    },
  };
}

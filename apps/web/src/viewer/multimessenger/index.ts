/**
 * ◈ Multi-messenger astronomy module.
 *
 * Bundles four independent overlays — IceCube neutrinos, Pierre Auger
 * UHE cosmic rays, LIGO/Virgo GWTC-3 gravitational-wave events, and the
 * NANOGrav 15-year pulsar timing array — behind a single layer toggle
 * with four sub-layer checkboxes.
 *
 * Data is baked into `apps/web/public/data/multimessenger.json` by
 * `scripts/bake-multimessenger.ts`. Mount is fire-and-forget; the fetch
 * runs once the first time the layer is enabled, then results are reused
 * for the lifetime of the layer.
 */

import { Group } from "three";
import { log } from "../../lib/logger";
import { AugerLayer, type AugerEvent } from "./auger";
import { ChirpAudio } from "./chirp-audio";
import { IceCubeLayer, type IceCubeEvent } from "./icecube";
import { LigoLayer, type LigoEvent } from "./ligo";
import { NanoGravLayer, type NanoGravPulsar } from "./nanograv";

export type SubLayerId = "icecube" | "auger" | "ligo" | "nanograv";

export const LAYER_META = {
  id: "multimessenger",
  label: "Multi-messenger",
  icon: "◈",
  attribution:
    "IceCube · Pierre Auger · LIGO/Virgo · NANOGrav (all open / CC-BY)",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Neutrinos, UHE cosmic rays, gravitational waves, pulsar timing array.",
  subLayers: [
    { id: "icecube" as const, label: "IceCube ν events", color: "#4ec9ff" },
    { id: "auger" as const, label: "Auger UHECR", color: "#ffb24e" },
    { id: "ligo" as const, label: "LIGO GW events", color: "#c78bff" },
    { id: "nanograv" as const, label: "NANOGrav PTA", color: "#7cffa1" },
  ],
};

type MountedLayer = {
  setEnabled(v: boolean): void;
  setSubLayer(id: SubLayerId, on: boolean): void;
  setMode(m: "sky"): void;
  dispose(): void;
};

type DataPack = {
  version: 1;
  icecube: IceCubeEvent[];
  auger: AugerEvent[];
  ligo: LigoEvent[];
  nanograv: NanoGravPulsar[];
};

const DATA_URL = "/data/multimessenger.json";

export function mountLayer(opts: {
  parent: Group;
  mode: "sky";
  enabled: boolean;
}): MountedLayer {
  const root = new Group();
  root.name = "MultiMessenger";
  root.visible = opts.enabled;
  opts.parent.add(root);

  const ice = new IceCubeLayer();
  const auger = new AugerLayer();
  const ligo = new LigoLayer();
  const nano = new NanoGravLayer();
  const chirp = new ChirpAudio();

  root.add(ice.group);
  root.add(auger.group);
  root.add(ligo.group);
  root.add(nano.group);

  // Sub-layer toggles — all on by default; user can turn individual ones off.
  const subOn: Record<SubLayerId, boolean> = {
    icecube: true,
    auger: true,
    ligo: true,
    nanograv: true,
  };

  let enabled = opts.enabled;
  let loaded = false;
  let loading = false;
  let disposed = false;
  let raf = 0;

  function applyVisibility(): void {
    root.visible = enabled;
    ice.setVisible(enabled && subOn.icecube);
    auger.setVisible(enabled && subOn.auger);
    ligo.setVisible(enabled && subOn.ligo);
    nano.setVisible(enabled && subOn.nanograv);
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded || loading || disposed) return;
    loading = true;
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pack = (await res.json()) as DataPack;
      if (disposed) return;
      ice.setData(pack.icecube ?? []);
      auger.setData(pack.auger ?? []);
      ligo.setData(pack.ligo ?? []);
      nano.setData(pack.nanograv ?? []);
      loaded = true;
      applyVisibility();
    } catch (err) {
      log.warn("[multimessenger] data load failed", err);
    } finally {
      loading = false;
    }
  }

  function tick(): void {
    if (disposed) return;
    if (enabled && loaded && subOn.icecube) ice.update();
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  if (enabled) void ensureLoaded();

  // Expose helpers on the root group so the host viewer can wire picks.
  // We hang an `mmApi` property the host can read by name without an import.
  (root as unknown as { mmApi: MultiMessengerApi }).mmApi = {
    pickLigo: (ndc, camera) => ligo.pick(ndc, camera),
    playChirp: (m1, m2) => chirp.play(m1, m2),
    setChirpMuted: (m) => chirp.setMuted(m),
    isChirpMuted: () => chirp.isMuted(),
  };

  return {
    setEnabled(v: boolean): void {
      enabled = v;
      if (v) void ensureLoaded();
      applyVisibility();
    },
    setSubLayer(id: SubLayerId, on: boolean): void {
      subOn[id] = on;
      applyVisibility();
    },
    setMode(_m: "sky"): void {
      // Single mode for v1 — no-op. Kept for contract symmetry.
    },
    dispose(): void {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ice.dispose();
      auger.dispose();
      ligo.dispose();
      nano.dispose();
      chirp.dispose();
      opts.parent.remove(root);
    },
  };
}

/**
 * Optional host-facing handle exposed on the mounted group as `mmApi`.
 * Lets the click/picker code in the host viewer play chirps without
 * dragging a typed import through the public contract.
 */
export type MultiMessengerApi = {
  pickLigo: (
    ndc: import("three").Vector2,
    camera: import("three").Camera,
  ) => LigoEvent | null;
  playChirp: (m1Source: number, m2Source: number) => boolean;
  setChirpMuted: (muted: boolean) => void;
  isChirpMuted: () => boolean;
};

export type { AugerEvent, IceCubeEvent, LigoEvent, NanoGravPulsar };

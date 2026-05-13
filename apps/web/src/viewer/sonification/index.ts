/**
 * 🎶 Sonification layer — turn the visible sky into an ambient soundscape.
 *
 * Unlike every other extra layer, this module renders ZERO scene
 * geometry. It still implements the `LAYER_META + mountLayer()` contract
 * so it appears in the ✨ layers panel as a toggle: when enabled, a
 * companion React panel (`ui/SonificationControls.tsx`) shows the
 * play/mute/instrument/key/tempo controls.
 *
 * The `getApi()` host returns the singleton `SonificationEngine` so the
 * panel can drive it directly without going through the layer handle.
 *
 * Safety: the engine is MUTED BY DEFAULT and the AudioContext starts
 * suspended. Audio only plays after the user presses ▶ in the panel
 * (required by browser autoplay policies).
 */

import { Group } from "three";

import { getSonificationEngine, type SonificationEngine } from "./engine";

export type LayerMode = "sky" | "solar" | "galactic" | "universe";

export const LAYER_META = {
  id: "sonification",
  label: "Sky Sonification",
  icon: "🎶",
  attribution:
    "Sonification synth · pure Web Audio · The Unspeakable World (MIT)",
  modes: ["sky"] as const,
  defaultEnabled: false,
  description:
    "Turn the visible sky into music. Bright stars → drone pad, pulsars → kick drum, Messier objects → bell tones, GW events → bass swell. Muted by default — open the panel and press ▶ to listen.",
} as const;

export type SonificationApi = {
  getEngine(): SonificationEngine;
};

export type MountOptions = {
  parent: Group;
  mode: LayerMode;
  enabled: boolean;
};

export type MountedLayer = {
  setEnabled(v: boolean): void;
  setMode(m: LayerMode): void;
  getApi(): SonificationApi;
  dispose(): void;
};

export function mountLayer(opts: MountOptions): MountedLayer {
  // Tiny placeholder group so the extras-mount machinery is happy.
  // No meshes — the "layer" is purely an audio engine.
  const root = new Group();
  root.name = "Sonification";
  root.visible = false; // never any visuals to show
  opts.parent.add(root);

  const engine = getSonificationEngine();

  let enabled = opts.enabled;
  let disposed = false;

  function setEnabled(v: boolean): void {
    if (disposed) return;
    enabled = v;
    // When the layer is disabled, ensure audio is paused — user
    // disabling the toggle should hard-stop any ongoing playback.
    if (!enabled) {
      engine.pause();
    }
  }

  return {
    setEnabled,
    setMode() {
      // No-op: sonification works the same regardless of camera mode.
    },
    getApi(): SonificationApi {
      return {
        getEngine: () => engine,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        engine.pause();
      } catch {
        // best-effort — never throw on teardown
      }
      opts.parent.remove(root);
    },
  };
}

export { type SonificationEngine };

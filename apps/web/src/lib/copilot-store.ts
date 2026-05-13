import { create } from "zustand";
import type { CopilotHost } from "../viewer/copilot";
import type { SceneContext } from "../viewer/copilot/types";

/**
 * 🧠 Global Cosmic Copilot state.
 *
 * Wave B hoisted the Copilot mount from `Viewer.tsx` (where it was the
 * only caller) into `App.tsx` so the same panel is reachable from
 * Universe, Solar Flight, Galactic, Sandbox, and PlanetSurface. Each
 * mode's top bar just calls `setOpen(true)`; the actual panel mount
 * lives at the App root.
 *
 * The Sky viewer has a fully-wired `CopilotHost` (flyTo / setLayer /
 * setOverlay / setTime / setMode + a per-render SceneContext). It
 * pushes both into this store on mount; the global panel reads them
 * back when it renders. Modes without a host fall back to a minimal
 * read-only context (the panel still works — it just can't drive the
 * scene).
 */
export type CopilotMode =
  | "viewer"
  | "universe"
  | "solar"
  | "galactic"
  | "sandbox"
  | "surface";

type CopilotStore = {
  open: boolean;
  currentMode: CopilotMode | null;
  /** Optional seed question forwarded from the SkyInfoPanel etc. */
  seed: string | null;
  /** Currently-published CopilotHost (if any mode has wired one). */
  host: CopilotHost | null;
  /** Currently-published SceneContext (rebuilt by the scene on each render). */
  context: SceneContext | null;
  setOpen: (open: boolean) => void;
  setMode: (mode: CopilotMode | null) => void;
  setSeed: (seed: string | null) => void;
  setHost: (host: CopilotHost | null) => void;
  setContext: (context: SceneContext | null) => void;
  /** Convenience: open the panel and (optionally) seed it with a question. */
  openWith: (seed?: string | null) => void;
};

export const useCopilotStore = create<CopilotStore>((set) => ({
  open: false,
  currentMode: null,
  seed: null,
  host: null,
  context: null,
  setOpen: (open) => set({ open }),
  setMode: (currentMode) => set({ currentMode }),
  setSeed: (seed) => set({ seed }),
  setHost: (host) => set({ host }),
  setContext: (context) => set({ context }),
  openWith: (seed = null) => set({ open: true, seed }),
}));

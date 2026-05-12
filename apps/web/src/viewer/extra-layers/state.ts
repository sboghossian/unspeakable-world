import { create } from "zustand";

/**
 * 🐻 Tiny zustand store backing the federated "extra layers" toggle
 * panel. Replaces the prior pattern of "everyone polls localStorage
 * every 750 ms" — components now subscribe directly and re-render
 * exactly when a layer's enabled bit flips.
 *
 * Persistence semantics are kept byte-compatible with the old code:
 *   • Storage key: `uw:extra-layers:v1` (unchanged)
 *   • Shape: `{ [layerId: string]: boolean }` (unchanged)
 *   • Writes are debounced 200 ms so a flurry of toggles is one set.
 *
 * The `storage` event listener also rehydrates the store when the same
 * key is touched in another tab — keeps multi-tab sessions consistent
 * without polling.
 */

const STORAGE_KEY = "uw:extra-layers:v1";
const PERSIST_DEBOUNCE_MS = 200;

type EnabledMap = Record<string, boolean>;

type State = {
  enabled: EnabledMap;
  toggle: (id: string) => void;
  set: (id: string, on: boolean) => void;
  replace: (next: EnabledMap) => void;
};

function readFromStorage(): EnabledMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Sanitize: only keep boolean values so a stray legacy field
      // can't poison downstream hooks.
      const out: EnabledMap = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "boolean") out[k] = v;
      }
      return out;
    }
  } catch {
    // privacy mode / parse error — fall through to empty
  }
  return {};
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(value: EnabledMap): void {
  if (typeof window === "undefined") return;
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // quota / privacy mode — ignore
    }
  }, PERSIST_DEBOUNCE_MS);
}

export const useExtraLayersStore = create<State>((set, get) => ({
  enabled: readFromStorage(),
  toggle: (id) => {
    const prev = get().enabled;
    const next: EnabledMap = { ...prev, [id]: !prev[id] };
    set({ enabled: next });
    schedulePersist(next);
  },
  set: (id, on) => {
    const prev = get().enabled;
    if (prev[id] === on) return;
    const next: EnabledMap = { ...prev, [id]: on };
    set({ enabled: next });
    schedulePersist(next);
  },
  replace: (next) => {
    // Defensive copy — callers may pass references they later mutate.
    const copy: EnabledMap = { ...next };
    set({ enabled: copy });
    schedulePersist(copy);
  },
}));

// Cross-tab sync: when another tab writes the same key, rehydrate. We
// avoid bouncing this back to localStorage by skipping the debounced
// writer here.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = readFromStorage();
    useExtraLayersStore.setState({ enabled: next });
  });
}

/**
 * Subscribe to a single layer's enabled bit. Selecting a primitive
 * means zustand bails out of re-rendering unless that specific bit
 * flips — cheap to use in every panel that cares about exactly one
 * layer (MarsRoverInspectorCard, MultimessengerControls, …).
 */
export function useExtraLayerEnabled(id: string): boolean {
  return useExtraLayersStore((s) => s.enabled[id] === true);
}

/**
 * Subscribe to the entire enabled map. Returned object reference is
 * stable across renders when no toggle changes (zustand default
 * shallow-ish equality on the slice — we return the same Record
 * reference until `set`/`toggle`/`replace` lands a new one).
 */
export function useExtraLayers(): EnabledMap {
  return useExtraLayersStore((s) => s.enabled);
}

/**
 * Non-React getter for scene-side code or one-shot reads. Mirrors the
 * `getSettings()` pattern in `lib/settings.ts`.
 */
export function getExtraLayers(): EnabledMap {
  return useExtraLayersStore.getState().enabled;
}

/**
 * Imperative subscribe — useful for tests or non-React glue. Returns
 * the unsubscribe thunk.
 */
export function subscribeExtraLayers(
  cb: (next: EnabledMap) => void,
): () => void {
  return useExtraLayersStore.subscribe((s) => cb(s.enabled));
}


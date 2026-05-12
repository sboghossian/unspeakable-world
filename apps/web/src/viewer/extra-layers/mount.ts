/**
 * Generic mount helper used by every scene class (sky / solar /
 * galactic / universe). Returns a controller synchronously, but defers
 * the dynamic `import()` of each layer module until `setEnabled(id,
 * true)` is called for the first time. This shrinks the viewer entry
 * chunk dramatically — each module gets its own async chunk loaded on
 * demand.
 *
 * Behavior:
 *   - `listMounted()` returns the meta of every layer the registry
 *     advertises for this mode (even ones whose module hasn't loaded).
 *     This keeps the UI panel populated immediately.
 *   - `listLoaded()` returns only metas whose modules are loaded.
 *   - `setEnabled(id, true)` triggers the dynamic import on first call,
 *     then calls `mountLayer({...})` on the loaded module.
 *   - `setEnabled(id, false)` either hides an already-mounted handle
 *     (cheap, preserves resources) or — if the import is still
 *     in flight — flips the pending "desired" state so the handle is
 *     told `setEnabled(false)` the instant it lands. We DO NOT dispose
 *     here; the resource cost of keeping an idle Three.js Group in the
 *     graph is negligible and re-loads would be wasteful.
 *   - `dispose()` disposes every loaded handle.
 *
 * If any individual module throws during dynamic import or mount we
 * log + skip it; one misbehaving overlay should not take down the
 * whole scene.
 */

import { Group, type Object3D } from "three";

import { log } from "../../lib/logger";
import {
  EXTRA_LAYERS,
  type ExtraLayerModule,
  type LayerEntry,
  type LayerHandle,
  type LayerMeta,
  type LayerMode,
} from "./registry";

export type MountedExtra = {
  readonly entry: LayerEntry;
  readonly meta: LayerMeta;
  readonly handle: LayerHandle;
};

export type ExtrasController = {
  /** Parent group that hosts every mounted extra layer. */
  readonly group: Group;
  /**
   * Meta records for every layer the registry advertises in this mode,
   * regardless of whether their module has been loaded yet. Used by the
   * UI panel to list available toggles.
   */
  listMounted(): LayerMeta[];
  /** Meta records for layers whose module has been dynamically loaded. */
  listLoaded(): LayerMeta[];
  /**
   * Toggles a layer. First `true` call triggers the dynamic import.
   * Subsequent calls just flip the handle's visibility.
   *
   * Returns a promise that resolves once the underlying import (if
   * any) has settled. Scene code currently ignores this; the panel
   * uses it to clear its loading spinner.
   */
  setEnabled(id: string, enabled: boolean): Promise<void>;
  setSubLayer(layerId: string, subId: string, on: boolean): void;
  setMode(mode: LayerMode): void;
  setTime(ms: number): void;
  /**
   * Return the layer-specific host API (if the module is loaded and the
   * handle exposes one). Used by React panels that need to drive
   * module-specific behavior, e.g. playing a LIGO chirp or subscribing
   * to Mars rover photos.
   */
  getLayerApi(id: string): unknown;
  /**
   * Trigger the dynamic import for a layer without enabling it. Resolves
   * when the module is mounted (or has already loaded). Useful when a
   * React panel needs `getLayerApi()` to return non-null.
   */
  ensureLoaded(id: string): Promise<void>;
  dispose(): void;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading"; promise: Promise<void>; desiredEnabled: boolean }
  | { kind: "loaded"; mounted: MountedExtra }
  | { kind: "failed" };

export function mountExtrasInto(
  parent: Object3D,
  mode: LayerMode,
): ExtrasController {
  const group = new Group();
  group.name = `extra-layers/${mode}`;
  parent.add(group);

  // Entries advertised for this mode. Map of id → entry + load state.
  const entries: LayerEntry[] = EXTRA_LAYERS.filter((e) =>
    e.meta.modes.includes(mode),
  );
  const state = new Map<string, LoadState>();
  for (const e of entries) state.set(e.id, { kind: "idle" });

  // Last known mode/time so newly-loaded handles can catch up.
  let currentMode: LayerMode = mode;
  let currentTime: number | null = null;

  const ensureLoaded = (entry: LayerEntry): Promise<void> => {
    const cur = state.get(entry.id);
    if (!cur) return Promise.resolve();
    if (cur.kind === "loaded" || cur.kind === "failed") {
      return Promise.resolve();
    }
    if (cur.kind === "loading") return cur.promise;

    const promise = entry
      .loader()
      .then((mod) => {
        // Handle the race: caller may have flipped desiredEnabled to
        // false before the import resolved.
        const snapshot = state.get(entry.id);
        const desired =
          snapshot?.kind === "loading" ? snapshot.desiredEnabled : false;
        try {
          const handle = mod.mountLayer({
            parent: group,
            mode: currentMode,
            // Mount with enabled=false then immediately apply desired
            // so the layer's first setEnabled call is the canonical one.
            enabled: false,
          });
          // Sync mode + time so newly-loaded handles are caught up.
          try {
            handle.setMode?.(currentMode);
          } catch (err) {
            log.warn(
              `[extra-layers] post-load setMode failed: ${entry.id}`,
              err,
            );
          }
          if (currentTime !== null) {
            try {
              handle.setTime?.(currentTime);
            } catch {
              // setTime fires at 60Hz once mounted; silent.
            }
          }
          try {
            handle.setEnabled(desired);
          } catch (err) {
            log.warn(
              `[extra-layers] post-load setEnabled failed: ${entry.id}`,
              err,
            );
          }
          state.set(entry.id, {
            kind: "loaded",
            mounted: { entry, meta: entry.meta, handle },
          });
        } catch (err) {
          log.warn(`[extra-layers] mount failed: ${entry.id}`, err);
          state.set(entry.id, { kind: "failed" });
        }
      })
      .catch((err: unknown) => {
        log.warn(`[extra-layers] dynamic import failed: ${entry.id}`, err);
        state.set(entry.id, { kind: "failed" });
      });

    state.set(entry.id, { kind: "loading", promise, desiredEnabled: false });
    return promise;
  };

  const eachLoaded = (fn: (m: MountedExtra) => void): void => {
    state.forEach((s) => {
      if (s.kind === "loaded") fn(s.mounted);
    });
  };

  return {
    group,
    listMounted() {
      return entries.map((e) => e.meta);
    },
    listLoaded() {
      const out: LayerMeta[] = [];
      state.forEach((s) => {
        if (s.kind === "loaded") out.push(s.mounted.meta);
      });
      return out;
    },
    async setEnabled(id, enabled) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      const cur = state.get(id);
      if (!cur) return;

      if (cur.kind === "failed") {
        // Nothing we can do — module never loaded. Toggle is a no-op.
        return;
      }

      if (cur.kind === "loaded") {
        try {
          cur.mounted.handle.setEnabled(enabled);
        } catch (err) {
          log.warn(`[extra-layers] setEnabled failed: ${id}`, err);
        }
        return;
      }

      if (cur.kind === "loading") {
        // Race: import in flight, update the desired state so the
        // resolution path applies the latest user intent.
        state.set(id, { ...cur, desiredEnabled: enabled });
        return cur.promise;
      }

      // kind === "idle"
      if (!enabled) {
        // Don't trigger an import just to disable an unloaded layer.
        return;
      }
      // Seed desired BEFORE awaiting so a fast off-toggle on the same
      // tick is reflected when the promise resolves.
      const promise = ensureLoaded(entry);
      const seeded = state.get(id);
      if (seeded?.kind === "loading") {
        state.set(id, { ...seeded, desiredEnabled: true });
      }
      return promise;
    },
    setSubLayer(layerId, subId, on) {
      const cur = state.get(layerId);
      if (cur?.kind !== "loaded") return;
      const handle = cur.mounted.handle;
      if (!handle.setSubLayer) return;
      try {
        handle.setSubLayer(subId, on);
      } catch (err) {
        log.warn(
          `[extra-layers] setSubLayer failed: ${layerId}/${subId}`,
          err,
        );
      }
    },
    setMode(m) {
      currentMode = m;
      eachLoaded((rec) => {
        try {
          rec.handle.setMode?.(m);
        } catch (err) {
          log.warn(`[extra-layers] setMode failed: ${rec.meta.id}`, err);
        }
      });
    },
    setTime(ms) {
      currentTime = ms;
      eachLoaded((rec) => {
        try {
          rec.handle.setTime?.(ms);
        } catch {
          // Time-driven layers fail silently — too noisy at 60 Hz.
        }
      });
    },
    getLayerApi(id) {
      const cur = state.get(id);
      if (cur?.kind !== "loaded") return null;
      const handle = cur.mounted.handle;
      if (!handle.getApi) return null;
      try {
        return handle.getApi();
      } catch (err) {
        log.warn(`[extra-layers] getApi failed: ${id}`, err);
        return null;
      }
    },
    async ensureLoaded(id) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      const cur = state.get(id);
      if (cur?.kind === "loaded" || cur?.kind === "failed") return;
      await ensureLoaded(entry);
    },
    dispose() {
      eachLoaded((rec) => {
        try {
          rec.handle.dispose();
        } catch (err) {
          log.warn(`[extra-layers] dispose failed: ${rec.meta.id}`, err);
        }
      });
      state.clear();
      parent.remove(group);
    },
  };
}

export type { ExtraLayerModule };

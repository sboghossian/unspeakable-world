/**
 * Generic mount helper used by every scene class (sky / solar /
 * galactic / universe). Walks the EXTRA_LAYERS registry, mounts every
 * module whose `modes` array contains the given mode, returns a small
 * controller for toggling them by id.
 *
 * If any individual module throws during mount we log + skip it; one
 * misbehaving overlay should not take down the whole scene.
 */

import { Group, type Object3D } from "three";

import { log } from "../../lib/logger";
import {
  EXTRA_LAYERS,
  type ExtraLayerModule,
  type LayerHandle,
  type LayerMeta,
  type LayerMode,
} from "./registry";

export type MountedExtra = {
  readonly module: ExtraLayerModule;
  readonly meta: LayerMeta;
  readonly handle: LayerHandle;
};

export type ExtrasController = {
  /** Parent group that hosts every mounted extra layer. */
  readonly group: Group;
  /** Map of layer id → mounted record. */
  readonly mounted: ReadonlyMap<string, MountedExtra>;
  setEnabled(id: string, enabled: boolean): void;
  setSubLayer(layerId: string, subId: string, on: boolean): void;
  setMode(mode: LayerMode): void;
  setTime(ms: number): void;
  /** Meta records for currently-mounted layers (helpful for UI lists). */
  listMounted(): LayerMeta[];
  dispose(): void;
};

export function mountExtrasInto(
  parent: Object3D,
  mode: LayerMode,
): ExtrasController {
  const group = new Group();
  group.name = `extra-layers/${mode}`;
  parent.add(group);

  const mounted = new Map<string, MountedExtra>();

  for (const mod of EXTRA_LAYERS) {
    if (!mod.LAYER_META.modes.includes(mode)) continue;
    try {
      const handle = mod.mountLayer({
        parent: group,
        mode,
        enabled: false, // start all off; toggles drive enable
      });
      mounted.set(mod.LAYER_META.id, {
        module: mod,
        meta: mod.LAYER_META,
        handle,
      });
    } catch (err) {
      log.warn(`[extra-layers] mount failed: ${mod.LAYER_META.id}`, err);
    }
  }

  return {
    group,
    mounted,
    setEnabled(id, enabled) {
      const rec = mounted.get(id);
      if (!rec) return;
      try {
        rec.handle.setEnabled(enabled);
      } catch (err) {
        log.warn(`[extra-layers] setEnabled failed: ${id}`, err);
      }
    },
    setSubLayer(layerId, subId, on) {
      const rec = mounted.get(layerId);
      if (!rec?.handle.setSubLayer) return;
      try {
        rec.handle.setSubLayer(subId, on);
      } catch (err) {
        log.warn(
          `[extra-layers] setSubLayer failed: ${layerId}/${subId}`,
          err,
        );
      }
    },
    setMode(m) {
      mounted.forEach((rec) => {
        try {
          rec.handle.setMode?.(m);
        } catch (err) {
          log.warn(`[extra-layers] setMode failed: ${rec.meta.id}`, err);
        }
      });
    },
    setTime(ms) {
      mounted.forEach((rec) => {
        try {
          rec.handle.setTime?.(ms);
        } catch {
          // Time-driven layers fail silently — too noisy at 60 Hz.
        }
      });
    },
    listMounted() {
      return Array.from(mounted.values()).map((m) => m.meta);
    },
    dispose() {
      mounted.forEach((rec) => {
        try {
          rec.handle.dispose();
        } catch (err) {
          log.warn(`[extra-layers] dispose failed: ${rec.meta.id}`, err);
        }
      });
      mounted.clear();
      parent.remove(group);
    },
  };
}

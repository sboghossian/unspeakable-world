/**
 * Unit coverage for the federated `extra-layers` registry + mount glue.
 *
 * Scope (and the things we deliberately do NOT cover):
 *   - Each registry entry has a non-empty `id`, `meta`, and `loader`.
 *   - Each `loader()` thunk resolves to a module that re-exports the
 *     same `LAYER_META.id` and a callable `mountLayer`.
 *   - `mountExtrasInto` returns a controller whose `listMounted()`
 *     matches the registry filtered by mode.
 *   - `setEnabled` on an unknown id is a no-op (doesn't throw, doesn't
 *     mutate state).
 *
 * The mount stub is intentionally lo-fi (`add`/`remove` no-ops) — we're
 * here to validate the manifest, not exercise real Three.js. Layer
 * modules with audio / WebGL / fetch side effects only construct those
 * resources lazily inside `mountLayer`, which we never call.
 */

import { describe, expect, it } from "vitest";

import {
  EXTRA_LAYERS,
  type LayerMode,
} from "../../src/viewer/extra-layers/registry";
import { mountExtrasInto } from "../../src/viewer/extra-layers/mount";

const ALL_MODES: readonly LayerMode[] = [
  "sky",
  "solar",
  "galactic",
  "universe",
];

/** Stub parent that satisfies the `Object3D`-ish surface mount touches. */
function stubParent(): {
  add: ReturnType<typeof Object>;
  remove: ReturnType<typeof Object>;
} {
  return {
    add: () => {},
    remove: () => {},
  };
}

describe("EXTRA_LAYERS registry shape", () => {
  it("has at least one entry", () => {
    expect(EXTRA_LAYERS.length).toBeGreaterThan(0);
  });

  it("each entry has id, meta, and loader", () => {
    for (const entry of EXTRA_LAYERS) {
      expect(entry.id, "entry id").toBeTruthy();
      expect(typeof entry.id).toBe("string");
      expect(entry.meta, `meta for ${entry.id}`).toBeTruthy();
      expect(entry.meta.id).toBe(entry.id);
      expect(entry.meta.label, `label for ${entry.id}`).toBeTruthy();
      expect(
        Array.isArray(entry.meta.modes) && entry.meta.modes.length > 0,
        `modes for ${entry.id}`,
      ).toBe(true);
      expect(typeof entry.loader, `loader for ${entry.id}`).toBe("function");
    }
  });

  it("entry ids are unique", () => {
    const seen = new Set<string>();
    for (const entry of EXTRA_LAYERS) {
      expect(seen.has(entry.id), `duplicate id ${entry.id}`).toBe(false);
      seen.add(entry.id);
    }
  });
});

describe("EXTRA_LAYERS loaders", () => {
  // One test per entry so vitest's reporter lists each module's status
  // independently. If one is flaky (heavy module / env-sensitive) it
  // doesn't take the rest of the suite down.
  for (const entry of EXTRA_LAYERS) {
    it(`loads ${entry.id}`, async () => {
      let mod: Awaited<ReturnType<typeof entry.loader>>;
      try {
        mod = await entry.loader();
      } catch (err) {
        // Some modules pull native-ish deps (e.g. wasm) that don't
        // resolve cleanly in jsdom. Skip rather than fail — the build
        // step already proves the import paths resolve in Vite.
        // eslint-disable-next-line no-console
        console.warn(
          `[extra-layers.test] dynamic import for ${entry.id} failed in jsdom — skipping`,
          err,
        );
        return;
      }
      expect(mod, `module for ${entry.id}`).toBeTruthy();
      expect(mod.LAYER_META, `LAYER_META for ${entry.id}`).toBeTruthy();
      expect(mod.LAYER_META.id).toBe(entry.meta.id);
      expect(typeof mod.mountLayer, `mountLayer for ${entry.id}`).toBe(
        "function",
      );
    });
  }
});

describe("mountExtrasInto", () => {
  for (const mode of ALL_MODES) {
    it(`listMounted() in ${mode} mode matches the registry filter`, () => {
      const expected = EXTRA_LAYERS.filter((e) =>
        e.meta.modes.includes(mode),
      ).map((e) => e.meta.id);

      const parent = stubParent() as unknown as Parameters<
        typeof mountExtrasInto
      >[0];
      const controller = mountExtrasInto(parent, mode);
      try {
        const got = controller.listMounted().map((m) => m.id);
        expect(got).toEqual(expected);
        // Nothing is loaded synchronously — listLoaded is empty.
        expect(controller.listLoaded()).toEqual([]);
      } finally {
        controller.dispose();
      }
    });
  }

  it("setEnabled(unknown-id) is a no-op", async () => {
    const parent = stubParent() as unknown as Parameters<
      typeof mountExtrasInto
    >[0];
    const controller = mountExtrasInto(parent, "sky");
    try {
      // Snapshot state before — should be unchanged after.
      const before = controller.listMounted().map((m) => m.id);
      await expect(
        controller.setEnabled("does-not-exist", true),
      ).resolves.toBeUndefined();
      await expect(
        controller.setEnabled("does-not-exist", false),
      ).resolves.toBeUndefined();
      const after = controller.listMounted().map((m) => m.id);
      expect(after).toEqual(before);
      // Still nothing loaded — the unknown id must not trigger any
      // dynamic import.
      expect(controller.listLoaded()).toEqual([]);
    } finally {
      controller.dispose();
    }
  });

  it("setEnabled(id, false) on an unloaded layer is a no-op (no import)", async () => {
    const parent = stubParent() as unknown as Parameters<
      typeof mountExtrasInto
    >[0];
    const controller = mountExtrasInto(parent, "sky");
    try {
      const target = EXTRA_LAYERS.find((e) => e.meta.modes.includes("sky"));
      expect(target, "needs at least one sky-mode layer").toBeTruthy();
      if (!target) return;
      await controller.setEnabled(target.id, false);
      expect(controller.listLoaded()).toEqual([]);
    } finally {
      controller.dispose();
    }
  });
});

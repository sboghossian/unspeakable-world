import { defineConfig } from "vitest/config";

/**
 * Vitest config — kept intentionally narrow.
 *
 * Scope:
 *   - Unit tests under `tests/unit/**` only. Smoke / e2e lives in
 *     Playwright (`tests/smoke`, run via `pnpm test:smoke`).
 *   - jsdom environment so the registry's dynamic imports can touch
 *     DOM globals without exploding.
 *   - Test timeout bumped to 30s — each registry entry triggers a
 *     dynamic import that, in turn, drags in three / shaders /
 *     domain helpers. Cold-import latency dominates.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/smoke/**", "node_modules/**", "dist/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["tests/setup.ts"],
    css: false,
    reporters: "default",
  },
});

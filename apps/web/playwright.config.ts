import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — single chromium project, web server boots
 * `vite preview` (post-build) so the smoke test exercises the real
 * production bundle.
 *
 * Note: `vite preview` honors `server.port` in `vite.config.ts` (4500)
 * via the underlying preview server when no `--port` is passed. We pin
 * an explicit port here that doesn't collide with dev (4500) so a
 * developer running `pnpm dev` in parallel doesn't block the smoke
 * test. `strictPort: false` (the Vite preview default) means Vite will
 * pick the next free port if 4173 is taken; Playwright will only see
 * the wired-up URL succeed once the actual server is reachable.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});

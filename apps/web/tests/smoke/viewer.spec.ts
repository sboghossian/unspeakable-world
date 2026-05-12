/**
 * Viewer smoke test.
 *
 * Boots the production preview (via Playwright's webServer), navigates
 * to `/#viewer`, waits for the canvas to render, opens the ✨ Extra
 * Layers panel, toggles three federated layers (gaia-stars, chandra,
 * multimessenger), and asserts no uncaught console errors fire during
 * the 5s observation window. A screenshot of the final state is
 * saved to `apps/web/tests/screenshots/sky.png` for visual review.
 *
 * Allowlist: we ignore a few classes of warning-level chatter that are
 * acceptable for a federated viewer (e.g. Three.js renderer extension
 * messages, dev-warnings that surface even in preview). These are
 * matched by regex below.
 */

import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SCREENSHOT_PATH = "tests/screenshots/sky.png";

/**
 * Patterns we intentionally ignore. Anything matching one of these
 * regexes is dropped from the console-error list before assertion.
 */
const IGNORED_ERROR_PATTERNS: readonly RegExp[] = [
  /WebGL/i,
  /THREE\./i,
  /extension/i,
  /Failed to load resource/i,
  /favicon/i,
  /net::ERR_/i,
  /CORS/i,
];

test("viewer boots and three federated layers toggle without console errors", async ({
  page,
}, testInfo) => {
  // Increase per-test timeout — first-load HiPS tiles + dynamic imports.
  test.setTimeout(60_000);

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_ERROR_PATTERNS.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => {
    const text = err.message;
    if (IGNORED_ERROR_PATTERNS.some((re) => re.test(text))) return;
    errors.push(`pageerror: ${text}`);
  });

  // Seed localStorage so first-run overlays (consent banner + tutorial)
  // don't intercept pointer events.
  //   - `uw:consent:v1` — privacy consent record (both flags off).
  //   - `uw:tutorial-done` — TutorialOverlay dismissal flag.
  // Keys mirror `apps/web/src/lib/consent.ts` and
  // `apps/web/src/viewer/ui/TutorialOverlay.tsx`.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "uw:consent:v1",
        JSON.stringify({
          telemetry: false,
          errorTracking: false,
          decidedAt: Date.now(),
        }),
      );
      window.localStorage.setItem("uw:tutorial-done", "1");
    } catch {
      /* ignore — test will surface the real failure downstream */
    }
  });

  await page.goto("/#viewer", { waitUntil: "domcontentloaded" });

  // Wait for a canvas to render with non-zero size.
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "attached", timeout: 30_000 });
  await expect
    .poll(
      async () => {
        const box = await canvas.boundingBox();
        return box ? Math.min(box.width, box.height) : 0;
      },
      { timeout: 30_000, message: "canvas never reached non-zero size" },
    )
    .toBeGreaterThan(0);

  // Find the ✨ button. Use accessible name set by ExtraLayersPanel.
  const layersButton = page.getByRole("button", {
    name: "Extra federated layers",
  });
  await layersButton.waitFor({ state: "visible", timeout: 15_000 });
  await layersButton.click();

  // Wait for the dialog/panel to render its checkboxes.
  // We accept any layer panel as long as the three target toggles
  // are present.
  const idsToToggle = ["gaia-stars", "chandra", "multimessenger"] as const;
  for (const id of idsToToggle) {
    // The panel renders `<input type="checkbox">` inside a `<label>`
    // wrapping the label text. We locate by the label text (from the
    // registry) and click the checkbox.
    const labels: Record<(typeof idsToToggle)[number], RegExp> = {
      "gaia-stars": /Gaia DR3/i,
      chandra: /Chandra X-ray/i,
      multimessenger: /Multi-messenger/i,
    };
    const labelRe = labels[id];
    const row = page.locator("label", { hasText: labelRe }).first();
    await row.waitFor({ state: "visible", timeout: 15_000 });
    const checkbox = row.locator('input[type="checkbox"]').first();
    await checkbox.click({ force: true });
  }

  // Observation window: let dynamic imports settle, layers paint,
  // and any deferred console.error fire.
  await page.waitForTimeout(5_000);

  // Save screenshot to the canonical path. Ensure dir exists relative
  // to the playwright cwd (apps/web).
  mkdirSync(dirname(SCREENSHOT_PATH), { recursive: true });
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  await testInfo.attach("sky.png", {
    path: SCREENSHOT_PATH,
    contentType: "image/png",
  });

  expect(
    errors,
    `unexpected console errors:\n${errors.join("\n")}`,
  ).toEqual([]);
});

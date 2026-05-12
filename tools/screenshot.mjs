#!/usr/bin/env node
/**
 * Playwright-driven screenshot capture for docs/screenshots/.
 *
 * The shot list is below. Each entry maps `<name>` → the URL-hash deep
 * link that puts the viewer into the right state, plus any `panelKey`
 * that should be opened before snapping (so the popover is visible).
 *
 * Usage:
 *   npx playwright install chromium     # one time
 *   node tools/screenshot.mjs           # capture everything
 *   node tools/screenshot.mjs --only 09-lesson-runner
 *   node tools/screenshot.mjs --base http://localhost:5173
 *
 * Output: 1280×800 PNG written to docs/screenshots/.
 *
 * Notes:
 *   - We use a 1280×800 viewport (the README gallery is sized for that).
 *   - We wait for `networkidle` + an extra 1500ms so HiPS tiles have a
 *     chance to stream in before we capture.
 *   - The script never moves the mouse onto the canvas — we only click
 *     control-surface buttons by selector, so the cursor doesn't show
 *     up in the canvas region of the final PNG.
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "docs", "screenshots");

const DEFAULT_BASE = "https://unspeakable-world.dashable.dev";

const SHOTS = [
  {
    name: "03-landing",
    hash: "",
    // No panel — capture the marketing landing.
  },
  {
    name: "01-multiwavelength",
    hash: "#viewer?surveys=dss2,2mass&mix=0.65",
  },
  {
    name: "02-wise-ir",
    hash: "#viewer?surveys=wise&zoom=galactic-plane",
  },
  {
    name: "04-constellations",
    hash: "#viewer?constellations=1",
  },
  {
    name: "05-andromeda-2mass",
    hash: "#viewer?object=M31&fov=2&surveys=2mass",
  },
  {
    name: "06-solar-flight",
    hash: "#solar?focus=Saturn",
  },
  {
    name: "07-saturn-rings",
    hash: "#solar?focus=Saturn&dist=0.0009&pitch=0.05",
  },
  {
    name: "08-jupiter-galileans",
    hash: "#solar?focus=Jupiter&dist=0.0035",
    panelClick: '[aria-label*="info" i]',
  },
  {
    name: "09-lesson-runner",
    hash: "#viewer",
    panelClick: '[title*="lesson" i], [aria-label*="lesson" i]',
    afterPanel: async (page) => {
      // Start lesson 1 if a "start" button is in the popover.
      await page
        .getByRole("button", { name: /start/i })
        .first()
        .click({ timeout: 4000 })
        .catch(() => {});
    },
  },
  {
    name: "10-cross-section",
    hash: "#solar?focus=Earth",
    panelClick: '[title*="cross-section" i], [aria-label*="cross-section" i], [aria-label*="interior" i]',
  },
  {
    name: "11-distance-ruler",
    hash: "#viewer",
    panelClick: '[title*="ruler" i], [aria-label*="distance ruler" i]',
  },
  {
    name: "12-star-trails",
    hash: "#viewer?ra=37.95&dec=89.26&fov=20",
    panelClick: '[title*="trail" i], [aria-label*="trail" i]',
  },
  {
    name: "13-info-panel",
    hash: "#viewer?object=M31",
  },
  {
    name: "14-seti-drake",
    hash: "#viewer",
    panelClick: '[title*="seti" i], [aria-label*="seti" i], [aria-label*="alien" i]',
    afterPanel: async (page) => {
      await page
        .getByRole("button", { name: /drake/i })
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
    },
  },
  {
    name: "15-myths",
    hash: "#viewer",
    panelClick: '[title*="myth" i], [aria-label*="myth" i]',
  },
  {
    name: "16-compare-sun-sirius",
    hash: "#viewer",
    panelClick: '[title*="compare" i], [aria-label*="compare" i]',
    afterPanel: async (page) => {
      await page
        .getByRole("button", { name: /sun vs sirius/i })
        .first()
        .click({ timeout: 3000 })
        .catch(() => {});
    },
  },
  {
    name: "17-news",
    hash: "#viewer",
    panelClick: '[title*="news" i], [aria-label*="news" i]',
  },
  {
    name: "18-history",
    hash: "#viewer",
    panelClick: '[title*="today" i], [aria-label*="today" i], [title*="history" i]',
  },
  {
    name: "19-cosmicflows",
    hash: "#viewer?cosmicflows=1&zoom=laniakea",
  },
  {
    name: "20-dark-matter",
    hash: "#viewer?darkmatter=1&zoom=local-group",
  },
  {
    name: "21-explore-drawer",
    hash: "#viewer",
    panelClick: '[title*="explore" i], [aria-label*="explore" i]',
  },
];

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE, only: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") args.base = argv[++i];
    else if (a === "--only") args.only = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("usage: node tools/screenshot.mjs [--base URL] [--only NAME]");
      process.exit(0);
    }
  }
  return args;
}

async function capture(page, base, shot) {
  const url = `${base}/${shot.hash || ""}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  // HiPS tiles fade in for a beat — give them a chance.
  await page.waitForTimeout(1800);

  if (shot.panelClick) {
    for (const sel of shot.panelClick.split(",").map((s) => s.trim())) {
      try {
        const el = await page.locator(sel).first();
        if (await el.count()) {
          await el.click({ timeout: 2500 });
          await page.waitForTimeout(500);
          break;
        }
      } catch {
        /* try the next selector */
      }
    }
    if (shot.afterPanel) await shot.afterPanel(page);
    // Let the popover finish its transition + the canvas re-render.
    await page.waitForTimeout(700);
  }

  const outPath = join(OUT_DIR, `${shot.name}.png`);
  await page.screenshot({
    path: outPath,
    fullPage: false,
    omitBackground: false,
    scale: "css",
  });
  return outPath;
}

async function main() {
  const { base, only } = parseArgs(process.argv);
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();

  const targets = only ? SHOTS.filter((s) => s.name === only) : SHOTS;
  if (only && !targets.length) {
    console.error(`No shot named "${only}".`);
    process.exit(1);
  }

  const manifest = [];
  for (const shot of targets) {
    const t0 = Date.now();
    try {
      const path = await capture(page, base, shot);
      manifest.push({ name: shot.name, ok: true, ms: Date.now() - t0 });
      process.stdout.write(`✓ ${shot.name}.png (${Date.now() - t0}ms)\n`);
      void path;
    } catch (err) {
      manifest.push({
        name: shot.name,
        ok: false,
        error: String((err && err.message) || err),
      });
      process.stdout.write(`✗ ${shot.name} — ${err}\n`);
    }
  }

  await writeFile(
    join(OUT_DIR, ".capture-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  await browser.close();

  const failures = manifest.filter((m) => !m.ok);
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

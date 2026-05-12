#!/usr/bin/env node
/**
 * v4 hero screenshot capture.
 *
 * Captures ~8 hero shots that show off the v4 features:
 *   1. gaia-1m-stars       — Gaia DR3 1M stars enabled at low FOV
 *   2. multi-messenger     — IceCube / Auger / LIGO / NANOGrav layer
 *   3. galaxy-cone         — Universe mode with 136K galaxies in 3D
 *   4. cosmic-copilot      — Copilot panel open, seeded with an M31 question
 *   5. universe-tiers      — Universe mode mid-zoom showing the tier HUD
 *   6. extra-layers-panel  — The ✨ layers popover with several toggles on
 *   7. ar-sky-preview      — Sky view with labels (AR Sky synthesised in
 *                            headless because the rear-camera passthrough
 *                            requires user gesture + permission)
 *   8. planck-cmb          — Planck CMB + polarisation vectors enabled
 *
 * URL hash deep-links pre-set the layer / scene state for each shot.
 * The script then drives a tiny amount of additional UI interaction
 * (open the ✨ popover, open the Copilot panel) where the screenshot
 * is *about* a panel rather than the canvas.
 *
 * Usage
 *   pnpm --filter @unspeakable/web preview &
 *   node tools/capture-v4-screenshots.mjs
 *   node tools/capture-v4-screenshots.mjs --base http://localhost:4173
 *   node tools/capture-v4-screenshots.mjs --only gaia-1m-stars
 *
 * Sandbox note
 *   In a CI / sandbox without a display, Three.js still renders via
 *   SwiftShader (Chromium ships it). It's slow but works. If WebGL
 *   fails entirely the UI overlays (panels, HUD) are still meaningful
 *   screenshots — those captures will look correct even with a black
 *   canvas behind them. The script never fails the whole run on a
 *   single shot timeout; it falls through and writes a manifest.
 *
 * Output
 *   docs/screenshots/v4/<name>.png         (canonical, repo-tracked)
 *   apps/web/public/screenshots/v4/<name>.png  (mirror for landing page)
 */

import { chromium } from "playwright";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DOCS_OUT = join(REPO_ROOT, "docs", "screenshots", "v4");
const PUBLIC_OUT = join(
  REPO_ROOT,
  "apps",
  "web",
  "public",
  "screenshots",
  "v4",
);

const DEFAULT_BASE = "http://localhost:4173";
const PER_SHOT_TIMEOUT_MS = 15_000;
const VIEWPORT = { width: 1280, height: 800 };

/**
 * Each shot:
 *   - name: file stem (no extension)
 *   - hash: location.hash to load (deep-links state via `?...&layers=...`)
 *   - openPanel: selector list, click first that's present (optional)
 *   - afterOpen: extra interaction after panel opens (optional)
 *   - postWaitMs: extra settle time (default 1500)
 */
const SHOTS = [
  {
    name: "gaia-1m-stars",
    hash: "#viewer?fov=15&ra=83.82&dec=-5.39&layers=gaia-stars",
    postWaitMs: 3500,
  },
  {
    name: "multi-messenger",
    // Aim at the galactic-centre region with a moderate FOV so IceCube
    // tracks + Auger UHECR dots + LIGO sky-area rings are simultaneously
    // visible against the band of the Milky Way.
    hash: "#viewer?fov=90&ra=266.4&dec=-29&layers=multimessenger,gaia-stars",
    postWaitMs: 4500,
  },
  {
    name: "galaxy-cone",
    // logicalPos is in LY; SUN_LY = (26000, 0, 0). Drop the camera
    // ~10 kly "above" the disk so the 2MRS+6dFGS galaxy cone fills
    // the frame instead of the inner solar system.
    hash: "#universe?cx=26000&cy=200000&cz=0&yaw=3.14&pitch=-1.4",
    postWaitMs: 5000,
  },
  {
    name: "cosmic-copilot",
    hash: "#viewer?object=M31&fov=2&ra=10.68&dec=41.27",
    openPanel: [
      'button[title*="Cosmic Copilot" i]',
      'button[aria-label*="copilot" i]',
      'button:has-text("ask")',
      'button:has-text("🧠")',
    ],
    afterOpen: async (page) => {
      // Seed the textarea with a friendly example exchange about M31.
      const ta = page.locator('textarea, input[type="text"]').first();
      if (await ta.count()) {
        await ta.fill("What am I looking at? Tell me about M31.");
      }
    },
    postWaitMs: 1200,
  },
  {
    name: "universe-tiers",
    // Mid-zoom — ~50 LY from Sun lands in galactic tier with the disk
    // partially built up, and the bottom-left tier HUD reads
    // "Galactic Tier · 50 ly from Sun".
    hash: "#universe?cx=26050&cy=20&cz=0&yaw=3.14&pitch=-0.4",
    postWaitMs: 3500,
  },
  {
    name: "extra-layers-panel",
    hash: "#viewer?layers=gaia-stars,multimessenger,planck-polarization,galaxy-cone,chandra",
    openPanel: [
      'button[aria-label*="extra federated layers" i]',
      'button[title*="federated data layers" i]',
      // Fallback: any button whose visible text contains "layers".
      'button:has-text("layers")',
    ],
    postWaitMs: 1500,
  },
  {
    name: "ar-sky-preview",
    hash: "#viewer?fov=80&n=1&c=1",
    postWaitMs: 2500,
  },
  {
    name: "planck-cmb",
    // Wide FOV across the galactic plane, planck CMB overlay at 85%
    // opacity, plus the v4 E/B polarisation vector layer.
    hash: "#viewer?fov=120&ra=0&dec=0&w=planck&mix=0.85&layers=planck-polarization",
    postWaitMs: 4000,
  },
];

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE, only: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") args.base = argv[++i] ?? args.base;
    else if (a === "--only") args.only = argv[++i] ?? null;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "usage: node tools/capture-v4-screenshots.mjs [--base URL] [--only NAME]\n",
      );
      process.exit(0);
    }
  }
  return args;
}

/** Withdraw a promise after `ms` so a hanging WebGL init can't stall us. */
function withTimeout(p, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function captureShot(page, base, shot) {
  const url = `${base}/${shot.hash || ""}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });
  await page
    .waitForLoadState("networkidle", { timeout: 6_000 })
    .catch(() => {});
  await page.waitForTimeout(shot.postWaitMs ?? 1500);

  if (shot.openPanel) {
    for (const sel of shot.openPanel) {
      try {
        const el = page.locator(sel).first();
        if (await el.count()) {
          await el.click({ timeout: 2500 });
          await page.waitForTimeout(500);
          break;
        }
      } catch {
        /* try next selector */
      }
    }
    if (shot.afterOpen) {
      await shot.afterOpen(page).catch(() => {});
    }
    await page.waitForTimeout(700);
  }

  const docsPath = join(DOCS_OUT, `${shot.name}.png`);
  await page.screenshot({
    path: docsPath,
    fullPage: false,
    omitBackground: false,
    scale: "css",
  });
  // Mirror into apps/web/public so the landing-page <img src> works.
  await copyFile(docsPath, join(PUBLIC_OUT, `${shot.name}.png`));
  return docsPath;
}

async function main() {
  const { base, only } = parseArgs(process.argv);
  await mkdir(DOCS_OUT, { recursive: true });
  await mkdir(PUBLIC_OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    // SwiftShader is bundled with Chromium and gives us WebGL2 in
    // headless. It's slow but renders the Three.js scenes.
    args: [
      "--use-gl=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  // Pre-seed all "first-run" localStorage flags so the tutorial / hints /
  // PWA banner don't cover the canvas in every screenshot.
  await ctx.addInitScript(() => {
    try {
      const flags = {
        "uw:tutorial-done": "1",
        "uw:pwa-install-dismissed": "1",
        "uw:first-run-hint-seen": "1",
        "uw:cosmic-flow-hint-seen": "1",
        "uw:support-ribbon:dismissed-v1": "yes",
        "uw:whats-new-v4:seen": "1",
        // The analytics consent banner is the JSON shape from
        // apps/web/src/lib/consent.ts; pre-record "decline" so the
        // privacy-choice strip doesn't sit over the bottom of every
        // screenshot. We pick decline (not accept) to keep telemetry
        // off in this synthetic browser context.
        "uw:consent:v1": JSON.stringify({
          telemetry: false,
          errorTracking: false,
          decidedAt: Date.now(),
        }),
      };
      for (const [k, v] of Object.entries(flags)) {
        window.localStorage.setItem(k, v);
      }
    } catch {
      /* private mode etc — fine, the overlays just stay up */
    }
  });
  const targets = only ? SHOTS.filter((s) => s.name === only) : SHOTS;
  if (only && targets.length === 0) {
    process.stderr.write(`No shot named "${only}".\n`);
    process.exit(1);
  }

  const manifest = [];
  for (const shot of targets) {
    const t0 = Date.now();
    // Fresh page per shot. The viewer's scene graph + Three.js renderer
    // state isn't fully reset on a hash-route nav, and reusing one page
    // across all 8 shots intermittently leaves the canvas black. A
    // brand-new page is the cheapest reliable reset.
    const page = await ctx.newPage();
    page.on("pageerror", (err) => {
      process.stdout.write(`! ${shot.name} pageerror: ${err.message}\n`);
    });
    try {
      const path = await withTimeout(
        captureShot(page, base, shot),
        PER_SHOT_TIMEOUT_MS,
        shot.name,
      );
      manifest.push({ name: shot.name, ok: true, ms: Date.now() - t0 });
      process.stdout.write(
        `OK ${shot.name}.png (${Date.now() - t0}ms) -> ${path}\n`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      manifest.push({ name: shot.name, ok: false, error: msg });
      process.stdout.write(`!! ${shot.name} — ${msg}\n`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await writeFile(
    join(DOCS_OUT, ".capture-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  await browser.close();

  const failures = manifest.filter((m) => !m.ok);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});

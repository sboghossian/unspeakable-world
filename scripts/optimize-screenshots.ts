/**
 * optimize-screenshots.ts — convert every PNG under
 * `apps/web/public/screenshots/v4/` into a sibling `.webp` at quality 85.
 *
 * Runs at build time as a Node script — `sharp` is a devDependency only
 * and is never imported at runtime. Designed to be a no-op on the second
 * run unless the source PNG is newer than the existing WebP.
 *
 * The `<picture>` elements in `Highlights.tsx` reference the WebP as the
 * primary `<source>` and keep the PNG as a fallback `<img>`. Browsers
 * that can't decode WebP (very old Safari, mostly) still get the PNG —
 * so we never break a card.
 *
 * Why MIT-only: `sharp` is Apache-2.0 (the project requires MIT-or-
 * compatible — Apache-2.0 is compatible). It links against libvips
 * (LGPL-2.1) but we don't redistribute the binary at runtime; the lib
 * only ever runs on the build host. See CLAUDE.md / GOVERNANCE.md.
 *
 * Run: pnpm -F @unspeakable/web build:screenshots
 */

import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Defer the sharp import inside main() so a missing install fails fast
// with a useful message instead of a stack trace deep in node:vm.
//
// `sharp` is hoisted into the workspace's `apps/web/node_modules` by
// pnpm — but this script lives at the repo root, so a bare `import
// "sharp"` resolves against `/scripts/node_modules` and misses it. We
// pin the resolver to `apps/web/package.json` instead.
async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const webPkgRoot = resolve(here, "../apps/web");
  const requireFromWeb = createRequire(
    pathToFileURL(`${webPkgRoot}/package.json`).href,
  );

  let sharp: typeof import("sharp").default;
  try {
    const sharpPath = requireFromWeb.resolve("sharp");
    const mod = (await import(pathToFileURL(sharpPath).href)) as {
      default: typeof import("sharp").default;
    };
    sharp = mod.default;
  } catch (err) {
    console.error(
      "optimize-screenshots: `sharp` is not installed. Run `pnpm -F @unspeakable/web install` first.",
      err,
    );
    process.exitCode = 1;
    return;
  }

  const screenshotsDir = resolve(
    webPkgRoot,
    "public/screenshots/v4",
  );
  // Mirror into dist/ so the WebPs survive `vite build`'s dist-wipe.
  // We run after vite build (chained from `pnpm build:screenshots` in
  // apps/web/package.json), so dist/screenshots/v4/ exists with only
  // the PNGs vite copied — we add the WebP siblings here.
  const distScreenshotsDir = resolve(
    webPkgRoot,
    "dist/screenshots/v4",
  );

  let files: string[];
  try {
    files = await readdir(screenshotsDir);
  } catch (err) {
    console.error(
      `optimize-screenshots: cannot read ${screenshotsDir}.`,
      err,
    );
    process.exitCode = 1;
    return;
  }

  const pngs = files.filter((f) => f.toLowerCase().endsWith(".png"));
  if (pngs.length === 0) {
    console.warn(
      `optimize-screenshots: no PNGs found in ${screenshotsDir} — nothing to do.`,
    );
    return;
  }

  // Make sure dist exists. If the script is invoked outside of a full
  // build (`pnpm build:screenshots` directly) dist/ may not exist yet —
  // in that case we still want public/ updated but we won't copy into
  // dist/. mkdir { recursive: true } is a no-op when the path exists.
  let distExists = true;
  try {
    await mkdir(distScreenshotsDir, { recursive: true });
  } catch {
    distExists = false;
  }

  let converted = 0;
  let skipped = 0;
  let totalPngBytes = 0;
  let totalWebpBytes = 0;

  for (const name of pngs) {
    const pngPath = join(screenshotsDir, name);
    const webpPath = pngPath.replace(/\.png$/i, ".webp");
    const distWebpPath = join(
      distScreenshotsDir,
      name.replace(/\.png$/i, ".webp"),
    );

    // Skip the sharp invocation when the public/ WebP exists and is
    // newer than the source PNG. We still copy into dist/ below since
    // dist/ may have just been wiped by vite.
    let skipReason: string | null = null;
    try {
      const [pngStat, webpStat] = await Promise.all([
        stat(pngPath),
        stat(webpPath),
      ]);
      if (webpStat.mtimeMs >= pngStat.mtimeMs) {
        skipReason = "up-to-date";
        totalPngBytes += pngStat.size;
        totalWebpBytes += webpStat.size;
      }
    } catch {
      // WebP doesn't exist yet — fall through to conversion.
    }

    if (skipReason) {
      skipped += 1;
    } else {
      try {
        // quality 85 is the long-standing sweet spot for photographic
        // screenshots — close to visually lossless, 3-5× smaller than
        // the source PNG. effort 5 is sharp's default for WebP.
        await sharp(pngPath)
          .webp({ quality: 85, effort: 5 })
          .toFile(webpPath);
        const [pngStat, webpStat] = await Promise.all([
          stat(pngPath),
          stat(webpPath),
        ]);
        totalPngBytes += pngStat.size;
        totalWebpBytes += webpStat.size;
        converted += 1;
        const pctDrop = Math.round(
          (1 - webpStat.size / pngStat.size) * 100,
        );
        console.log(
          `optimize-screenshots: ${name} → ${(webpStat.size / 1024).toFixed(
            0,
          )} KB WebP (-${pctDrop}% from ${(pngStat.size / 1024).toFixed(0)} KB PNG)`,
        );
      } catch (err) {
        console.error(`optimize-screenshots: failed to convert ${name}`, err);
        process.exitCode = 1;
        continue;
      }
    }

    // Always mirror the WebP into dist/, even on a "skip" pass, because
    // vite wipes dist/ on every build and we run after vite. Copy is
    // cheap (1-2 ms for 100 KB) and idempotent.
    if (distExists) {
      try {
        await copyFile(webpPath, distWebpPath);
      } catch (err) {
        // Non-fatal: only matters when chained after vite build, and a
        // re-run will fix it.
        console.warn(
          `optimize-screenshots: failed to copy ${name} → dist`,
          err,
        );
      }
    }
  }

  const pctTotal =
    totalPngBytes > 0
      ? Math.round((1 - totalWebpBytes / totalPngBytes) * 100)
      : 0;
  console.log(
    `optimize-screenshots: converted ${converted}, skipped ${skipped} (up-to-date). Total: ${(
      totalPngBytes / 1024
    ).toFixed(0)} KB PNG → ${(totalWebpBytes / 1024).toFixed(
      0,
    )} KB WebP (-${pctTotal}%).`,
  );
}

void main();

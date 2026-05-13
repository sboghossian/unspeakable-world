/**
 * optimize-screenshots.ts — down-rez landing-page PNGs and emit WebP
 * siblings.
 *
 * For every PNG under `apps/web/public/screenshots/v4/`:
 *   1. If the source is wider than 2000 px, re-encode the PNG itself
 *      to a 1600-px-wide compressed PNG (quality 85, palette). This
 *      brings the 2.1 MB Three.js captures down to ~600-800 KB on
 *      disk so the `<img>` fallback (used by ancient Safari and any
 *      <picture> source that mismatches) is no longer a 2 MB load.
 *   2. Emit a sibling `.webp` at 1600-px width, quality 85. WebP is
 *      the primary `<source>` in `Highlights.tsx`, so this is what
 *      modern browsers actually fetch.
 *
 * Plus: re-encode `apps/web/public/og-card.png` to JPEG quality 80 at
 * the same 1200×630 dimensions, then overwrite the `.png` on disk
 * because every social meta tag references `og-card.png` literally —
 * we keep the filename and just stuff JPEG bytes inside it. Twitter,
 * Facebook, Slack, iMessage all sniff the magic bytes, not the
 * extension, so this is safe in practice.
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

import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

/** Max width we'll allow for a landing-page screenshot. Cards on the
 *  marketing page render at ≤800 px CSS; doubling for 2× DPR puts us
 *  at 1600, which is plenty. Anything wider is wasted bytes. */
const MAX_WIDTH = 1600;
/** PNG width above which we re-encode. Even our 1920×1080 captures
 *  benefit from the smaller box + palette PNG. */
const DOWNREZ_WIDTH_THRESHOLD = 1500;
/** OR if the PNG is heavier than this, re-encode regardless of width
 *  — some 1600 px captures are 1.2 MB because of dithered nebula
 *  gradients. Palette + quality 85 cuts them in half. */
const DOWNREZ_BYTES_THRESHOLD = 500 * 1024;
const WEBP_QUALITY = 85;
const PNG_QUALITY = 85;
const OG_JPEG_QUALITY = 80;

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

  const screenshotsDir = resolve(webPkgRoot, "public/screenshots/v4");
  // Mirror into dist/ so the WebPs survive `vite build`'s dist-wipe.
  // We run after vite build (chained from `pnpm build:screenshots` in
  // apps/web/package.json), so dist/screenshots/v4/ exists with only
  // the PNGs vite copied — we add the WebP siblings here.
  const distScreenshotsDir = resolve(webPkgRoot, "dist/screenshots/v4");

  let files: string[];
  try {
    files = await readdir(screenshotsDir);
  } catch (err) {
    console.error(`optimize-screenshots: cannot read ${screenshotsDir}.`, err);
    process.exitCode = 1;
    return;
  }

  const pngs = files.filter((f) => f.toLowerCase().endsWith(".png"));
  if (pngs.length === 0) {
    console.warn(
      `optimize-screenshots: no PNGs found in ${screenshotsDir} — nothing to do.`,
    );
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
  let downrezzed = 0;
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
    const distPngPath = join(distScreenshotsDir, name);

    // Step 1: down-rez and/or recompress the source PNG. We re-encode
    // into a Buffer first so we can compare sizes before overwriting,
    // then write atomically. Trigger if EITHER the source is wider
    // than the threshold OR larger than the byte threshold — some
    // already-modest-resolution captures are heavy because of dithered
    // gradients and benefit from palette PNG.
    let didDownrez = false;
    try {
      const before = (await stat(pngPath)).size;
      const meta = await sharp(pngPath).metadata();
      const tooWide = !!meta.width && meta.width > DOWNREZ_WIDTH_THRESHOLD;
      const tooHeavy = before > DOWNREZ_BYTES_THRESHOLD;
      if (tooWide || tooHeavy) {
        const buf = await sharp(pngPath)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .png({ quality: PNG_QUALITY, compressionLevel: 9, palette: true })
          .toBuffer();
        // Only commit if the re-encoded version is a meaningful
        // improvement (≥10% smaller). PNG palette encoding produces
        // slight byte-level variation on each run; without a threshold
        // we'd re-write near-identical files on every build forever.
        if (buf.byteLength < before * 0.9) {
          await writeFile(pngPath, buf);
          const after = (await stat(pngPath)).size;
          didDownrez = true;
          downrezzed += 1;
          console.log(
            `optimize-screenshots: ${name} PNG ${(before / 1024).toFixed(0)} KB → ${(
              after / 1024
            ).toFixed(0)} KB (${meta.width ?? "?"}px → ${MAX_WIDTH}px)`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `optimize-screenshots: PNG downrez failed for ${name} — continuing.`,
        err,
      );
    }

    // Step 2: emit/refresh the WebP. Skip if the WebP is already
    // newer than the (possibly just-modified) PNG.
    let skipReason: string | null = null;
    if (!didDownrez) {
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
    }

    if (skipReason) {
      skipped += 1;
    } else {
      try {
        // quality 85 is the long-standing sweet spot for photographic
        // screenshots — close to visually lossless, 3-5× smaller than
        // the source PNG. effort 5 is sharp's default for WebP.
        await sharp(pngPath)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY, effort: 5 })
          .toFile(webpPath);
        const [pngStat, webpStat] = await Promise.all([
          stat(pngPath),
          stat(webpPath),
        ]);
        totalPngBytes += pngStat.size;
        totalWebpBytes += webpStat.size;
        converted += 1;
        const pctDrop = Math.round((1 - webpStat.size / pngStat.size) * 100);
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
    // cheap (1-2 ms for 100 KB) and idempotent. Also re-mirror the PNG
    // if we down-rezzed it so the dist copy isn't stuck on the old 2 MB
    // version.
    if (distExists) {
      try {
        await copyFile(webpPath, distWebpPath);
        if (didDownrez) {
          await copyFile(pngPath, distPngPath);
        }
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

  // og-card re-encode. JPEG-inside-a-.png filename is intentional —
  // every social meta tag is hard-coded to `og-card.png` and changing
  // it would break thousands of already-shared links.
  try {
    const ogPath = resolve(webPkgRoot, "public/og-card.png");
    const distOgPath = resolve(webPkgRoot, "dist/og-card.png");
    const before = (await stat(ogPath)).size;
    const meta = await sharp(ogPath).metadata();
    // Re-encode only if the current file is a fat PNG OR a JPEG above
    // our 130 KB target. JPEG output is near-deterministic on a given
    // input, but we still gate on a ≥5 KB drop so a re-run of an
    // already-converted card doesn't keep over-writing it.
    if (meta.format === "png" || (meta.format === "jpeg" && before > 130_000)) {
      const buf = await sharp(ogPath)
        .jpeg({ quality: OG_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      if (buf.byteLength + 5_000 < before) {
        await writeFile(ogPath, buf);
        const after = (await stat(ogPath)).size;
        console.log(
          `optimize-screenshots: og-card.png re-encoded ${(before / 1024).toFixed(
            0,
          )} KB → ${(after / 1024).toFixed(0)} KB (JPEG q${OG_JPEG_QUALITY}, .png filename kept for back-compat).`,
        );
        if (distExists) {
          try {
            await copyFile(ogPath, distOgPath);
          } catch {
            // Non-fatal — vite copies public/ on next build.
          }
        }
      }
    }
  } catch (err) {
    console.warn("optimize-screenshots: og-card re-encode failed.", err);
  }

  const pctTotal =
    totalPngBytes > 0
      ? Math.round((1 - totalWebpBytes / totalPngBytes) * 100)
      : 0;
  console.log(
    `optimize-screenshots: converted ${converted}, downrezzed ${downrezzed}, skipped ${skipped} (up-to-date). Total: ${(
      totalPngBytes / 1024
    ).toFixed(0)} KB PNG → ${(totalWebpBytes / 1024).toFixed(
      0,
    )} KB WebP (-${pctTotal}%).`,
  );
}

void main();

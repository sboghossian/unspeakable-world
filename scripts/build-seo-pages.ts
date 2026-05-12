/**
 * build-seo-pages.ts — emit one static HTML page per famous object and
 * curriculum lesson into `apps/web/dist/object/<slug>.html` and
 * `apps/web/dist/lesson/<id>.html`. Also writes `sitemap.xml` and
 * `robots.txt` at the dist root.
 *
 * Designed to run AFTER `vite build` — Vite empties `dist/` on every
 * run, so writing these files before Vite would lose them. The
 * `apps/web/package.json` build script chains `vite build && pnpm
 * build:seo`.
 *
 * No runtime dependencies. Uses Node's experimental TypeScript-strip
 * loader (`--experimental-strip-types`), mirroring the other bake-*
 * scripts in this repo.
 *
 * Run: pnpm -F @unspeakable/web build:seo
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FAMOUS_OBJECTS } from "../apps/web/src/seo/object-catalog.ts";
import { LESSONS } from "../apps/web/src/seo/lesson-catalog.ts";
import {
  renderObjectPage,
  renderLessonPage,
  renderRobotsTxt,
  renderSitemapXml,
} from "../apps/web/src/seo/template.ts";
import type { SeoCatalogLookups } from "../apps/web/src/seo/template.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "apps/web/dist");

async function main(): Promise<void> {
  const t0 = Date.now();

  const lookups: SeoCatalogLookups = {
    objectsBySlug: new Map(FAMOUS_OBJECTS.map((o) => [o.slug, o])),
  };

  // Sanity check: any related slug that doesn't resolve to a real
  // catalogue entry produces a dead internal link. Warn but don't fail.
  const dangling = new Set<string>();
  for (const o of FAMOUS_OBJECTS) {
    for (const s of o.relatedSlugs) {
      if (!lookups.objectsBySlug.has(s)) dangling.add(s);
    }
  }
  for (const l of LESSONS) {
    for (const s of l.relatedObjectSlugs) {
      if (!lookups.objectsBySlug.has(s)) dangling.add(s);
    }
  }
  if (dangling.size > 0) {
    process.stderr.write(
      `[build-seo] warning: ${dangling.size} related slug(s) not in catalogue: ${[...dangling].sort().join(", ")}\n`,
    );
  }

  // Make sure dist exists. `pnpm build` already runs `vite build`
  // first, but supporting a standalone invocation is useful for
  // iterating on the template.
  await mkdir(join(DIST, "object"), { recursive: true });
  await mkdir(join(DIST, "lesson"), { recursive: true });

  let objectCount = 0;
  for (const obj of FAMOUS_OBJECTS) {
    const html = renderObjectPage(obj, lookups);
    await writeFile(join(DIST, "object", `${obj.slug}.html`), html, "utf8");
    objectCount += 1;
  }

  let lessonCount = 0;
  for (const lesson of LESSONS) {
    const html = renderLessonPage(lesson, lookups);
    await writeFile(join(DIST, "lesson", `${lesson.id}.html`), html, "utf8");
    lessonCount += 1;
  }

  const sitemapXml = renderSitemapXml(FAMOUS_OBJECTS, LESSONS);
  await writeFile(join(DIST, "sitemap.xml"), sitemapXml, "utf8");

  const robotsTxt = renderRobotsTxt();
  await writeFile(join(DIST, "robots.txt"), robotsTxt, "utf8");

  const ms = Date.now() - t0;
  // Conventionally these bake scripts write to stderr to keep stdout
  // free for downstream pipes. Stay consistent.
  process.stderr.write(
    `[build-seo] wrote ${objectCount} object page(s), ${lessonCount} lesson page(s), sitemap.xml, robots.txt in ${ms} ms\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write(
    `[build-seo] failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});

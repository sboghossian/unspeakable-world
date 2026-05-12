/**
 * bake-sky-cultures-extended.ts — emit the extended Stellarium-style
 * sky cultures as a single JSON file (for offline use / caching).
 *
 * Upstream:
 *   https://github.com/Stellarium/stellarium-skycultures
 *   (cultural data — CC BY-SA 4.0)
 *
 * The TypeScript module already ships the data inline so the web build
 * doesn't need this JSON at runtime; the JSON is a convenience artifact
 * for downstream tooling (preview, lesson exporters, etc.).
 *
 * Output: apps/web/public/data/sky-cultures-extended.json (~25 KB)
 *
 * Run: pnpm --filter @unspeakable/web bake:sky-cultures-extended
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// We re-export the inline data here. Importing the in-app TS module
// from a Node bake script works because both modules are pure data
// (no DOM access, no `window`).
import {
  EXTENDED_CULTURE_LIST,
  EXTENDED_SKY_CULTURES,
} from "../apps/web/src/viewer/sky-cultures-extended/cultures-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "apps/web/public/data");

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const payload = {
    attribution:
      "Stellarium sky-cultures · cultural data CC BY-SA 4.0 · upstream https://github.com/Stellarium/stellarium-skycultures",
    note:
      "Curated subset of Stellarium's cultural-data line figures; star coordinates are J2000 ICRS from Hipparcos / Yale BSC (public domain).",
    cultures: EXTENDED_CULTURE_LIST.map((id) => EXTENDED_SKY_CULTURES[id]),
  };
  const json = JSON.stringify(payload, null, 2);
  const file = join(OUT, "sky-cultures-extended.json");
  await writeFile(file, json);
  // eslint-disable-next-line no-console
  console.log(
    `[sky-cultures-extended] wrote ${file} (${(json.length / 1024).toFixed(1)} KB)`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

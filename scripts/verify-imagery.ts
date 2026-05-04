#!/usr/bin/env node
/**
 * HEAD every URL in OBJECT_IMAGERY and report any non-200.
 *
 * Run with:  pnpm --filter web verify:imagery
 *
 * Exits non-zero if any URL is missing — wire into CI before merging
 * imagery-changing PRs. Uses the placeholder constant to skip dev-only
 * entries; everything else must return 200.
 */
import { OBJECT_IMAGERY } from "../apps/web/src/viewer/data/object-imagery.ts";

const PLACEHOLDER_PREFIX = "https://placeholder.invalid";

type Probe = {
  key: string;
  url: string;
  status: number;
  ok: boolean;
};

async function head(url: string): Promise<number> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function main(): Promise<void> {
  const entries = Object.entries(OBJECT_IMAGERY);
  const probes: Probe[] = [];
  let placeholders = 0;
  for (const [key, entry] of entries) {
    if (entry.url.startsWith(PLACEHOLDER_PREFIX)) {
      placeholders += 1;
      continue;
    }
    const status = await head(entry.url);
    probes.push({ key, url: entry.url, status, ok: status === 200 });
    if (entry.thumbUrl && entry.thumbUrl !== entry.url) {
      const thumbStatus = await head(entry.thumbUrl);
      probes.push({
        key: `${key} (thumb)`,
        url: entry.thumbUrl,
        status: thumbStatus,
        ok: thumbStatus === 200,
      });
    }
  }
  const failed = probes.filter((p) => !p.ok);
  for (const p of probes) {
    const tag = p.ok ? "OK " : "FAIL";
    process.stdout.write(`${tag} ${p.status} ${p.key} → ${p.url}\n`);
  }
  process.stdout.write(
    `\n${probes.length} URLs probed · ${placeholders} placeholders skipped · ${failed.length} failures\n`,
  );
  if (failed.length > 0) process.exit(1);
}

void main();

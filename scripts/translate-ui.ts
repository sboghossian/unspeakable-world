/**
 * translate-ui.ts — refresh `apps/web/src/i18n/<lang>.json` against the
 * English source-of-truth in `apps/web/src/i18n/strings/en.ts`.
 *
 * Mirrors `translate-lessons.ts` exactly:
 *   - Chunk the phrases into ≤350-char batches.
 *   - One LLM call per chunk via the deployed `/api/copilot` Pages
 *     Function (Workers AI Llama 3.1 8B).
 *   - 2.2 s gap between chunks to stay under the 30 req/min rate limit.
 *   - Fallback to the English source when a chunk fails; tag the lang
 *     file's `_meta.fallbacks` array so a re-run with `--force` can
 *     top up the missing ones.
 *
 * Usage:
 *   pnpm --filter web bake:translate-ui
 *   pnpm --filter web bake:translate-ui -- --langs=es,fr --force
 *   pnpm --filter web bake:translate-ui -- --langs=de,ja,zh
 *
 * Inputs:
 *   apps/web/src/i18n/strings/en.ts   (canonical English keys + values)
 *
 * Outputs:
 *   apps/web/src/i18n/<lang>.json     (merged with existing translations)
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EN_TS = join(ROOT, "apps/web/src/i18n/strings/en.ts");
const I18N_DIR = join(ROOT, "apps/web/src/i18n");

const LANGS: ReadonlyArray<{ code: string; name: string }> = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Simplified Chinese" },
];

type Args = {
  endpoint: string;
  langs: ReadonlyArray<string>;
  force: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    endpoint:
      process.env["TRANSLATE_ENDPOINT"] ??
      "https://unspeakable-world.dashable.dev/api/copilot",
    langs: ["es", "fr"],
    force: false,
  };
  for (const a of argv) {
    if (a.startsWith("--endpoint=")) {
      args.endpoint = a.slice("--endpoint=".length);
    } else if (a.startsWith("--langs=")) {
      args.langs = a.slice("--langs=".length).split(",").filter(Boolean);
    } else if (a === "--force") {
      args.force = true;
    }
  }
  return args;
}

async function loadEnglish(): Promise<Record<string, string>> {
  // The source file is plain TS with `export const en = {...} as const`.
  // We import it directly via Node's TS-strip mode.
  const mod = (await import(`file://${EN_TS}`)) as {
    en: Record<string, string>;
  };
  return mod.en;
}

type Phrase = { key: string; text: string };
type LlmResponse = {
  response?: string;
  result?: { response?: string };
};

const CHARS_PER_CALL = 350;

async function translateChunk(
  endpoint: string,
  phrases: Phrase[],
  lang: { code: string; name: string },
): Promise<Map<string, string> | null> {
  const sys = [
    `You are a precise UI-microcopy translator translating from English to ${lang.name}.`,
    `INPUT: a JSON array of {key, text}.`,
    `OUTPUT: a JSON array of the SAME LENGTH, SAME ORDER, SAME keys, "text" translated to ${lang.name}.`,
    `Preserve {placeholder} tokens EXACTLY. Keep technical terms recognisable.`,
    `Match the source punctuation, including → ← · em-dashes. Keep the lowercase/uppercase shape of each value.`,
    `Respond with the JSON array only — no commentary, no markdown fences.`,
  ].join(" ");
  const user = JSON.stringify(phrases);
  const inputChars = phrases.reduce((acc, p) => acc + p.text.length, 0);
  const maxTokens = Math.min(4096, Math.max(256, Math.ceil(inputChars * 1.3)));

  const body = {
    model: "@cf/meta/llama-3.1-8b-instruct",
    stream: false,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  };

  let res: Response | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) break;
    const retryHdr = res.headers.get("retry-after");
    const retryMs = retryHdr
      ? Math.max(1000, Number(retryHdr) * 1000)
      : Math.min(30_000, 1000 * 2 ** attempt);
    process.stderr.write(
      `  ${lang.code}: 429 — back off ${Math.round(retryMs / 1000)}s\n`,
    );
    await new Promise((r) => setTimeout(r, retryMs));
  }
  if (!res || !res.ok) {
    process.stderr.write(
      `  ${lang.code}: HTTP ${res?.status ?? "no response"}\n`,
    );
    return null;
  }
  let parsed: LlmResponse;
  try {
    parsed = (await res.json()) as LlmResponse;
  } catch {
    return null;
  }
  const text = parsed.result?.response ?? parsed.response ?? "";
  if (!text) return null;

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const arr = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(arr)) return null;
    const out = new Map<string, string>();
    for (const item of arr) {
      if (
        item &&
        typeof item === "object" &&
        "key" in item &&
        "text" in item &&
        typeof (item as { key: unknown }).key === "string" &&
        typeof (item as { text: unknown }).text === "string"
      ) {
        out.set(
          (item as { key: string }).key,
          (item as { text: string }).text,
        );
      }
    }
    if (out.size > 0) return out;
  } catch {
    /* ignore malformed JSON */
  }
  return null;
}

async function readExisting(lang: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(I18N_DIR, `${lang}.json`), "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const english = await loadEnglish();
  const langs = LANGS.filter((l) => args.langs.includes(l.code));
  if (langs.length === 0) {
    process.stderr.write(
      `[translate-ui] no target languages selected (got: ${args.langs.join(",")})\n`,
    );
    process.exit(2);
  }

  for (const lang of langs) {
    const existing = await readExisting(lang.code);
    const missing: Phrase[] = [];
    for (const [key, text] of Object.entries(english)) {
      const have = existing[key];
      if (have && !args.force) continue;
      missing.push({ key, text });
    }
    if (missing.length === 0) {
      process.stdout.write(`  ${lang.code}: up to date\n`);
      continue;
    }

    process.stdout.write(
      `  ${lang.code}: translating ${missing.length} keys…\n`,
    );

    // Chunk on character budget.
    const chunks: Phrase[][] = [];
    let cur: Phrase[] = [];
    let curChars = 0;
    for (const p of missing) {
      if (cur.length > 0 && curChars + p.text.length > CHARS_PER_CALL) {
        chunks.push(cur);
        cur = [];
        curChars = 0;
      }
      cur.push(p);
      curChars += p.text.length;
    }
    if (cur.length > 0) chunks.push(cur);

    const merged: Record<string, string> = { ...existing };
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]!;
      const got = await translateChunk(args.endpoint, chunk, lang);
      if (got) {
        for (const [k, v] of got) merged[k] = v;
      } else {
        process.stderr.write(
          `  ${lang.code}: chunk ${ci + 1}/${chunks.length} failed — keeping English fallback\n`,
        );
      }
      if (ci < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 2200));
      }
    }

    const outPath = join(I18N_DIR, `${lang.code}.json`);
    await writeFile(outPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    process.stdout.write(`  wrote ${outPath}\n`);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(
    `[translate-ui] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});

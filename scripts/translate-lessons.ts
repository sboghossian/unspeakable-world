/**
 * translate-lessons.ts — bake the 15 English curriculum lessons into
 * Spanish, French, German, Japanese and Chinese using Cloudflare Workers
 * AI (Llama 3.1 8B via the existing Pages Function proxy).
 *
 * Inputs:
 *   apps/web/src/viewer/curriculum/lessons.ts → the source-of-truth array
 *
 * Outputs:
 *   apps/web/public/i18n/<lang>/lessons.json  → translated lesson set
 *   apps/web/public/i18n/index.json           → tiny manifest the loader hits
 *
 * Auth / endpoint:
 *   We talk to the deployed Pages Function at /api/copilot. The function
 *   forwards to env.AI which only the Cloudflare runtime can mint. There
 *   are two ways to run this script:
 *
 *     1. Against the deployed site (default):
 *          TRANSLATE_ENDPOINT=https://unspeakable-world.dashable.dev/api/copilot
 *
 *     2. Against a local `pnpm wrangler pages dev` instance:
 *          TRANSLATE_ENDPOINT=http://localhost:8788/api/copilot
 *
 *   You can also pass --endpoint=… as a CLI arg.
 *
 * Behaviour & failure modes:
 *   - Each lesson + target language → 1 LLM call.
 *   - If the call fails or the response can't be parsed as JSON, we WRITE
 *     THE ENGLISH FALLBACK and tag the entry with `{"_translation": "fallback"}`
 *     so the loader knows it's untranslated. We never invent translations.
 *   - Skips lessons whose translated JSON already exists with a non-fallback
 *     marker, unless `--force` is passed. Safe to re-run after a partial
 *     failure to top up the missing ones.
 *
 * Usage:
 *   pnpm --filter web bake:translate
 *   pnpm --filter web bake:translate -- --langs=es,ja --force
 *   pnpm --filter web bake:translate -- --limit=3   # ship 3 lessons × 5 langs
 *
 * Output sample:
 *   apps/web/public/i18n/es/lessons.json
 *   apps/web/public/i18n/fr/lessons.json
 *   …
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LESSONS_TS = join(
  ROOT,
  "apps/web/src/viewer/curriculum/lessons.ts",
);
const OUT_DIR = join(ROOT, "apps/web/public/i18n");

const LANGS: ReadonlyArray<{ code: string; name: string }> = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Simplified Chinese" },
];

// ─── CLI ────────────────────────────────────────────────────────────────

type Args = {
  endpoint: string;
  langs: ReadonlyArray<string>;
  force: boolean;
  limit: number | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    endpoint:
      process.env["TRANSLATE_ENDPOINT"] ??
      "https://unspeakable-world.dashable.dev/api/copilot",
    langs: LANGS.map((l) => l.code),
    force: false,
    limit: null,
  };
  for (const a of argv) {
    if (a.startsWith("--endpoint=")) {
      args.endpoint = a.slice("--endpoint=".length);
    } else if (a.startsWith("--langs=")) {
      args.langs = a.slice("--langs=".length).split(",").filter(Boolean);
    } else if (a === "--force") {
      args.force = true;
    } else if (a.startsWith("--limit=")) {
      const n = Number.parseInt(a.slice("--limit=".length), 10);
      if (Number.isFinite(n) && n > 0) args.limit = n;
    }
  }
  return args;
}

// ─── load lessons (read .ts source as plain text + import it) ──────────

type LessonStep =
  | { kind: "narrate"; text: string; durationMs?: number }
  | { kind: "scene"; hash: string; durationMs?: number }
  | { kind: "wait"; ms: number }
  | {
      kind: "quiz";
      question: string;
      options: string[];
      answerIndex: number;
      explanation: string;
    };

type Lesson = {
  id: string;
  title: string;
  summary: string;
  ageTier: "kid" | "teen" | "adult";
  durationMin: number;
  steps: LessonStep[];
};

async function loadLessons(): Promise<Lesson[]> {
  // The source file is plain TS with `export const LESSONS = [...]`. We
  // import it with `--experimental-strip-types` (node strips type
  // annotations on the fly) — same trick the other bake scripts use.
  const mod = (await import(
    pathToFileURL(LESSONS_TS).href
  )) as {
    LESSONS: Lesson[];
  };
  return mod.LESSONS;
}

// ─── LLM call ──────────────────────────────────────────────────────────

type LlmResponse = {
  response?: string;
  result?: { response?: string };
};

/** Approximate characters of source text that one LLM call can safely
 * round-trip without hitting the Workers AI default 256-token output
 * cap. Empirically ~350 chars (English) yields ≤220 tokens for the
 * target languages. We chunk on this. */
const CHARS_PER_CALL = 350;

async function translateOne(
  endpoint: string,
  lesson: Lesson,
  lang: { code: string; name: string },
): Promise<Lesson | null> {
  // Field-by-field translation. We do NOT ask the LLM to round-trip the
  // whole JSON structure — that produced (a) renamed keys (e.g. "titulo"
  // for "title"), (b) truncated output on long lessons, and (c) drifted
  // arrays. Instead, the LLM gets a flat list of phrases and returns a
  // flat list of translations; we splice them back into the schema here
  // in TS where types are enforced.
  type Phrase = { tag: string; text: string };
  const phrases: Phrase[] = [];
  phrases.push({ tag: "title", text: lesson.title });
  phrases.push({ tag: "summary", text: lesson.summary });
  for (let i = 0; i < lesson.steps.length; i++) {
    const step = lesson.steps[i]!;
    if (step.kind === "narrate") {
      phrases.push({ tag: `s${i}.text`, text: step.text });
    } else if (step.kind === "quiz") {
      phrases.push({ tag: `s${i}.question`, text: step.question });
      for (let j = 0; j < step.options.length; j++) {
        phrases.push({ tag: `s${i}.opt${j}`, text: step.options[j] ?? "" });
      }
      phrases.push({ tag: `s${i}.explanation`, text: step.explanation });
    }
  }

  // Chunk phrases so each call stays comfortably under the model's
  // default 256-output-token ceiling. Long narrate steps may not fit a
  // chunk; they get their own dedicated call.
  const chunks: Phrase[][] = [];
  let cur: Phrase[] = [];
  let curChars = 0;
  for (const p of phrases) {
    if (cur.length > 0 && curChars + p.text.length > CHARS_PER_CALL) {
      chunks.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(p);
    curChars += p.text.length;
  }
  if (cur.length > 0) chunks.push(cur);

  const translatedByTag = new Map<string, string>();
  let okChunks = 0;
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci]!;
    const got = await translateChunk(endpoint, chunk, lang);
    if (!got) continue;
    for (const [tag, text] of got) translatedByTag.set(tag, text);
    okChunks++;
    // Stay under the 30 req/min/IP limit on the deployed function.
    // 2.2s spacing keeps the long tail below the window.
    if (ci < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 2200));
    }
  }
  if (okChunks === 0 || translatedByTag.size < phrases.length * 0.5) {
    process.stderr.write(
      `[translate] ${lesson.id} ${lang.code}: only ${translatedByTag.size}/${phrases.length} phrases translated\n`,
    );
    return null;
  }

  // Splice translations back into a fresh copy of the source lesson.
  // Any phrases the model dropped fall through to the English source.
  const out: Lesson = JSON.parse(JSON.stringify(lesson)) as Lesson;
  const titleHit = translatedByTag.get("title");
  if (titleHit) out.title = titleHit;
  const summaryHit = translatedByTag.get("summary");
  if (summaryHit) out.summary = summaryHit;
  for (let i = 0; i < out.steps.length; i++) {
    const step = out.steps[i]!;
    if (step.kind === "narrate") {
      const t = translatedByTag.get(`s${i}.text`);
      if (t) step.text = t;
    } else if (step.kind === "quiz") {
      const q = translatedByTag.get(`s${i}.question`);
      if (q) step.question = q;
      for (let j = 0; j < step.options.length; j++) {
        const o = translatedByTag.get(`s${i}.opt${j}`);
        if (o) step.options[j] = o;
      }
      const e = translatedByTag.get(`s${i}.explanation`);
      if (e) step.explanation = e;
    }
  }
  return out;
}

type Phrase = { tag: string; text: string };

async function translateChunk(
  endpoint: string,
  phrases: Phrase[],
  lang: { code: string; name: string },
): Promise<Map<string, string> | null> {
  const sys = [
    `You are a precise astronomy-textbook translator translating from English to ${lang.name}.`,
    `INPUT: a JSON array of objects with "tag" and "text".`,
    `OUTPUT: a JSON array of the SAME LENGTH, SAME ORDER, SAME "tag" values, "text" translated to ${lang.name}.`,
    `Preserve technical astronomy terms (perihelion, redshift, etc.); keep numbers, units, RA/Dec coordinates EXACTLY.`,
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

  // Retry on 429 with the server-supplied Retry-After. The deployed
  // copilot function rate-limits at 30 requests/minute/IP — we honour it
  // rather than hammering. Five retries each ~doubles the wait.
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
      `  chunk (${phrases.length} phr): 429 — backing off ${Math.round(retryMs / 1000)}s\n`,
    );
    await new Promise((r) => setTimeout(r, retryMs));
  }
  if (!res || !res.ok) {
    process.stderr.write(
      `  chunk (${phrases.length} phr): HTTP ${res?.status ?? "no response"}\n`,
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

  const candidates = [
    text.trim(),
    text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim(),
    extractJsonArray(text),
  ].filter((s): s is string => !!s);

  for (const c of candidates) {
    try {
      const arr = JSON.parse(c) as unknown;
      if (!Array.isArray(arr)) continue;
      const out = new Map<string, string>();
      for (const item of arr) {
        if (
          item &&
          typeof item === "object" &&
          "tag" in item &&
          "text" in item &&
          typeof (item as { tag: unknown }).tag === "string" &&
          typeof (item as { text: unknown }).text === "string"
        ) {
          out.set(
            (item as { tag: string }).tag,
            (item as { text: string }).text,
          );
        }
      }
      if (out.size > 0) return out;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function extractJsonArray(s: string): string | null {
  const first = s.indexOf("[");
  const last = s.lastIndexOf("]");
  if (first === -1 || last === -1 || last <= first) return null;
  return s.slice(first, last + 1);
}

// ─── disk helpers ───────────────────────────────────────────────────────

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

type TranslatedBundle = {
  /** Source-of-truth English lesson ids; same order as English. */
  lessons: Array<Lesson & { _translation?: "fallback" }>;
  /** ISO timestamp of bake. */
  generatedAt: string;
  /** Source SHA so the loader can diff. Filled at bake time. */
  source: string;
};

async function readExisting(path: string): Promise<TranslatedBundle | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as TranslatedBundle;
  } catch {
    return null;
  }
}

// ─── main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const allLessons = await loadLessons();
  const lessons =
    args.limit !== null ? allLessons.slice(0, args.limit) : allLessons;

  const langs = LANGS.filter((l) => args.langs.includes(l.code));
  if (langs.length === 0) {
    process.stderr.write(
      `[translate] no target languages selected (got: ${args.langs.join(",")})\n`,
    );
    process.exit(2);
  }

  process.stdout.write(
    `[translate] endpoint=${args.endpoint}\n` +
      `[translate] ${lessons.length}/${allLessons.length} lessons × ${langs.length} langs = ${
        lessons.length * langs.length
      } calls\n`,
  );

  let okCount = 0;
  let fallbackCount = 0;

  for (const lang of langs) {
    const langDir = join(OUT_DIR, lang.code);
    await mkdir(langDir, { recursive: true });
    const outPath = join(langDir, "lessons.json");
    const existing = await readExisting(outPath);
    const existingById = new Map<string, Lesson & { _translation?: "fallback" }>();
    if (existing?.lessons) {
      for (const l of existing.lessons) existingById.set(l.id, l);
    }

    const out: TranslatedBundle = {
      lessons: [],
      generatedAt: new Date().toISOString(),
      source: "lessons.ts",
    };

    for (const lesson of lessons) {
      const prev = existingById.get(lesson.id);
      const hasUsableExisting =
        !args.force && prev && prev._translation !== "fallback";
      if (hasUsableExisting && prev) {
        out.lessons.push(prev);
        okCount++;
        continue;
      }

      process.stdout.write(`  ${lang.code} · ${lesson.id} …`);
      const translated = await translateOne(args.endpoint, lesson, lang);
      if (translated) {
        out.lessons.push(translated);
        process.stdout.write(" ok\n");
        okCount++;
      } else {
        out.lessons.push({ ...lesson, _translation: "fallback" });
        process.stdout.write(" FALLBACK (English)\n");
        fallbackCount++;
      }
    }

    await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    process.stdout.write(`  wrote ${outPath}\n`);
  }

  // Manifest — what the loader hits before fetching the lang bundle.
  const manifestPath = join(OUT_DIR, "index.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        languages: langs.map((l) => l.code),
        lessonCount: lessons.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  process.stdout.write(`  wrote ${manifestPath}\n`);

  process.stdout.write(
    `[translate] done: ${okCount} ok, ${fallbackCount} fallback\n`,
  );
  if (fallbackCount > 0 && okCount === 0) {
    process.exit(1); // all calls failed — surface it to CI
  }
}

main().catch((err: unknown) => {
  process.stderr.write(
    `[translate] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});

// silence unused-import lint when none of the helpers are tree-shaken
void exists;

/**
 * 🌐 lesson-loader — locale-aware fetch for the translated curriculum.
 *
 * Lessons live in two places:
 *   • The canonical English source — `lessons.ts` — bundled with the JS.
 *   • Per-locale JSON baked by `scripts/translate-lessons.ts` and served
 *     from `/i18n/<lang>/lessons.json` (under apps/web/public).
 *
 * `loadLessonsForLocale("en")` is synchronous: it just returns the
 * bundled array. Every other locale is a one-time `fetch()` whose result
 * is memoised in the module. The browser HTTP cache + service worker
 * (when present) take care of re-use across navigations.
 *
 * If the bake hasn't run yet for a given lang, or the network call
 * fails, we silently fall back to English — the loader contract NEVER
 * fails the caller. The `_translation` field on each entry tells the UI
 * whether to badge it as "machine translated" or fall through.
 */

import { useEffect, useState } from "react";
import { LESSONS } from "./lessons";
import type { Lesson } from "./types";
import { useLanguage, type Language } from "../../lib/i18n";
import { log } from "../../lib/logger";

type TranslatedLesson = Lesson & { _translation?: "fallback" };

type TranslatedBundle = {
  lessons: TranslatedLesson[];
  generatedAt?: string;
  source?: string;
};

const cache = new Map<Language, Promise<Lesson[]>>();

/**
 * Returns the lesson array for the given locale. Always resolves — never
 * rejects. Non-English locales are fetched on demand.
 */
export function loadLessonsForLocale(locale: Language): Promise<Lesson[]> {
  if (locale === "en") return Promise.resolve(LESSONS);
  const cached = cache.get(locale);
  if (cached) return cached;
  const promise = fetchBundle(locale).then((bundle) => {
    if (!bundle || !Array.isArray(bundle.lessons)) return LESSONS;
    // Re-key in source order. If the bundle is missing any lesson (e.g.
    // a partial bake), fall back to English for that entry.
    const byId = new Map<string, TranslatedLesson>();
    for (const l of bundle.lessons) {
      if (l && typeof l.id === "string") byId.set(l.id, l);
    }
    const out: Lesson[] = LESSONS.map((src) => {
      const hit = byId.get(src.id);
      if (!hit) return src;
      // Fallback rows in the bake (the English text copied through) are
      // already strict Lesson-shape; the marker is just a tag for the UI.
      return hit;
    });
    return out;
  });
  cache.set(locale, promise);
  return promise;
}

async function fetchBundle(
  locale: Language,
): Promise<TranslatedBundle | null> {
  if (typeof fetch === "undefined") return null;
  const url = `/i18n/${locale}/lessons.json`;
  try {
    const res = await fetch(url, { cache: "default" });
    if (!res.ok) return null;
    const body = (await res.json()) as TranslatedBundle;
    return body;
  } catch (err) {
    log.warn(`[lesson-loader] ${locale} fetch failed; using English`, err);
    return null;
  }
}

/**
 * True iff a lesson came from a real (non-fallback) translation. Lessons
 * tagged with `_translation: "fallback"` are the English source copied
 * through because the LLM call failed for that row.
 */
export function isMachineTranslated(lesson: Lesson, locale: Language): boolean {
  if (locale === "en") return false;
  const tag = (lesson as TranslatedLesson)._translation;
  return tag !== "fallback";
}

/**
 * React hook — returns the current locale's lesson array. Re-renders when
 * the language changes; never throws. While a non-English bundle is being
 * fetched the previous (or English) array is returned, so the UI never
 * flashes empty.
 */
export function useLocalisedLessons(): {
  lessons: Lesson[];
  locale: Language;
  loading: boolean;
} {
  const locale = useLanguage();
  const [state, setState] = useState<{ lessons: Lesson[]; locale: Language; loading: boolean }>(
    () => ({ lessons: LESSONS, locale, loading: locale !== "en" }),
  );

  useEffect(() => {
    let cancelled = false;
    setState((cur) => ({
      lessons: cur.lessons,
      locale,
      loading: locale !== "en",
    }));
    void loadLessonsForLocale(locale).then((lessons) => {
      if (cancelled) return;
      setState({ lessons, locale, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return state;
}

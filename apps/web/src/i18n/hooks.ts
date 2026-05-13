import { useCallback, useEffect, useState } from "react";
import { getLanguage, t as legacyT, useLanguage, type Language } from "../lib/i18n";
import { en, type StringKey } from "./strings/en";

/**
 * 🪝 `useT` — viewer-UI translation hook.
 *
 * Wraps the existing low-level `t(key, fallback)` lookup in `lib/i18n.ts`
 * with two ergonomic improvements:
 *
 *   1. **English source-of-truth.** Every key has a canonical English
 *      value in `i18n/strings/en.ts`. The fallback is automatic — callers
 *      pass only the key.
 *
 *   2. **`{param}` interpolation.** Pass an object as the second arg and
 *      every `{name}` token in the resolved string is replaced. Unknown
 *      tokens fall through unchanged.
 *
 * Missing keys log once per session (via the warn-once Set below) so
 * regressions show up in the browser console without flooding it.
 *
 * Subscribes to the live `useLanguage()` hook so a {@link LanguagePicker}
 * change re-renders consumers automatically.
 */

const warnedMissing = new Set<string>();

function interpolate(
  template: string,
  params?: Readonly<Record<string, string | number>>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (full, key: string) => {
    const v = params[key];
    return v === undefined || v === null ? full : String(v);
  });
}

/**
 * Resolve a key to a translated string. Lives outside the hook so
 * non-React code (e.g. tour state machines) can use the same lookup
 * without dragging a hook through callbacks.
 *
 * Resolution order:
 *   1. The translated dictionary for `getLanguage()` (loaded async).
 *   2. The English source of truth in {@link en}.
 *   3. The raw key string (last-resort, also logged).
 */
export function translate(
  key: StringKey | string,
  params?: Readonly<Record<string, string | number>>,
): string {
  const englishKey = key as StringKey;
  const englishValue: string | undefined = (en as Record<string, string>)[englishKey];
  // Legacy `t` reads the active language dictionary; if no translation
  // exists it returns our supplied fallback (the English source).
  const resolved = legacyT(englishKey, englishValue ?? englishKey);
  if (englishValue === undefined && !warnedMissing.has(englishKey)) {
    warnedMissing.add(englishKey);
    // eslint-disable-next-line no-console
    // Logged via the project logger to honour the no-console-log rule.
    // Lazy require avoids a static import cycle with logger consumers.
    void (async () => {
      const { log } = await import("../lib/logger");
      log.warn(`[i18n] missing English source for key "${englishKey}"`);
    })();
  }
  return interpolate(resolved, params);
}

/**
 * React hook returning a stable `t(key, params?)` callback that
 * re-renders the host component when the active language changes.
 *
 * Re-render is driven by `useLanguage()` — the hook below is just a
 * thin wrapper that returns a memo-stable translator each render.
 */
export function useT(): (
  key: StringKey | string,
  params?: Readonly<Record<string, string | number>>,
) => string {
  const lang = useLanguage();
  // The callback identity depends on `lang` so dependent memos invalidate
  // when the user flips locale.
  return useCallback(
    (key, params) => translate(key, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
}

/**
 * Apply the `?lang=es` (or `?lang=fr`, etc.) query string preference on
 * mount. The legacy `lib/i18n.ts` already honours `localStorage` and
 * navigator settings; this hook layers the URL override on top so
 * `unspeakable-world.dashable.dev/?lang=es` immediately swaps the UI.
 *
 * Called once from `App.tsx`. Idempotent — re-running with no `?lang=`
 * present is a no-op.
 */
export function useLangQueryParam(): void {
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    if (applied || typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("lang");
      if (!raw) {
        setApplied(true);
        return;
      }
      const candidate = raw.toLowerCase().split(/[-_]/)[0];
      const allowed: ReadonlyArray<Language> = ["en", "es", "fr", "de", "ja", "zh"];
      const hit = allowed.find((l) => l === candidate);
      if (hit && hit !== getLanguage()) {
        // Lazy-import avoids pulling setLanguage into the hooks bundle
        // when the param is absent.
        void import("../lib/i18n").then((m) => m.setLanguage(hit));
      }
    } catch {
      /* ignore malformed URLs */
    }
    setApplied(true);
  }, [applied]);
}

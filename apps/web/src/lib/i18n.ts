import { useEffect, useState } from "react";

/**
 * 🌐 Minimal i18n scaffold.
 *
 * Proof-of-loop: 5 non-English dictionaries (~50 keys each) plus
 * hardcoded English fallback. A language picker writes the selection
 * to `uw:language:v1` and broadcasts a change event so components
 * subscribed via `useLanguage` re-render.
 *
 * Non-English dictionaries are loaded on demand with dynamic
 * `import()` so we don't ship 5 JSON blobs to every visitor. The
 * English path is synchronous and free.
 */

export type Language = "en" | "es" | "fr" | "de" | "ja" | "zh";

export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  code: Language;
  label: string;
  flag: string;
}> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const STORAGE_KEY = "uw:language:v1";

function isLanguage(s: unknown): s is Language {
  return (
    s === "en" ||
    s === "es" ||
    s === "fr" ||
    s === "de" ||
    s === "ja" ||
    s === "zh"
  );
}

function pickFromNavigator(): Language {
  if (typeof navigator === "undefined") return "en";
  const langs = (navigator.languages?.length
    ? navigator.languages
    : [navigator.language ?? "en"]) as ReadonlyArray<string>;
  for (const raw of langs) {
    const code = raw.toLowerCase().split(/[-_]/)[0] ?? "";
    if (isLanguage(code)) return code;
  }
  return "en";
}

function initialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    /* ignore */
  }
  return pickFromNavigator();
}

let currentLang: Language = initialLanguage();
const dictionaries: Partial<Record<Language, Record<string, string>>> = {
  en: {}, // English keys fall through to fallback or the literal key.
};
const listeners = new Set<(l: Language) => void>();
const inflight = new Map<Language, Promise<void>>();

function broadcast(): void {
  for (const cb of listeners) cb(currentLang);
}

async function loadDictionary(lang: Language): Promise<void> {
  if (lang === "en" || dictionaries[lang]) return;
  let promise = inflight.get(lang);
  if (!promise) {
    promise = (async () => {
      try {
        // Vite resolves the glob at build time; the dynamic specifier
        // is restricted to the i18n/ folder so only those JSON files
        // are reachable.
        const mod = (await import(`../i18n/${lang}.json`)) as {
          default?: Record<string, string>;
        };
        dictionaries[lang] = mod.default ?? {};
      } catch {
        dictionaries[lang] = {};
      }
    })();
    inflight.set(lang, promise);
  }
  await promise;
  broadcast();
}

// Kick off the initial non-English load so first paint has translations
// ready by the time the LanguagePicker fires.
if (currentLang !== "en") {
  void loadDictionary(currentLang);
}

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language): void {
  if (!isLanguage(lang)) return;
  currentLang = lang;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }
  if (lang === "en") {
    broadcast();
    return;
  }
  void loadDictionary(lang);
  broadcast();
}

/**
 * Lookup a key in the active dictionary. If the active language is
 * English (or the key is missing from the loaded dictionary), the
 * caller-supplied `fallback` is returned; if no fallback is given, the
 * raw key is returned so the missing string is at least visible.
 */
export function t(key: string, fallback?: string): string {
  if (currentLang === "en") return fallback ?? key;
  const dict = dictionaries[currentLang];
  const hit = dict?.[key];
  if (hit) return hit;
  return fallback ?? key;
}

/** React hook returning the active language; re-renders on change. */
export function useLanguage(): Language {
  const [lang, setLang] = useState<Language>(currentLang);
  useEffect(() => {
    const cb = (l: Language) => setLang(l);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return lang;
}

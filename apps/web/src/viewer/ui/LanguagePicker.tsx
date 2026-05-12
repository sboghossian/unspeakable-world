import {
  SUPPORTED_LANGUAGES,
  setLanguage,
  useLanguage,
  type Language,
} from "../../lib/i18n";

/**
 * 🌐 Language picker — a compact row of flag pills.
 *
 * Lives inside the SettingsPanel under its own "Language" section. The
 * active language is highlighted; clicking another pill updates the
 * global store, persists the choice, and broadcasts to every consumer
 * of {@link useLanguage}.
 */
export function LanguagePicker() {
  const active = useLanguage();
  return (
    <div className="grid grid-cols-3 gap-1">
      {SUPPORTED_LANGUAGES.map((lang) => {
        const on = lang.code === active;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code as Language)}
            title={lang.label}
            aria-pressed={on}
            className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] transition ${
              on
                ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span aria-hidden>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}

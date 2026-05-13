import { type DisplayFont, useSettings } from "../../lib/settings";

/**
 * 🅰 Font picker — three-way toggle between the display faces that the
 * sky viewer's `font-display` surfaces (headlines, panel titles, "ask",
 * etc.) render in. Persisted via the global settings store, applied
 * globally by the `<html data-font="…">` attribute that `main.tsx`
 * keeps in sync; see `styles.css` for the selectors that actually
 * swap the family.
 *
 * The picker itself is presentation-only — no scene-side wiring — so
 * it's safe to drop into any settings surface. Currently mounted at
 * the bottom of `SettingsPanel.tsx` under a "Typography" section.
 */

type Option = {
  id: DisplayFont;
  label: string;
  hint: string;
  /** Inline preview class — uses Tailwind's font-display so the user
   *  sees the live result of their selection while picking. */
  previewClass: string;
};

const OPTIONS: readonly Option[] = [
  {
    id: "cosmic",
    label: "Cosmic",
    hint: "Space Grotesk (default)",
    previewClass: "font-display",
  },
  {
    id: "editorial",
    label: "Editorial",
    hint: "humanist serif",
    previewClass: "font-serif italic",
  },
  {
    id: "mono",
    label: "Mono",
    hint: "retro CRT monospace",
    previewClass: "font-mono",
  },
];

export function FontPicker() {
  const [s, update] = useSettings();
  return (
    <div
      role="radiogroup"
      aria-label="Display font"
      className="flex flex-col gap-1"
    >
      {OPTIONS.map((opt) => {
        const active = s.displayFont === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => update({ displayFont: opt.id })}
            className={`flex items-baseline justify-between rounded-md border px-2.5 py-1.5 text-left transition ${
              active
                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className={`text-sm ${opt.previewClass}`}>{opt.label}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/45">
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

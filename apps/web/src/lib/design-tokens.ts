/**
 * Design tokens for The Unspeakable World viewer UI.
 *
 * Single source of truth for Tailwind class fragments shared across the
 * ~100 viewer panels. Every primitive in `viewer/ui/primitives/` reads
 * its base classes from this file; every refactored panel reads the
 * same fragments instead of hardcoding strings.
 *
 * Why class fragments and not CSS variables: the existing codebase is
 * Tailwind-only (CLAUDE.md hard constraint, no inline styles, no CSS
 * modules), and Tailwind's JIT requires literal class names at build
 * time. Exporting reusable class fragments keeps JIT happy while
 * funnelling every "rounded-xl border bg-space-950/95" decision through
 * one file.
 *
 * Edit a single key here to change every panel that uses it.
 */

// ─── Radius ───────────────────────────────────────────────────────────

/** Corner radii. `sm` for buttons/inputs, `md` for cards/popovers,
 *  `lg` for large modals, `pill` for capsule chips/badges. */
export const RADIUS = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  pill: "rounded-full",
} as const;
export type Radius = keyof typeof RADIUS;

// ─── Padding ──────────────────────────────────────────────────────────

/** Padding scale. `tight` for chips/badges, `normal` for buttons/inputs,
 *  `loose` for card bodies. Combine with explicit Tailwind padding for
 *  panel-level spacing (p-3, p-4, p-6 etc.). */
export const PADDING = {
  tight: "px-2 py-1",
  normal: "px-2.5 py-1.5",
  loose: "px-3 py-2",
} as const;
export type Padding = keyof typeof PADDING;

// ─── Panel surfaces ───────────────────────────────────────────────────

/**
 * Panel surface styles. `glass` is the canonical viewer popover (top-
 * bar dropdowns, side panels). `subtle` is for nested cards inside a
 * glass panel (toggles, list items). `elevated` adds shadow for modal-
 * level focus.
 */
export const PANEL = {
  glass: "border border-white/10 bg-space-950/95 backdrop-blur",
  subtle: "border border-white/10 bg-white/[0.03]",
  elevated: "border border-white/10 bg-space-950/95 shadow-2xl backdrop-blur",
} as const;
export type Panel = keyof typeof PANEL;

// ─── Text styles ──────────────────────────────────────────────────────

/**
 * Typographic styles. `label` is the uppercase mono section header used
 * everywhere. `body` is default panel body copy. `caption` is small
 * mono captions. `display` is the headline display face.
 */
export const TEXT = {
  label:
    "font-mono text-[10px] uppercase tracking-[0.25em] text-white/45",
  body: "text-sm text-white/85",
  caption: "font-mono text-[11px] text-white/55",
  display: "font-display text-base text-white/95",
} as const;
export type TextStyle = keyof typeof TEXT;

// ─── Button variants ──────────────────────────────────────────────────

/**
 * Button colour variants. Every variant string is a full class fragment
 * that includes border + background + text + hover + transition — drop
 * straight into a `<button className={BUTTON.primary}>` and the variant
 * is complete (caller still adds size/padding).
 *
 *  - `primary`   – the affirmative "send", "next", "save" action
 *  - `secondary` – the neutral default button (white/10 surface)
 *  - `danger`    – destructive actions (clear, delete)
 *  - `ghost`     – text-only button, no surface (close ×, link buttons)
 */
export const BUTTON = {
  primary:
    "border border-emerald-400/55 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25 transition",
  secondary:
    "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition",
  danger:
    "border border-rose-400/40 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20 transition",
  ghost:
    "border border-transparent bg-transparent text-white/60 hover:bg-white/10 hover:text-white transition",
} as const;
export type ButtonVariant = keyof typeof BUTTON;

// ─── Semantic tones ───────────────────────────────────────────────────

/**
 * Semantic tones for pills, badges and status indicators. Use these for
 * meaning, not raw colour — "danger" instead of "rose", "success"
 * instead of "emerald" — so the palette can be re-tuned centrally.
 */
export type SemanticTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "accent";

export const COLOR: Record<SemanticTone, string> = {
  info: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  success: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  warning: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  danger: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  muted: "border-white/10 bg-white/5 text-white/55",
  accent: "border-violet-400/40 bg-violet-400/15 text-violet-100",
};

// ─── cn() helper ──────────────────────────────────────────────────────

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

/**
 * Tiny `clsx`-style class joiner. Accepts strings, numbers, booleans,
 * arrays, and `{cls: cond}` objects. Filters out falsy values and joins
 * with single spaces. Intentionally dependency-free.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input && input !== 0) continue;
    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
      continue;
    }
    if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) out.push(inner);
      continue;
    }
    if (typeof input === "object") {
      for (const key of Object.keys(input)) {
        if ((input as Record<string, unknown>)[key]) out.push(key);
      }
    }
  }
  return out.join(" ");
}

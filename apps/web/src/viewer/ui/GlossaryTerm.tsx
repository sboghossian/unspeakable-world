import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";

import { glossaryFor } from "../data/glossary";

/**
 * Inline term with a dotted underline that reveals a small Tailwind-styled
 * tooltip on hover or tap. The tooltip surfaces the `short` definition; if
 * the term resolves, the tooltip also includes a `More →` link that points
 * at the future `/glossary/{slug}` page so power users can dig deeper.
 *
 * Looks and behaves consistently with the rest of the InfoPanel:
 *   • dotted underline, slight cyan glow on hover
 *   • Tailwind-only styling — no portals, no measurements
 *   • the tooltip is keyboard-accessible (focus/blur in addition to hover)
 *   • on touch devices the term toggles instead of "hover"
 *
 * Falls back gracefully: if the term is not in the glossary, the component
 * renders the underlined children but no tooltip — so it can be sprinkled
 * into long prose blocks safely.
 */
export function GlossaryTerm({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();
  const entry = glossaryFor(term);

  // Tap-anywhere-else closes the tooltip on touch devices.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent): void => {
      const t = triggerRef.current;
      if (!t) return;
      if (e.target instanceof Node && t.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  if (!entry) {
    return (
      <span className="border-b border-dotted border-white/25 text-white/85">
        {children}
      </span>
    );
  }

  const slug = encodeURIComponent(entry.term.toLowerCase().replace(/\s+/g, "-"));

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help border-b border-dotted border-cyan-300/60 text-white/90 transition-colors hover:border-cyan-200 hover:text-cyan-100 focus:outline-none focus-visible:border-cyan-200 focus-visible:text-cyan-100"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="pointer-events-auto absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-md border border-white/15 bg-space-950/95 px-3 py-2 text-left text-[12px] leading-snug text-white/85 shadow-2xl backdrop-blur"
        >
          <span className="block font-mono text-[10px] uppercase tracking-widest text-cyan-300/80">
            {entry.term}
          </span>
          <span className="mt-1 block text-white/80">{entry.short}</span>
          <a
            href={`/glossary/${slug}`}
            className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-cyan-300 hover:text-cyan-200"
          >
            More →
          </a>
        </span>
      )}
    </span>
  );
}

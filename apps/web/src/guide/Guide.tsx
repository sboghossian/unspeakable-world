import { useEffect, useMemo, useState } from "react";
import { GUIDE_PAGES, type GuidePage } from "./pages";

/**
 * 📖 User Guide — modeled on AstroGrid's `/guide`.
 *
 * Hash-based: `/#guide` opens the Essentials page; `/#guide/<slug>`
 * jumps to a specific page. Sidebar nav on the left, content on the
 * right, all in one route.
 */

function getSlugFromHash(): string {
  if (typeof window === "undefined") return "essentials";
  const m = window.location.hash.match(/^#guide(?:\/([\w-]+))?/);
  return (m && m[1]) || "essentials";
}

export function Guide({ onExit }: { onExit: () => void }) {
  const [slug, setSlug] = useState(getSlugFromHash());

  useEffect(() => {
    const onHash = () => setSlug(getSlugFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const page: GuidePage =
    useMemo(() => GUIDE_PAGES.find((p) => p.slug === slug), [slug]) ??
    GUIDE_PAGES[0]!;

  const goto = (s: string) => {
    window.location.hash = `#guide/${s}`;
  };

  return (
    <main className="relative h-full w-full overflow-y-auto bg-space-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-8 lg:h-fit lg:w-64 lg:shrink-0">
          <div className="mb-4 flex items-baseline justify-between">
            <button
              type="button"
              onClick={onExit}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white"
            >
              ← back to app
            </button>
          </div>
          <div className="mb-4 font-display text-2xl text-white">
            User Guide
          </div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            The Unspeakable World · v4
          </div>
          <nav className="flex flex-col gap-0.5">
            {GUIDE_PAGES.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => goto(p.slug)}
                className={`rounded-md px-3 py-1.5 text-left font-mono text-xs transition ${
                  p.slug === slug
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {p.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <article className="prose-invert flex-1 max-w-3xl">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">
            {page.section}
          </div>
          <h1 className="mb-1 font-display text-4xl">{page.title}</h1>
          {page.lede && (
            <p className="mb-6 text-lg text-white/65">{page.lede}</p>
          )}
          <div className="space-y-4 text-[15px] leading-relaxed text-white/80">
            {page.body.map((block, i) => (
              <BlockRenderer key={i} block={block} onLink={goto} />
            ))}
          </div>

          <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-4 font-mono text-xs">
            {page.prev ? (
              <button
                type="button"
                onClick={() => goto(page.prev!)}
                className="text-white/55 hover:text-emerald-200"
              >
                ←{" "}
                {GUIDE_PAGES.find((p) => p.slug === page.prev)?.title ?? page.prev}
              </button>
            ) : (
              <span />
            )}
            {page.next && (
              <button
                type="button"
                onClick={() => goto(page.next!)}
                className="text-white/55 hover:text-emerald-200"
              >
                {GUIDE_PAGES.find((p) => p.slug === page.next)?.title ?? page.next}{" "}
                →
              </button>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}

import type { GuideBlock } from "./pages";

function BlockRenderer({
  block,
  onLink,
}: {
  block: GuideBlock;
  onLink: (slug: string) => void;
}) {
  if (block.kind === "h2") {
    return (
      <h2 className="mt-8 font-display text-2xl text-white">{block.text}</h2>
    );
  }
  if (block.kind === "h3") {
    return (
      <h3 className="mt-6 font-display text-lg text-white">{block.text}</h3>
    );
  }
  if (block.kind === "p") {
    return <p>{block.text}</p>;
  }
  if (block.kind === "ul") {
    return (
      <ul className="list-disc space-y-1 pl-6 marker:text-white/40">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.kind === "kbd") {
    return (
      <table className="w-full table-auto border-collapse text-sm">
        <tbody>
          {block.rows.map(([keys, label], i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="w-1/3 py-1.5 pr-3 font-mono text-white/80">
                {keys}
              </td>
              <td className="py-1.5 text-white/60">{label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (block.kind === "callout") {
    const tone =
      block.tone === "warn"
        ? "border-amber-400/30 bg-amber-400/5 text-amber-200/90"
        : block.tone === "tip"
          ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-200/90"
          : "border-white/10 bg-white/[0.02] text-white/75";
    return (
      <div
        className={`rounded-lg border px-4 py-3 font-mono text-sm ${tone}`}
      >
        {block.text}
      </div>
    );
  }
  if (block.kind === "link") {
    return (
      <button
        type="button"
        onClick={() => onLink(block.slug)}
        className="font-mono text-[11px] uppercase tracking-widest text-emerald-300 underline-offset-2 hover:underline"
      >
        → {block.text}
      </button>
    );
  }
  return null;
}

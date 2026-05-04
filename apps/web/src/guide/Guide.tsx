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
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onHash = () => setSlug(getSlugFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [slug]);

  const page: GuidePage =
    useMemo(() => GUIDE_PAGES.find((p) => p.slug === slug), [slug]) ??
    GUIDE_PAGES[0]!;

  const goto = (s: string) => {
    window.location.hash = `#guide/${s}`;
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? GUIDE_PAGES.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.section.toLowerCase().includes(q) ||
            (p.lede ?? "").toLowerCase().includes(q),
        )
      : GUIDE_PAGES;
    const groups: Array<{ name: string; pages: GuidePage[] }> = [];
    for (const p of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.name === p.section) last.pages.push(p);
      else groups.push({ name: p.section, pages: [p] });
    }
    return groups;
  }, [query]);

  return (
    <main className="relative h-full w-full overflow-y-auto bg-space-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:gap-12">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-10 lg:h-fit lg:w-64 lg:shrink-0">
          <div className="mb-4 flex items-baseline justify-between">
            <button
              type="button"
              onClick={onExit}
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white"
            >
              ← back to app
            </button>
          </div>
          <div className="font-display text-2xl text-white">User Guide</div>
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            The Unspeakable World · v4
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the guide…"
            className="mb-4 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 placeholder-white/30 outline-none focus:border-emerald-400/40 focus:bg-white/10"
          />

          <nav className="flex flex-col gap-4">
            {sections.length === 0 && (
              <div className="font-mono text-xs text-white/30">No matches.</div>
            )}
            {sections.map((g) => (
              <div key={g.name}>
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                  {g.name}
                </div>
                <div className="flex flex-col gap-0.5">
                  {g.pages.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => goto(p.slug)}
                      className={`rounded-md px-3 py-1.5 text-left text-sm transition ${
                        p.slug === slug
                          ? "bg-emerald-400/15 text-emerald-200"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <article className="flex-1 max-w-3xl">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">
            {page.section}
          </div>
          <h1 className="mb-3 font-display text-4xl leading-tight md:text-5xl">
            {page.title}
          </h1>
          {page.lede && (
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-white/65">
              {page.lede}
            </p>
          )}
          <div className="space-y-5 text-[15.5px] leading-[1.75] text-white/80">
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
      <h2 className="mt-10 border-t border-white/5 pt-8 font-display text-2xl font-semibold text-white">
        {block.text}
      </h2>
    );
  }
  if (block.kind === "h3") {
    return (
      <h3 className="mt-6 font-display text-lg font-semibold text-white">
        {block.text}
      </h3>
    );
  }
  if (block.kind === "p") {
    return <p className="text-white/80">{block.text}</p>;
  }
  if (block.kind === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-6 marker:text-emerald-400/60">
        {block.items.map((item, i) => (
          <li key={i} className="text-white/80">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  if (block.kind === "kbd") {
    return (
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        <table className="w-full table-auto border-collapse text-sm">
          <tbody>
            {block.rows.map(([keys, label], i) => (
              <tr
                key={i}
                className={i === 0 ? "" : "border-t border-white/5"}
              >
                <td className="w-1/3 py-2 px-4">
                  <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white/90">
                    {keys}
                  </span>
                </td>
                <td className="py-2 px-4 text-white/65">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.kind === "callout") {
    const tone =
      block.tone === "warn"
        ? "border-amber-400/30 bg-amber-400/5 text-amber-100/95"
        : block.tone === "tip"
          ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-100/95"
          : "border-white/10 bg-white/[0.03] text-white/80";
    const icon =
      block.tone === "warn" ? "⚠" : block.tone === "tip" ? "✦" : "ℹ";
    return (
      <div
        className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}
      >
        <span className="select-none font-mono text-base leading-snug">
          {icon}
        </span>
        <span className="leading-relaxed">{block.text}</span>
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
  if (block.kind === "votes") {
    return <VotesList items={block.items} />;
  }
  return null;
}

function loadVotes(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("uw.guide.votes");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadCast(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("uw.guide.votes.mine");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, true>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function VotesList({
  items,
}: {
  items: Array<{ id: string; title: string; detail: string }>;
}) {
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const persisted = loadVotes();
    const seeded: Record<string, number> = {};
    for (const it of items) {
      seeded[it.id] =
        persisted[it.id] ?? Math.floor(20 + Math.random() * 100);
    }
    return seeded;
  });
  const [cast, setCast] = useState<Record<string, true>>(() => loadCast());

  const persist = (next: Record<string, number>, mine: Record<string, true>) => {
    try {
      localStorage.setItem("uw.guide.votes", JSON.stringify(next));
      localStorage.setItem("uw.guide.votes.mine", JSON.stringify(mine));
    } catch {
      // localStorage might be disabled — fail silent
    }
  };

  const toggle = (id: string) => {
    const isCast = !!cast[id];
    const delta = isCast ? -1 : 1;
    const nextVotes = {
      ...votes,
      [id]: Math.max(0, (votes[id] ?? 0) + delta),
    };
    const nextMine = { ...cast };
    if (isCast) delete nextMine[id];
    else nextMine[id] = true;
    setVotes(nextVotes);
    setCast(nextMine);
    persist(nextVotes, nextMine);
  };

  const sorted = [...items].sort(
    (a, b) => (votes[b.id] ?? 0) - (votes[a.id] ?? 0),
  );

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item) => {
        const count = votes[item.id] ?? 0;
        const mine = !!cast[item.id];
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={`flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2 font-mono text-xs transition ${
                mine
                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
              }`}
              aria-label={mine ? "Remove vote" : "Upvote"}
            >
              <span className="text-base leading-none">▲</span>
              <span className="text-[11px] tabular-nums">{count}</span>
            </button>
            <div>
              <div className="font-display text-base text-white">
                {item.title}
              </div>
              <div className="mt-0.5 text-sm leading-relaxed text-white/65">
                {item.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchEntry, SearchIndex } from "../search/search-index";

/**
 * Top-bar search — type any name, fly to the result.
 *
 * Sources: 9 solar bodies, 314 named bright stars, 879 deep-sky objects
 * (Messier + bright NGC/IC + common names), 88 IAU constellations.
 */

const KIND_BADGE: Record<SearchEntry["kind"], string> = {
  planet: "border-amber-400/40 bg-amber-400/15 text-amber-300",
  star: "border-white/15 bg-white/5 text-white/80",
  dso: "border-plasma-500/40 bg-plasma-500/15 text-plasma-400",
  constellation: "border-violet-500/40 bg-violet-500/15 text-violet-300",
};

const KIND_LABEL: Record<SearchEntry["kind"], string> = {
  planet: "planet",
  star: "star",
  dso: "dso",
  constellation: "cnst",
};

type Props = {
  index: SearchIndex | null;
  onSelect: (entry: SearchEntry) => void;
};

export function SearchBar({ index, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    if (!index || !query.trim()) return [] as SearchEntry[];
    return index.search(query, 8);
  }, [index, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Cmd/Ctrl-K opens + focuses the input from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = (e: SearchEntry) => {
    onSelect(e);
    setOpen(false);
    setQuery("");
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      const r = results[highlight];
      if (r) choose(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="pointer-events-auto rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
        title="Search the sky · ⌘K"
      >
        🔍 search · ⌘K
      </button>
    );
  }

  return (
    <div className="pointer-events-auto relative">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-space-950/85 px-3 py-1.5 font-mono text-sm text-white/85 backdrop-blur">
        <span aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Saturn · Andromeda · M31 · Orion · Polaris…"
          className="w-72 bg-transparent text-sm text-white placeholder-white/30 outline-none md:w-80"
          aria-label="Search the sky"
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-white/40 hover:text-white"
        >
          ✕
        </button>
      </div>
      {results.length > 0 && (
        <ul className="absolute right-0 top-full z-30 mt-2 w-[min(420px,90vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          {results.map((r, i) => (
            <li
              key={r.id}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(r)}
              className={`flex cursor-pointer items-center justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0 transition ${
                i === highlight ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-display text-sm text-white">
                  {r.label}
                </div>
                <div className="truncate font-mono text-[10px] text-white/40">
                  {r.detail}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${KIND_BADGE[r.kind]}`}
              >
                {KIND_LABEL[r.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <div className="absolute right-0 top-full z-30 mt-2 rounded-xl border border-white/10 bg-space-950/95 px-3 py-2 font-mono text-xs text-white/40 backdrop-blur">
          no match in local catalogs
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Vector3 } from "three";
import { type Favorite, removeFavorite } from "../favorites/favorites-store";
import { EmptyState } from "./EmptyState";

/**
 * ★ Favorites menu — opens a dropdown of saved sky targets.
 *
 * Saves are written from the InfoPanel's ★ button. This component is
 * a thin reader: it pulls the list from props (parent owns the live
 * mirror so `★` toggles update both places without an extra subscription).
 */

type Props = {
  favorites: Favorite[];
  onSelect: (dir: Vector3) => void;
  onChange: () => void;
};

const KIND_HINT: Record<string, string> = {
  G: "galaxy",
  "*": "star",
  PN: "nebula",
  Cl: "cluster",
};

export function FavoritesMenu({ favorites, onSelect, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const fly = (f: Favorite) => {
    // Same Z-up → Y-up rotation our astronomy groups apply.
    const ra = (f.raDeg * Math.PI) / 180;
    const dec = (f.decDeg * Math.PI) / 180;
    const cdec = Math.cos(dec);
    const dir = new Vector3(
      cdec * Math.cos(ra),
      Math.sin(dec),
      -cdec * Math.sin(ra),
    ).normalize();
    onSelect(dir);
    setOpen(false);
  };

  const drop = (f: Favorite) => {
    removeFavorite(f.id);
    onChange();
  };

  if (favorites.length === 0 && !open) return null;

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest backdrop-blur transition ${
          open
            ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
            : "border-amber-400/30 bg-amber-400/10 text-amber-300/80 hover:bg-amber-400/20"
        }`}
        title="Saved favorites"
        aria-label={`Saved favorites (${favorites.length})`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="favorites-listbox"
      >
        <span className="md:hidden">★</span>
        <span className="hidden md:inline">★ {favorites.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(360px,90vw)] overflow-hidden rounded-xl border border-white/10 bg-space-950/95 backdrop-blur">
          <div className="border-b border-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-white/65">
            saved · {favorites.length}
          </div>
          {favorites.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon="✦"
                title="Star anything you love"
                body="Click any sky object, then tap ☆ to drop it here. Favorites live in your browser — nothing is ever uploaded."
                tone="amber"
                density="compact"
                cta={{ label: "Browse the sky", onClick: () => setOpen(false) }}
              />
            </div>
          ) : (
            <ul
              className="max-h-[60vh] overflow-y-auto"
              id="favorites-listbox"
              role="listbox"
              aria-label="Saved favorites"
            >
              {favorites.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0 hover:bg-white/[0.04]"
                  role="option"
                  aria-selected="false"
                >
                  <button
                    type="button"
                    onClick={() => fly(f)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate font-display text-sm text-white">
                      {f.name}
                    </div>
                    <div className="truncate font-mono text-[10px] text-white/65">
                      {KIND_HINT[f.type] ?? f.type} · {f.raDeg.toFixed(2)}° /{" "}
                      {f.decDeg.toFixed(2)}°
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => drop(f)}
                    aria-label="Remove"
                    title="Remove from favorites"
                    className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

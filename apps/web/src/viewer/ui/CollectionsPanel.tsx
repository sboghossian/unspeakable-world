import { useEffect, useMemo, useState } from "react";

import {
  addToCollection,
  createCollection,
  deleteCollection,
  encodeCollection,
  readCollectionFromHash,
  removeFromCollection,
  saveImportedCollection,
  useCollections,
  type Collection,
  type CollectionItem,
} from "../../lib/collections";
import { t, useLanguage } from "../../lib/i18n";

/**
 * 📂 Collections — named lists of saved objects, shareable by URL.
 *
 * No server. The current state lives in `localStorage`; a "share URL"
 * button serialises a collection into the page URL hash via
 * `#collection=<base64url>` so handing it to a friend imports the same
 * list on their machine.
 *
 * If the page is opened with such a hash, the popover auto-opens and
 * shows a "save this collection" preview pane until the visitor saves
 * (or dismisses) it.
 */

type Props = {
  /** Optional fly-to callback so list items can navigate the scene. */
  onFlyTo?: (item: CollectionItem) => void;
};

export function CollectionsPanel({ onFlyTo }: Props) {
  // Subscribe to the active language so panel labels re-render on switch.
  useLanguage();

  const collections = useCollections();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [shared, setShared] = useState<Collection | null>(() =>
    readCollectionFromHash(),
  );
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  // Auto-open the popover when a hash-shared collection is detected.
  useEffect(() => {
    if (shared) setOpen(true);
  }, [shared]);

  // Watch the hash so a navigation that lands here (e.g. a friend's
  // bookmark) is picked up after mount.
  useEffect(() => {
    const onHashChange = () => {
      const next = readCollectionFromHash();
      if (next) {
        setShared(next);
        setOpen(true);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const active = useMemo(
    () => collections.find((c) => c.id === activeId) ?? null,
    [collections, activeId],
  );

  const handleCreate = () => {
    const name = draftName.trim();
    if (!name) return;
    const c = createCollection(name);
    setDraftName("");
    setActiveId(c.id);
  };

  const handleShare = async (c: Collection) => {
    const encoded = encodeCollection(c);
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = `${base}#collection=${encoded}`;
    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      copied = false;
    }
    setShareNotice(copied ? "Link copied to clipboard" : url);
    window.setTimeout(() => setShareNotice(null), 4000);
  };

  const handleExport = (c: Collection) => {
    const json = JSON.stringify(c, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(c.name)}.collection.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const total = collections.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("panel.collections", "Collections")}
        aria-label={t("panel.collections", "Collections")}
        className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-space-950/70 px-2 text-[12px] text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <span aria-hidden>📂</span>
        <span className="font-mono text-[10px] tracking-widest">{total}</span>
      </button>

      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(380px,92vw)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              {t("collections.title", "Collections")}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("action.close", "Close")}
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {shared && (
            <div className="mb-3 rounded-md border border-emerald-400/30 bg-emerald-400/5 p-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300/80">
                {t("collections.shared", "Shared collection")}
              </div>
              <div className="font-display text-sm text-white/90">
                {shared.name}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-white/45">
                {shared.items.length} ·{" "}
                {shared.items
                  .slice(0, 3)
                  .map((it) => it.label)
                  .join(" · ")}
                {shared.items.length > 3 ? " · …" : ""}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fresh = saveImportedCollection(shared);
                    setShared(null);
                    setActiveId(fresh.id);
                  }}
                  className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20"
                >
                  {t("collections.savePreview", "Save this collection")}
                </button>
                <button
                  type="button"
                  onClick={() => setShared(null)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/55 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {!active && (
            <>
              <div className="mb-3 flex gap-1.5">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                  placeholder={t("collections.new", "New collection")}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/85 outline-none placeholder:text-white/30 focus:border-cyan-400/40"
                  aria-label={t("collections.new", "New collection")}
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!draftName.trim()}
                  className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="font-mono text-[11px] text-white/40">
                  {t(
                    "collections.empty",
                    "No collections yet. Create one to start curating.",
                  )}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {collections.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-white/8 bg-white/[0.02] p-2"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className="w-full text-left"
                      >
                        <div className="font-display text-[13px] text-white/90">
                          {c.name}
                        </div>
                        <div className="font-mono text-[10px] text-white/45">
                          {c.items.length} ·{" "}
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </div>
                      </button>
                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleShare(c)}
                          className="flex-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
                        >
                          {t("collections.share", "Share URL")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport(c)}
                          className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/65 hover:bg-white/10 hover:text-white"
                        >
                          {t("collections.export", "Export JSON")}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCollection(c.id)}
                          aria-label="Delete collection"
                          className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-rose-200/80 hover:bg-rose-400/20"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {active && (
            <div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="mb-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/55 hover:text-white"
              >
                ← {t("collections.title", "Collections")}
              </button>
              <div className="mb-2 flex items-baseline justify-between">
                <div className="font-display text-sm text-white/90">
                  {active.name}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {active.items.length}
                </div>
              </div>
              <div className="mb-3 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShare(active)}
                  className="flex-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
                >
                  {t("collections.share", "Share URL")}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(active)}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/65 hover:bg-white/10 hover:text-white"
                >
                  {t("collections.export", "Export JSON")}
                </button>
              </div>
              {active.items.length === 0 ? (
                <div className="font-mono text-[11px] text-white/40">
                  {t(
                    "collections.empty",
                    "No objects yet. Add some from the inspector.",
                  )}
                </div>
              ) : (
                <ul className="space-y-1">
                  {active.items.map((it) => (
                    <li
                      key={`${it.type}:${it.id}`}
                      className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-[12.5px] text-white">
                          {it.label}
                        </div>
                        <div className="truncate font-mono text-[9.5px] uppercase tracking-widest text-white/40">
                          {it.type}
                        </div>
                      </div>
                      {onFlyTo && (
                        <button
                          type="button"
                          onClick={() => {
                            onFlyTo(it);
                            setOpen(false);
                          }}
                          title={t("common.flyHere", "Fly here")}
                          className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20"
                        >
                          ↗
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFromCollection(active.id, it.id)}
                        aria-label="Remove"
                        className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/55 hover:bg-white/10 hover:text-white"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {shareNotice && (
            <div className="mt-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] text-emerald-200">
              {shareNotice}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Compact dropdown picker. Renders alongside the "favorite" affordance
 * in the InfoPanel — picking a collection inserts the supplied item.
 */
export function AddToCollectionMenu({
  item,
}: {
  item: CollectionItem | null;
}) {
  useLanguage();
  const collections = useCollections();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  if (!item) return null;

  const handleAdd = (collectionId: string) => {
    addToCollection(collectionId, item);
    setOpen(false);
  };

  const handleCreate = () => {
    const name = draftName.trim();
    if (!name) return;
    const c = createCollection(name);
    addToCollection(c.id, item);
    setDraftName("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("collections.addTo", "Add to collection")}
        aria-label={t("collections.addTo", "Add to collection")}
        className="shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white/65 transition hover:bg-white/10 hover:text-white"
      >
        📂+
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-[min(260px,80vw)] rounded-xl border border-white/10 bg-space-950/95 p-2 shadow-lg backdrop-blur">
          <div className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/55">
            {t("collections.addTo", "Add to collection")}
          </div>
          {collections.length > 0 && (
            <ul className="mb-2 max-h-[40vh] space-y-1 overflow-y-auto">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(c.id)}
                    className="flex w-full items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-left font-mono text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="ml-2 shrink-0 text-[9px] uppercase tracking-widest text-white/40">
                      {c.items.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder={t("collections.new", "New collection")}
              className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/85 outline-none placeholder:text-white/30 focus:border-cyan-400/40"
              aria-label={t("collections.new", "New collection")}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!draftName.trim()}
              className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "collection"
  );
}

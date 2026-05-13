import { useEffect, useMemo, useRef, useState } from "react";

import { log } from "../../lib/logger";
import { track } from "../../lib/telemetry";
import { EXTRA_LAYERS, type LayerMeta } from "../extra-layers/registry";
import { useExtraLayers, useExtraLayersStore } from "../extra-layers/state";
import { makeLayerHashWriter, seedStoreFromHash } from "./layer-hash";

/**
 * Minimal contract any scene must satisfy to host the panel. Sky /
 * solar / galactic / universe scene classes all implement this.
 */
export type ExtraLayersHost = {
  listExtraLayers(): LayerMeta[];
  setExtraLayer(id: string, enabled: boolean): void;
};

type Props = {
  scene: ExtraLayersHost | null;
};

/**
 * Sub-tab grouping for the 15 federated layers. Catalogs/3D/Live/Imagery
 * keeps each tab small enough to scan without scrolling, and lets each
 * tab show its own on-count for quick triage.
 */
type LayerTabId = "catalogs" | "structure" | "alerts" | "imagery";

type LayerTabDef = {
  id: LayerTabId;
  label: string;
  icon: string;
  layerIds: readonly string[];
};

const LAYER_TABS: readonly LayerTabDef[] = [
  {
    id: "catalogs",
    label: "Catalogs",
    icon: "📚",
    layerIds: [
      "gaia-stars",
      "exoplanets-full",
      "chandra",
      "variables",
      "neocp-risk",
    ],
  },
  {
    id: "structure",
    label: "3D structure",
    icon: "🧭",
    layerIds: ["galaxy-cone", "cosmicflows4"],
  },
  {
    id: "alerts",
    label: "Live alerts",
    icon: "📡",
    layerIds: [
      "multimessenger",
      "ztf-alerts",
      "atel",
      "fxt",
      "goto",
      "blackgem",
      "starlink-optin",
    ],
  },
  {
    id: "imagery",
    label: "Imagery & culture",
    icon: "🎨",
    layerIds: [
      "planck-polarization",
      "sky-cultures-extended",
      "globe-at-night",
      "opal-giants",
      "mars-rover-iotd",
      "sonification",
    ],
  },
];

const ACTIVE_TAB_STORAGE_KEY = "uw:extra-layers:active-tab";

function readActiveTab(): LayerTabId {
  if (typeof window === "undefined") return "catalogs";
  try {
    const raw = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (
      raw === "catalogs" ||
      raw === "structure" ||
      raw === "alerts" ||
      raw === "imagery"
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "catalogs";
}

function writeActiveTab(tab: LayerTabId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * ✨ Extra Layers — single popover that exposes every federated overlay
 * advertised by the extra-layers registry (Gaia DR3, Chandra, multi-
 * messenger, planck polarization, sky cultures extended, ZTF alerts, …).
 *
 * Modules are dynamically imported by the scene's `ExtrasController`
 * the first time a layer is toggled on. The panel shows a small
 * loading spinner next to the toggle while that import is in flight,
 * by awaiting the same loader thunk (dynamic imports are deduped by
 * the JS runtime so there's no second fetch).
 *
 * Designed to be cheap to add to the main sky viewer: drop the
 * component into the top bar, pass the scene ref, and toggles persist
 * in localStorage automatically.
 */
export function ExtraLayersPanel({ scene }: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<LayerTabId>(() =>
    readActiveTab(),
  );
  const setActiveTab = (next: LayerTabId): void => {
    setActiveTabState(next);
    writeActiveTab(next);
  };
  // The zustand store is the single source of truth for layer toggles.
  // Initial seed from localStorage happens in the store's create().
  // URL hash wins over localStorage on first mount — if a `layers=…`
  // hash is present, we replace the store with that selection so a
  // shared deep-link restores the sender's view. We only do this once
  // per panel mount; subsequent toggles flow through the store.
  const enabled = useExtraLayers();
  const hashSeededRef = useRef<boolean>(false);
  if (!hashSeededRef.current) {
    hashSeededRef.current = true;
    // `seedStoreFromHash` reads `location.hash` once and pushes any
    // `layers=…` selection into the store via `replace()`. The store
    // persists (debounced 200 ms) so subsequent reloads without the
    // hash keep the shared view sticky — identical semantics to the
    // prior `writeEnabled` call that lived inline here.
    seedStoreFromHash();
  }
  // Per-component debounced writer for the `layers` hash key. Skips the
  // very first sync (we don't want to spawn a history entry just from
  // mounting the panel) — only post-mount toggles write to the URL.
  const hashWriterRef = useRef<ReturnType<typeof makeLayerHashWriter> | null>(
    null,
  );
  const didMountRef = useRef<boolean>(false);
  /** Set of layer ids whose module download is currently in flight. */
  const [loading, setLoading] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  /** Set of layer ids whose module has finished loading at least once. */
  const loadedRef = useRef<Set<string>>(new Set<string>());
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Read the live list of layers mounted by the scene. The registry is
  // static so we could call `listExtras(mode)` directly, but reading
  // from the scene also tells us if any layer failed to mount (it'd be
  // missing from the list).
  const metas = useMemo(() => scene?.listExtraLayers() ?? [], [scene]);

  // Loader lookup: map of layer id → registry entry loader. Used to
  // observe the dynamic import promise for spinner UI.
  const loadersById = useMemo(() => {
    const m = new Map<string, () => Promise<unknown>>();
    for (const entry of EXTRA_LAYERS) m.set(entry.id, entry.loader);
    return m;
  }, []);

  // Push the persisted toggle state to the scene whenever scene or
  // state changes. Cheap idempotent operation — each scene.setExtraLayer
  // just flips a `.visible` flag (or kicks off a lazy import).
  useEffect(() => {
    if (!scene) return;
    for (const meta of metas) {
      const on = enabled[meta.id] === true;
      try {
        scene.setExtraLayer(meta.id, on);
      } catch (err) {
        log.warn(`[extra-layers] sync ${meta.id}`, err);
      }
      // If we asked for ON and we've never seen this module load yet,
      // observe the dynamic import for the spinner UI. Dynamic imports
      // are deduped by the runtime, so this rides the same fetch.
      if (on && !loadedRef.current.has(meta.id)) {
        const loader = loadersById.get(meta.id);
        if (!loader) continue;
        setLoading((prev) => {
          if (prev.has(meta.id)) return prev;
          const next = new Set(prev);
          next.add(meta.id);
          return next;
        });
        void loader()
          .catch((err: unknown) => {
            log.warn(`[extra-layers] panel-observed load failed: ${meta.id}`, err);
          })
          .finally(() => {
            loadedRef.current.add(meta.id);
            setLoading((prev) => {
              if (!prev.has(meta.id)) return prev;
              const next = new Set(prev);
              next.delete(meta.id);
              return next;
            });
          });
      }
    }
  }, [scene, metas, enabled, loadersById]);

  // Debounced URL-hash sync. Fires only on user-driven toggle changes —
  // initial mount is skipped so we never spawn a spurious history entry
  // and `open`/close transitions don't touch the hash at all (we don't
  // depend on `open` here).
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!hashWriterRef.current) hashWriterRef.current = makeLayerHashWriter();
    const ids = Object.keys(enabled).filter((id) => enabled[id] === true);
    hashWriterRef.current.schedule(ids);
    return () => {
      // Don't cancel: we want a pending write to land even if the
      // component re-renders before the timer fires. Cleanup happens
      // in the unmount-only effect below.
    };
  }, [enabled]);

  // Cancel any pending hash write on unmount so we don't fire a stale
  // selection after the user has navigated away from the viewer.
  useEffect(() => {
    return () => {
      hashWriterRef.current?.cancel();
    };
  }, []);

  // Close popover on Escape or outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (popoverRef.current?.contains(t)) return;
      if (buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick, true);
    };
  }, [open]);

  function toggle(id: string): void {
    const store = useExtraLayersStore.getState();
    store.toggle(id);
    // Most important telemetry signal in the app — tells us which
    // of the 21 federated layers anyone actually flips on. No PII.
    track("extra_layer_toggle", {
      id,
      enabled: useExtraLayersStore.getState().enabled[id] === true,
    });
  }

  const anyOn = metas.some((m) => enabled[m.id]);
  const onCount = metas.filter((m) => enabled[m.id]).length;

  // Bucket the live metas by sub-tab once per (metas, activeTab) change.
  // Anything unmapped (future registry additions) lands in "catalogs" so
  // it stays discoverable instead of disappearing from the UI.
  const tabBuckets = useMemo(() => {
    const byId = new Map<string, LayerMeta>();
    for (const meta of metas) byId.set(meta.id, meta);
    const seen = new Set<string>();
    const buckets = new Map<LayerTabId, LayerMeta[]>();
    for (const tab of LAYER_TABS) {
      const list: LayerMeta[] = [];
      for (const id of tab.layerIds) {
        const m = byId.get(id);
        if (m) {
          list.push(m);
          seen.add(id);
        }
      }
      buckets.set(tab.id, list);
    }
    // Drop unmapped layers into the first tab so a registry addition can't
    // silently vanish from the UI before the grouping is updated.
    const fallback = buckets.get("catalogs") ?? [];
    for (const meta of metas) {
      if (!seen.has(meta.id)) fallback.push(meta);
    }
    return buckets;
  }, [metas]);

  const activeMetas = tabBuckets.get(activeTab) ?? [];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Federated data layers (${metas.length} available, ${onCount} on)`}
        aria-label="Extra federated layers"
        aria-expanded={open}
        className={`pointer-events-auto inline-flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5 font-mono text-xs backdrop-blur transition ${
          anyOn
            ? "border-violet-400/40 bg-violet-400/15 text-violet-100"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>✨</span>
        <span className="hidden md:inline">layers</span>
        {onCount > 0 && (
          <span className="rounded-sm bg-violet-400/30 px-1 text-[10px] text-violet-50">
            {onCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="pointer-events-auto absolute right-0 top-9 z-30 w-[min(420px,94vw)] max-h-[min(560px,80vh)] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 shadow-2xl backdrop-blur"
          role="dialog"
          aria-label="Federated data layers"
        >
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-sm text-white/95">
                Federated data
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                {metas.length} overlays · {onCount} on
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {metas.length === 0 && (
            <div className="rounded-md border border-amber-400/30 bg-amber-400/10 p-2 font-mono text-[11px] text-amber-200">
              Scene not ready yet. Try again in a moment.
            </div>
          )}

          {metas.length > 0 && (
            <div
              role="tablist"
              aria-label="Layer groups"
              className="mb-2 flex flex-wrap gap-1 border-b border-white/5 pb-2"
            >
              {LAYER_TABS.map((tab) => {
                const bucket = tabBuckets.get(tab.id) ?? [];
                if (bucket.length === 0) return null;
                const tabOnCount = bucket.filter((m) => enabled[m.id]).length;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                      isActive
                        ? "border-violet-400/50 bg-violet-400/15 text-violet-100"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span aria-hidden>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-sm px-1 text-[9px] ${
                        tabOnCount > 0
                          ? "bg-emerald-400/25 text-emerald-100"
                          : "bg-white/10 text-white/45"
                      }`}
                    >
                      {tabOnCount}/{bucket.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <ul className="space-y-1.5">
            {activeMetas.map((meta) => {
              const on = enabled[meta.id] === true;
              const isLoading = loading.has(meta.id);
              return (
                <li
                  key={meta.id}
                  className={`rounded-md border p-2 transition ${
                    on
                      ? "border-emerald-400/40 bg-emerald-400/5"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <span className="relative mt-[3px] inline-flex h-3.5 w-3.5 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(meta.id)}
                        className="h-3.5 w-3.5 accent-emerald-400"
                      />
                      {isLoading && (
                        <span
                          aria-hidden
                          title="Loading layer module…"
                          className="pointer-events-none absolute -right-4 inline-block h-3 w-3 animate-spin rounded-full border border-violet-300/70 border-t-transparent"
                        />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span
                          aria-hidden
                          className="text-[12px] leading-none text-white/70"
                        >
                          {meta.icon}
                        </span>
                        <span className="font-mono text-[12px] text-white/90">
                          {meta.label}
                        </span>
                        {meta.synthetic && (
                          <span
                            title="Physically-motivated synthetic data — real upstream not yet wired."
                            className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-[0.15em] text-amber-200"
                          >
                            <span aria-hidden>⚠</span>
                            synthetic
                          </span>
                        )}
                        {isLoading && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-violet-200/80">
                            loading…
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] leading-snug text-white/55">
                        {meta.description}
                      </div>
                      {meta.warning && (
                        <div className="mt-1 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
                          ⚠ {meta.warning}
                        </div>
                      )}
                      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                        {meta.attribution}
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 border-t border-white/5 pt-2 text-right font-mono text-[9px] uppercase tracking-[0.25em] text-white/35">
            Esc to close
          </div>
        </div>
      )}
    </div>
  );
}

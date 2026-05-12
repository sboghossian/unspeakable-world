import { useEffect, useMemo, useRef, useState } from "react";

import { log } from "../../lib/logger";
import type { LayerMeta } from "../extra-layers/registry";

const STORAGE_KEY = "uw:extra-layers:v1";

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

type Enabled = Record<string, boolean>;

function readEnabled(): Enabled {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Enabled;
  } catch {
    // ignore
  }
  return {};
}

function writeEnabled(v: Enabled): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

/**
 * ✨ Extra Layers — single popover that exposes every federated overlay
 * mounted by the extra-layers registry (Gaia DR3, Chandra, multi-messenger,
 * planck polarization, sky cultures extended, ZTF alerts, …).
 *
 * Designed to be cheap to add to the main sky viewer: drop the component
 * into the top bar, pass the scene ref, and toggles persist in localStorage
 * automatically.
 */
export function ExtraLayersPanel({ scene }: Props) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState<Enabled>(() => readEnabled());
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Read the live list of layers mounted by the scene. The registry is
  // static so we could call `listExtras("sky")` directly, but reading
  // from the scene also tells us if any layer failed to mount (it'd be
  // missing from the list).
  const metas = useMemo(() => scene?.listExtraLayers() ?? [], [scene]);

  // Push the persisted toggle state to the scene whenever scene or
  // state changes. Cheap idempotent operation — each scene.setExtraLayer
  // just flips a `.visible` flag in the layer group.
  useEffect(() => {
    if (!scene) return;
    for (const meta of metas) {
      const on = enabled[meta.id] === true;
      try {
        scene.setExtraLayer(meta.id, on);
      } catch (err) {
        log.warn(`[extra-layers] sync ${meta.id}`, err);
      }
    }
  }, [scene, metas, enabled]);

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
    setEnabled((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeEnabled(next);
      return next;
    });
  }

  const anyOn = metas.some((m) => enabled[m.id]);
  const onCount = metas.filter((m) => enabled[m.id]).length;

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

          <ul className="space-y-1.5">
            {metas.map((meta) => {
              const on = enabled[meta.id] === true;
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
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(meta.id)}
                      className="mt-[3px] h-3.5 w-3.5 accent-emerald-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          aria-hidden
                          className="text-[12px] leading-none text-white/70"
                        >
                          {meta.icon}
                        </span>
                        <span className="font-mono text-[12px] text-white/90">
                          {meta.label}
                        </span>
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

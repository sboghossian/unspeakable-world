/**
 * URL-hash deep-linking helper for the ExtraLayersPanel.
 *
 * Lives outside the panel so the panel itself only needs a one-line
 * import — keeps merge surface area small while A1 refactors the panel
 * for code-splitting + synthetic badging.
 *
 * Schema: shared via `share/url-state.ts` — the `layers` key is a
 * comma-joined list of layer ids, capped at MAX_HASH_LAYERS.
 */

import {
  MAX_HASH_LAYERS,
  parseHash,
  updateHashParams,
} from "../share/url-state";

/** Debounce window for hash writes — same cadence as Viewer's camera
 *  writeback so toggling rapidly produces at most one history entry. */
export const LAYER_HASH_DEBOUNCE_MS = 200;

/**
 * Read the enabled-layer ids currently encoded in `location.hash`.
 * Returns `null` if the hash has no `layers` key — the caller should
 * then fall back to localStorage (or default-off).
 */
export function readLayerHash(): string[] | null {
  const parsed = parseHash();
  return parsed.layers ?? null;
}

/**
 * Debounced writer for the `layers` hash key. Returns a function that
 * cancels the pending write — call it from your effect cleanup so an
 * unmount doesn't fire a stale write.
 */
export function makeLayerHashWriter(): {
  schedule(ids: string[]): void;
  cancel(): void;
} {
  let timer: number | null = null;
  function cancel(): void {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }
  function schedule(ids: string[]): void {
    cancel();
    timer = window.setTimeout(() => {
      timer = null;
      // Cap + dedupe here too so a buggy caller can't break the URL.
      const seen = new Set<string>();
      const capped: string[] = [];
      for (const id of ids) {
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        capped.push(id);
        if (capped.length >= MAX_HASH_LAYERS) break;
      }
      updateHashParams({
        layers: capped.length > 0 ? capped.join(",") : null,
      });
    }, LAYER_HASH_DEBOUNCE_MS);
  }
  return { schedule, cancel };
}

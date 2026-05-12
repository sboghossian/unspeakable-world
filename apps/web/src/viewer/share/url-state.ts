/**
 * URL deep-linking for the viewer.
 *
 * Encodes the visible state into the URL hash so that any view can be
 * shared with one link. Format:
 *
 *   /#viewer?ra=10.68&dec=41.27&fov=22&t=2026-05-04T08:00Z&w=2mass&mix=0.5&c=1&layers=gaia,chandra
 *
 * All keys are optional; missing values mean "don't override".
 */

/**
 * Maximum number of extra-layer ids encoded into the `layers` hash key.
 * Anything beyond is silently dropped to keep shareable URLs short.
 */
export const MAX_HASH_LAYERS = 10;

export type ShareableState = {
  ra: number; // RA degrees of camera forward, ICRS
  dec: number; // Dec degrees
  fov: number; // degrees
  /** Simulation time as ISO-Z; null means "use real-time now". */
  time: Date | null;
  /** Overlay survey id (null = no overlay). */
  overlayId: string | null;
  /** Cross-fade [0..1]. Only meaningful when overlayId != null. */
  overlayMix: number;
  /** Constellation lines toggle. */
  constellations: boolean;
  /** Coordinate-grid toggle. */
  coordGrid: boolean;
  /** Bright-star name labels toggle. */
  starLabels: boolean;
  /** Extra-federated-layer ids currently enabled (e.g. ["gaia","chandra"]). */
  layers?: string[];
};

/**
 * Serialize state into a URLSearchParams object suitable for `#viewer?…`.
 */
export function serializeState(state: ShareableState): URLSearchParams {
  const p = new URLSearchParams();
  p.set("ra", state.ra.toFixed(3));
  p.set("dec", state.dec.toFixed(3));
  p.set("fov", state.fov.toFixed(1));
  if (state.time) p.set("t", state.time.toISOString().replace(/\.\d+Z$/, "Z"));
  if (state.overlayId) {
    p.set("w", state.overlayId);
    p.set("mix", state.overlayMix.toFixed(2));
  }
  if (state.constellations) p.set("c", "1");
  if (state.coordGrid) p.set("g", "1");
  if (state.starLabels) p.set("n", "1");
  if (state.layers && state.layers.length > 0) {
    // Slice to cap and filter out empty/dup ids so we never produce a
    // pathological URL even if the caller forgets to dedupe.
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of state.layers) {
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX_HASH_LAYERS) break;
    }
    if (ids.length > 0) p.set("layers", ids.join(","));
  }
  return p;
}

/**
 * Parse the current `location.hash` (everything after `#viewer?`) into a
 * partial state object.
 */
export function parseHash(): Partial<ShareableState> {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  if (!hash.startsWith("#viewer")) return {};
  const q = hash.indexOf("?");
  if (q < 0) return {};
  const params = new URLSearchParams(hash.slice(q + 1));

  const out: Partial<ShareableState> = {};
  const ra = numberOrNull(params.get("ra"));
  const dec = numberOrNull(params.get("dec"));
  const fov = numberOrNull(params.get("fov"));
  if (ra !== null) out.ra = ra;
  if (dec !== null) out.dec = dec;
  if (fov !== null) out.fov = fov;

  const t = params.get("t");
  if (t) {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) out.time = d;
  }
  const w = params.get("w");
  if (w) out.overlayId = w;
  const mix = numberOrNull(params.get("mix"));
  if (mix !== null) out.overlayMix = Math.max(0, Math.min(1, mix));
  const c = params.get("c");
  if (c === "1") out.constellations = true;
  const g = params.get("g");
  if (g === "1") out.coordGrid = true;
  const n = params.get("n");
  if (n === "1") out.starLabels = true;
  const layersRaw = params.get("layers");
  if (layersRaw) {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const raw of layersRaw.split(",")) {
      const id = raw.trim();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      if (ids.length >= MAX_HASH_LAYERS) break;
    }
    if (ids.length > 0) out.layers = ids;
  }

  return out;
}

/**
 * Merge a small partial update into the current hash and replaceState it.
 * Used by feature panels (e.g. ExtraLayersPanel) that only own a slice of
 * the hash and must not clobber camera/time/overlay keys written by the
 * main viewer's writeback loop.
 */
export function updateHashParams(
  updates: Record<string, string | null>,
): void {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash.startsWith("#viewer")) return;
  const q = hash.indexOf("?");
  const params =
    q >= 0 ? new URLSearchParams(hash.slice(q + 1)) : new URLSearchParams();
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === "") params.delete(k);
    else params.set(k, v);
  }
  replaceHash(params);
}

/**
 * Push the new hash without scrolling or pushing browser history. Used
 * during continuous interaction (drag/zoom/scrub) — debounced by the
 * caller so we don't hammer the URL on every frame.
 */
export function replaceHash(params: URLSearchParams): void {
  const hash = `#viewer?${params.toString()}`;
  if (typeof window === "undefined") return;
  if (window.location.hash === hash) return;
  history.replaceState(null, "", hash);
}

function numberOrNull(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

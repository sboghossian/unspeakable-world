/**
 * Vitest global setup.
 *
 * - jsdom doesn't provide WebGL, AudioContext, or matchMedia. We stub
 *   the bare minimum so dynamic-imported layer modules can at least be
 *   resolved without immediately blowing up at import time. The unit
 *   suite only mounts via a stub parent; we never construct real
 *   renderers.
 * - We DO NOT mock three.js itself — its top-level module is import-safe
 *   in jsdom; only WebGLRenderer / AudioContext touch missing globals,
 *   and those are constructed lazily inside `mountLayer` (which the
 *   suite avoids).
 */

// matchMedia — used by a couple of UI bits but harmless to stub at the
// module level so any top-level evaluation succeeds.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Some layer modules call `requestAnimationFrame` at construction time.
// jsdom has it, but make it deterministic anyway.
if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number): void => {
    clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
  }) as typeof globalThis.cancelAnimationFrame;
}

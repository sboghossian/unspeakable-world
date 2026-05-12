import { WebGLRenderer } from "three";
// Type-only import — erased at compile time, so the WebGL-only user
// never pays the cost of the WebGPU codepath. The value-level import
// lives inside `tryCreateWebGPURenderer` and is purely dynamic.
import type { WebGPURenderer } from "three/webgpu";
import { log } from "../../lib/logger";

/**
 * Renderer-backend factory for ViewerScene.
 *
 * Owns capability detection, lazy `three/webgpu` import (so the WebGPU
 * codepath stays in its own dynamic chunk and never bloats the main
 * bundle for the WebGL user) and the WebGL2 fallback when WebGPU init
 * fails for any reason — missing `navigator.gpu`, adapter refusal,
 * Safari < 17 stub, fingerprint-blocking extensions, all roll up into
 * the same path: log + return WebGL2.
 *
 * The two renderers expose a *largely* identical scene-graph API:
 *   - `.render(scene, camera)` (sync for WebGL, possibly-Promise for WebGPU)
 *   - `.setSize(w, h, updateStyle?)`
 *   - `.setPixelRatio(n)`
 *   - `.setClearColor(color, alpha?)`
 *   - `.dispose()`
 *   - `.domElement` (HTMLCanvasElement)
 *
 * The intersection is enough for ViewerScene's tick / resize / snapshot
 * paths. See `SceneRenderer` below.
 */

/** What ViewerScene calls. Both WebGL2 and WebGPU honour this surface. */
export type SceneRenderer = WebGLRenderer | WebGPURenderer;

export type RendererMode = "webgl" | "webgpu" | "auto";

export type RendererInit = {
  renderer: SceneRenderer;
  /** Actually chosen backend (after capability detection + fallback). */
  kind: "webgl" | "webgpu";
};

/** Cheap probe — does the browser expose a WebGPU entry point at all? */
function hasWebGPUAPI(): boolean {
  if (typeof navigator === "undefined") return false;
  // `navigator.gpu` is undefined in WebGL-only browsers and in Safari < 17.
  return typeof (navigator as Navigator & { gpu?: unknown }).gpu !== "undefined";
}

/**
 * Build a WebGL2 renderer with the same options ViewerScene used before
 * this refactor — preserves `preserveDrawingBuffer` so the snapshot
 * button keeps working.
 */
export function createWebGLRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    alpha: false,
    stencil: false,
    // Required so we can call canvas.toDataURL() / toBlob() for the
    // snapshot button — without it the framebuffer is cleared after
    // each rAF and the read returns transparent black.
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x03050a, 1);
  return renderer;
}

/**
 * Try to build a WebGPU renderer against the supplied canvas. Returns
 * `null` on any failure path (no `navigator.gpu`, dynamic import fails,
 * `await renderer.init()` throws). Never throws.
 *
 * Exported so ViewerScene can probe WebGPU directly without forcing a
 * second WebGL2 build on the same canvas if WebGPU is unavailable —
 * see `maybeSwapToWebGPU` in scene.ts.
 */
export async function tryCreateWebGPURenderer(
  canvas: HTMLCanvasElement,
): Promise<WebGPURenderer | null> {
  if (!hasWebGPUAPI()) {
    log.info("[renderer-factory] navigator.gpu unavailable; staying on WebGL2");
    return null;
  }
  try {
    // Dynamic import so Vite emits the WebGPU codepath as its own chunk
    // and the WebGL-only user never downloads it.
    const mod = (await import("three/webgpu")) as {
      WebGPURenderer: new (params?: {
        canvas?: HTMLCanvasElement;
        antialias?: boolean;
        alpha?: boolean;
        powerPreference?: GPUPowerPreference;
      }) => WebGPURenderer;
    };
    const renderer = new mod.WebGPURenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // The unified Renderer's setClearColor expects a Color; the number
    // overload only exists on WebGLRenderer. Cast the literal — runtime
    // accepts a ColorRepresentation either way.
    (renderer as unknown as { setClearColor: (c: number, a: number) => void })
      .setClearColor(0x03050a, 1);
    await renderer.init();
    return renderer;
  } catch (err) {
    log.warn("[renderer-factory] WebGPU init failed; falling back to WebGL2", err);
    return null;
  }
}

/**
 * Create a renderer for the supplied canvas, honouring the user's
 * preference. Always returns *some* renderer — WebGPU failures
 * silently roll back to WebGL2.
 *
 * Modes:
 *   - `"webgl"`  — return WebGL2 immediately.
 *   - `"webgpu"` — try WebGPU; on failure fall back to WebGL2.
 *   - `"auto"`   — try WebGPU when `navigator.gpu` exists; else WebGL2.
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  mode: RendererMode,
): Promise<RendererInit> {
  if (mode === "webgl") {
    return { renderer: createWebGLRenderer(canvas), kind: "webgl" };
  }
  // Both "webgpu" and "auto" attempt WebGPU; the difference is purely
  // intent. Probing is the same and the fallback path is the same.
  const webgpu = await tryCreateWebGPURenderer(canvas);
  if (webgpu) return { renderer: webgpu, kind: "webgpu" };
  return { renderer: createWebGLRenderer(canvas), kind: "webgl" };
}

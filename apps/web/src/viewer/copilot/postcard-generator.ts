/**
 * Postcard generator.
 *
 * Composites a shareable image: the user's current scene snapshot in a
 * 4:5 portrait card with a darkened bottom bar holding a title + AI
 * caption + small "made with The Unspeakable World" footer + the
 * #unspeakable-world hashtag.
 *
 * All compositing is client-side via canvas2D — there is no server. The
 * input is a snapshot data-URL (or a raw HTMLCanvasElement); the output
 * is a PNG Blob suitable for download / clipboard / navigator.share.
 *
 * Layout (1080 × 1350, "Instagram portrait"):
 *
 *   ┌────────────────────────────────┐  y=0
 *   │                                │
 *   │       SCENE SNAPSHOT           │
 *   │     (object-cover crop)        │
 *   │                                │
 *   ├────────────────────────────────┤  y=1080  (square scene)
 *   │  Optional object title         │
 *   │  AI-generated caption (wrap)   │
 *   │                                │
 *   │  ★ The Unspeakable World       │
 *   │                #unspeakable-world│
 *   └────────────────────────────────┘  y=1350
 *
 * The title row is omitted when sceneInfo doesn't carry a focused object.
 * Caption wrapping is simple word-greedy at ~28 chars/line; we cap at 3
 * lines so the layout doesn't blow out.
 */

const POSTCARD_W = 1080;
const POSTCARD_H = 1350;
const SCENE_H = 1080; // square scene area
const BAR_H = POSTCARD_H - SCENE_H;

export type PostcardSceneInfo = {
  /** Focused object name, e.g. "M31" or "Andromeda Galaxy". Optional. */
  focusedName?: string | null;
  /** Active overlay or wavelength, e.g. "2MASS infrared". Optional. */
  overlayLabel?: string | null;
};

export type PostcardInput =
  /** Pre-captured PNG data URL from `scene.snapshotPng()`. */
  | { dataUrl: string; caption?: string; sceneInfo?: PostcardSceneInfo }
  /** Direct canvas reference (rare; mostly for tests). */
  | { canvas: HTMLCanvasElement; caption?: string; sceneInfo?: PostcardSceneInfo };

/**
 * Render the postcard and resolve to a PNG Blob.
 *
 * On Safari, `toBlob()` is implemented but slower than `toDataURL()` then
 * fetch-back; we use the standard `toBlob()` for memory efficiency and
 * fall back to data-URL if the browser is from another planet.
 */
export async function generatePostcard(
  input: PostcardInput,
): Promise<Blob> {
  const sceneImage = await loadSceneImage(input);

  const canvas = document.createElement("canvas");
  canvas.width = POSTCARD_W;
  canvas.height = POSTCARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("postcard: 2D context unavailable");
  }

  // 1. Fill black background (also acts as letterbox if image aspect ≠ 1:1).
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, POSTCARD_W, POSTCARD_H);

  // 2. Draw the scene snapshot, "object-cover" cropping into the square.
  drawCover(ctx, sceneImage, 0, 0, POSTCARD_W, SCENE_H);

  // 3. Subtle gradient seam between scene and footer so the snapshot
  //    doesn't look pasted onto the bar.
  const seamGrad = ctx.createLinearGradient(0, SCENE_H - 80, 0, SCENE_H);
  seamGrad.addColorStop(0, "rgba(10,10,20,0)");
  seamGrad.addColorStop(1, "rgba(10,10,20,0.85)");
  ctx.fillStyle = seamGrad;
  ctx.fillRect(0, SCENE_H - 80, POSTCARD_W, 80);

  // 4. Footer bar background.
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, SCENE_H, POSTCARD_W, BAR_H);

  // 5. A thin plasma accent line where the bar starts.
  ctx.fillStyle = "rgba(167, 139, 250, 0.45)";
  ctx.fillRect(0, SCENE_H, POSTCARD_W, 2);

  // 6. Object title (optional).
  const padX = 64;
  let textY = SCENE_H + 60;
  const info = "sceneInfo" in input ? input.sceneInfo : undefined;
  if (info?.focusedName) {
    ctx.fillStyle = "#ffffff";
    ctx.font =
      "700 56px 'IBM Plex Sans', system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(truncate(info.focusedName, 22), padX, textY);
    textY += 70;
  }

  // 7. AI caption.
  const caption =
    "caption" in input && input.caption?.trim()
      ? input.caption.trim()
      : info?.focusedName
        ? `Looking at ${info.focusedName} in the unspeakable world.`
        : "A glimpse of the unspeakable world.";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font =
    "italic 400 30px 'IBM Plex Sans', system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, `"${caption}"`, POSTCARD_W - padX * 2, 3);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    ctx.fillText(line, padX, textY + i * 38);
  }
  textY += lines.length * 38 + 12;

  // 8. Overlay label (optional, small).
  if (info?.overlayLabel) {
    ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
    ctx.font =
      "500 18px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`· ${info.overlayLabel} ·`, padX, textY);
  }

  // 9. Brand footer: pinned to the bottom-left, hashtag bottom-right.
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font =
    "500 22px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(
    "✦ made with The Unspeakable World",
    padX,
    POSTCARD_H - 32,
  );
  ctx.fillStyle = "rgba(167, 139, 250, 0.85)";
  ctx.textAlign = "right";
  ctx.fillText("#unspeakable-world", POSTCARD_W - padX, POSTCARD_H - 32);
  ctx.textAlign = "left";

  // 10. Encode.
  return await canvasToBlob(canvas);
}

/**
 * Promise-friendly canvas-to-blob. Falls back to data-URL → fetch if a
 * browser somehow lacks `toBlob` (we still support Safari 14+).
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png",
        0.95,
      );
      return;
    }
    try {
      const url = canvas.toDataURL("image/png");
      void fetch(url)
        .then((r) => r.blob())
        .then(resolve, reject);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

async function loadSceneImage(
  input: PostcardInput,
): Promise<CanvasImageSource> {
  if ("canvas" in input) return input.canvas;
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("postcard: failed to decode snapshot dataURL"));
    img.src = input.dataUrl;
  });
}

/**
 * Crop-to-fit a source image into a destination rect, preserving aspect
 * by cropping the longer axis (CSS `object-fit: cover` semantics).
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const iw = "width" in img ? (img as { width: number }).width : 0;
  const ih = "height" in img ? (img as { height: number }).height : 0;
  if (!iw || !ih) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }
  const srcAspect = iw / ih;
  const dstAspect = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (srcAspect > dstAspect) {
    // Source is wider — crop the sides.
    sw = ih * dstAspect;
    sx = (iw - sw) / 2;
  } else if (srcAspect < dstAspect) {
    // Source is taller — crop the top/bottom.
    sh = iw / dstAspect;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Greedy word-wrap into at most `maxLines` lines. Last line is truncated
 * with an ellipsis if there are remaining words.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) {
        const last = lines[maxLines - 1];
        if (last !== undefined) lines[maxLines - 1] = truncateEllipsis(last);
        return lines.slice(0, maxLines);
      }
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.slice(0, maxLines);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function truncateEllipsis(s: string): string {
  return s.replace(/[.,;:!?\s]*$/, "") + "…";
}

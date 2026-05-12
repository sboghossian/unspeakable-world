/**
 * Tiny corner badge that surfaces which renderer backend the live
 * ViewerScene is currently using — "WebGL2" or "WebGPU".
 *
 * Lets a user (or QA) verify the renderer-preference setting is taking
 * effect without poking at devtools. Renders nothing in embed mode so
 * the iframe stays minimal. Positioned bottom-left so it does not
 * collide with the bottom-right EmbedBadge.
 */
export function RendererBadge({ kind }: { kind: "webgl" | "webgpu" }) {
  const label = kind === "webgpu" ? "WebGPU" : "WebGL2";
  const tone =
    kind === "webgpu"
      ? "border-emerald-300/30 text-emerald-200/80"
      : "border-white/15 text-white/60";
  return (
    <div
      title={`Active renderer: ${label}`}
      className={`pointer-events-none absolute bottom-3 left-3 z-30 rounded-full border bg-space-950/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur ${tone}`}
    >
      {label}
    </div>
  );
}

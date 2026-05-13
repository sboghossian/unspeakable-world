import { useEffect, useState } from "react";
import {
  getActivePreset,
  subscribeQuality,
  type QualityPreset,
} from "../../lib/quality";

/**
 * Tiny corner badge that surfaces which renderer backend the live
 * ViewerScene is currently using — "WebGL2" or "WebGPU" — plus the
 * active quality level so a reader can verify both knobs at a glance.
 *
 * Lets a user (or QA) verify the renderer-preference + quality-preset
 * settings are taking effect without poking at devtools. Renders
 * nothing in embed mode so the iframe stays minimal. Positioned
 * bottom-left so it does not collide with the bottom-right EmbedBadge.
 */
export function RendererBadge({ kind }: { kind: "webgl" | "webgpu" }) {
  const [preset, setPreset] = useState<QualityPreset>(() => getActivePreset());
  useEffect(() => subscribeQuality(setPreset), []);

  const label = kind === "webgpu" ? "WebGPU" : "WebGL2";
  const tone =
    kind === "webgpu"
      ? "border-emerald-300/30 text-emerald-200/80"
      : "border-white/15 text-white/60";
  return (
    <div
      title={`Active renderer: ${label} · Quality preset: ${preset.label}`}
      className={`pointer-events-none absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full border bg-space-950/70 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur ${tone}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-white/25">
        ·
      </span>
      <span className="text-white/55">{preset.label}</span>
    </div>
  );
}

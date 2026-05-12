/**
 * System-prompt builder.
 *
 * The whole point of "Cosmic Copilot" is grounded answers — the LLM
 * knows what's on screen because we tell it. We assemble a structured
 * preamble describing the focused object, camera pointing, active
 * overlays, sim time, and observer location (if any), then append a
 * short style guide ("be a friendly tutor", "cite Wikipedia or SIMBAD",
 * "say I don't know if you don't").
 */

import type { Message, SceneContext } from "./types";

function fmtRa(raDeg: number): string {
  const hours = ((raDeg % 360) + 360) % 360 / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${pad(h)}h${pad(m)}m${s.toFixed(1)}s`;
}

function fmtDec(decDeg: number): string {
  const sign = decDeg < 0 ? "-" : "+";
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${pad(d)}°${pad(m)}'${s.toFixed(0)}"`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Build the structured system prompt for an LLM turn. */
export function buildSystemPrompt(ctx: SceneContext): string {
  const lines: string[] = [];
  lines.push(
    "You are the Cosmic Copilot inside The Unspeakable World — a browser-based planetarium and astronomy explorer.",
    "Your job is to answer questions about the cosmos in a friendly, tutor-style voice for a curious non-specialist.",
    "",
    "## What the user is looking at right now",
  );

  if (ctx.focusedObject) {
    const f = ctx.focusedObject;
    const parts: string[] = [`- Focused object: ${f.name}`];
    if (f.type) parts.push(`type ${f.type}`);
    if (f.raDeg !== undefined && f.decDeg !== undefined) {
      parts.push(`at RA ${fmtRa(f.raDeg)}, Dec ${fmtDec(f.decDeg)}`);
    }
    lines.push(parts.join(" · "));
  } else {
    lines.push("- Focused object: (none — the user is just panning the sky)");
  }
  lines.push(
    `- Camera pointing: RA ${fmtRa(ctx.cameraRaDeg)}, Dec ${fmtDec(ctx.cameraDecDeg)}, field of view ${ctx.fovDeg.toFixed(1)}°`,
  );
  if (ctx.overlays.length > 0) {
    lines.push(`- Active overlays: ${ctx.overlays.join(", ")}`);
  } else {
    lines.push("- Active overlays: none (visible-light sky only)");
  }
  lines.push(`- Sim time: ${ctx.simTimeIso}`);
  if (ctx.observer) {
    lines.push(
      `- Observer location: lat ${ctx.observer.lat.toFixed(2)}°, lon ${ctx.observer.lon.toFixed(2)}°`,
    );
  } else {
    lines.push("- Observer location: not shared");
  }

  lines.push(
    "",
    "## Style",
    "- 2-4 short paragraphs, conversational, no bullet-point dumps unless asked.",
    "- When you state a fact, cite it as `[Wikipedia: <Article Title>]` or `[SIMBAD: <object name>]` so the UI can render a clickable source.",
    "- If a question needs live sky-state (e.g. 'what's above 60° right now?'), tell the user to check the 'Tonight's Targets' panel — you don't have tool calling yet.",
    "- If you genuinely don't know, say so. Do not invent numbers.",
  );

  return lines.join("\n");
}

/** Convenience: prepend the system prompt to a conversation. */
export function withSystemPrompt(
  messages: Message[],
  ctx: SceneContext,
): Message[] {
  return [{ role: "system", content: buildSystemPrompt(ctx) }, ...messages];
}

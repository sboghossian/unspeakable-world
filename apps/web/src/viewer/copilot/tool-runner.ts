/**
 * Tool runner — executes a model-emitted tool call against a host
 * interface (whatever the embedding page wired up from its scene).
 *
 * Every host method is *best effort*: if the current scene mode doesn't
 * support a capability (e.g. `setOverlay` in Universe mode), the host
 * returns `false` / throws and we surface a friendly "I can't do that
 * here" message back to the LLM so it can apologise in its prose. The
 * Copilot conversation never crashes on a missing capability.
 */

import { log } from "../../lib/logger";
import type { ToolCall, ToolName } from "./tools";

/**
 * Host interface the embedding page implements. Every method returns a
 * boolean (or a Promise of one) — `true` means the action ran, `false`
 * means the host declined or couldn't carry it out. The runner converts
 * `false` / throws into a polite, model-readable response.
 */
export type CopilotHost = {
  /** Fly the camera to a named target. Resolved name → direction. */
  flyTo(target: string): boolean | Promise<boolean>;
  /** Toggle one of the extra-layer ids. */
  setLayer(layerId: string, enabled: boolean): boolean | Promise<boolean>;
  /** Set sim clock from an ISO-8601 string. */
  setTime(iso: string): boolean | Promise<boolean>;
  /** Switch HiPS overlay; `null` restores the default DSS2 view. */
  setOverlay(surveyId: string | null): boolean | Promise<boolean>;
  /** Capture current canvas as a PNG data URL; `null` if unsupported. */
  takeSnapshot(): string | null | Promise<string | null>;
  /** Switch viewer scene mode. */
  setMode(mode: "sky" | "solar" | "galactic" | "universe"): boolean | Promise<boolean>;
};

/** Result of a tool invocation, ready to be shown in the chat thread. */
export type ToolResult = {
  /** Echoes the model-supplied id so multi-turn pairing works. */
  id?: string;
  name: ToolName;
  /** Short human-readable summary, e.g. "Flying to M31…" */
  label: string;
  /** True if the host accepted the call; false if it declined. */
  ok: boolean;
  /** Message we'll feed back to the model as the tool response. */
  message: string;
};

/**
 * Run a single tool call against a host. The returned `ToolResult.message`
 * is the string the caller should send back to the model as the
 * tool's reply (role "tool", role "function", or whatever the backend
 * expects — that's the backend's concern, not ours).
 */
export async function runToolCall(
  call: ToolCall,
  host: CopilotHost | null,
): Promise<ToolResult> {
  const base: Pick<ToolResult, "id" | "name"> = {
    ...(call.id ? { id: call.id } : {}),
    name: call.name,
  };

  if (!host) {
    return {
      ...base,
      label: humanLabel(call),
      ok: false,
      message:
        "The viewer host isn't connected, so I can't control the scene right now. I'll answer in words instead.",
    };
  }

  try {
    switch (call.name) {
      case "fly_to": {
        const target = asString(call.args.target);
        if (!target) return refusal(base, "Missing required `target`.");
        const ok = await host.flyTo(target);
        return ok
          ? {
              ...base,
              label: `Flying to ${target}`,
              ok: true,
              message: `OK — camera is flying to ${target}.`,
            }
          : refusal(base, `I couldn't locate "${target}" in the current scene.`);
      }

      case "enable_layer": {
        const id = asString(call.args.layer_id);
        if (!id) return refusal(base, "Missing required `layer_id`.");
        const ok = await host.setLayer(id, true);
        return ok
          ? {
              ...base,
              label: `Enabling layer: ${id}`,
              ok: true,
              message: `Layer "${id}" is now visible.`,
            }
          : refusal(base, `Layer "${id}" isn't available in the current mode.`);
      }

      case "disable_layer": {
        const id = asString(call.args.layer_id);
        if (!id) return refusal(base, "Missing required `layer_id`.");
        const ok = await host.setLayer(id, false);
        return ok
          ? {
              ...base,
              label: `Hiding layer: ${id}`,
              ok: true,
              message: `Layer "${id}" is now hidden.`,
            }
          : refusal(base, `I can't disable layer "${id}" here.`);
      }

      case "set_time": {
        const iso = asString(call.args.iso);
        if (!iso) return refusal(base, "Missing required `iso` timestamp.");
        const d = new Date(iso);
        if (Number.isNaN(d.getTime()))
          return refusal(base, `"${iso}" isn't a valid ISO-8601 timestamp.`);
        const ok = await host.setTime(iso);
        return ok
          ? {
              ...base,
              label: `Setting time to ${iso}`,
              ok: true,
              message: `Sim clock set to ${d.toISOString()}.`,
            }
          : refusal(base, "I can't change time in the current scene.");
      }

      case "set_overlay": {
        const raw = asString(call.args.survey_id);
        const id = raw && raw !== "none" ? raw : null;
        const ok = await host.setOverlay(id);
        return ok
          ? {
              ...base,
              label: id
                ? `Switching overlay to ${id}`
                : "Clearing wavelength overlay",
              ok: true,
              message: id
                ? `HiPS overlay set to "${id}".`
                : "Default visible-light view restored.",
            }
          : refusal(base, "Overlays aren't available in the current scene.");
      }

      case "take_snapshot": {
        const url = await host.takeSnapshot();
        if (!url) return refusal(base, "Snapshots aren't supported here.");
        return {
          ...base,
          label: "Captured snapshot",
          ok: true,
          message: "Saved a PNG of the current view.",
        };
      }

      case "set_mode": {
        const mode = asString(call.args.mode);
        if (
          mode !== "sky" &&
          mode !== "solar" &&
          mode !== "galactic" &&
          mode !== "universe"
        ) {
          return refusal(base, `Unknown mode "${mode ?? "(missing)"}".`);
        }
        const ok = await host.setMode(mode);
        return ok
          ? {
              ...base,
              label: `Switching to ${mode} mode`,
              ok: true,
              message: `Scene mode is now "${mode}".`,
            }
          : refusal(base, `I can't switch to ${mode} mode from here.`);
      }
    }
  } catch (err) {
    log.warn("[copilot] tool runner failed", call.name, err);
    return refusal(
      base,
      "Something went wrong running that command — I'll answer with words instead.",
    );
  }
}

function refusal(
  base: Pick<ToolResult, "id" | "name">,
  reason: string,
): ToolResult {
  return {
    ...base,
    label: "I can't do that here",
    ok: false,
    message: `I can't do that here: ${reason}`,
  };
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

/** Used for the initial "tool spinning" label before the host responds. */
export function humanLabel(call: ToolCall): string {
  switch (call.name) {
    case "fly_to":
      return `Flying to ${asString(call.args.target) ?? "target"}…`;
    case "enable_layer":
      return `Enabling ${asString(call.args.layer_id) ?? "layer"}…`;
    case "disable_layer":
      return `Hiding ${asString(call.args.layer_id) ?? "layer"}…`;
    case "set_time":
      return `Setting time to ${asString(call.args.iso) ?? "…"}`;
    case "set_overlay": {
      const id = asString(call.args.survey_id);
      return id && id !== "none"
        ? `Switching overlay to ${id}…`
        : "Clearing overlay…";
    }
    case "take_snapshot":
      return "Capturing snapshot…";
    case "set_mode":
      return `Switching to ${asString(call.args.mode) ?? "mode"}…`;
  }
}

/**
 * Shared types for the Cosmic Copilot (Layer 2).
 *
 * The copilot is a small tutor-style chat that grounds the LLM in the
 * current viewer state — focused object, camera direction, enabled
 * overlays, sim time. Backends are pluggable: Ollama first, hand-rolled
 * Offline fallback second, OpenAI-compatible stretch third.
 */

import type { ToolCall, ToolDef } from "./tools";
import type { CopilotHost, ToolResult } from "./tool-runner";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

/** Lightweight citation; rendered as inline link by the panel. */
export type Citation = {
  /** Visible label, e.g. "Wikipedia: Andromeda Galaxy" or "SIMBAD: M31". */
  label: string;
  /** Where to navigate when the user clicks it. */
  url: string;
};

export type ChatOptions = {
  signal?: AbortSignal;
  /** Streaming callback — receives incremental text chunks as they arrive. */
  onToken?: (token: string) => void;
  /**
   * Tool-calling. If `host` is provided the backend will pass `tools`
   * (defaulting to the full TOOLS list) to the model, run any emitted
   * calls against the host, and continue the chat with the results.
   * Backends that don't support tool-calling ignore these and reply
   * with prose only.
   */
  host?: CopilotHost | null;
  tools?: ReadonlyArray<ToolDef>;
  /** Called whenever a tool call has been run, so the UI can show a card. */
  onToolResult?: (result: ToolResult) => void;
};

export type ChatResult = {
  text: string;
  citations: Citation[];
  /** Tool calls the model emitted during this turn, with their outcomes. */
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
};

export type CopilotBackend = {
  /** Stable id, e.g. "ollama", "offline", "openai-compatible". */
  id: string;
  /** Human-friendly label for the settings cog dropdown. */
  label: string;
  /** Quick probe — should return reasonably fast (a few hundred ms max). */
  available(): Promise<boolean>;
  /** Run a turn. May stream via opts.onToken; always returns final text + citations. */
  chat(messages: Message[], opts: ChatOptions): Promise<ChatResult>;
};

/**
 * Snapshot of what the viewer is showing right now. Passed into the
 * context builder which turns it into a system prompt.
 */
export type SceneContext = {
  /** Best-guess of what the camera is centered on, if anything. */
  focusedObject: {
    name: string;
    type?: string;
    raDeg?: number;
    decDeg?: number;
  } | null;
  /** Camera forward as (RA, Dec) in degrees. */
  cameraRaDeg: number;
  cameraDecDeg: number;
  fovDeg: number;
  /** Active overlays — short list of human-readable layer names. */
  overlays: string[];
  /** Sim time as ISO 8601. */
  simTimeIso: string;
  /** Observer lat/lon if the user opted in to geolocation. */
  observer: { lat: number; lon: number } | null;
};

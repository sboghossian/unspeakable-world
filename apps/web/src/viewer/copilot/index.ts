/**
 * Public copilot controller.
 *
 *   const copilot = new Copilot();
 *   await copilot.init();              // probes Ollama, picks best backend
 *   for await (const tok of copilot.ask(question, ctx)) { ... }
 *
 * The controller owns the conversation thread (system prompt + history)
 * and the active backend. The UI panel reads `backendId` to render the
 * "Ollama dot green" / "Offline mode" indicator.
 *
 * Switching backends mid-thread is safe — the next ask() rebuilds the
 * system prompt from the latest SceneContext anyway.
 */

import { log } from "../../lib/logger";
import { OfflineBackend } from "./backends/offline";
import { OllamaBackend, type OllamaConfig } from "./backends/ollama";
import {
  OpenAICompatibleBackend,
  type OpenAICompatibleConfig,
} from "./backends/openai-compatible";
import { withSystemPrompt } from "./context-builder";
import type {
  ChatResult,
  CopilotBackend,
  Message,
  SceneContext,
} from "./types";

export type BackendId = "ollama" | "offline" | "openai-compatible";

export type CopilotConfig = {
  preferred?: BackendId;
  ollama?: OllamaConfig;
  openai?: OpenAICompatibleConfig;
};

/**
 * Probes the available backends and returns the best one for the user's
 * setup. Defaults to Ollama if it answers `/api/tags` in time, otherwise
 * the Offline table.
 */
export async function pickBestBackend(
  cfg: CopilotConfig = {},
): Promise<CopilotBackend> {
  // Honour explicit preference first.
  if (cfg.preferred === "offline") return new OfflineBackend();
  if (cfg.preferred === "openai-compatible" && cfg.openai) {
    const b = new OpenAICompatibleBackend(cfg.openai);
    if (await b.available()) return b;
  }
  // Default chain: Ollama → Offline.
  const ollama = new OllamaBackend(cfg.ollama);
  if (await ollama.available()) return ollama;
  return new OfflineBackend();
}

export class Copilot {
  private backend: CopilotBackend;
  private history: Message[] = [];

  constructor(backend?: CopilotBackend) {
    this.backend = backend ?? new OfflineBackend();
  }

  /** Probe and pick. Call once after constructing if you don't pass a backend. */
  async init(cfg: CopilotConfig = {}): Promise<void> {
    this.backend = await pickBestBackend(cfg);
  }

  setBackend(backend: CopilotBackend): void {
    this.backend = backend;
  }

  get backendId(): string {
    return this.backend.id;
  }

  get backendLabel(): string {
    return this.backend.label;
  }

  /** Returns the in-memory thread (system prompt is regenerated per turn). */
  getHistory(): Message[] {
    return [...this.history];
  }

  setHistory(messages: Message[]): void {
    // Strip any system message — we rebuild it each turn from live ctx.
    this.history = messages.filter((m) => m.role !== "system");
  }

  reset(): void {
    this.history = [];
  }

  /**
   * Ask a question. Yields tokens as they stream in; the final yielded
   * string is the complete answer. Citations are attached to the
   * resolved promise via `lastResult`.
   */
  async *ask(
    question: string,
    ctx: SceneContext,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    this.history.push({ role: "user", content: question });
    const messages = withSystemPrompt(this.history, ctx);

    const queue: string[] = [];
    let resolveNext: (() => void) | null = null;
    const state: {
      finished: boolean;
      result: ChatResult | null;
      error: unknown;
    } = { finished: false, result: null, error: null };

    const pump = async () => {
      try {
        state.result = await this.backend.chat(messages, {
          ...(signal ? { signal } : {}),
          onToken: (tok) => {
            queue.push(tok);
            resolveNext?.();
            resolveNext = null;
          },
        });
      } catch (err) {
        state.error = err;
        log.warn("[copilot] backend chat failed", err);
      } finally {
        state.finished = true;
        resolveNext?.();
        resolveNext = null;
      }
    };
    void pump();

    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (state.finished) break;
      await new Promise<void>((r) => {
        resolveNext = r;
      });
    }

    if (state.error) throw state.error;
    if (state.result) {
      this.history.push({ role: "assistant", content: state.result.text });
      this.lastResult = state.result;
    }
  }

  /** Set by `ask()` after the stream completes. Holds the final citations. */
  lastResult: ChatResult | null = null;
}

export { OfflineBackend, OllamaBackend, OpenAICompatibleBackend };
export type {
  Citation,
  CopilotBackend,
  Message,
  SceneContext,
  Role,
  ChatOptions,
  ChatResult,
} from "./types";

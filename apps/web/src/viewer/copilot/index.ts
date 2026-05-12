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
import { track } from "../../lib/telemetry";
import {
  CloudflareBackend,
  type CloudflareConfig,
} from "./backends/cloudflare";
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

export type BackendId =
  | "ollama"
  | "cloudflare"
  | "offline"
  | "openai-compatible";

export type CopilotConfig = {
  preferred?: BackendId;
  ollama?: OllamaConfig;
  cloudflare?: CloudflareConfig;
  openai?: OpenAICompatibleConfig;
};

/**
 * Probes the available backends and returns the best one for the user's
 * setup. Default order:
 *   1. Ollama          — best for local power users (fastest, offline)
 *   2. Cloudflare      — best for anyone online (free Workers AI, no key)
 *   3. Offline (32-Q&A table) — always works, last-resort fallback
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
  if (cfg.preferred === "ollama") {
    const b = new OllamaBackend(cfg.ollama);
    if (await b.available()) return b;
  }
  if (cfg.preferred === "cloudflare") {
    const b = new CloudflareBackend(cfg.cloudflare);
    if (await b.available()) return b;
  }
  // Default chain: Ollama → Cloudflare → Offline.
  const ollama = new OllamaBackend(cfg.ollama);
  if (await ollama.available()) return ollama;
  const cloudflare = new CloudflareBackend(cfg.cloudflare);
  if (await cloudflare.available()) return cloudflare;
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
    // Telemetry: capture *only* the length + backend + latency, never
    // the question text. The text routinely contains user location,
    // names, etc. — strict privacy floor.
    const t0 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const backendId = this.backend.id;
    const questionLength = question.length;

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

    const t1 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    track("copilot_ask", {
      backend: backendId,
      question_length: questionLength,
      latency_ms: Math.round(t1 - t0),
      ok: state.error === null,
    });

    if (state.error) throw state.error;
    if (state.result) {
      this.history.push({ role: "assistant", content: state.result.text });
      this.lastResult = state.result;
    }
  }

  /** Set by `ask()` after the stream completes. Holds the final citations. */
  lastResult: ChatResult | null = null;
}

export {
  CloudflareBackend,
  OfflineBackend,
  OllamaBackend,
  OpenAICompatibleBackend,
};
export type {
  Citation,
  CopilotBackend,
  Message,
  SceneContext,
  Role,
  ChatOptions,
  ChatResult,
} from "./types";

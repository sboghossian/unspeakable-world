/**
 * Ollama backend — talks to a locally-running Ollama daemon over its
 * `/api/chat` endpoint. The daemon ships with `Access-Control-Allow-Origin: *`
 * disabled by default; users running `claude-local` already set
 * `OLLAMA_ORIGINS="*"` so the browser can reach it. If the probe fails
 * we transparently fall back to the Offline backend (see `pickBestBackend`).
 *
 * Streaming format: NDJSON (newline-delimited JSON), one message-delta
 * per line. We accumulate `message.content` until `done: true`.
 *
 * Model default: `qwen3:8b` — the user runs `qwen3-coder:30b` on their
 * M4 Pro Mac Mini via `claude-local`, but the smaller chat-tuned model
 * is friendlier for tutor-style answers and is more likely to already
 * be installed on a default Ollama setup. Override in the settings cog.
 */

import { log } from "../../../lib/logger";
import type {
  ChatOptions,
  ChatResult,
  CopilotBackend,
  Message,
} from "../types";
import { extractCitations } from "../citations";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen3:8b";

export type OllamaConfig = {
  baseUrl?: string;
  model?: string;
};

export class OllamaBackend implements CopilotBackend {
  readonly id = "ollama";
  readonly label = "Local Ollama";
  private baseUrl: string;
  private model: string;

  constructor(cfg: OllamaConfig = {}) {
    this.baseUrl = (cfg.baseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/$/, "");
    this.model = cfg.model ?? DEFAULT_OLLAMA_MODEL;
  }

  /** Probe `/api/tags`. Returns true iff the daemon answers within ~800 ms. */
  async available(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 800);
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async chat(messages: Message[], opts: ChatOptions): Promise<ChatResult> {
    const body = JSON.stringify({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      options: {
        // Tutor-style answers want some warmth but shouldn't hallucinate.
        temperature: 0.4,
      },
    });

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
    if (!res.ok) {
      throw new Error(`Ollama returned ${res.status}`);
    }
    if (!res.body) {
      throw new Error("Ollama response had no body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let acc = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // NDJSON: split on newlines, keep trailing partial line in buf.
        let nl = buf.indexOf("\n");
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          nl = buf.indexOf("\n");
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as {
              message?: { content?: string };
              done?: boolean;
              error?: string;
            };
            if (evt.error) throw new Error(evt.error);
            const tok = evt.message?.content;
            if (tok) {
              acc += tok;
              opts.onToken?.(tok);
            }
          } catch (err) {
            // One bad line shouldn't kill the stream — log and skip.
            log.warn("[copilot] ollama: bad JSON line", err);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      text: acc,
      citations: extractCitations(acc),
    };
  }
}

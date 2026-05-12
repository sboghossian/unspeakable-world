/**
 * OpenAI-compatible backend (stretch).
 *
 * Talks to any service that mimics the OpenAI Chat Completions API at
 * `{baseUrl}/v1/chat/completions` with the standard SSE streaming
 * envelope (`data: { choices: [{ delta: { content } }] }`, terminated by
 * `data: [DONE]`). This covers OpenAI, Groq, Together.ai, OpenRouter,
 * vLLM, LM Studio in "OpenAI-compatible" mode, etc.
 *
 * Off by default — there's no settings UI in this slice. The plumbing is
 * here so the next agent can drop in a URL+key input cog.
 */

import { log } from "../../../lib/logger";
import type {
  ChatOptions,
  ChatResult,
  CopilotBackend,
  Message,
} from "../types";
import { extractCitations } from "../citations";

export type OpenAICompatibleConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export class OpenAICompatibleBackend implements CopilotBackend {
  readonly id = "openai-compatible";
  readonly label = "OpenAI-compatible API";
  private cfg: OpenAICompatibleConfig;

  constructor(cfg: OpenAICompatibleConfig) {
    this.cfg = { ...cfg, baseUrl: cfg.baseUrl.replace(/\/$/, "") };
  }

  async available(): Promise<boolean> {
    // We could probe /v1/models, but the user's key may not have list access.
    // Treat "config is fully populated" as "available" and let the first chat
    // call surface auth errors.
    return Boolean(
      this.cfg.baseUrl && this.cfg.apiKey && this.cfg.model,
    );
  }

  async chat(messages: Message[], opts: ChatOptions): Promise<ChatResult> {
    const body = JSON.stringify({
      model: this.cfg.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.4,
    });

    const res = await fetch(`${this.cfg.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
    if (!res.ok) {
      throw new Error(`Upstream returned ${res.status}`);
    }
    if (!res.body) {
      throw new Error("Upstream response had no body");
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
        // SSE: events are separated by "\n\n", lines start with "data: ".
        let sep = buf.indexOf("\n\n");
        while (sep >= 0) {
          const evt = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          sep = buf.indexOf("\n\n");
          for (const line of evt.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const tok = parsed.choices?.[0]?.delta?.content;
              if (tok) {
                acc += tok;
                opts.onToken?.(tok);
              }
            } catch (err) {
              log.warn("[copilot] openai-compat: bad SSE chunk", err);
            }
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

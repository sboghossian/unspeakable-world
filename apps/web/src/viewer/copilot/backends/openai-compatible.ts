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

import type {
  ChatOptions,
  ChatResult,
  CopilotBackend,
  Message,
} from "../types";
import { extractCitations } from "../citations";
import { parseSSEStream } from "../sse";

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
    // Tool-calling is supported by some OpenAI-compat upstreams (Groq,
    // OpenRouter) but not all — we don't know which without per-endpoint
    // capability probing. Conservative default: refuse the action and let
    // the user pick the Cloudflare backend, which we *do* know works.
    const refusalNote = opts.host
      ? "I can't control the viewer with this backend. " +
        "Try the Cloudflare backend in settings.\n\n"
      : "";
    if (refusalNote) opts.onToken?.(refusalNote);
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

    const acc = await parseSSEStream(res.body, {
      tag: "openai-compat",
      ...(opts.onToken ? { onToken: opts.onToken } : {}),
      extractToken: (payload) => {
        const p = payload as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        return p.choices?.[0]?.delta?.content;
      },
    });

    const finalText = refusalNote + acc;
    return {
      text: finalText,
      citations: extractCitations(finalText),
    };
  }
}

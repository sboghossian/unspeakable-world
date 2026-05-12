/**
 * Cloudflare Workers AI backend.
 *
 * Talks to the same-origin Pages Function at `/api/copilot` which holds
 * the `AI` binding server-side — no client-side API key, ever. The
 * function calls `env.AI.run("@cf/meta/llama-3.1-8b-instruct", …)` with
 * `stream: true` and pipes the SSE response straight back to us.
 *
 * This is the default backend for ~95% of visitors: anyone with an
 * internet connection but no local Ollama. Free tier, no signup.
 *
 * Availability is determined by a tiny `/api/copilot/health` probe so
 * we can tell the difference between "binding present" (200) and
 * "Pages function deployed but no AI binding configured" (503). On
 * `pnpm dev` (no Wrangler) the probe will fail and we fall through to
 * the Offline backend, which is the correct dev experience.
 */

import type {
  ChatOptions,
  ChatResult,
  CopilotBackend,
  Message,
} from "../types";
import { extractCitations } from "../citations";
import { parseSSEStream } from "../sse";

/** Llama 3.1 8B Instruct — solid free-tier default on Workers AI. */
export const DEFAULT_CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export type CloudflareConfig = {
  /** Override only for testing — defaults to same-origin `/api/copilot`. */
  endpoint?: string;
  /** Override only for testing — defaults to `/api/copilot/health`. */
  healthEndpoint?: string;
  /** Override the model id sent to the Workers AI binding. */
  model?: string;
};

export class CloudflareBackend implements CopilotBackend {
  readonly id = "cloudflare";
  readonly label = "Cloudflare Workers AI (Llama 3.1 8B)";
  private endpoint: string;
  private healthEndpoint: string;
  private model: string;

  constructor(cfg: CloudflareConfig = {}) {
    this.endpoint = cfg.endpoint ?? "/api/copilot";
    this.healthEndpoint = cfg.healthEndpoint ?? "/api/copilot/health";
    this.model = cfg.model ?? DEFAULT_CLOUDFLARE_MODEL;
  }

  /**
   * HEAD `/api/copilot/health` — the function returns 200 iff the AI
   * binding is present and 503 otherwise. Soft 800 ms timeout so a slow
   * link doesn't stall startup.
   */
  async available(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 800);
    try {
      const res = await fetch(this.healthEndpoint, {
        method: "HEAD",
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
    });

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
    if (!res.ok) {
      throw new Error(`Cloudflare Workers AI returned ${res.status}`);
    }
    if (!res.body) {
      throw new Error("Cloudflare Workers AI response had no body");
    }

    const acc = await parseSSEStream(res.body, {
      tag: "cloudflare",
      ...(opts.onToken ? { onToken: opts.onToken } : {}),
      // Workers AI streams `{ response: "<token>" }` per event. We also
      // accept the OpenAI-style `choices[0].delta.content` shape in case
      // the upstream format changes (it has, historically).
      extractToken: (payload) => {
        const p = payload as {
          response?: string;
          choices?: Array<{ delta?: { content?: string } }>;
        };
        return p.response ?? p.choices?.[0]?.delta?.content;
      },
    });

    return {
      text: acc,
      citations: extractCitations(acc),
    };
  }
}

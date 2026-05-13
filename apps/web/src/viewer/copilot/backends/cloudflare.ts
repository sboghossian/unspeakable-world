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
 *
 * Tool-calling contract (model API):
 *   Request:
 *     {
 *       messages: [...],
 *       tools: [{ type:"function", function:{ name, description, parameters }}],
 *       stream: false  // first pass is non-streaming when tools are sent
 *     }
 *   Response (when the model decides to call a tool):
 *     {
 *       tool_calls: [{ id, type:"function", function:{ name, arguments }}],
 *       response: ""   // usually empty when tool_calls are present
 *     }
 *   We run each call against the host, then re-issue the chat with the
 *   tool results appended as messages of role "tool" — OpenAI shape —
 *   and *this* time we stream the model's prose reply.
 *
 * NOTE on model coverage: Llama 3.1 8B Instruct emits tool JSON *most*
 * of the time but can fall through into plain prose, especially when
 * the question is purely informational. We treat "no tool_calls" as
 * "just answer in words" and stream the response field. If reliable
 * tool emission becomes critical, swap the binding to
 * `@hf/nousresearch/hermes-2-pro-mistral-7b` (native tool-calling) by
 * changing `DEFAULT_CLOUDFLARE_MODEL`.
 */

import type {
  ChatOptions,
  ChatResult,
  CopilotBackend,
  Message,
} from "../types";
import { extractCitations } from "../citations";
import { parseSSEStream } from "../sse";
import { TOOLS, parseToolCall, type ToolCall } from "../tools";
import { runToolCall, type ToolResult } from "../tool-runner";

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

/** What `/api/copilot` returns when we ask for non-streaming + tools. */
type NonStreamingResponse = {
  response?: string;
  tool_calls?: unknown[];
  // OpenAI-style fallback shape (Workers AI sometimes mirrors this).
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: unknown[];
    };
  }>;
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
    const wantsTools = Boolean(opts.host);
    const tools = opts.tools ?? TOOLS;

    if (wantsTools) {
      // Phase 1: non-streaming probe that *may* return tool_calls.
      const firstRes = await this.callOnce(messages, tools, false, opts.signal);
      const parsed = (await firstRes.json()) as NonStreamingResponse;
      const rawCalls =
        parsed.tool_calls ??
        parsed.choices?.[0]?.message?.tool_calls ??
        [];

      const calls: ToolCall[] = [];
      for (const raw of rawCalls) {
        const c = parseToolCall(raw);
        if (c) calls.push(c);
      }

      if (calls.length > 0 && opts.host) {
        const results: ToolResult[] = [];
        const followUp: Message[] = [...messages];
        // Assistant message announcing the tool plan (content can be empty).
        followUp.push({
          role: "assistant",
          content: parsed.response ?? "",
        });
        for (const call of calls) {
          const result = await runToolCall(call, opts.host);
          results.push(result);
          opts.onToolResult?.(result);
          // Feed the result back as a synthetic user message — Workers AI
          // doesn't reliably honour role:"tool" across model versions, so
          // we encode the result as plain text the model can read.
          followUp.push({
            role: "user",
            content: `[tool:${result.name}] ${result.message}`,
          });
        }

        // Phase 2: stream the model's prose reply, having seen the tool
        // outcomes. Tools are *not* re-sent so the model commits to prose.
        const text = await this.streamChat(followUp, opts);
        return {
          text,
          citations: extractCitations(text),
          toolCalls: calls,
          toolResults: results,
        };
      }

      // No tool calls — model answered in prose. If we have content from
      // phase 1, return it directly (don't double-bill the API).
      const direct =
        parsed.response ??
        parsed.choices?.[0]?.message?.content ??
        "";
      if (direct.length > 0) {
        opts.onToken?.(direct);
        return { text: direct, citations: extractCitations(direct) };
      }
      // Fall through to plain streaming if the probe returned empty.
    }

    const text = await this.streamChat(messages, opts);
    return { text, citations: extractCitations(text) };
  }

  /**
   * One-shot POST to `/api/copilot`. `stream` controls whether we ask
   * the model for a streamed SSE response or a single JSON blob (the
   * tool-call probe uses the JSON shape).
   */
  private async callOnce(
    messages: Message[],
    tools: ReadonlyArray<unknown> | null,
    stream: boolean,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
    }
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      throw new Error(`Cloudflare Workers AI returned ${res.status}`);
    }
    return res;
  }

  /** Streaming chat with token callback. No tools sent. */
  private async streamChat(
    messages: Message[],
    opts: ChatOptions,
  ): Promise<string> {
    const res = await this.callOnce(messages, null, true, opts.signal);
    if (!res.body) {
      throw new Error("Cloudflare Workers AI response had no body");
    }
    return parseSSEStream(res.body, {
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
  }
}

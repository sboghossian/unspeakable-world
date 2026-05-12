/**
 * Shared SSE (Server-Sent Events) stream parser for chat backends.
 *
 * Both the OpenAI-compatible backend and the Cloudflare Workers AI
 * backend speak SSE: events separated by a blank line, lines prefixed
 * with `data: `, terminated by an optional `data: [DONE]` sentinel.
 *
 * Different upstreams nest the token in different shapes:
 *  - OpenAI: `{ choices: [{ delta: { content: string } }] }`
 *  - Cloudflare Workers AI: `{ response: string }` (plus the same OpenAI
 *    shape when called through the OpenAI-compat path).
 *
 * The caller passes an `extractToken` that knows the upstream's shape;
 * this helper handles the byte-level framing only.
 */

import { log } from "../../lib/logger";

export type SSEStreamOptions = {
  /** Called once per non-empty token. */
  onToken?: (token: string) => void;
  /** Pulls the visible delta out of a parsed event payload. */
  extractToken: (payload: unknown) => string | undefined;
  /** Tag used in warn logs when a chunk fails to parse. */
  tag: string;
};

/**
 * Drain an SSE response body, streaming tokens via `onToken`, and
 * return the accumulated string when the upstream closes the stream.
 *
 * Caller is responsible for verifying `res.ok` and `res.body !== null`
 * before invoking this.
 */
export async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  opts: SSEStreamOptions,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // SSE events are separated by a blank line ("\n\n").
      let sep = buf.indexOf("\n\n");
      while (sep >= 0) {
        const evt = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        sep = buf.indexOf("\n\n");
        for (const line of evt.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payloadStr = trimmed.slice(5).trim();
          if (!payloadStr || payloadStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payloadStr) as unknown;
            const tok = opts.extractToken(parsed);
            if (tok) {
              acc += tok;
              opts.onToken?.(tok);
            }
          } catch (err) {
            log.warn(`[copilot] ${opts.tag}: bad SSE chunk`, err);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return acc;
}

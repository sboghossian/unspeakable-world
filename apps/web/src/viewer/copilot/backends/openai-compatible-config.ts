/**
 * Expert-mode configuration for the OpenAI-compatible backend.
 *
 * Stores `{ provider, baseUrl, model, apiKey }` in localStorage under
 * `uw:copilot:expert-config:v1`. Plaintext — this is browser-local and
 * never leaves the device on its way to our servers. (We don't have
 * servers for this; calls go direct to the user's chosen provider.)
 *
 * Important: the UI must remind the user that their key is stored
 * unencrypted in localStorage. Anyone with physical access to their
 * machine can read it.
 */

export type ExpertProvider = "anthropic" | "openai" | "openrouter" | "custom";

export type ExpertConfig = {
  provider: ExpertProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const STORAGE_KEY = "uw:copilot:expert-config:v1";

/**
 * Provider defaults — the base URL each provider exposes for its
 * OpenAI-compatible chat-completions endpoint. Anthropic does NOT expose
 * `/v1/chat/completions` natively; users hitting Anthropic should pick
 * `openrouter` (which proxies Claude) or `custom` and point at a
 * gateway. We still surface "anthropic" here with the OpenAI-compat
 * path so the OpenRouter-shaped gateway URL is the obvious default.
 *
 * Source-of-truth for these URLs:
 *  - OpenAI: https://api.openai.com/v1
 *  - Anthropic (via OAI-compat third-party gateways): use OpenRouter
 *    instead, or a self-hosted proxy. We pre-populate the Anthropic
 *    direct URL as a hint, knowing the user may need to swap it.
 *  - OpenRouter: https://openrouter.ai/api/v1
 */
export const PROVIDER_PRESETS: Record<
  ExpertProvider,
  { baseUrl: string; defaultModel: string; label: string; note?: string }
> = {
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-opus-4-7",
    label: "Anthropic",
    note:
      "Anthropic's native API isn't OpenAI-compatible. Use OpenRouter (above) for Claude, or a self-hosted gateway here.",
  },
  openai: {
    baseUrl: "https://api.openai.com",
    defaultModel: "gpt-4o",
    label: "OpenAI",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api",
    defaultModel: "anthropic/claude-opus-4-7",
    label: "OpenRouter (any model)",
  },
  custom: {
    baseUrl: "",
    defaultModel: "",
    label: "Custom (LM Studio, vLLM, Groq, Together…)",
  },
};

export const DEFAULT_EXPERT_CONFIG: ExpertConfig = {
  provider: "openrouter",
  baseUrl: PROVIDER_PRESETS.openrouter.baseUrl,
  model: PROVIDER_PRESETS.openrouter.defaultModel,
  apiKey: "",
};

export function loadExpertConfig(): ExpertConfig {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    if (!raw) return DEFAULT_EXPERT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ExpertConfig>;
    const provider =
      parsed.provider && parsed.provider in PROVIDER_PRESETS
        ? parsed.provider
        : DEFAULT_EXPERT_CONFIG.provider;
    return {
      provider,
      baseUrl: parsed.baseUrl ?? PROVIDER_PRESETS[provider].baseUrl,
      model: parsed.model ?? PROVIDER_PRESETS[provider].defaultModel,
      apiKey: parsed.apiKey ?? "",
    };
  } catch {
    return DEFAULT_EXPERT_CONFIG;
  }
}

export function saveExpertConfig(cfg: ExpertConfig): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // privacy mode / quota — ignore
  }
}

export function isExpertConfigComplete(cfg: ExpertConfig): boolean {
  return (
    cfg.apiKey.trim().length > 0 &&
    cfg.baseUrl.trim().length > 0 &&
    cfg.model.trim().length > 0
  );
}

/**
 * Quick connectivity probe — POSTs a 1-token completion to verify the
 * key + URL + model work. Returns `{ ok, message }` so the UI can show
 * a green or red pill next to the Save button.
 */
export async function testExpertConfig(
  cfg: ExpertConfig,
  signal?: AbortSignal,
): Promise<{ ok: boolean; message: string }> {
  if (!isExpertConfigComplete(cfg)) {
    return { ok: false, message: "Fill in URL, model, and API key first." };
  }
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
      ...(signal ? { signal } : {}),
    });
    if (res.ok) return { ok: true, message: "Reachable. Key + model OK." };
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      message: `HTTP ${res.status} ${body.slice(0, 140)}`,
    };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Network error: ${m}` };
  }
}

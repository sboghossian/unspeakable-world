import { useCallback, useState } from "react";
import {
  PROVIDER_PRESETS,
  testExpertConfig,
  type ExpertConfig,
  type ExpertProvider,
} from "../copilot/backends/openai-compatible-config";

/**
 * 🔑 Expert-mode configuration card.
 *
 * Lives inside the Copilot's settings cog. Users with their own API key
 * can swap the backend from the free Cloudflare Workers AI model
 * (Llama-3.1-8B) to a research-grade frontier model — Claude Opus 4.7,
 * GPT-4o, or anything on OpenRouter.
 *
 * Storage: localStorage plaintext. The component prints a discreet
 * warning so users know not to enter a shared-machine key here.
 *
 * Network: API calls leave the browser direct to the user's chosen
 * provider — never via our servers. We have no servers in this slice;
 * the OpenAI-compatible backend talks to `${baseUrl}/v1/chat/completions`
 * from the user's tab.
 */

type Props = {
  config: ExpertConfig;
  onChange: (next: ExpertConfig) => void;
};

export function ExpertModeCard({ config, onChange }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [revealKey, setRevealKey] = useState(false);

  const handleProvider = useCallback(
    (provider: ExpertProvider) => {
      const preset = PROVIDER_PRESETS[provider];
      onChange({
        ...config,
        provider,
        baseUrl: preset.baseUrl,
        model: preset.defaultModel,
      });
      setTestResult(null);
    },
    [config, onChange],
  );

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testExpertConfig(config);
    setTestResult(result);
    setTesting(false);
  }, [config]);

  const preset = PROVIDER_PRESETS[config.provider];

  return (
    <div className="mt-3 rounded-lg border border-fuchsia-400/20 bg-fuchsia-400/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-fuchsia-200/80">
          🔑 Expert mode (BYO key)
        </div>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-white/55">
        Paste your own API key to use a frontier model. Calls go direct
        from this tab to your provider — never via our servers. Key is
        stored unencrypted in <code className="font-mono">localStorage</code>;
        don't use this on a shared machine.
      </p>

      <label className="mb-2 block">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          provider
        </div>
        <select
          value={config.provider}
          onChange={(e) => handleProvider(e.target.value as ExpertProvider)}
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-fuchsia-400/50 focus:outline-none"
        >
          {(Object.keys(PROVIDER_PRESETS) as ExpertProvider[]).map((p) => (
            <option key={p} value={p}>
              {PROVIDER_PRESETS[p].label}
            </option>
          ))}
        </select>
        {preset.note && (
          <div className="mt-1 font-mono text-[10px] text-amber-300/70">
            {preset.note}
          </div>
        )}
      </label>

      <label className="mb-2 block">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          base URL
        </div>
        <input
          type="text"
          value={config.baseUrl}
          placeholder="https://…"
          onChange={(e) => onChange({ ...config, baseUrl: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-fuchsia-400/50 focus:outline-none"
        />
      </label>

      <label className="mb-2 block">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          model
        </div>
        <input
          type="text"
          value={config.model}
          placeholder="claude-opus-4-7 · gpt-4o · …"
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-fuchsia-400/50 focus:outline-none"
        />
      </label>

      <label className="mb-3 block">
        <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/40">
          <span>api key</span>
          <button
            type="button"
            onClick={() => setRevealKey((v) => !v)}
            className="font-mono text-[10px] text-white/40 hover:text-white"
          >
            {revealKey ? "hide" : "show"}
          </button>
        </div>
        <input
          type={revealKey ? "text" : "password"}
          value={config.apiKey}
          placeholder="sk-…"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-fuchsia-400/50 focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="rounded-md border border-fuchsia-400/40 bg-fuchsia-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-fuchsia-200 transition hover:bg-fuchsia-400/20 disabled:cursor-wait disabled:opacity-50"
        >
          {testing ? "testing…" : "test"}
        </button>
        {testResult && (
          <div
            className={`flex-1 truncate font-mono text-[10px] ${
              testResult.ok ? "text-emerald-300/85" : "text-amber-300/85"
            }`}
            title={testResult.message}
          >
            {testResult.ok ? "✓ " : "× "}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

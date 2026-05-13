import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { log } from "../../lib/logger";
import { cn, RADIUS } from "../../lib/design-tokens";
import { useT } from "../../i18n/hooks";
import {
  CloudflareBackend,
  Copilot,
  pickBestBackend,
  OfflineBackend,
  OllamaBackend,
} from "../copilot";
import {
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_URL,
} from "../copilot/backends/ollama";
import type { Citation, SceneContext } from "../copilot/types";
import type { CopilotHost, ToolResult } from "../copilot";
import { EmptyState } from "./EmptyState";
import { getCopy, inferKind } from "../../lib/error-copy";

/**
 * 🧠 Cosmic Copilot panel — slide-in chat that answers astronomy
 * questions grounded in the current viewer state.
 *
 * Backend resolution: tries the local Ollama daemon on mount; falls
 * back to the hand-written Offline table if probe fails. The user can
 * pin a specific backend via the settings cog. Conversation persists
 * across reloads in `localStorage` under `uw:copilot:thread:v1`.
 *
 * Streaming UX: tokens append into the in-progress assistant bubble as
 * they arrive. Citations are extracted from the final answer and
 * rendered as a "Sources" footer below the bubble.
 */

const STORAGE_KEY = "uw:copilot:thread:v1";
const SETTINGS_KEY = "uw:copilot:settings:v1";

type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  /** Tool calls the model issued during this assistant turn, with status. */
  tools?: ToolResult[];
};

type CopilotSettings = {
  backend: "auto" | "ollama" | "cloudflare" | "offline";
  ollamaUrl: string;
  ollamaModel: string;
};

const DEFAULT_SETTINGS: CopilotSettings = {
  backend: "auto",
  ollamaUrl: DEFAULT_OLLAMA_URL,
  ollamaModel: DEFAULT_OLLAMA_MODEL,
};

function loadThread(): StoredMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is StoredMessage =>
        typeof m === "object" &&
        m !== null &&
        "role" in m &&
        "content" in m &&
        (m as StoredMessage).role !== undefined,
    );
  } catch {
    return [];
  }
}

function saveThread(thread: StoredMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thread));
  } catch {
    // quota / privacy-mode — ignore
  }
}

function loadSettings(): CopilotSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CopilotSettings>;
    return {
      backend: parsed.backend ?? DEFAULT_SETTINGS.backend,
      ollamaUrl: parsed.ollamaUrl ?? DEFAULT_SETTINGS.ollamaUrl,
      ollamaModel: parsed.ollamaModel ?? DEFAULT_SETTINGS.ollamaModel,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: CopilotSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export type CopilotPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Live snapshot of the viewer; rebuilt each render by Viewer.tsx. */
  context: SceneContext;
  /** Optional seed question — used by SkyInfoPanel's "Ask Copilot" button. */
  seedQuestion?: string | null;
  /** Called when the panel consumes the seed so the parent can clear it. */
  onSeedConsumed?: () => void;
  /**
   * Bridge to the viewer's scene. When provided, the Copilot can call
   * tools ("fly to", "enable layer", "snapshot", etc.). Null means
   * read-only chat — tool-calling is fully disabled.
   */
  host?: CopilotHost | null;
};

export function CopilotPanel({
  open,
  onClose,
  context,
  seedQuestion,
  onSeedConsumed,
  host,
}: CopilotPanelProps) {
  const t = useT();
  const [thread, setThread] = useState<StoredMessage[]>(() => loadThread());
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  /** Tool calls in-flight for the current streaming turn (cleared on commit). */
  const [streamTools, setStreamTools] = useState<ToolResult[]>([]);
  const [backendId, setBackendId] = useState<string>("offline");
  const [backendLabel, setBackendLabel] = useState<string>("Offline (built-in)");
  const [ollamaUp, setOllamaUp] = useState<boolean>(false);
  const [cloudflareUp, setCloudflareUp] = useState<boolean>(false);
  const [settings, setSettings] = useState<CopilotSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const copilotRef = useRef<Copilot | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Persist thread on change.
  useEffect(() => {
    saveThread(thread);
  }, [thread]);

  // Persist settings on change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Rebuild backend whenever settings change.
  const rebuildBackend = useCallback(async () => {
    const cfg = {
      ollama: {
        baseUrl: settings.ollamaUrl,
        model: settings.ollamaModel,
      },
    };
    // Probe both hosted options in parallel for the indicator dots.
    const [ollamaProbe, cloudflareProbe] = await Promise.all([
      new OllamaBackend(cfg.ollama).available(),
      new CloudflareBackend().available(),
    ]);
    setOllamaUp(ollamaProbe);
    setCloudflareUp(cloudflareProbe);

    let copilot = copilotRef.current;
    if (!copilot) {
      copilot = new Copilot();
      copilotRef.current = copilot;
    }
    // Restore prior thread into the controller so multi-turn works.
    copilot.setHistory(
      thread.map((m) => ({ role: m.role, content: m.content })),
    );

    if (settings.backend === "ollama") {
      copilot.setBackend(new OllamaBackend(cfg.ollama));
    } else if (settings.backend === "cloudflare") {
      copilot.setBackend(new CloudflareBackend());
    } else if (settings.backend === "offline") {
      copilot.setBackend(new OfflineBackend());
    } else {
      const best = await pickBestBackend({ ollama: cfg.ollama });
      copilot.setBackend(best);
    }
    setBackendId(copilot.backendId);
    setBackendLabel(copilot.backendLabel);
  }, [settings, thread]);

  useEffect(() => {
    void rebuildBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.backend, settings.ollamaUrl, settings.ollamaModel]);

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thread, streamBuf]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      const copilot = copilotRef.current;
      if (!copilot) return;

      const userMsg: StoredMessage = { role: "user", content: trimmed };
      setThread((t) => [...t, userMsg]);
      setDraft("");
      setStreaming(true);
      setStreamBuf("");
      setStreamTools([]);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const liveTools: ToolResult[] = [];
      let acc = "";
      try {
        const iter = copilot.ask(trimmed, context, ctrl.signal, {
          host: host ?? null,
          onToolResult: (r) => {
            liveTools.push(r);
            setStreamTools([...liveTools]);
          },
        });
        for await (const tok of iter) {
          acc += tok;
          setStreamBuf(acc);
        }
        const final = copilot.lastResult;
        const assistantMsg: StoredMessage = {
          role: "assistant",
          content: final?.text ?? acc,
          ...(final?.citations && final.citations.length > 0
            ? { citations: final.citations }
            : {}),
          ...(final?.toolResults && final.toolResults.length > 0
            ? { tools: final.toolResults }
            : liveTools.length > 0
              ? { tools: liveTools }
              : {}),
        };
        setThread((t) => [...t, assistantMsg]);
      } catch (err) {
        log.warn("[copilot] ask failed", err);
        const copy = getCopy(inferKind(err), { service: "Copilot backend" });
        setThread((t) => [
          ...t,
          {
            role: "assistant",
            content: `(${copy.title}. ${copy.body} You can switch to the offline backend from the ⚙ cog.)`,
          },
        ]);
      } finally {
        setStreaming(false);
        setStreamBuf("");
        setStreamTools([]);
        abortRef.current = null;
      }
    },
    [context, streaming, host],
  );

  // Consume seed question once when the panel opens with one set.
  useEffect(() => {
    if (!open || !seedQuestion || streaming) return;
    void send(seedQuestion);
    onSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedQuestion]);

  // Escape closes the panel (a11y: keyboard parity with the X button). We skip
  // when the user is typing in the chat textarea so Escape doesn't surprise
  // them mid-thought — they can blur first, then Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const onReset = useCallback(() => {
    setThread([]);
    copilotRef.current?.reset();
  }, []);

  const placeholder = useMemo(() => {
    if (context.focusedObject) {
      return t("copilot.placeholder.focused", { name: context.focusedObject.name });
    }
    return t("copilot.placeholder");
  }, [context.focusedObject, t]);

  if (!open) return null;

  return (
    <aside
      className={cn(
        "pointer-events-auto absolute right-2 top-32 z-30 flex w-[360px] max-w-[calc(100vw-1rem)] flex-col border border-white/10 bg-space-950/90 backdrop-blur sm:right-4 sm:top-20 md:w-[420px]",
        RADIUS.lg,
      )}
      role="dialog"
      aria-modal="false"
      aria-labelledby="copilot-panel-title"
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            id="copilot-panel-title"
            className="font-display text-sm font-semibold text-white"
          >
            {t("copilot.title")}
          </div>
          <BackendDot
            backendId={backendId}
            ollamaUp={ollamaUp}
            label={backendLabel}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            title={t("copilot.settings")}
            aria-label={t("copilot.settings")}
            aria-expanded={settingsOpen}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">⚙</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            title={t("copilot.reset")}
            aria-label={t("copilot.reset")}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">↺</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsPane
          settings={settings}
          ollamaUp={ollamaUp}
          cloudflareUp={cloudflareUp}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <div
        ref={scrollRef}
        className="flex max-h-[55vh] min-h-[180px] flex-col gap-3 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation with Cosmic Copilot"
      >
        {thread.length === 0 && !streaming && (
          <Empty focused={context.focusedObject?.name ?? null} onPick={send} />
        )}
        {thread.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {streaming && (
          <Bubble
            message={{
              role: "assistant",
              content: streamBuf || "…",
              ...(streamTools.length > 0 ? { tools: streamTools } : {}),
            }}
            streaming
          />
        )}
      </div>

      <footer className="border-t border-white/10 p-3">
        {streaming ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-white/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-plasma-400" />
              {t("copilot.streaming")}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/60 transition hover:bg-white/10"
            >
              {t("copilot.stop")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              rows={2}
              placeholder={placeholder}
              aria-label={t("copilot.title")}
              className="min-h-[42px] flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder:text-white/55 focus:border-plasma-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-plasma-400/40"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="shrink-0 rounded-lg border border-plasma-500/40 bg-plasma-500/15 px-3 py-2 font-mono text-xs uppercase tracking-wider text-plasma-200 transition hover:bg-plasma-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("copilot.send")}
            </button>
          </form>
        )}
      </footer>
    </aside>
  );
}

function BackendDot({
  backendId,
  ollamaUp,
  label,
}: {
  backendId: string;
  ollamaUp: boolean;
  label: string;
}) {
  const isOllama = backendId === "ollama";
  const isCloudflare = backendId === "cloudflare";
  const isOffline = backendId === "offline";
  const color =
    isOllama && ollamaUp
      ? "bg-emerald-400"
      : isCloudflare
        ? "bg-sky-400"
        : isOllama
          ? "bg-amber-400"
          : "bg-white/40";
  const short = isOllama
    ? "Ollama"
    : isCloudflare
      ? "Cloudflare AI"
      : isOffline
        ? "Offline"
        : label;
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/55">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span>{short}</span>
    </div>
  );
}

function Bubble({
  message,
  streaming,
}: {
  message: StoredMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "border border-plasma-500/30 bg-plasma-500/10 text-plasma-100"
            : "border border-white/10 bg-white/[0.04] text-white/85"
        }`}
      >
        {message.tools && message.tools.length > 0 && (
          <div className="mb-2 flex flex-col gap-1">
            {message.tools.map((t, i) => (
              <ToolCard key={`${t.name}-${i}`} result={t} />
            ))}
          </div>
        )}
        <Prose text={message.content} />
        {streaming && (
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-white/60 align-middle" />
        )}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-white/40">
              sources
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {message.citations.map((c, i) => (
                <li key={`${c.url}-${i}`}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/65 hover:bg-white/10 hover:text-plasma-300"
                  >
                    {c.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline pill rendering a tool call's status. Shown above the assistant
 * prose so the user sees the side-effect that triggered the answer.
 */
function ToolCard({ result }: { result: ToolResult }) {
  const ok = result.ok;
  const tone = ok
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-amber-400/30 bg-amber-400/10 text-amber-200";
  const icon = ok ? "✓" : "⚠";
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[11px] ${tone}`}
      title={result.message}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="truncate">{result.label}</span>
    </div>
  );
}

/**
 * Very minimal markdown-ish renderer. We split on blank lines for
 * paragraphs and turn bare URLs into links inline. Anything more elaborate
 * (lists, bold) would pull in a markdown library, which is overkill for
 * this slice — the LLM produces conversational prose, not docs.
 */
function Prose({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-2" : ""}>
          {linkify(p)}
        </p>
      ))}
    </>
  );
}

function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\bhttps?:\/\/[^\s<>)\]]+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[0].replace(/[.,;:!?)]+$/, "");
    parts.push(
      <a
        key={`u-${i++}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-plasma-300 underline-offset-2 hover:underline"
      >
        {url}
      </a>,
    );
    last = m.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Empty({
  focused,
  onPick,
}: {
  focused: string | null;
  onPick: (q: string) => void;
}) {
  const samples = useMemo(() => {
    const base = [
      "What is M31?",
      "How big is the Sun?",
      "What's the difference between a pulsar and a magnetar?",
      "What is the cosmic microwave background?",
    ];
    if (focused) {
      return [`Tell me about ${focused}`, ...base];
    }
    return base;
  }, [focused]);

  return (
    <div className="flex flex-col gap-2">
      <EmptyState
        icon="🧠"
        title="Ask anything about the sky"
        body={
          focused
            ? `You're focused on ${focused}. Try one of the prompts below, or type your own question.`
            : "Type a question, or pick one of the prompts below. Answers are grounded in what's on screen."
        }
        tone="violet"
        density="compact"
      />
      <ul className="flex flex-col gap-1.5">
        {samples.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPane({
  settings,
  ollamaUp,
  cloudflareUp,
  onChange,
  onClose,
}: {
  settings: CopilotSettings;
  ollamaUp: boolean;
  cloudflareUp: boolean;
  onChange: (next: CopilotSettings) => void;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
          backend settings
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] text-white/40 hover:text-white"
        >
          done
        </button>
      </div>

      <label className="mb-2 block">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          backend
        </div>
        <select
          value={settings.backend}
          onChange={(e) =>
            onChange({
              ...settings,
              backend: e.target.value as CopilotSettings["backend"],
            })
          }
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-plasma-400/50 focus:outline-none"
        >
          <option value="auto">
            auto (Ollama → Cloudflare → offline)
          </option>
          <option value="ollama">
            Ollama {ollamaUp ? "(reachable)" : "(unreachable)"}
          </option>
          <option value="cloudflare">
            Cloudflare Workers AI{" "}
            {cloudflareUp ? "(reachable)" : "(unreachable)"}
          </option>
          <option value="offline">Offline (built-in)</option>
        </select>
      </label>

      <label className="mb-2 block">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          Ollama URL
        </div>
        <input
          type="text"
          value={settings.ollamaUrl}
          onChange={(e) =>
            onChange({ ...settings, ollamaUrl: e.target.value })
          }
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-plasma-400/50 focus:outline-none"
        />
      </label>

      <label className="block">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          Ollama model
        </div>
        <input
          type="text"
          value={settings.ollamaModel}
          onChange={(e) =>
            onChange({ ...settings, ollamaModel: e.target.value })
          }
          className="w-full rounded-md border border-white/10 bg-space-950/80 px-2 py-1 font-mono text-xs text-white/85 focus:border-plasma-400/50 focus:outline-none"
        />
        <div className="mt-1 font-mono text-[10px] text-white/35">
          try qwen3:8b · llama3.2 · qwen3-coder:30b
        </div>
      </label>
    </div>
  );
}

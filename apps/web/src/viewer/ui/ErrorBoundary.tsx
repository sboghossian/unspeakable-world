import { Component, type ErrorInfo, type ReactNode } from "react";
import { addBreadcrumb, captureException } from "../../lib/error-tracking";
import { log } from "../../lib/logger";

/**
 * 🛟 ErrorBoundary — last-resort wrapper that keeps the rest of the
 * viewer alive when one panel / layer / scene throws.
 *
 * Without this, a single crashed React subtree unmounts the entire
 * viewer (you go from "M31 isn't loading" to "the page is white").
 * With it, the failing branch is replaced by a small fallback card
 * offering Refresh + Reset-settings, and the rest of the scene keeps
 * rendering.
 *
 * Errors are reported via the existing `lib/error-tracking` Sentry
 * wrapper (no-op when DSN is empty) and a breadcrumb is dropped so the
 * preceding session is visible in the replay.
 *
 * The `scope` prop tweaks the copy:
 *   - "scene"  : whole 3D canvas crashed — likely a WebGL2 issue
 *   - "panel"  : one popover crashed — the rest of the viewer is fine
 *   - "layer"  : an extra-layer module crashed — just hide it
 */

export type ErrorBoundaryScope = "scene" | "panel" | "layer";

type Props = {
  children: ReactNode;
  /** Tweaks the fallback copy. Defaults to "panel". */
  scope?: ErrorBoundaryScope;
  /** Optional label that appears in the fallback ("Bookmarks panel"). */
  label?: string;
  /** Optional custom fallback. If provided, replaces the default card. */
  fallback?: (err: Error, reset: () => void) => ReactNode;
  /** Called after the boundary catches. Useful to flip parent state. */
  onError?: (err: Error, info: ErrorInfo) => void;
};

type State = {
  err: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  override componentDidCatch(err: Error, info: ErrorInfo) {
    const scope = this.props.scope ?? "panel";
    const label = this.props.label ?? scope;
    log.error(`[error-boundary:${scope}]`, label, err, info.componentStack);
    try {
      addBreadcrumb(`error-boundary:${scope} caught`, {
        label,
        message: err.message,
      });
    } catch {
      /* ignore — breadcrumb is best-effort */
    }
    try {
      captureException(err, {
        tags: { scope, label },
        extra: { componentStack: info.componentStack ?? "" },
      });
    } catch {
      /* ignore — capture is best-effort */
    }
    try {
      this.props.onError?.(err, info);
    } catch {
      /* ignore */
    }
  }

  private reset = () => {
    this.setState({ err: null });
  };

  private hardRefresh = () => {
    if (typeof window === "undefined") return;
    window.location.reload();
  };

  private resetSettings = () => {
    if (typeof window === "undefined") return;
    try {
      // Wipe every Unspeakable-World key. We intentionally don't `.clear()`
      // the whole localStorage so OAuth / consent settings from other
      // origins (none today, but future-proofing) stay intact.
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith("uw:") || k.startsWith("unspeakable:"))) {
          keys.push(k);
        }
      }
      for (const k of keys) window.localStorage.removeItem(k);
    } catch (err) {
      log.warn("[error-boundary] resetSettings failed", err);
    }
    window.location.hash = "";
    window.location.reload();
  };

  override render() {
    const { err } = this.state;
    if (!err) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(err, this.reset);
    }

    const scope = this.props.scope ?? "panel";
    const label = this.props.label;

    // Scene-scope: probably a shader compile / WebGL2 init failure.
    // Surface the WebGL2-unsupported message + WebGPU alternative.
    if (scope === "scene") {
      const looksLikeWebGl =
        /webgl|gl context|shader|compile|GL_INVALID/i.test(err.message);
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-space-950/95 p-6 backdrop-blur">
          <div className="w-[min(520px,92vw)] rounded-2xl border border-amber-400/30 bg-space-950/90 p-5 shadow-2xl">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/85">
              ✦ viewer fell back to a safe state
            </div>
            <h2 className="mb-2 font-display text-xl text-white/95">
              {looksLikeWebGl
                ? "WebGL2 isn't available on this device"
                : "Something went sideways in the 3D scene"}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-white/70">
              {looksLikeWebGl
                ? "Your GPU appears blocked, or the browser shipped without WebGL2. The viewer needs WebGL2 to render the universe."
                : "The 3D canvas crashed unexpectedly. We've reported the error and you can recover from here."}
            </p>
            <details className="mb-4 rounded-md border border-white/10 bg-white/[0.03] p-2 font-mono text-[10px] text-white/55">
              <summary className="cursor-pointer text-white/65">technical detail</summary>
              <div className="mt-1 break-words text-white/45">{err.message}</div>
            </details>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href="?webgpu=1"
                className="rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/25"
              >
                Try the WebGPU build
              </a>
              <button
                type="button"
                onClick={this.resetSettings}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Reset settings
              </button>
              <button
                type="button"
                onClick={this.hardRefresh}
                className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 transition hover:bg-amber-400/25"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Layer-scope: most of the time the rest of the scene is fine.
    // Render a tiny inline chip rather than blocking the whole viewer.
    if (scope === "layer") {
      return (
        <div className="pointer-events-auto m-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-200">
          ✦ {label ?? "layer"} fell back — the rest of the sky is fine.{" "}
          <button
            type="button"
            onClick={this.reset}
            className="ml-1 rounded border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-amber-100 transition hover:bg-amber-400/25"
          >
            retry
          </button>
        </div>
      );
    }

    // Panel-scope (default): mid-size card, dark glass, two actions.
    return (
      <div
        role="alert"
        className="pointer-events-auto m-2 rounded-xl border border-amber-400/30 bg-space-950/90 p-4 backdrop-blur"
      >
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/85">
          ✦ {label ?? "panel"} fell back
        </div>
        <p className="mb-3 text-sm leading-snug text-white/75">
          Something went sideways. The viewer fell back to a safe state — the
          rest of the sky is still here.
        </p>
        <details className="mb-3 rounded-md border border-white/10 bg-white/[0.03] p-2 font-mono text-[10px] text-white/55">
          <summary className="cursor-pointer text-white/65">technical detail</summary>
          <div className="mt-1 break-words text-white/45">{err.message}</div>
        </details>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.resetSettings}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Reset settings
          </button>
          <button
            type="button"
            onClick={this.hardRefresh}
            className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 transition hover:bg-amber-400/25"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
}

import { useEffect, useState } from "react";

/**
 * Tiny support ribbon — "buy me a coffee" + "subscribe to updates"
 * surfaced once at the bottom-right of the viewer. Dismissible. The
 * subscribe action stashes the email in localStorage so the user knows
 * we don't actually ship a mailing list — we just remember they're
 * interested. (No newsletter infrastructure in v1, per CLAUDE.md no-
 * accounts rule.)
 *
 * Why dismissible-once and not always-visible: AstroGrid keeps the
 * "Buy me a coffee" button always-on; we lean lighter — show it once,
 * remember if the user dismissed it, never nag.
 */

const DISMISS_KEY = "uw:support-ribbon:dismissed-v1";
const EMAIL_KEY = "uw:support:email";

// Allow the user to override their donation target via env or fall back
// to a generic "thanks" mailto. Build-time replacement keeps the value
// out of the bundle if the env var is empty.
const COFFEE_URL =
  import.meta.env.VITE_COFFEE_URL ?? "https://github.com/sboghossian/unspeakable-world";

export function SupportRibbon() {
  const [dismissed, setDismissed] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  // Reveal after 12 s of being on a viewer route — enough time for the
  // user to actually look at something before we ask for a coffee.
  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(DISMISS_KEY) === "yes";
      if (wasDismissed) return;
    } catch {
      return;
    }
    const handle = window.setTimeout(() => setDismissed(false), 12_000);
    return () => window.clearTimeout(handle);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "yes");
    } catch {
      /* private mode — fine, we just won't remember */
    }
  };

  if (dismissed && !emailOpen) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 flex flex-col items-end gap-2">
      {!dismissed && !emailOpen && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-space-950/85 px-3 py-2 backdrop-blur shadow-xl">
          <span aria-hidden className="text-base">
            ☕
          </span>
          <span className="font-mono text-[11px] text-white/75">
            Free forever. Tip a coffee or get notified about new releases.
          </span>
          <a
            href={COFFEE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-200 transition hover:bg-amber-400/20"
          >
            tip
          </a>
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
          >
            subscribe
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      {emailOpen && (
        <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur shadow-xl w-[min(320px,90vw)]">
          <div className="flex items-baseline justify-between">
            <div className="font-display text-sm text-white/95">
              Stay in the loop
            </div>
            <button
              type="button"
              onClick={() => {
                setEmailOpen(false);
                dismiss();
              }}
              aria-label="Close"
              className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/55 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
          {saved ? (
            <p className="font-mono text-[11px] leading-snug text-emerald-200">
              Saved locally. v1 doesn't run a mailing list — but your
              browser will keep your interest noted, and when we ship one,
              you'll be the first to know.
            </p>
          ) : (
            <>
              <p className="font-mono text-[10.5px] leading-snug text-white/55">
                We don't run a mailing list yet. Drop your email and we'll
                save it locally — when the list launches we'll surface a
                one-click sign-up using what you stored.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@somewhere.org"
                className="rounded border border-white/10 bg-space-950/70 px-2 py-1.5 font-mono text-[12px] text-white/90 placeholder:text-white/30 focus:border-cyan-400/50 focus:outline-none"
              />
              <button
                type="button"
                disabled={!/^\S+@\S+\.\S+$/.test(email)}
                onClick={() => {
                  try {
                    localStorage.setItem(EMAIL_KEY, email);
                  } catch {
                    /* private mode */
                  }
                  setSaved(true);
                  window.setTimeout(() => {
                    setEmailOpen(false);
                    dismiss();
                    setSaved(false);
                  }, 2000);
                }}
                className="self-end rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                save
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

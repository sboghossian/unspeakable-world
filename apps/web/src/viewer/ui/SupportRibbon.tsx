import { useEffect, useState } from "react";

/**
 * Support ribbon — two modes:
 *
 * 1. **Viewer ribbon (pill)**: a small floating pill near the bottom-right
 *    on viewer routes. Slightly more prominent than the old corner sliver
 *    so people can actually find it, but still dismissible-once-forever.
 * 2. **Landing nudge modal**: a one-time-per-month gentle modal shown
 *    only on the landing route (`/`, no hash or empty hash). Never
 *    appears inside the viewer canvas. Tracked via
 *    `uw:support-nudge:last-shown` (ms since epoch).
 *
 * The component figures out which mode to render from the current
 * `location.hash` at mount time, so the same component can be reused.
 */

const DISMISS_KEY = "uw:support-ribbon:dismissed-v1";
const EMAIL_KEY = "uw:support:email";
const NUDGE_LAST_SHOWN_KEY = "uw:support-nudge:last-shown";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Allow the user to override their donation target via env or fall back
// to a generic "thanks" link. Build-time replacement keeps the value
// out of the bundle if the env var is empty.
const COFFEE_URL =
  import.meta.env.VITE_COFFEE_URL ??
  "https://github.com/sponsors/sboghossian";

function isLandingRoute(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hash;
  return h === "" || h === "#";
}

export function SupportRibbon() {
  const [dismissed, setDismissed] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  // Decide once at mount whether we should be in "landing nudge" mode
  // or "viewer pill" mode. We freeze this so a hash change mid-session
  // doesn't pop the modal in someone's face inside the canvas.
  const [landingMode] = useState<boolean>(() => isLandingRoute());

  // Landing: open the monthly nudge modal if we haven't shown it in 30d.
  // Viewer: reveal the pill after 12 s, once, ever.
  useEffect(() => {
    if (landingMode) {
      try {
        const last = Number(localStorage.getItem(NUDGE_LAST_SHOWN_KEY) ?? "0");
        const now = Date.now();
        if (!Number.isFinite(last) || now - last > THIRTY_DAYS_MS) {
          const handle = window.setTimeout(() => {
            setNudgeOpen(true);
            try {
              localStorage.setItem(NUDGE_LAST_SHOWN_KEY, String(now));
            } catch {
              /* private mode */
            }
          }, 8_000);
          return () => window.clearTimeout(handle);
        }
      } catch {
        /* private mode — silently skip */
      }
      return;
    }

    // Viewer pill flow.
    try {
      const wasDismissed = localStorage.getItem(DISMISS_KEY) === "yes";
      if (wasDismissed) return;
    } catch {
      return;
    }
    const handle = window.setTimeout(() => setDismissed(false), 12_000);
    return () => window.clearTimeout(handle);
  }, [landingMode]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "yes");
    } catch {
      /* private mode — fine, we just won't remember */
    }
  };

  // ---- Landing-route monthly nudge modal -----------------------------
  if (landingMode) {
    if (!nudgeOpen) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-space-950/55 p-4 backdrop-blur-sm md:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="uw-support-nudge-title"
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-space-950/95 p-6 shadow-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-300/90">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            free forever
          </div>
          <h2
            id="uw-support-nudge-title"
            className="font-display text-2xl text-white/95"
          >
            No paywall is coming.
          </h2>
          <p className="mt-2 text-sm leading-snug text-white/65">
            The Unspeakable World will never have a paid tier. If a layer
            you love is here, a tip keeps the lights (and the HEALPix tiles)
            on. If you'd rather just share it, that helps too — tag{" "}
            <span className="font-mono text-plasma-300">#unspeakable-world</span>{" "}
            wherever you post.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setNudgeOpen(false)}
              className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              maybe later
            </button>
            <a
              href={COFFEE_URL}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => setNudgeOpen(false)}
              className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-amber-200 transition hover:bg-amber-400/20"
            >
              tip a coffee ☕
            </a>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
            you'll only see this once a month
          </p>
        </div>
      </div>
    );
  }

  // ---- Viewer-route floating pill -----------------------------------
  if (dismissed && !emailOpen) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {!dismissed && !emailOpen && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-400/30 bg-space-950/90 px-3.5 py-2 shadow-xl backdrop-blur ring-1 ring-amber-400/10">
          <span aria-hidden className="text-base">
            ☕
          </span>
          <span className="font-mono text-[11px] text-white/80">
            Free forever — tip a coffee?
          </span>
          <a
            href={COFFEE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-200 transition hover:bg-amber-400/20"
          >
            tip
          </a>
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-400/20"
          >
            notify
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/55 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      {emailOpen && (
        <div className="pointer-events-auto flex w-[min(320px,90vw)] flex-col gap-2 rounded-xl border border-white/10 bg-space-950/95 p-3 shadow-xl backdrop-blur">
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

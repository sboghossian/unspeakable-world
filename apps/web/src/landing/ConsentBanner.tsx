import { useEffect, useState } from "react";

import { setConsent, useConsent } from "../lib/consent";
import { initTelemetry } from "../lib/telemetry";

/**
 * 🍪 First-load consent banner.
 *
 * Renders a single bottom strip the first time we see this browser.
 * Once the user clicks Accept or Decline we persist the choice to
 * `uw:consent:v1` and the banner hides itself — and stays hidden on
 * every subsequent load. The user can still flip the choice later
 * from PrivacySettings inside the viewer.
 *
 * EU-friendly copy: opt-in by default, no dark patterns, equal
 * weight on both buttons.
 */
export function ConsentBanner() {
  const [consent] = useConsent();
  // Tiny mount-fade so the banner doesn't snap in on first paint.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (consent !== null) return;
    const t = window.setTimeout(() => setShown(true), 350);
    return () => window.clearTimeout(t);
  }, [consent]);

  if (consent !== null) return null;

  function decide(accept: boolean) {
    setConsent({ telemetry: accept, errorTracking: accept });
    // Propagate immediately so the very next track() call is live.
    initTelemetry({ optOut: !accept });
  }

  return (
    <div
      role="dialog"
      aria-label="Privacy choices"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-white/10 bg-space-950/95 p-3 shadow-2xl backdrop-blur md:flex-row md:items-center md:gap-4 md:p-4">
        <div className="flex-1 text-[12px] leading-snug text-white/80">
          <div className="font-display text-sm text-white/95">
            Privacy choice
          </div>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/65">
            We use opt-in analytics to learn which features people use. No
            personal data; you can change this any time in settings.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide(false)}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="rounded-md border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/25 hover:text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

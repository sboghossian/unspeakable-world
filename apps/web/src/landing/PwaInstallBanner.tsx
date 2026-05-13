import { useEffect, useState } from "react";

/**
 * Top-right chip that pushes the PWA install prompt actively, instead of
 * waiting for the browser to surface its own micro-icon. The Chrome /
 * Edge / Brave install heuristic fires `beforeinstallprompt` once the
 * manifest is detected and the engagement threshold is met; we capture
 * the event and turn it into an explicit "Install as app" button.
 *
 * Dismissal persists in localStorage so the banner doesn't keep nagging
 * after the user has waved it away.
 */

const DISMISSED_KEY = "uw:pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isLandingHash(hash: string): boolean {
  // Landing route is the empty / `#` / `#/` hash. Anywhere else
  // (e.g. `#universe`, `#viewer`, `#surface/earth`) is a viewer route.
  return /^#?\/?$/.test(hash);
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  });
  const [onLanding, setOnLanding] = useState(() => {
    if (typeof window === "undefined") return true;
    return isLandingHash(window.location.hash);
  });

  useEffect(() => {
    const onHashChange = () => {
      setOnLanding(isLandingHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      // Successful install — never show the banner again.
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // localStorage unavailable, ignore
      }
      setDismissed(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [dismissed]);

  // Suppress on the landing page — the banner overlaps the hero chrome
  // and the install affordance is only useful inside a viewer route.
  if (onLanding) return null;
  if (!prompt || dismissed) return null;

  const install = async () => {
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "dismissed") {
        try {
          localStorage.setItem(DISMISSED_KEY, "1");
        } catch {
          // localStorage unavailable, ignore
        }
        setDismissed(true);
      }
    } catch {
      // Prompt was used or rejected — clear it either way.
    }
    setPrompt(null);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage unavailable, ignore
    }
    setDismissed(true);
    setPrompt(null);
  };

  return (
    <div className="fixed right-3 top-3 z-[100] flex items-center gap-3 rounded-lg border border-white/10 bg-space-900/85 px-3 py-2 shadow-xl backdrop-blur-md">
      <span aria-hidden className="text-base">🪐</span>
      <span className="text-xs text-white/80">Install as a desktop app</span>
      <button
        type="button"
        onClick={install}
        className="rounded bg-emerald-400 px-3 py-1 text-xs font-semibold text-space-950 transition hover:bg-emerald-300"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="px-1 text-base leading-none text-white/40 transition hover:text-white/80"
      >
        ×
      </button>
    </div>
  );
}

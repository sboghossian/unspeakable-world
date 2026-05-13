import { useEffect, useState } from "react";

/**
 * 📱 useIsMobile — returns `true` when the viewport is narrower than the
 * Tailwind `sm` breakpoint (640 px). Subscribes to `matchMedia` so the
 * value tracks orientation / window-resize live without an extra rAF.
 *
 * SSR-safe: returns `false` on the server (where there's no `window`),
 * then re-evaluates on mount so hydration mismatches don't flash.
 *
 * Why a hook and not a static check: viewer chrome stays mounted across
 * orientation flips, so re-rendering the mobile variants when the user
 * rotates from portrait → landscape is the whole reason this lives in
 * React state and not a plain function call.
 */
export function useIsMobile(maxWidthPx = 640): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < maxWidthPx;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${maxWidthPx - 1}px)`);
    const apply = (): void => setIsMobile(mq.matches);
    apply();
    // `addEventListener` is the modern path; `addListener` is the legacy
    // Safari fallback (kept around because older iPad Safari shipped it).
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };
    legacy.addListener?.(apply);
    return () => legacy.removeListener?.(apply);
  }, [maxWidthPx]);

  return isMobile;
}

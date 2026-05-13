import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * 🎓 Tutorial v2 — a 12-step walkthrough of the v4 surface.
 *
 * Replaces the eight-step Day-15 `TutorialOverlay` plus the standalone
 * `WhatsNewV4Toast`: every v4 feature (Extra Layers + sub-tabs, Cosmic
 * Copilot, Universe Mode v2, AR Sky, Grand Tour v2, Curriculum +
 * Certificate, Tonight's sky + Observation log, FITS + ADQL, Help/Privacy)
 * is covered by one step. Each step has a title, a short markdown body, an
 * optional screenshot from `/screenshots/v4/`, and an optional
 * "Try it now" action that fires a callback supplied by the host viewer.
 *
 * Persisted via `localStorage["uw:tutorial-v2-done:v1"]`. Re-opens
 * whenever the host viewer pushes a 🎓 button in the top bar.
 *
 * The component is **mode-agnostic**: all four scene viewers can mount
 * it. Actions that don't make sense in the current viewer are no-ops if
 * the host doesn't supply the handler.
 */

const TUT_V2_KEY = "uw:tutorial-v2-done:v1";
// Legacy keys we tombstone once the user has seen v2.
const LEGACY_KEYS = ["uw:tutorial-done", "uw:whats-new-v4:seen"] as const;

/**
 * Actions the host viewer can wire up. Each is optional; the step's
 * "Try it now" button is only rendered when the host supplies the
 * matching handler. This lets the same overlay run inside Viewer.tsx,
 * Universe.tsx, SolarFlight.tsx, and Galactic.tsx without compile errors
 * about missing scene capabilities.
 */
export type TutorialActions = {
  openLayersPanel?: () => void;
  openCopilot?: (seed?: string) => void;
  openTonight?: () => void;
  openObservationLog?: () => void;
  openPowerUser?: () => void;
  openShortcuts?: () => void;
  openAbout?: () => void;
  startGrandTour?: () => void;
  openCurriculum?: () => void;
  /** Switch scene mode — used by step 6 to push the user into Universe Mode v2. */
  switchMode?: (mode: "viewer" | "solar" | "galactic" | "universe") => void;
  /** Open the AR-sky overlay when supported (mobile-only). */
  startArSky?: () => void;
  /** Cross-fade to a specific HiPS overlay (e.g. "2mass"). */
  setOverlay?: (id: string | null, mix?: number) => void;
};

type Step = {
  id: string;
  glyph: string;
  title: string;
  /** Plain text or a tiny subset of markdown (**bold** · `code`). */
  body: string;
  /** Filename inside /screenshots/v4/. Omit to render no image. */
  screenshot?: string;
  /** Caption rendered beneath the screenshot. */
  shotCaption?: string;
  /** Action label + callback selector. */
  cta?: { label: string; action: keyof TutorialActions; arg?: string };
};

const STEPS: readonly Step[] = [
  {
    id: "welcome",
    glyph: "👋",
    title: "Welcome to The Unspeakable World",
    body: "A free 3-D atlas of every wavelength of every sky survey, plus a 3-D solar system, galaxy and observable universe you can fly through. **Drag** to look around, **scroll / pinch** to zoom, **tap** anything to ask SIMBAD + Wikipedia what it is.",
  },
  {
    id: "wavelengths",
    glyph: "🌈",
    title: "Eight wavelengths, one slider",
    body: "The bottom bar cross-fades between visible, Hα, near-IR, mid-IR, UV, X-ray, radio and γ-ray sky tiles streamed live from CDS Strasbourg + ESA. Slide **MIX** to morph the universe in real time.",
    screenshot: "planck-cmb.png",
    shotCaption: "Planck CMB · 380 000 years after the Big Bang",
    cta: { label: "Cross-fade to near-IR (2MASS)", action: "setOverlay", arg: "2mass" },
  },
  {
    id: "inspector",
    glyph: "🔍",
    title: "Tap anything → SIMBAD + Wikipedia",
    body: "Click any star, galaxy, nebula or planet. We resolve the click via SIMBAD's cone-search, pull the best Wikipedia summary, and offer a *fly here* + *ask the Copilot* shortcut on every result.",
  },
  {
    id: "layers",
    glyph: "✨",
    title: "The Extra Layers panel",
    body: "Open **✨ Layers** in the top bar. Four sub-tabs: **Catalogs** (Gaia DR3, Hipparcos, OpenNGC), **3D** (galaxy cones, cosmic web), **Live** (Chandra, multi-messenger, ZTF alerts), **Imagery** (JWST mosaics, Planck polarization). Toggle as many as you like.",
    screenshot: "layers-panel-with-sub-tabs.png",
    shotCaption: "Layers panel · Catalogs / 3D / Live / Imagery",
    cta: { label: "Open Layers", action: "openLayersPanel" },
  },
  {
    id: "copilot",
    glyph: "🧠",
    title: "Cosmic Copilot — your AI tutor",
    body: "Tap **🧠 ask** to open an LLM that *sees what you're looking at* — your camera, time, overlays, focused object. It can fly to targets, toggle layers, change time, and switch modes for you via tool-calls. Free, BYO key, no signup.",
    screenshot: "cosmic-copilot-conversation.png",
    shotCaption: "Copilot grounded in the live scene context",
    cta: { label: "Try the Copilot", action: "openCopilot" },
  },
  {
    id: "universe",
    glyph: "🌌",
    title: "Universe Mode v2 — one seamless scene",
    body: "From Earth's vicinity to the cosmic web, in a single continuous camera. Solar Tier (units = AU) cross-fades into Galactic Tier (units = LY) as you zoom out. Click the **🌌 universe** mode chip or the Hero CTA on the landing page.",
    screenshot: "universe-tier-handoff.png",
    shotCaption: "Solar → Galactic tier handoff at 1 LY",
    cta: { label: "Open Universe Mode", action: "switchMode", arg: "universe" },
  },
  {
    id: "ar-sky",
    glyph: "📱",
    title: "AR Sky on mobile",
    body: "On a phone, tap **AR sky** to point your device at the sky. The labels follow your orientation — constellations, planets and bright stars line up with the real horizon. Best results outdoors at night.",
    screenshot: "ar-sky-preview.png",
    shotCaption: "AR sky overlay on a phone",
    cta: { label: "Start AR sky", action: "startArSky" },
  },
  {
    id: "grand-tour",
    glyph: "▶",
    title: "Grand Tour v2 — 12 narrated stops",
    body: "A guided journey from your room to the heat death of the universe. Each stop sets camera + overlays + a short narration; press **▶ grand tour** in Universe Mode and let it drive.",
    screenshot: "grand-tour-v2.png",
    shotCaption: "Grand Tour v2 · step card + scrubber",
    cta: { label: "Start the Grand Tour", action: "startGrandTour" },
  },
  {
    id: "curriculum",
    glyph: "🎓",
    title: "15-lesson Curriculum + certificate",
    body: "From *naked-eye constellations* to *cosmic microwave background polarization*. Finish all 15 to mint a verifiable certificate of completion (free, public, no sign-up).",
    screenshot: "education-certificate.png",
    shotCaption: "Certificate of completion · publicly verifiable",
    cta: { label: "Open Curriculum", action: "openCurriculum" },
  },
  {
    id: "tonight",
    glyph: "🗓",
    title: "Tonight's sky + observation log",
    body: "Share your location (never sent to a server) for the **rise/transit/set** windows of every catalogued object, the **aurora outlook**, and the next moon phase. Log what you see — visual mag, conditions, scope — and revisit it later.",
    cta: { label: "Open Tonight's sky", action: "openTonight" },
  },
  {
    id: "power-user",
    glyph: "⚡",
    title: "Power-user: FITS + ADQL",
    body: "Drop a FITS frame onto the sky and we WCS-align it on top of HiPS. Or run an **ADQL** query against any TAP service (SIMBAD, VizieR, Gaia) and visualise the result set as a layer.",
    screenshot: "fits-upload-on-sky.png",
    shotCaption: "FITS upload, WCS-aligned over the live HiPS sky",
    cta: { label: "Open Power-user", action: "openPowerUser" },
  },
  {
    id: "help",
    glyph: "?",
    title: "Help · Shortcuts · Privacy",
    body: "Press **?** any time for the keyboard shortcut cheat-sheet, **i** for credits + data attribution, and look for the **Privacy** chip in Settings — everything stays in your browser unless you explicitly invoke a federated catalog. Join **#unspeakable-world** for help.",
    cta: { label: "Show shortcuts", action: "openShortcuts" },
  },
] as const;

type Props = {
  onClose: () => void;
  actions?: TutorialActions;
};

export function TutorialOverlayV2({ onClose, actions }: Props) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step]!;

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(TUT_V2_KEY, "1");
      // Tombstone the v1 "whats new in v4" toast — v2 supersedes it.
      for (const k of LEGACY_KEYS) localStorage.setItem(k, "1");
    } catch {
      // ignore — quota / privacy mode
    }
    onClose();
  }, [onClose]);

  const next = useCallback(() => {
    if (step < total - 1) setStep((s) => s + 1);
    else dismiss();
  }, [step, total, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss, next, prev]);

  const ctaHandler = useMemo(() => {
    if (!current.cta || !actions) return null;
    const fn = actions[current.cta.action];
    if (typeof fn !== "function") return null;
    return () => {
      // Each action keyof TutorialActions is `(arg?: string) => void` or
      // similar — the cast is narrow + intentional. The action runs, then
      // the overlay dismisses so the user lands on the affordance.
      try {
        const arg = current.cta?.arg;
        (fn as (a?: string) => void)(arg);
      } finally {
        dismiss();
      }
    };
  }, [current, actions, dismiss]);

  const shotSrc = current.screenshot
    ? `/screenshots/v4/${current.screenshot}`
    : null;

  return (
    <div
      role="dialog"
      aria-label="Tutorial"
      aria-modal="true"
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="flex w-[min(640px,96vw)] max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-space-950/95 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-plasma-300/80">
              tutorial · step {step + 1} / {total}
            </div>
            <div className="mt-0.5 font-display text-[13px] text-white/85">
              Everything in v4 in 12 steps
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tour"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            skip tour ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="select-none text-3xl leading-none sm:text-4xl" aria-hidden>
              {current.glyph}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base text-white sm:text-lg">
                {current.title}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/75">
                {renderMicroMarkdown(current.body)}
              </p>
              {shotSrc && (
                <figure className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  <img
                    src={shotSrc}
                    alt={current.shotCaption ?? current.title}
                    loading="lazy"
                    className="block w-full object-cover"
                  />
                  {current.shotCaption && (
                    <figcaption className="border-t border-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                      {current.shotCaption}
                    </figcaption>
                  )}
                </figure>
              )}
              {ctaHandler && current.cta && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={ctaHandler}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-emerald-400/50 bg-emerald-400/15 px-3 py-1 font-mono text-xs uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-400/25"
                  >
                    ▶ try it now — {current.cta.label}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/5 px-4 py-3 sm:px-5">
          <button
            type="button"
            disabled={step === 0}
            onClick={prev}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            ← back
          </button>
          <div className="flex flex-wrap items-center justify-center gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Jump to step ${i + 1}`}
                className={`h-1.5 w-5 rounded-full transition ${
                  i === step
                    ? "bg-plasma-400"
                    : i < step
                      ? "bg-emerald-400/60 hover:bg-emerald-300"
                      : "bg-white/15 hover:bg-white/30"
                }`}
              />
            ))}
          </div>
          {step < total - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-plasma-500 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-space-950 transition hover:bg-plasma-400"
            >
              next →
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md bg-emerald-500 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-space-950 transition hover:bg-emerald-400"
            >
              done ✓
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * Returns true the first time a user visits a viewer mode (any of the
 * four). Subsequent visits return false until the user clicks the 🎓
 * button to re-open. We deliberately use a single key across all modes
 * so users aren't re-tutorialised when they switch modes.
 */
export function shouldShowTutorialV2(): boolean {
  try {
    return localStorage.getItem(TUT_V2_KEY) !== "1";
  } catch {
    return true;
  }
}

/**
 * Reset hook for QA — exposed but unused in prod. Documented in the
 * shortcut sheet so users can re-watch the tutorial later.
 */
export function resetTutorialV2(): void {
  try {
    localStorage.removeItem(TUT_V2_KEY);
  } catch {
    // ignore
  }
}

/**
 * Tiny markdown subset: **bold** and `code`. Anything else passes through
 * as plain text. Keeps body copy readable in source without dragging in a
 * full markdown dependency.
 */
function renderMicroMarkdown(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Match either **bold** OR `code`. Process left-to-right.
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push(src.slice(last, m.index));
    if (m[2] !== undefined) {
      out.push(
        <strong key={`b-${i++}`} className="text-white/95">
          {m[2]}
        </strong>,
      );
    } else if (m[4] !== undefined) {
      out.push(
        <code
          key={`c-${i++}`}
          className="rounded bg-white/10 px-1 font-mono text-[12px] text-emerald-200"
        >
          {m[4]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

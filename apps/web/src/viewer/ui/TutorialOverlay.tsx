import { useEffect, useState } from "react";

/**
 * 🎓 Tutorial — interactive first-run overlay.
 *
 * Walks the user through the seven core gestures and key features in
 * eight one-screen steps. Dismissed by clicking "Got it" at the end or
 * the X at any point; remembers via localStorage so it doesn't re-run
 * on subsequent visits.
 */

const TUT_KEY = "uw:tutorial-done";

type Step = {
  title: string;
  body: string;
  glyph: string;
};

const STEPS: Step[] = [
  {
    glyph: "👋",
    title: "Welcome to The Unspeakable World",
    body: "A 3-D atlas of every wavelength of every sky survey, plus a 3-D solar system you can fly through. Two views, one universe. Eight steps and you'll know the whole thing.",
  },
  {
    glyph: "🖱",
    title: "Drag, pinch, click",
    body: "Drag with mouse or finger to look around · pinch / wheel to zoom · click any star, galaxy or planet to ask SIMBAD + Wikipedia what it is.",
  },
  {
    glyph: "🌈",
    title: "Eight wavelengths, one slider",
    body: "The bottom bar lets you cross-fade between visible, Hα, near-IR, mid-IR, UV, X-ray, radio and γ-ray sky tiles streamed live from CDS Strasbourg + ESA. Slide MIX to morph the universe.",
  },
  {
    glyph: "⌖",
    title: "Coordinate grid + named landmarks",
    body: "Press G or tap the GRID button to overlay RA / Dec lines plus the celestial equator, ecliptic and galactic plane — with chips for Sgr A*, the galactic poles, equinoxes and solstices.",
  },
  {
    glyph: "★",
    title: "Toggleable layers",
    body: "Constellations (LINES), 60 named bright stars (NAMES), six iconic spacecraft (CRAFT), 6,278 confirmed exoplanets (EXO), 73 named exotic objects (EXOTIC), and 3,927 SIMBAD pulsars (PULSARS) — turn each on/off in the bottom bar.",
  },
  {
    glyph: "🚀",
    title: "Solar System Flight",
    body: "Click the cyan SOLAR FLIGHT button up top to leave the celestial sphere and fly a free 3-D camera through the solar system. Earth is textured, Saturn has rings, Jupiter has moons, the Sun glows.",
  },
  {
    glyph: "⚛",
    title: "Gravity Sandbox",
    body: "Inside Solar Flight: open the orange ⚛ SANDBOX panel, pick a Comet / Brown Dwarf / Black Hole, set launch speed and hit ▶ LAUNCH. Watch it leapfrog through the planets' gravity — speed up time × 30 d/s and the universe runs.",
  },
  {
    glyph: "🗓",
    title: "Tonight's sky · 90-day events",
    body: "Share your location for the aurora outlook + the rise/transit/set window for any object. Open the EVENTS calendar for the next moon quarters, eclipses, planet oppositions and meteor radiants — every row is click-to-fly.",
  },
];

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step < STEPS.length - 1) setStep(step + 1);
        else dismiss();
      } else if (e.key === "ArrowLeft") {
        if (step > 0) setStep(step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const dismiss = () => {
    try {
      localStorage.setItem(TUT_KEY, "1");
    } catch {
      /* ignore */
    }
    onClose();
  };

  const s = STEPS[step]!;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="w-[min(560px,96vw)] overflow-hidden rounded-2xl border border-white/10 bg-space-950/95 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-plasma-300/80">
              tutorial · step {step + 1} / {STEPS.length}
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tutorial"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            skip ✕
          </button>
        </header>
        <div className="flex items-start gap-4 px-5 py-5">
          <div className="text-4xl leading-none">{s.glyph}</div>
          <div className="flex-1">
            <h2 className="font-display text-lg text-white">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              {s.body}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            ← back
          </button>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full ${
                  i === step ? "bg-plasma-400" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-md bg-plasma-500 px-3 py-1 font-mono text-xs text-space-950 hover:bg-plasma-400"
            >
              next →
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md bg-emerald-500 px-3 py-1 font-mono text-xs text-space-950 hover:bg-emerald-400"
            >
              got it ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  try {
    return localStorage.getItem(TUT_KEY) !== "1";
  } catch {
    return true;
  }
}

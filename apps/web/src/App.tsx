import { lazy, Suspense, useEffect, useState } from "react";
import { Starfield } from "./landing/Starfield";
import { Hero } from "./landing/Hero";
import { Highlights } from "./landing/Highlights";
import { OpenData } from "./landing/OpenData";
import { Roadmap } from "./landing/Roadmap";
import { Manifesto } from "./landing/Manifesto";
import { Footer } from "./landing/Footer";
import { SupportRibbon } from "./viewer/ui/SupportRibbon";
import { PwaInstallBanner } from "./landing/PwaInstallBanner";
import { ConsentBanner } from "./landing/ConsentBanner";
import { AstronomyToday } from "./landing/AstronomyToday";
import { ApodCard } from "./landing/ApodCard";
import {
  ensureUniverseDefault,
  isEmbedMode,
  navigate,
  surfacePlanet,
  useRoute,
} from "./router";
import { CertificatePanel } from "./viewer/ui/CertificatePanel";
import {
  getOverallProgress,
  useLessonProgress,
} from "./lib/lesson-progress";

// Lazy: the viewer pulls in Three.js, AstronomyEngine, and ~500 KB of HiPS /
// catalog code. The landing page should not pay that cost — most first-time
// visitors bounce off the marketing page without ever clicking "Launch the
// viewer". This keeps the landing JS bundle under ~80 KB gzipped.
const Viewer = lazy(() =>
  import("./viewer/Viewer").then((m) => ({ default: m.Viewer })),
);
const SolarFlight = lazy(() =>
  import("./viewer/SolarFlight").then((m) => ({ default: m.SolarFlight })),
);
const PlanetSurface = lazy(() =>
  import("./viewer/PlanetSurface").then((m) => ({ default: m.PlanetSurface })),
);
const Galactic = lazy(() =>
  import("./viewer/Galactic").then((m) => ({ default: m.Galactic })),
);
const Universe = lazy(() =>
  import("./viewer/Universe").then((m) => ({ default: m.Universe })),
);
const Sandbox = lazy(() =>
  import("./viewer/Sandbox").then((m) => ({ default: m.Sandbox })),
);
const Guide = lazy(() =>
  import("./guide/Guide").then((m) => ({ default: m.Guide })),
);
const TeacherDashboard = lazy(() =>
  import("./viewer/ui/TeacherDashboard").then((m) => ({
    default: m.TeacherDashboard,
  })),
);

// Universe Mode v2 is now the front-door experience. A bare load of the
// SPA (no hash, no `?landing=1`, no `?embed=1`) is rewritten to
// `/#universe` BEFORE React reads the initial route — so the very first
// render lands in Universe rather than flashing the marketing page. The
// Hero CTA (owned by Hero.tsx) routes explicitly to `#universe`, and the
// marketing page itself is reachable via `?landing=1` for share cards
// and link previews.
ensureUniverseDefault();

/**
 * Legacy hashes (`/#solar`, `/#galactic`, `/#sandbox`) now route into
 * Universe Mode v2 with a camera preset, UNLESS the user opted into the
 * old standalone scenes via `?legacy=1`. We detect the legacy opt-in
 * once here so every render in this load picks the same branch — the
 * toast and the route table both read this flag.
 */
function wantsLegacy(): boolean {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    if (params.get("legacy") === "1") return true;
  }
  // Also honour `?legacy=1` inside the hash query string.
  const hash = window.location.hash;
  const qIdx = hash.indexOf("?");
  if (qIdx !== -1) {
    const subParams = new URLSearchParams(hash.slice(qIdx + 1));
    if (subParams.get("legacy") === "1") return true;
  }
  return false;
}

/** Map a legacy route name → Universe Mode v2 camera preset name. */
const LEGACY_PRESET: Record<"solar" | "galactic" | "sandbox", string> = {
  solar: "solar-flight",
  galactic: "galactic",
  sandbox: "sandbox",
};

const DEPRECATED_TOAST_KEY = "uw:deprecation-toast:v1";

export function App() {
  return (
    <>
      <AppRoutes />
      <DeprecatedRouteToast />
      <CertificateAutoModal />
      {/* ConsentBanner self-hides once a choice is persisted. Rendered
          here at the top level so it shows on every entry point —
          landing page, /viewer deep link, embed, etc. The banner reads
          getConsent() itself and returns null when consent is set. */}
      <ConsentBanner />
    </>
  );
}

/**
 * Auto-open the certificate modal the first time the learner reaches
 * 100% lesson completion. The dismissal is remembered per browser so we
 * don't nag on every load — they can still re-open it from the lessons
 * panel later. The TeacherDashboard route is excluded: a teacher
 * reviewing a class shouldn't get the student's cert popping up.
 */
const CERT_DISMISSED_KEY = "uw:certificate:dismissed";

function CertificateAutoModal() {
  const route = useRoute();
  useLessonProgress();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (window.location.hash.startsWith("#class")) return false;
    try {
      if (window.localStorage.getItem(CERT_DISMISSED_KEY) === "1") return false;
    } catch {
      /* ignore */
    }
    const { percentage } = getOverallProgress();
    return percentage >= 100;
  });

  useEffect(() => {
    if (route === "class") return;
    const { percentage } = getOverallProgress();
    if (percentage < 100) return;
    try {
      if (window.localStorage.getItem(CERT_DISMISSED_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [route]);

  if (!open || route === "class") return null;
  return (
    <CertificatePanel
      onClose={() => {
        try {
          window.localStorage.setItem(CERT_DISMISSED_KEY, "1");
        } catch {
          /* ignore */
        }
        setOpen(false);
      }}
    />
  );
}

function AppRoutes() {
  const route = useRoute();
  // Embed mode hides the PWA install banner across every mode; individual
  // viewers also gate their own chrome on this flag.
  const embed = isEmbedMode();
  const legacy = wantsLegacy();

  // Universe Mode v2 absorption: if we're on a legacy scene route AND the
  // user did NOT opt into the legacy view via `?legacy=1`, rewrite the
  // hash to the matching Universe preset and bail out — the next render
  // (after the hashchange) will mount Universe. This preserves every
  // existing shareable URL (`/#solar`, `/#galactic`, `/#sandbox`) while
  // moving everyone onto the v2 front door by default.
  useEffect(() => {
    if (legacy) return;
    const target =
      route === "solar" || route === "galactic" || route === "sandbox"
        ? LEGACY_PRESET[route]
        : null;
    if (!target) return;
    // Suppress duplicate toasts on the same browser; the toast component
    // reads localStorage too, but flagging here avoids a flash on the
    // very first hit of a deprecated link.
    try {
      const fired = localStorage.getItem(DEPRECATED_TOAST_KEY);
      if (!fired) {
        localStorage.setItem(
          DEPRECATED_TOAST_KEY,
          JSON.stringify({ from: route, at: Date.now() }),
        );
      }
    } catch {
      /* localStorage disabled — toast just won't gate itself */
    }
    window.location.hash = `#universe?preset=${target}`;
  }, [route, legacy]);

  // If we're about to redirect a legacy route to Universe v2, paint the
  // loading veil instead of flashing the deprecated scene for one frame.
  if (
    !legacy &&
    (route === "solar" || route === "galactic" || route === "sandbox")
  ) {
    return (
      <main className="relative h-full w-full bg-space-950">
        <ViewerLoadingVeil />
      </main>
    );
  }

  if (route === "class") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <TeacherDashboard onExit={() => navigate("landing")} />
        </Suspense>
      </main>
    );
  }

  if (route === "guide") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Guide onExit={() => navigate("landing")} />
        </Suspense>
        {!embed && <PwaInstallBanner />}
      </main>
    );
  }

  if (route === "universe") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Universe onExit={() => navigate("landing")} />
        </Suspense>
        {!embed && <PwaInstallBanner />}
      </main>
    );
  }

  if (route === "sandbox") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Sandbox onExit={() => navigate("landing")} />
        </Suspense>
      </main>
    );
  }

  if (route === "galactic") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Galactic onExit={() => navigate("solar")} />
        </Suspense>
        {!embed && <PwaInstallBanner />}
      </main>
    );
  }

  if (route === "surface") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <PlanetSurface
            planet={surfacePlanet()}
            onExit={() => navigate("solar")}
          />
        </Suspense>
        {!embed && <PwaInstallBanner />}
      </main>
    );
  }

  if (route === "solar") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <SolarFlight
            onExit={() => navigate("viewer")}
            onFlyToSky={(dir) => {
              const params = new URLSearchParams();
              params.set("ra", "0");
              params.set("dec", "0");
              params.set("fov", "30");
              // We can't easily compute RA/Dec from xyz here without dragging
              // in math; instead encode the direction as a custom hash hint
              // that the viewer will pick up.
              params.set("dx", dir.x.toFixed(4));
              params.set("dy", dir.y.toFixed(4));
              params.set("dz", dir.z.toFixed(4));
              window.location.hash = `#viewer?${params.toString()}`;
            }}
          />
        </Suspense>
        {!embed && <PwaInstallBanner />}
      </main>
    );
  }

  if (route === "viewer") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Viewer />
        </Suspense>
        {!embed && <PwaInstallBanner />}
      </main>
    );
  }

  return (
    <main className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-space-950">
      <Starfield />
      <div className="relative z-10 flex min-h-full flex-col">
        <Hero />
        <Highlights />
        <section className="mx-auto w-full max-w-3xl px-6 pb-16">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              picture of the day
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white/95 md:text-3xl">
              From NASA, today
            </h2>
          </div>
          <ApodCard />
        </section>
        <Manifesto />
        <OpenData />
        <Roadmap />
        <Footer />
      </div>
      <AstronomyToday />
      {!embed && <PwaInstallBanner />}
      {!embed && <SupportRibbon />}
    </main>
  );
}

/**
 * One-time toast shown when a user lands on a legacy route (Solar Flight,
 * Galactic, Sandbox) and we've absorbed them into Universe Mode v2. The
 * toast offers a "Use legacy view" escape hatch that re-navigates with
 * `?legacy=1` so the original standalone scene mounts. Dismissed once
 * per browser via `localStorage`.
 */
function DeprecatedRouteToast() {
  const [info, setInfo] = useState<{ label: string; href: string } | null>(
    null,
  );
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(DEPRECATED_TOAST_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    type Stored = { from?: string; at?: number; shown?: boolean };
    let parsed: Stored | null = null;
    try {
      parsed = JSON.parse(raw) as Stored;
    } catch {
      return;
    }
    if (!parsed || parsed.shown) return;
    // Only fire while the user is still in Universe (i.e. immediately
    // after the redirect). If they've navigated elsewhere by hand,
    // suppress the toast.
    if (!window.location.hash.startsWith("#universe")) return;
    const from = parsed.from;
    if (from !== "solar" && from !== "galactic" && from !== "sandbox") return;
    const label =
      from === "solar"
        ? "Solar Flight"
        : from === "galactic"
          ? "Galactic"
          : "Sandbox";
    setInfo({ label, href: `#${from}?legacy=1` });
    try {
      localStorage.setItem(
        DEPRECATED_TOAST_KEY,
        JSON.stringify({ ...parsed, shown: true }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  if (!info) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-6 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-emerald-400/30 bg-space-950/90 px-4 py-3 font-mono text-[11px] text-white/85 shadow-2xl backdrop-blur"
    >
      <span className="text-emerald-200">{info.label}</span>
      <span className="text-white/65">
        now lives inside Universe Mode v2 — same camera, same controls.
      </span>
      <a
        href={info.href}
        className="rounded-md border border-white/15 px-2 py-1 text-emerald-200 transition hover:bg-white/10"
      >
        Use legacy view
      </a>
      <button
        type="button"
        onClick={() => setInfo(null)}
        title="Dismiss"
        className="rounded-md px-1.5 py-1 text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

function ViewerLoadingVeil() {
  // AstroGrid-style phase indicator: a sequence of named subsystems
  // ("Core systems · Camera · Background · Solar system" → "Building
  // star field" → "Loading Milky Way & nebulae" → "Preparing deep
  // sky") that cycles while the lazy-loaded scene chunk resolves.
  const PHASES: Array<{ label: string; sublabel: string }> = [
    { label: "Core systems", sublabel: "Camera · scene · background" },
    { label: "Building star field", sublabel: "120,000 HYG stars · constellations" },
    { label: "Loading Milky Way", sublabel: "Galaxy disk · arm field · nebulae" },
    { label: "Preparing deep sky", sublabel: "Pulsars · exoplanets · cosmic web" },
    { label: "Calibrating optics", sublabel: "HiPS tiles · multi-wavelength" },
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);
  useEffect(() => {
    const handle = window.setInterval(() => {
      setPhaseIdx((i) => Math.min(i + 1, PHASES.length - 1));
    }, 650);
    return () => window.clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pct = ((phaseIdx + 1) / PHASES.length) * 100;
  const phase = PHASES[phaseIdx]!;
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-space-950 backdrop-blur">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
        loading the universe
      </div>
      <div className="font-display text-2xl text-emerald-200">
        {phase.label}
      </div>
      <div className="font-mono text-[11px] tracking-widest text-white/55">
        {phase.sublabel}
      </div>
      <div className="mt-2 h-1 w-72 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
        {PHASES.map((p, i) => (
          <span
            key={p.label}
            className={
              i <= phaseIdx ? "text-emerald-300/80" : "text-white/25"
            }
          >
            {i > 0 ? " · " : ""}
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

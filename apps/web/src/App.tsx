import { lazy, Suspense, useEffect, useState } from "react";
import { Starfield } from "./landing/Starfield";
import { Hero } from "./landing/Hero";
import { Highlights } from "./landing/Highlights";
import { OpenData } from "./landing/OpenData";
import { Roadmap } from "./landing/Roadmap";
import { Footer } from "./landing/Footer";
import { PwaInstallBanner } from "./landing/PwaInstallBanner";
import { ConsentBanner } from "./landing/ConsentBanner";
import { AstronomyToday } from "./landing/AstronomyToday";
import { ApodCard } from "./landing/ApodCard";
import { isEmbedMode, navigate, surfacePlanet, useRoute } from "./router";

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

export function App() {
  return (
    <>
      <AppRoutes />
      {/* ConsentBanner self-hides once a choice is persisted. Rendered
          here at the top level so it shows on every entry point —
          landing page, /viewer deep link, embed, etc. The banner reads
          getConsent() itself and returns null when consent is set. */}
      <ConsentBanner />
    </>
  );
}

function AppRoutes() {
  const route = useRoute();
  // Embed mode hides the PWA install banner across every mode; individual
  // viewers also gate their own chrome on this flag.
  const embed = isEmbedMode();

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
        <OpenData />
        <Roadmap />
        <Footer />
      </div>
      <AstronomyToday />
      {!embed && <PwaInstallBanner />}
    </main>
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

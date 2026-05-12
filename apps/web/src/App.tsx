import { lazy, Suspense } from "react";
import { Starfield } from "./landing/Starfield";
import { Hero } from "./landing/Hero";
import { OpenData } from "./landing/OpenData";
import { Roadmap } from "./landing/Roadmap";
import { Footer } from "./landing/Footer";
import { PwaInstallBanner } from "./landing/PwaInstallBanner";
import { AstronomyToday } from "./landing/AstronomyToday";
import { navigate, surfacePlanet, useRoute } from "./router";

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
const Guide = lazy(() =>
  import("./guide/Guide").then((m) => ({ default: m.Guide })),
);

export function App() {
  const route = useRoute();

  if (route === "guide") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Guide onExit={() => navigate("landing")} />
        </Suspense>
        <PwaInstallBanner />
      </main>
    );
  }

  if (route === "universe") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Universe onExit={() => navigate("landing")} />
        </Suspense>
        <PwaInstallBanner />
      </main>
    );
  }

  if (route === "galactic") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Galactic onExit={() => navigate("solar")} />
        </Suspense>
        <PwaInstallBanner />
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
        <PwaInstallBanner />
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
        <PwaInstallBanner />
      </main>
    );
  }

  if (route === "viewer") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Viewer />
        </Suspense>
        <PwaInstallBanner />
      </main>
    );
  }

  return (
    <main className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-space-950">
      <Starfield />
      <div className="relative z-10 flex min-h-full flex-col">
        <Hero />
        <OpenData />
        <Roadmap />
        <Footer />
      </div>
      <AstronomyToday />
      <PwaInstallBanner />
    </main>
  );
}

function ViewerLoadingVeil() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-space-950 backdrop-blur">
      <div className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/50">
        loading the universe
      </div>
      <div className="h-0.5 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-pulse bg-plasma-500" />
      </div>
    </div>
  );
}

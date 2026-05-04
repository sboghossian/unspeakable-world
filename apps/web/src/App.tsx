import { lazy, Suspense } from "react";
import { Starfield } from "./landing/Starfield";
import { Hero } from "./landing/Hero";
import { Roadmap } from "./landing/Roadmap";
import { Footer } from "./landing/Footer";
import { useRoute } from "./router";

// Lazy: the viewer pulls in Three.js, AstronomyEngine, and ~500 KB of HiPS /
// catalog code. The landing page should not pay that cost — most first-time
// visitors bounce off the marketing page without ever clicking "Launch the
// viewer". This keeps the landing JS bundle under ~80 KB gzipped.
const Viewer = lazy(() =>
  import("./viewer/Viewer").then((m) => ({ default: m.Viewer })),
);

export function App() {
  const route = useRoute();

  if (route === "viewer") {
    return (
      <main className="relative h-full w-full bg-space-950">
        <Suspense fallback={<ViewerLoadingVeil />}>
          <Viewer />
        </Suspense>
      </main>
    );
  }

  return (
    <main className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-space-950">
      <Starfield />
      <div className="relative z-10 flex min-h-full flex-col">
        <Hero />
        <Roadmap />
        <Footer />
      </div>
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

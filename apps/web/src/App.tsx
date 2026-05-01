import { Starfield } from "./landing/Starfield";
import { Hero } from "./landing/Hero";
import { Roadmap } from "./landing/Roadmap";
import { Footer } from "./landing/Footer";

export function App() {
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

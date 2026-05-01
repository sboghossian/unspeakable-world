import { EmailCapture } from "./EmailCapture";

const COUNTERS = [
  { value: "~1,400", label: "open sky surveys" },
  { value: "γ → radio", label: "every wavelength" },
  { value: "MIT", label: "forever free" },
];

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-16 pt-24 text-center md:pt-36">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-plasma-400/90 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-plasma-500" />
        <span>Day 1 of 7 · building in public</span>
      </div>

      <h1 className="text-balance font-display text-5xl font-semibold leading-[1.05] glow md:text-7xl">
        The first emotionally legible
        <br />
        front-end to{" "}
        <span className="bg-gradient-to-br from-plasma-400 via-plasma-500 to-violet-400 bg-clip-text text-transparent">
          the entire universe
        </span>
        .
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/70 md:text-xl">
        Every wavelength of every sky survey. Every spacecraft trajectory ever
        flown. In a browser. 60 fps. Open source from commit one.
      </p>

      <EmailCapture />

      <dl className="mt-12 grid w-full max-w-3xl grid-cols-3 gap-2 text-left md:gap-6">
        {COUNTERS.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 backdrop-blur"
          >
            <dt className="font-mono text-2xl text-plasma-400 md:text-3xl">
              {c.value}
            </dt>
            <dd className="text-xs uppercase tracking-wider text-white/50 md:text-sm">
              {c.label}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-12 text-sm text-white/40">
        Live preview at{" "}
        <span className="font-mono text-white/60">space.dashable.dev</span> · v1
        ships in seven days
      </p>
    </section>
  );
}

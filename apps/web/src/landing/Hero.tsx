import { EmailCapture } from "./EmailCapture";
import { navigate } from "../router";

const COUNTERS = [
  { value: "8,921", label: "bright stars" },
  { value: "879", label: "deep-sky objects" },
  { value: "4", label: "wavelengths" },
  { value: "MIT", label: "forever free" },
];

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-16 pt-24 text-center md:pt-36">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-plasma-400/90 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-plasma-500" />
        <span>Day 20 · v2 live in your browser</span>
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

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate("viewer")}
          className="group inline-flex items-center gap-2 rounded-lg bg-plasma-500 px-6 py-3 text-base font-semibold text-space-950 transition hover:bg-plasma-400"
        >
          Launch the viewer
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
        <a
          href="https://github.com/sboghossian/unspeakable-world"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-base text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          See it on GitHub
        </a>
      </div>

      <p className="mt-3 max-w-xl text-xs text-white/50">
        DSS2 · 2MASS · WISE · INTEGRAL X-ray sky tiles streaming from CDS & ESA
        · 8,921 bright stars · 879 deep-sky objects · 88 constellations · Sun +
        planets · live ISS · search · tonight's sky · 8-step Grand Tour · SIMBAD
        + Wikipedia inspector · shareable URLs.
      </p>

      <EmailCapture />

      <dl className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-2 text-left md:grid-cols-4 md:gap-4">
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
        Live at{" "}
        <span className="font-mono text-white/60">space.dashable.dev</span> · v1
        shipped on Day 7 · still building in public
      </p>
    </section>
  );
}

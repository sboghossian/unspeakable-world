import { EmailCapture } from "./EmailCapture";
import { navigate } from "../router";

const COUNTERS = [
  { value: "117,931", label: "stars" },
  { value: "13,962", label: "deep-sky objects" },
  { value: "6,278", label: "exoplanets" },
  { value: "3,927", label: "pulsars" },
];

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-16 pt-24 text-center md:pt-36">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-plasma-400/90 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-plasma-500" />
        <span>Day 64 · v4 — one tool, every scale, AU to Gly</span>
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

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
        <button
          type="button"
          onClick={() => navigate("universe")}
          className="group inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-6 py-3 text-base font-semibold text-space-950 transition hover:bg-emerald-300"
        >
          🌌 Enter the Universe
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("viewer")}
          className="group inline-flex items-center gap-2 rounded-lg bg-plasma-500 px-6 py-3 text-base font-semibold text-space-950 transition hover:bg-plasma-400"
        >
          Sky atlas
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("solar")}
          className="group inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-6 py-3 text-base font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
        >
          🚀 Solar flight
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("guide")}
          className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-base text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          📖 User Guide
        </button>
        <a
          href="https://github.com/sboghossian/unspeakable-world"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-base text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          GitHub
        </a>
      </div>

      <p className="mt-3 max-w-xl text-xs text-white/50">
        Two views, same universe.
        <br />
        <strong className="text-white/75">Sky atlas:</strong> DSS2 · Hα ·
        2MASS · AllWISE · GALEX UV · INTEGRAL X-ray · NVSS radio · Fermi
        γ-ray sky tiles federated from CDS & ESA · 117,931 HYG stars ·
        13,962 OpenNGC deep-sky objects · 6,278 confirmed exoplanets ·
        3,927 SIMBAD pulsars · 73 named exotic objects (Sgr A*, M87*,
        Crab Pulsar, GW170817, Laniakea, Bullet Cluster, Pillars of
        Creation…) · 88 IAU constellations · live ISS · Voyager 1/2 ·
        Pioneers · New Horizons · JWST · 90-day sky events · SIMBAD +
        Wikipedia inspector · aurora outlook · NOAA SWPC live · 8-step
        interactive tutorial.
        <br />
        <strong className="text-white/75">Solar System Flight:</strong>{" "}
        textured 3-D Earth · drawn orbital paths · Saturn + rings · Jupiter
        + 4 Galilean moons · Mars + Phobos + Deimos · solar zones (habitable
        zone, frost line, asteroid belt, Kuiper belt) · 935 real satellites
        with live SGP4 propagation · auto-tracking camera · vicinity
        readouts · NOW button · time scrubbing animates everything orbiting.
        <br />
        <strong className="text-white/75">Gravity Sandbox:</strong> launch
        comets / Earth-class / Jupiter-class / brown dwarfs / white dwarfs /
        neutron stars / black holes under leapfrog n-body integration with
        the Sun + four gas giants. Up to 15 simultaneous projectiles, with
        400-point trails.
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

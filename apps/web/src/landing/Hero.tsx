import { useState } from "react";
import { EmailCapture } from "./EmailCapture";
import { navigate } from "../router";

export function Hero() {
  const [modesOpen, setModesOpen] = useState(false);

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-16 pt-24 text-center md:pt-36">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300/90 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span>v4 — one tool, every scale, AU to Gly</span>
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
        Every wavelength of every sky survey. 1 million Gaia stars. 136K
        galaxies in 3D. Live transients, gravitational-wave chirps, the
        full multi-messenger sky. Earth's surface to the cosmic web. In a
        browser. 60 fps. Open source from commit one.
      </p>

      {/* Single primary CTA */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("universe")}
          className="group inline-flex items-center gap-3 rounded-xl bg-emerald-400 px-8 py-4 text-lg font-semibold text-space-950 transition hover:bg-emerald-300"
        >
          🌌 Enter the Universe
          <span
            aria-hidden="true"
            className="transition group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
        <p className="text-xs text-white/40">
          Free · MIT · No account · Works on every device
        </p>
      </div>

      {/* Secondary nav: Other modes + Guide + GitHub */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setModesOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Other modes
            <span aria-hidden className={`transition ${modesOpen ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {modesOpen && (
            <div
              className="absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-space-950/95 text-left shadow-2xl backdrop-blur"
              onMouseLeave={() => setModesOpen(false)}
            >
              <button
                type="button"
                onClick={() => navigate("viewer")}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="font-display text-sm text-plasma-300">
                  📡 Sky Atlas
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  classic celestial sphere · HiPS imagery · SIMBAD
                </div>
              </button>
              <div className="border-t border-white/5" />
              <button
                type="button"
                onClick={() => navigate("solar")}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="font-display text-sm text-cyan-200">
                  🚀 Solar Flight
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  3-D heliocentric · Gravity Sandbox · 935 satellites
                </div>
              </button>
              <div className="border-t border-white/5" />
              <button
                type="button"
                onClick={() => navigate("galactic")}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="font-display text-sm text-violet-200">
                  🌌 Galactic
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  Milky Way + Local Group + cosmic web
                </div>
              </button>
              <div className="border-t border-white/5" />
              <button
                type="button"
                onClick={() => navigate("sandbox")}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="font-display text-sm text-orange-200">
                  🪐 Gravity Sandbox
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  n-body playground · launch comets, stars, black holes
                </div>
              </button>
              <div className="border-t border-white/5" />
              <button
                type="button"
                onClick={() => (window.location.hash = "#surface/earth")}
                className="block w-full px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="font-display text-sm text-amber-200">
                  🪐 Planetary Surface
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  Earth · Mars · Moon textured 3-D bodies
                </div>
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("guide")}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          📖 User Guide
        </button>
        <a
          href="https://github.com/sboghossian/unspeakable-world"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          GitHub
        </a>
      </div>

      <EmailCapture />

      <p className="mt-12 text-sm text-white/40">
        Live at{" "}
        <span className="font-mono text-white/60">unspeakable-world.dashable.dev</span> · still
        building in public
      </p>
    </section>
  );
}

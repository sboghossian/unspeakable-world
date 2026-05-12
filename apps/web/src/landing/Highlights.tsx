/**
 * Landing-page feature highlights — a 6-card grid that shows the
 * visitor what's inside before they click into the viewer. Lives
 * between the Hero and the OpenData catalog counts.
 *
 * Pure presentational. No 3D — all the visuals are ASCII / emoji
 * glyphs and Tailwind gradients so the landing page stays small.
 */

type Highlight = {
  title: string;
  body: string;
  glyph: string;
  tone: string;
  href?: string;
};

const HIGHLIGHTS: ReadonlyArray<Highlight> = [
  {
    title: "Universe Mode — seamless",
    body: "One scene, two coordinate frames (AU + LY), camera-relative rendering. Fly from Earth's orbit to the cosmic web without a scene swap. Layer opacity cross-fades across tiers as you zoom out.",
    glyph: "🌌",
    tone: "text-emerald-200",
    href: "#universe",
  },
  {
    title: "Multi-wavelength sky",
    body: "14 federated HiPS surveys — DSS2 · Pan-STARRS · SDSS9 · 2MASS · WISE · GALEX UV · NVSS / VLASS / TGSS radio · Fermi γ · Planck CMB · DESI Legacy · HST. Cross-fade any pair.",
    glyph: "◐",
    tone: "text-amber-200",
    href: "#viewer",
  },
  {
    title: "Gaia DR3 — 1M stars",
    body: "Parallax-derived 3D positions for one million stars (G ≤ 10.77). GPU-instanced with BP-RP → RGB shader. Density buckets (100K / 500K / 1M) for adaptive performance.",
    glyph: "✦",
    tone: "text-cyan-200",
    href: "#viewer",
  },
  {
    title: "Galaxy cone — 136K galaxies",
    body: "2MRS + 6dFGS in 3D. Redshift-hue gradient, K-band brightness. 10 named structures from Local Group to Shapley Concentration tagged on hover.",
    glyph: "◌",
    tone: "text-violet-200",
    href: "#universe",
  },
  {
    title: "Multi-messenger sky",
    body: "IceCube neutrinos, Pierre Auger UHECRs, LIGO/Virgo GWTC-3 90% sky areas (with inspiral chirp audio), NANOGrav pulsar timing array — all on the same celestial sphere.",
    glyph: "◈",
    tone: "text-rose-300",
    href: "#viewer",
  },
  {
    title: "Cosmic Copilot — AI tutor",
    body: "Layer 2 brain: ask 'what am I looking at?' with citations. Offline-first 32-answer fallback, optional Ollama backend (qwen3:8b default), pluggable OpenAI-compatible. Threads persist.",
    glyph: "🧠",
    tone: "text-emerald-300",
    href: "#viewer",
  },
  {
    title: "Exoplanets + habitability",
    body: "6,286 confirmed NASA Exoplanet Archive entries with 3 color modes: discovery method, ESI habitability (Earth Similarity Index from PHL), or discovery year. Host-system rings.",
    glyph: "🪐",
    tone: "text-amber-300",
    href: "#viewer",
  },
  {
    title: "Live transients & risk",
    body: "ZTF/Lasair supernova alerts with first-appearance pulse. JPL Sentry NEO impact risk on a log color ramp. Refreshes every 5-30 min via Pages Functions proxy.",
    glyph: "★",
    tone: "text-plasma-300",
    href: "#viewer",
  },
  {
    title: "AR Sky on mobile",
    body: "Rear-camera passthrough + gyro fusion + label sprites for Sun, planets, ISS, bright stars. Tap any label to identify via SIMBAD. Motion-only fallback if camera denied.",
    glyph: "📱",
    tone: "text-sky-200",
    href: "#viewer",
  },
];

export function Highlights() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          inside
        </div>
        <h2 className="mt-1 font-display text-2xl font-semibold text-white/95 md:text-3xl">
          Built deep, on purpose
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HIGHLIGHTS.map((h) => {
          const Wrapper: React.ElementType = h.href ? "a" : "div";
          const wrapperProps = h.href ? { href: h.href } : {};
          return (
            <Wrapper
              key={h.title}
              {...wrapperProps}
              className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/25 hover:bg-white/[0.06]"
            >
              <div className="flex items-baseline justify-between">
                <div className={`text-2xl ${h.tone}`} aria-hidden>
                  {h.glyph}
                </div>
                {h.href && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/30 transition group-hover:text-white/60">
                    open ↗
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-base text-white/90">
                {h.title}
              </div>
              <div className="mt-1 text-[12px] leading-snug text-white/55">
                {h.body}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}

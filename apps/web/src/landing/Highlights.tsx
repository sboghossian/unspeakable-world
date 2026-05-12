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
    title: "Solar system flight",
    body: "Voyager-style camera around real heliocentric positions. 8 textured planets, Earth's Moon, Mars's moons, Galileans, the asteroid belt — all driven by AstronomyEngine.",
    glyph: "🚀",
    tone: "text-cyan-200",
    href: "#solar",
  },
  {
    title: "Multi-wavelength sky",
    body: "DSS2 visible · 2MASS infrared · WISE mid-IR · GALEX UV · NVSS radio · Fermi gamma. Cross-fade between any pair to see the same patch in different physics.",
    glyph: "◐",
    tone: "text-amber-200",
    href: "#viewer",
  },
  {
    title: "Day/night Earth",
    body: "Custom shader: sunlit hemisphere blends across a soft terminator into a city-lights night side. Fresnel atmosphere rim. ~30 capital cities label up when you zoom close.",
    glyph: "🌍",
    tone: "text-emerald-200",
    href: "#solar",
  },
  {
    title: "Saturn ring shadow",
    body: "Analytical ray-cast in the fragment shader paints the rings' shadow back onto the planet body. Sweeps to the poles at equinox, no shadow maps required.",
    glyph: "🪐",
    tone: "text-amber-300",
    href: "#solar",
  },
  {
    title: "Gravity sandbox",
    body: "Verlet n-body playground: pick a projectile (comet → black hole), set launch speed (slow → near-light), right-click to fire. Trails, momentum-conserving collisions.",
    glyph: "⚛",
    tone: "text-violet-200",
    href: "#sandbox",
  },
  {
    title: "Live satellite catalog",
    body: "~400 real TLEs propagated client-side via SGP4. Click any sat for altitude, speed, lat/lon, orbital period, NORAD ID. ISS gets a stylized 3D model when zoomed close.",
    glyph: "🛰",
    tone: "text-sky-200",
    href: "#solar",
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

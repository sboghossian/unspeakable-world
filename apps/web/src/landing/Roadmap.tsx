type Phase = {
  day: string;
  title: string;
  detail: string;
  status: "shipped" | "now" | "next" | "soon";
};

const PHASES: Phase[] = [
  {
    day: "Day 1",
    title: "Foundation",
    detail: "Public repo · MIT license · landing live at space.dashable.dev",
    status: "shipped",
  },
  {
    day: "Day 2-3",
    title: "HEALPix engine",
    detail:
      "Real DSS2 sky tiles streaming on a 3D Three.js sphere · Voyager camera with touch + pinch + tap-to-fly · Norder 1+ LOD on zoom",
    status: "shipped",
  },
  {
    day: "Day 4",
    title: "Catalogs + Solar System",
    detail:
      "8,921 bright stars (HYG v4.0) GPU-instanced · Sun, Moon, 8 planets via AstronomyEngine · time scrubbing",
    status: "shipped",
  },
  {
    day: "Day 5",
    title: "Live ISS + Quick Targets",
    detail:
      "Live ISS position from wheretheiss.at · Sun/Moon/Planets/ISS targets menu · click-to-fly with eased camera",
    status: "shipped",
  },
  {
    day: "Day 6",
    title: "Multi-wavelength + SIMBAD",
    detail:
      "Visible ↔ 2MASS (near-IR) ↔ AllWISE (mid-IR) cross-fade slider · click any sky → SIMBAD info panel with name, type, magnitude",
    status: "shipped",
  },
  {
    day: "Day 7",
    title: "Public launch (v1)",
    detail:
      "Show HN, Reddit, Product Hunt — first public sharing of the OSS viewer.",
    status: "shipped",
  },
  {
    day: "Day 8",
    title: "Tonight's sky",
    detail:
      'Geolocation-gated "↑ tonight\'s sky" button computes your local zenith via IAU GMST and flies the camera straight up — coordinates stay on-device.',
    status: "shipped",
  },
  {
    day: "Day 9",
    title: "Polar seam tightened",
    detail:
      "Bumped tile subdivision SUB=16→32. The wide diagonal cracks at lat ±41.81° collapse to thin lines.",
    status: "shipped",
  },
  {
    day: "Day 10",
    title: "Deep-sky overlay",
    detail:
      "879 Messier + bright NGC/IC objects from OpenNGC — type-coded ring markers (galaxy / cluster / nebula).",
    status: "shipped",
  },
  {
    day: "Day 11",
    title: "Constellation lines",
    detail:
      "All 88 IAU constellations from d3-celestial — toggle with ✦ LINES.",
    status: "shipped",
  },
  {
    day: "Day 12",
    title: "X-ray wavelength",
    detail:
      "INTEGRAL hard X-ray (20-100 keV color) joins DSS2 / 2MASS / WISE in the wavelength toggle. Visible → mid-IR → X-ray cross-fade.",
    status: "shipped",
  },
  {
    day: "Day 13",
    title: "Search bar",
    detail:
      "⌘K opens search across stars, deep-sky objects, planets, constellations — fly to any of them.",
    status: "shipped",
  },
  {
    day: "Day 14",
    title: "Mobile UX",
    detail:
      "Top bar collapses to icons on phones; engineering chrome hidden on small screens.",
    status: "shipped",
  },
  {
    day: "Day 15",
    title: "Grand Tour",
    detail:
      "9-step guided walkthrough: Sun → Andromeda → Pleiades → Orion → Sgr A* → Crab → LMC → Jupiter + Galilean moons → Voyager 1, each with the right wavelength.",
    status: "shipped",
  },
  {
    day: "Day 16",
    title: "Shareable URLs",
    detail:
      "Every camera state, FOV, time, overlay + mix, and toggles round-trip via the URL hash. Copy-paste any view.",
    status: "shipped",
  },
  {
    day: "Day 17",
    title: "Wikipedia inspector",
    detail:
      "Click the sky → SIMBAD identifies the object + Wikipedia article excerpt + thumbnail in the side panel.",
    status: "shipped",
  },
  {
    day: "Day 18",
    title: "Famous-name aliases",
    detail:
      'Type "Crab" or "Pleiades" — search and Wikipedia lookups now bridge SIMBAD codes to common names.',
    status: "shipped",
  },
  {
    day: "Day 19",
    title: "Constellation labels",
    detail:
      "88 three-letter IAU codes overlay the sky at each constellation centroid when ✦ LINES is on.",
    status: "shipped",
  },
  {
    day: "Day 20",
    title: "v2 ship",
    detail:
      "You are here. Refreshed README, updated OG card, new screenshots, fresh hello on socials.",
    status: "now",
  },
];

const STATUS_BADGE: Record<Phase["status"], string> = {
  shipped: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  now: "border-plasma-500/40 bg-plasma-500/10 text-plasma-400",
  next: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  soon: "border-white/10 bg-white/5 text-white/50",
};

const STATUS_LABEL: Record<Phase["status"], string> = {
  shipped: "✓ Shipped",
  now: "● Now",
  next: "○ Next",
  soon: "○ Soon",
};

export function Roadmap() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="mb-10 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            19 days shipped.{" "}
            <span className="text-white/40">Building in public.</span>
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Every commit on{" "}
            <a
              href="https://github.com/sboghossian/unspeakable-world"
              target="_blank"
              rel="noreferrer"
              className="text-white/70 underline-offset-2 hover:text-plasma-400 hover:underline"
            >
              github.com/sboghossian/unspeakable-world
            </a>{" "}
            since hour zero.
          </p>
        </div>
        <a
          href="https://github.com/sboghossian/unspeakable-world"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          GitHub →
        </a>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {PHASES.map((p) => (
          <li
            key={p.day}
            className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">
                {p.day}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_BADGE[p.status]}`}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-white">
              {p.title}
            </h3>
            <p className="text-sm text-white/60">{p.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

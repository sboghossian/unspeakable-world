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
    title: "Public launch",
    detail:
      "You are here. Show HN · Reddit r/space · Product Hunt · Twitter devlog. Now go open the viewer.",
    status: "now",
  },
  {
    day: "Day 8-9",
    title: "Tonight's sky + seam fix",
    detail:
      "DeviceOrientation + geolocation gyro mode · proper polar Collignon seam handling at lat ±41.81°",
    status: "next",
  },
  {
    day: "Day 10-12",
    title: "Deeper sky",
    detail:
      "Messier + NGC overlay · constellation lines · more wavelengths (Chandra X-ray, Planck CMB, H-alpha)",
    status: "soon",
  },
  {
    day: "Day 13-15",
    title: "Speed + tours",
    detail:
      "Local SIMBAD mirror so panels resolve in <100ms · mobile tier polish · scripted camera tours through the catalog",
    status: "soon",
  },
  {
    day: "Day 16-20",
    title: "Search + AI + v2",
    detail:
      'Search bar with named-star autocomplete · satellite swarm beyond ISS · grounded "what am I looking at" AI copilot',
    status: "soon",
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
            6 days shipped.{" "}
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

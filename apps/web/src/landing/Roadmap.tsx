type Phase = {
  day: string;
  title: string;
  detail: string;
  status: "now" | "next" | "soon" | "ship";
};

const PHASES: Phase[] = [
  {
    day: "Day 1",
    title: "Foundation",
    detail: "Public repo · landing live · Cloudflare tunnel · MIT license",
    status: "ship",
  },
  {
    day: "Day 2-3",
    title: "HEALPix Toy",
    detail: "Real DSS2 sky tiles streaming onto a 3D sphere · Voyager camera",
    status: "now",
  },
  {
    day: "Day 4",
    title: "Catalogs + Solar System",
    detail: "Hipparcos 118K stars · AstronomyEngine planets · time scrubbing",
    status: "soon",
  },
  {
    day: "Day 5",
    title: "Tonight's Sky + ISS",
    detail: "Gyro + geolocation observer mode · live ISS · SIMBAD search",
    status: "soon",
  },
  {
    day: "Day 6",
    title: "Multi-wavelength",
    detail: "Visible ↔ IR ↔ X-ray cross-fade · grounded info panels",
    status: "soon",
  },
  {
    day: "Day 7",
    title: "Ship",
    detail: "Polish · OG cards · Show HN · Reddit · Product Hunt",
    status: "ship",
  },
];

const STATUS_BADGE: Record<Phase["status"], string> = {
  now: "border-plasma-500/40 bg-plasma-500/10 text-plasma-400",
  next: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  soon: "border-white/10 bg-white/5 text-white/50",
  ship: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const STATUS_LABEL: Record<Phase["status"], string> = {
  now: "● Now",
  next: "○ Next",
  soon: "○ Soon",
  ship: "★ Ship",
};

export function Roadmap() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="mb-10 flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">
          7 days. <span className="text-white/40">In public.</span>
        </h2>
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

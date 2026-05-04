type Catalog = {
  count: string;
  label: string;
  source: string;
  license: string;
  url: string;
  tone: "emerald" | "plasma" | "violet" | "cyan" | "amber" | "rose";
};

const CATALOGS: Catalog[] = [
  {
    count: "117,931",
    label: "Stars (HYG v4.0)",
    source: "HYG Database",
    license: "CC-BY-SA 2.5",
    url: "https://github.com/astronexus/HYG-Database",
    tone: "amber",
  },
  {
    count: "13,962",
    label: "Deep-sky objects",
    source: "OpenNGC",
    license: "CC-BY-SA 4.0",
    url: "https://github.com/mattiaverga/OpenNGC",
    tone: "violet",
  },
  {
    count: "6,278",
    label: "Confirmed exoplanets",
    source: "NASA Exoplanet Archive",
    license: "Public domain",
    url: "https://exoplanetarchive.ipac.caltech.edu/",
    tone: "emerald",
  },
  {
    count: "3,927",
    label: "Pulsars",
    source: "SIMBAD / CDS",
    license: "CC-BY 4.0",
    url: "https://simbad.cds.unistra.fr/simbad/",
    tone: "cyan",
  },
  {
    count: "935",
    label: "Live satellites (TLE)",
    source: "Celestrak",
    license: "Public",
    url: "https://celestrak.org/",
    tone: "plasma",
  },
  {
    count: "88",
    label: "IAU constellations",
    source: "d3-celestial",
    license: "BSD-3",
    url: "https://github.com/ofrohn/d3-celestial",
    tone: "rose",
  },
];

const SERVICES: Catalog[] = [
  {
    count: "8 surveys",
    label: "HiPS sky imagery",
    source: "CDS Strasbourg",
    license: "Open access",
    url: "https://aladin.cds.unistra.fr/hips/",
    tone: "violet",
  },
  {
    count: "Live",
    label: "ISS position",
    source: "wheretheiss.at",
    license: "Public API",
    url: "https://wheretheiss.at/",
    tone: "plasma",
  },
  {
    count: "Live",
    label: "Solar wind + Kp",
    source: "NOAA SWPC",
    license: "Public domain",
    url: "https://www.swpc.noaa.gov/",
    tone: "amber",
  },
  {
    count: "Live",
    label: "Near-Earth objects",
    source: "JPL CAD API",
    license: "Public domain",
    url: "https://ssd-api.jpl.nasa.gov/",
    tone: "emerald",
  },
  {
    count: "8 planets",
    label: "Ephemerides",
    source: "AstronomyEngine",
    license: "MIT",
    url: "https://github.com/cosinekitty/astronomy",
    tone: "cyan",
  },
  {
    count: "Real-time",
    label: "Object lookup",
    source: "Wikipedia REST",
    license: "CC-BY-SA",
    url: "https://en.wikipedia.org/api/rest_v1/",
    tone: "rose",
  },
];

const TONE: Record<Catalog["tone"], string> = {
  emerald: "text-emerald-300",
  plasma: "text-plasma-300",
  violet: "text-violet-300",
  cyan: "text-cyan-200",
  amber: "text-amber-200",
  rose: "text-rose-300",
};

function Card({ c }: { c: Catalog }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/25 hover:bg-white/[0.05]"
    >
      <div className={`font-display text-2xl font-semibold ${TONE[c.tone]}`}>
        {c.count}
      </div>
      <div className="text-sm text-white/80">{c.label}</div>
      <div className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/40">
        <span>{c.source}</span>
        <span>{c.license}</span>
      </div>
    </a>
  );
}

export function OpenData() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          100% open data · 0 proprietary feeds
        </div>
        <h2 className="font-display text-3xl font-semibold md:text-4xl">
          Every star, every survey,{" "}
          <span className="text-white/40">publicly sourced.</span>
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-white/60">
          Nothing scraped from a paid API. Nothing behind a login. Every catalog
          below is a public archive maintained by an observatory, agency, or
          academic group — we federate, attribute, and never re-host.
        </p>
      </div>

      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        Bundled catalogs
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {CATALOGS.map((c) => (
          <Card key={c.label} c={c} />
        ))}
      </div>

      <h3 className="mb-3 mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        Live services
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {SERVICES.map((c) => (
          <Card key={c.label} c={c} />
        ))}
      </div>

      <p className="mt-8 text-xs text-white/40">
        Source code is{" "}
        <a
          href="https://github.com/sboghossian/unspeakable-world"
          target="_blank"
          rel="noreferrer"
          className="text-white/60 underline-offset-2 hover:text-plasma-400 hover:underline"
        >
          MIT licensed
        </a>
        . Each catalog retains its own license — click any card for the
        upstream source.
      </p>
    </section>
  );
}

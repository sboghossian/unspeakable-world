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
    count: "1,000,000",
    label: "Stars (Gaia DR3)",
    source: "ESA Gaia DR3 · VizieR TAP",
    license: "CC-BY 4.0",
    url: "https://www.cosmos.esa.int/web/gaia/dr3",
    tone: "cyan",
  },
  {
    count: "117,931",
    label: "Stars (HYG v4.0)",
    source: "HYG Database",
    license: "CC-BY-SA 2.5",
    url: "https://github.com/astronexus/HYG-Database",
    tone: "amber",
  },
  {
    count: "136,596",
    label: "Galaxies in 3D",
    source: "2MRS + 6dFGS · VizieR",
    license: "CC-BY",
    url: "https://vizier.cds.unistra.fr/",
    tone: "violet",
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
    count: "15,362",
    label: "Galaxy velocity field",
    source: "CosmicFlows-4 · Tully+ 2023",
    license: "Open w/ citation",
    url: "https://edd.ifa.hawaii.edu/dvc.php?d=ckb",
    tone: "emerald",
  },
  {
    count: "6,286",
    label: "Confirmed exoplanets",
    source: "NASA Exoplanet Archive",
    license: "Public domain",
    url: "https://exoplanetarchive.ipac.caltech.edu/",
    tone: "emerald",
  },
  {
    count: "7,931",
    label: "TESS planet candidates",
    source: "NASA Exoplanet Archive TOI",
    license: "Public domain",
    url: "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=TOI",
    tone: "plasma",
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
    count: "84",
    label: "Chandra X-ray sources",
    source: "Chandra Source Catalog 2.0",
    license: "Public domain",
    url: "https://cxc.cfa.harvard.edu/csc/",
    tone: "rose",
  },
  {
    count: "72",
    label: "Bright variables (VSX)",
    source: "AAVSO VSX",
    license: "CC-BY 4.0",
    url: "https://www.aavso.org/vsx/",
    tone: "amber",
  },
  {
    count: "134",
    label: "Multi-messenger events",
    source: "IceCube · Auger · LIGO · NANOGrav",
    license: "Open / CC-BY",
    url: "https://gwosc.org/eventapi/",
    tone: "rose",
  },
  {
    count: "30",
    label: "PHL habitable worlds",
    source: "PHL @ UPR Arecibo",
    license: "CC-BY",
    url: "https://phl.upr.edu/projects/habitable-exoplanets-catalog",
    tone: "emerald",
  },
  {
    count: "12 + 4",
    label: "Sky cultures",
    source: "Stellarium + native",
    license: "CC BY-SA 4.0",
    url: "https://github.com/Stellarium/stellarium-skycultures",
    tone: "violet",
  },
  {
    count: "33",
    label: "JWST mosaic targets",
    source: "STScI · CDS MocServer",
    license: "Public domain",
    url: "https://aladin.cds.unistra.fr/hips/list",
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
    count: "14 surveys",
    label: "HiPS sky imagery",
    source: "CDS · NRAO · ASTRON",
    license: "Open access",
    url: "https://aladin.cds.unistra.fr/hips/",
    tone: "violet",
  },
  {
    count: "Live",
    label: "ZTF supernova alerts",
    source: "Lasair · ROE",
    license: "Open",
    url: "https://lasair-ztf.lsst.ac.uk/",
    tone: "plasma",
  },
  {
    count: "Live",
    label: "NEO impact risk",
    source: "JPL Sentry / CAD",
    license: "Public domain",
    url: "https://ssd-api.jpl.nasa.gov/",
    tone: "emerald",
  },
  {
    count: "Live",
    label: "Satellite TLEs (incl. Starlink)",
    source: "Celestrak",
    license: "Public",
    url: "https://celestrak.org/",
    tone: "plasma",
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
    count: "Daily",
    label: "Mars rover photos",
    source: "NASA Mars Photos API",
    license: "Public domain",
    url: "https://api.nasa.gov/",
    tone: "rose",
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
    source: "SIMBAD · Wikipedia REST",
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

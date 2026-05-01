const SOURCES = [
  {
    name: "CDS Strasbourg",
    url: "https://cds.unistra.fr/",
    detail: "HiPS · SIMBAD · VizieR",
  },
  {
    name: "NASA / ESA / JAXA",
    url: "https://www.nasa.gov/",
    detail: "public-domain imagery",
  },
  { name: "Three.js", url: "https://threejs.org/", detail: "the renderer" },
  {
    name: "AstronomyEngine",
    url: "https://github.com/cosinekitty/astronomy",
    detail: "ephemeris in 100KB",
  },
  {
    name: "cds-healpix-rust",
    url: "https://github.com/cds-astro/cds-healpix-rust",
    detail: "HEALPix · MIT/Apache",
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-space-950/60 px-6 py-12 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-6 text-xs uppercase tracking-[0.2em] text-white/40">
          Built on the shoulders of
        </p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {SOURCES.map((s) => (
            <li key={s.name}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/5"
              >
                <div className="text-sm font-semibold text-white/90">
                  {s.name}
                </div>
                <div className="text-xs text-white/40">{s.detail}</div>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/40 md:flex-row md:items-center">
          <span>
            MIT licensed · Data CC-BY per source · ©{" "}
            <a
              href="https://github.com/sboghossian"
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-white"
            >
              Stephane Boghossian
            </a>{" "}
            and contributors
          </span>
          <span className="font-mono">
            <a
              href="https://github.com/sboghossian/unspeakable-world"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              github.com/sboghossian/unspeakable-world
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

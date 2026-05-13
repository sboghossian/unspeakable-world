import { cn, TEXT } from "../../lib/design-tokens";

/**
 * ℹ About / credits overlay.
 *
 * The viewer ships data and code from a long list of free, open
 * sources — every one of them gets named here, with a link, the
 * license, and what it's used for. Required by CC-BY-SA attribution
 * for HYG and OpenNGC; required by basic decency for everyone else.
 */

type Source = {
  name: string;
  use: string;
  url: string;
  license: string;
};

const DATA: Source[] = [
  {
    name: "CDS Strasbourg HiPS",
    use: "DSS2 / 2MASS / AllWISE / INTEGRAL sky-tile streaming",
    url: "https://aladin.cds.unistra.fr/hips/",
    license: "Public domain (data) · service free",
  },
  {
    name: "SIMBAD",
    use: "Click-to-inspect cone-search resolver",
    url: "https://simbad.cds.unistra.fr/simbad/",
    license: "CDS open service",
  },
  {
    name: "Wikipedia REST",
    use: "Article extracts + thumbnails for inspected objects",
    url: "https://en.wikipedia.org/api/rest_v1/",
    license: "CC BY-SA 4.0",
  },
  {
    name: "HYG Database v4.0",
    use: "8,921 bright stars + 314 named stars",
    url: "https://github.com/astronexus/HYG-Database",
    license: "CC BY-SA 4.0 (David Nash)",
  },
  {
    name: "OpenNGC",
    use: "879 bright NGC/IC + Messier deep-sky objects",
    url: "https://github.com/mattiaverga/OpenNGC",
    license: "CC BY-SA 4.0 (Mattia Verga)",
  },
  {
    name: "d3-celestial",
    use: "88 IAU constellation lines",
    url: "https://github.com/ofrohn/d3-celestial",
    license: "BSD 3-Clause (Olaf Frohn)",
  },
  {
    name: "AstronomyEngine",
    use: "Sun/Moon/planet ephemeris + rise-set + phase",
    url: "https://github.com/cosinekitty/astronomy",
    license: "MIT (Don Cross)",
  },
  {
    name: "wheretheiss.at",
    use: "Live ISS position polling",
    url: "https://wheretheiss.at/",
    license: "Free service",
  },
  {
    name: "NOAA SWPC",
    use: "Live K-index, NOAA scales, space-weather alerts",
    url: "https://www.swpc.noaa.gov/",
    license: "Public domain (US gov)",
  },
  {
    name: "JPL SBDB CAD API",
    use: "Near-Earth Object close approaches",
    url: "https://ssd-api.jpl.nasa.gov/doc/cad.html",
    license: "Public domain (NASA)",
  },
];

const CODE: Source[] = [
  {
    name: "Three.js r171",
    use: "WebGL2 rendering engine",
    url: "https://threejs.org/",
    license: "MIT",
  },
  {
    name: "@hscmap/healpix",
    use: "HEALPix tile math (pure TS)",
    url: "https://github.com/michitaro/healpix",
    license: "MIT",
  },
  {
    name: "React 19 · Vite 6 · Tailwind",
    use: "App shell, build, styles",
    url: "https://react.dev/",
    license: "MIT",
  },
];

export function AboutOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(640px,96vw)] max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-space-950/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-space-950/95 px-5 py-3 backdrop-blur">
          <div>
            <div className={cn(TEXT.label, "text-white/40")}>
              about · credits · sources
            </div>
            <div className="font-display text-base text-white">
              The Unspeakable World
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Esc ✕
          </button>
        </header>

        <div className="px-5 py-4 text-sm text-white/75">
          A free, open-source 3D atlas of the entire sky — every
          wavelength, every survey, federated from the open Virtual
          Observatory. MIT licensed. No accounts, no tracking.
        </div>

        <Section title="Live data sources" rows={DATA} />
        <Section title="Code & libraries" rows={CODE} />

        <footer className="border-t border-white/5 px-5 py-3 text-xs text-white/55">
          Source on{" "}
          <a
            href="https://github.com/sboghossian/unspeakable-world"
            target="_blank"
            rel="noreferrer"
            className="text-plasma-300 hover:underline"
          >
            GitHub
          </a>
          {" · "}
          MIT licensed
          {" · "}
          built in public, every commit on{" "}
          <code className="rounded bg-white/5 px-1 py-0.5 font-mono">main</code>
          .
        </footer>
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Source[] }) {
  return (
    <section className="border-t border-white/5 px-5 py-3">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/40">
        {title}
      </div>
      <ul className="space-y-2">
        {rows.map((s) => (
          <li
            key={s.name}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-sm text-white hover:text-plasma-300"
              >
                {s.name}
              </a>{" "}
              <span className="font-mono text-[10px] text-white/40">
                · {s.license}
              </span>
            </div>
            <div className="shrink-0 text-xs text-white/55 sm:text-right">
              {s.use}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

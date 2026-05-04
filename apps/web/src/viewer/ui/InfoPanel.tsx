import type { SimbadHit } from "../info/simbad";
import { describeType } from "../info/simbad";
import type { WikiSummary } from "../info/wikipedia";

type Props = {
  raDeg: number;
  decDeg: number;
  loading: boolean;
  error: string | null;
  hit: SimbadHit | null;
  wiki?: WikiSummary | null;
  wikiLoading?: boolean;
  isFavorited?: boolean;
  onClose: () => void;
  onFlyTo: () => void;
  onToggleFavorite?: () => void;
};

export function InfoPanel({
  raDeg,
  decDeg,
  loading,
  error,
  hit,
  wiki,
  wikiLoading,
  isFavorited,
  onClose,
  onFlyTo,
  onToggleFavorite,
}: Props) {
  return (
    <aside className="pointer-events-auto absolute right-4 top-20 z-20 w-[300px] max-w-[90vw] rounded-xl border border-white/10 bg-space-950/85 p-4 backdrop-blur md:w-[340px]">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            sky inspector
          </div>
          <div className="mt-1 font-mono text-xs text-white/50">
            {formatRa(raDeg)}, {formatDec(decDeg)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </header>

      {loading && (
        <div className="flex items-center gap-2 py-2 font-mono text-xs text-white/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-plasma-400" />
          asking SIMBAD…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 font-mono text-xs text-amber-300/90">
          {error}
        </div>
      )}

      {!loading && !error && !hit && (
        <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">
          Nothing in SIMBAD's catalog within 10 arcmin of this point.
          <div className="mt-2 text-xs text-white/40">
            Try clicking closer to a bright object.
          </div>
        </div>
      )}

      {hit && (
        <>
          <h2 className="font-display text-xl font-semibold text-white">
            {hit.name}
          </h2>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-plasma-500/30 bg-plasma-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-plasma-300">
            {describeType(hit.type)}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {hit.vMag !== null && <Row k="V mag" v={hit.vMag.toFixed(2)} />}
            {hit.spectralType && <Row k="Spectral" v={hit.spectralType} />}
            {hit.redshift !== null && <Row k="z" v={hit.redshift.toFixed(4)} />}
            {hit.radialVelocity !== null && (
              <Row k="rad-v" v={`${hit.radialVelocity.toFixed(0)} km/s`} />
            )}
          </dl>

          {hit.identifiers.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                also known as
              </div>
              <div className="flex flex-wrap gap-1">
                {hit.identifiers.slice(0, 4).map((id) => (
                  <span
                    key={id}
                    className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(wikiLoading || wiki) && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Wikipedia
                </span>
                {wiki && (
                  <a
                    href={wiki.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] text-white/50 hover:text-plasma-400"
                  >
                    open ↗
                  </a>
                )}
              </div>
              {wikiLoading && !wiki && (
                <div className="font-mono text-xs text-white/40">
                  looking up…
                </div>
              )}
              {wiki && (
                <div className="flex gap-3">
                  {wiki.thumbnail && (
                    <img
                      src={wiki.thumbnail.source}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded border border-white/10 object-cover"
                    />
                  )}
                  <p className="line-clamp-6 text-xs leading-relaxed text-white/75">
                    {wiki.extract}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onFlyTo}
              className="flex-1 rounded-lg border border-plasma-500/40 bg-plasma-500/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-plasma-300 transition hover:bg-plasma-500/20"
            >
              Fly here →
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                title={
                  isFavorited ? "Remove from favorites" : "Save to favorites"
                }
                className={`shrink-0 rounded-lg border px-3 py-2 font-mono text-xs uppercase tracking-wider transition ${
                  isFavorited
                    ? "border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-amber-300"
                }`}
              >
                {isFavorited ? "★" : "☆"}
              </button>
            )}
          </div>

          <div className="mt-3 text-[10px] text-white/30">
            via SIMBAD · CDS Strasbourg{wiki ? " · Wikipedia (CC BY-SA)" : ""}
          </div>
        </>
      )}
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        {k}
      </dt>
      <dd className="font-mono text-white/85">{v}</dd>
    </>
  );
}

function formatRa(raDeg: number): string {
  // Convert degrees to RA hh:mm:ss
  const hours = raDeg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${pad2(h)}h ${pad2(m)}m ${s.toFixed(1)}s`;
}

function formatDec(decDeg: number): string {
  const sign = decDeg < 0 ? "-" : "+";
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = ((abs - d) * 60 - m) * 60;
  return `${sign}${pad2(d)}° ${pad2(m)}' ${s.toFixed(0)}"`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  readFitsFromFile,
  stretchToImageData,
  type FitsImage,
} from "../power-user/fits-reader";
import {
  projectFitsOnSky,
  type FitsProjectionHandle,
} from "../power-user/fits-projection";
import type { Group } from "three";
import { log } from "../../lib/logger";

/**
 * Drop-zone for a .fits file. After parsing we render a 1:1 thumbnail
 * into a canvas, list the 10 most relevant header cards, and offer a
 * "Project on sky" button that mounts the image into the scene's power-
 * user group at its WCS-derived (RA, Dec).
 */

type Props = {
  /** The scene's power-user Group, or null if the scene isn't ready yet. */
  group: Group | null;
  /** Called after we mount a projection so the host can mark dirty. */
  onMarkDirty?: () => void;
};

type Loaded = {
  img: FitsImage;
  /** Most-interesting header cards in their natural FITS order. */
  highlights: ReadonlyArray<{ key: string; value: string; comment: string }>;
};

const HIGHLIGHT_KEYS = [
  "BITPIX",
  "NAXIS1",
  "NAXIS2",
  "OBJECT",
  "TELESCOP",
  "INSTRUME",
  "FILTER",
  "DATE-OBS",
  "EXPTIME",
  "CTYPE1",
  "CTYPE2",
  "CRVAL1",
  "CRVAL2",
  "CRPIX1",
  "CRPIX2",
  "CDELT1",
  "CDELT2",
];

export function FitsPanel({ group, onMarkDirty }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [dragging, setDragging] = useState(false);
  const [handle, setHandle] = useState<FitsProjectionHandle | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render the thumbnail whenever a new file is parsed.
  useEffect(() => {
    if (!loaded || !canvasRef.current) return;
    const cnv = canvasRef.current;
    const { img } = loaded;
    // Downscale to fit a 240-px-wide thumbnail; preserve aspect.
    const target = Math.min(240, img.width);
    const scale = target / img.width;
    const tw = Math.max(1, Math.round(img.width * scale));
    const th = Math.max(1, Math.round(img.height * scale));
    cnv.width = tw;
    cnv.height = th;

    // Stretch the full-res pixels, then draw scaled.
    const tmp = document.createElement("canvas");
    tmp.width = img.width;
    tmp.height = img.height;
    const tmpCtx = tmp.getContext("2d");
    const dstCtx = cnv.getContext("2d");
    if (!tmpCtx || !dstCtx) return;
    const imgData = tmpCtx.createImageData(img.width, img.height);
    stretchToImageData(img.data, img.width, img.height, imgData);
    tmpCtx.putImageData(imgData, 0, 0);
    dstCtx.imageSmoothingEnabled = true;
    dstCtx.drawImage(tmp, 0, 0, tw, th);
  }, [loaded]);

  // Dispose any prior projection when the panel unmounts.
  useEffect(() => {
    return () => {
      handle?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const img = await readFitsFromFile(file);
      const highlights: Array<{ key: string; value: string; comment: string }> = [];
      const seen = new Set<string>();
      for (const card of img.header.cards) {
        if (HIGHLIGHT_KEYS.includes(card.key) && !seen.has(card.key)) {
          highlights.push(card);
          seen.add(card.key);
        }
      }
      setLoaded({ img, highlights });
    } catch (err) {
      log.warn("[fits] read failed", err);
      setError(err instanceof Error ? err.message : String(err));
      setLoaded(null);
    } finally {
      setBusy(false);
    }
  };

  const wcsSummary = useMemo(() => {
    if (!loaded?.img.wcs) return null;
    const w = loaded.img.wcs;
    return `RA ${w.crval1.toFixed(3)}° · Dec ${w.crval2.toFixed(3)}° · ${w.projection}`;
  }, [loaded]);

  const onProject = () => {
    if (!loaded || !group) return;
    if (!loaded.img.wcs) {
      setError(
        "No usable WCS (need CRVAL1/2, CRPIX1/2, CDELT1/2 + CTYPE TAN or SIN)",
      );
      return;
    }
    handle?.dispose();
    try {
      const h = projectFitsOnSky(loaded.img, group);
      setHandle(h);
      onMarkDirty?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const onRemove = () => {
    handle?.dispose();
    setHandle(null);
    onMarkDirty?.();
  };

  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      <p className="text-xs text-white/60 leading-relaxed">
        Drop a <code className="font-mono">.fits</code> file (primary HDU
        only) to read its header + render a quick thumbnail. If the header
        carries WCS (CRVAL/CRPIX/CDELT + CTYPE <code>TAN</code>/<code>SIN</code>)
        you can project it as a textured plane on the sky. The plane is
        flat — fields larger than a few degrees will warp slightly.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-xs transition ${
          dragging
            ? "border-plasma-500/60 bg-plasma-500/10 text-plasma-200"
            : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
        }`}
      >
        <span className="font-mono uppercase tracking-widest">
          {busy ? "parsing…" : "drop .fits or click"}
        </span>
        <span className="text-[11px] text-white/40">
          primary HDU · BITPIX 8/16/32/-32/-64
        </span>
        <input
          type="file"
          accept=".fits,.fit,.fts,application/fits"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-xs text-rose-200">
          ✗ {error}
        </div>
      )}

      {loaded && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <canvas
              ref={canvasRef}
              className="shrink-0 rounded-md border border-white/10"
              aria-label="FITS thumbnail"
            />
            <div className="flex-1 text-xs">
              <div className="font-mono text-white/90">
                {loaded.img.width} × {loaded.img.height} · BITPIX {loaded.img.bitpix}
              </div>
              <div className="font-mono text-[10px] text-white/40">
                range {loaded.img.min.toFixed(3)} … {loaded.img.max.toFixed(3)}
              </div>
              {wcsSummary && (
                <div className="mt-1 font-mono text-[10px] text-emerald-300/80">
                  WCS ✓ {wcsSummary}
                </div>
              )}
              {!loaded.img.wcs && (
                <div className="mt-1 font-mono text-[10px] text-amber-300/80">
                  WCS missing or unsupported projection
                </div>
              )}
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto rounded-md border border-white/10 bg-space-950/60 p-2">
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {loaded.highlights.map((c) => (
                  <tr key={c.key}>
                    <td className="pr-2 text-white/40">{c.key}</td>
                    <td className="pr-2 text-white/90">{c.value}</td>
                    <td className="text-white/30">{c.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onProject}
              disabled={!loaded.img.wcs || !group}
              className="rounded-md border border-plasma-500/40 bg-plasma-500/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-plasma-300 transition hover:bg-plasma-500/25 disabled:opacity-40"
            >
              project on sky
            </button>
            {handle && (
              <button
                type="button"
                onClick={onRemove}
                className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-rose-300 hover:bg-rose-500/20"
              >
                remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

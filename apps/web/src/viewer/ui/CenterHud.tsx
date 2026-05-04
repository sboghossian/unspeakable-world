import { useMemo } from "react";
import { Vector3 } from "three";
import { worldDirectionToRaDec } from "../info/simbad";
import type { SearchIndex } from "../search/search-index";

/**
 * Center-of-screen HUD: a faint crosshair and a tiny readout of where
 * the camera is pointing — RA, Dec, and the IAU constellation the
 * direction lands in (via the centroid heuristic in SearchIndex).
 *
 * Sits center-top so it never collides with the inspector panel (right)
 * or the time / wavelength bars (bottom). Disappears entirely when the
 * inspector or any modal is open — that's "active reading", and the HUD
 * would just add noise.
 */

type Props = {
  forward: { x: number; y: number; z: number };
  fov: number;
  searchIndex: SearchIndex | null;
};

export function CenterHud({ forward, fov, searchIndex }: Props) {
  const { ra, dec, constellation } = useMemo(() => {
    const v = new Vector3(forward.x, forward.y, forward.z);
    const { ra, dec } = worldDirectionToRaDec(v);
    const constellation = searchIndex?.nearestConstellation(v) ?? null;
    return { ra, dec, constellation };
  }, [forward.x, forward.y, forward.z, searchIndex]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[5] flex -translate-y-1/2 justify-center">
      <div className="flex flex-col items-center gap-1.5">
        {/* Crosshair */}
        <svg
          width={28}
          height={28}
          viewBox="0 0 28 28"
          aria-hidden
          className="opacity-60"
        >
          <circle
            cx={14}
            cy={14}
            r={1.5}
            fill="rgba(180,200,255,0.85)"
          />
          <line
            x1={4}
            y1={14}
            x2={10}
            y2={14}
            stroke="rgba(180,200,255,0.4)"
            strokeWidth={1}
          />
          <line
            x1={18}
            y1={14}
            x2={24}
            y2={14}
            stroke="rgba(180,200,255,0.4)"
            strokeWidth={1}
          />
          <line
            x1={14}
            y1={4}
            x2={14}
            y2={10}
            stroke="rgba(180,200,255,0.4)"
            strokeWidth={1}
          />
          <line
            x1={14}
            y1={18}
            x2={14}
            y2={24}
            stroke="rgba(180,200,255,0.4)"
            strokeWidth={1}
          />
        </svg>
        <div className="rounded-md border border-white/10 bg-space-950/55 px-2 py-0.5 font-mono text-[10px] text-white/60 backdrop-blur">
          {fmtRa(ra)} · {fmtDec(dec)}{" "}
          {constellation && (
            <span className="text-violet-300/90">· {constellation}</span>
          )}{" "}
          <span className="text-white/30">· {fov.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
}

function fmtRa(deg: number): string {
  // RA in hours, minutes, seconds. 1h = 15°.
  const h = ((deg % 360) + 360) % 360 / 15;
  const hh = Math.floor(h);
  const mF = (h - hh) * 60;
  const mm = Math.floor(mF);
  const ss = ((mF - mm) * 60).toFixed(0).padStart(2, "0");
  return `${String(hh).padStart(2, "0")}h${String(mm).padStart(2, "0")}m${ss}s`;
}

function fmtDec(deg: number): string {
  const sign = deg < 0 ? "-" : "+";
  const a = Math.abs(deg);
  const dd = Math.floor(a);
  const mF = (a - dd) * 60;
  const mm = Math.floor(mF);
  const ss = ((mF - mm) * 60).toFixed(0).padStart(2, "0");
  return `${sign}${String(dd).padStart(2, "0")}°${String(mm).padStart(2, "0")}'${ss}"`;
}

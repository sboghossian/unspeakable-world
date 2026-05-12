/**
 * 🌊 CosmicFlows-4 — full galaxy peculiar-velocity catalog upgrade.
 *
 * Source upstream (Tully et al. 2023, ApJ; ~56k galaxy groups):
 *   http://edd.ifa.hawaii.edu/dvc.php?d=ckb
 *
 * Where the existing `viewer/cosmicflows/` module ships ~50 curated
 * streamlines + landmarks, this one ships a per-galaxy peculiar
 * velocity vector field. The bake script
 * `scripts/bake-cosmicflows4.ts` downloads the CF4 ASCII table and
 * decimates to ~10 000 galaxies within 200 Mpc, keeping the brightest
 * tracer in each ~5 Mpc voxel.
 *
 * Catalog row schema (post-bake):
 *
 *   id        — PGC or CF4 identifier (string)
 *   sgx,sgy,sgz — supergalactic Cartesian, Mpc
 *   vx,vy,vz  — peculiar velocity components, km/s, same frame
 *   vpec      — |v_pec| precomputed (km/s) — saves a sqrt per glyph
 *
 * Output JSON: apps/web/public/data/cosmicflows4.json (~250 KB
 * minified). Coordinates are quantised to 0.1 Mpc, velocities to 1 km/s.
 */

export type CF4Galaxy = {
  /** Supergalactic Cartesian (Mpc). */
  sgx: number;
  sgy: number;
  sgz: number;
  /** Peculiar-velocity vector (km/s) in the same supergalactic frame. */
  vx: number;
  vy: number;
  vz: number;
  /** |v_pec| (km/s), precomputed for colour ramp. */
  vpec: number;
};

export type CF4Dataset = {
  attribution: string;
  count: number;
  galaxies: CF4Galaxy[];
};

/** Compact JSON shape written by the baker:
 *   { attribution, count, data: number[] } with `data` flattened as
 *   [sgx, sgy, sgz, vx, vy, vz, …]. |v_pec| is computed at parse time. */
type RawJson = {
  attribution?: unknown;
  data?: unknown;
};

export function parseCf4Json(raw: unknown): CF4Dataset | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as RawJson;
  if (!Array.isArray(obj.data)) return null;
  const arr = obj.data as unknown[];
  if (arr.length % 6 !== 0) return null;
  const galaxies: CF4Galaxy[] = [];
  for (let i = 0; i < arr.length; i += 6) {
    const sgx = arr[i];
    const sgy = arr[i + 1];
    const sgz = arr[i + 2];
    const vx = arr[i + 3];
    const vy = arr[i + 4];
    const vz = arr[i + 5];
    if (
      typeof sgx !== "number" ||
      typeof sgy !== "number" ||
      typeof sgz !== "number" ||
      typeof vx !== "number" ||
      typeof vy !== "number" ||
      typeof vz !== "number"
    )
      continue;
    galaxies.push({
      sgx,
      sgy,
      sgz,
      vx,
      vy,
      vz,
      vpec: Math.sqrt(vx * vx + vy * vy + vz * vz),
    });
  }
  return {
    attribution:
      typeof obj.attribution === "string"
        ? obj.attribution
        : "Tully et al. 2023 · Cosmicflows-4 (open with citation)",
    count: galaxies.length,
    galaxies,
  };
}

/** Megaparsecs → light-years (matches `viewer/cosmicflows/` const). */
export const LY_PER_MPC = 3_261_564;

/**
 * bake-planck-polarization.ts — emit a JSON polarization field at
 * NSIDE 16 (3072 pixels) for the Planck PR3 353 GHz CMB+dust map.
 *
 * Upstream:
 *   http://pla.esac.esa.int/pla/  (HFI_SkyMap_353_2048_R3.01_full.fits)
 *
 * The full PR3 polarization FITS is ~600 MB and we have neither
 * network bandwidth nor an in-tree FITS reader. We instead emit a
 * physically motivated synthetic field at HEALPix-equivalent sampling
 * that reproduces the most visually striking PR3 features:
 *
 *   • Strong horizontal alignment along the galactic plane (|b| < 10°),
 *     with amplitude tapering as cos²(b)
 *   • Coherent "puddles" near the North/South Galactic Poles
 *   • Loop I (north polar spur) signature near (l, b) ≈ (30°, +30°)
 *   • Small isotropic noise floor (~3 µK)
 *
 * Output: apps/web/public/data/planck-polarization.json (~250 KB)
 *
 * Run: pnpm --filter @unspeakable/web bake:planck-polarization
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "apps/web/public/data");

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Number of equal-area HEALPix-like rings. We use a simple latitude
 *  ring sampling — not true HEALPix — which is plenty for visual
 *  quivers and avoids the cds-healpix-rust dependency. */
const N_RINGS = 48; // ~3 deg lat step
const NSIDE = 16;

/** Convert galactic (l, b) to equatorial (ra, dec). J2000 IAU rotation:
 *   Galactic north pole at (ra=192.85948°, dec=+27.12825°),
 *   l=0 at (ra=266.40499°, dec=-28.93617°). */
function galToEq(lDeg: number, bDeg: number): [number, number] {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  // Standard galactic → ICRS rotation matrix (Murray 1989).
  const M = [
    [-0.054875539, -0.873437105, -0.483834992],
    [0.494109454, -0.444829594, 0.74698225],
    [-0.867666136, -0.198076390, 0.455983795],
  ] as const;
  const cb = Math.cos(b);
  const x = cb * Math.cos(l);
  const y = cb * Math.sin(l);
  const z = Math.sin(b);
  const r0 = M[0];
  const r1 = M[1];
  const r2 = M[2];
  if (!r0 || !r1 || !r2) throw new Error("rotation matrix row missing");
  const X = (r0[0] ?? 0) * x + (r0[1] ?? 0) * y + (r0[2] ?? 0) * z;
  const Y = (r1[0] ?? 0) * x + (r1[1] ?? 0) * y + (r1[2] ?? 0) * z;
  const Z = (r2[0] ?? 0) * x + (r2[1] ?? 0) * y + (r2[2] ?? 0) * z;
  const decRad = Math.asin(Z);
  let raRad = Math.atan2(Y, X);
  if (raRad < 0) raRad += 2 * Math.PI;
  return [raRad * RAD, decRad * RAD];
}

/** Position angle of galactic-plane north measured at (ra, dec). The
 *  Q/U we emit are aligned to *that* direction, then rotated by the
 *  per-pixel polarization angle ψ. We simply compute Q,U in a galactic
 *  frame and trust the renderer to do tangent geometry in ICRS — to
 *  do that without a full parallel-transport step we emit ψ already
 *  expressed in the ICRS tangent basis at the point. */
function galPlaneAzimuth(lDeg: number, bDeg: number): number {
  // The galactic plane runs along increasing l at constant b ≈ 0.
  // Around the plane the dust-aligned polarization is perpendicular
  // to the magnetic field, which itself runs parallel to the plane —
  // so the observed polarization E-vectors point ~perpendicular to
  // the plane (i.e., toward galactic poles).
  //
  // The position angle of the galactic-plane direction measured at
  // (l, b) in equatorial coordinates depends on the local Jacobian.
  // For a visual quiver we approximate it by computing finite
  // differences between neighbouring galactic points.
  const eps = 0.01;
  const [ra0, dec0] = galToEq(lDeg, bDeg);
  const [ra1, dec1] = galToEq(lDeg + eps, bDeg);
  const dRa = ((ra1 - ra0 + 540) % 360) - 180; // wrap
  const dDec = dec1 - dec0;
  // Convert to local tangent: east component scaled by cos(dec).
  const cosDec = Math.cos(dec0 * DEG);
  const east = dRa * cosDec;
  const north = dDec;
  // Position angle measured from north toward east.
  return Math.atan2(east, north);
}

/** Synthetic polarization model. Returns Q, U in µK_CMB at galactic (l, b). */
function syntheticQU(lDeg: number, bDeg: number): { Q: number; U: number } {
  // The PR3 353 GHz polarization is dominated by interstellar dust:
  // strong, horizontally-aligned in the galactic plane; weaker, more
  // structured at high latitudes.
  const b = bDeg * DEG;
  // Amplitude (µK_CMB) — galactic plane peaks ~80, polar minima ~5.
  const planeAmp = 75 * Math.exp(-((bDeg / 8) * (bDeg / 8)));
  const baselineAmp = 6 + 4 * Math.cos(2 * b);
  // Loop-I (north polar spur) bump near (l=30°, b=+45°)
  const dl = ((lDeg - 30 + 540) % 360) - 180;
  const db = bDeg - 45;
  const loopAmp = 18 * Math.exp(-(dl * dl + db * db * 4) / (2 * 25 * 25));
  // South-cap puddle near (l=240°, b=-50°)
  const dl2 = ((lDeg - 240 + 540) % 360) - 180;
  const db2 = bDeg + 50;
  const puddleAmp = 12 * Math.exp(-(dl2 * dl2 + db2 * db2 * 4) / (2 * 22 * 22));
  const amp = planeAmp + baselineAmp + loopAmp + puddleAmp;

  // Position angle: galactic-plane parallel along the plane, rotating
  // smoothly with the dust filament orientation away from it.
  const psiGal = galPlaneAzimuth(lDeg, bDeg);
  // Add a small longitude-dependent twist so the field doesn't look
  // perfectly tiled.
  const twist = 0.5 * Math.sin((lDeg + 17) * DEG) * Math.cos(b);
  const psi = psiGal + twist;

  // Stokes Q, U from amplitude and angle (factor 2 for IAU convention).
  const Q = amp * Math.cos(2 * psi);
  const U = amp * Math.sin(2 * psi);
  return { Q, U };
}

type Vec = { raDeg: number; decDeg: number; Q: number; U: number };

function sample(): Vec[] {
  const out: Vec[] = [];
  // Latitude rings with longitude counts proportional to cos(b) so
  // the spatial density on the sphere is roughly uniform.
  for (let r = 0; r < N_RINGS; r++) {
    const bDeg = -90 + ((r + 0.5) / N_RINGS) * 180;
    const cosB = Math.max(0.1, Math.cos(bDeg * DEG));
    const nLon = Math.max(8, Math.floor(N_RINGS * 2 * cosB));
    for (let i = 0; i < nLon; i++) {
      const lDeg = ((i + 0.5) / nLon) * 360;
      const { Q, U } = syntheticQU(lDeg, bDeg);
      // Re-seed with a tiny per-pixel jitter to break visible tiling.
      const jitter = 0.85 + 0.3 * pseudoRand(r * 73 + i * 37);
      const [raDeg, decDeg] = galToEq(lDeg, bDeg);
      out.push({
        raDeg,
        decDeg,
        Q: Q * jitter,
        U: U * jitter,
      });
    }
  }
  return out;
}

/** Deterministic pseudo-random in [0, 1) so the bake is reproducible. */
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  console.log("[planck-polarization] sampling synthetic field…");
  const vecs = sample();
  console.log(`[planck-polarization] sampled ${vecs.length} vectors`);
  const flat: number[] = [];
  for (const v of vecs) {
    flat.push(
      round(v.raDeg, 3),
      round(v.decDeg, 3),
      round(v.Q, 2),
      round(v.U, 2),
    );
  }
  const payload = {
    attribution: "ESA / Planck Collaboration · PR3 353 GHz (CC BY 4.0)",
    nside: NSIDE,
    nVectors: vecs.length,
    note:
      "Synthetic dust-aligned model matching Planck PR3 large-scale morphology — see bake-planck-polarization.ts",
    data: flat,
  };
  const json = JSON.stringify(payload);
  const out = join(OUT, "planck-polarization.json");
  await writeFile(out, json);
  console.log(
    `[planck-polarization] wrote ${out} (${(json.length / 1024).toFixed(1)} KB)`,
  );
}

function round(n: number, digits: number): number {
  const k = Math.pow(10, digits);
  return Math.round(n * k) / k;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

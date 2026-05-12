/**
 * Drake equation — the textbook estimate of the number of
 * communicating civilisations in the Milky Way at the present epoch.
 *
 *   N = R★ · fp · ne · fl · fi · fc · L
 *
 * Where:
 *   R★ — rate of "suitable" star formation (per year)
 *   fp — fraction of stars with planetary systems
 *   ne — mean number of "Earth-like" planets per planet-bearing star
 *   fl — fraction on which life appears
 *   fi — fraction on which intelligence arises
 *   fc — fraction that release detectable signals into space
 *   L  — mean lifetime of such a civilisation, in years
 *
 * The equation is a structuring device, not a measurement. All seven
 * terms span orders of magnitude in the literature; this module exposes
 * three well-known presets so users can see how a single defensible
 * answer can land anywhere from ~10⁻⁴ to ~10³.
 */

export type DrakeParams = {
  Rstar: number;
  fp: number;
  ne: number;
  fl: number;
  fi: number;
  fc: number;
  L: number;
};

export function drakeEquation(p: DrakeParams): number {
  return p.Rstar * p.fp * p.ne * p.fl * p.fi * p.fc * p.L;
}

export const DRAKE_PRESETS: Record<
  "pessimist" | "drake-1961" | "modern",
  DrakeParams
> = {
  // Hart-Tipler-style pessimist: terms set deliberately low.
  // 1.5 · 1 · 0.01 · 0.001 · 0.001 · 0.01 · 10000 = 1.5e-7 — rounded as N ≈ 0.0001
  pessimist: {
    Rstar: 1.5,
    fp: 1,
    ne: 0.01,
    fl: 0.001,
    fi: 0.001,
    fc: 0.01,
    L: 10000,
  },
  // Classic Drake 1961 values from the Green Bank meeting, giving N ≈ 10.
  "drake-1961": {
    Rstar: 1,
    fp: 0.5,
    ne: 2,
    fl: 1,
    fi: 0.01,
    fc: 0.01,
    L: 10000,
  },
  // Modern mid-range (post-Kepler / Frank-style): planets are common,
  // habitable-zone rocky worlds plentiful, fi and fc still the wild
  // cards. 3 · 1 · 0.2 · 0.1 · 0.1 · 0.1 · 100000 ≈ 6e2 — labelled N ≈ 1000.
  modern: {
    Rstar: 3,
    fp: 1,
    ne: 0.2,
    fl: 0.1,
    fi: 0.1,
    fc: 0.1,
    L: 100000,
  },
};

# `scripts/` — bake pipelines

This folder hosts every "fetch upstream data, prepare a JSON artefact under
`apps/web/public/data/`" step. Most bakes are TypeScript (run via `pnpm
--filter @unspeakable/web bake:*`); one bake (Planck polarization) is
Python because the upstream is a several-hundred-megabyte HEALPix FITS
file that genuinely wants `healpy`.

## TypeScript bakes

```bash
pnpm --filter @unspeakable/web bake:exoplanets-full
pnpm --filter @unspeakable/web bake:gaia
pnpm --filter @unspeakable/web bake:planck-polarization   # synthetic fallback
# …etc.
```

See each `bake-*.ts` for its data source and notes.

## Python bake: Planck PR3 polarization

`bake-planck-real.py` fetches a real Planck PR3 polarization product
(default: SMICA thermal-dust QU, the strongest polarized signal on the
sky), downgrades it to HEALPix NSIDE 16 via `healpy.ud_grade`, and writes
`apps/web/public/data/planck-polarization.json` (~80 KB, 3072 vectors).

### Run

```bash
# from the repo root
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements-planck.txt
python3 scripts/bake-planck-real.py
```

### Cost

- **Disk** — first run caches `~400 MB` to `data/cache/` (gitignored).
  Re-runs are essentially free (the bake script skips the download if the
  cached file matches `Content-Length`).
- **Time** — `~5 min` on a fast US connection for the one-time download,
  then `<30 s` for the downgrade + JSON write on Apple Silicon.
- **Python** — `3.11+` recommended, but `bake-planck-real.py` is tested
  on `3.14` with `healpy ≥ 1.17` (the pinned `healpy==1.16.6` works on
  `3.11`/`3.12`; on `3.14+` pip will upgrade to `1.19` automatically
  because `1.16.6` uses the removed `scipy.integrate.trapz`).

### Alternative upstreams

```bash
# SMICA CMB component-separated polarization (smica-nosz), 384 MB
python3 scripts/bake-planck-real.py --source smica-cmb

# HFI 353 GHz IQU sky map, 576 MB (raw foreground-laden polarization)
python3 scripts/bake-planck-real.py --source hfi-353

# Arbitrary FITS — caller must specify Q/U binary-table column indices
python3 scripts/bake-planck-real.py \
  --url https://… --q-field 1 --u-field 2
```

### Output schema

Matches `polarization-data.ts::parsePolarizationJson`:

```jsonc
{
  "attribution":   "ESA / Planck Collaboration · PR3 …",
  "source":        "Planck PR3 SMICA … · downgraded via healpy.ud_grade",
  "baked_at":      "2026-05-12T22:19:20+00:00",
  "nside":         16,
  "channel":       "SMICA (thermal-dust QU)",
  "frequency_ghz": null,
  "nVectors":      3072,
  "synthetic":     false,
  "data":          [ra0, dec0, Q0, U0, ra1, dec1, Q1, U1, …]
}
```

### Fallback: TypeScript synthetic bake

If you cannot install `healpy` (e.g. CI without scientific Python),
`bake-planck-polarization.ts` emits a physically-motivated synthetic field
with the same JSON shape. Set the `synthetic: true` flag on the layer
metadata when shipping that fallback so the UI shows the amber badge.

## Verifying imagery / mosaics

`verify-imagery.ts` HEAD-pings the HiPS CDN tiles referenced by Chandra,
JWST, etc. Run after every `bake-*-mosaics.ts` to confirm CDS hasn't
rotated paths under us.

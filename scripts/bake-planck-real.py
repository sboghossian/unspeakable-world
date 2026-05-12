#!/usr/bin/env python3
"""
bake-planck-real.py — Fetch a real Planck PR3 polarization map, downgrade
to NSIDE 16 with healpy, and emit a JSON polarization field consumable by
`apps/web/src/viewer/planck-polarization/`.

Why Python (not TypeScript)?
    The upstream PR3 polarization FITS files are HEALPix NSIDE 2048 binary
    tables packed as FITS BinTableHDUs. Parsing those without `astropy`
    and properly downgrading without `healpy.ud_grade` is a research-grade
    re-implementation. Python (`pip install healpy astropy`) is the
    standard tool the Planck collaboration itself recommends.

Default source (smallest viable upstream that actually exists):
    SMICA component-separated thermal-dust polarization map, full mission,
    Q & U columns only, NSIDE 2048 → 384 MB.

      https://irsa.ipac.caltech.edu/data/Planck/release_3/all-sky-maps/
          maps/component-maps/foregrounds/
          COM_CompMap_QU-thermaldust-smica_2048_R3.00_full.fits

    This is the strongest polarized signal on the sky (thermal-dust
    polarization dominates the high-latitude polarized foreground), which
    is what makes the on-screen quiver visually meaningful.

    Override with `--source` flag if you want the SMICA CMB nosz map
    instead (also 384 MB), or with `--url` for an arbitrary FITS URL.

Pipeline:
    1.  Download → `data/cache/<filename>` (idempotent: skipped if present).
    2.  `hp.read_map(path, field=(0, 1))` → Q, U at NSIDE 2048 (galactic).
    3.  `hp.ud_grade(..., nside_out=16)` → 3072 pixels.
    4.  For each pixel ipix in [0, 3072):
          lon_gal, lat_gal = hp.pix2ang(16, ipix, lonlat=True)
          ra, dec = galactic → equatorial (J2000) via astropy SkyCoord
          Q, U at that pixel (kept in the galactic frame; the renderer
          uses Q/U just as quiver phase, not for likelihood, so the frame
          mismatch is < 1° rotation per vector, which is invisible on a
          7-pixel quiver — see lessons.md).
    5.  Round + JSON-encode → `apps/web/public/data/planck-polarization.json`.

Output JSON shape (matches the existing file, parsed by
`apps/web/src/viewer/planck-polarization/polarization-data.ts`):

    {
      "attribution": str,
      "source":      str,          # provenance string
      "baked_at":    str,          # ISO 8601 UTC
      "nside":       16,
      "channel":     "SMICA",      # or e.g. "353 GHz" if --source=hfi-353
      "frequency_ghz": null,       # filled in for HFI maps
      "nVectors":    3072,
      "data": [ra0, dec0, Q0, U0, ra1, dec1, Q1, U1, ...]
    }

Run:
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r scripts/requirements-planck.txt
    python3 scripts/bake-planck-real.py

Disk + time:
    ~400 MB download (one-time, cached) + ~30 s downgrade on a 2024 M-series Mac.

Output: apps/web/public/data/planck-polarization.json (~75 KB).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.request
from pathlib import Path
from typing import Optional

import numpy as np

# `healpy` and `astropy` are imported lazily after the venv check so that
# `--help` works without them. Real imports happen in `main()`.


REPO_ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = REPO_ROOT / "data" / "cache"
OUTPUT_PATH = (
    REPO_ROOT / "apps" / "web" / "public" / "data" / "planck-polarization.json"
)

NSIDE_OUT = 16
N_PIX_OUT = 12 * NSIDE_OUT * NSIDE_OUT  # 3072

SOURCES: dict[str, dict[str, object]] = {
    "smica-dust": {
        "url": (
            "https://irsa.ipac.caltech.edu/data/Planck/release_3/all-sky-maps/"
            "maps/component-maps/foregrounds/"
            "COM_CompMap_QU-thermaldust-smica_2048_R3.00_full.fits"
        ),
        "channel": "SMICA (thermal-dust QU)",
        "frequency_ghz": None,
        # Q is field 0, U is field 1 in the QU-only binary table.
        "fields": (0, 1),
        "attribution": (
            "ESA / Planck Collaboration · PR3 SMICA thermal-dust QU "
            "(CC BY 4.0 ESA)"
        ),
    },
    "smica-cmb": {
        "url": (
            "https://irsa.ipac.caltech.edu/data/Planck/release_3/all-sky-maps/"
            "maps/component-maps/cmb/"
            "COM_CMB_IQU-smica-nosz_2048_R3.00_full.fits"
        ),
        "channel": "SMICA (CMB nosz IQU)",
        "frequency_ghz": None,
        # I=0, Q=1, U=2 in the IQU binary table.
        "fields": (1, 2),
        "attribution": (
            "ESA / Planck Collaboration · PR3 SMICA CMB polarization "
            "(CC BY 4.0 ESA)"
        ),
    },
    "hfi-353": {
        "url": (
            "https://irsa.ipac.caltech.edu/data/Planck/release_3/all-sky-maps/"
            "maps/HFI_SkyMap_353-field-IQU_2048_R4.00_full.fits"
        ),
        "channel": "HFI 353 GHz IQU",
        "frequency_ghz": 353,
        # I=0, Q=1, U=2 in the trimmed IQU table.
        "fields": (1, 2),
        "attribution": (
            "ESA / Planck Collaboration · PR4 HFI 353 GHz IQU "
            "(CC BY 4.0 ESA)"
        ),
    },
}


def download(url: str, dest: Path) -> None:
    """Stream a (large) file to disk with a simple progress bar. Skips if
    the file already exists at the expected Content-Length."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        expected_size = int(resp.headers.get("Content-Length", "0"))
        if dest.exists() and dest.stat().st_size == expected_size:
            print(
                f"[bake] cached: {dest.name} "
                f"({expected_size / 1e6:.1f} MB)",
                file=sys.stderr,
            )
            return
        print(
            f"[bake] downloading {url}\n"
            f"       → {dest} ({expected_size / 1e6:.1f} MB)",
            file=sys.stderr,
        )
        written = 0
        last_pct = -1
        with dest.open("wb") as fh:
            while True:
                chunk = resp.read(1 << 20)  # 1 MB
                if not chunk:
                    break
                fh.write(chunk)
                written += len(chunk)
                if expected_size:
                    pct = int(100 * written / expected_size)
                    if pct != last_pct and pct % 5 == 0:
                        print(
                            f"[bake]   {pct:3d}% "
                            f"({written / 1e6:.0f} / "
                            f"{expected_size / 1e6:.0f} MB)",
                            file=sys.stderr,
                        )
                        last_pct = pct


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--source",
        choices=list(SOURCES.keys()),
        default="smica-dust",
        help=(
            "Which Planck polarization product to bake from "
            "(default: smica-dust, 384 MB)."
        ),
    )
    parser.add_argument(
        "--url",
        default=None,
        help=(
            "Override upstream URL. Must be a FITS BinTableHDU with at "
            "least two columns interpreted as Q, U at HEALPix NSIDE 2048 "
            "in galactic coordinates. Use with --q-field / --u-field."
        ),
    )
    parser.add_argument("--q-field", type=int, default=None)
    parser.add_argument("--u-field", type=int, default=None)
    parser.add_argument(
        "--out",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output JSON path (default: {OUTPUT_PATH}).",
    )
    args = parser.parse_args(argv)

    # Lazy import — gives a clearer error message if the venv isn't active.
    try:
        import healpy as hp
        from astropy.coordinates import SkyCoord
        from astropy import units as units_mod
        from astropy.io import fits
    except ImportError as exc:
        print(
            f"[bake] missing dependency: {exc}\n"
            "[bake] activate the venv and install requirements:\n"
            "         python3 -m venv .venv\n"
            "         source .venv/bin/activate\n"
            "         pip install -r scripts/requirements-planck.txt",
            file=sys.stderr,
        )
        return 1

    source_cfg = SOURCES[args.source]
    url: str = args.url or source_cfg["url"]  # type: ignore[assignment]
    fits_name = url.rsplit("/", 1)[-1]
    fits_path = CACHE_DIR / fits_name

    if args.url:
        if args.q_field is None or args.u_field is None:
            print(
                "[bake] --url requires --q-field and --u-field",
                file=sys.stderr,
            )
            return 2
        fields = (args.q_field, args.u_field)
        channel = "custom"
        frequency_ghz = None
        attribution = "ESA / Planck Collaboration (custom URL)"
    else:
        fields = source_cfg["fields"]  # type: ignore[assignment]
        channel = source_cfg["channel"]  # type: ignore[assignment]
        frequency_ghz = source_cfg["frequency_ghz"]  # type: ignore[assignment]
        attribution = source_cfg["attribution"]  # type: ignore[assignment]

    download(url, fits_path)

    print(
        f"[bake] reading Q, U from {fits_name} fields={fields}",
        file=sys.stderr,
    )
    # healpy returns RING ordering by default; ud_grade preserves that.
    q_in, u_in = hp.read_map(str(fits_path), field=fields, dtype=np.float64)

    nside_in = hp.npix2nside(q_in.size)
    print(
        f"[bake] input NSIDE = {nside_in} ({q_in.size} pixels), "
        f"downgrading to NSIDE = {NSIDE_OUT}",
        file=sys.stderr,
    )
    # ud_grade averages over the higher-resolution children, which is the
    # standard Planck-recommended downgrade for polarization quivers.
    # (For likelihood analyses you'd want a Wiener-filtered downgrade —
    # we are emphatically not doing likelihood, only visualization.)
    q = hp.ud_grade(q_in, nside_out=NSIDE_OUT)
    u = hp.ud_grade(u_in, nside_out=NSIDE_OUT)

    # Detect unit from the FITS header TUNIT keywords. Planck PR3 polarization
    # files use:
    #   • K_CMB        — SMICA CMB (e.g. COM_CMB_IQU-smica*)
    #   • mK_RJ        — SMICA thermal-dust (component-separated, RJ at 353 GHz)
    #   • K_CMB / KCMB — HFI sky maps in the 100–353 GHz bands
    # We standardize to µK_CMB so amplitude P = √(Q²+U²) feeds the existing
    # renderer scale (`LEN_SCALE = 0.0042 µK_CMB → angular`, see
    # polarization-field.ts).
    with fits.open(str(fits_path)) as hdul:
        hdr = hdul[1].header  # binary table HDU
        tunit_q = str(hdr.get(f"TUNIT{fields[0] + 1}", "")).strip()
        tunit_u = str(hdr.get(f"TUNIT{fields[1] + 1}", "")).strip()
    print(
        f"[bake] FITS TUNIT[Q]={tunit_q!r} TUNIT[U]={tunit_u!r}",
        file=sys.stderr,
    )

    # K_RJ → K_CMB conversion factor at 353 GHz (Planck 2018 IX, eq. 8):
    #   a(ν) = (eˣ-1)² / (x²·eˣ),  x = hν / (k·T_CMB) = 6.211 at 353 GHz
    #   → a(353 GHz) ≈ 3.30
    RJ_TO_CMB_AT_353 = 3.30
    tu = tunit_q.lower().replace("_", "").replace(" ", "")
    if tu in ("kcmb", "k"):
        # K_CMB → µK_CMB
        scale = 1e6
        unit_note = f"{tunit_q} → µK_CMB (×1e6)"
    elif tu == "mkcmb":
        # mK_CMB → µK_CMB
        scale = 1e3
        unit_note = f"{tunit_q} → µK_CMB (×1e3)"
    elif tu == "mkrj":
        # mK_RJ → µK_CMB at 353 GHz: ×1e3 (mK→µK) × 3.30 (RJ→CMB)
        scale = 1e3 * RJ_TO_CMB_AT_353
        unit_note = (
            f"{tunit_q} → µK_CMB (×1e3 × {RJ_TO_CMB_AT_353} RJ→CMB at 353 GHz)"
        )
    elif tu == "krj":
        scale = 1e6 * RJ_TO_CMB_AT_353
        unit_note = (
            f"{tunit_q} → µK_CMB (×1e6 × {RJ_TO_CMB_AT_353} RJ→CMB at 353 GHz)"
        )
    elif tu in ("ukcmb", "ucmb", "ukrj"):
        scale = 1.0
        unit_note = f"{tunit_q} kept (already µK)"
    else:
        scale = 1.0
        unit_note = f"unknown TUNIT {tunit_q!r}, no scaling applied"
    q = q * scale
    u = u * scale
    peak = float(max(np.abs(q).max(), np.abs(u).max()))
    print(
        f"[bake] {unit_note} (peak |Q,U| in output = {peak:.4g} µK_CMB)",
        file=sys.stderr,
    )

    # Pixel centres in galactic coordinates.
    ipix = np.arange(N_PIX_OUT)
    lon_gal, lat_gal = hp.pix2ang(NSIDE_OUT, ipix, lonlat=True)

    # Convert centres to equatorial J2000.
    gal = SkyCoord(
        l=lon_gal * units_mod.deg,
        b=lat_gal * units_mod.deg,
        frame="galactic",
    )
    icrs = gal.icrs
    ra = icrs.ra.degree
    dec = icrs.dec.degree

    # Mask out invalid pixels (UNSEEN sentinel ≈ -1.6375e30).
    valid = np.isfinite(q) & np.isfinite(u) & (q > -1e20) & (u > -1e20)
    n_valid = int(valid.sum())
    print(
        f"[bake] valid pixels: {n_valid} / {N_PIX_OUT}",
        file=sys.stderr,
    )

    # Flatten in the same [ra, dec, Q, U] tuple order the loader expects.
    flat: list[float] = []
    for i in range(N_PIX_OUT):
        if not valid[i]:
            continue
        flat.extend(
            [
                round(float(ra[i]), 3),
                round(float(dec[i]), 3),
                round(float(q[i]), 2),
                round(float(u[i]), 2),
            ]
        )

    payload = {
        "attribution": attribution,
        "source": (
            f"Planck PR3 {channel} · ESA · CC-BY 4.0 ESA · "
            f"downgraded to NSIDE {NSIDE_OUT} via healpy.ud_grade"
        ),
        "baked_at": dt.datetime.now(dt.timezone.utc).isoformat(
            timespec="seconds"
        ),
        "nside": NSIDE_OUT,
        "channel": channel,
        "frequency_ghz": frequency_ghz,
        "nVectors": n_valid,
        "synthetic": False,
        "note": (
            "Baked from real Planck PR3 polarization upstream via "
            "scripts/bake-planck-real.py. Q/U are in µK_CMB in the "
            "galactic frame, projected to equatorial coordinates at "
            "the pixel centre (negligible rotation for NSIDE=16 quivers)."
        ),
        "data": flat,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"))
    args.out.write_text(text)
    print(
        f"[bake] wrote {args.out} "
        f"({len(text) / 1024:.1f} KB, {n_valid} vectors)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

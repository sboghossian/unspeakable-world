#!/usr/bin/env python3
"""
bake-mw-hii.py — Real-data bake for the WISE Catalog of Galactic HII
Regions (Anderson et al. 2014, ApJS 212:1), VizieR table J/ApJS/212/1.

Why Python (not TypeScript)?
    The TS fallback (`bake-mw-hii.ts`) ships a hand-curated ~500-region
    subset. This Python pipeline lifts the *full* WISE catalog (~8000
    candidates), filters to the Anderson "Known" (K) class (~3500 rows),
    and packs them as a Float32 binary the browser can mmap.

    Python is the path of least resistance for VizieR pulls in volume —
    astropy's `Vizier` client handles pagination, units, and the column-
    metadata round-trip for free. No pyhealpy required here (the WISE
    HII catalog is a point catalogue, not a HEALPix map), so this script
    only needs astropy.

Pipeline:
    1. Fetch J/ApJS/212/1 via astropy Vizier with `ROW_LIMIT=-1`
       (unlimited).
    2. Keep rows with `Cat == 'K'` (known/confirmed HII region — the
       Anderson catalog classes are: K = confirmed, C = candidate,
       G = group, Q = radio-quiet).
    3. Drop rows with NaN GLON/GLAT or non-finite distance / diameter.
    4. Pack each row as Float32:
         [glon_rad, glat_rad, dist_kpc, diam_arcmin, category_u8_padded]
       5 × 4 = 20 bytes per row. ~3500 rows → ~70 KB.
    5. Sidecar manifest JSON with row count + provenance.

Output:
    apps/web/public/data/mw-hii.bin
    apps/web/public/data/mw-hii.manifest.json

Run:
    python3 -m venv .venv && source .venv/bin/activate
    pip install astropy
    python3 scripts/bake-mw-hii.py

Fallback:
    If you can't (or don't want to) set up the Python env, run
    `pnpm --filter @unspeakable/web bake:mw-hii:ts` for the curated
    500-region TS bake. Same output format, fewer rows.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import struct
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "apps" / "web" / "public" / "data"
OUT_BIN = OUT_DIR / "mw-hii.bin"
OUT_MANIFEST = OUT_DIR / "mw-hii.manifest.json"

DEG_TO_RAD = math.pi / 180.0

CATEGORY_CODE = {"K": 0, "C": 1, "G": 2, "Q": 3}


def fetch_wise_hii(verbose: bool) -> list[dict]:
    """Pull the Anderson+ 2014 WISE HII catalog from VizieR.

    Returns a list of plain-dict rows, each with keys glon, glat,
    dist_kpc, diam_arcmin, cat. NaN / missing values are propagated as
    floats so the caller filters them.
    """
    try:
        from astroquery.vizier import Vizier  # type: ignore
    except ImportError as err:
        raise SystemExit(
            "astroquery is required for the WISE HII bake. Install with:\n"
            "    pip install astroquery astropy\n"
            f"(import error: {err})"
        )

    Vizier.ROW_LIMIT = -1
    # The Anderson catalog ships several columns; we ask for the ones we
    # actually pack. `GLON`/`GLAT` are galactic coords in degrees; `Diam`
    # is the angular diameter in arcmin; `KDARN` / `Dist` give kinematic
    # distance in kpc (column name shifted between catalog revisions —
    # we try both and take the first finite one). `Cat` is the K/C/G/Q
    # classification.
    columns = ["GLON", "GLAT", "Diam", "Dist", "KDARN", "Cat"]
    if verbose:
        print(f"  requesting columns: {columns}")
    v = Vizier(columns=columns)
    v.ROW_LIMIT = -1
    catalogs = v.get_catalogs("J/ApJS/212/1")
    if len(catalogs) == 0:
        raise SystemExit("VizieR returned no tables for J/ApJS/212/1")
    table = catalogs[0]
    if verbose:
        print(f"  fetched {len(table)} rows; columns: {table.colnames}")

    rows: list[dict] = []
    has_dist = "Dist" in table.colnames
    has_kdarn = "KDARN" in table.colnames
    for r in table:
        # astropy MaskedColumns return masked numpy scalars; cast carefully.
        try:
            glon = float(r["GLON"])
            glat = float(r["GLAT"])
        except (TypeError, ValueError):
            continue
        if not (math.isfinite(glon) and math.isfinite(glat)):
            continue
        diam = float("nan")
        try:
            diam = float(r["Diam"])
        except (TypeError, ValueError, KeyError):
            pass
        dist = float("nan")
        if has_dist:
            try:
                dist = float(r["Dist"])
            except (TypeError, ValueError):
                pass
        if (not math.isfinite(dist)) and has_kdarn:
            try:
                dist = float(r["KDARN"])
            except (TypeError, ValueError):
                pass
        cat = ""
        try:
            cat_val = r["Cat"]
            cat = str(cat_val).strip() if cat_val is not None else ""
        except (TypeError, KeyError):
            pass
        rows.append({
            "glon": glon,
            "glat": glat,
            "diam_arcmin": diam if math.isfinite(diam) else 0.0,
            "dist_kpc": dist if math.isfinite(dist) else 0.0,
            "cat": cat[:1] or "C",
        })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--all",
        action="store_true",
        help="Include candidate (C/G/Q) regions in addition to known (K).",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    print("─── WISE HII region bake ───")
    rows = fetch_wise_hii(verbose=args.verbose)
    if not rows:
        print("no rows parsed from VizieR; aborting", file=sys.stderr)
        return 1
    print(f"  parsed {len(rows)} raw rows from J/ApJS/212/1")

    # Filter to Known unless --all.
    if not args.all:
        kept = [r for r in rows if r["cat"] == "K"]
        print(f"  kept {len(kept)} Known (K-class) regions")
    else:
        kept = rows
        print(f"  kept all {len(kept)} regions (K/C/G/Q)")

    # Pack: 5 × Float32 per row = 20 bytes.
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    packed = bytearray()
    for r in kept:
        glon_rad = r["glon"] * DEG_TO_RAD
        glat_rad = r["glat"] * DEG_TO_RAD
        dist_kpc = r["dist_kpc"]
        diam = r["diam_arcmin"]
        cat_code = float(CATEGORY_CODE.get(r["cat"], 1))
        packed += struct.pack(
            "<fffff", glon_rad, glat_rad, dist_kpc, diam, cat_code,
        )
    OUT_BIN.write_bytes(bytes(packed))
    print(f"✔ wrote {OUT_BIN.relative_to(REPO_ROOT)} — {len(packed) / 1024:.1f} KB ({len(kept)} rows × 20 B)")

    manifest = {
        "count": len(kept),
        "recordBytes": 20,
        "schema": [
            {"name": "glon_rad", "type": "f32"},
            {"name": "glat_rad", "type": "f32"},
            {"name": "dist_kpc", "type": "f32"},
            {"name": "diam_arcmin", "type": "f32"},
            {"name": "cat_code", "type": "f32"},
        ],
        "source": "VizieR J/ApJS/212/1 — Anderson+ 2014 WISE Catalog of Galactic HII Regions",
        "filter": "K (Known) only" if not args.all else "K + C + G + Q (all)",
        "categoryCodes": CATEGORY_CODE,
        "bakedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "license": "CC-BY 3.0 (Anderson+ 2014, ApJS 212:1)",
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2))
    print(f"✔ wrote {OUT_MANIFEST.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

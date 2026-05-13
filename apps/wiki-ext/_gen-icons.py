#!/usr/bin/env python3
"""
Generate icon-16.png / icon-48.png / icon-128.png for the wiki-ext.

Uses Python stdlib only (struct + zlib) to emit valid PNGs without
requiring Pillow / rsvg / convert / sips. The design is a deep-space
disc with a radial cyan glow and three scattered stars — same palette
as the viewer (space-950 background, cyan/sky highlights).

Run once at extension setup time:

    python3 apps/wiki-ext/_gen-icons.py

The output files are committed alongside the manifest so end users
loading the unpacked extension don't need any toolchain.
"""

from __future__ import annotations

import math
import os
import struct
import zlib

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix_color(c1, c2, t):
    return (
        int(round(lerp(c1[0], c2[0], t))),
        int(round(lerp(c1[1], c2[1], t))),
        int(round(lerp(c1[2], c2[2], t))),
    )


def render(size: int) -> bytes:
    """Render an RGBA bitmap of (size x size) as raw bytes."""
    cx = (size - 1) / 2.0
    cy = (size - 1) / 2.0
    rmax = size / 2.0

    bg = (3, 5, 10)  # space-950
    inner = (125, 211, 252)  # sky-300
    mid = (14, 165, 233)  # sky-500

    rows = bytearray()
    # Three stars (relative offsets in unit space)
    stars = [
        (0.78, 0.30, 1.1),
        (0.22, 0.72, 0.9),
        (0.84, 0.78, 0.7),
        (0.18, 0.22, 0.6),
    ]

    for y in range(size):
        rows.append(0)  # PNG filter type: none, per scanline
        for x in range(size):
            dx = x - cx
            dy = y - cy
            d = math.sqrt(dx * dx + dy * dy)
            # Background — pure dark
            r, g, b = bg
            # Disc: radial gradient inner→mid→bg fading at rmax
            disc_r = rmax * 0.72
            if d < disc_r:
                t = d / disc_r
                if t < 0.45:
                    c = mix_color(inner, mid, t / 0.45)
                else:
                    c = mix_color(mid, bg, (t - 0.45) / 0.55)
                # Soft alpha-style blend so the edge is feathered
                r, g, b = c
            # Stars: small bright pixels
            for sx_u, sy_u, srad in stars:
                sx = sx_u * (size - 1)
                sy = sy_u * (size - 1)
                sd = math.hypot(x - sx, y - sy)
                if sd < srad:
                    k = max(0.0, 1.0 - sd / srad)
                    r = int(round(lerp(r, 255, k)))
                    g = int(round(lerp(g, 255, k)))
                    b = int(round(lerp(b, 255, k)))
            rows.append(r)
            rows.append(g)
            rows.append(b)
            rows.append(255)
    return bytes(rows)


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: str, size: int) -> None:
    raw = render(size)
    ihdr = struct.pack(
        ">IIBBBBB",
        size,
        size,
        8,  # bit depth
        6,  # color type RGBA
        0,
        0,
        0,
    )
    idat = zlib.compress(raw, 9)
    blob = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", idat)
        + png_chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(blob)


def main() -> None:
    for size in (16, 48, 128):
        out = os.path.join(OUT_DIR, f"icon-{size}.png")
        write_png(out, size)
        print(f"wrote {out} ({size}x{size})")


if __name__ == "__main__":
    main()

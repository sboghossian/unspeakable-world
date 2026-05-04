import { useState } from "react";

/**
 * 🎨 Color legend — explains every marker colour the viewer uses.
 *
 * Anchors at the bottom-left like AstroGrid's "Color Legend". One click
 * opens a small reference card; another closes it. Colour swatches are
 * matched to the actual fields they represent.
 */

const ENTRIES: Array<{ swatch: string; label: string; detail: string }> = [
  { swatch: "rgba(245, 240, 220, 0.95)", label: "Bright stars", detail: "HYG named stars (top-60 + ★ NAMES toggle)" },
  { swatch: "rgba(180, 200, 255, 0.85)", label: "Constellation lines", detail: "88 IAU lines · ✦ LINES" },
  { swatch: "rgba(96, 160, 255, 0.7)", label: "Coord grid", detail: "RA/Dec equatorial · ⌖ GRID" },
  { swatch: "rgba(166, 200, 255, 0.85)", label: "Celestial equator", detail: "Dec = 0° great circle" },
  { swatch: "rgba(255, 210, 119, 0.85)", label: "Ecliptic", detail: "Sun's annual path through the zodiac" },
  { swatch: "rgba(179, 137, 255, 0.85)", label: "Galactic plane", detail: "Mid-plane of the Milky Way" },
  { swatch: "rgba(115, 220, 165, 0.85)", label: "Exoplanet hosts", detail: "6,278 confirmed · ⊙ EXO" },
  { swatch: "rgba(255, 200, 90, 0.85)", label: "Pulsars", detail: "3,927 SIMBAD pulsars · ⚡ PULSARS" },
  { swatch: "rgba(255, 130, 130, 0.95)", label: "Black holes", detail: "Sgr A*, M87*, X-ray binaries · ◉ EXOTIC" },
  { swatch: "rgba(255, 110, 200, 0.95)", label: "Supernova remnants", detail: "Cas A, Crab, Tycho's, Kepler's" },
  { swatch: "rgba(190, 220, 255, 0.95)", label: "Quasars", detail: "3C 273, J0313–1806, ULAS J1342" },
  { swatch: "rgba(120, 220, 255, 0.95)", label: "AGN / blazars", detail: "Cen A, Mrk 421, Mrk 501, Cyg A" },
  { swatch: "rgba(220, 180, 255, 0.95)", label: "Multi-messenger", detail: "GW170817, GW150914, FRB 121102, HUDF" },
  { swatch: "rgba(180, 230, 255, 0.95)", label: "Spacecraft markers", detail: "Voyagers, Pioneers, NH, JWST · ◇ CRAFT" },
  { swatch: "rgba(70, 200, 255, 0.85)", label: "Real satellites", detail: "ISS, Crew Dragon, GPS · 🛰 SATS (solar flight)" },
  { swatch: "rgba(74, 209, 156, 0.85)", label: "Habitable zone", detail: "Solar zone overlay · 0.95–1.37 AU" },
  { swatch: "rgba(255, 255, 255, 0.95)", label: "Frost line", detail: "Solar zone · 4.85 AU (water-ice condenses)" },
  { swatch: "rgba(200, 193, 184, 0.85)", label: "Asteroid belt", detail: "Solar zone · 2.2–3.2 AU" },
  { swatch: "rgba(179, 137, 255, 0.85)", label: "Kuiper belt", detail: "Solar zone · 30–50 AU" },
];

export function ColorLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-white/10 bg-space-950/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/60 backdrop-blur transition hover:bg-white/10 hover:text-white"
        >
          🎨 color legend
        </button>
      ) : (
        <div className="w-[min(360px,92vw)] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
              🎨 color legend
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-1.5">
            {ENTRIES.map((e) => (
              <li
                key={e.label}
                className="flex items-baseline gap-2.5 text-[11px]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: e.swatch }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-white/85">{e.label}</div>
                  <div className="font-mono text-[10px] text-white/45">
                    {e.detail}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

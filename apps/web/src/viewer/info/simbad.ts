/**
 * SIMBAD cone-search client.
 *
 * Hits CDS Strasbourg directly — they ship `Access-Control-Allow-Origin: *`
 * so we don't need a CF Worker proxy in v1. (Day 7 mirrors locally if traffic
 * spikes — see the Day 0 architecture notes about the 6 qps/IP cap.)
 */

export type SimbadHit = {
  name: string;
  /** SIMBAD object type code, e.g. "AGN", "*", "G", "Pl" */
  type: string;
  /** Apparent V magnitude, when available. */
  vMag: number | null;
  /** ICRS RA/Dec in degrees as reported by SIMBAD. */
  raDeg: number;
  decDeg: number;
  /** Radial velocity (km/s) when available, useful for "moving away" claims. */
  radialVelocity: number | null;
  /** Redshift when available. */
  redshift: number | null;
  /** Spectral type for stars (e.g. "G2V"). */
  spectralType: string | null;
  /** Up to 5 alternative identifiers. */
  identifiers: string[];
  /** Raw ASCII the server returned, for the "details" pane. */
  raw: string;
};

const ENDPOINT = "https://simbad.cds.unistra.fr/simbad/sim-coo";

/**
 * Cone search at (raDeg, decDeg). Returns the closest object SIMBAD knows
 * within `radiusArcmin`, or null if none.
 */
export async function simbadConeSearch(
  raDeg: number,
  decDeg: number,
  radiusArcmin = 10,
): Promise<SimbadHit | null> {
  const params = new URLSearchParams({
    Coord: `${raDeg.toFixed(5)} ${decDeg >= 0 ? "+" : ""}${decDeg.toFixed(5)}`,
    Radius: String(radiusArcmin),
    "Radius.unit": "arcmin",
    "output.format": "ASCII",
  });
  const url = `${ENDPOINT}?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`SIMBAD HTTP ${res.status}`);
  const text = await res.text();
  return parseSimbadAscii(text);
}

/**
 * Parse SIMBAD's ASCII output. The format is loose so we tolerate misses —
 * each field is optional. We're best-effort, not validating.
 *
 * Real example fragment:
 *
 *   Object M 31  ---  AGN  ---  OID=@1575544  ---  coobox=11643
 *   Coordinates(ICRS,ep=J2000,eq=2000): 00 42 44.330  +41 16 07.50 (IR  ) C ...
 *   Radial Velocity: -300.0 [4.0] C ...
 *   Redshift: -0.001000 [0.000013] C ...
 *   Flux V : 3.44 [0.02] D ...
 *   Spectral type: G2V ~ ~
 *   Identifiers (40):
 *     4FGL J0043.2+4114    PLX 124    ...
 */
function parseSimbadAscii(text: string): SimbadHit | null {
  // Cone-search responses come back as a pipe-separated table; ID lookups
  // come back as a key/value block. We try the table format first because
  // that's what our cone-search query actually produces.
  const tableHit = parseSimbadConeTable(text);
  if (tableHit) return tableHit;
  return parseSimbadIdLookup(text);
}

function parseSimbadIdLookup(text: string): SimbadHit | null {
  const lines = text.split("\n");

  let name = "";
  let type = "";
  for (const line of lines) {
    const m = line.match(/^Object\s+(.+?)\s{2,}---\s{2,}(.+?)\s{2,}---/);
    if (m) {
      name = m[1]!.trim();
      type = m[2]!.trim();
      break;
    }
  }
  if (!name) return null;

  let raDeg = 0;
  let decDeg = 0;
  for (const line of lines) {
    const m = line.match(
      /^Coordinates\(ICRS[^)]+\):\s+(\d{2})\s+(\d{2})\s+([\d.]+)\s+([+-]\d{2})\s+(\d{2})\s+([\d.]+)/,
    );
    if (m) {
      const rh = +m[1]!;
      const rm = +m[2]!;
      const rs = +m[3]!;
      raDeg = (rh + rm / 60 + rs / 3600) * 15;
      const sign = m[4]!.startsWith("-") ? -1 : 1;
      const dd = Math.abs(+m[4]!);
      const dm = +m[5]!;
      const ds = +m[6]!;
      decDeg = sign * (dd + dm / 60 + ds / 3600);
      break;
    }
  }

  const fluxV = matchFloat(lines, /^Flux V\s*:\s*([+-]?\d+\.\d+)/);
  const radialVelocity = matchFloat(
    lines,
    /^Radial Velocity:\s+([+-]?\d+\.?\d*)/,
  );
  const redshift = matchFloat(lines, /^Redshift:\s+([+-]?\d+\.?\d+)/);
  const spectralType = matchString(lines, /^Spectral type:\s+(\S+)/);

  // Identifiers section: collect up to 5 in display order.
  const identifiers: string[] = [];
  let inIdentifiers = false;
  for (const line of lines) {
    if (/^Identifiers/.test(line)) {
      inIdentifiers = true;
      continue;
    }
    if (!inIdentifiers) continue;
    const trimmed = line.trim();
    if (!trimmed || /^Bibcodes/.test(trimmed) || /^Notes/.test(trimmed)) break;
    // SIMBAD packs identifiers 3 per line, padded with multi-space.
    const ids = trimmed.split(/\s{2,}/).filter(Boolean);
    for (const id of ids) {
      if (identifiers.length < 5) identifiers.push(id);
    }
    if (identifiers.length >= 5) break;
  }

  return {
    name,
    type,
    vMag: fluxV,
    raDeg,
    decDeg,
    radialVelocity,
    redshift,
    spectralType,
    identifiers,
    raw: text,
  };
}

function matchFloat(lines: string[], rx: RegExp): number | null {
  for (const line of lines) {
    const m = line.match(rx);
    if (m && m[1]) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function matchString(lines: string[], rx: RegExp): string | null {
  for (const line of lines) {
    const m = line.match(rx);
    if (m && m[1] && m[1] !== "~") return m[1];
  }
  return null;
}

/**
 * Parse the table that SIMBAD's cone-search returns. Format (truncated):
 *
 *   # |dist(asec)|     identifier        |typ|   coord1 (ICRS,J2000/2000)   |Mag U |Mag B |Mag V |Mag R |Mag I |spec. type   |#bib|#not
 *   ---|----------|-----------------------|---|-------------------------------|------|------|------|------|------|-------------|----|----
 *   1 |    138.70|HD 40590                |*  |05 59 51.5846... +00 03 21.46..|  ~   | 8.60 | 8.07 |  ~   |  ~   |F6/7V        |  28|   0
 *
 * We pick the closest object (row 1) and turn it into a SimbadHit.
 */
function parseSimbadConeTable(text: string): SimbadHit | null {
  const lines = text.split("\n");
  // Find the header — it has both "identifier" and "typ" between pipes.
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] ?? "";
    if (l.includes("|") && /\bidentifier\b/.test(l) && /\btyp\b/.test(l)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const headerCells = (lines[headerIdx] ?? "").split("|").map((s) => s.trim());
  const colIdent = headerCells.findIndex((h) => /^identifier$/i.test(h));
  const colType = headerCells.findIndex((h) => /^typ$/i.test(h));
  const colCoord = headerCells.findIndex((h) => /^coord1/i.test(h));
  const colV = headerCells.findIndex((h) => /^mag v$/i.test(h));
  const colSpec = headerCells.findIndex((h) => /^spec\. type$/i.test(h));

  // Skip the separator line, then the first data row.
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (!raw.includes("|")) continue;
    const cells = raw.split("|").map((s) => s.trim());
    if (cells.length < headerCells.length) continue;
    const ident = cells[colIdent] ?? "";
    if (!ident) continue;

    const type = (cells[colType] ?? "").trim();
    const coord = cells[colCoord] ?? "";
    const { ra, dec } = parseSexagesimalRaDec(coord);

    const vRaw = cells[colV] ?? "";
    const v = vRaw && vRaw !== "~" ? parseFloat(vRaw) : NaN;
    const specRaw = cells[colSpec] ?? "";
    const spec = specRaw && specRaw !== "~" ? specRaw : null;

    return {
      name: ident,
      type,
      vMag: Number.isFinite(v) ? v : null,
      raDeg: ra,
      decDeg: dec,
      radialVelocity: null,
      redshift: null,
      spectralType: spec,
      identifiers: [ident],
      raw: text,
    };
  }
  return null;
}

/** Parse "05 59 51.5846 +00 03 21.46" → {ra, dec} in degrees. */
function parseSexagesimalRaDec(s: string): { ra: number; dec: number } {
  const m = s.match(
    /(\d{1,2})\s+(\d{1,2})\s+([\d.]+)\s+([+-]?)(\d{1,2})\s+(\d{1,2})\s+([\d.]+)/,
  );
  if (!m) return { ra: 0, dec: 0 };
  const rh = +m[1]!;
  const rmm = +m[2]!;
  const rs = +m[3]!;
  const sign = m[4] === "-" ? -1 : 1;
  const dd = +m[5]!;
  const dmm = +m[6]!;
  const ds = +m[7]!;
  const ra = (rh + rmm / 60 + rs / 3600) * 15;
  const dec = sign * (dd + dmm / 60 + ds / 3600);
  return { ra, dec };
}

/** Map SIMBAD type codes to human-readable categories for the UI. */
export function describeType(code: string): string {
  const labels: Record<string, string> = {
    "*": "Star",
    "**": "Double / multiple star",
    SB: "Spectroscopic binary",
    Cl: "Cluster",
    GlC: "Globular cluster",
    OpC: "Open cluster",
    G: "Galaxy",
    GiP: "Galaxy in pair",
    GiG: "Galaxy in group",
    GiC: "Galaxy in cluster",
    AGN: "Active galactic nucleus",
    QSO: "Quasar",
    Sy: "Seyfert galaxy",
    BlL: "BL Lac object",
    PN: "Planetary nebula",
    HII: "HII region",
    SNR: "Supernova remnant",
    SN: "Supernova",
    No: "Nova",
    Pl: "Planet",
    Moo: "Moon",
    Sat: "Spacecraft",
    As: "Asteroid",
    Cm: "Comet",
    LM: "Low-mass star",
    BD: "Brown dwarf",
    WD: "White dwarf",
    NS: "Neutron star",
    BH: "Black hole",
    RG: "Radio galaxy",
    XB: "X-ray binary",
  };
  return labels[code] ?? code;
}

/**
 * Convert a Three.js world-space (Y-up) sky direction back to celestial
 * (ICRS) RA / Dec. This is the inverse of the rotation our astronomy groups
 * apply (rotation.x = -π/2 takes celestial-Z to world-Y).
 */
export function worldDirectionToRaDec(dir: {
  x: number;
  y: number;
  z: number;
}): {
  ra: number;
  dec: number;
} {
  // Inverse rotation around X by +π/2: (x, y, z)_world → (x, -z, y)_celestial.
  const xCel = dir.x;
  const yCel = -dir.z;
  const zCel = dir.y;
  const len = Math.hypot(xCel, yCel, zCel) || 1;
  const dec =
    (Math.asin(Math.max(-1, Math.min(1, zCel / len))) * 180) / Math.PI;
  let ra = (Math.atan2(yCel, xCel) * 180) / Math.PI;
  if (ra < 0) ra += 360;
  return { ra, dec };
}

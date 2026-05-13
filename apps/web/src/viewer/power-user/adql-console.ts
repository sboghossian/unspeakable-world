/**
 * ADQL / TAP query console (power-user feature C).
 *
 * Posts user ADQL to VizieR's TAP sync endpoint and parses the returned
 * VOTable (XML) into a plain `{ columns, rows }` JS shape the React panel
 * can render as a table.
 *
 * VizieR TAP: https://tap-vizier.u-strasbg.fr/TAPVizieR/tap/sync
 *   Required form fields: REQUEST=doQuery, LANG=ADQL, FORMAT=votable, QUERY=…
 *
 * The VOTable parser is intentionally tiny — it walks the first <TABLE>
 * inside the first <RESOURCE> and reads each <FIELD> + <TR>/<TD>. That
 * covers > 99% of TAP responses; nested groupings / params / link refs
 * are dropped. Use DOMParser (browser-native) — no XML deps.
 */

export const VIZIER_TAP_URL =
  "https://tap-vizier.u-strasbg.fr/TAPVizieR/tap/sync";

export type VoColumn = {
  /** Field name as advertised by `name=` on the <FIELD> tag. */
  name: string;
  /** UCD if present — used to auto-detect RA/Dec columns. */
  ucd: string;
  /** Datatype string from the VOTable, e.g. "double", "int", "char". */
  datatype: string;
  /** Unit string from `unit=` (often "deg" for RA/Dec). */
  unit: string;
};

export type VoTable = {
  columns: VoColumn[];
  /** Rows are arrays of strings — we don't coerce; the UI/consumer can. */
  rows: string[][];
  /** Free-form info messages surfaced by the server (TAP errors land here). */
  info: string;
};

export type AdqlResult = VoTable & {
  /** Index of the column we believe holds RA (degrees), or -1. */
  raColumn: number;
  /** Index of the column we believe holds Dec (degrees), or -1. */
  decColumn: number;
};

/**
 * Run an ADQL query and return parsed rows. Throws on HTTP failure or
 * on a VOTable that contains a `severity="ERROR"` INFO tag.
 */
export async function runAdql(query: string, signal?: AbortSignal): Promise<AdqlResult> {
  const form = new URLSearchParams();
  form.set("REQUEST", "doQuery");
  form.set("LANG", "ADQL");
  form.set("FORMAT", "votable");
  form.set("QUERY", query);

  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  };
  if (signal) init.signal = signal;
  const res = await fetch(VIZIER_TAP_URL, init);
  if (!res.ok) {
    throw new Error(`VizieR TAP HTTP ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parseVoTable(xml);

  // Detect RA / Dec columns by UCD first, then by name fallback.
  let raCol = -1;
  let decCol = -1;
  parsed.columns.forEach((c, i) => {
    const ucd = c.ucd.toLowerCase();
    // name fallback removed — UCD-only detection is fine for now.
    if (raCol < 0 && (ucd === "pos.eq.ra;meta.main" || ucd === "pos.eq.ra")) {
      raCol = i;
    }
    if (decCol < 0 && (ucd === "pos.eq.dec;meta.main" || ucd === "pos.eq.dec")) {
      decCol = i;
    }
  });
  if (raCol < 0) raCol = parsed.columns.findIndex((c) => /^(ra|raj2000|ra_icrs)$/i.test(c.name));
  if (decCol < 0)
    decCol = parsed.columns.findIndex((c) => /^(dec|dej2000|de_icrs|dec_icrs)$/i.test(c.name));

  return { ...parsed, raColumn: raCol, decColumn: decCol };
}

/** Parse a VOTable XML string. Public so tests can exercise it directly. */
export function parseVoTable(xml: string): VoTable {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const parseErr = doc.getElementsByTagName("parsererror")[0];
  if (parseErr) {
    throw new Error(`Malformed VOTable XML: ${parseErr.textContent ?? ""}`);
  }

  // Surface server-side errors carried in <INFO name="QUERY_STATUS" value="ERROR">.
  let info = "";
  for (const tag of Array.from(doc.getElementsByTagName("INFO"))) {
    const name = tag.getAttribute("name") ?? "";
    const value = tag.getAttribute("value") ?? "";
    if (name === "QUERY_STATUS" && value === "ERROR") {
      throw new Error(`VizieR error: ${(tag.textContent ?? "").trim()}`);
    }
    if (tag.textContent) info += `${tag.textContent.trim()}\n`;
  }

  const table = doc.getElementsByTagName("TABLE")[0];
  if (!table) return { columns: [], rows: [], info };

  const columns: VoColumn[] = [];
  for (const field of Array.from(table.getElementsByTagName("FIELD"))) {
    columns.push({
      name: field.getAttribute("name") ?? "",
      ucd: field.getAttribute("ucd") ?? "",
      datatype: field.getAttribute("datatype") ?? "",
      unit: field.getAttribute("unit") ?? "",
    });
  }

  const rows: string[][] = [];
  for (const tr of Array.from(table.getElementsByTagName("TR"))) {
    const cells: string[] = [];
    for (const td of Array.from(tr.getElementsByTagName("TD"))) {
      cells.push((td.textContent ?? "").trim());
    }
    rows.push(cells);
  }
  return { columns, rows, info: info.trim() };
}

/** Default starter query the panel preloads into the textarea. */
export const DEFAULT_ADQL_QUERY =
  'SELECT TOP 10 * FROM "I/345/gaia2" WHERE phot_g_mean_mag < 5';

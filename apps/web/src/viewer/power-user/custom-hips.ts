/**
 * Custom HiPS root URL paster (power-user feature A).
 *
 * Accepts an arbitrary HiPS root URL (e.g. `https://alasky.cds.unistra.fr/CFHT/MegaCam/`),
 * probes `<root>/properties`, validates the minimal field set, and registers
 * the survey into a runtime override Map keyed by id. The static `SURVEYS`
 * registry in `../hips/surveys.ts` is untouched — consumers that want to
 * include user-pasted surveys read from `getRuntimeSurvey()` first and fall
 * back to the static map.
 *
 * Persistence: validated URLs are stored in localStorage under
 * `uw:custom-hips:v1` and re-hydrated on page load. We re-probe each URL
 * on rehydration (cheap; properties files are < 4 KB) so a survey that
 * moved or 404s drops out instead of polluting the registry forever.
 */
import type { Survey } from "../hips/surveys";
import { SURVEYS } from "../hips/surveys";

export type CustomHipsProps = {
  /** Stable id; we hash the URL when the properties file lacks `creator_did`. */
  id: string;
  /** Human label — `obs_title` or `obs_collection` fallback. */
  label: string;
  /** `hips_tile_format` — first supported entry; we restrict to jpg/png. */
  format: "jpg" | "png";
  /** `hips_order` (max order). */
  maxOrder: number;
  /** `hips_initial_ra`/`hips_initial_dec` if present (degrees). */
  initialRaDeg: number | null;
  initialDecDeg: number | null;
  /** `obs_copyright` or `obs_publisher` for attribution chrome. */
  attribution: string;
};

const LS_KEY = "uw:custom-hips:v1";
const RUNTIME: Map<string, Survey> = new Map();

type Listener = (surveys: Survey[]) => void;
const listeners = new Set<Listener>();

/** Subscribe to runtime survey changes; returns unsubscribe. */
export function subscribeRuntimeSurveys(fn: Listener): () => void {
  listeners.add(fn);
  fn(listRuntimeSurveys());
  return () => {
    listeners.delete(fn);
  };
}

function emit(): void {
  const arr = listRuntimeSurveys();
  for (const l of listeners) l(arr);
}

/** Look up a survey by id, checking runtime overrides first, then the static map. */
export function getSurveyAnywhere(id: string): Survey | undefined {
  return RUNTIME.get(id) ?? SURVEYS[id];
}

/** All user-pasted surveys, in insertion order. */
export function listRuntimeSurveys(): Survey[] {
  return [...RUNTIME.values()];
}

/** Remove a runtime survey (and persist the removal). */
export function removeRuntimeSurvey(id: string): void {
  if (!RUNTIME.delete(id)) return;
  persist();
  emit();
}

/**
 * Normalise a user-pasted URL — strip whitespace, trailing slash, and
 * trailing `/properties` if the user pasted that directly.
 */
export function normaliseHipsRoot(input: string): string {
  let url = input.trim();
  if (url.endsWith("/properties")) url = url.slice(0, -"/properties".length);
  if (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

/**
 * Minimal HiPS `properties` file parser. The format is a flat list of
 * `key = value` pairs, one per line, with `#` comments. See:
 *   https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf
 */
export function parseProperties(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key) out.set(key, value);
  }
  return out;
}

/**
 * Fetch + validate `<root>/properties`. Throws with a human-readable
 * reason on any failure (CORS, 404, missing required fields, unsupported
 * tile format).
 */
export async function probeHipsRoot(rootUrl: string): Promise<CustomHipsProps> {
  const root = normaliseHipsRoot(rootUrl);
  if (!/^https?:\/\//i.test(root)) {
    throw new Error("URL must start with http:// or https://");
  }

  const url = `${root}/properties`;
  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    throw new Error(
      `Could not fetch ${url} — ${err instanceof Error ? err.message : String(err)} (likely CORS)`,
    );
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const text = await res.text();
  const props = parseProperties(text);

  // `dataproduct_type` should be "image" for any pixel HiPS we can render.
  const dpt = props.get("dataproduct_type");
  if (dpt && !/image/i.test(dpt)) {
    throw new Error(
      `Unsupported dataproduct_type "${dpt}" — only image HiPS are renderable here`,
    );
  }

  // Tile format: comma- or space-separated list. We render JPG or PNG.
  const fmtRaw = props.get("hips_tile_format") ?? "jpg";
  const tokens = fmtRaw.split(/[\s,]+/).map((t) => t.toLowerCase().trim());
  let format: "jpg" | "png" | null = null;
  if (tokens.includes("jpeg") || tokens.includes("jpg")) format = "jpg";
  else if (tokens.includes("png")) format = "png";
  if (!format) {
    throw new Error(
      `Unsupported hips_tile_format "${fmtRaw}" — need jpg or png`,
    );
  }

  const orderRaw = props.get("hips_order");
  const maxOrder = orderRaw ? Number.parseInt(orderRaw, 10) : Number.NaN;
  if (!Number.isFinite(maxOrder) || maxOrder < 0 || maxOrder > 14) {
    throw new Error(`Invalid hips_order "${orderRaw}"`);
  }

  const initialRa = parseNumOrNull(props.get("hips_initial_ra"));
  const initialDec = parseNumOrNull(props.get("hips_initial_dec"));

  const did = props.get("creator_did") ?? props.get("publisher_did") ?? "";
  const id =
    "user-" +
    (did
      ? safeIdFromDid(did)
      : hashString(root)
          .toString(36)
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 10));

  const label =
    props.get("obs_title") ??
    props.get("obs_collection") ??
    (new URL(root).pathname.replace(/^\/|\/$/g, "") || root);
  const attribution =
    props.get("obs_copyright") ??
    props.get("obs_publisher") ??
    props.get("hips_creator") ??
    "user-pasted HiPS";

  return {
    id,
    label,
    format,
    maxOrder,
    initialRaDeg: initialRa,
    initialDecDeg: initialDec,
    attribution,
  };
}

function parseNumOrNull(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** djb2-ish 32-bit hash. Cheap, deterministic, browser-safe. */
function hashString(s: string): number {
  let h = 5381 | 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function safeIdFromDid(did: string): string {
  return did
    .replace(/^ivo:\/\//i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 60);
}

/**
 * Register a probed survey into the runtime override Map and persist
 * the source URL. Returns the constructed `Survey` so the caller can
 * immediately mount it as an overlay if desired.
 */
export function registerCustomHips(
  rootUrl: string,
  props: CustomHipsProps,
): Survey {
  const root = normaliseHipsRoot(rootUrl);
  const survey: Survey = {
    id: props.id,
    label: props.label,
    // We bucket user-pasted surveys as "catalog" so the wavelength UI
    // shows them with a neutral chip rather than guessing.
    wavelength: "catalog",
    baseUrl: root,
    format: props.format,
    maxOrder: props.maxOrder,
    attribution: props.attribution,
  };
  RUNTIME.set(survey.id, survey);
  persist();
  emit();
  return survey;
}

type StoredEntry = { url: string; id: string };

function readStored(): StoredEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: StoredEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { url?: unknown }).url === "string" &&
        typeof (item as { id?: unknown }).id === "string"
      ) {
        out.push({
          url: (item as { url: string }).url,
          id: (item as { id: string }).id,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  const entries: StoredEntry[] = [];
  for (const survey of RUNTIME.values()) {
    entries.push({ url: survey.baseUrl, id: survey.id });
  }
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota / privacy errors */
  }
}

/**
 * Re-probe every persisted URL on app boot. Surveys that 404 or fail
 * validation are silently dropped — we never want stale localStorage
 * to break the wavelength selector.
 */
export async function hydrateRuntimeSurveys(): Promise<void> {
  const stored = readStored();
  for (const entry of stored) {
    try {
      const props = await probeHipsRoot(entry.url);
      // Preserve the stored id if it matches the freshly-derived one,
      // so deep-links by id remain stable.
      const id = entry.id || props.id;
      RUNTIME.set(id, {
        id,
        label: props.label,
        wavelength: "catalog",
        baseUrl: normaliseHipsRoot(entry.url),
        format: props.format,
        maxOrder: props.maxOrder,
        attribution: props.attribution,
      });
    } catch {
      /* drop this entry from the registry on the next persist() */
    }
  }
  emit();
}

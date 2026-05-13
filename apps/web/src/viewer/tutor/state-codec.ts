/**
 * 🎓 Tutoring session — wire-format codec.
 *
 * Encodes the teacher's live camera/overlay/layer state into the small
 * JSON payload pushed to KV (and pulled by students every ~2 s). The
 * shape mirrors the per-mode hash formats in `share/url-state.ts`,
 * `SolarFlight.tsx`, `Galactic.tsx`, and `Universe.tsx` — but with
 * generic `camera: Record<string, number>` so one channel can carry any
 * of the four modes without per-mode protocol negotiation.
 *
 * Mode → camera keys (canonical):
 *
 *   "sky"      → ra, dec, fov            (degrees)
 *   "solar"    → yaw, pitch, dist, t, rate
 *   "galactic" → dist
 *   "universe" → cx, cy, cz, yaw, pitch
 *
 * Students that don't recognise a key MUST ignore it (forward-compat).
 * The format version (`v: 1`) lets us add fields freely as long as
 * existing readers ignore unknowns.
 */

export type TutorMode = "sky" | "solar" | "galactic" | "universe";

export type TutorState = {
  /** Protocol version. Increments only on breaking changes. */
  v: 1;
  /** Teacher-side wall-clock ms (UTC). Students reject stale states. */
  ts: number;
  mode: TutorMode;
  /**
   * Mode-specific numeric camera state. Keep flat + numbers so the
   * payload stays small and KV-friendly. Strings (like the focused
   * body name) live in `focus`.
   */
  camera: Record<string, number>;
  /** Enabled extra-layer ids (max ~10 — same cap as the hash format). */
  layers: string[];
  /** HiPS survey id currently overlaid, if any. */
  overlay?: string;
  /** Focused body / target name (e.g. "Mars", "Galactic Center"). */
  focus?: string;
  /** Teacher's optional spoken note, surfaced to students verbatim. */
  caption?: string;
};

/** Hard caps so a hostile or buggy teacher can't bloat the payload. */
const MAX_CAMERA_KEYS = 16;
const MAX_LAYERS = 10;
const MAX_STRING_LEN = 256;
const MAX_CAPTION_LEN = 200;

/* ------------------------------------------------------------------ */
/* Encode — teacher side. Produces a JSON string ≲ 1 KB.               */
/* ------------------------------------------------------------------ */

export function encodeTutorState(state: TutorState): string {
  return JSON.stringify(normaliseTutorState(state));
}

/** Sanitise + clamp before encoding so we never publish garbage. */
export function normaliseTutorState(state: TutorState): TutorState {
  const camera: Record<string, number> = {};
  let keyCount = 0;
  for (const [k, v] of Object.entries(state.camera)) {
    if (keyCount >= MAX_CAMERA_KEYS) break;
    if (typeof k !== "string" || k.length === 0 || k.length > 32) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    camera[k] = roundTo(v, 6);
    keyCount += 1;
  }

  const layers = (Array.isArray(state.layers) ? state.layers : [])
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((id) => id.slice(0, 64))
    .slice(0, MAX_LAYERS);

  const out: TutorState = {
    v: 1,
    ts: Number.isFinite(state.ts) ? state.ts : Date.now(),
    mode: normaliseMode(state.mode),
    camera,
    layers,
  };
  if (state.overlay && typeof state.overlay === "string") {
    out.overlay = state.overlay.slice(0, MAX_STRING_LEN);
  }
  if (state.focus && typeof state.focus === "string") {
    out.focus = state.focus.slice(0, MAX_STRING_LEN);
  }
  if (state.caption && typeof state.caption === "string") {
    const trimmed = state.caption.trim();
    if (trimmed) out.caption = trimmed.slice(0, MAX_CAPTION_LEN);
  }
  return out;
}

function normaliseMode(mode: unknown): TutorMode {
  if (mode === "sky" || mode === "solar" || mode === "galactic" || mode === "universe") {
    return mode;
  }
  return "sky";
}

function roundTo(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

/* ------------------------------------------------------------------ */
/* Decode — student side. Defensive: never throws on bad input.        */
/* ------------------------------------------------------------------ */

/** Parse a JSON string from the KV layer. Returns `null` on any error. */
export function decodeTutorState(raw: string | null | undefined): TutorState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj["v"] !== 1) return null;

  const ts = typeof obj["ts"] === "number" ? obj["ts"] : NaN;
  if (!Number.isFinite(ts)) return null;

  const rawCamera = obj["camera"];
  const camera: Record<string, number> = {};
  if (rawCamera && typeof rawCamera === "object") {
    let keyCount = 0;
    for (const [k, v] of Object.entries(rawCamera as Record<string, unknown>)) {
      if (keyCount >= MAX_CAMERA_KEYS) break;
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      camera[k] = v;
      keyCount += 1;
    }
  }

  const rawLayers = obj["layers"];
  const layers = Array.isArray(rawLayers)
    ? (rawLayers as unknown[])
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .slice(0, MAX_LAYERS)
    : [];

  const result: TutorState = {
    v: 1,
    ts,
    mode: normaliseMode(obj["mode"]),
    camera,
    layers,
  };
  if (typeof obj["overlay"] === "string") result.overlay = obj["overlay"];
  if (typeof obj["focus"] === "string") result.focus = obj["focus"];
  if (typeof obj["caption"] === "string") result.caption = obj["caption"];
  return result;
}

/* ------------------------------------------------------------------ */
/* Session-code helpers.                                               */
/* ------------------------------------------------------------------ */

/**
 * Crockford-style base32 alphabet (no I/L/O/U to avoid look-alikes when
 * a student types the code by hand). 32 symbols × 6 chars = 2^30 ≈ 1.07 B
 * possible codes — collision probability with N concurrent sessions is
 * N²/(2·32^6) ≈ 4.7×10⁻¹⁰ × N². At 1000 simultaneous teachers the
 * birthday-pair odds are still ≈5×10⁻⁴.
 */
const SESSION_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SESSION_CODE_LENGTH = 6;

export function generateSessionCode(): string {
  // Prefer crypto.getRandomValues so two teachers who hit "Start" in the
  // same millisecond don't collide.
  const buf = new Uint8Array(SESSION_CODE_LENGTH);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = "";
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    const b = buf[i] ?? 0;
    out += SESSION_ALPHABET[b % 32];
  }
  return out;
}

/** True iff the candidate is a syntactically-valid session code. */
export function isValidSessionCode(code: string): boolean {
  if (typeof code !== "string" || code.length !== SESSION_CODE_LENGTH) {
    return false;
  }
  for (let i = 0; i < code.length; i++) {
    if (!SESSION_ALPHABET.includes(code.charAt(i))) return false;
  }
  return true;
}

/** Normalise user input — uppercase + strip whitespace + remap look-alikes. */
export function normaliseSessionCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

/* ------------------------------------------------------------------ */
/* Hash helpers — the URL fragment students paste in.                  */
/* ------------------------------------------------------------------ */

/** Extract a tutor code from the current location hash. `null` if none. */
export function parseTutorHash(hash: string): string | null {
  // Accept #tutor=X8K2P4 (preferred) AND #tutor?code=X8K2P4 (legacy/QR).
  const eq = hash.match(/^#tutor=([A-Za-z0-9]+)/);
  if (eq && eq[1]) {
    const code = normaliseSessionCode(eq[1]);
    return isValidSessionCode(code) ? code : null;
  }
  const q = hash.match(/^#tutor\?(.+)$/);
  if (q && q[1]) {
    const params = new URLSearchParams(q[1]);
    const raw = params.get("code");
    if (raw) {
      const code = normaliseSessionCode(raw);
      return isValidSessionCode(code) ? code : null;
    }
  }
  return null;
}

/** Build the full shareable URL fragment for a teacher's session. */
export function buildTutorHash(code: string): string {
  return `tutor=${code}`;
}

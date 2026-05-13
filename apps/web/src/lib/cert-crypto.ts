/**
 * 🔐 cert-crypto — Ed25519 (preferred) / ECDSA-P256 (fallback) signing for
 * the printable completion certificate.
 *
 * Why two algorithms:
 *   Ed25519 is the right tool — short keys, short signatures, deterministic,
 *   widely audited — but browser support is uneven. Safari shipped it in
 *   late 2024; older Chrome/Firefox builds in the wild still lack it. We
 *   probe at runtime via `crypto.subtle.generateKey({ name: "Ed25519" }, …)`
 *   and fall back to ECDSA on P-256 if the probe rejects. Both are
 *   Web-Crypto-native, no dependency.
 *
 * What this gets you:
 *   The bearer of a printed certificate cannot forge a *different* one
 *   under the same public key without re-stealing the private key out of
 *   another browser. Anyone can verify a printed cert by scanning the QR
 *   code and re-running `verify()` — no server trust required.
 *
 *   This is anti-forgery-by-the-bearer, NOT anti-determined-attacker. The
 *   private key is stored unwrapped in `localStorage`; a malicious script
 *   running in the same origin could exfiltrate it. The certificate is a
 *   personal artifact, not a financial instrument.
 *
 * Storage:
 *   localStorage key `uw:cert-keypair:v1` holds JSON of the exported
 *   raw/PKCS8 bytes and the algorithm tag. The keypair is generated lazily
 *   the first time the certificate is signed.
 *
 * Verification URL:
 *   https://<host>/#verify-cert?p=<b64-payload>&s=<b64-sig>&k=<b64-pubkey>&a=<alg>
 *   `a` is `ed25519` or `ecdsa-p256`. Default is `ed25519` when omitted.
 */
import { log } from "./logger";

export type CertAlg = "ed25519" | "ecdsa-p256";

export type CertPayload = {
  name: string;
  /** ISO timestamp the certificate was signed. */
  date: string;
  /** Lesson ids included in the cert, in completion order. */
  lessons_completed: string[];
  /** Best quiz score 0..1 per lesson id. Omitted entries imply "no quiz". */
  quiz_scores: Record<string, number>;
  /** Random nonce so two signatures of the same dataset differ. */
  nonce: string;
};

export type SignedCert = {
  publicKeyB64: string;
  signatureB64: string;
  payloadB64: string;
  alg: CertAlg;
};

const STORAGE_KEY = "uw:cert-keypair:v1";

// ─── base64 helpers (URL-safe variants for QR friendliness) ───────────────

function bytesToB64(bytes: Uint8Array): string {
  // chunk to avoid blowing the call stack on large payloads (we don't hit
  // 64k here, but be careful anyway)
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64ToBytes(b64: string): Uint8Array {
  const padded =
    b64.replace(/-/g, "+").replace(/_/g, "/") +
    "==".slice(0, (4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToStr(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

// ─── algorithm probe ──────────────────────────────────────────────────────

let cachedAlg: CertAlg | null = null;

/**
 * Probe Ed25519 support once. Most modern browsers return a CryptoKey;
 * older ones throw NotSupportedError. The probed value is cached for the
 * remainder of the session.
 */
async function probeAlg(): Promise<CertAlg> {
  if (cachedAlg) return cachedAlg;
  if (typeof crypto === "undefined" || !crypto.subtle) {
    cachedAlg = "ecdsa-p256";
    return cachedAlg;
  }
  try {
    await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ]);
    cachedAlg = "ed25519";
  } catch {
    cachedAlg = "ecdsa-p256";
  }
  return cachedAlg;
}

/**
 * Returns the algorithm the runtime will use. Useful for the UI to
 * display "signed with Ed25519" vs "signed with ECDSA-P256 (fallback)".
 */
export async function getAlg(): Promise<CertAlg> {
  return probeAlg();
}

// ─── key gen / persistence ────────────────────────────────────────────────

type StoredKey = {
  alg: CertAlg;
  /** raw bytes of the public key (32 for Ed25519, 65 uncompressed SEC1 for P-256) */
  publicKeyB64: string;
  /** PKCS#8 private key bytes */
  privateKeyB64: string;
};

function readStored(): StoredKey | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKey>;
    if (
      (parsed.alg === "ed25519" || parsed.alg === "ecdsa-p256") &&
      typeof parsed.publicKeyB64 === "string" &&
      typeof parsed.privateKeyB64 === "string"
    ) {
      return parsed as StoredKey;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStored(s: StoredKey): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (err) {
    log.warn("[cert-crypto] localStorage write failed", err);
  }
}

/**
 * Re-pack a Uint8Array into one whose underlying buffer is a guaranteed
 * (non-shared) ArrayBuffer. TS 5.7+ narrows `Uint8Array<ArrayBufferLike>`
 * which is incompatible with the `BufferSource` arg of WebCrypto.
 */
function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

async function importPrivateKey(
  alg: CertAlg,
  pkcs8: Uint8Array,
): Promise<CryptoKey> {
  const buf = asBufferSource(pkcs8);
  if (alg === "ed25519") {
    return crypto.subtle.importKey(
      "pkcs8",
      buf,
      { name: "Ed25519" },
      true,
      ["sign"],
    );
  }
  return crypto.subtle.importKey(
    "pkcs8",
    buf,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
}

async function importPublicKey(
  alg: CertAlg,
  raw: Uint8Array,
): Promise<CryptoKey> {
  const buf = asBufferSource(raw);
  if (alg === "ed25519") {
    return crypto.subtle.importKey(
      "raw",
      buf,
      { name: "Ed25519" },
      true,
      ["verify"],
    );
  }
  return crypto.subtle.importKey(
    "raw",
    buf,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
}

async function exportPublicRaw(key: CryptoKey): Promise<Uint8Array> {
  const buf = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(buf);
}

async function exportPrivatePkcs8(key: CryptoKey): Promise<Uint8Array> {
  const buf = await crypto.subtle.exportKey("pkcs8", key);
  return new Uint8Array(buf);
}

/**
 * Get-or-create the local keypair. Generates and persists on first call.
 * Returns the materialised {@link CryptoKey} pair plus the algorithm used.
 */
export async function getOrCreateKey(): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  alg: CertAlg;
  publicKeyB64: string;
}> {
  const stored = readStored();
  if (stored) {
    try {
      const priv = await importPrivateKey(
        stored.alg,
        b64ToBytes(stored.privateKeyB64),
      );
      const pub = await importPublicKey(
        stored.alg,
        b64ToBytes(stored.publicKeyB64),
      );
      return {
        privateKey: priv,
        publicKey: pub,
        alg: stored.alg,
        publicKeyB64: stored.publicKeyB64,
      };
    } catch (err) {
      log.warn("[cert-crypto] stored key import failed; regenerating", err);
    }
  }

  const alg = await probeAlg();
  const keypair = (await (alg === "ed25519"
    ? crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
    : crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      ))) as CryptoKeyPair;

  const publicRaw = await exportPublicRaw(keypair.publicKey);
  const privatePkcs8 = await exportPrivatePkcs8(keypair.privateKey);
  const publicKeyB64 = bytesToB64(publicRaw);
  writeStored({
    alg,
    publicKeyB64,
    privateKeyB64: bytesToB64(privatePkcs8),
  });
  return {
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    alg,
    publicKeyB64,
  };
}

/** Generate a random 16-byte nonce, base64url-encoded. */
export function makeNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return bytesToB64(buf);
}

// ─── sign / verify ────────────────────────────────────────────────────────

function algParams(alg: CertAlg): Algorithm | EcdsaParams {
  if (alg === "ed25519") return { name: "Ed25519" };
  return { name: "ECDSA", hash: { name: "SHA-256" } };
}

/**
 * Sign a payload object. Returns base64url-encoded public key, signature,
 * and canonicalised payload. Order of object keys is enforced via
 * deterministic JSON.stringify so verification re-builds the same bytes.
 */
export async function sign(payload: CertPayload): Promise<SignedCert> {
  const { privateKey, alg, publicKeyB64 } = await getOrCreateKey();
  const canonical = canonicalise(payload);
  const payloadBytes = strToBytes(canonical);
  const sigBuf = await crypto.subtle.sign(
    algParams(alg),
    privateKey,
    asBufferSource(payloadBytes),
  );
  return {
    alg,
    publicKeyB64,
    payloadB64: bytesToB64(payloadBytes),
    signatureB64: bytesToB64(new Uint8Array(sigBuf)),
  };
}

/**
 * Verify a signed certificate. The caller passes the URL-extracted
 * fields; we re-derive the verification key from `publicKeyB64` and the
 * algorithm tag, then re-run the WebCrypto verify primitive. Returns the
 * decoded payload on success, `null` on failure.
 */
export async function verify(input: {
  payloadB64: string;
  signatureB64: string;
  publicKeyB64: string;
  alg?: CertAlg;
}): Promise<{ ok: boolean; payload: CertPayload | null; alg: CertAlg }> {
  const alg: CertAlg = input.alg ?? "ed25519";
  try {
    const pubKey = await importPublicKey(alg, b64ToBytes(input.publicKeyB64));
    const payloadBytes = b64ToBytes(input.payloadB64);
    const sigBytes = b64ToBytes(input.signatureB64);
    const ok = await crypto.subtle.verify(
      algParams(alg),
      pubKey,
      asBufferSource(sigBytes),
      asBufferSource(payloadBytes),
    );
    if (!ok) return { ok: false, payload: null, alg };
    const payload = JSON.parse(bytesToStr(payloadBytes)) as CertPayload;
    return { ok: true, payload, alg };
  } catch (err) {
    log.warn("[cert-crypto] verify failed", err);
    return { ok: false, payload: null, alg };
  }
}

/**
 * Build the share/verification URL. `origin` is taken from `window.location`
 * unless overridden (so tests can pass an explicit one).
 */
export function buildVerifyUrl(cert: SignedCert, origin?: string): string {
  const root =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const params = new URLSearchParams();
  params.set("p", cert.payloadB64);
  params.set("s", cert.signatureB64);
  params.set("k", cert.publicKeyB64);
  if (cert.alg !== "ed25519") params.set("a", cert.alg);
  return `${root}/#verify-cert?${params.toString()}`;
}

/**
 * Parse the URL of a `#verify-cert` hash route and return the encoded
 * fields. Returns `null` if any required field is missing.
 */
export function parseVerifyHash(hash: string): {
  payloadB64: string;
  signatureB64: string;
  publicKeyB64: string;
  alg: CertAlg;
} | null {
  const qIdx = hash.indexOf("?");
  if (qIdx === -1) return null;
  const params = new URLSearchParams(hash.slice(qIdx + 1));
  const p = params.get("p");
  const s = params.get("s");
  const k = params.get("k");
  if (!p || !s || !k) return null;
  const rawAlg = params.get("a");
  const alg: CertAlg = rawAlg === "ecdsa-p256" ? "ecdsa-p256" : "ed25519";
  return { payloadB64: p, signatureB64: s, publicKeyB64: k, alg };
}

/**
 * Stable JSON serialisation — keys emitted in fixed order. The default
 * `JSON.stringify` is already deterministic for these primitives, but we
 * sort `quiz_scores` keys explicitly so a verifier never sees a different
 * canonical form than the signer.
 */
function canonicalise(p: CertPayload): string {
  const orderedScores: Record<string, number> = {};
  for (const key of Object.keys(p.quiz_scores).sort()) {
    const v = p.quiz_scores[key];
    if (typeof v === "number") orderedScores[key] = v;
  }
  return JSON.stringify({
    name: p.name,
    date: p.date,
    lessons_completed: p.lessons_completed,
    quiz_scores: orderedScores,
    nonce: p.nonce,
  });
}

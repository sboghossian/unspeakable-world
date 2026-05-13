import { useEffect, useState } from "react";
import {
  parseVerifyHash,
  verify,
  type CertAlg,
  type CertPayload,
} from "../../lib/cert-crypto";
import { LESSONS } from "../curriculum/lessons";
import { navigate } from "../../router";

/**
 * 🔍 CertificateVerifyPanel — full-page verifier reached at `#verify-cert?…`.
 *
 * Anyone can scan the QR on a printed certificate, land here, and
 * re-verify the signature with no server in the loop. We never call
 * home: the public key, signature, and payload are all in the URL, and
 * the verification primitive (`crypto.subtle.verify`) runs entirely in
 * the visitor's browser. So a printed certificate can be authenticated
 * by anyone with a phone, no trust in the printer required.
 *
 * Pass states:
 *   parsing     → URL params look malformed
 *   verifying   → Web Crypto is computing
 *   valid       → ok=true: render the decoded payload + lesson titles
 *   invalid     → ok=false: explain what could have gone wrong
 */

type VerifyState =
  | { kind: "parsing" }
  | { kind: "verifying" }
  | {
      kind: "valid";
      payload: CertPayload;
      alg: CertAlg;
      publicKeyB64: string;
    }
  | { kind: "invalid"; reason: string; alg: CertAlg };

export function CertificateVerifyPanel() {
  const [state, setState] = useState<VerifyState>({ kind: "parsing" });

  useEffect(() => {
    let cancelled = false;
    const params = parseVerifyHash(window.location.hash);
    if (!params) {
      setState({
        kind: "invalid",
        reason:
          "Missing required parameters (payload, signature, public key). The link may have been truncated or hand-edited.",
        alg: "ed25519",
      });
      return;
    }
    setState({ kind: "verifying" });
    void verify(params).then((result) => {
      if (cancelled) return;
      if (result.ok && result.payload) {
        setState({
          kind: "valid",
          payload: result.payload,
          alg: result.alg,
          publicKeyB64: params.publicKeyB64,
        });
      } else {
        setState({
          kind: "invalid",
          reason:
            "Signature did not match the payload under the embedded public key. The certificate has been altered, or the key in the QR is not the one that signed it.",
          alg: result.alg,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative min-h-full w-full overflow-y-auto bg-space-950">
      <div className="mx-auto max-w-2xl px-6 py-12 text-white/90">
        <button
          type="button"
          onClick={() => navigate("landing")}
          className="mb-8 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-white/55 transition hover:text-white"
        >
          ← The Unspeakable World
        </button>

        <header className="mb-8 border-b border-white/10 pb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/85">
            Certificate Verification
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-wide text-white/95">
            Did this certificate come from this browser?
          </h1>
          <p className="mt-3 font-display text-[14px] leading-relaxed text-white/65">
            Every Unspeakable World certificate is signed with a private
            key generated and stored only on the issuing browser. The
            public key + signature live inside the QR code on the printed
            page. This page recomputes the signature locally — no server
            call — so anyone can confirm a printed copy hasn&apos;t been
            altered without trusting the printer.
          </p>
        </header>

        {state.kind === "parsing" || state.kind === "verifying" ? (
          <PendingCard />
        ) : state.kind === "valid" ? (
          <ValidCard
            payload={state.payload}
            alg={state.alg}
            publicKeyB64={state.publicKeyB64}
          />
        ) : (
          <InvalidCard reason={state.reason} alg={state.alg} />
        )}

        <Explainer />
      </div>
    </main>
  );
}

function PendingCard() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-white/10 bg-white/5 p-6 font-display text-[14px] text-white/70"
    >
      Recomputing signature in your browser…
    </div>
  );
}

function ValidCard({
  payload,
  alg,
  publicKeyB64,
}: {
  payload: CertPayload;
  alg: CertAlg;
  publicKeyB64: string;
}) {
  const lessonTitleById = new Map(LESSONS.map((l) => [l.id, l.title]));
  const titles = payload.lessons_completed.map(
    (id) => lessonTitleById.get(id) ?? id,
  );
  const issued = formatDate(payload.date);
  return (
    <section
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-6"
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25 font-mono text-[10px] font-semibold text-emerald-200">
          ✓
        </span>
        <h2 className="font-display text-xl font-semibold text-emerald-100">
          Signature valid
        </h2>
      </div>
      <p className="mb-5 font-display text-[13px] leading-relaxed text-emerald-50/80">
        This certificate was signed by the browser that holds the
        matching private key. Its contents have not been altered since
        issuance.
      </p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px] text-white/85">
        <dt className="text-white/45">Name</dt>
        <dd className="font-display text-[14px] text-white">{payload.name}</dd>
        <dt className="text-white/45">Issued</dt>
        <dd>{issued}</dd>
        <dt className="text-white/45">Lessons</dt>
        <dd>
          {payload.lessons_completed.length} of {LESSONS.length}
        </dd>
        <dt className="text-white/45">Algorithm</dt>
        <dd>{alg === "ed25519" ? "Ed25519" : "ECDSA-P256 (fallback)"}</dd>
        <dt className="text-white/45">Public key</dt>
        <dd className="truncate text-white/60">{publicKeyB64.slice(0, 32)}…</dd>
      </dl>
      <ol className="mt-6 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {titles.map((title, i) => {
          const id = payload.lessons_completed[i] ?? "";
          const score = payload.quiz_scores[id];
          return (
            <li
              key={id || `${i}-${title}`}
              className="flex items-baseline gap-2 border-b border-white/5 pb-1 font-mono text-[11px] text-white/80"
            >
              <span className="text-white/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate font-display text-white/90">
                {title}
              </span>
              {typeof score === "number" && (
                <span className="text-emerald-300/85">
                  {Math.round(score * 100)}%
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function InvalidCard({ reason, alg }: { reason: string; alg: CertAlg }) {
  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-red-400/40 bg-red-500/5 p-6"
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-400/25 font-mono text-[10px] font-semibold text-red-200">
          ✗
        </span>
        <h2 className="font-display text-xl font-semibold text-red-100">
          Signature did not verify
        </h2>
      </div>
      <p className="mb-3 font-display text-[13px] leading-relaxed text-red-50/85">
        {reason}
      </p>
      <p className="font-mono text-[11px] text-white/50">
        Tried algorithm: {alg === "ed25519" ? "Ed25519" : "ECDSA-P256"}.
      </p>
    </section>
  );
}

function Explainer() {
  return (
    <section className="mt-12 rounded-xl border border-white/10 bg-white/[0.025] p-6">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
        What this means
      </div>
      <ul className="space-y-2 font-display text-[13px] leading-relaxed text-white/75">
        <li>
          The QR code on the printed certificate contains three pieces:
          the learner&apos;s payload (name, lessons, date, nonce), a
          signature over that payload, and the public key the signer used.
        </li>
        <li>
          When you scan, your browser re-runs the signature check using
          Web Crypto. No data is sent to us — and we don&apos;t need to
          be online for verification to work.
        </li>
        <li>
          A certificate proves the holder ran the curriculum in a
          specific browser. It does not prove identity. We never asked
          for an email or an account.
        </li>
        <li>
          Anyone with the private key can sign new certificates under the
          same public key, so this is anti-forgery-by-the-bearer, not
          anti-determined-attacker. The private key is stored in
          localStorage; clearing browser data invalidates future signings
          but already-printed certs stay verifiable.
        </li>
      </ul>
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

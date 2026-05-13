import { useEffect, useMemo, useState } from "react";
import { BUTTON, cn } from "../../lib/design-tokens";
import {
  allProgress,
  getCertificateData,
  getCertificateName,
  setCertificateName,
  useLessonProgress,
} from "../../lib/lesson-progress";
import { LESSONS } from "../curriculum/lessons";
import {
  buildVerifyUrl,
  getAlg,
  makeNonce,
  sign,
  type CertAlg,
  type SignedCert,
} from "../../lib/cert-crypto";
import { makeQrSvg } from "../../lib/qr";
import { log } from "../../lib/logger";
import { EmptyState } from "./EmptyState";

/**
 * 🏅 CertificatePanel — printable completion certificate.
 *
 * Opens as a full-screen modal when the learner has completed 100% of the
 * curriculum. Asks for a display name (no email, no account) once, then
 * renders an A4-portrait certificate styled for both screen and print.
 *
 * Every issued certificate is signed with a per-browser Ed25519 keypair
 * (or ECDSA-P256 fallback on browsers without Ed25519), with the public
 * key + signature embedded in a QR code at the bottom right. Anyone can
 * scan the QR and re-verify the signature locally at `#verify-cert` —
 * no server in the loop. See {@link useSignedCert} for the signing flow
 * and `cert-crypto.ts` for the cryptographic details.
 *
 * Export uses `window.print()` so we don't pull in a PDF library. The
 * Tailwind `print:` variants hide every chrome element and let the
 * browser produce a clean PDF via "Save as PDF" in the system print
 * dialog.
 */

type Props = {
  onClose: () => void;
};

export function CertificatePanel({ onClose }: Props) {
  // Subscribe to progress so the cert refreshes if the user opens it
  // mid-completion or re-runs a lesson while the modal is open.
  useLessonProgress();
  const [name, setName] = useState<string>(() => getCertificateName());
  const [committed, setCommitted] = useState<boolean>(
    () => getCertificateName().length > 0,
  );

  const data = useMemo(
    () => getCertificateData(committed ? name : undefined),
    [name, committed],
  );

  const signature = useSignedCert({
    committed,
    name: data.name,
    lessonsCompleted: data.lessonsCompleted,
  });

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCertificateName(trimmed);
    setName(trimmed);
    setCommitted(true);
  };

  return (
    <div
      className="cert-print-wrap fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur print:static print:bg-white print:p-0 print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-label="Certificate of completion"
    >
      <button
        type="button"
        onClick={onClose}
        title="Close"
        aria-label="Close certificate"
        className="absolute right-4 top-4 z-[80] inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-space-950/80 text-white/85 backdrop-blur transition hover:bg-white/10 hover:text-white print:hidden"
      >
        ✕
      </button>

      {data.lessonsCompleted.length === 0 ? (
        <div className="w-[min(440px,94vw)]">
          <EmptyState
            icon="🏅"
            title="Your certificate will live here"
            body="Complete any curriculum lesson to start earning your Unspeakable-World cert. It's locally signed (Ed25519), printable, and verifiable from a QR code — no account needed."
            tone="emerald"
            cta={{ label: "Open lessons", onClick: onClose }}
          />
        </div>
      ) : !committed ? (
        <NamePrompt
          name={name}
          onChange={setName}
          onSave={handleSaveName}
          onSkip={() => {
            setCertificateName("Astronomer");
            setName("Astronomer");
            setCommitted(true);
          }}
        />
      ) : (
        <CertificateSheet
          name={data.name || "Astronomer"}
          lessonsCompleted={data.lessonsCompleted}
          dateRange={data.dateRange}
          signature={signature}
          onRename={() => setCommitted(false)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}

function NamePrompt({
  name,
  onChange,
  onSave,
  onSkip,
}: {
  name: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="w-[min(440px,94vw)] rounded-2xl border border-emerald-400/40 bg-space-950/95 p-6 shadow-2xl backdrop-blur">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/85">
        Curriculum complete
      </div>
      <h2 className="mb-3 font-display text-2xl text-white/95">
        Your certificate is ready
      </h2>
      <p className="mb-5 font-display text-[14px] leading-relaxed text-white/75">
        We never asked for an account, so we don&apos;t know your name.
        Type whatever you&apos;d like printed on the certificate.
      </p>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/55">
        Display name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
        }}
        placeholder="Ada Lovelace"
        maxLength={64}
        autoFocus
        className="mb-4 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2 font-display text-[14px] text-white/95 outline-none placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-white/[0.06]"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex h-8 items-center rounded-md border border-white/15 px-3 font-mono text-[10px] uppercase tracking-widest text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={name.trim().length === 0}
          className={cn(
            "inline-flex h-8 items-center rounded-md px-3 font-mono text-[10px] uppercase tracking-widest",
            BUTTON.primary,
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          Make my certificate →
        </button>
      </div>
    </div>
  );
}

type SignatureState =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "ready"; cert: SignedCert; verifyUrl: string; alg: CertAlg }
  | { kind: "error"; reason: string };

/**
 * Sign the certificate payload via Web Crypto. Re-runs when the name
 * commits or the set of completed lessons changes. We rebuild a fresh
 * `nonce` per sign so two prints of the same payload don't share a
 * signature byte-for-byte — useful if a learner re-prints after an
 * accidental name typo.
 */
function useSignedCert(input: {
  committed: boolean;
  name: string;
  lessonsCompleted: Array<{ id: string; title: string; firstCompletedAt: string }>;
}): SignatureState {
  const [state, setState] = useState<SignatureState>({ kind: "idle" });
  const lessonIdsKey = input.lessonsCompleted.map((l) => l.id).join(",");

  useEffect(() => {
    if (!input.committed) {
      setState({ kind: "idle" });
      return;
    }
    if (typeof crypto === "undefined" || !crypto.subtle) {
      setState({
        kind: "error",
        reason: "Web Crypto is unavailable in this browser.",
      });
      return;
    }
    let cancelled = false;
    setState({ kind: "signing" });
    const progress = allProgress();
    const quizScores: Record<string, number> = {};
    for (const l of input.lessonsCompleted) {
      const best = progress[l.id]?.bestScore;
      if (typeof best === "number") quizScores[l.id] = best;
    }
    const payload = {
      name: input.name,
      date: new Date().toISOString(),
      lessons_completed: input.lessonsCompleted.map((l) => l.id),
      quiz_scores: quizScores,
      nonce: makeNonce(),
    };
    (async () => {
      try {
        const cert = await sign(payload);
        const verifyUrl = buildVerifyUrl(cert);
        const alg = await getAlg();
        if (cancelled) return;
        setState({ kind: "ready", cert, verifyUrl, alg });
      } catch (err) {
        log.warn("[cert] sign failed", err);
        if (cancelled) return;
        setState({
          kind: "error",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Key on lesson set + name; lesson titles don't enter the signed bytes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.committed, input.name, lessonIdsKey]);

  return state;
}

function CertificateSheet({
  name,
  lessonsCompleted,
  dateRange,
  signature,
  onRename,
  onPrint,
}: {
  name: string;
  lessonsCompleted: Array<{ id: string; title: string; firstCompletedAt: string }>;
  dateRange: { start: string; end: string };
  signature: SignatureState;
  onRename: () => void;
  onPrint: () => void;
}) {
  const startDate = formatDate(dateRange.start);
  const endDate = formatDate(dateRange.end);
  const todayDate = formatDate(new Date().toISOString());
  const totalLessons = LESSONS.length;

  return (
    <div className="flex w-full flex-col items-center gap-4 print:gap-0">
      <div
        // A4 portrait at ~96dpi ≈ 794 × 1123 px.
        className="cert-sheet relative mx-auto flex h-[1123px] w-[794px] max-w-full flex-col border-[12px] border-double border-emerald-700 bg-[#fbf6e8] p-12 font-display text-stone-900 shadow-2xl print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
      >
        {/* Decorative top label */}
        <div className="mx-auto mb-2 font-mono text-[11px] uppercase tracking-[0.45em] text-emerald-800">
          The Unspeakable World
        </div>
        <div className="mx-auto mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">
          A browser planetarium · MIT-licensed
        </div>

        <div className="mb-4 text-center font-display text-4xl font-semibold tracking-wide text-stone-800">
          Certificate of Completion
        </div>
        <div className="mx-auto mb-10 h-px w-40 bg-emerald-700/40" />

        <div className="mb-2 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-stone-500">
          This certifies that
        </div>
        <div className="mb-6 text-center font-display text-5xl font-semibold tracking-wide text-emerald-900">
          {name}
        </div>

        <p className="mx-auto mb-8 max-w-xl text-center font-display text-[15px] leading-relaxed text-stone-700">
          has completed all {totalLessons} lessons of{" "}
          <span className="font-semibold text-stone-900">
            The Unspeakable World — Astronomy Fundamentals
          </span>
          , a guided tour from the surface of Earth to the cosmic web.
        </p>

        <div className="cert-lessons-grid mb-6 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          {lessonsCompleted.map((l, i) => (
            <div
              key={l.id}
              className="flex items-baseline gap-2 border-b border-stone-300/60 pb-1"
            >
              <span className="font-mono text-[10px] text-stone-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate text-stone-800">{l.title}</span>
              <span className="font-mono text-[9px] text-stone-400">
                {formatDate(l.firstCompletedAt)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-8 pt-8">
          <div>
            <div className="mb-1 border-b border-stone-700/70" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Awarded · {todayDate}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-stone-500">
              Coursework dates {startDate} — {endDate}
            </div>
            <CertSignatureCaption signature={signature} />
          </div>
          <CertQrBlock signature={signature} />
        </div>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={onRename}
          className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 font-mono text-[10px] uppercase tracking-widest text-white/85 transition hover:bg-white/15"
        >
          Edit name
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={cn(
            "inline-flex h-9 items-center rounded-md px-4 font-mono text-[11px] uppercase tracking-widest",
            BUTTON.primary,
          )}
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}

/**
 * Bottom-left caption under the awarded date — tells the human reading
 * the printed cert what the QR is, which algorithm signed it, and the
 * fallback story if Ed25519 wasn't available in the issuing browser.
 */
function CertSignatureCaption({ signature }: { signature: SignatureState }) {
  if (signature.kind === "idle" || signature.kind === "signing") {
    return (
      <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-stone-400">
        Signing in browser…
      </div>
    );
  }
  if (signature.kind === "error") {
    return (
      <div className="mt-2 font-mono text-[9px] uppercase tracking-widest text-red-700/70">
        Unsigned — {signature.reason}
      </div>
    );
  }
  const algLabel =
    signature.alg === "ed25519" ? "Ed25519" : "ECDSA-P256 (fallback)";
  return (
    <div className="mt-2 space-y-0.5 font-mono text-[9px] uppercase tracking-widest text-stone-500">
      <div>Signature · {algLabel}</div>
      <div className="break-all text-[8px] tracking-normal text-stone-400">
        pubkey {signature.cert.publicKeyB64.slice(0, 24)}…
      </div>
    </div>
  );
}

/**
 * Bottom-right QR block. The QR encodes the verification URL — anyone
 * can scan it with a phone camera, land on `#verify-cert`, and re-run
 * the signature check in their own browser, no server in the loop.
 */
function CertQrBlock({ signature }: { signature: SignatureState }) {
  const qrHtml = useMemo<string | null>(() => {
    if (signature.kind !== "ready") return null;
    try {
      return makeQrSvg(signature.verifyUrl, { cellSize: 4, margin: 2 });
    } catch (err) {
      log.warn("[cert] QR render failed", err);
      return null;
    }
  }, [signature]);

  return (
    <div className="cert-qr-block flex flex-col items-end gap-1">
      <div className="h-[140px] w-[140px] rounded-md border border-stone-300 bg-white p-1.5">
        {qrHtml ? (
          // QR SVG is generated from a trusted local module — no
          // user-controlled HTML reaches `dangerouslySetInnerHTML`.
          <div
            aria-label="Verification QR code"
            className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrHtml }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[9px] uppercase tracking-widest text-stone-400">
            {signature.kind === "signing" ? "Signing…" : "No QR"}
          </div>
        )}
      </div>
      <div className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
        Scan to verify
      </div>
    </div>
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

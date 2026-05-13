import { useEffect, useState } from "react";
import {
  hydrateRuntimeSurveys,
  listRuntimeSurveys,
  probeHipsRoot,
  registerCustomHips,
  removeRuntimeSurvey,
  subscribeRuntimeSurveys,
} from "../power-user/custom-hips";
import { log } from "../../lib/logger";

/**
 * Custom HiPS URL paster.
 *
 * The user pastes a HiPS root URL; we probe `<root>/properties` and
 * register the survey into the runtime override map. Activated surveys
 * appear in the wavelength bar with a "user" badge (the scene's
 * `setOverlay` consults the runtime map first).
 */

type Props = {
  /** Optional callback so the host can immediately switch the overlay. */
  onActivate?: (surveyId: string) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "probing" }
  | { kind: "valid"; label: string; surveyId: string }
  | { kind: "error"; message: string };

export function CustomHipsPanel({ onActivate }: Props) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [surveys, setSurveys] = useState(listRuntimeSurveys());

  // Hydrate persisted URLs on mount, and stay subscribed for live updates.
  useEffect(() => {
    void hydrateRuntimeSurveys().catch((err) =>
      log.warn("[custom-hips] hydrate failed", err),
    );
    return subscribeRuntimeSurveys(setSurveys);
  }, []);

  const onProbe = async () => {
    setStatus({ kind: "probing" });
    try {
      const props = await probeHipsRoot(url);
      const survey = registerCustomHips(url, props);
      setStatus({ kind: "valid", label: survey.label, surveyId: survey.id });
      onActivate?.(survey.id);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      <p className="text-xs text-white/60 leading-relaxed">
        Paste any HiPS root URL (e.g. <code className="font-mono text-white/80">https://alasky.cds.unistra.fr/CFHT/MegaCam</code>).
        We probe <code className="font-mono">/properties</code> to read the
        tile format and max order, then register it as a runtime survey you
        can activate from the wavelength bar.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/SomeHiPS"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="url"
          className="min-h-[44px] flex-1 basis-[200px] rounded-md border border-white/10 bg-space-950/80 px-2 py-1.5 font-mono text-xs text-white placeholder:text-white/30 outline-none focus:border-plasma-500/60"
        />
        <button
          type="button"
          onClick={() => void onProbe()}
          disabled={!url.trim() || status.kind === "probing"}
          className="min-h-[44px] rounded-md border border-plasma-500/40 bg-plasma-500/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-plasma-300 transition hover:bg-plasma-500/25 disabled:opacity-40"
        >
          {status.kind === "probing" ? "probing…" : "paste + probe"}
        </button>
      </div>

      {status.kind === "valid" && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 font-mono text-xs text-emerald-200">
          ✓ {status.label} registered (id: {status.surveyId})
        </div>
      )}
      {status.kind === "error" && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-xs text-rose-200">
          ✗ {status.message}
        </div>
      )}

      {surveys.length > 0 && (
        <div className="mt-1">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            your surveys
          </div>
          <ul className="flex flex-col gap-1">
            {surveys.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-xs"
              >
                <div className="flex flex-col">
                  <span className="text-white/90">
                    {s.label}{" "}
                    <span className="ml-1 rounded-sm border border-cyan-400/40 bg-cyan-400/10 px-1 py-0.5 text-[9px] uppercase tracking-widest text-cyan-200">
                      user
                    </span>
                  </span>
                  <span className="text-white/40 text-[10px]">
                    {s.baseUrl} · max order {s.maxOrder} · {s.format}
                  </span>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onActivate?.(s.id)}
                    className="min-h-[36px] rounded-sm border border-plasma-500/30 bg-plasma-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-plasma-300 hover:bg-plasma-500/20"
                  >
                    activate
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRuntimeSurvey(s.id)}
                    className="min-h-[36px] rounded-sm border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-rose-300 hover:bg-rose-500/20"
                  >
                    remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

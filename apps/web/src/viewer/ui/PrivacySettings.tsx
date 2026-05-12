import { useConsent } from "../../lib/consent";
import { setOptOut } from "../../lib/telemetry";

/**
 * 🔐 Privacy settings panel.
 *
 * Stand-alone component meant to be mounted from SettingsPanel later
 * (out of scope for the current task — wiring it in is risky because
 * SettingsPanel renders a lot of disparate state). The two checkboxes
 * map directly to the consent record at `uw:consent:v1`.
 */
export function PrivacySettings() {
  const [consent, save] = useConsent();
  const telemetry = consent?.telemetry === true;
  const errorTracking = consent?.errorTracking === true;

  function update(next: { telemetry: boolean; errorTracking: boolean }) {
    save(next);
    setOptOut(!next.telemetry);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-space-950/80 p-3">
      <div className="mb-2">
        <div className="font-display text-sm text-white/95">Privacy</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          opt-in analytics · opt-in crash reports
        </div>
      </div>
      <p className="mb-3 font-mono text-[11px] leading-relaxed text-white/60">
        We never collect personal data. Toggle either signal off at any time.
      </p>

      <label className="mb-2 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={telemetry}
          onChange={(e) =>
            update({ telemetry: e.target.checked, errorTracking })
          }
          className="mt-[3px] h-3.5 w-3.5 accent-emerald-400"
        />
        <div>
          <div className="font-mono text-[12px] text-white/90">
            Usage analytics
          </div>
          <div className="font-mono text-[10px] text-white/55">
            Anonymous events about which layers you toggle, so we can prioritise
            what to ship next.
          </div>
        </div>
      </label>

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={errorTracking}
          onChange={(e) =>
            update({ telemetry, errorTracking: e.target.checked })
          }
          className="mt-[3px] h-3.5 w-3.5 accent-emerald-400"
        />
        <div>
          <div className="font-mono text-[12px] text-white/90">
            Crash reports
          </div>
          <div className="font-mono text-[10px] text-white/55">
            Sends the stack trace + browser version when something throws.
            Helps us fix what we can&apos;t reproduce.
          </div>
        </div>
      </label>
    </div>
  );
}

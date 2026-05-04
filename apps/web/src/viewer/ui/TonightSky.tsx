import { useState } from "react";

/**
 * Tonight's-sky button — bottom-right next to the wavelength bar.
 *
 * Two-step flow (mobile-friendly per Day 0 research):
 *  1. User clicks "Tonight's sky" → we explain why we need their location.
 *  2. User clicks "Allow" → browser prompts for Geolocation → we fly the
 *     camera to their zenith direction.
 *
 * We never auto-prompt — Safari blocks it and it's bad UX. The chip stays
 * available so the user can re-snap to zenith after dragging away.
 *
 * Day 8 cut: location-only (no gyro tracking yet — Day 8.C stretch goal).
 */

type Props = {
  onZenith: (lat: number, lonEast: number) => void;
  /** Most recent location, displayed once granted. */
  location: { lat: number; lon: number } | null;
  onLocationFix: (lat: number, lonEast: number) => void;
};

type Status = "idle" | "asking" | "denied" | "unsupported" | "ok";

export function TonightSky({ onZenith, location, onLocationFix }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>(location ? "ok" : "idle");
  const [manual, setManual] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        onLocationFix(lat, lon);
        onZenith(lat, lon);
        setStatus("ok");
        setOpen(false);
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  const handleClick = () => {
    if (location && status === "ok") {
      // Re-snap with cached location, no prompt.
      onZenith(location.lat, location.lon);
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-violet-300 backdrop-blur transition hover:bg-violet-500/20"
        title={
          location
            ? "Re-snap camera to your zenith"
            : "See the sky from your location right now"
        }
      >
        <span className="md:hidden">↑</span>
        <span className="hidden md:inline">↑ tonight's sky</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-white/10 bg-space-950/95 p-4 backdrop-blur">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/80">
            tonight's sky
          </div>
          <p className="text-sm text-white/75">
            See the sky as it appears straight up from where you are right now.
          </p>
          <p className="mt-2 text-xs text-white/50">
            We use your browser's geolocation to compute your zenith direction.
            Coordinates never leave your device — this is pure client math.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={requestLocation}
              disabled={status === "asking"}
              className="rounded-lg bg-violet-500 px-3 py-1.5 text-sm font-semibold text-space-950 transition hover:bg-violet-400 disabled:opacity-60"
            >
              {status === "asking" ? "Asking…" : "Use my location"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {status === "denied" && (
            <p className="mt-3 text-xs text-amber-300/80">
              Permission denied. You can still click "Cancel" and explore — or
              re-enable location in your browser settings to try again.
            </p>
          )}
          {status === "unsupported" && (
            <p className="mt-3 text-xs text-amber-300/80">
              Geolocation isn't available in this browser.
            </p>
          )}

          <div className="mt-3 border-t border-white/5 pt-3">
            {!manual ? (
              <button
                type="button"
                onClick={() => setManual(true)}
                className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-violet-300"
              >
                or enter coordinates manually →
              </button>
            ) : (
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  manual coordinates
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="lat (e.g. 48.8566)"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    placeholder="lon (e.g. 2.3522)"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                  />
                </div>
                {manualError && (
                  <div className="text-[10px] text-amber-300/80">{manualError}</div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const lat = parseFloat(manualLat);
                      const lon = parseFloat(manualLon);
                      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
                        setManualError("Latitude must be between -90 and 90.");
                        return;
                      }
                      if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
                        setManualError("Longitude must be between -180 and 180.");
                        return;
                      }
                      setManualError(null);
                      onLocationFix(lat, lon);
                      onZenith(lat, lon);
                      setStatus("ok");
                      setOpen(false);
                    }}
                    className="rounded-md bg-violet-500 px-2.5 py-1 text-xs font-semibold text-space-950 hover:bg-violet-400"
                  >
                    Set
                  </button>
                  <button
                    type="button"
                    onClick={() => setManual(false)}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 hover:bg-white/10"
                  >
                    Back
                  </button>
                </div>
                <div className="text-[10px] text-white/30">
                  Decimal degrees · north + east positive · stored only in this
                  browser's localStorage.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

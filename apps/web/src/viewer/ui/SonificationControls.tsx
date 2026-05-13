import { useEffect, useRef, useState } from "react";

import { log } from "../../lib/logger";
import { useIsMobile } from "../../lib/use-is-mobile";
import { useExtraLayerEnabled } from "../extra-layers/state";
import {
  MAX_MASTER_GAIN,
  type EngineState,
  type InstrumentId,
  type SonificationEngine,
} from "../sonification/engine";
import { SCALES, type ScaleId } from "../sonification/key";
import type { ExtraLayersHost } from "./ExtraLayersPanel";

const LAYER_ID = "sonification";

export type SonificationHost = ExtraLayersHost & {
  getExtraLayerApi(id: string): unknown;
  ensureExtraLayerLoaded(id: string): Promise<void>;
};

type Props = {
  scene: SonificationHost | null;
};

type SonificationApiShape = {
  getEngine: () => SonificationEngine;
};

function isSonificationApi(v: unknown): v is SonificationApiShape {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.getEngine === "function";
}

const INSTRUMENT_DEFS: ReadonlyArray<{
  id: InstrumentId;
  label: string;
  hint: string;
}> = [
  { id: "drone", label: "Drone", hint: "Bright star pad" },
  { id: "pulsarKick", label: "Kick", hint: "Pulsar period" },
  { id: "bell", label: "Bell", hint: "Messier / DSO" },
  { id: "gwSwell", label: "Swell", hint: "GW chirp" },
  { id: "meteorRadar", label: "Radar", hint: "Meteor pings (live ZHR)" },
];

/**
 * 🎶 Sonification Controls — appears as a top-bar pill when the
 * sonification extra layer is toggled on. Mute-by-default; the user
 * must press ▶ to start audio (autoplay-policy compliant).
 */
export function SonificationControls({ scene }: Props) {
  const enabled = useExtraLayerEnabled(LAYER_ID);
  const engineRef = useRef<SonificationEngine | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EngineState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  // Resolve the engine after the layer module loads.
  useEffect(() => {
    if (!enabled || !scene) {
      engineRef.current = null;
      setState(null);
      return;
    }
    let cancelled = false;
    const wire = async () => {
      try {
        await scene.ensureExtraLayerLoaded(LAYER_ID);
      } catch (err) {
        log.warn("[sonification] ensureLoaded failed", err);
      }
      if (cancelled) return;
      const tryWire = (): boolean => {
        const api = scene.getExtraLayerApi(LAYER_ID);
        if (!isSonificationApi(api)) return false;
        const eng = api.getEngine();
        engineRef.current = eng;
        setState(eng.getState());
        return true;
      };
      if (!tryWire()) {
        const id = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(id);
            return;
          }
          if (tryWire()) window.clearInterval(id);
        }, 250);
        window.setTimeout(() => window.clearInterval(id), 3000);
      }
    };
    void wire();
    return () => {
      cancelled = true;
      engineRef.current = null;
    };
  }, [enabled, scene]);

  // Subscribe to engine state updates so toggles re-render the UI.
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    setState(eng.getState());
    const unsub = eng.subscribe((s) => setState(s));
    return () => {
      unsub();
    };
  }, [enabled, state === null]);

  // Close popover on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!enabled) return null;

  const playing = state?.isPlaying === true;

  const togglePlay = () => {
    const eng = engineRef.current;
    if (!eng) return;
    if (playing) {
      eng.pause();
    } else {
      void eng.play().then((ok) => {
        if (!ok) log.warn("[sonification] play() refused by browser");
      });
    }
  };

  const setInstrument = (id: InstrumentId, muted: boolean) => {
    engineRef.current?.setInstrumentMuted(id, muted);
  };

  const setScale = (id: ScaleId) => {
    engineRef.current?.setScale(id);
  };

  const setTempo = (bpm: number) => {
    engineRef.current?.setTempo(bpm);
  };

  const setVolume = (v: number) => {
    engineRef.current?.setMasterGain(v);
  };

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto relative flex items-center gap-1.5 rounded-lg border border-amber-300/30 bg-space-950/70 px-2 py-1 backdrop-blur"
    >
      <button
        type="button"
        onClick={togglePlay}
        title={playing ? "Pause sonification" : "Play sonification"}
        aria-pressed={playing}
        className={`min-h-[36px] min-w-[36px] rounded-md border px-2 py-0.5 font-mono text-xs transition ${
          playing
            ? "border-amber-300/50 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25"
            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
        }`}
      >
        {playing ? "⏸" : "▶"}{" "}
        <span className="hidden sm:inline">
          {playing ? "sonifying" : "play sky"}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Sonification settings"
        aria-expanded={open}
        className="min-h-[36px] min-w-[36px] rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/80 transition hover:bg-white/10"
      >
        🎚
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Sonification settings"
          className={
            isMobile
              ? // Mobile: full-width sheet anchored to the bottom-right of
                // the trigger pill. Constrain height to viewport so the
                // sticky play/pause footer is always visible.
                "fixed right-2 top-12 z-30 flex max-h-[calc(100dvh-60px)] w-[calc(100vw-16px)] max-w-[380px] flex-col rounded-lg border border-white/10 bg-space-950/95 shadow-2xl backdrop-blur"
              : "absolute right-0 top-9 z-30 w-[min(320px,92vw)] rounded-lg border border-white/10 bg-space-950/95 p-3 shadow-2xl backdrop-blur"
          }
        >
          {/* Top: master volume — always visible. */}
          <div className={isMobile ? "border-b border-white/10 p-3" : ""}>
            <div className="pb-2 font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
              Sky Sonification · muted by default
            </div>
            <label className="block">
              <div className="flex items-baseline justify-between font-mono text-[10px] text-white/55">
                <span>Master volume</span>
                <span>
                  {Math.round(((state?.masterGain ?? 0) / MAX_MASTER_GAIN) * 100)}
                  %
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={MAX_MASTER_GAIN}
                step={0.01}
                value={state?.masterGain ?? 0}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Master volume"
                className="h-11 w-full accent-amber-300"
              />
            </label>
          </div>

          {/* Middle: instrument list — vertical on mobile, two-up grid
              on desktop. Each row is ≥44 px tall so it's tap-friendly. */}
          <div
            className={
              isMobile
                ? "flex-1 overflow-y-auto p-3"
                : "mb-2"
            }
          >
            <div className="pb-1 font-mono text-[10px] text-white/55">
              Instruments
            </div>
            <div
              className={isMobile ? "flex flex-col gap-1.5" : "grid grid-cols-2 gap-1"}
            >
              {INSTRUMENT_DEFS.map((inst) => {
                const muted = state?.instrumentMuted[inst.id] === true;
                if (isMobile) {
                  // Mobile row: label + hint + big toggle pill. We display
                  // the toggle as a switch-style chip (≥44 px) so thumbs
                  // can hit it without zoom. Per-instrument volume slider
                  // is intentionally skipped — see deliverable note.
                  return (
                    <div
                      key={inst.id}
                      className={`flex items-center justify-between gap-2 rounded-md border px-2 py-2 transition ${
                        muted
                          ? "border-white/10 bg-white/5"
                          : "border-amber-300/40 bg-amber-300/10"
                      }`}
                    >
                      <div className="flex-1">
                        <div className={`font-mono text-xs ${muted ? "text-white/60" : "text-amber-100"}`}>
                          {inst.label}
                        </div>
                        <div className="font-mono text-[9px] text-white/40">
                          {inst.hint}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInstrument(inst.id, !muted)}
                        title={muted ? `Enable ${inst.label}` : `Mute ${inst.label}`}
                        aria-pressed={!muted}
                        aria-label={`${muted ? "Enable" : "Mute"} ${inst.label}`}
                        className={`min-h-[44px] min-w-[64px] rounded-full border px-3 font-mono text-[11px] transition ${
                          muted
                            ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                            : "border-amber-300/50 bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
                        }`}
                      >
                        {muted ? "🔇 off" : "🔊 on"}
                      </button>
                    </div>
                  );
                }
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => setInstrument(inst.id, !muted)}
                    title={inst.hint}
                    className={`rounded-md border px-2 py-1 text-left font-mono text-[11px] transition ${
                      muted
                        ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                        : "border-amber-300/40 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    }`}
                  >
                    <span>{muted ? "🔇" : "🔊"}</span>{" "}
                    <span>{inst.label}</span>
                    <div className="text-[9px] text-white/40">{inst.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsed settings (key / tempo / test buttons). Closed by
              default on mobile so the instrument list dominates the
              first-view; open via a chevron disclosure. */}
          <div className={isMobile ? "border-t border-white/10 p-3" : ""}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                aria-expanded={settingsOpen}
                className="mb-2 flex w-full min-h-[36px] items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 transition hover:bg-white/10"
              >
                <span>Advanced (key · tempo · tests)</span>
                <span>{settingsOpen ? "▾" : "▸"}</span>
              </button>
            )}
            {(!isMobile || settingsOpen) && (
              <>
                <label className="mb-2 block">
                  <div className="pb-1 font-mono text-[10px] text-white/55">Key</div>
                  <select
                    value={state?.scaleId ?? "cMinor"}
                    onChange={(e) => setScale(e.target.value as ScaleId)}
                    className="min-h-[44px] w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/85"
                  >
                    {SCALES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mb-2 block">
                  <div className="flex items-baseline justify-between font-mono text-[10px] text-white/55">
                    <span>Tempo</span>
                    <span>{state?.tempoBpm ?? 90} BPM</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={120}
                    step={1}
                    value={state?.tempoBpm ?? 90}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    className="h-11 w-full accent-amber-300"
                  />
                </label>

                <div className="mt-2 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerBell()}
                    disabled={!playing}
                    className="min-h-[44px] rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Test the bell tone"
                  >
                    🔔 test bell
                  </button>
                  <button
                    type="button"
                    onClick={() => engineRef.current?.triggerGwSwell()}
                    disabled={!playing}
                    className="min-h-[44px] rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Test the GW swell"
                  >
                    🌀 test swell
                  </button>
                </div>
              </>
            )}

            <p className="mt-3 font-mono text-[9px] leading-relaxed text-white/40">
              Audio is muted by default and routed through a limiter. Master
              gain caps at {Math.round(MAX_MASTER_GAIN * 100)}%.
            </p>
          </div>

          {/* Sticky play/pause footer — bottom of the mobile sheet so it's
              always reachable while the user scrolls through instruments.
              Desktop variant skips this since the play button lives in the
              trigger pill. */}
          {isMobile && (
            <div className="sticky bottom-0 z-10 flex border-t border-white/10 bg-space-950/95 p-3 backdrop-blur">
              <button
                type="button"
                onClick={togglePlay}
                aria-pressed={playing}
                className={`min-h-[48px] flex-1 rounded-md border px-3 py-2 font-mono text-sm uppercase tracking-wider transition ${
                  playing
                    ? "border-amber-300/50 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {playing ? "⏸ pause" : "▶ play sky"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

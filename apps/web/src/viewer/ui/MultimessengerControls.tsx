import { useEffect, useMemo, useRef, useState } from "react";

import { log } from "../../lib/logger";
import type { LigoEvent, MultiMessengerApi } from "../multimessenger";
import type { ExtraLayersHost } from "./ExtraLayersPanel";
import { useExtraLayerEnabled } from "../extra-layers/state";

const LAYER_ID = "multimessenger";

/**
 * Sky-mode scenes already implement `ExtraLayersHost`. We also need the
 * `getExtraLayerApi` extension we added to pull the multi-messenger
 * helper API off the loaded module.
 */
export type MultimessengerHost = ExtraLayersHost & {
  getExtraLayerApi(id: string): unknown;
  ensureExtraLayerLoaded(id: string): Promise<void>;
};

type Props = {
  scene: MultimessengerHost | null;
};

function isMultiMessengerApi(v: unknown): v is MultiMessengerApi {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.playChirpById === "function" &&
    typeof o.listLigoEvents === "function" &&
    typeof o.setChirpMuted === "function"
  );
}

type LastChirp = {
  id: string;
  m1: number;
  m2: number;
  distanceMpc: number;
};

/**
 * 〰️ Multi-messenger Controls — small Sky-mode overlay surfacing the
 * gravitational-wave chirp synthesiser. When the multi-messenger layer
 * is enabled, this renders:
 *
 *   • a mute/unmute toggle for the inspiral chirp synth
 *   • a dropdown of LIGO GW events with one-click play buttons
 *   • a "last chirp" status line
 *
 * The synth is muted by default per the module's safety guarantee — the
 * user must opt in by clicking 🔇 → 🔊 once.
 */
export function MultimessengerControls({ scene }: Props) {
  // Subscribes via the zustand store instead of polling localStorage
  // every 750 ms. Re-renders only when this specific layer flips.
  const enabled = useExtraLayerEnabled(LAYER_ID);
  const [muted, setMuted] = useState(true);
  const [events, setEvents] = useState<LigoEvent[]>([]);
  const [last, setLast] = useState<LastChirp | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const apiRef = useRef<MultiMessengerApi | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Resolve mmApi once both the layer is enabled and the module has
  // loaded. Poll the scene briefly because the dynamic import lands a
  // tick after the store flips `enabled` true.
  useEffect(() => {
    if (!enabled || !scene) {
      apiRef.current = null;
      setEvents([]);
      return;
    }
    let cancelled = false;
    const wire = async () => {
      try {
        await scene.ensureExtraLayerLoaded(LAYER_ID);
      } catch (err) {
        log.warn("[multimessenger] ensureLoaded failed", err);
      }
      if (cancelled) return;
      const tryWire = (): boolean => {
        const api = scene.getExtraLayerApi(LAYER_ID);
        if (!isMultiMessengerApi(api)) return false;
        apiRef.current = api;
        setMuted(api.isChirpMuted());
        return true;
      };
      if (!tryWire()) {
        const id = window.setInterval(() => {
          if (cancelled) {
            window.clearInterval(id);
            return;
          }
          if (tryWire()) window.clearInterval(id);
        }, 300);
        window.setTimeout(() => window.clearInterval(id), 3000);
      }
    };
    void wire();
    return () => {
      cancelled = true;
      apiRef.current = null;
    };
  }, [enabled, scene]);

  // Poll the LIGO events list — it populates asynchronously after the
  // module's data fetch resolves.
  useEffect(() => {
    if (!enabled || !scene) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const api = apiRef.current;
      if (!api) return;
      try {
        const list = api.listLigoEvents();
        if (list.length > 0) {
          setEvents((prev) =>
            prev.length === list.length && prev[0]?.id === list[0]?.id
              ? prev
              : list.slice(),
          );
        }
      } catch {
        // ignore — list() can't really throw
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, scene]);

  // Close picker on outside click / Escape.
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (pickerRef.current?.contains(t)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("mousedown", onClick, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const sortedEvents = useMemo(() => {
    return events.slice(0, 20).sort((a, b) => a.id.localeCompare(b.id));
  }, [events]);

  if (!enabled) return null;

  const toggleMuted = () => {
    const api = apiRef.current;
    const next = !muted;
    setMuted(next);
    if (api) api.setChirpMuted(next);
  };

  const playEvent = (e: LigoEvent) => {
    const api = apiRef.current;
    if (!api) return;
    if (api.isChirpMuted()) {
      api.setChirpMuted(false);
      setMuted(false);
    }
    const ok = api.playChirpById(e.id);
    if (ok) {
      setLast({
        id: e.id,
        m1: e.mass1Source,
        m2: e.mass2Source,
        distanceMpc: e.distanceMpc,
      });
    }
    setPickerOpen(false);
  };

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-space-950/70 px-2 py-1 backdrop-blur">
      <button
        type="button"
        onClick={toggleMuted}
        title={
          muted
            ? "Play GW chirp on click (unmute the inspiral synth)"
            : "Mute the GW inspiral synth"
        }
        aria-pressed={!muted}
        className={`rounded-md border px-2 py-0.5 font-mono text-xs transition ${
          muted
            ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            : "border-violet-400/50 bg-violet-400/15 text-violet-100 hover:bg-violet-400/25"
        }`}
      >
        {muted ? "🔇" : "🔊"}{" "}
        <span className="hidden sm:inline">
          {muted ? "play GW chirp on click" : "GW chirp armed"}
        </span>
      </button>

      <div ref={pickerRef} className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={sortedEvents.length === 0}
          title="Play a chirp for a specific LIGO/Virgo event"
          aria-expanded={pickerOpen}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sortedEvents.length === 0
            ? "loading…"
            : `▶ play GW (${sortedEvents.length})`}
        </button>
        {pickerOpen && sortedEvents.length > 0 && (
          <div
            role="dialog"
            aria-label="LIGO events"
            className="absolute right-0 top-7 z-30 max-h-[60vh] w-[min(280px,90vw)] overflow-y-auto rounded-lg border border-white/10 bg-space-950/95 p-1.5 shadow-2xl backdrop-blur"
          >
            <div className="px-1.5 pb-1 font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
              LIGO/Virgo GWTC-3 · click to chirp
            </div>
            {sortedEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => playEvent(e)}
                className="block w-full rounded px-1.5 py-1 text-left font-mono text-[11px] text-white/85 transition hover:bg-violet-400/15 hover:text-violet-100"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span>{e.id}</span>
                  <span className="text-[10px] text-white/45">{e.type}</span>
                </div>
                <div className="text-[10px] text-white/45">
                  {e.mass1Source.toFixed(1)} + {e.mass2Source.toFixed(1)} M☉
                  · {Math.round(e.distanceMpc)} Mpc
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <span
        title={last ? "Last chirp played in this session" : undefined}
        className="hidden font-mono text-[10px] text-white/55 sm:inline"
      >
        {last
          ? `Last: ${last.id} · ${last.m1.toFixed(0)} + ${last.m2.toFixed(0)} M☉ · ${Math.round(last.distanceMpc)} Mpc`
          : "no chirp yet"}
      </span>
    </div>
  );
}

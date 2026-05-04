import { useEffect, useState } from "react";
import { PRESETS, type TimeMachinePreset } from "../time-machine/presets";
import {
  eclipseToPreset,
  loadEclipses,
  nextEclipses,
  type LunarEclipse,
  type SolarEclipse,
} from "../eclipses/eclipses";

/**
 * 🕰 Time machine — jump to a curated moment in time + space.
 *
 * Two tabs: hand-curated narrative presets, and upcoming eclipses loaded
 * lazily from `/data/eclipses.json`. Activating a card sets simulation
 * time, optionally flies the camera to a target, and adjusts the time rate.
 */

type Scene = {
  flyTo(name: string): void;
  setTime(t: Date): void;
  setTimeRate(r: number): void;
};

type Props = {
  open: boolean;
  scene: Scene | null;
  now: Date;
  onClose: () => void;
};

type Tab = "presets" | "eclipses";

export function TimeMachinePanel({ open, scene, now, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("presets");
  const [solar, setSolar] = useState<SolarEclipse[]>([]);
  const [lunar, setLunar] = useState<LunarEclipse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tab !== "eclipses" || solar.length || lunar.length || loading)
      return;
    let cancelled = false;
    setLoading(true);
    loadEclipses()
      .then((cat) => {
        if (cancelled) return;
        const next = nextEclipses(now, 8, cat);
        setSolar(next.solar);
        setLunar(next.lunar);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, now, solar.length, lunar.length, loading]);

  if (!open) return null;

  const apply = (p: TimeMachinePreset): void => {
    if (!scene) return;
    const d = new Date(p.date);
    if (Number.isFinite(d.getTime())) scene.setTime(d);
    scene.setTimeRate(p.rate ?? 86400);
    if (p.flyTo) scene.flyTo(p.flyTo);
    onClose();
  };

  return (
    <div className="pointer-events-auto absolute right-3 top-32 z-30 flex max-h-[70vh] w-[min(380px,92vw)] flex-col rounded-xl border border-white/15 bg-space-950/90 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
          🕰 time machine
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close time machine"
          className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex border-b border-white/5">
        <TabButton active={tab === "presets"} onClick={() => setTab("presets")}>
          Presets
        </TabButton>
        <TabButton
          active={tab === "eclipses"}
          onClick={() => setTab("eclipses")}
        >
          Eclipses
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tab === "presets" && (
          <div className="flex flex-col gap-1.5">
            {PRESETS.map((p) => (
              <PresetCard key={p.id} preset={p} onClick={() => apply(p)} />
            ))}
          </div>
        )}
        {tab === "eclipses" && (
          <div className="flex flex-col gap-2">
            {loading && (
              <div className="px-2 py-3 font-mono text-[11px] text-white/50">
                Loading…
              </div>
            )}
            {error && (
              <div className="px-2 py-3 font-mono text-[11px] text-rose-300">
                {error}
              </div>
            )}
            {!loading && !error && (
              <>
                <div className="px-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Solar — next {solar.length}
                </div>
                {solar.map((e) => (
                  <PresetCard
                    key={`s-${e.date}`}
                    preset={eclipseToPreset(e)}
                    onClick={() => apply(eclipseToPreset(e))}
                  />
                ))}
                <div className="mt-2 px-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Lunar — next {lunar.length}
                </div>
                {lunar.map((e) => (
                  <PresetCard
                    key={`l-${e.date}`}
                    preset={eclipseToPreset(e)}
                    onClick={() => apply(eclipseToPreset(e))}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function PresetCard({
  preset,
  onClick,
}: {
  preset: TimeMachinePreset;
  onClick: () => void;
}) {
  const date = preset.date.slice(0, 10);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
    >
      <span className="text-base leading-none">{preset.emoji}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-mono text-[11px] uppercase tracking-wider text-white/85">
            {preset.title}
          </span>
          <span className="font-mono text-[9px] text-white/40">{date}</span>
        </span>
        <span className="mt-1 block font-mono text-[10.5px] leading-snug text-white/55">
          {preset.body}
        </span>
      </span>
    </button>
  );
}

export default TimeMachinePanel;

import { useEffect, useState } from "react";
import {
  allTracks,
  readCustomTracks,
  writeCustomTracks,
  type MusicTrack,
} from "../audio/music-tracks";
import { musicPlayer, type PlayerState } from "../audio/music-player";

/**
 * 🎵 Ambient music panel.
 *
 * Tiny top-bar button. The icon reflects state:
 *   - 🎵 playing
 *   - 🔇 muted (paused)
 *   - 🎶 loading
 *
 * Click → opens a popover with: now-playing card, track list (NASA
 * sonifications + ambient tracks), play/pause/next/prev, volume
 * slider, loop toggle, "add custom URL" input.
 */
export function MusicPanel() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PlayerState>(musicPlayer().getState());
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>(() => allTracks());

  useEffect(() => musicPlayer().subscribe(setState), []);

  const current = tracks.find((t) => t.id === state.trackId) ?? null;
  const icon = state.loading ? "🎶" : state.playing ? "🎵" : "🔇";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={current ? `${current.title} — click for controls` : "Ambient music"}
        aria-label="Ambient music"
        className={`pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] backdrop-blur transition ${
          state.playing
            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
            : "border-white/10 bg-space-950/70 text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden>{icon}</span>
        <span>music</span>
      </button>
      {open && (
        <div className="pointer-events-auto absolute right-3 top-12 z-30 w-[min(380px,94vw)] max-h-[78vh] overflow-y-auto rounded-xl border border-white/10 bg-space-950/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="font-display text-sm text-white/90">
              Ambient music
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/55 hover:bg-white/10 hover:text-white"
            >
              close
            </button>
          </div>

          {current ? (
            <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <div className="font-display text-[13px] text-white/95">
                {current.title}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-white/55">
                {current.attribution} · {current.license}
              </div>
              {state.error && (
                <div className="mt-1.5 font-mono text-[10.5px] text-amber-200">
                  {state.error}
                </div>
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => musicPlayer().step(-1)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/75 hover:bg-white/10"
                  aria-label="Previous track"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => musicPlayer().toggle()}
                  className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 font-mono text-[11px] text-cyan-200 hover:bg-cyan-400/20"
                  aria-label={state.playing ? "Pause" : "Play"}
                >
                  {state.playing ? "⏸ pause" : "▶ play"}
                </button>
                <button
                  type="button"
                  onClick={() => musicPlayer().step(1)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/75 hover:bg-white/10"
                  aria-label="Next track"
                >
                  ▶
                </button>
                <label className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-white/50">
                  <input
                    type="checkbox"
                    checked={state.loop}
                    onChange={(e) => musicPlayer().setLoop(e.target.checked)}
                    className="accent-cyan-300"
                  />
                  loop
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span aria-hidden className="font-mono text-[10px] text-white/45">
                  vol
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={state.volume}
                  onChange={(e) =>
                    musicPlayer().setVolume(parseFloat(e.target.value))
                  }
                  aria-label="Volume"
                  className="flex-1 accent-cyan-300"
                />
                <span className="font-mono text-[10px] tabular-nums text-white/45">
                  {Math.round(state.volume * 100)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-3 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-3 text-center font-mono text-[11px] text-white/55">
              Pick a track below to start. Browsers require a click to
              enable audio.
            </div>
          )}

          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Tracks
          </div>
          <ul className="mb-3 space-y-1">
            {tracks.map((t) => {
              const active = current?.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => musicPlayer().play(t.id)}
                    className={`flex w-full items-baseline gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                      active
                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                        : "border-white/5 bg-white/[0.02] text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="shrink-0 font-mono text-[10px] tabular-nums text-white/40"
                    >
                      {t.kind === "sonification" ? "📡" : "🎼"}
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-[12px] leading-tight">
                        {t.title}
                      </span>
                      <span className="block font-mono text-[10px] leading-snug text-white/45">
                        {t.attribution}
                      </span>
                    </span>
                    {t.source && (
                      <a
                        href={t.source}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 font-mono text-[10px] text-white/40 hover:text-cyan-200"
                      >
                        src ↗
                      </a>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
            Bring your own
          </div>
          <div className="flex flex-col gap-1.5 rounded-md border border-white/5 bg-white/[0.02] p-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Title (e.g. Brian Eno — Music for Airports)"
              className="rounded border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[11px] text-white/85 placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
            />
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://… (CORS-enabled audio)"
              className="rounded border border-white/10 bg-space-950/70 px-2 py-1 font-mono text-[11px] text-white/85 placeholder:text-white/30 focus:border-cyan-400/40 focus:outline-none"
            />
            <button
              type="button"
              disabled={!customUrl.trim() || !customTitle.trim()}
              onClick={() => {
                const id = `custom-${Date.now().toString(36)}`;
                const next: MusicTrack = {
                  id,
                  title: customTitle.trim(),
                  attribution: "User-supplied",
                  license: "Unknown — you provided it",
                  kind: "ambient",
                  src: customUrl.trim(),
                  custom: true,
                };
                const stored = readCustomTracks();
                writeCustomTracks([...stored, next]);
                setTracks(allTracks());
                setCustomTitle("");
                setCustomUrl("");
                musicPlayer().play(id);
              }}
              className="self-start rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              add + play
            </button>
            <div className="font-mono text-[10px] leading-snug text-white/40">
              Stored locally only. Must be a direct media URL (.mp3 / .ogg
              / .m4a) with CORS headers.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

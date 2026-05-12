import { MUSIC_KEYS, allTracks, type MusicTrack } from "./music-tracks";
import { log } from "../../lib/logger";

/**
 * Singleton ambient-music player.
 *
 * Wraps a single `HTMLAudioElement` and exposes pub-sub state so the
 * music panel UI can render reactively. Persists track + volume + loop
 * + enabled state in `localStorage` so a refresh keeps the same music.
 *
 * Why a singleton: the player survives Universe ↔ SolarFlight scene
 * swaps. If we re-instantiated per-scene, every navigation would
 * restart the track. That's a worse UX.
 */

export type PlayerState = {
  enabled: boolean; // user has explicitly turned music on
  playing: boolean; // audio.paused === false right now
  loading: boolean; // mid-fetch / mid-decode
  trackId: string | null;
  volume: number; // 0..1
  loop: boolean;
  error: string | null;
};

type Listener = (s: PlayerState) => void;

class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private state: PlayerState = {
    enabled: false,
    playing: false,
    loading: false,
    trackId: null,
    volume: 0.4,
    loop: true,
    error: null,
  };
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window === "undefined") return;
    // Restore persisted state.
    try {
      this.state.enabled = localStorage.getItem(MUSIC_KEYS.enabled) === "on";
      this.state.trackId = localStorage.getItem(MUSIC_KEYS.trackId);
      const v = parseFloat(localStorage.getItem(MUSIC_KEYS.volume) ?? "");
      if (Number.isFinite(v)) this.state.volume = Math.max(0, Math.min(1, v));
      this.state.loop = localStorage.getItem(MUSIC_KEYS.loop) !== "off";
    } catch {
      /* private mode — defaults */
    }
  }

  /** Lazy-create the audio element on first user interaction. Browsers
   *  block autoplay without a user gesture, so we don't try until the
   *  user clicks play/track. */
  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.preload = "none";
    a.loop = this.state.loop;
    a.volume = this.state.volume;
    a.addEventListener("playing", () => {
      this.update({ playing: true, loading: false, error: null });
    });
    a.addEventListener("pause", () => {
      this.update({ playing: false });
    });
    a.addEventListener("loadstart", () => {
      this.update({ loading: true, error: null });
    });
    a.addEventListener("canplay", () => {
      this.update({ loading: false });
    });
    a.addEventListener("error", () => {
      log.warn("[music] audio error", a.error);
      this.update({
        loading: false,
        playing: false,
        error: "Couldn't load this track. Try another.",
      });
    });
    a.addEventListener("ended", () => {
      if (!this.state.loop) this.update({ playing: false });
    });
    this.audio = a;
    return a;
  }

  getState(): PlayerState {
    return this.state;
  }

  getTrack(): MusicTrack | null {
    if (!this.state.trackId) return null;
    return allTracks().find((t) => t.id === this.state.trackId) ?? null;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /** Pick a track + start playing. Idempotent — same id won't restart. */
  play(trackId: string): void {
    const tracks = allTracks();
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const audio = this.ensureAudio();
    const changing = this.state.trackId !== trackId;
    if (changing) {
      audio.src = track.src;
      this.update({ trackId, error: null });
      try {
        localStorage.setItem(MUSIC_KEYS.trackId, trackId);
      } catch {
        /* ignore */
      }
    }
    this.update({ enabled: true, loading: true });
    try {
      localStorage.setItem(MUSIC_KEYS.enabled, "on");
    } catch {
      /* ignore */
    }
    audio
      .play()
      .catch((err) => {
        log.warn("[music] play rejected", err);
        // Most commonly an autoplay block; flagging error so the UI can
        // ask the user to click play themselves.
        this.update({
          loading: false,
          playing: false,
          error: "Click play once to allow audio in this tab.",
        });
      });
  }

  pause(): void {
    this.audio?.pause();
    this.update({ enabled: false });
    try {
      localStorage.setItem(MUSIC_KEYS.enabled, "off");
    } catch {
      /* ignore */
    }
  }

  toggle(): void {
    if (this.state.enabled && this.state.playing) {
      this.pause();
    } else if (this.state.trackId) {
      this.play(this.state.trackId);
    }
  }

  /** Step to the next or previous track in the curated catalog. */
  step(delta: 1 | -1): void {
    const tracks = allTracks();
    if (!tracks.length) return;
    const i = tracks.findIndex((t) => t.id === this.state.trackId);
    const next = tracks[(i + delta + tracks.length) % tracks.length]!;
    this.play(next.id);
  }

  setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    this.update({ volume: clamped });
    if (this.audio) this.audio.volume = clamped;
    try {
      localStorage.setItem(MUSIC_KEYS.volume, String(clamped));
    } catch {
      /* ignore */
    }
  }

  setLoop(loop: boolean): void {
    this.update({ loop });
    if (this.audio) this.audio.loop = loop;
    try {
      localStorage.setItem(MUSIC_KEYS.loop, loop ? "on" : "off");
    } catch {
      /* ignore */
    }
  }

  private update(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    for (const cb of this.listeners) cb(this.state);
  }
}

let instance: MusicPlayer | null = null;
export function musicPlayer(): MusicPlayer {
  if (!instance) instance = new MusicPlayer();
  return instance;
}

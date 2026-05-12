/**
 * 🔊 Pulsar sonification — turn a pulsar's spin period into audible clicks.
 *
 * Pure Web Audio API, no library. The strategy splits cleanly on period:
 *   • Short periods (≤ 1 s, e.g. millisecond pulsars + Crab @ 33 ms)
 *     → an `AudioBufferSourceNode` looping a 50 ms click, with `playbackRate`
 *       chosen so successive clicks fire at frequency `1 / periodSec`. For
 *       the Crab Pulsar (~30 Hz) this lands in audible-rate territory and
 *       reads as a buzzing hum, exactly what radio dishes pick up.
 *   • Long periods (> 1 s)  → a square-wave-style gate driven by repeated
 *       `gain.setValueAtTime` calls scheduling discrete clicks. Looping a
 *       playback-rate-throttled buffer can stutter at very low rates, so we
 *       gate the oscillator instead.
 *
 * Volume is gated by the global `sonificationVolume` setting (0–1, default
 * 0.4). Audio context is lazily created on first `play()` to satisfy
 * autoplay policies — never auto-plays.
 */

const CLICK_DURATION_SEC = 0.05;
const SHORT_PERIOD_THRESHOLD_SEC = 1.0;

export type PulsarAudioOptions = {
  /** 0–1, multiplied with global sonificationVolume. Default 1. */
  volume?: number;
  /** Shift pitch by N (1 = fundamental, 2 = octave up, 3 = +octave+fifth). */
  harmonic?: 1 | 2 | 3;
};

/**
 * Single, reusable Web-Audio click generator. One instance per app —
 * playing again while already playing implicitly stops the previous note.
 */
export class PulsarAudio {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private clickBuffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private gateTimer: number | null = null;
  private playing = false;
  private currentVolume = 0.4;

  /** Lazy-init the AudioContext on the first play. Required for autoplay. */
  private ensureContext(): { ctx: AudioContext; gain: GainNode } {
    if (this.ctx && this.gain) return { ctx: this.ctx, gain: this.gain };
    type AudioContextCtor = new (
      contextOptions?: AudioContextOptions,
    ) => AudioContext;
    const w = window as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio not supported");
    const ctx = new Ctor();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    this.ctx = ctx;
    this.gain = gain;
    this.clickBuffer = makeClickBuffer(ctx);
    return { ctx, gain };
  }

  /**
   * Start clicking at `1 / periodSec` Hz. Idempotent: calling while playing
   * stops the previous note and starts a fresh one.
   */
  play(periodSec: number, opts: PulsarAudioOptions = {}): void {
    if (!Number.isFinite(periodSec) || periodSec <= 0) return;
    // Honor the global mute toggle — playing while muted should be a no-op
    // so we don't briefly chirp before the gain ramps down.
    if (isAudioMuted()) return;
    this.stop();
    const { ctx, gain } = this.ensureContext();
    void ctx.resume();
    const harmonic = opts.harmonic ?? 1;
    const localVol = opts.volume ?? 1;
    this.currentVolume = clamp01(localVol);
    const target = clamp01(this.currentVolume * 0.6);
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(target, ctx.currentTime);

    const clickHz = harmonic / periodSec;

    if (periodSec <= SHORT_PERIOD_THRESHOLD_SEC) {
      // Short period: loop the click buffer, scaling playbackRate so the
      // 50 ms click cycles at the requested click-rate. Looping is the
      // cheapest way to schedule O(1000) clicks per second on the audio
      // thread.
      const buffer = this.clickBuffer;
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = buffer.duration;
      // Drive cycle frequency: clicks per second = clickHz. Buffer is
      // CLICK_DURATION_SEC long, so playbackRate = clickHz * CLICK_DURATION_SEC
      // would speed the click itself up; instead we want one click per
      // 1/clickHz second — the buffer already includes silence sized for
      // a 1 Hz cycle, so playbackRate = clickHz directly.
      src.playbackRate.value = Math.max(0.05, Math.min(2000, clickHz));
      src.connect(gain);
      src.start();
      this.source = src;
    } else {
      // Long period: schedule discrete click envelopes via setValueAtTime.
      // Use a setInterval to refill the schedule every second.
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 880;
      // Click-shape envelope is on the master gain; oscillator runs
      // continuously and the gain pulses it open for ~30 ms per click.
      osc.connect(gain);
      osc.start();
      this.oscillator = osc;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      const scheduleAhead = (): void => {
        const ctxRef = this.ctx;
        const gainRef = this.gain;
        if (!ctxRef || !gainRef || !this.playing) return;
        const now = ctxRef.currentTime;
        const horizon = now + 1.5; // schedule 1.5 s of pulses ahead
        let t = Math.ceil(now / periodSec) * periodSec;
        while (t < horizon) {
          gainRef.gain.setValueAtTime(target, t);
          gainRef.gain.setValueAtTime(0, t + 0.03);
          t += periodSec;
        }
      };
      scheduleAhead();
      this.gateTimer = window.setInterval(scheduleAhead, 1000);
    }
    this.playing = true;
  }

  stop(): void {
    if (!this.playing && !this.source && !this.oscillator) return;
    const ctx = this.ctx;
    const gain = this.gain;
    if (gain && ctx) {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
    }
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch {
        /* already stopped */
      }
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gateTimer !== null) {
      window.clearInterval(this.gateTimer);
      this.gateTimer = null;
    }
    this.playing = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Update master volume mid-play (e.g. user moves the settings slider). */
  setMasterVolume(v: number): void {
    this.currentVolume = clamp01(v);
    const ctx = this.ctx;
    const gain = this.gain;
    if (this.playing && ctx && gain) {
      gain.gain.setValueAtTime(this.currentVolume * 0.6, ctx.currentTime);
    }
  }
}

/** Synthesize a 50 ms click: a single quick pop with exponential decay. */
function makeClickBuffer(ctx: AudioContext): AudioBuffer {
  // Buffer holds one full "1 Hz cycle" — playbackRate = clickHz then yields
  // one click per (1/clickHz) seconds.
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 1.0); // 1 s of buffer
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);
  const clickSamples = Math.floor(sampleRate * CLICK_DURATION_SEC);
  for (let i = 0; i < clickSamples; i++) {
    const t = i / sampleRate;
    // Two-tone burst (white-ish) with exp decay — reads as a "tick".
    const env = Math.exp(-t * 80);
    const carrier = Math.sin(2 * Math.PI * 1200 * t)
      + 0.6 * Math.sin(2 * Math.PI * 600 * t);
    data[i] = env * carrier * 0.5;
  }
  // Remaining samples stay 0 (silence between clicks).
  return buf;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Read the global mute toggle without taking a hard dependency on the
 *  settings module from every call site — keeps this audio module
 *  cleanly stateless if someone later wants to swap settings backends. */
function isAudioMuted(): boolean {
  try {
    // Lazy import via globalThis avoids a circular import in some bundlers.
    // The settings module sets this on load via setSettings → notify path.
    const ls = globalThis.localStorage;
    if (!ls) return false;
    const raw = ls.getItem("uw.settings.v1");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { audioMuted?: boolean };
    return parsed.audioMuted === true;
  } catch {
    return false;
  }
}

/** Module-singleton, shared by Universe + InfoPanel. Lazy. */
let _instance: PulsarAudio | null = null;
export function getPulsarAudio(): PulsarAudio {
  if (!_instance) _instance = new PulsarAudio();
  return _instance;
}

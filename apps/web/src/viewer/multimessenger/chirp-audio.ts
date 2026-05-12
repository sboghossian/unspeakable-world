/**
 * 🔊 BBH inspiral chirp synthesiser (Web Audio).
 *
 * For a compact binary inspiral the gravitational-wave frequency
 * evolves as
 *
 *   f(t) = (1 / 8π) (5 / (M c³))^(3/8) (t_merge − t)^(−3/8)
 *
 * where M is the chirp mass. We collapse all the physical constants
 * into a single seconds-from-merger → Hz mapping that produces an
 * audibly-perfect short "whoop" without being a literal audio
 * reproduction of the GW strain (you can't hear gravity).
 *
 * Output: ~1.2 s of audio per call, ramping from ~80 Hz to ~600 Hz
 * with an amplitude envelope that swells and then snaps off at merger.
 * The caller controls mute via `setMuted`; nothing plays while muted.
 */

import { log } from "../../lib/logger";

const SUN_M = 1; // we work in units of solar masses
const G_OVER_C3 = 4.92e-6; // GM_sun / c^3 in seconds — used for scaling

function chirpMass(m1: number, m2: number): number {
  const num = Math.pow(m1 * m2, 3 / 5);
  const den = Math.pow(m1 + m2, 1 / 5);
  return num / den;
}

/**
 * Map a chirp-time t (seconds before merger) to GW frequency in Hz.
 * Uses the leading-order PN expression with the chirp mass.
 */
function freqAt(t: number, mChirp: number): number {
  const M = mChirp * SUN_M * G_OVER_C3;
  // f_GW = (1/(8π)) (5 / (M))^(3/8) * (-t)^(-3/8)
  const inside = 5 / M;
  const f = (1 / (8 * Math.PI)) * Math.pow(inside, 3 / 8) * Math.pow(t, -3 / 8);
  return Math.max(20, Math.min(1500, f));
}

export class ChirpAudio {
  private ctx: AudioContext | null = null;
  private muted = true; // off by default per spec

  setMuted(v: boolean): void {
    this.muted = v;
    if (v && this.ctx) {
      // Let any in-flight nodes finish — don't tear down the context.
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Trigger a chirp for the given source-frame masses (M_sun).
   * Returns true if a tone was scheduled; false if muted / unavailable.
   */
  play(m1Source: number, m2Source: number): boolean {
    if (this.muted) return false;
    if (typeof window === "undefined") return false;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
      }
      const ctx = this.ctx;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const mc = chirpMass(Math.max(1, m1Source), Math.max(1, m2Source));
      // Build a frequency envelope at ~200 Hz of automation samples.
      // Audible duration is short: 1.2 s, with merger at the end.
      const duration = 1.2;
      const sampleHz = 200;
      const n = Math.floor(duration * sampleHz);
      const times: number[] = [];
      const freqs: number[] = [];
      for (let i = 0; i <= n; i++) {
        const audioT = (i / n) * duration;
        // Seconds-before-merger sweeps from duration down to 0.02.
        const tBefore = Math.max(0.02, (1 - i / n) * duration);
        times.push(audioT);
        freqs.push(freqAt(tBefore, mc));
      }
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const gain = ctx.createGain();
      const start = ctx.currentTime + 0.02;
      osc.frequency.setValueAtTime(freqs[0] ?? 80, start);
      for (let i = 1; i < freqs.length; i++) {
        const v = freqs[i];
        const tt = times[i];
        if (v === undefined || tt === undefined) continue;
        osc.frequency.linearRampToValueAtTime(v, start + tt);
      }
      // Amplitude swell: 0 → 0.35 over 0.9 s, snap to 0 at merger.
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + duration * 0.85);
      gain.gain.linearRampToValueAtTime(0, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
      return true;
    } catch (err) {
      log.warn("[multimessenger] chirp audio failed", err);
      return false;
    }
  }

  dispose(): void {
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.ctx = null;
  }
}

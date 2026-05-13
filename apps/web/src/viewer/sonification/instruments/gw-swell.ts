/**
 * 🌀 GW swell — bass swell that ramps from a low rumble up to a chirp
 * and snaps off, evoking a compact-binary inspiral merger. Adapted
 * (not reimported) from `multimessenger/chirp-audio.ts` so that file
 * stays narrowly-scoped to the multimessenger module.
 *
 * The engine drives this via `swell()`. No physical chirp-mass model
 * here — it's a fixed 1.6 s frequency sweep with a swelling amplitude.
 */

type SwellBuses = {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
};

export class GwSwellInstrument {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private muted = false;

  constructor(buses: SwellBuses) {
    this.ctx = buses.ctx;
    this.out = buses.out;
  }

  setMuted(v: boolean): void {
    this.muted = v;
  }

  swell(): void {
    if (this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.02;
    const duration = 1.6;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";

    const gain = ctx.createGain();
    const subGain = ctx.createGain();

    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + duration * 0.95);

    subOsc.frequency.setValueAtTime(20, now);
    subOsc.frequency.exponentialRampToValueAtTime(60, now + duration * 0.95);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + duration * 0.85);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.2, now + duration * 0.6);
    subGain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain).connect(this.out);
    subOsc.connect(subGain).connect(this.out);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + duration + 0.05);
    subOsc.stop(now + duration + 0.05);
  }
}

/**
 * 🔔 Bell — short, glassy tones triggered when a bright DSO / Messier
 * object enters the camera frustum.
 *
 * Additive synthesis: three sine partials at integer + slightly stretched
 * ratios (1, 2.76, 5.40) — a stripped-down version of the classic FM
 * bell. Each strike is one-shot and fully envelope-driven; the engine
 * just calls `strike(hz)` whenever it wants a new tone.
 */

type BellBuses = {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
};

export class BellInstrument {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private muted = false;

  constructor(buses: BellBuses) {
    this.ctx = buses.ctx;
    this.out = buses.out;
  }

  setMuted(v: boolean): void {
    this.muted = v;
  }

  strike(hz: number, atSec?: number): void {
    if (this.muted) return;
    if (!Number.isFinite(hz) || hz <= 0) return;
    const ctx = this.ctx;
    const when = atSec ?? ctx.currentTime;
    const ratios = [1, 2.76, 5.4];
    const decays = [1.6, 0.9, 0.5];
    const amps = [0.18, 0.08, 0.04];
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(this.out);
    for (let i = 0; i < ratios.length; i++) {
      const r = ratios[i] ?? 1;
      const d = decays[i] ?? 0.5;
      const a = amps[i] ?? 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = hz * r;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(a, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      osc.connect(g).connect(masterGain);
      osc.start(when);
      osc.stop(when + d + 0.05);
    }
  }
}

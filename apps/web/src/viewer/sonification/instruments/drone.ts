/**
 * 🌬 Drone — long, evolving pad tuned to the brightest visible star.
 *
 * Two detuned sawtooth oscillators through a lowpass filter, fed by an
 * LFO on the filter cutoff so the timbre breathes. Frequency is set
 * by the host (engine) from the brightest star's B-V color index via
 * the `key.ts` scale helpers. Glide between pitches is slow (2 s) so
 * the drone never lurches when the user pans the sky.
 */

type DroneBuses = {
  readonly ctx: AudioContext;
  /** Where the drone routes its output. The engine owns the master bus. */
  readonly out: AudioNode;
};

export class DroneInstrument {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private nodes: {
    oscA: OscillatorNode;
    oscB: OscillatorNode;
    filter: BiquadFilterNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    gain: GainNode;
  } | null = null;
  private targetHz = 220;
  private running = false;

  constructor(buses: DroneBuses) {
    this.ctx = buses.ctx;
    this.out = buses.out;
  }

  start(): void {
    if (this.running) return;
    const ctx = this.ctx;
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = "sawtooth";
    oscB.type = "sawtooth";
    oscA.frequency.value = this.targetHz;
    // Detune oscB by a few cents for chorus thickness.
    oscB.frequency.value = this.targetHz * 1.005;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    filter.Q.value = 4;

    // Slow LFO on filter cutoff (≈ 0.1 Hz) for shimmer.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.value = 0;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain).connect(this.out);

    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.18, now + 1.5);

    oscA.start();
    oscB.start();
    lfo.start();

    this.nodes = { oscA, oscB, filter, lfo, lfoGain, gain };
    this.running = true;
  }

  /** Glide to a new fundamental in 2 s. Safe to call before `start()`. */
  setPitch(hz: number): void {
    if (!Number.isFinite(hz) || hz <= 0) return;
    this.targetHz = hz;
    if (!this.nodes) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const { oscA, oscB } = this.nodes;
    oscA.frequency.cancelScheduledValues(t);
    oscB.frequency.cancelScheduledValues(t);
    oscA.frequency.linearRampToValueAtTime(hz, t + 2);
    oscB.frequency.linearRampToValueAtTime(hz * 1.005, t + 2);
  }

  stop(): void {
    if (!this.running || !this.nodes) return;
    const { ctx } = this;
    const { oscA, oscB, lfo, gain } = this.nodes;
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.linearRampToValueAtTime(0, t + 0.4);
    // Stop a tick after the fade to avoid the click.
    const stopAt = t + 0.5;
    try {
      oscA.stop(stopAt);
    } catch {
      /* already stopped */
    }
    try {
      oscB.stop(stopAt);
    } catch {
      /* already stopped */
    }
    try {
      lfo.stop(stopAt);
    } catch {
      /* already stopped */
    }
    this.running = false;
    this.nodes = null;
  }

  isRunning(): boolean {
    return this.running;
  }
}

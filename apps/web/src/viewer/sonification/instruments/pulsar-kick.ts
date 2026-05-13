/**
 * 🥁 Pulsar kick — turns a pulsar's spin period into a regular kick drum.
 *
 * Raw pulsar periods span 1.4 ms (PSR J1748) to several seconds. For a
 * musical kick we clamp the period into [0.25 s, 1.0 s] (60-240 BPM)
 * by halving / doubling until it lands in range. The engine's `tempoBpm`
 * provides an upper-bound override — a user set to 90 BPM caps the kick
 * at ~0.66 s.
 *
 * Each kick is a quick exponential pitch drop (120 → 50 Hz) with a
 * fast amplitude envelope — the classic "808" shape. Cheap, audibly
 * percussive, sits well under the drone bed.
 */

type KickBuses = {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
};

export class PulsarKickInstrument {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private running = false;
  private periodSec = 0.5;
  private nextTickAt = 0;
  private rafId: number | null = null;
  private boundTick: () => void;

  constructor(buses: KickBuses) {
    this.ctx = buses.ctx;
    this.out = buses.out;
    this.boundTick = () => this.tick();
  }

  /**
   * Set the source pulsar period (seconds). Auto-folds into the
   * musical range via octave-style doubling.
   */
  setPulsarPeriod(rawPeriodSec: number, maxBpm = 120): void {
    if (!Number.isFinite(rawPeriodSec) || rawPeriodSec <= 0) return;
    const minPeriod = 60 / maxBpm;
    const maxPeriod = 1.0;
    let p = rawPeriodSec;
    // Fold sub-musical periods up.
    let safety = 32;
    while (p < minPeriod && safety-- > 0) p *= 2;
    safety = 32;
    while (p > maxPeriod && safety-- > 0) p /= 2;
    this.periodSec = Math.max(minPeriod, Math.min(maxPeriod, p));
    // Re-anchor scheduler so the next kick is one period from now.
    this.nextTickAt = this.ctx.currentTime + this.periodSec;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextTickAt = this.ctx.currentTime + 0.1;
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      window.clearTimeout(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private scheduleNext(): void {
    if (!this.running) return;
    // Look-ahead scheduler: schedule any kicks that fall within next
    // 0.4 s, then check again in 100 ms.
    const ctx = this.ctx;
    const horizon = ctx.currentTime + 0.4;
    while (this.nextTickAt < horizon) {
      this.fireKick(this.nextTickAt);
      this.nextTickAt += this.periodSec;
    }
    this.rafId = window.setTimeout(this.boundTick, 100);
  }

  private tick(): void {
    this.scheduleNext();
  }

  private fireKick(when: number): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, when);
    osc.frequency.exponentialRampToValueAtTime(50, when + 0.15);

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.35, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.25);

    osc.connect(gain).connect(this.out);
    osc.start(when);
    osc.stop(when + 0.3);
  }
}

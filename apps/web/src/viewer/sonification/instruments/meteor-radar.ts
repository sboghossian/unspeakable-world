/**
 * 📡 Meteor radar — synthesises the characteristic "ping" of a meteor
 * radio echo (forward-scatter ionisation trail).
 *
 * Real meteor radars (Belgian BRAMS, US Sirius) play live audio of
 * ionised meteor trails Doppler-shifting a continuous-wave transmitter.
 * We synthesise the same audible signature: a short (~40-120 ms) tone
 * with a falling pitch glide ("Doppler chirp") and a quick AM envelope.
 * Tones land at random times following a Poisson process whose rate is
 * proportional to the currently-active meteor shower's ZHR (zenith
 * hourly rate). Background sporadic rate ≈ 10 pings/hr; a Perseids peak
 * (ZHR ≈ 100) gives roughly one ping every 30-40 seconds.
 *
 * No new dependencies — Web Audio scheduling only.
 */

type MeteorRadarBuses = {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
};

const BACKGROUND_RATE_PER_HOUR = 10;
const HORIZON_SEC = 0.6;
const TICK_MS = 120;

export class MeteorRadarInstrument {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  /** Currently scheduled pings-per-second (background + shower). */
  private rateHz: number;
  private muted = false;
  private running = false;
  private nextPingAt = 0;
  private timer: number | null = null;
  private boundTick: () => void;

  constructor(buses: MeteorRadarBuses) {
    this.ctx = buses.ctx;
    this.out = buses.out;
    this.rateHz = BACKGROUND_RATE_PER_HOUR / 3600;
    this.boundTick = () => this.tick();
  }

  /**
   * Set the active shower's ZHR (zenith hourly rate). 0 = sporadic
   * background only. Background ~10/hr is always added on top so the
   * radar never goes silent.
   */
  setShowerZhr(zhr: number): void {
    const z = Math.max(0, Number.isFinite(zhr) ? zhr : 0);
    this.rateHz = (BACKGROUND_RATE_PER_HOUR + z) / 3600;
  }

  setMuted(v: boolean): void {
    this.muted = v;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextPingAt = this.ctx.currentTime + this.poissonInterval();
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private poissonInterval(): number {
    // Exponential inter-arrival with mean 1/rateHz. Clamp the tail so a
    // freak large draw doesn't leave the radar silent for >5 minutes.
    const u = Math.max(1e-6, Math.random());
    const dt = -Math.log(u) / Math.max(this.rateHz, 1 / (60 * 60));
    return Math.min(dt, 300);
  }

  private schedule(): void {
    if (!this.running) return;
    const ctx = this.ctx;
    const horizon = ctx.currentTime + HORIZON_SEC;
    let safety = 32;
    while (this.nextPingAt < horizon && safety-- > 0) {
      this.firePing(this.nextPingAt);
      this.nextPingAt += this.poissonInterval();
    }
    this.timer = window.setTimeout(this.boundTick, TICK_MS);
  }

  private tick(): void {
    this.schedule();
  }

  private firePing(when: number): void {
    if (this.muted) return;
    const ctx = this.ctx;
    // Radio echoes occupy the audible range when down-mixed from the
    // transmitter carrier — typical perceived range is 200-2000 Hz with
    // a falling-Doppler chirp as the trail recedes.
    const startHz = 600 + Math.random() * 1400; // 600–2000
    const endHz = startHz * (0.35 + Math.random() * 0.35); // drop 30-65%
    const dur = 0.04 + Math.random() * 0.08; // 40–120 ms
    const peakGain = 0.18 + Math.random() * 0.12;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startHz, when);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(60, endHz),
      when + dur,
    );

    // FM via a tiny modulator gives the echo its grainy texture without
    // shipping a full FM synth.
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.type = "sine";
    mod.frequency.setValueAtTime(startHz * 1.5, when);
    mod.frequency.exponentialRampToValueAtTime(
      Math.max(80, endHz * 1.5),
      when + dur,
    );
    modGain.gain.setValueAtTime(startHz * 0.04, when);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(peakGain, when + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    // Light high-pass to keep the bass clean of any DC thump.
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 180;

    mod.connect(modGain).connect(osc.frequency);
    osc.connect(amp).connect(hp).connect(this.out);
    mod.start(when);
    osc.start(when);
    mod.stop(when + dur + 0.05);
    osc.stop(when + dur + 0.05);
  }
}

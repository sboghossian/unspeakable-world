/**
 * 🎛 SonificationEngine — orchestrates the four sonification instruments
 * (drone, pulsar-kick, bell, gw-swell) behind a single Web Audio
 * graph.
 *
 * Audio graph (top-down):
 *
 *   [instrument]  →  [instrument-bus gain]  ─┐
 *   [instrument]  →  [instrument-bus gain]  ─┼─→  [master gain]  →  [limiter]  →  destination
 *   …                                       ─┘
 *
 * Safety guarantees (CLAUDE.md "MUTE BY DEFAULT"):
 *   • AudioContext is created lazily on the first `play()` (autoplay
 *     compliance — most browsers refuse to start audio without a user
 *     gesture).
 *   • Master gain is clamped at MAX_MASTER_GAIN = 0.5.
 *   • A `DynamicsCompressor` configured as a soft limiter sits between
 *     master gain and the destination so a runaway instrument cannot
 *     clip the user's speakers.
 *   • Suspended on construction; the user must explicitly `play()` to
 *     resume the context.
 *
 * Scene wiring is intentionally light: `setSceneState()` is a single
 * descriptor with whatever the future host wants to push (brightest
 * star, pulsars in FOV, DSOs in FOV, etc.). The MVP wires:
 *   • brightestStarBV → drone pitch
 *   • brightestPulsarPeriodSec → kick period
 *   • dsoStrikes[] (id-keyed) → bell strikes (de-duped by id)
 *   • gwSwellTrigger (monotonically-increasing counter) → swell strikes
 *
 * Layers not yet wired (wash from HiPS, GW chirp from localization
 * proximity) — exposed as no-op hooks the future host can drive.
 */

import { BellInstrument } from "./instruments/bell";
import { DroneInstrument } from "./instruments/drone";
import { GwSwellInstrument } from "./instruments/gw-swell";
import { PulsarKickInstrument } from "./instruments/pulsar-kick";
import {
  bvToScaleDegree,
  degreeToHz,
  getScale,
  type ScaleId,
} from "./key";

export const MAX_MASTER_GAIN = 0.5;

export type InstrumentId = "drone" | "pulsarKick" | "bell" | "gwSwell";

export type SceneState = {
  /** Brightest visible star's B-V color index. null = no star in view. */
  brightestStarBV?: number | null;
  /** Spin period of the dominant pulsar in FOV (seconds). null = none. */
  brightestPulsarPeriodSec?: number | null;
  /**
   * One entry per Messier / bright DSO currently in frustum. The engine
   * de-dups by `id` so a held view doesn't ring the bell forever — the
   * tone fires once when an id first appears, then again only if it
   * leaves and re-enters.
   */
  dsosInFov?: ReadonlyArray<{ id: string; hz?: number }>;
  /**
   * Monotonically-increasing counter; bump by 1 each time you want a
   * GW swell. This decouples "trigger" from "scene tick" — perfect
   * when a host runs at 60 Hz but only wants one swell per minute.
   */
  gwSwellTrigger?: number;
};

export type EngineState = {
  readonly isPlaying: boolean;
  readonly masterMuted: boolean;
  readonly masterGain: number;
  readonly tempoBpm: number;
  readonly scaleId: ScaleId;
  readonly instrumentMuted: Readonly<Record<InstrumentId, boolean>>;
};

type EngineSubscriber = (state: EngineState) => void;

export class SonificationEngine {
  private ctx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private buses: Record<InstrumentId, GainNode> | null = null;

  private drone: DroneInstrument | null = null;
  private pulsarKick: PulsarKickInstrument | null = null;
  private bell: BellInstrument | null = null;
  private gwSwell: GwSwellInstrument | null = null;

  private playing = false;
  private masterMuted = true; // mute by default
  private masterGain = 0.35;
  private tempoBpm = 90;
  private scaleId: ScaleId = "cMinor";
  private instrumentMuted: Record<InstrumentId, boolean> = {
    drone: false,
    pulsarKick: false,
    bell: false,
    gwSwell: false,
  };
  private dsoSeen = new Set<string>();
  private lastGwTrigger = 0;
  private subscribers = new Set<EngineSubscriber>();

  /** Snapshot of engine state for React UI binding. */
  getState(): EngineState {
    return {
      isPlaying: this.playing,
      masterMuted: this.masterMuted,
      masterGain: this.masterGain,
      tempoBpm: this.tempoBpm,
      scaleId: this.scaleId,
      instrumentMuted: { ...this.instrumentMuted },
    };
  }

  subscribe(fn: EngineSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify(): void {
    const snap = this.getState();
    this.subscribers.forEach((fn) => {
      fn(snap);
    });
  }

  /**
   * Resume audio context + start all enabled instruments. Idempotent.
   * Returns true if audio actually started, false if the browser
   * refused (no AudioContext API / autoplay block we can't recover).
   */
  async play(): Promise<boolean> {
    if (this.playing) return true;
    if (typeof window === "undefined") return false;
    if (!this.ensureGraph()) return false;
    const ctx = this.ctx;
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    this.masterMuted = false;
    this.applyMasterGain();
    this.startInstruments();
    this.playing = true;
    this.notify();
    return true;
  }

  pause(): void {
    if (!this.playing) return;
    this.masterMuted = true;
    this.stopInstruments();
    this.applyMasterGain();
    this.playing = false;
    this.notify();
  }

  setMasterGain(v: number): void {
    if (!Number.isFinite(v)) return;
    this.masterGain = Math.max(0, Math.min(MAX_MASTER_GAIN, v));
    this.applyMasterGain();
    this.notify();
  }

  setTempo(bpm: number): void {
    this.tempoBpm = Math.max(40, Math.min(180, bpm));
    this.notify();
  }

  setScale(id: ScaleId): void {
    this.scaleId = id;
    // Recompute drone pitch from current scale if we have one cached.
    if (this.lastBV !== null && this.drone) {
      this.drone.setPitch(this.bvToHz(this.lastBV));
    }
    this.notify();
  }

  setInstrumentMuted(id: InstrumentId, muted: boolean): void {
    this.instrumentMuted[id] = muted;
    if (this.buses) {
      const bus = this.buses[id];
      const ctx = this.ctx;
      if (bus && ctx) {
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.linearRampToValueAtTime(
          muted ? 0 : 1,
          ctx.currentTime + 0.05,
        );
      }
    }
    if (this.playing) {
      // Start/stop the periodic instruments (drone, pulsar kick) so
      // muting them frees the audio thread instead of just silencing.
      if (id === "drone" && this.drone) {
        if (muted) this.drone.stop();
        else this.drone.start();
      }
      if (id === "pulsarKick" && this.pulsarKick) {
        if (muted) this.pulsarKick.stop();
        else this.pulsarKick.start();
      }
    }
    if (this.bell) this.bell.setMuted(this.instrumentMuted.bell);
    if (this.gwSwell) this.gwSwell.setMuted(this.instrumentMuted.gwSwell);
    this.notify();
  }

  /** Per-frame state push from the scene. Cheap when nothing changed. */
  private lastBV: number | null = null;
  setSceneState(s: SceneState): void {
    if (!this.playing) return;
    if (s.brightestStarBV !== undefined && s.brightestStarBV !== null) {
      if (s.brightestStarBV !== this.lastBV) {
        this.lastBV = s.brightestStarBV;
        if (this.drone) this.drone.setPitch(this.bvToHz(s.brightestStarBV));
      }
    }
    if (
      s.brightestPulsarPeriodSec !== undefined &&
      s.brightestPulsarPeriodSec !== null &&
      this.pulsarKick
    ) {
      this.pulsarKick.setPulsarPeriod(
        s.brightestPulsarPeriodSec,
        this.tempoBpm,
      );
    }
    if (s.dsosInFov && this.bell) {
      const currentIds = new Set<string>();
      for (const d of s.dsosInFov) {
        currentIds.add(d.id);
        if (!this.dsoSeen.has(d.id)) {
          // First sighting → strike the bell.
          const hz = d.hz ?? this.degreeHz(4, 1);
          this.bell.strike(hz);
        }
      }
      // Prune ids that left the FOV so re-entry rings again.
      this.dsoSeen = currentIds;
    }
    if (
      s.gwSwellTrigger !== undefined &&
      s.gwSwellTrigger > this.lastGwTrigger
    ) {
      this.lastGwTrigger = s.gwSwellTrigger;
      this.gwSwell?.swell();
    }
  }

  /** One-shot triggers for UI testing / manual play. */
  triggerBell(degree = 4, octave = 1): void {
    if (this.bell) this.bell.strike(this.degreeHz(degree, octave));
  }
  triggerGwSwell(): void {
    this.gwSwell?.swell();
  }

  dispose(): void {
    this.pause();
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    this.ctx = null;
    this.masterGainNode = null;
    this.limiter = null;
    this.buses = null;
    this.drone = null;
    this.pulsarKick = null;
    this.bell = null;
    this.gwSwell = null;
    this.subscribers.clear();
  }

  // --- internal ---------------------------------------------------------

  private ensureGraph(): boolean {
    if (this.ctx && this.masterGainNode && this.limiter && this.buses) {
      return true;
    }
    type AudioCtor = new (opts?: AudioContextOptions) => AudioContext;
    const w = window as unknown as {
      AudioContext?: AudioCtor;
      webkitAudioContext?: AudioCtor;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return false;
    const ctx = new Ctor();
    const limiter = ctx.createDynamicsCompressor();
    // Configure as a brick-wall-ish limiter.
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(limiter).connect(ctx.destination);

    const droneBus = ctx.createGain();
    const kickBus = ctx.createGain();
    const bellBus = ctx.createGain();
    const swellBus = ctx.createGain();
    droneBus.gain.value = 1;
    kickBus.gain.value = 1;
    bellBus.gain.value = 1;
    swellBus.gain.value = 1;
    droneBus.connect(master);
    kickBus.connect(master);
    bellBus.connect(master);
    swellBus.connect(master);

    this.ctx = ctx;
    this.masterGainNode = master;
    this.limiter = limiter;
    this.buses = {
      drone: droneBus,
      pulsarKick: kickBus,
      bell: bellBus,
      gwSwell: swellBus,
    };
    this.drone = new DroneInstrument({ ctx, out: droneBus });
    this.pulsarKick = new PulsarKickInstrument({ ctx, out: kickBus });
    this.bell = new BellInstrument({ ctx, out: bellBus });
    this.gwSwell = new GwSwellInstrument({ ctx, out: swellBus });
    return true;
  }

  private startInstruments(): void {
    if (!this.instrumentMuted.drone) this.drone?.start();
    if (!this.instrumentMuted.pulsarKick) this.pulsarKick?.start();
    if (this.bell) this.bell.setMuted(this.instrumentMuted.bell);
    if (this.gwSwell) this.gwSwell.setMuted(this.instrumentMuted.gwSwell);
  }

  private stopInstruments(): void {
    this.drone?.stop();
    this.pulsarKick?.stop();
    if (this.bell) this.bell.setMuted(true);
    if (this.gwSwell) this.gwSwell.setMuted(true);
  }

  private applyMasterGain(): void {
    const ctx = this.ctx;
    const master = this.masterGainNode;
    if (!ctx || !master) return;
    const target = this.masterMuted ? 0 : this.masterGain;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(MAX_MASTER_GAIN, target)),
      ctx.currentTime + 0.05,
    );
  }

  private bvToHz(bv: number): number {
    const scale = getScale(this.scaleId);
    const degree = bvToScaleDegree(bv);
    return degreeToHz(scale, degree, -1); // one octave below middle
  }

  private degreeHz(degree: number, octave: number): number {
    return degreeToHz(getScale(this.scaleId), degree, octave);
  }
}

let _instance: SonificationEngine | null = null;
export function getSonificationEngine(): SonificationEngine {
  if (!_instance) _instance = new SonificationEngine();
  return _instance;
}

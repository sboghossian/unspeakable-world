/**
 * 🎓 Scene-specific tutor adapters.
 *
 * Each viewer mode (sky / solar / galactic / universe) speaks a slightly
 * different camera language — see the per-mode hash builders. This
 * module hides those differences behind one {@link TutorSceneAdapter}
 * shape so `TutorPanel` doesn't need per-mode branches.
 *
 * The adapters intentionally only know how to read/write camera +
 * overlay + active layers — nothing about input handling, materials,
 * or anything that would let a malicious teacher push code at students.
 */

import { Vector3 } from "three";
import { log } from "../../lib/logger";
import type { TutorState } from "./state-codec";
import type { TutorSceneAdapter } from "../ui/TutorPanel";

/* ------------------------------------------------------------------ */
/* Sky (Viewer.tsx)                                                     */
/* ------------------------------------------------------------------ */

/** Minimal scene-API the sky-mode adapter needs from `ViewerScene`. */
export type SkyAdapterScene = {
  getFov: () => number;
  getForward: () => Vector3;
  flyTo: (direction: Vector3, durationMs?: number) => void;
  setFov: (deg: number) => void;
  setOverlay: (surveyId: string | null) => void;
};

export function makeSkyAdapter(
  getScene: () => SkyAdapterScene | null,
  opts: {
    /** Active extra-layer ids — usually from the zustand store. */
    getActiveLayers: () => string[];
    /** Optional setter so a student also flips the right toggles. */
    setActiveLayers?: (ids: string[]) => void;
    /** Optional overlay id getter for snapshots. */
    getOverlayId?: () => string | null;
  },
): TutorSceneAdapter {
  return {
    mode: "sky",
    snapshot: () => {
      const scene = getScene();
      const fwd = scene?.getForward() ?? new Vector3(0, 0, -1);
      const fov = scene?.getFov() ?? 60;
      // Match Viewer.tsx's celestial RA/Dec conversion exactly so the
      // protocol matches the share-link format.
      const xCel = fwd.x;
      const yCel = -fwd.z;
      const zCel = fwd.y;
      const len = Math.hypot(xCel, yCel, zCel) || 1;
      const dec = (Math.asin(Math.max(-1, Math.min(1, zCel / len))) * 180) / Math.PI;
      let ra = (Math.atan2(yCel, xCel) * 180) / Math.PI;
      if (ra < 0) ra += 360;
      const layers = opts.getActiveLayers();
      const overlay = opts.getOverlayId?.() ?? null;
      const result: Omit<TutorState, "v" | "ts"> = {
        mode: "sky",
        camera: { ra, dec, fov },
        layers,
      };
      if (overlay) result.overlay = overlay;
      return result;
    },
    apply: (state: TutorState) => {
      const scene = getScene();
      if (!scene) return;
      const ra = state.camera["ra"];
      const dec = state.camera["dec"];
      const fov = state.camera["fov"];
      if (
        typeof ra === "number" &&
        typeof dec === "number" &&
        Number.isFinite(ra) &&
        Number.isFinite(dec)
      ) {
        const raRad = (ra * Math.PI) / 180;
        const decRad = (dec * Math.PI) / 180;
        const cdec = Math.cos(decRad);
        // Inverse of the snapshot transform: celestial → world Y-up.
        const dir = new Vector3(cdec * Math.cos(raRad), Math.sin(decRad), -cdec * Math.sin(raRad));
        try {
          scene.flyTo(dir, 600);
        } catch (err) {
          log.warn("[tutor/sky] flyTo failed", err);
        }
      }
      if (typeof fov === "number" && Number.isFinite(fov)) {
        try {
          scene.setFov(fov);
        } catch (err) {
          log.warn("[tutor/sky] setFov failed", err);
        }
      }
      try {
        scene.setOverlay(state.overlay ?? null);
      } catch (err) {
        log.warn("[tutor/sky] setOverlay failed", err);
      }
      opts.setActiveLayers?.(state.layers);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Solar flight (SolarFlight.tsx)                                       */
/* ------------------------------------------------------------------ */

export type SolarAdapterScene = {
  setFocus: (name: string) => void;
  setCameraState: (yaw: number, pitch: number, distance: number) => void;
  setTimeRate?: (rate: number) => void;
  setTime?: (t: Date) => void;
};

export function makeSolarAdapter(
  getScene: () => SolarAdapterScene | null,
  getState: () => {
    focus: string;
    yaw: number;
    pitch: number;
    cameraDistance: number;
    time: Date;
    timeRate: number;
  },
  opts: {
    getActiveLayers: () => string[];
    setActiveLayers?: (ids: string[]) => void;
  },
): TutorSceneAdapter {
  return {
    mode: "solar",
    snapshot: () => {
      const s = getState();
      return {
        mode: "solar",
        camera: {
          yaw: s.yaw,
          pitch: s.pitch,
          dist: s.cameraDistance,
          t: s.time.getTime(),
          rate: s.timeRate,
        },
        layers: opts.getActiveLayers(),
        focus: s.focus,
      };
    },
    apply: (state: TutorState) => {
      const scene = getScene();
      if (!scene) return;
      if (typeof state.focus === "string" && state.focus.length > 0) {
        try {
          scene.setFocus(state.focus);
        } catch (err) {
          log.warn("[tutor/solar] setFocus failed", err);
        }
      }
      const yaw = state.camera["yaw"];
      const pitch = state.camera["pitch"];
      const dist = state.camera["dist"];
      if (
        typeof yaw === "number" &&
        typeof pitch === "number" &&
        typeof dist === "number" &&
        Number.isFinite(yaw) &&
        Number.isFinite(pitch) &&
        Number.isFinite(dist)
      ) {
        try {
          scene.setCameraState(yaw, pitch, dist);
        } catch (err) {
          log.warn("[tutor/solar] setCameraState failed", err);
        }
      }
      const t = state.camera["t"];
      if (typeof t === "number" && Number.isFinite(t) && scene.setTime) {
        try {
          scene.setTime(new Date(t));
        } catch (err) {
          log.warn("[tutor/solar] setTime failed", err);
        }
      }
      const rate = state.camera["rate"];
      if (typeof rate === "number" && Number.isFinite(rate) && scene.setTimeRate) {
        try {
          scene.setTimeRate(rate);
        } catch (err) {
          log.warn("[tutor/solar] setTimeRate failed", err);
        }
      }
      opts.setActiveLayers?.(state.layers);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Universe (Universe.tsx)                                              */
/* ------------------------------------------------------------------ */

export type UniverseAdapterScene = {
  setCameraLogical: (x: number, y: number, z: number, yaw: number, pitch: number) => void;
  flyTo?: (target: string) => void;
};

export function makeUniverseAdapter(
  getScene: () => UniverseAdapterScene | null,
  getState: () => {
    cameraLogicalPos: { x: number; y: number; z: number };
    yaw: number;
    pitch: number;
    trackingTarget?: string | null;
  },
  opts: {
    getActiveLayers: () => string[];
    setActiveLayers?: (ids: string[]) => void;
  },
): TutorSceneAdapter {
  return {
    mode: "universe",
    snapshot: () => {
      const s = getState();
      const out: Omit<TutorState, "v" | "ts"> = {
        mode: "universe",
        camera: {
          cx: s.cameraLogicalPos.x,
          cy: s.cameraLogicalPos.y,
          cz: s.cameraLogicalPos.z,
          yaw: s.yaw,
          pitch: s.pitch,
        },
        layers: opts.getActiveLayers(),
      };
      if (s.trackingTarget) out.focus = s.trackingTarget;
      return out;
    },
    apply: (state: TutorState) => {
      const scene = getScene();
      if (!scene) return;
      const cx = state.camera["cx"];
      const cy = state.camera["cy"];
      const cz = state.camera["cz"];
      const yaw = state.camera["yaw"];
      const pitch = state.camera["pitch"];
      if (
        typeof cx === "number" &&
        typeof cy === "number" &&
        typeof cz === "number" &&
        Number.isFinite(cx) &&
        Number.isFinite(cy) &&
        Number.isFinite(cz)
      ) {
        try {
          scene.setCameraLogical(
            cx,
            cy,
            cz,
            Number.isFinite(yaw) ? (yaw as number) : 0,
            Number.isFinite(pitch) ? (pitch as number) : 0,
          );
        } catch (err) {
          log.warn("[tutor/universe] setCameraLogical failed", err);
        }
      }
      opts.setActiveLayers?.(state.layers);
    },
  };
}

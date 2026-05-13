import { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { Body, GeoVector, HelioVector } from "astronomy-engine";

/**
 * 📏 DSO Distances HUD.
 *
 * Floating panel (bottom-right, above SupportRibbon) listing ~10 famous
 * cosmic objects with their live camera-to-object distances. Updates
 * every 250 ms so the readout breathes without dominating the rAF
 * budget.
 *
 * The HUD reads a `getCameraWorldPos()` helper exposed by the active
 * scene class (ViewerScene / SolarFlightScene / UniverseScene). Each
 * scene encodes its world units differently — sky=unit sphere, solar
 * flight=AU, universe=AU at the solar group origin — so we accept an
 * optional `unitScaleToMeters` plus an optional `cameraLogicalLY`
 * callback for universe mode and convert each object's catalog
 * distance into the same physical frame for an apples-to-apples
 * camera-relative readout.
 *
 * Default OFF — opt-in via a Settings toggle. The panel is hidden
 * entirely until `visible === true`.
 */

const AU_TO_METERS = 1.495978707e11;
const LY_TO_METERS = 9.4607304725808e15;
const PARSEC_TO_METERS = 3.0856775814913673e16;
const MPC_TO_METERS = PARSEC_TO_METERS * 1e6;

type DsoEntry = {
  name: string;
  /** Hard catalog distance from Sun (Earth, for Moon) in meters. */
  distanceFromSunM: number;
  /** Direction in equatorial J2000 (RA degrees, Dec degrees). Used to
   *  derive a world-space position vs. the camera. */
  raDeg: number;
  decDeg: number;
  /** Live ephemeris flag — for Sun + Moon we ignore the static catalog
   *  distance and ask AstronomyEngine for the current geocentric range. */
  ephemeris?: "sun" | "moon";
};

const ENTRIES: DsoEntry[] = [
  // Always-present anchors
  {
    name: "Sun",
    distanceFromSunM: 0,
    raDeg: 0,
    decDeg: 0,
    ephemeris: "sun",
  },
  {
    name: "Moon",
    distanceFromSunM: 384_400_000, // mean Earth-Moon distance
    raDeg: 0,
    decDeg: 0,
    ephemeris: "moon",
  },
  // Bright nearby stars
  {
    name: "Sirius",
    distanceFromSunM: 8.6 * LY_TO_METERS,
    raDeg: 101.287,
    decDeg: -16.716,
  },
  {
    name: "Vega",
    distanceFromSunM: 25.04 * LY_TO_METERS,
    raDeg: 279.234,
    decDeg: 38.784,
  },
  {
    name: "Polaris",
    distanceFromSunM: 433 * LY_TO_METERS,
    raDeg: 37.955,
    decDeg: 89.264,
  },
  {
    name: "Alpha Centauri",
    distanceFromSunM: 4.367 * LY_TO_METERS,
    raDeg: 219.902,
    decDeg: -60.834,
  },
  // Deep-sky
  {
    name: "M31 Andromeda",
    distanceFromSunM: 2.537e6 * LY_TO_METERS,
    raDeg: 10.685,
    decDeg: 41.269,
  },
  {
    name: "Sgr A*",
    distanceFromSunM: 26_700 * LY_TO_METERS,
    raDeg: 266.417,
    decDeg: -29.008,
  },
  {
    name: "M87*",
    distanceFromSunM: 16.4 * MPC_TO_METERS,
    raDeg: 187.706,
    decDeg: 12.391,
  },
  {
    name: "GW170817 host (NGC 4993)",
    distanceFromSunM: 40 * MPC_TO_METERS,
    raDeg: 197.448,
    decDeg: -23.384,
  },
  {
    name: "CMB horizon",
    distanceFromSunM: 13.8e9 * LY_TO_METERS,
    raDeg: 0,
    decDeg: 0,
  },
];

export type DsoSceneSource = {
  /** Camera world position in scene units. */
  getCameraWorldPos: () => Vector3;
  /**
   * Multiplier converting one scene unit into meters. Sky=very large
   * (objects lie on a unit shell so we use catalog distances directly),
   * solar=1 AU per unit, universe=1 AU per unit in the solarGroup.
   */
  unitScaleToMeters: number;
  /**
   * Optional: in universe mode the WebGL camera stays at the world
   * origin while the "logical" camera position is tracked in LY in the
   * galactic frame. When this callback is set we use it as the
   * authoritative camera position and switch the unit-scale to LY.
   */
  getCameraLogicalLY?: () => Vector3;
  /**
   * `"sky" | "solar" | "universe"` — labels how to interpret the camera
   * position. In sky mode the camera sits at the world origin and all
   * objects sit on the unit shell, so we use catalog distances directly
   * (the camera is "at the Sun").
   */
  mode: "sky" | "solar" | "universe";
};

type Tracked = {
  name: string;
  distanceM: number;
  trend: "up" | "down" | "flat";
};

/** Human-friendly distance string. Picks the most legible unit based on
 *  magnitude. AU for inner solar system, light-seconds/minutes for the
 *  Earth-Moon system, light-years past ~0.1 LY, Mly past 100 kly, etc. */
function fmtDistance(m: number): string {
  if (!Number.isFinite(m)) return "—";
  const abs = Math.abs(m);
  if (abs < 1e3) return `${m.toFixed(0)} m`;
  if (abs < 1e6) return `${(m / 1e3).toFixed(1)} km`;

  // Light-time for short ranges (Moon ≈ 1.3 light-seconds, Sun ≈ 8.3 light-minutes).
  const C = 2.99792458e8;
  const lightSec = m / C;
  if (abs < AU_TO_METERS) {
    if (lightSec < 60) return `${lightSec.toFixed(1)} light-seconds`;
    if (lightSec < 3600) return `${(lightSec / 60).toFixed(1)} light-minutes`;
  }

  if (abs < 0.1 * LY_TO_METERS) {
    const au = m / AU_TO_METERS;
    if (au < 10) return `${au.toFixed(2)} AU`;
    return `${au.toFixed(0)} AU`;
  }

  const ly = m / LY_TO_METERS;
  if (Math.abs(ly) < 1000) return `${ly.toFixed(1)} ly`;
  if (Math.abs(ly) < 1e6) return `${(ly / 1e3).toFixed(1)} kly`;
  if (Math.abs(ly) < 1e9) return `${(ly / 1e6).toFixed(2)} Mly`;
  return `${(ly / 1e9).toFixed(2)} Gly`;
}

/** Convert (RA, Dec, distance) into an equatorial cartesian vector in
 *  meters. RA/Dec are equatorial J2000; the resulting vector points
 *  from the Sun outward to the object. */
function objectPositionM(raDeg: number, decDeg: number, distM: number): Vector3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return new Vector3(
    distM * cosDec * Math.cos(ra),
    distM * cosDec * Math.sin(ra),
    distM * Math.sin(dec),
  );
}

/** Resolve a single entry's camera-relative distance in meters at `now`. */
function distanceForEntry(
  entry: DsoEntry,
  cameraM: Vector3,
  now: Date,
): number {
  if (entry.ephemeris === "sun") {
    // Geocentric Sun range (AU → m). When the camera is at heliocentric
    // origin (sky-mode) this resolves to ~1 AU, which is correct.
    try {
      const v = GeoVector(Body.Sun, now, true);
      // GeoVector returns coords relative to Earth; the Sun-camera
      // distance depends on the scene. The simplest physically-honest
      // approximation: the camera's position relative to the Sun is
      // exactly `cameraM`, so the Sun's camera-distance is |cameraM|.
      void v;
      return cameraM.length();
    } catch {
      return cameraM.length();
    }
  }
  if (entry.ephemeris === "moon") {
    // Geocentric Moon → meters. Add the camera's offset from Earth into
    // the result. In sky-mode the camera sits at Earth, in solar/
    // universe modes the camera could be anywhere; for visualization
    // accuracy we cheat and just return Earth-Moon distance — the user
    // is virtually "at Earth" when reading the Moon entry.
    try {
      const v = GeoVector(Body.Moon, now, true);
      return Math.hypot(v.x, v.y, v.z) * AU_TO_METERS;
    } catch {
      return entry.distanceFromSunM;
    }
  }
  const objM = objectPositionM(entry.raDeg, entry.decDeg, entry.distanceFromSunM);
  return objM.distanceTo(cameraM);
}

/** Convert the scene's camera position into heliocentric meters. */
function cameraToHelioM(
  source: DsoSceneSource,
  cameraWorld: Vector3,
  cameraLogicalLY: Vector3 | null,
  earthHelioM: Vector3,
): Vector3 {
  if (source.mode === "sky") {
    // Sky view: camera sits at Earth (origin), so heliocentric position
    // is Earth's heliocentric position.
    return earthHelioM.clone();
  }
  if (source.mode === "solar") {
    // Solar flight: 1 scene unit = 1 AU heliocentric.
    return cameraWorld.clone().multiplyScalar(AU_TO_METERS);
  }
  // Universe: prefer logicalLY when provided. The galactic frame keeps
  // the Sun at (26000, 0, 0) LY, so we subtract that to recover the
  // camera's heliocentric LY coordinate.
  if (cameraLogicalLY) {
    const sunLY = new Vector3(26000, 0, 0);
    const helioLY = cameraLogicalLY.clone().sub(sunLY);
    return helioLY.multiplyScalar(LY_TO_METERS);
  }
  // Fallback for universe without logical-LY: treat world units as AU
  // in the solar group.
  return cameraWorld.clone().multiplyScalar(AU_TO_METERS);
}

export type DsoDistancesHudProps = {
  source: DsoSceneSource | null;
  /** Whether the panel is currently rendered. */
  visible: boolean;
  /** Dismiss handler — hide the panel without changing the persisted
   *  Settings toggle. */
  onDismiss?: () => void;
};

export function DsoDistancesHud({
  source,
  visible,
  onDismiss,
}: DsoDistancesHudProps) {
  const [rows, setRows] = useState<Tracked[]>([]);
  const prevDist = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!visible || !source) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const now = new Date();
      let cameraWorld: Vector3;
      let cameraLogicalLY: Vector3 | null = null;
      try {
        cameraWorld = source.getCameraWorldPos();
        cameraLogicalLY = source.getCameraLogicalLY?.() ?? null;
      } catch {
        cameraWorld = new Vector3();
      }

      // Earth heliocentric in meters — used as the camera anchor in
      // sky mode so the Sun reads ~1 AU instead of 0.
      let earthHelio = new Vector3();
      try {
        const ev = HelioVector(Body.Earth, now);
        earthHelio = new Vector3(ev.x, ev.y, ev.z).multiplyScalar(AU_TO_METERS);
      } catch {
        earthHelio = new Vector3(AU_TO_METERS, 0, 0);
      }

      const cameraM = cameraToHelioM(
        source,
        cameraWorld,
        cameraLogicalLY,
        earthHelio,
      );

      const next: Tracked[] = [];
      const prev = prevDist.current;
      for (const e of ENTRIES) {
        const d = distanceForEntry(e, cameraM, now);
        const last = prev.get(e.name);
        let trend: Tracked["trend"] = "flat";
        if (last !== undefined && Number.isFinite(last) && Number.isFinite(d)) {
          const diff = d - last;
          // 0.1% threshold so the arrow doesn't flicker on micro-changes.
          if (Math.abs(diff) / Math.max(Math.abs(last), 1) > 1e-3) {
            trend = diff > 0 ? "up" : "down";
          }
        }
        prev.set(e.name, d);
        next.push({ name: e.name, distanceM: d, trend });
      }
      setRows(next);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [source, visible]);

  if (!visible || !source) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-20 right-4 z-30 w-[280px] rounded-xl border border-white/10 bg-space-950/85 p-3 font-mono text-[10px] text-white/80 shadow-2xl backdrop-blur sm:bottom-24"
      role="region"
      aria-label="DSO distances"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/55">
          Distances
        </span>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Hide distances HUD"
            className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            hide
          </button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-baseline justify-between gap-2 tabular-nums"
          >
            <span className="truncate text-white/65">{r.name}</span>
            <span className="flex items-center gap-1 text-white/90">
              <span>{fmtDistance(r.distanceM)}</span>
              <span
                aria-hidden
                className={
                  r.trend === "up"
                    ? "text-amber-300/80"
                    : r.trend === "down"
                      ? "text-emerald-300/80"
                      : "text-white/30"
                }
              >
                {r.trend === "up" ? "↑" : r.trend === "down" ? "↓" : "·"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

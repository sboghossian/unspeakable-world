import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { raDecToVec3 } from "../stars/coords";
import {
  DARK_MATTER_HALOS,
  massScaleFactor,
  type DarkMatterHalo,
} from "./dark-matter-halos";

/**
 * 🌑 Dark-matter halo overlay.
 *
 * Each catalog entry becomes a translucent radial-gradient sprite in the
 * galactic frame (1 unit = 1 light-year). The sprite is sized by the
 * halo's virial radius and shaded with a soft purple-blue gradient that
 * falls off with distance from the center — exactly the visual idiom
 * you see in cosmological-simulation slice plots (Illustris, EAGLE).
 *
 * This is intentionally NOT a particle simulation. It's a conceptual
 * overlay so the reader can grasp where the inferred mass lives
 * relative to the visible galaxies + clusters.
 *
 * Sprite positions are computed once at construction:
 *
 *   • Sky-anchored entries  → raDecToVec3(ra, dec, distanceLY) +
 *                              SUN_LY offset (matches the rest of the
 *                              galactic-frame catalogs).
 *   • Supergalactic-only    → sg coords transformed to galactic LY via
 *                              a standard SGL/SGB rotation. We only
 *                              fall back to this for the deep-supercluster
 *                              halos where (ra, dec) doesn't make the
 *                              filament structure intuitive.
 */

// Sun in galactic LY (matches universe-scene SUN_LY).
const SUN_LY = new Vector3(26000, 0, 0);

// 1 Mpc = 3.262 × 10^6 LY
const LY_PER_MPC = 3.262e6;
// 1 kpc = 3262 LY
const LY_PER_KPC = 3262;

// Rendering scale: 1 kpc R_vir → this many LY of sprite "radius" on screen.
// Halos are conceptual so we boost slightly above the actual R_vir to
// make them legible at galactic + cosmic zoom. 1 kpc ≈ 3,262 LY natively;
// we render at 1.3× to give halos a soft glow margin.
const HALO_RENDER_SCALE = 1.3 * LY_PER_KPC;

// Per-mass-tier tint. Brightest at galaxy-cluster mass; cooler/dimmer for
// dwarf-halos so the eye is drawn to the cluster cores.
const TINT_LIGHT_CLUSTER = { r: 0.55, g: 0.42, b: 0.95 }; // ~1e14-1e15
const TINT_GALAXY = { r: 0.42, g: 0.58, b: 0.95 }; // ~1e12
const TINT_DWARF = { r: 0.65, g: 0.65, b: 0.95 }; // ~1e9-1e11

function tintForMass(massMsun: number): { r: number; g: number; b: number } {
  if (massMsun >= 1e14) return TINT_LIGHT_CLUSTER;
  if (massMsun >= 5e11) return TINT_GALAXY;
  return TINT_DWARF;
}

/**
 * Procedural radial-gradient sprite: opaque-ish core, exponential
 * falloff to transparent at the rim. Reused across every halo
 * (just retinted via the SpriteMaterial color).
 */
function makeHaloTexture(): CanvasTexture {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const c = SIZE / 2;

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  // Inner core — semi-bright, NFW-ish density peak (compressed visually).
  grad.addColorStop(0.0, "rgba(255, 255, 255, 0.95)");
  grad.addColorStop(0.08, "rgba(220, 200, 255, 0.65)");
  grad.addColorStop(0.25, "rgba(170, 150, 255, 0.32)");
  grad.addColorStop(0.5, "rgba(120, 110, 220, 0.14)");
  grad.addColorStop(0.78, "rgba(90, 80, 180, 0.05)");
  grad.addColorStop(1.0, "rgba(60, 60, 140, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Convert supergalactic Cartesian (Mpc) to galactic LY coords used by
 * UniverseScene. The supergalactic plane is defined by the SGL/SGB
 * frame (de Vaucouleurs 1991); the canonical rotation puts the
 * supergalactic pole at galactic (l, b) = (47.37°, 6.32°).
 *
 * We use the standard 3×3 rotation matrix from supergalactic Cartesian
 * to galactic Cartesian, then map galactic axes onto our world frame
 * (galactic plane spans x/z, +y = north galactic pole).
 *
 * Numbers are rounded to 6 decimals.
 */
function supergalacticToWorldLY(
  sgxMpc: number,
  sgyMpc: number,
  sgzMpc: number,
): Vector3 {
  // Rotation matrix R: galactic = R · supergalactic
  // From de Vaucouleurs / Lahav 2000.
  const r11 = 0.733437,
    r12 = -0.541823,
    r13 = -0.41121;
  const r21 = 0.180102,
    r22 = 0.7095,
    r23 = -0.681242;
  const r31 = 0.65578,
    r32 = 0.45055,
    r33 = 0.605698;

  // Galactic Cartesian (Mpc)
  const gx = r11 * sgxMpc + r12 * sgyMpc + r13 * sgzMpc;
  const gy = r21 * sgxMpc + r22 * sgyMpc + r23 * sgzMpc;
  const gz = r31 * sgxMpc + r32 * sgyMpc + r33 * sgzMpc;

  // Convert Mpc → LY and map (gx, gy, gz) onto our world axes.
  // Convention used by the galactic frame here: +y is up (out of disk),
  // disk lies in x/z. Galactic Cartesian has +z = north galactic pole.
  // So world ≈ (gx, gz, gy) in LY units, anchored at the Sun.
  const lyx = gx * LY_PER_MPC;
  const lyy = gz * LY_PER_MPC;
  const lyz = gy * LY_PER_MPC;

  return new Vector3(SUN_LY.x + lyx, lyy, SUN_LY.z + lyz);
}

/** Resolve a catalog entry to its absolute galactic-frame LY position. */
function haloPosition(h: DarkMatterHalo): Vector3 {
  // Sky-anchored entry — primary path, preferred when (ra, dec) is set.
  if (
    typeof h.raDeg === "number" &&
    typeof h.decDeg === "number" &&
    typeof h.distanceLY === "number"
  ) {
    const [dx, dy, dz] = raDecToVec3(h.raDeg, h.decDeg, h.distanceLY);
    // raDecToVec3 returns (x, y, z) on a celestial-frame sphere. Map to
    // the galactic world frame the same way LANDMARK_LIGHTCONE does in
    // universe-scene: (SUN_LY.x + dx, dy, SUN_LY.z + dz).
    return new Vector3(SUN_LY.x + dx, dy, SUN_LY.z + dz);
  }
  // Supergalactic fallback.
  if (
    typeof h.sgxMpc === "number" &&
    typeof h.sgyMpc === "number" &&
    typeof h.sgzMpc === "number"
  ) {
    return supergalacticToWorldLY(h.sgxMpc, h.sgyMpc, h.sgzMpc);
  }
  // Final fallback — drop at the Sun. Shouldn't happen with the
  // hand-authored catalog, but keeps the type safe.
  return SUN_LY.clone();
}

type PlacedHalo = {
  data: DarkMatterHalo;
  sprite: Sprite;
};

export class DarkMatterField {
  readonly group = new Group();
  private placed: PlacedHalo[] = [];

  constructor() {
    this.group.name = "DarkMatterField";
    this.group.visible = false;
    this.group.renderOrder = 2; // behind labels (which render at 3+)
    this.build();
  }

  setVisible(on: boolean): void {
    this.group.visible = on;
  }

  visible(): boolean {
    return this.group.visible;
  }

  list(): DarkMatterHalo[] {
    return DARK_MATTER_HALOS;
  }

  count(): number {
    return DARK_MATTER_HALOS.length;
  }

  private build(): void {
    const tex = makeHaloTexture();
    for (const h of DARK_MATTER_HALOS) {
      const pos = haloPosition(h);
      const tint = tintForMass(h.massMsun);
      const mat = new SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: 0.55,
        blending: AdditiveBlending,
      });
      mat.color.setRGB(tint.r, tint.g, tint.b);
      const sprite = new Sprite(mat);
      sprite.position.copy(pos);

      // Size proportional to virial radius. Boost a touch by mass tier so
      // cluster halos read significantly larger than dwarf-galaxy halos
      // even when their R_vir is "only" 5-10× as big.
      const massBoost = 1 + massScaleFactor(h.massMsun) * 0.25;
      const diameterLY = h.virialRadiusKpc * 2 * HALO_RENDER_SCALE * massBoost;
      sprite.scale.set(diameterLY, diameterLY, 1);
      sprite.renderOrder = 2;
      this.group.add(sprite);
      this.placed.push({ data: h, sprite });
    }
  }

  /** Halos + their sprites — exposed for downstream raycasting if ever needed. */
  pickables(): ReadonlyArray<PlacedHalo> {
    return this.placed;
  }

  dispose(): void {
    for (const p of this.placed) {
      p.sprite.material.dispose();
    }
    this.placed = [];
    this.group.clear();
  }
}

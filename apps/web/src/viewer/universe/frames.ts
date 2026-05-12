/**
 * Tier-aware coordinate-frame wrappers for Universe Mode v2.
 *
 * Each frame is a thin controller around a `Three.Group`:
 *
 *   - `SolarFrame`   — 1 unit = 1 AU. Anchored on the Sun.
 *   - `GalacticFrame` — 1 unit = 1 LY. Anchored on the galactic centre (0,0,0).
 *
 * Both frames live in the same `Scene` at world origin. Each tick the
 * universe scene calls `setCameraOffset(logicalPosLY)` and we translate
 * the group so the camera (always at world (0,0,0)) sits next to whatever
 * the frame considers "local". This keeps WebGL float32 precision usable
 * across the full 30-decade scale of the scene.
 *
 * Materials are registered with the frame via `registerOpacity` (or
 * `registerOpacities`) and faded in/out by `setTierAlpha(alpha)`. The
 * frame remembers each material's natural max opacity so re-enabling a
 * fully-opaque layer doesn't suddenly clip translucent overlays.
 */

import { Group, Vector3 } from "three";
import { AU_PER_LY, SUN_LY } from "./tiers";

/** Anything we know how to fade — covers most three.js materials. */
export type FadeableMaterial = {
  opacity?: number;
  transparent?: boolean;
  visible?: boolean;
  needsUpdate?: boolean;
};

type RegisteredMaterial = {
  mat: FadeableMaterial;
  baseOpacity: number;
};

/** Solar-frame controller — 1 unit = 1 AU. */
export class SolarFrame {
  /** Underlying scene group. Add child objects directly via `.group`. */
  readonly group: Group;
  private materials: RegisteredMaterial[] = [];
  private lastAlpha = 1;

  constructor(group?: Group) {
    this.group = group ?? new Group();
    this.group.name = "universe-solar-frame";
  }

  /**
   * Translate the frame so the camera (at world origin) is positioned
   * `logicalPosLY` away from the galactic centre. The Sun sits at
   * `SUN_LY` in galactic units, so its world-space position becomes
   * `(SUN_LY - logicalPosLY) * AU_PER_LY` (we're now in AU).
   */
  setCameraOffset(logicalPosLY: Vector3): void {
    const sunRelX = SUN_LY.x - logicalPosLY.x;
    const sunRelY = SUN_LY.y - logicalPosLY.y;
    const sunRelZ = SUN_LY.z - logicalPosLY.z;
    this.group.position.set(
      sunRelX * AU_PER_LY,
      sunRelY * AU_PER_LY,
      sunRelZ * AU_PER_LY,
    );
  }

  /** Register a material whose opacity should track the tier alpha. */
  registerOpacity(mat: FadeableMaterial, baseOpacity = 1): void {
    this.materials.push({ mat, baseOpacity });
  }

  registerOpacities(mats: FadeableMaterial[], baseOpacity = 1): void {
    for (const m of mats) this.registerOpacity(m, baseOpacity);
  }

  /**
   * Drive every registered material's opacity by `alpha * baseOpacity`.
   * The group itself is hidden when alpha drops below 0.02 so we don't
   * waste GPU time tessellating planets the user can't see.
   */
  setTierAlpha(alpha: number): void {
    this.lastAlpha = clamp01(alpha);
    for (const r of this.materials) {
      r.mat.opacity = this.lastAlpha * r.baseOpacity;
      r.mat.transparent = true;
      r.mat.needsUpdate = true;
    }
    this.group.visible = this.lastAlpha > 0.02;
  }

  alpha(): number {
    return this.lastAlpha;
  }
}

/** Galactic-frame controller — 1 unit = 1 LY. */
export class GalacticFrame {
  /** Underlying scene group. Add child objects directly via `.group`. */
  readonly group: Group;
  private materials: RegisteredMaterial[] = [];
  private lastAlpha = 1;

  constructor(group?: Group) {
    this.group = group ?? new Group();
    this.group.name = "universe-galactic-frame";
  }

  /**
   * Translate the frame so the camera (at world origin) coincides with
   * `logicalPosLY` — i.e. shift the group by `-logicalPosLY` so the
   * galactic-centre object originally at world (0,0,0) now sits at
   * `-logicalPosLY` in world space.
   */
  setCameraOffset(logicalPosLY: Vector3): void {
    this.group.position.set(-logicalPosLY.x, -logicalPosLY.y, -logicalPosLY.z);
  }

  registerOpacity(mat: FadeableMaterial, baseOpacity = 1): void {
    this.materials.push({ mat, baseOpacity });
  }

  registerOpacities(mats: FadeableMaterial[], baseOpacity = 1): void {
    for (const m of mats) this.registerOpacity(m, baseOpacity);
  }

  setTierAlpha(alpha: number): void {
    this.lastAlpha = clamp01(alpha);
    for (const r of this.materials) {
      r.mat.opacity = this.lastAlpha * r.baseOpacity;
      r.mat.transparent = true;
      r.mat.needsUpdate = true;
    }
    // Galactic group is always on (cosmic web / disk are large), but we
    // can still skip when alpha is essentially zero.
    this.group.visible = this.lastAlpha > 0.02;
  }

  alpha(): number {
    return this.lastAlpha;
  }
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

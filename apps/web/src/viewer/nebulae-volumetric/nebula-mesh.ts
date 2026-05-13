/**
 * nebula-mesh — per-nebula volumetric raymarched mesh.
 *
 * One `Mesh` per catalog row:
 *   • BoxGeometry of unit size, scaled per row to the nebula's physical
 *     light-year (galactic mode) or unit-sphere angular (sky mode) extent.
 *   • `ShaderMaterial` wired to the raymarch shaders from
 *     `shaders/raymarch.glsl`. We render `FrontSide` only — front-faces
 *     are the entry into the volume. When the camera enters the cube,
 *     Three.js falls back to drawing the back face since the front is
 *     culled; the host swaps `side = BackSide` to keep the volume
 *     visible from inside (see `setCameraInside`).
 *   • `transparent: true`, `depthWrite: false`, `depthTest: true` so
 *     nebulae composite with the rest of the scene without writing into
 *     the depth buffer.
 *
 * Picking: each mesh sets `userData.nebulaId / .nebulaName` so a future
 * raycast picker can read them.
 */

import {
  BackSide,
  BoxGeometry,
  FrontSide,
  Mesh,
  ShaderMaterial,
  type Vector3,
} from "three";

import {
  type NebulaRow,
  SHAPE_INDEX,
} from "./data/nebulae-catalog";
import { NEBULA_FRAG, NEBULA_VERT } from "./shaders/raymarch.glsl";

/** Renderer-controlled mode the host passes through. */
export type NebulaPlacementMode = "sky" | "galactic" | "universe";

/** Default fade radii in world units (LY). Galactic + universe modes. */
const FADE_START_LY = 100;
const FADE_END_LY = 12_000;

/**
 * Sky-mode fade radii: the camera in sky mode is at the origin and the
 * unit sphere is at radius 1, so we want the nebula to be visible across
 * the entire camera range. We pick generous numbers and let the alpha
 * stay at 1.0 effectively.
 */
const SKY_FADE_START = 100;
const SKY_FADE_END = 10_000;

export class NebulaMesh {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly geometry: BoxGeometry;
  private currentMode: NebulaPlacementMode = "sky";
  private cameraIsInside = false;

  constructor(row: NebulaRow) {
    this.geometry = new BoxGeometry(1, 1, 1);
    this.material = buildMaterial(row);
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = `nebula:${row.id}`;
    this.mesh.userData["nebulaId"] = row.id;
    this.mesh.userData["nebulaName"] = row.name;
    this.mesh.userData["nebulaShape"] = row.shape;
    this.mesh.renderOrder = 1;
    // BoxGeometry is bounded, let Three.js cull it when offscreen.
    this.mesh.frustumCulled = true;
  }

  /** Drive the slow internal turbulence (filaments shimmer). */
  setTime(seconds: number): void {
    const u = this.material.uniforms["uTime"];
    if (u) u.value = seconds;
  }

  /** Place + scale the mesh according to mode + a sky-mode quad size. */
  setWorldTransform(
    worldPos: Vector3,
    boxSizeWorld: number,
    mode: NebulaPlacementMode,
  ): void {
    this.mesh.position.copy(worldPos);
    this.mesh.scale.set(boxSizeWorld, boxSizeWorld, boxSizeWorld);
    if (mode !== this.currentMode) {
      this.currentMode = mode;
      this.applyFadeForMode(mode);
    }
  }

  /**
   * Switch culling side when the camera crosses the front face. The host
   * camera-position checker calls this every frame; only updates the
   * material when the inside flag actually flips.
   */
  setCameraInside(inside: boolean): void {
    if (inside === this.cameraIsInside) return;
    this.cameraIsInside = inside;
    this.material.side = inside ? BackSide : FrontSide;
    this.material.needsUpdate = true;
  }

  setVisible(v: boolean): void {
    this.mesh.visible = v;
  }

  /** Allow host to query whether camera is within this nebula's box. */
  containsWorldPoint(worldPos: Vector3): boolean {
    // Approximate: distance to mesh centre vs. half-edge × √3 (corner radius).
    const dx = worldPos.x - this.mesh.position.x;
    const dy = worldPos.y - this.mesh.position.y;
    const dz = worldPos.z - this.mesh.position.z;
    const halfEdge = this.mesh.scale.x * 0.5;
    return (
      Math.abs(dx) < halfEdge &&
      Math.abs(dy) < halfEdge &&
      Math.abs(dz) < halfEdge
    );
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private applyFadeForMode(mode: NebulaPlacementMode): void {
    const fadeStart =
      mode === "sky" ? SKY_FADE_START : FADE_START_LY;
    const fadeEnd = mode === "sky" ? SKY_FADE_END : FADE_END_LY;
    const us = this.material.uniforms["uFadeStart"];
    const ue = this.material.uniforms["uFadeEnd"];
    if (us) us.value = fadeStart;
    if (ue) ue.value = fadeEnd;
  }
}

function buildMaterial(row: NebulaRow): ShaderMaterial {
  const shapeId = SHAPE_INDEX[row.shape];
  return new ShaderMaterial({
    uniforms: {
      uShape: { value: shapeId },
      uCoreColor: { value: [...row.coreColor] },
      uMidColor: { value: [...row.midColor] },
      uDustColor: { value: [...row.dustColor] },
      uDensityScale: { value: row.densityScale },
      uDustStrength: { value: row.dustStrength },
      uGlowStrength: { value: row.glowStrength },
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
      uFadeStart: { value: SKY_FADE_START },
      uFadeEnd: { value: SKY_FADE_END },
    },
    vertexShader: NEBULA_VERT,
    fragmentShader: NEBULA_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: FrontSide,
  });
}

import {
  BufferAttribute,
  BufferGeometry,
  Group,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";
import { getStarCountCap } from "../../lib/quality";
import { bvToRgb, raDecToVec3 } from "./coords";

/**
 * Bright-star catalog rendered as a single GPU-instanced Points object.
 *
 * Source: HYG v4.0 filtered to apparent magnitude ≤ 6.5 (naked-eye limit),
 * packed into a 139 KB binary by `apps/etl/hyg-bright.mjs`.
 *
 * Renders on a sphere of radius slightly larger than the HiPS sky so stars
 * are visually in front of the survey imagery without z-fighting.
 *
 * Day 4 cut: static positions (J2000, no proper motion). Day 5+ adds
 * proper motion. Higher-order time-tracking via AstronomyEngine on planets.
 */

const STAR_RADIUS = 0.998; // just *inside* HiPS sphere — closer to camera = wins the depth test

/** Star data layout in the binary file: u32 count, then [f32 ra, f32 dec, f32 mag, f32 bv]. */
type StarRecord = { ra: number; dec: number; mag: number; bv: number };

export class StarField {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private starCount = 0;

  constructor() {
    this.group.name = "StarField";
    this.group.renderOrder = -5; // in front of HiPS (-10/-8) but behind anything else
    this.group.rotation.x = -Math.PI / 2; // Z-up astronomy → Y-up Three.js
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`star catalog HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const fileCount = view.getUint32(0, true);
    // Quality preset caps the bright-star count. The HYG binary is
    // already sorted by apparent magnitude (brightest first) so a
    // straight truncation keeps the visually-dominant stars.
    const cap = getStarCountCap();
    const count = Math.min(fileCount, cap);
    const stars: StarRecord[] = new Array(count);
    let o = 4;
    for (let i = 0; i < count; i++) {
      stars[i] = {
        ra: view.getFloat32(o, true),
        dec: view.getFloat32(o + 4, true),
        mag: view.getFloat32(o + 8, true),
        bv: view.getFloat32(o + 12, true),
      };
      o += 16;
    }
    this.build(stars);
  }

  private build(stars: StarRecord[]): void {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    const sizes = new Float32Array(stars.length);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]!;
      const [x, y, z] = raDecToVec3(s.ra, s.dec, STAR_RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const [r, g, b] = bvToRgb(s.bv);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Magnitude → point size. Mag 0 = brightest star (Sirius), mag 6.5 = naked-eye limit.
      // Pogson: brightness ∝ 10^(-mag/2.5); we map to a perceptual point size.
      const brightness = Math.pow(10, -s.mag / 2.5);
      // Tuned for visibility on top of HiPS imagery: mag-0 stars get ~22 px,
      // mag-6 stars stay at ~3 px so the field doesn't feel like fireflies.
      sizes[i] = 1.5 + 22 * Math.pow(brightness, 0.45);
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geom.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uIntensity: { value: 1.0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false, // we sit inside the HiPS sphere; render order owns visibility
      // Normal alpha blending so the star core *overwrites* the HiPS imagery
      // pixel — additive blending just clipped to white over bright regions
      // and made stars invisible against the galactic plane.
      blending: NormalBlending,
    });

    this.material = material;
    this.points = new Points(geom, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -5;
    this.group.add(this.points);
    this.starCount = stars.length;
  }

  setIntensity(value: number): void {
    if (this.material) this.material.uniforms.uIntensity!.value = value;
  }

  count(): number {
    return this.starCount;
  }

  dispose(): void {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as ShaderMaterial).dispose();
      this.group.remove(this.points);
      this.points = null;
      this.material = null;
    }
  }
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  varying vec3 vColor;

  uniform float uPixelRatio;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // Stars sit on a unit sphere so distance is ~1; we use aSize as a direct
    // pixel size with DPR scaling. No 1/d falloff — that just made stars at
    // the camera-frustum edge balloon.
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  uniform float uIntensity;

  void main() {
    // Soft round point with radial falloff in screen space.
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    // Core is opaque white-tinted (mostly the body color washed toward white),
    // halo blends to color. The high core alpha is what makes the star *pop*
    // against bright HiPS regions instead of disappearing into them.
    float core = 1.0 - smoothstep(0.0, 0.04, r2);
    float halo = (1.0 - smoothstep(0.04, 0.25, r2)) * 0.55;
    vec3 coreCol = mix(vColor, vec3(1.0), 0.85);
    vec3 haloCol = vColor;
    vec3 col = coreCol * core + haloCol * halo;
    float alpha = clamp(core + halo, 0.0, 1.0) * uIntensity;
    gl_FragColor = vec4(col, alpha);
  }
`;

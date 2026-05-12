import {
  DoubleSide,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from "three";

/**
 * Sun gravity-well grid — a thin lattice in the ecliptic plane that dips
 * toward the Sun like a stretched rubber sheet. Pure vertex-shader trick:
 * a tessellated PlaneGeometry whose y is displaced by -k / (r + eps) per
 * vertex, with grid lines drawn in the fragment shader using fract().
 *
 * Visible only when zoomed in to inner-solar-system scales; fades out at
 * Neptune's orbit and beyond so it doesn't litter galactic views.
 */

const SIZE = 60; // 60 AU square — covers Mercury → Pluto
const SEGMENTS = 220;

export class SunGravityWell {
  readonly mesh: Mesh;
  private mat: ShaderMaterial;

  constructor() {
    const geom = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geom.rotateX(-Math.PI / 2); // lay flat in XZ plane (ecliptic)
    this.mat = new ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.0 },
        uWellDepth: { value: 1.6 },
        uGridSpacing: { value: 1.0 }, // 1 AU per grid square
      },
      vertexShader: `
        uniform float uWellDepth;
        varying vec3 vWorldPos;
        varying float vDist;
        void main() {
          // World-space radial distance from the Sun (origin).
          float r = length(position.xz);
          // Inverse-falloff dip — steep near the Sun, shallow far away.
          // The +0.4 softener keeps the math from blowing up at r → 0.
          float dip = -uWellDepth / (r + 0.4);
          vec3 displaced = vec3(position.x, dip, position.z);
          vec4 wp = modelMatrix * vec4(displaced, 1.0);
          vWorldPos = wp.xyz;
          vDist = r;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uGridSpacing;
        varying vec3 vWorldPos;
        varying float vDist;
        void main() {
          // Grid-line intensity: brighten when fragment is near an integer
          // multiple of uGridSpacing in either x or z. Width softened
          // with fwidth-style approximation for anti-aliasing.
          float lineU = abs(fract(vWorldPos.x / uGridSpacing - 0.5) - 0.5);
          float lineV = abs(fract(vWorldPos.z / uGridSpacing - 0.5) - 0.5);
          float line = max(
            smoothstep(0.05, 0.0, lineU),
            smoothstep(0.05, 0.0, lineV)
          );
          // Radial darken so the grid concentrates near the Sun.
          float radial = exp(-vDist * 0.06);
          float a = line * (0.25 + 0.75 * radial) * uOpacity;
          vec3 col = mix(vec3(0.45, 0.6, 0.9), vec3(1.0, 0.85, 0.6), radial);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(geom, this.mat);
    this.mesh.renderOrder = -1; // draw under planets
    this.mesh.visible = false;
  }

  /** Fade in inside the inner solar system; fade out by ~50 AU. */
  updateForCamera(camDistAU: number): void {
    const t = Math.max(0, Math.min(1, (50 - camDistAU) / 35));
    this.mat.uniforms["uOpacity"]!.value = t;
    this.mesh.visible = t > 0.02;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

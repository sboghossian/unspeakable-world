import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from "three";

/**
 * 💫 Oort Cloud — a thick spherical shell of icy bodies at the edge of
 * the Solar System. The real Oort spans ~2,000–100,000 AU (the cinematic
 * version we render is cosmetically compressed to ~2,000–6,000 AU so it
 * stays inside the scene's far plane).
 *
 * ~12,000 GPU points sampled uniformly on a spherical shell, each one
 * jittered slightly in radius and rendered as a faint icy speckle.
 * Visible only when the camera is pulled out past Neptune.
 */

const COUNT = 12_000;
const INNER_AU = 2_000;
const OUTER_AU = 6_000;

export class OortCloud {
  readonly points: Points;
  private mat: ShaderMaterial;

  constructor() {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Random unit vector via Marsaglia.
      const u = 2 * Math.random() - 1;
      const phi = 2 * Math.PI * Math.random();
      const s = Math.sqrt(1 - u * u);
      const nx = s * Math.cos(phi);
      const ny = u;
      const nz = s * Math.sin(phi);
      const r = INNER_AU + Math.random() * (OUTER_AU - INNER_AU);
      positions[i * 3] = nx * r;
      positions[i * 3 + 1] = ny * r;
      positions[i * 3 + 2] = nz * r;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    this.mat = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uOpacity: { value: 0.0 },
      },
      vertexShader: `
        uniform float uPixelRatio;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 1.6 * uPixelRatio;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float a = (1.0 - d * 2.0) * uOpacity;
          gl_FragColor = vec4(0.78, 0.88, 1.0, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(geom, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** Fade the cloud in once the camera is pulled out past Neptune.
   *  Caller passes the camera's distance from origin in scene units. */
  updateForCamera(camDistAU: number): void {
    // Fully visible at 1,500 AU+, invisible inside Neptune's vicinity.
    const t = Math.max(0, Math.min(1, (camDistAU - 60) / 1440));
    this.mat.uniforms["uOpacity"]!.value = t;
    this.points.visible = t > 0.02;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}

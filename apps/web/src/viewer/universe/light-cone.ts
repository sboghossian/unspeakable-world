import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";

/**
 * 🌐 Light cone — translucent shader sphere whose radius equals
 * `c · Δt` for a user-set Δt in years. Centered on a chosen target in
 * galactic-frame light-years (1 unit = 1 LY).
 *
 * The shader renders a thin shell at the wave-front (cyan→white) that
 * fades toward the interior, so the shape reads as an expanding light
 * sphere rather than a solid ball. Uses additive blending + double-sided
 * draw so it composites correctly when the camera is inside.
 */

export type LightConeOptions = {
  centerLY: Vector3;
  radiusLY: number;
  opacity?: number;
};

export class LightCone extends Mesh {
  private mat: ShaderMaterial;

  constructor(opts: LightConeOptions) {
    const mat = new ShaderMaterial({
      uniforms: {
        uOpacity: { value: opts.opacity ?? 0.35 },
        uColorFront: { value: new Color(0xa6f6ff) },
        uColorCore: { value: new Color(0x4a90e0) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
    // Unit sphere — we scale via .scale instead of rebuilding geometry on
    // every slider tick.
    const geom = new SphereGeometry(1, 64, 32);
    super(geom, mat);
    this.name = "LightCone";
    this.mat = mat;
    this.position.copy(opts.centerLY);
    this.scale.setScalar(Math.max(0.0001, opts.radiusLY));
    this.frustumCulled = false;
  }

  setCenter(centerLY: Vector3): void {
    this.position.copy(centerLY);
  }

  setRadiusLY(r: number): void {
    this.scale.setScalar(Math.max(0.0001, r));
  }

  setOpacity(o: number): void {
    this.mat.uniforms["uOpacity"]!.value = Math.max(0, Math.min(1, o));
  }

  dispose(): void {
    this.geometry.dispose();
    this.mat.dispose();
  }
}

const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  uniform vec3 uColorFront;
  uniform vec3 uColorCore;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // Fresnel-style rim glow — bright at the wave-front, fades inward.
    float ndotv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.5);
    vec3 col = mix(uColorCore, uColorFront, fresnel);
    float a = (0.08 + 0.9 * fresnel) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

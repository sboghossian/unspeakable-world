/**
 * cluster-points.glsl — vertex + fragment shader for procedural cluster
 * Points clouds.
 *
 * Per-vertex attributes:
 *   • `position`  (vec3) — star position in cluster-local frame, in pc.
 *   • `aSize`     (float) — base point size in pixels.
 *   • `color`     (vec3) — sRGB-ish star colour derived from B-V index.
 *   • `aMag`      (float) — relative magnitude offset (0 = brightest,
 *                            higher = fainter). Drives a per-star
 *                            brightness scalar.
 *
 * Uniforms:
 *   • `uPixelRatio` — devicePixelRatio (Three.js convention).
 *   • `uSizeScale`  — global size multiplier so we can shrink dense
 *                     globulars vs. wide open clusters without
 *                     rebuilding the geometry.
 *
 * Fragment:
 *   • Soft star disc (smoothstep from 0.5 → 0.15 radial) plus a thin
 *     diffraction-spike halo. Cheap, doesn't allocate a texture.
 */

export const CLUSTER_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 color;
  attribute float aMag;

  varying vec3 vColor;
  varying float vMag;

  uniform float uPixelRatio;
  uniform float uSizeScale;

  void main() {
    vColor = color;
    vMag = aMag;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Size attenuates with distance via the standard Three.js
    // sizeAttenuation trick: divide by -mv.z. We then clamp to keep
    // very-near stars from blowing up to full-screen circles.
    float dist = max(-mv.z, 0.001);
    float px = (aSize * uSizeScale * uPixelRatio * 100.0) / dist;
    gl_PointSize = clamp(px, 1.0, 64.0);
  }
`;

export const CLUSTER_FRAG = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vMag;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    // Soft disc: bright core, fast falloff. Higher exponent = sharper.
    float disc = exp(-r * r * 18.0);
    // Subtle ring for the brightest stars only (low aMag).
    float magBoost = exp(-vMag * 0.8);
    float ring = (1.0 - smoothstep(0.20, 0.30, r)) - (1.0 - smoothstep(0.10, 0.20, r));
    ring = max(ring, 0.0) * magBoost * 0.35;
    float a = clamp(disc + ring, 0.0, 1.0);
    if (a < 0.02) discard;
    vec3 col = vColor * (0.8 + 0.4 * magBoost);
    gl_FragColor = vec4(col, a);
  }
`;

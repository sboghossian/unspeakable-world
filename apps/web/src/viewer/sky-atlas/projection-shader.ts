/**
 * Aitoff equal-area projection — GLSL helpers and CPU helper.
 *
 * The Aitoff projection (Hammer–Aitoff variant used here) takes a sky
 * direction (RA, Dec) and produces a 2D oval that fits in [-1, 1] × [-1, 1]
 * after aspect correction. We use it to render the entire celestial sphere
 * on a flat panel — the v1 "2D Sky" toggle.
 *
 *   alpha = ra - π
 *   delta = dec
 *   z     = sqrt(1 + cos(delta) * cos(alpha / 2))
 *   x     = 2 * cos(delta) * sin(alpha / 2) / z
 *   y     = sin(delta) / z
 *
 * Output range (before aspect correction):
 *   x ∈ [-2 / sqrt(2), +2 / sqrt(2)]   ≈ [-1.414, +1.414]
 *   y ∈ [-1 / sqrt(2), +1 / sqrt(2)]   ≈ [-0.707, +0.707]
 *
 * We multiply by 1/√2 in the shader to bring the horizontal extent into
 * [-1, 1]; the vertical extent then sits at [-0.5, +0.5].
 */

/**
 * GLSL function `aitoff(vec2 raDec) -> vec2 xy`.
 *
 * Inputs are in radians (RA in [0, 2π], Dec in [-π/2, +π/2]).
 * Output is normalised so x ∈ [-1, 1] and y ∈ [-0.5, 0.5].
 *
 * Caller is responsible for further scaling by aspect ratio when writing
 * `gl_Position`.
 */
export const AITOFF_GLSL = /* glsl */ `
  vec2 aitoff(vec2 raDec) {
    float alpha = raDec.x - 3.14159265358979;
    float delta = raDec.y;
    float z = sqrt(1.0 + cos(delta) * cos(alpha * 0.5));
    // Guard against z=0 at the poles' antipode.
    z = max(z, 1e-6);
    float x = 2.0 * cos(delta) * sin(alpha * 0.5) / z;
    float y = sin(delta) / z;
    // Normalise: x ∈ [-1, 1], y ∈ [-0.5, 0.5].
    return vec2(x * 0.7071068, y * 0.7071068);
  }
`;

/**
 * Reusable vertex-shader fragment that takes a `vec2 aRaDec` attribute and
 * writes `gl_Position` directly to clip space using the Aitoff projection.
 * Use when the caller wants a pure 2D layer (no MVP).
 *
 * Add to your vertex shader:
 *   ${AITOFF_GLSL}
 *   attribute vec2 aRaDec;
 *   uniform float uAspect;     // canvas height / width
 *   void main() {
 *     vec2 p = aitoff(aRaDec);
 *     gl_Position = vec4(p.x, p.y / uAspect, 0.0, 1.0);
 *   }
 */
export const AITOFF_VERT = /* glsl */ `
  ${AITOFF_GLSL}
  attribute vec2 aRaDec;
  uniform float uAspect;
  void main() {
    vec2 p = aitoff(aRaDec);
    gl_Position = vec4(p.x, p.y / max(uAspect, 1e-3), 0.0, 1.0);
  }
`;

/** CPU-side mirror of {@link AITOFF_GLSL}. Returns x, y both in [-1, 1] / 2. */
export function aitoff(raRad: number, decRad: number): { x: number; y: number } {
  const alpha = raRad - Math.PI;
  const delta = decRad;
  const z = Math.max(1e-6, Math.sqrt(1 + Math.cos(delta) * Math.cos(alpha / 2)));
  const x = (2 * Math.cos(delta) * Math.sin(alpha / 2)) / z;
  const y = Math.sin(delta) / z;
  return { x: x * 0.7071068, y: y * 0.7071068 };
}

/**
 * Inverse Aitoff: given a 2D point in the projected plane, recover (RA, Dec).
 * Returns null when the point lies outside the projection oval.
 *
 * Used by the fragment-shader rasteriser path (sample celestial sphere
 * texture from screen coordinates). Implements the standard closed-form
 * inverse for the Hammer–Aitoff projection.
 */
export function inverseAitoff(
  x: number,
  y: number,
): { raRad: number; decRad: number } | null {
  // Undo the √2 normalisation.
  const X = x / 0.7071068;
  const Y = y / 0.7071068;
  const arg = 1 - (X * X) / 16 - (Y * Y) / 4;
  if (arg <= 0) return null;
  const z = Math.sqrt(arg);
  const decRad = Math.asin(Math.max(-1, Math.min(1, z * Y)));
  const raRad =
    2 * Math.atan2(z * X, 2 * (2 * z * z - 1)) + Math.PI;
  return { raRad, decRad };
}

export type SkyProjection = "3d" | "aitoff";

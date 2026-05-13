/**
 * edge-on.glsl — pure edge-on disc galaxy (NGC 891, NGC 4565,
 * Centaurus A's transverse band, NGC 253 starburst, M82).
 *
 * Geometry: a square quad oriented so the disc lies horizontally
 * across uv. We render:
 *   • a thin exponential disc in Y (vertical scale-height much smaller
 *     than the horizontal scale-length),
 *   • a fatter exponential bulge at the centre,
 *   • a sharp DARK dust lane stamped through the equatorial plane
 *     at uv.y ≈ 0.5, slightly above for a "near-side" reading.
 *
 * Vertex ~10 LOC, fragment ~60 LOC.
 */

export const EDGE_ON_VERT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying float vCamDist;

  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vCamDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const EDGE_ON_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying float vCamDist;

  uniform float uDiscScaleX;    // disc horizontal scale-length (uv units), e.g. 0.25
  uniform float uDiscScaleY;    // disc vertical scale-height, e.g. 0.04
  uniform float uBulgeSize;     // 0..0.25
  uniform float uBulgeStrength; // 0..1
  uniform float uDustWidth;     // 0..0.05 — thickness of the dust lane in uv
  uniform float uDustStrength;  // 0..1
  uniform float uDustOffset;    // vertical lane offset; near-side lane is slightly
                                // above the geometric midline
  uniform vec3  uDiscColor;     // disc warm cream
  uniform vec3  uBulgeColor;    // bulge yellow
  uniform vec3  uDustColor;     // dust dark red-brown
  uniform float uOpacity;
  uniform float uFadeStart;
  uniform float uFadeEnd;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 q = vUv - 0.5; // q.x ∈ [-0.5, 0.5], q.y ∈ [-0.5, 0.5]
    // Disc: exponential in x and y with very different scales.
    float disc = exp(-abs(q.x) / max(uDiscScaleX, 0.05))
               * exp(-abs(q.y) / max(uDiscScaleY, 0.02));

    // Bulge: 2D gaussian in absolute coords (rounder than disc).
    float bulgeR = length(vec2(q.x / max(uBulgeSize, 0.05),
                               q.y / max(uBulgeSize * 0.85, 0.05)));
    float bulge = exp(-bulgeR * bulgeR) * uBulgeStrength;

    // Disc fade with longitudinal radius so the edge doesn't snap.
    float xFade = 1.0 - smoothstep(0.42, 0.5, abs(q.x));
    disc *= xFade;

    // ── dust lane ───────────────────────────────────────────────
    // Sharp absorption band at q.y = -uDustOffset (lane slightly
    // foreground of midline). Width = uDustWidth.
    float laneY = q.y + uDustOffset;
    float dust = exp(-pow(laneY / max(uDustWidth, 0.003), 2.0));
    // Add a tiny clumpy modulation so the lane isn't perfectly smooth.
    float clump = valueNoise(q * vec2(40.0, 6.0) + vec2(3.1, 7.7));
    dust *= 0.65 + 0.35 * clump;
    // Lane only exists across the bright part of the disc.
    dust *= smoothstep(0.42, 0.18, abs(q.x));
    dust *= uDustStrength;

    // Multiplicative extinction on the disc, NOT on the bulge core.
    float discAttenuated = disc * clamp(1.0 - dust * 1.4, 0.05, 1.0);

    float intensity = discAttenuated * 0.55 + bulge;

    // Mix color: bulge color in the core, disc color in the wings,
    // reddened toward dust color along the lane.
    float bulgeMix = clamp(bulge / max(intensity, 1e-4), 0.0, 1.0);
    vec3 color = mix(uDiscColor, uBulgeColor, bulgeMix);
    color = mix(color, uDustColor, clamp(dust * 0.65, 0.0, 0.6));

    // Tiny halo glow above + below the dust lane.
    float halo = exp(-abs(q.y) / 0.18) * exp(-abs(q.x) / 0.35) * 0.05;
    intensity += halo;

    float camFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, vCamDist);
    float alpha = clamp(intensity * uOpacity * camFade, 0.0, 1.0);
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color * intensity, alpha);
  }
`;

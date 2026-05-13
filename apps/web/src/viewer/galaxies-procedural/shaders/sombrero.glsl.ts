/**
 * sombrero.glsl — M104. Wide flat disc + dominant central bulge +
 * razor-sharp transverse dust lane. Different enough from a generic
 * edge-on (NGC 891) that it earns its own shader: the bulge is huge,
 * roughly de Vaucouleurs in projection, and the disc is THIN and
 * SHARP — the dust lane is the iconic feature so we don't apologise
 * for the contrast.
 *
 * Vertex ~10 LOC, fragment ~60 LOC.
 */

export const SOMBRERO_VERT = /* glsl */ `
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

export const SOMBRERO_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying float vCamDist;

  uniform vec3  uBulgeColor;   // warm yellow-white
  uniform vec3  uDiscColor;    // cream
  uniform vec3  uDustColor;    // very dark red-brown
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
    vec2 q = vUv - 0.5;
    float r = length(q);
    if (r > 0.5) discard;

    // ── disc: very flat in Y, wide in X ──────────────────────────
    float disc = exp(-abs(q.x) / 0.32)
               * exp(-abs(q.y) / 0.035);
    disc *= 1.0 - smoothstep(0.42, 0.5, abs(q.x));

    // ── bulge: huge, de Vaucouleurs in projection ────────────────
    float bulgeR = length(vec2(q.x / 0.16, q.y / 0.18));
    float bn = 7.669;
    float bulge = exp(-bn * (pow(max(bulgeR, 1e-4), 0.25) - 1.0)) * 0.36;
    // Hot central nucleus glint.
    bulge += 0.5 * exp(-r * 35.0);

    // ── dust lane: razor-thin, exactly on midline, runs the
    // full width of the disc ────────────────────────────────────
    float dustY = q.y + 0.005; // tiny offset for "near-side" reading
    float dust = exp(-pow(dustY / 0.012, 2.0));
    // Clumpy modulation — the actual M104 dust lane has visible
    // structure under HST.
    float clump = valueNoise(q * vec2(60.0, 8.0));
    dust *= 0.6 + 0.4 * clump;
    // Lane extends from the disc edge through to about the bulge edge,
    // but it ALSO cuts through the bulge in M104 (which is what makes
    // it look like a hat-brim).
    float laneMask = smoothstep(0.46, 0.18, abs(q.x));
    dust *= laneMask;

    float dustAtten = clamp(1.0 - dust * 1.65, 0.05, 1.0);
    float discDarkened = disc * dustAtten;
    // Dust lane ALSO darkens the bulge mid-line.
    float bulgeDarkened = bulge * mix(1.0, dustAtten, 0.65);

    float intensity = discDarkened * 0.5 + bulgeDarkened;

    // Color mix.
    float bulgeMix = clamp(bulgeDarkened / max(intensity, 1e-4), 0.0, 1.0);
    vec3 color = mix(uDiscColor, uBulgeColor, bulgeMix);
    color = mix(color, uDustColor, clamp(dust * 0.85, 0.0, 0.75));

    // Faint outer halo.
    float halo = exp(-r * 6.0) * 0.045;
    intensity += halo;

    float camFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, vCamDist);
    float alpha = clamp(intensity * uOpacity * camFade, 0.0, 1.0);
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color * intensity, alpha);
  }
`;

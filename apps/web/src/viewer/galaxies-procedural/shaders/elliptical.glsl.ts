/**
 * elliptical.glsl — de Vaucouleurs r^(1/4) intensity profile for
 * ellipticals. No arms, no dust lanes, just a smooth axisymmetric
 * envelope with a slight red-to-yellow color gradient (old central
 * population is metal-rich and slightly redder than the outer halo
 * which is dominated by older but more metal-poor stars; in the
 * stylised render we use a warm yellow-white core grading to a
 * dimmer orange-red halo, which reads "elliptical galaxy" to anyone
 * who's seen an HST image).
 *
 * The host JS handles the b/a oval by squashing the quad's local Y;
 * here we work in unit (r, θ) on a square uv.
 *
 * Vertex ~10 LOC, fragment ~45 LOC.
 */

export const ELLIPTICAL_VERT = /* glsl */ `
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

export const ELLIPTICAL_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying float vCamDist;

  uniform float uAxisRatio;     // 0..1
  uniform float uSersicN;       // typically 4 (de Vaucouleurs)
  uniform vec3  uCoreColor;     // warm yellow-white
  uniform vec3  uHaloColor;     // red-orange
  uniform float uOpacity;
  uniform float uFadeStart;
  uniform float uFadeEnd;

  void main() {
    vec2 q = vUv - 0.5;
    q.y /= max(uAxisRatio, 0.05);
    float r = length(q) * 2.0;
    if (r > 1.0) discard;

    // Sersic profile: I(r) = I0 * exp(-b * r^(1/n)).
    // For n=4 (de Vaucouleurs), b ≈ 7.669 such that half-light is at
    // r = R_e. We use R_e = 0.18 in quad units which gives a compact
    // bright core fading smoothly into the outer halo.
    float n = max(uSersicN, 0.5);
    float bn = 2.0 * n - 0.327; // good approximation for n in [1,8]
    float Re = 0.18;
    float profile = exp(-bn * (pow(max(r / Re, 1e-4), 1.0 / n) - 1.0));
    profile *= 0.42; // overall scale so it doesn't clip on bright cores

    // A subtle "scattering" texture — barely visible noise — to keep
    // the surface from looking like a Gaussian blob. Very low contrast.
    float n1 = fract(sin(dot(q * 80.0, vec2(127.1, 311.7))) * 43758.5);
    profile *= (0.95 + 0.05 * n1);

    // Slight color gradient: core warm yellow-white, outskirts deeper
    // orange-red. Use sqrt of radius for a softer gradient.
    float t = clamp(sqrt(r), 0.0, 1.0);
    vec3 color = mix(uCoreColor, uHaloColor, t);

    // Edge fade.
    float edgeFade = 1.0 - smoothstep(0.85, 1.0, r);
    profile *= edgeFade;

    float camFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, vCamDist);
    float alpha = clamp(profile * uOpacity * camFade, 0.0, 1.0);
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color * profile, alpha);
  }
`;

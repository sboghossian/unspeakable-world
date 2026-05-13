/**
 * spiral.glsl — procedural face-on spiral galaxy (also drives
 * inclined / barred views via the host JS rotating the quad).
 *
 * Geometry: a single PlaneGeometry quad in the galaxy's local frame.
 * The galaxy mesh sits on the X-Z plane (Y is "up"/normal); the host
 * tilts it via Object3D.rotation to apply inclination + a free
 * orientation. The shader reads `vUv` (0..1 on the quad) and treats
 * (uv-0.5) as the in-plane radial coordinate r∈[0, √2/2].
 *
 * The arm density model:
 *   1. Convert (x,y) → (r, θ).
 *   2. For each of `uArmCount` arms, evaluate a logarithmic spiral
 *      ridge θ_arm(r) = arm_index·2π/N + (1/tan(pitch))·ln(r/r0).
 *      Distance Δθ between current θ and the nearest arm ridge gives
 *      a Gaussian intensity profile; widens slightly with r (arms
 *      "wash out" at the disc edge) — matches the observed pitch-arm
 *      drift in Davis+ 2012.
 *   3. Disc envelope: exponential brightness ∝ exp(-r/r_d). r_d picked
 *      so half-light radius lands at ~0.35 of the quad.
 *   4. Bulge: gaussian add inside r < 0.12.
 *   5. Dust lane: subtract a fraction of arm intensity offset
 *      inward in the arm density wave (dust leads stars — the "blue
 *      side / red side" of an arm). For barred / inclined galaxies the
 *      host JS rotates the plane; we keep the dust-lane sign in
 *      arm-frame so it stays geometrically tied to the arm.
 *   6. HII regions: tiny bright pink-blue speckles where arm density
 *      is high — value-noise driven, animated very slowly via uTime
 *      so it twinkles but doesn't distract.
 *   7. Color temperature: spiral arms have a slight blue bias (recent
 *      star formation), bulge yellow-red (old population).
 *
 * The result is rendered with AdditiveBlending into a billboarded
 * quad so it composites cleanly with the cone + dark-matter layers.
 *
 * Vertex shader: ~25 LOC (passthrough + uv).
 * Fragment shader: ~150 LOC (the meat).
 */

export const SPIRAL_VERT = /* glsl */ `
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

export const SPIRAL_FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying float vCamDist;

  uniform float uArmCount;      // 2..6 typically
  uniform float uPitchRad;      // pitch angle in radians
  uniform float uAxisRatio;     // 0..1 (1 = round)
  uniform float uArmWidth;      // 0.05..0.25 (arm half-width in θ)
  uniform float uDustStrength;  // 0..1
  uniform float uBulgeStrength; // 0..1
  uniform float uBulgeSize;     // 0.05..0.2
  uniform float uHiiStrength;   // 0..1
  uniform vec3  uArmColor;      // base arm color (blue-white)
  uniform vec3  uBulgeColor;    // bulge color (yellow-red)
  uniform vec3  uDustColor;     // dust extinction tint (red-brown)
  uniform float uTime;          // seconds (for very slow HII twinkle)
  uniform float uOpacity;       // overall multiplier
  uniform float uFadeStart;     // camera dist (LY) at which fading begins
  uniform float uFadeEnd;       // camera dist (LY) at which fully faded

  // ── helpers ──────────────────────────────────────────────────────
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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * valueNoise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return v;
  }

  // Signed angular distance to the nearest arm ridge, modulo 2π/N.
  float armDelta(float r, float theta, float armCount, float pitch) {
    // log-spiral: θ_arm(r) = k * ln(r) + offset
    float k = 1.0 / max(tan(pitch), 0.05);
    float armPhase = theta - k * log(max(r, 0.001));
    float spacing = 6.2831853 / max(armCount, 1.0);
    float wrapped = mod(armPhase + spacing * 0.5, spacing) - spacing * 0.5;
    return wrapped;
  }

  void main() {
    // Polar coords on a [-0.5, 0.5] quad. Re-stretch by inverse axis
    // ratio so the host can keep the quad square and we still get a
    // pre-rotation oval (used for barred / mildly inclined galaxies
    // where the host doesn't tilt the mesh).
    vec2 q = vUv - 0.5;
    q.y /= max(uAxisRatio, 0.05);
    float r = length(q) * 2.0; // 0 at center, 1 at quad edge
    if (r > 1.0) discard;
    float theta = atan(q.y, q.x);

    // ── disc envelope: exponential profile ───────────────────────
    float scaleLength = 0.32;
    float disc = exp(-r / scaleLength);

    // ── bulge: gaussian + tiny power-law core ────────────────────
    float bulgeR = max(uBulgeSize, 0.04);
    float bulge = exp(-pow(r / bulgeR, 2.0)) * uBulgeStrength;
    // Add a sharp Sersic-like core to give the nucleus a star-like
    // glint when the camera is far enough.
    bulge += uBulgeStrength * 0.55 * exp(-r * 25.0);

    // ── arms: gaussian transverse profile, fading with radius ────
    float armCount = max(uArmCount, 1.0);
    float pitch = clamp(uPitchRad, 0.04, 1.3);
    float d = armDelta(r, theta, armCount, pitch);
    // Arm width widens with r — outer arms broader, inner arms tighter.
    float width = uArmWidth * (0.6 + r * 0.9);
    float armGauss = exp(-pow(d / width, 2.0));
    // Suppress arms inside the bulge radius (where they don't physically
    // exist) and at the very edge (where the disc dies).
    float armRadialMask = smoothstep(0.04, 0.18, r) * smoothstep(1.0, 0.55, r);
    float arm = armGauss * armRadialMask;

    // ── dust lane: leading edge of the arm absorbs light ─────────
    // Dust sits at θ slightly ahead of the arm ridge (in the direction
    // of decreasing θ for trailing spirals). We approximate this by
    // sampling armDelta at a phase-shifted point.
    float dPhi = uArmWidth * 0.7;
    float dDust = armDelta(r, theta - dPhi, armCount, pitch);
    float dustGauss = exp(-pow(dDust / (width * 0.55), 2.0));
    float dust = dustGauss * armRadialMask * uDustStrength;

    // ── inter-arm flocculent texture ─────────────────────────────
    float floc = fbm(q * 14.0 + vec2(2.3, 5.7));
    floc = pow(floc, 1.8) * 0.4;

    // ── HII regions: brighten very high arm-density patches ──────
    // Tiny bright pink-blue speckles that only fire where arm > 0.4.
    float speckle = pow(valueNoise(q * 80.0 + vec2(uTime * 0.07, 0.0)), 8.0);
    float hii = speckle * smoothstep(0.45, 0.75, arm) * uHiiStrength;
    vec3 hiiColor = mix(vec3(0.9, 0.6, 0.9), vec3(0.55, 0.85, 1.0),
                        valueNoise(q * 23.0));

    // ── compose intensity ────────────────────────────────────────
    float armIntensity = arm * 0.95 + floc * disc * 0.35;
    float baseIntensity = disc * 0.25 + armIntensity + bulge;

    // Apply dust extinction (multiplicative on the disc + arm
    // component, but NOT on bulge — the bulge sits in front of the
    // dust in mid-inclination spirals).
    float dustAttenuation = 1.0 - clamp(dust * 1.6, 0.0, 0.85);
    float discAndArms = (disc * 0.25 + armIntensity) * dustAttenuation;

    float intensity = discAndArms + bulge;

    // ── color ────────────────────────────────────────────────────
    // Arms slightly blue (young stars), bulge yellow-red. Interpolate
    // by the radial bulge influence.
    float bulgeMix = clamp(bulge / max(intensity, 1e-4), 0.0, 1.0);
    vec3 color = mix(uArmColor, uBulgeColor, bulgeMix);
    // Tint dust regions toward red-brown (extinction reddening).
    color = mix(color, uDustColor, clamp(dust * 0.8, 0.0, 0.7));
    // Add HII speckle as additive emission.
    color += hiiColor * hii * 1.2;

    // ── edge-of-quad smooth fade so the disc doesn't snap to 0 ──
    float edgeFade = 1.0 - smoothstep(0.92, 1.0, r);
    intensity *= edgeFade;

    // Distance fade: when camera is far away, dim the galaxy so it
    // doesn't compete with cone-point sprites at the same on-screen
    // location. uFadeStart/uFadeEnd are in LY.
    float camFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, vCamDist);
    float alpha = clamp(intensity * uOpacity * camFade, 0.0, 1.0);
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color * intensity, alpha);
  }
`;

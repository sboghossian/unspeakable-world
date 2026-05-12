/**
 * GLSL strings for the Gaia DR3 Points renderer.
 *
 * One vertex per star. The host JS bakes positions in *parsecs*
 * (galactic XYZ, Y-up) and uploads them once. The vertex shader
 * picks between two projections at draw time:
 *
 *   uMode == 0  →  "sky":      project onto a unit sphere at infinity.
 *                              Same look as HYG bright-star layer.
 *   uMode == 1  →  "galactic": render at true parsec coords (scaled).
 *   uMode == 2  →  "universe": same as galactic but with stronger
 *                              distance-based dimming so the near-Sun
 *                              cluster doesn't bloom out the view.
 *
 * Star size is a Pogson-scaled point size, modulated by `uSizeFactor`
 * (the LOD slider passes 1.0 / ~0.7 / ~0.5 for 1M / 500K / 100K) and
 * by DPR so retina screens don't render fireflies.
 *
 * Color comes from `bp_rp` via an analytic temperature mapping in
 * the fragment shader — cheaper than a 1D LUT texture and avoids
 * the extra binding for a sample-count of one.
 */

export const VERT = /* glsl */ `
  precision highp float;

  attribute vec3 aPosPc;       // galactic XYZ in parsecs (Y-up)
  attribute float aGMag;       // Gaia G magnitude
  attribute float aBpRp;       // Gaia BP-RP color index

  uniform float uMode;         // 0=sky, 1=galactic, 2=universe
  uniform float uSkyRadius;    // celestial sphere radius for sky mode
  uniform float uParsecScale;  // multiplier on parsec coords (galactic/universe)
  uniform float uSizeFactor;   // LOD * user multiplier
  uniform float uPixelRatio;

  varying float vBpRp;
  varying float vGMag;
  varying float vDistPc;
  varying float vMode;

  void main() {
    float distPc = length(aPosPc);
    vDistPc = distPc;
    vBpRp = aBpRp;
    vGMag = aGMag;
    vMode = uMode;

    vec3 worldPos;
    if (uMode < 0.5) {
      // sky: stars all at "infinity" on a sphere just inside HiPS.
      vec3 dir = distPc > 0.0001 ? aPosPc / distPc : vec3(0.0, 0.0, 1.0);
      worldPos = dir * uSkyRadius;
    } else {
      // galactic / universe: real 3D positions in parsecs (scaled).
      worldPos = aPosPc * uParsecScale;
    }

    vec4 mv = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Pogson: brightness ∝ 10^(-0.4 * mag). Clamp the exponent so
    // a few very-bright stars don't blow into giant blobs.
    float bright = pow(10.0, -0.4 * clamp(aGMag, -1.5, 12.0));
    float baseSize = 0.9 + 18.0 * pow(bright, 0.5);

    // In 3D modes, fade size by distance from camera so the dense
    // near-Sun cluster doesn't overwhelm the frame.
    if (uMode > 0.5) {
      float camDist = max(0.001, -mv.z);
      baseSize /= max(1.0, log(camDist + 1.0) * 0.6);
    }

    gl_PointSize = max(1.0, baseSize * uSizeFactor * uPixelRatio);
  }
`;

export const FRAG = /* glsl */ `
  precision highp float;

  varying float vBpRp;
  varying float vGMag;
  varying float vDistPc;
  varying float vMode;

  uniform float uIntensity;

  // Analytic BP-RP → linear RGB. BP-RP ~ -0.5 (hot blue) … 0.5 (white)
  // … 1.5 (yellow) … 3.0 (deep red M). Tuned by eye against Stellarium.
  vec3 bpRpToRgb(float c) {
    float t = clamp(c, -0.5, 3.0);
    if (t < 0.0) {
      // blue-white
      float u = (t + 0.5) / 0.5;
      return mix(vec3(0.55, 0.70, 1.00), vec3(0.95, 0.97, 1.00), u);
    } else if (t < 1.0) {
      // white → yellow
      return mix(vec3(0.95, 0.97, 1.00), vec3(1.00, 0.92, 0.65), t);
    } else if (t < 2.0) {
      // yellow → orange
      return mix(vec3(1.00, 0.92, 0.65), vec3(1.00, 0.70, 0.40), t - 1.0);
    }
    // orange → red
    return mix(vec3(1.00, 0.70, 0.40), vec3(1.00, 0.45, 0.30), clamp(t - 2.0, 0.0, 1.0));
  }

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;

    // Soft disc with bright core + halo.
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.55;

    vec3 col = bpRpToRgb(vBpRp);
    vec3 coreCol = mix(col, vec3(1.0), 0.7);

    float alpha = clamp(core + halo, 0.0, 1.0);

    // Distance falloff for 3D modes — far stars get dimmer.
    if (vMode > 0.5) {
      float falloff = 1.0 / (1.0 + vDistPc * vDistPc * 1e-6);
      // In "universe" mode (vMode ~ 2.0) push falloff harder.
      if (vMode > 1.5) falloff = pow(falloff, 1.5);
      alpha *= clamp(falloff, 0.05, 1.0);
    }

    // Faint-star dimming so mag-11 stars don't read as bright as mag-3.
    float magDim = clamp(1.0 - (vGMag - 4.0) * 0.07, 0.18, 1.0);
    alpha *= magDim;

    gl_FragColor = vec4(coreCol * core + col * halo, alpha * uIntensity);
  }
`;

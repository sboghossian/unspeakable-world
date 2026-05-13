import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

/**
 * 🕳 Screen-space gravitational-lensing post-pass for nearby black-hole
 * landmarks (Sgr A*, M87*, Cygnus X-1, …).
 *
 * This module ships the shader + a self-contained `BhLensingPostPass`
 * helper. The pass is *not* wired into the live render path by default —
 * the existing solar-flight / universe scenes call `renderer.render`
 * directly on a single Scene, no EffectComposer, no post-process chain.
 * Splicing this in safely without breaking WebXR / snapshot / standby
 * is a renderer-factory change that should land separately.
 *
 * Until that integration lands, this file is consumed two ways:
 *
 *   1. The shader (`BH_LENS_FRAGMENT`, `BH_LENS_VERTEX`) is exported so a
 *      future composer pass can import and mount it without re-deriving
 *      the lensing math.
 *
 *   2. The `BhLensingPostPass` class encapsulates the manual
 *      "render scene → texture → blit through this shader → present"
 *      pattern. Callers swap their `renderer.render(scene, camera)` with
 *      `pass.render(renderer, scene, camera, anchorWorld)` once they're
 *      ready. The pass falls back to a plain blit when `anchorWorld`
 *      is null (no BH in proximity), so wiring it never breaks rendering.
 *
 * INTEGRATION NOTE for `scene/renderer-factory.ts`:
 *   Once the SceneRenderer interface gets an optional `postPass` hook,
 *   instantiate one of these per scene and call `pass.render(...)`
 *   from the tick instead of `renderer.render(...)`. Until that lands
 *   this code is dormant but exercises typecheck + tree-shakes cleanly.
 *
 * Implementation summary:
 *   - Single full-screen quad shader.
 *   - For each pixel, compute the angular offset from the BH center on
 *     screen. Inside an impact-parameter band around the photon ring we
 *     rotationally distort the lookup with 6 supersampled taps to
 *     simulate light bent by the BH's gravitational well.
 *   - The photon-ring radius itself gets an Einstein-ring brightness
 *     peak (gaussian on radial distance).
 *   - Inside the photon ring the pixel goes black (complete shadow).
 *   - Outside the impact band we blit the original color untouched.
 *   - A single `uStrength` uniform fades the whole effect with distance,
 *     so a 0 strength is "shader present but a no-op" — composite is
 *     identical to a plain blit.
 */

/** Default photon-ring radius in NDC (full-screen quad) units. The
 *  caller adjusts this via `uRingRadius` based on the BH's apparent
 *  size on screen. */
export const DEFAULT_RING_RADIUS = 0.06;

export const BH_LENS_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Screen-space gravitational lensing — rotational distortion sample
 *  within an impact-parameter band, supersampled with 6 taps and an
 *  Einstein-ring brightness peak at the photon-ring radius. Complete
 *  shadow inside the photon ring. */
export const BH_LENS_FRAGMENT = `
  uniform sampler2D uScene;
  uniform vec2 uCenter;        // BH screen pos in [0,1] uv
  uniform float uRingRadius;   // photon-ring radius in uv-space
  uniform float uAspect;       // viewport width / height
  uniform float uStrength;     // 0..1 fade with distance

  varying vec2 vUv;

  // Sample with aspect-correct distance so the lens is round rather
  // than oval on wide viewports.
  vec2 fromCenter(vec2 uv) {
    return vec2((uv.x - uCenter.x) * uAspect, uv.y - uCenter.y);
  }

  void main() {
    vec2 d = fromCenter(vUv);
    float r = length(d);

    // No-op when strength is 0: matches a plain blit exactly.
    if (uStrength <= 0.001) {
      gl_FragColor = texture2D(uScene, vUv);
      return;
    }

    // Photon ring: complete shadow inside.
    float photonR = uRingRadius;
    if (r < photonR * 0.95) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Impact-parameter band: rotational distortion within ~2.5 ring radii.
    float bandOuter = photonR * 4.0;
    if (r > bandOuter) {
      gl_FragColor = texture2D(uScene, vUv);
      return;
    }

    // Angular offset → rotational tap. We bend the light path by an
    // amount that falls off as ~1/r outside the photon ring.
    float bend = (photonR * 1.8) / max(r, photonR * 0.5);
    bend *= uStrength;
    float theta = atan(d.y, d.x);
    // Supersampled rotational taps around the impact ring.
    vec3 acc = vec3(0.0);
    const int TAPS = 6;
    for (int i = 0; i < TAPS; i++) {
      float k = float(i) - 2.5;
      float t = theta + bend * 0.18 * k;
      // Pull the sample radially back toward the photon ring to fake the
      // Einstein arc — light that would have missed the BH gets bent
      // closer to the silhouette.
      float rSample = mix(r, photonR * 1.05, 0.35 * uStrength);
      vec2 sampleUv = uCenter + vec2(cos(t) * rSample / uAspect, sin(t) * rSample);
      acc += texture2D(uScene, sampleUv).rgb;
    }
    vec3 col = acc / float(TAPS);

    // Einstein-ring brightness peak at ~photonR (gaussian falloff). The
    // ring picks up a warm tint because the dominant background source
    // is the BH's own accretion disk.
    float ringPeak = exp(-pow((r - photonR) / (photonR * 0.18), 2.0));
    col += vec3(1.0, 0.78, 0.45) * ringPeak * 0.6 * uStrength;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Build the lensing ShaderMaterial. Exposed for callers that want to
 *  wire it into a composer pipeline themselves. */
export function makeBhLensingMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uScene: { value: null as Texture | null },
      uCenter: { value: new Vector2(0.5, 0.5) },
      uRingRadius: { value: DEFAULT_RING_RADIUS },
      uAspect: { value: 16 / 9 },
      uStrength: { value: 0.0 },
    },
    vertexShader: BH_LENS_VERTEX,
    fragmentShader: BH_LENS_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    transparent: false,
  });
}

/**
 * Configuration for the lensing pass. Callers set `anchorWorld` (the
 * BH's current world position) and `cameraDistanceMpc` each frame; the
 * pass converts those into screen-space uniforms and a fade strength.
 */
export type BhLensingFrameInput = {
  /** BH center in world coordinates. Null = no BH in proximity, pass
   *  blits unchanged. */
  anchorWorld: Vector3 | null;
  /** Camera distance to the anchor in light-years. The effect fades
   *  out past `fadeOutLY` (default 500_000 ly = 0.5 Mly). */
  cameraDistanceLY: number;
  /** Distance at which the effect reaches 0 strength. */
  fadeOutLY?: number;
  /** Apparent photon-ring radius in screen-uv units (e.g. 0.06 for a
   *  ring spanning ~12% of the viewport height). */
  ringRadius?: number;
};

/**
 * Manual second-render-pass composite. Renders the input scene into an
 * offscreen render target, then blits that texture through the lensing
 * shader onto the back buffer. Equivalent to a one-pass EffectComposer
 * but with zero dependency on `three/examples/jsm/postprocessing/*`.
 */
export class BhLensingPostPass {
  private rt: WebGLRenderTarget;
  private quadScene = new Scene();
  private quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quadMat: ShaderMaterial;
  private quadMesh: Mesh;
  private size = new Vector2(1, 1);

  constructor() {
    this.rt = new WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.quadMat = makeBhLensingMaterial();
    this.quadMesh = new Mesh(new PlaneGeometry(2, 2), this.quadMat);
    this.quadScene.add(this.quadMesh);
  }

  /** Resize the offscreen RT. Cheap when dimensions are unchanged. */
  setSize(width: number, height: number, pixelRatio = 1): void {
    const w = Math.max(1, Math.floor(width * pixelRatio));
    const h = Math.max(1, Math.floor(height * pixelRatio));
    if (this.size.x === w && this.size.y === h) return;
    this.size.set(w, h);
    this.rt.setSize(w, h);
    (this.quadMat.uniforms["uAspect"] as { value: number }).value = w / h;
  }

  /**
   * Run the pass. Renders `scene` through `camera` into the internal
   * render target, then composites it onto the screen via the lensing
   * shader. When `input.anchorWorld` is null OR the camera is past
   * the fade-out distance, the shader runs with `uStrength=0` and the
   * output is byte-identical to a plain `renderer.render(scene, camera)`.
   */
  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: import("three").Camera,
    input: BhLensingFrameInput,
  ): void {
    // First pass: scene → offscreen RT.
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, camera);

    // Update uniforms.
    const uScene = this.quadMat.uniforms["uScene"] as { value: Texture | null };
    uScene.value = this.rt.texture;

    const uStrength = this.quadMat.uniforms["uStrength"] as { value: number };
    const uCenter = this.quadMat.uniforms["uCenter"] as { value: Vector2 };
    const uRingRadius = this.quadMat.uniforms["uRingRadius"] as {
      value: number;
    };
    uRingRadius.value = input.ringRadius ?? DEFAULT_RING_RADIUS;

    if (!input.anchorWorld) {
      uStrength.value = 0;
    } else {
      const fade = input.fadeOutLY ?? 500_000;
      // Strength ramps from 1 at distance 0 → 0 at fade. Inverse-linear
      // is plenty for a near-flyby effect.
      const s = 1 - Math.min(1, input.cameraDistanceLY / fade);
      uStrength.value = Math.max(0, s);
      // Project the anchor's world position into normalized screen UVs.
      const ndc = input.anchorWorld.clone().project(camera);
      uCenter.value.set((ndc.x + 1) * 0.5, (ndc.y + 1) * 0.5);
      // If the BH is behind the camera, fade out — projection gives
      // garbage UVs once z is past the far plane.
      if (ndc.z > 1 || ndc.z < -1) uStrength.value = 0;
    }

    // Second pass: full-screen quad → screen.
    renderer.setRenderTarget(prevTarget);
    renderer.render(this.quadScene, this.quadCam);
  }

  /** Free GPU resources. */
  dispose(): void {
    this.rt.dispose();
    this.quadMesh.geometry.dispose();
    this.quadMat.dispose();
  }
}

/** Resolve the nearest tracked BH landmark to the camera. Returns null
 *  if no landmark is within `proximityLY`. Used by the renderer to
 *  decide whether to feed `anchorWorld` into the lensing pass. The set
 *  of tracked landmarks is intentionally tiny — only Sgr A*, M87* and
 *  Cygnus X-1 get the near-flyby treatment. Other BHs in the catalog
 *  still get their billboard halo (`cosmic-landmarks.ts`). */
export type BhLandmarkAnchor = {
  name: "Sgr A*" | "M87*" | "Cygnus X-1";
  /** World position in scene units (anchor frame is the renderer's). */
  world: Vector3;
  /** Camera distance to the anchor, in light-years. */
  cameraDistanceLY: number;
};

/** Return the closest tracked BH anchor or null. The caller must
 *  pre-populate `anchors` with each tracked BH's current world pos +
 *  camera distance (those values live in the scene class, not here). */
export function pickNearestBhAnchor(
  anchors: BhLandmarkAnchor[],
  proximityLY = 500_000,
): BhLandmarkAnchor | null {
  let best: BhLandmarkAnchor | null = null;
  for (const a of anchors) {
    if (a.cameraDistanceLY > proximityLY) continue;
    if (!best || a.cameraDistanceLY < best.cameraDistanceLY) best = a;
  }
  return best;
}

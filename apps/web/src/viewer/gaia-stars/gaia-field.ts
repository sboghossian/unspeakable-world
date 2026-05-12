import {
  BufferAttribute,
  BufferGeometry,
  Group,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";
import { FRAG, VERT } from "./shader.glsl";
import { loadGaiaCatalog, resolveGaiaSource, RECORD_BYTES } from "./loader";
import { log } from "../../lib/logger";

/**
 * GaiaField — Three.js Points layer rendering up to 1M Gaia DR3
 * stars at real parallax-derived 3D positions.
 *
 * Design notes:
 *   - Single Points object with a ShaderMaterial; no instancing
 *     (Points is a built-in GPU draw mode and outperforms instanced
 *     billboards at this density).
 *   - Three rendering modes share the same buffer:
 *       sky       → project to celestial-sphere at infinity
 *       galactic  → real parsec coords, scaled into kly-equivalent
 *       universe  → same as galactic, harder distance falloff
 *   - LOD: density bucket (100K / 500K / 1M) truncates the loaded
 *     buffer. The bake script sorts ascending by G magnitude so
 *     truncation keeps the brightest stars — visually equivalent
 *     to the original HYG cut at the bucket size.
 *
 * Parent group is rotated -π/2 around X to match the rest of the
 * project's "Y-up three.js / Z-up astronomy" convention.
 */

type Density = 100_000 | 500_000 | 1_000_000;
type Mode = "sky" | "galactic" | "universe";

const SKY_RADIUS = 0.998; // just inside HiPS sphere (matches StarField)
// Parsec → scene unit. Galactic mode displays the disk at ~50 kly
// across; 1 kly ≈ 306 pc, so 1 unit ≈ 306 pc to stay coherent
// with the galactic-scene scale of "1 unit = 1 kly".
const PARSEC_TO_SCENE = 1 / 306;

export type GaiaFieldOpts = {
  density?: Density;
};

export class GaiaField {
  readonly group = new Group();
  private points: Points | null = null;
  private material: ShaderMaterial | null = null;
  private geometry: BufferGeometry | null = null;
  private starCount = 0;
  private density: Density;
  private mode: Mode = "sky";
  private loadingPromise: Promise<void> | null = null;

  constructor(opts: GaiaFieldOpts = {}) {
    this.density = opts.density ?? 1_000_000;
    this.group.name = "GaiaField";
    this.group.renderOrder = -4;
    this.group.rotation.x = -Math.PI / 2;
  }

  /**
   * Fetch + decode + build. Idempotent: re-calling while a load
   * is in flight returns the same promise; re-calling after load
   * is a no-op.
   */
  load(_url?: string): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    if (this.points) return Promise.resolve();
    const { url, manifestUrl } = resolveGaiaSource();
    this.loadingPromise = (async () => {
      const decoded = await loadGaiaCatalog(url, manifestUrl);
      // File is sorted by G mag ascending; truncate to density bucket.
      const keep = Math.min(decoded.count, this.density);
      // 5 floats per record.
      const slice = decoded.buffer.subarray(0, keep * 5);
      this.build(slice, keep);
      log.info(
        "[gaia-stars]",
        `loaded ${keep.toLocaleString()} stars`,
        `(file=${decoded.count.toLocaleString()}, bucket=${this.density})`,
      );
    })().catch((err: unknown) => {
      this.loadingPromise = null;
      throw err;
    });
    return this.loadingPromise;
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    if (this.material) {
      this.material.uniforms.uMode!.value =
        mode === "sky" ? 0.0 : mode === "galactic" ? 1.0 : 2.0;
    }
  }

  /**
   * Optional intensity hook for callers that want to dim the
   * field (e.g. when the HiPS imagery is doing the heavy lifting).
   */
  setIntensity(v: number): void {
    if (this.material) this.material.uniforms.uIntensity!.value = v;
  }

  count(): number {
    return this.starCount;
  }

  private build(records: Float32Array, count: number): void {
    // Records are [raRad, decRad, parallax, gMag, bpRp] interleaved.
    // For the GPU we want SoA: positions in parsecs + mag + bpRp.
    const positions = new Float32Array(count * 3);
    const gMag = new Float32Array(count);
    const bpRp = new Float32Array(count);

    let skipped = 0;
    for (let i = 0; i < count; i++) {
      const o = i * 5;
      const ra = records[o] ?? 0;
      const dec = records[o + 1] ?? 0;
      const plx = records[o + 2] ?? 0;
      const mg = records[o + 3] ?? 0;
      const bp = records[o + 4] ?? 0;
      // Distance: parallax in mas → distance in pc. Floor parallax
      // so faint background stars (often ~0 or negative parallax)
      // don't get hurled to absurd distances.
      const distPc = Math.min(10_000, Math.max(10, 1000 / Math.max(plx, 0.1)));
      if (!Number.isFinite(distPc)) {
        skipped++;
        continue;
      }
      const cosDec = Math.cos(dec);
      positions[i * 3] = distPc * cosDec * Math.cos(ra);
      positions[i * 3 + 1] = distPc * cosDec * Math.sin(ra);
      positions[i * 3 + 2] = distPc * Math.sin(dec);
      gMag[i] = mg;
      bpRp[i] = bp;
    }
    if (skipped > 0) {
      log.warn("[gaia-stars]", `skipped ${skipped} non-finite records`);
    }

    const geom = new BufferGeometry();
    geom.setAttribute("aPosPc", new BufferAttribute(positions, 3));
    geom.setAttribute("aGMag", new BufferAttribute(gMag, 1));
    geom.setAttribute("aBpRp", new BufferAttribute(bpRp, 1));
    geom.computeBoundingSphere();

    const material = new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 },
        uMode: {
          value:
            this.mode === "sky" ? 0.0 : this.mode === "galactic" ? 1.0 : 2.0,
        },
        uSkyRadius: { value: SKY_RADIUS },
        uParsecScale: { value: PARSEC_TO_SCENE },
        uSizeFactor: { value: this.sizeFactorForDensity() },
        uIntensity: { value: 1.0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      // In sky mode we want render-order ownership like the existing
      // StarField. In galactic/universe mode we *do* want real depth
      // testing so near stars occlude far ones. We toggle in setMode.
      depthTest: this.mode !== "sky",
      blending: NormalBlending,
    });

    this.material = material;
    this.geometry = geom;
    this.points = new Points(geom, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -4;
    this.group.add(this.points);
    this.starCount = count;

    // Touch RECORD_BYTES so imports survive verbatimModuleSyntax.
    void RECORD_BYTES;
  }

  private sizeFactorForDensity(): number {
    // Denser fields → smaller dots (otherwise the screen overlaps).
    switch (this.density) {
      case 100_000:
        return 1.4;
      case 500_000:
        return 1.0;
      default:
        return 0.7;
    }
  }

  dispose(): void {
    if (this.points) {
      this.group.remove(this.points);
      this.points = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.starCount = 0;
  }
}

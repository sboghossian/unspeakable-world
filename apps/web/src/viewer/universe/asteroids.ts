import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  Object3D,
  Points,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
} from "three";

/**
 * 💫 Asteroid Belt + Comets + Interstellar Objects.
 *
 * One GPU `Points` mesh per population. Each vertex carries 7 orbital
 * elements (a, e, i, Ω, ω, M0, H/extra) and the vertex shader propagates
 * a 2-body Kepler orbit from the file's epoch to the current sim time.
 *
 * Coordinate frame: ecliptic, 1 unit = 1 AU. Lives inside `solarGroup`.
 *
 * Binary format (see `scripts/bake-asteroids.ts`):
 *   header 16 B: 'UW01' | uint32 count | float32 epochJD | reserved
 *   record 28 B: float32 × 7 (a, e, i, Ω, ω, M0, H)
 *
 * Comets pack `a = -q` (sentinel) for parabolic/hyperbolic; the shader
 * branches on `a < 0` and uses the conic-section radial form.
 */

const HEADER_BYTES = 16;
const RECORD_BYTES = 28;

function dateToJD(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

type Header = {
  count: number;
  epochJD: number;
};

type Layout = {
  geom: BufferGeometry;
  material: ShaderMaterial;
  points: Points;
};

function readHeader(buf: ArrayBuffer): Header {
  const v = new DataView(buf);
  // Validate magic 'UW01' (0x55 0x57 0x30 0x31).
  const magic = String.fromCharCode(
    v.getUint8(0),
    v.getUint8(1),
    v.getUint8(2),
    v.getUint8(3),
  );
  if (magic !== "UW01") throw new Error(`bad magic '${magic}' (expected UW01)`);
  return {
    count: v.getUint32(4, true),
    epochJD: v.getFloat32(8, true),
  };
}

function readRecords(
  buf: ArrayBuffer,
  count: number,
): {
  a: Float32Array;
  e: Float32Array;
  inc: Float32Array;
  node: Float32Array;
  argp: Float32Array;
  M0: Float32Array;
  H: Float32Array;
} {
  const v = new DataView(buf);
  const a = new Float32Array(count);
  const e = new Float32Array(count);
  const inc = new Float32Array(count);
  const node = new Float32Array(count);
  const argp = new Float32Array(count);
  const M0 = new Float32Array(count);
  const H = new Float32Array(count);
  let off = HEADER_BYTES;
  for (let i = 0; i < count; i++) {
    a[i] = v.getFloat32(off, true);
    e[i] = v.getFloat32(off + 4, true);
    inc[i] = v.getFloat32(off + 8, true);
    node[i] = v.getFloat32(off + 12, true);
    argp[i] = v.getFloat32(off + 16, true);
    M0[i] = v.getFloat32(off + 20, true);
    H[i] = v.getFloat32(off + 24, true);
    off += RECORD_BYTES;
  }
  return { a, e, inc, node, argp, M0, H };
}

const VERT_ASTEROID = /* glsl */ `
  attribute float aA;
  attribute float aE;
  attribute float aInc;
  attribute float aNode;
  attribute float aArg;
  attribute float aM0;
  attribute float aH;
  uniform float uPixelRatio;
  uniform float uPixelSize;
  uniform float uDeltaDays;   // simTime - epochJD (days)
  uniform float uOpacity;
  varying float vTone;        // 0..1, brighter for lower H

  // GM_sun in AU^3/day^2.
  const float GM = 2.959122082855911e-4;

  void main() {
    float a = aA;
    float e = aE;
    // Mean motion (rad/day). Asteroids are always elliptic (a > 0).
    float n = sqrt(GM / (a * a * a));
    float M = aM0 + n * uDeltaDays;
    // Wrap into [-π, π] for stable Newton iteration.
    M = mod(M + 3.14159265, 6.2831853) - 3.14159265;
    // Solve Kepler: M = E - e sin E, 6 Newton steps from E0 = M.
    float E = M;
    for (int k = 0; k < 6; k++) {
      float f = E - e * sin(E) - M;
      float fp = 1.0 - e * cos(E);
      E = E - f / fp;
    }
    float cosE = cos(E);
    float sinE = sin(E);
    float r = a * (1.0 - e * cosE);
    // True anomaly ν via half-angle.
    float nu = 2.0 * atan(sqrt(1.0 + e) * sin(E * 0.5),
                          sqrt(1.0 - e) * cos(E * 0.5));
    float cw = cos(nu + aArg);
    float sw = sin(nu + aArg);
    float cN = cos(aNode);
    float sN = sin(aNode);
    float ci = cos(aInc);
    float si = sin(aInc);
    // Standard rotation R_z(Ω) R_x(i) R_z(ω+ν) for ecliptic-plane orbit.
    vec3 p;
    p.x = r * (cN * cw - sN * sw * ci);
    p.y = r * (sN * cw + cN * sw * ci);
    p.z = r * (sw * si);
    // Map ecliptic (x,y,z) → scene (x, z, -y) to match solarGroup convention.
    vec3 sp = vec3(p.x, p.z, -p.y);
    vec4 mv = modelViewMatrix * vec4(sp, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixelSize * uPixelRatio;
    // Brighter (lower H) → warmer / lighter dot.
    vTone = clamp(1.0 - (aH - 4.0) / 10.0, 0.0, 1.0);
    // Opacity passed via point alpha modulation in fragment.
    if (uOpacity < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;

const FRAG_ASTEROID = /* glsl */ `
  varying float vTone;
  uniform float uOpacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float a = (1.0 - smoothstep(0.0, 0.25, r2)) * uOpacity;
    // Faint = cool grey, bright = warm white.
    vec3 col = mix(vec3(0.55, 0.55, 0.6), vec3(1.0, 0.95, 0.82), vTone);
    gl_FragColor = vec4(col, a * 0.9);
  }
`;

const VERT_COMET = /* glsl */ `
  attribute float aA;       // +a (ellipse) or -q (parabolic/hyperbolic)
  attribute float aE;
  attribute float aInc;
  attribute float aNode;
  attribute float aArg;
  attribute float aM0;
  attribute float aH;       // (Tp - epochJD) packed; unused here
  uniform float uPixelRatio;
  uniform float uPixelSize;
  uniform float uDeltaDays;
  uniform float uOpacity;

  const float GM = 2.959122082855911e-4;

  void main() {
    float e = aE;
    float r;
    float nu;
    if (aA > 0.0) {
      // Elliptic: standard Kepler.
      float a = aA;
      float n = sqrt(GM / (a * a * a));
      float M = aM0 + n * uDeltaDays;
      M = mod(M + 3.14159265, 6.2831853) - 3.14159265;
      float E = M;
      for (int k = 0; k < 6; k++) {
        float f = E - e * sin(E) - M;
        float fp = 1.0 - e * cos(E);
        E = E - f / fp;
      }
      r = a * (1.0 - e * cos(E));
      nu = 2.0 * atan(sqrt(1.0 + e) * sin(E * 0.5),
                      sqrt(1.0 - e) * cos(E * 0.5));
    } else {
      // Parabolic / hyperbolic: encode q = -aA. We park the body near
      // perihelion and slowly sweep nu with time so the orbit is
      // visually active without solving a hyperbolic Kepler.
      float q = -aA;
      // Simple parametric sweep: ν oscillates ±60° over centuries so
      // these comets remain visible as moving inner-system objects.
      nu = clamp(uDeltaDays * 1.0e-4, -1.05, 1.05);
      r = q * (1.0 + e) / (1.0 + e * cos(nu));
    }
    float cw = cos(nu + aArg);
    float sw = sin(nu + aArg);
    float cN = cos(aNode);
    float sN = sin(aNode);
    float ci = cos(aInc);
    float si = sin(aInc);
    vec3 p;
    p.x = r * (cN * cw - sN * sw * ci);
    p.y = r * (sN * cw + cN * sw * ci);
    p.z = r * (sw * si);
    vec3 sp = vec3(p.x, p.z, -p.y);
    vec4 mv = modelViewMatrix * vec4(sp, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixelSize * uPixelRatio;
    if (uOpacity < 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    // Suppress unused attribute warning.
    if (aH > 1e30) gl_Position = vec4(0.0);
  }
`;

const FRAG_COMET = /* glsl */ `
  uniform float uOpacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = 1.0 - smoothstep(0.0, 0.05, r2);
    float halo = (1.0 - smoothstep(0.05, 0.25, r2)) * 0.5;
    float a = clamp(core + halo, 0.0, 1.0);
    // Faint cyan tint.
    gl_FragColor = vec4(0.55, 0.95, 1.0, a * uOpacity * 0.95);
  }
`;

abstract class KeplerField extends Object3D {
  protected layout: Layout | null = null;
  protected epochJD: number;
  protected uniforms: {
    uPixelRatio: { value: number };
    uPixelSize: { value: number };
    uDeltaDays: { value: number };
    uOpacity: { value: number };
  };

  constructor(buffer: ArrayBuffer, kind: "asteroid" | "comet") {
    super();
    this.visible = false;
    const header = readHeader(buffer);
    this.epochJD = header.epochJD;
    const recs = readRecords(buffer, header.count);

    const positions = new Float32Array(header.count * 3);
    // Positions are computed in the shader; this attribute is a no-op
    // dummy to satisfy Three's Points geometry contract.
    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aA", new BufferAttribute(recs.a, 1));
    geom.setAttribute("aE", new BufferAttribute(recs.e, 1));
    geom.setAttribute("aInc", new BufferAttribute(recs.inc, 1));
    geom.setAttribute("aNode", new BufferAttribute(recs.node, 1));
    geom.setAttribute("aArg", new BufferAttribute(recs.argp, 1));
    geom.setAttribute("aM0", new BufferAttribute(recs.M0, 1));
    geom.setAttribute("aH", new BufferAttribute(recs.H, 1));

    this.uniforms = {
      uPixelRatio: { value: window.devicePixelRatio || 1 },
      uPixelSize: { value: kind === "asteroid" ? 1.5 : 3.0 },
      uDeltaDays: { value: 0 },
      uOpacity: { value: 1.0 },
    };

    const material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: kind === "asteroid" ? VERT_ASTEROID : VERT_COMET,
      fragmentShader: kind === "asteroid" ? FRAG_ASTEROID : FRAG_COMET,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const points = new Points(geom, material);
    points.frustumCulled = false;
    this.add(points);
    this.layout = { geom, material, points };
  }

  setOpacity(v: number): void {
    this.uniforms.uOpacity.value = Math.max(0, Math.min(1, v));
  }

  setSimTime(date: Date): void {
    this.uniforms.uDeltaDays.value = dateToJD(date) - this.epochJD;
  }

  count(): number {
    return this.layout
      ? (this.layout.geom.getAttribute("aA").count as number)
      : 0;
  }

  dispose(): void {
    if (!this.layout) return;
    this.layout.geom.dispose();
    this.layout.material.dispose();
    this.remove(this.layout.points);
    this.layout = null;
  }
}

export class AsteroidField extends KeplerField {
  constructor(buffer: ArrayBuffer, _epoch: Date) {
    super(buffer, "asteroid");
    void _epoch; // epochJD comes from header
  }
}

export class CometField extends KeplerField {
  constructor(buffer: ArrayBuffer, _epoch: Date) {
    super(buffer, "comet");
    void _epoch;
  }
}

/* ─────────────────────── INTERSTELLAR MARKERS ────────────────────── */

export type InterstellarRecord = {
  id: string;
  name: string;
  a: number;
  e: number;
  i: number;
  Omega: number;
  argperi: number;
  M0: number;
  epochJD: number;
};

/**
 * 3-body marker layer for 1I, 2I, 3I — large highlighted sprites with
 * permanent text labels. We don't propagate orbits; positions are
 * fixed at perihelion direction (sufficient at this scale for v1).
 */
export class InterstellarMarkers extends Group {
  private items: InterstellarRecord[] = [];
  private sprites: Sprite[] = [];

  constructor(records: InterstellarRecord[]) {
    super();
    this.visible = false;
    this.items = records;
    this.build();
  }

  setOpacity(v: number): void {
    for (const s of this.sprites) {
      (s.material as SpriteMaterial).opacity = v;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setSimTime(_date: Date): void {
    // No-op for v1 — markers are static at perihelion direction.
  }

  count(): number {
    return this.items.length;
  }

  private build(): void {
    for (const it of this.items) {
      // Position at perihelion direction:
      //   q = (e < 1) ? a*(1-e) : -a   (since a is encoded as -q for hyperbolic)
      const q = it.e < 1 ? it.a * (1 - it.e) : -it.a;
      const cw = Math.cos(it.argperi);
      const sw = Math.sin(it.argperi);
      const cN = Math.cos(it.Omega);
      const sN = Math.sin(it.Omega);
      const ci = Math.cos(it.i);
      const si = Math.sin(it.i);
      const px = q * (cN * cw - sN * sw * ci);
      const py = q * (sN * cw + cN * sw * ci);
      const pz = q * (sw * si);
      // ecliptic → scene
      const sx = px;
      const sy = pz;
      const sz = -py;

      const dot = makeMarkerSprite(0xff7ad9);
      dot.position.set(sx, sy, sz);
      dot.scale.set(0.25, 0.25, 1);
      this.add(dot);
      this.sprites.push(dot);

      const label = makeLabelSprite(it.name);
      label.position.set(sx, sy + 0.18, sz);
      const aspect = (label.material.map?.image as HTMLCanvasElement).width /
        (label.material.map?.image as HTMLCanvasElement).height;
      const h = 0.18;
      label.scale.set(h * aspect, h, 1);
      this.add(label);
      this.sprites.push(label);
    }
  }

  dispose(): void {
    for (const s of this.sprites) {
      (s.material as SpriteMaterial).map?.dispose();
      (s.material as SpriteMaterial).dispose();
      this.remove(s);
    }
    this.sprites = [];
    this.items = [];
  }
}

function makeMarkerSprite(color: number): Sprite {
  const sz = 128;
  const canvas = document.createElement("canvas");
  canvas.width = sz;
  canvas.height = sz;
  const ctx = canvas.getContext("2d")!;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const grad = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.3, `rgba(${r},${g},${b},0.6)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sz, sz);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  const mat = new SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  return new Sprite(mat);
}

function makeLabelSprite(text: string): Sprite {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
  const fontSize = 12 * dpr;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(255, 200, 240, 0.95)";
  ctx.fillText(text, width / 2, height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  const mat = new SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.95,
  });
  return new Sprite(mat);
}

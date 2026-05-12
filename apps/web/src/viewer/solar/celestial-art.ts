import {
  CanvasTexture,
  LinearFilter,
  ShaderMaterial,
  Vector3,
} from "three";

/**
 * Procedural texture art for the Sun and the eight planets, plus the two
 * custom shaders used in solar flight (Earth day/night + Saturn ring
 * shadow). Lives in its own module so the Universe scene can use the
 * same painters without duplicating the canvas code.
 */

/** Per-planet procedural texture dispatcher. Each branch paints a canvas
 *  that reads as the body at a glance — cratered gray Mercury, swirly
 *  cream Venus, banded gas giants — well enough that the globe doesn't
 *  look like a flat marble before any external photo loads. Earth's
 *  branch still gets the optional NASA Blue Marble swap-in upstream. */
export function makePlanetTexture(name: string): CanvasTexture {
  switch (name) {
    case "Mercury":
      return paintCanvas(512, 256, paintMercury);
    case "Venus":
      return paintCanvas(512, 256, paintVenus);
    case "Earth":
      return paintCanvas(1024, 512, paintEarth);
    case "Mars":
      return paintCanvas(512, 256, paintMars);
    case "Jupiter":
      return paintCanvas(1024, 512, paintJupiter);
    case "Saturn":
      return paintCanvas(1024, 512, paintSaturn);
    case "Uranus":
      return paintCanvas(512, 256, paintUranus);
    case "Neptune":
      return paintCanvas(512, 256, paintNeptune);
    default:
      return paintCanvas(256, 128, (ctx, w, h) => {
        ctx.fillStyle = "#888";
        ctx.fillRect(0, 0, w, h);
      });
  }
}

export function paintCanvas(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  paint(ctx, w, h);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

export function paintEarth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Ocean
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#0a3a6e");
  ocean.addColorStop(0.5, "#1859a0");
  ocean.addColorStop(1, "#0e2c5a");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  // Stylized continents (rough silhouettes by lon/lat → x/y).
  const land = "#1d6f3a";
  const landDark = "#155a2c";
  const drawBlob = (lon: number, lat: number, scale: number, color: string) => {
    const cx = ((lon + 180) / 360) * w;
    const cy = ((90 - lat) / 180) * h;
    const sx = scale * (w / 360);
    const sy = scale * (h / 180);
    ctx.beginPath();
    ctx.moveTo(cx + sx, cy);
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const r = 1 + Math.sin(a * 3) * 0.18 + Math.cos(a * 2) * 0.1;
      ctx.lineTo(cx + Math.cos(a) * sx * r, cy + Math.sin(a) * sy * r);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  drawBlob(20, 0, 25, land);
  drawBlob(25, -20, 18, landDark);
  drawBlob(55, 50, 50, land);
  drawBlob(100, 45, 30, landDark);
  drawBlob(-95, 40, 28, land);
  drawBlob(-65, -15, 22, landDark);
  drawBlob(-110, 55, 22, land);
  drawBlob(135, -25, 18, land);
  ctx.fillStyle = "#e9eef5";
  ctx.fillRect(0, h - 32, w, 32);
  ctx.fillStyle = "#dde6ee";
  ctx.beginPath();
  ctx.ellipse(w * 0.32, h * 0.07, w * 0.04, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Earth-at-night: dark indigo ocean + black land silhouette with sparse
 *  warm city-lights dots clustered along the continents. */
export function paintEarthNight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "#020713";
  ctx.fillRect(0, 0, w, h);
  const drawBlob = (
    lon: number,
    lat: number,
    scale: number,
    color: string,
  ) => {
    const cx = ((lon + 180) / 360) * w;
    const cy = ((90 - lat) / 180) * h;
    const sx = scale * (w / 360);
    const sy = scale * (h / 180);
    ctx.beginPath();
    ctx.moveTo(cx + sx, cy);
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const r = 1 + Math.sin(a * 3) * 0.18 + Math.cos(a * 2) * 0.1;
      ctx.lineTo(cx + Math.cos(a) * sx * r, cy + Math.sin(a) * sy * r);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const landDark = "#050810";
  drawBlob(20, 0, 25, landDark);
  drawBlob(25, -20, 18, landDark);
  drawBlob(55, 50, 50, landDark);
  drawBlob(100, 45, 30, landDark);
  drawBlob(-95, 40, 28, landDark);
  drawBlob(-65, -15, 22, landDark);
  drawBlob(-110, 55, 22, landDark);
  drawBlob(135, -25, 18, landDark);

  const cityClusters: Array<{ lon: number; lat: number; r: number; n: number }> = [
    { lon: -74, lat: 41, r: 14, n: 80 }, // US Northeast
    { lon: -118, lat: 34, r: 10, n: 50 }, // US West Coast
    { lon: -90, lat: 30, r: 12, n: 40 }, // US Gulf
    { lon: 2, lat: 49, r: 9, n: 60 }, // Western Europe
    { lon: 13, lat: 52, r: 9, n: 70 }, // Central Europe
    { lon: 28, lat: 41, r: 7, n: 30 }, // Turkey
    { lon: 35, lat: 32, r: 6, n: 25 }, // Levant
    { lon: 55, lat: 25, r: 6, n: 30 }, // Gulf
    { lon: 77, lat: 21, r: 11, n: 90 }, // India
    { lon: 114, lat: 30, r: 12, n: 110 }, // China
    { lon: 139, lat: 35, r: 6, n: 50 }, // Japan
    { lon: 106, lat: -6, r: 5, n: 25 }, // SE Asia
    { lon: 31, lat: 30, r: 6, n: 30 }, // Egypt/Nile
    { lon: 3, lat: 6, r: 5, n: 20 }, // Nigeria
    { lon: -46, lat: -23, r: 6, n: 25 }, // São Paulo
    { lon: -58, lat: -34, r: 4, n: 15 }, // Buenos Aires
    { lon: 151, lat: -33, r: 4, n: 15 }, // Sydney
  ];
  const seed = mulberry32(0xc171);
  for (const c of cityClusters) {
    const cx = ((c.lon + 180) / 360) * w;
    const cy = ((90 - c.lat) / 180) * h;
    const sx = c.r * (w / 360);
    const sy = c.r * (h / 180);
    for (let i = 0; i < c.n; i++) {
      const u = seed() * 2 - 1;
      const v = seed() * 2 - 1;
      const x = cx + u * sx;
      const y = cy + v * sy * 0.7;
      const a = 0.55 + seed() * 0.45;
      const r = 0.6 + seed() * 1.4;
      ctx.fillStyle = `rgba(255,200,120,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Saturn shader: Lambert from a point light at world origin plus an
 *  analytical ring-shadow. */
export function makeSaturnRingShadowMaterial(
  dayTex: CanvasTexture,
  ringNormalW: Vector3,
  ringInner: number,
  ringOuter: number,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: dayTex },
      uRingN: { value: ringNormalW.clone() },
      uRingInner: { value: ringInner },
      uRingOuter: { value: ringOuter },
      uCenterW: { value: new Vector3() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uRingN;
      uniform float uRingInner;
      uniform float uRingOuter;
      uniform vec3 uCenterW;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vec3 sunPos = vec3(0.0);
        vec3 sunDir = normalize(sunPos - vWorldPos);
        float ndl = max(dot(normalize(vWorldNormal), sunDir), 0.0);
        vec3 base = texture2D(uMap, vUv).rgb;
        vec3 lit = base * (ndl * 0.9 + 0.15);

        vec3 d = sunPos - vWorldPos;
        vec3 toC = uCenterW - vWorldPos;
        float denom = dot(d, uRingN);
        if (abs(denom) > 1e-5) {
          float t = dot(toC, uRingN) / denom;
          if (t > 0.001 && t < 1.0) {
            vec3 hit = vWorldPos + t * d;
            float dist = length(hit - uCenterW);
            float edge = smoothstep(
              0.0,
              0.015,
              min(dist - uRingInner, uRingOuter - dist)
            );
            lit *= mix(1.0, 0.4, edge);
          }
        }

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });
}

/** Earth shader: smooth day↔night terminator with city-light glow on the
 *  unlit hemisphere. Sun is assumed at world origin. */
export function makeEarthDayNightMaterial(
  dayTex: CanvasTexture,
  nightTex: CanvasTexture,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uDay: { value: dayTex },
      uNight: { value: nightTex },
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D uDay;
      uniform sampler2D uNight;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vec3 ld = normalize(-vWorldPos);
        float ndl = dot(normalize(vNormalW), ld);
        float dayMix = smoothstep(-0.15, 0.15, ndl);

        vec3 day = texture2D(uDay, vUv).rgb;
        vec3 night = texture2D(uNight, vUv).rgb;

        vec3 dayLit = day * (max(ndl, 0.0) * 0.85 + 0.25);
        vec3 nightGlow = night * (1.0 - dayMix);

        vec3 col = dayLit * dayMix + nightGlow;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function paintSun(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Base: hot yellow-white core fading toward orange-red toward the edges.
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#ffbf5a");
  base.addColorStop(0.5, "#fff1a6");
  base.addColorStop(1, "#ffb050");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const seed = mulberry32(0xfa17);
  // Dark intergranular lanes.
  for (let i = 0; i < 600; i++) {
    const cx = seed() * w;
    const cy = seed() * h;
    const r = 4 + seed() * 14;
    ctx.fillStyle = `rgba(180,80,30,${0.08 + seed() * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * (0.7 + seed() * 0.6), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bright granule cores.
  for (let i = 0; i < 2400; i++) {
    const cx = seed() * w;
    const cy = seed() * h;
    const r = 1.2 + seed() * 3.2;
    ctx.fillStyle = `rgba(255,245,200,${0.35 + seed() * 0.45})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sunspots — biased to the activity belt.
  for (let i = 0; i < 8; i++) {
    const cx = seed() * w;
    const cy = h * 0.2 + seed() * h * 0.6;
    const r = 6 + seed() * 12;
    ctx.fillStyle = "rgba(45,15,5,0.85)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(160,70,30,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintMercury(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#8c857c");
  base.addColorStop(0.5, "#a8a098");
  base.addColorStop(1, "#7a736a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const seed = mulberry32(0x4e7c);
  for (let i = 0; i < 220; i++) {
    const cx = seed() * w;
    const cy = seed() * h;
    const r = 4 + seed() * 18;
    const dark = seed() < 0.5;
    ctx.fillStyle = dark
      ? `rgba(60,55,50,${0.18 + seed() * 0.22})`
      : `rgba(220,210,195,${0.12 + seed() * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * (0.7 + seed() * 0.6), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintVenus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#d8b56a");
  base.addColorStop(0.5, "#f3dc9a");
  base.addColorStop(1, "#c79f55");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const seed = mulberry32(0x1f55);
  for (let i = 0; i < 14; i++) {
    const yy = seed() * h;
    const tone = seed() < 0.5 ? "rgba(255,235,180,0.18)" : "rgba(150,110,55,0.16)";
    ctx.fillStyle = tone;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = yy + Math.sin((x / w) * Math.PI * 4 + i) * 12;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = w; x >= 0; x -= 8) {
      const y = yy + 28 + Math.sin((x / w) * Math.PI * 4 + i) * 12;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

export function paintMars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#cf7a4a");
  base.addColorStop(0.5, "#d88a55");
  base.addColorStop(1, "#a85a30");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const seed = mulberry32(0x7a31);
  for (let i = 0; i < 18; i++) {
    const cx = seed() * w;
    const cy = h * 0.25 + seed() * h * 0.5;
    const rx = 20 + seed() * 60;
    const ry = 10 + seed() * 30;
    ctx.fillStyle = `rgba(80,40,20,${0.25 + seed() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, seed() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f1ece2";
  ctx.fillRect(0, 0, w, h * 0.06);
  ctx.fillRect(0, h * 0.93, w, h * 0.07);
}

export function paintJupiter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const bands: Array<[number, number, string]> = [
    [0.0, 0.06, "#c89c6a"],
    [0.06, 0.14, "#e5c69a"],
    [0.14, 0.22, "#a37a55"],
    [0.22, 0.32, "#efd1a8"],
    [0.32, 0.42, "#b88e63"],
    [0.42, 0.48, "#f5dab0"],
    [0.48, 0.55, "#e0c191"],
    [0.55, 0.65, "#9a724d"],
    [0.65, 0.75, "#dfba88"],
    [0.75, 0.85, "#aa8055"],
    [0.85, 0.94, "#e8c79c"],
    [0.94, 1.0, "#bd8e60"],
  ];
  for (const [a, b, c] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(0, a * h, w, (b - a) * h);
  }
  const seed = mulberry32(0x9a12);
  for (let i = 0; i < 70; i++) {
    const cy = seed() * h;
    const cx = seed() * w;
    const rx = 30 + seed() * 80;
    const ry = 4 + seed() * 8;
    ctx.fillStyle = `rgba(60,40,20,${0.05 + seed() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const gx = w * 0.62;
  const gy = h * 0.62;
  const grs = ctx.createRadialGradient(gx, gy, 6, gx, gy, 56);
  grs.addColorStop(0, "#c84a2a");
  grs.addColorStop(0.6, "rgba(180,80,40,0.6)");
  grs.addColorStop(1, "rgba(180,80,40,0)");
  ctx.fillStyle = grs;
  ctx.beginPath();
  ctx.ellipse(gx, gy, 70, 36, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function paintSaturn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const bands: Array<[number, number, string]> = [
    [0.0, 0.08, "#caaa78"],
    [0.08, 0.22, "#e7cf9d"],
    [0.22, 0.4, "#d6b87f"],
    [0.4, 0.6, "#f1dbac"],
    [0.6, 0.78, "#cbaa75"],
    [0.78, 0.92, "#e5cd9a"],
    [0.92, 1.0, "#bd9e6c"],
  ];
  for (const [a, b, c] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(0, a * h, w, (b - a) * h);
  }
  const seed = mulberry32(0x4321);
  for (let i = 0; i < 30; i++) {
    const cy = seed() * h;
    const cx = seed() * w;
    ctx.fillStyle = `rgba(170,130,80,${0.05 + seed() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60 + seed() * 80, 3 + seed() * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintUranus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#a8d8e2");
  base.addColorStop(0.5, "#c2e6ec");
  base.addColorStop(1, "#94c8d4");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(140,200,210,0.18)";
  ctx.fillRect(0, h * 0.3, w, h * 0.06);
  ctx.fillRect(0, h * 0.55, w, h * 0.05);
  ctx.fillRect(0, h * 0.72, w, h * 0.04);
}

export function paintNeptune(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#2b4f9a");
  base.addColorStop(0.5, "#4174c8");
  base.addColorStop(1, "#1f3a78");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(120,170,230,0.25)";
  ctx.fillRect(0, h * 0.28, w, h * 0.06);
  ctx.fillRect(0, h * 0.58, w, h * 0.04);
  ctx.fillStyle = "rgba(20,30,80,0.5)";
  ctx.beginPath();
  ctx.ellipse(w * 0.35, h * 0.5, 36, 18, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Tiny seeded RNG so the procedural noise is stable across reloads. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

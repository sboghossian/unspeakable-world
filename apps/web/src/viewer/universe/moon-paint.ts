import { CanvasTexture, LinearFilter } from "three";

/**
 * Procedural surface textures for the 14 named moons in `MOONS`.
 *
 * Every painter is a 2D canvas painter — no shaders, no fetches. Each
 * builds a 256×128 equirectangular map with the moon's signature
 * features:
 *
 *   • Mimas — Herschel crater dominates one hemisphere
 *   • Enceladus — bright ice + south-pole "tiger stripes"
 *   • Tethys — Odysseus basin + Ithaca Chasma trench
 *   • Dione — wispy fracture terrain on trailing hemisphere
 *   • Rhea — heavily cratered grey
 *   • Titan — orange smog uniform
 *   • Iapetus — Cassini Regio: dark leading hemisphere, bright trailing
 *   • Miranda — chevron + cliff terrain
 *   • Ariel / Umbriel / Titania / Oberon — cratered grey with
 *     characteristic albedo tints
 *   • Triton — cantaloupe terrain + pink polar cap
 *   • Phobos / Deimos — small reddish-brown asteroidal bodies
 */

const W = 256;
const H = 128;

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const PAINTERS: Record<string, Painter> = {
  Mimas: paintMimas,
  Enceladus: paintEnceladus,
  Tethys: paintTethys,
  Dione: paintDione,
  Rhea: paintRhea,
  Titan: paintTitan,
  Iapetus: paintIapetus,
  Miranda: paintMiranda,
  Ariel: paintAriel,
  Umbriel: paintUmbriel,
  Titania: paintTitania,
  Oberon: paintOberon,
  Triton: paintTriton,
  Phobos: paintPhobos,
  Deimos: paintDeimos,
};

const TEXTURE_CACHE = new Map<string, CanvasTexture>();

export function moonTexture(name: string): CanvasTexture | null {
  const cached = TEXTURE_CACHE.get(name);
  if (cached) return cached;
  const painter = PAINTERS[name];
  if (!painter) return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  painter(ctx, W, H);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  TEXTURE_CACHE.set(name, tex);
  return tex;
}

/* ─── seeded RNG ──────────────────────────────────────────────────── */

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── shared helpers ──────────────────────────────────────────────── */

function paintBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
}

function paintNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  alpha: number,
  pixelSize = 2,
): void {
  const rand = mulberry32(seed);
  for (let y = 0; y < h; y += pixelSize) {
    for (let x = 0; x < w; x += pixelSize) {
      const v = Math.floor(rand() * 255);
      ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }
}

function paintCraters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  options: {
    minR: number;
    maxR: number;
    dark: string;
    light: string;
  },
): void {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const r = options.minR + rand() * (options.maxR - options.minR);
    // crater shadow
    ctx.fillStyle = options.dark;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // bright rim
    ctx.strokeStyle = options.light;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ─── painters ────────────────────────────────────────────────────── */

function paintMimas(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  paintBase(ctx, w, h, "#bdb8ac");
  paintNoise(ctx, w, h, 11, 0.05, 2);
  paintCraters(ctx, w, h, 12, 180, {
    minR: 1.2,
    maxR: 6,
    dark: "rgba(110,105,95,0.55)",
    light: "rgba(220,215,200,0.7)",
  });
  // Herschel crater — the giant eye
  const hx = w * 0.32;
  const hy = h * 0.45;
  const hr = 18;
  const grad = ctx.createRadialGradient(hx, hy, 1, hx, hy, hr);
  grad.addColorStop(0, "rgba(95,90,80,0.85)");
  grad.addColorStop(0.6, "rgba(140,135,125,0.7)");
  grad.addColorStop(1, "rgba(190,185,170,0.0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  // central peak
  ctx.fillStyle = "rgba(230,225,210,0.9)";
  ctx.beginPath();
  ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function paintEnceladus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Bright icy white with subtle blue tint
  paintBase(ctx, w, h, "#f6f9ff");
  paintNoise(ctx, w, h, 21, 0.03, 1);
  // South-pole "tiger stripes" — four parallel fractures
  ctx.strokeStyle = "rgba(70,100,150,0.55)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const y = h * 0.78 + i * 4;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, y - i * 2);
    ctx.lineTo(w * 0.8, y + i * 1.5);
    ctx.stroke();
  }
  // A few small craters elsewhere
  paintCraters(ctx, w, h, 71, 40, {
    minR: 1,
    maxR: 3,
    dark: "rgba(180,200,230,0.4)",
    light: "rgba(255,255,255,0.5)",
  });
}

function paintTethys(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#ddd6c5");
  paintNoise(ctx, w, h, 31, 0.04, 2);
  paintCraters(ctx, w, h, 32, 200, {
    minR: 1,
    maxR: 5,
    dark: "rgba(140,130,110,0.5)",
    light: "rgba(245,240,225,0.6)",
  });
  // Odysseus basin
  const ox = w * 0.55;
  const oy = h * 0.5;
  const orad = 24;
  const grad = ctx.createRadialGradient(ox, oy, 1, ox, oy, orad);
  grad.addColorStop(0, "rgba(150,140,120,0.7)");
  grad.addColorStop(1, "rgba(150,140,120,0.0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ox, oy, orad, 0, Math.PI * 2);
  ctx.fill();
  // Ithaca Chasma — long crack
  ctx.strokeStyle = "rgba(110,100,80,0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.15);
  ctx.bezierCurveTo(w * 0.4, h * 0.35, w * 0.7, h * 0.65, w * 0.95, h * 0.85);
  ctx.stroke();
}

function paintDione(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#cfc7b6");
  paintNoise(ctx, w, h, 41, 0.04, 2);
  paintCraters(ctx, w, h, 43, 180, {
    minR: 1,
    maxR: 4.5,
    dark: "rgba(130,120,100,0.5)",
    light: "rgba(240,235,220,0.55)",
  });
  // Wispy white streaks across one hemisphere
  ctx.strokeStyle = "rgba(255,250,240,0.7)";
  ctx.lineWidth = 0.7;
  const rand = mulberry32(44);
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    const x = w * 0.55 + rand() * w * 0.4;
    const y = h * 0.1 + rand() * h * 0.8;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + 10 + rand() * 20,
      y - 6 + rand() * 12,
      x + 18 + rand() * 18,
      y - 10 + rand() * 20,
      x + 30 + rand() * 15,
      y + (rand() - 0.5) * 8,
    );
    ctx.stroke();
  }
}

function paintRhea(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  paintBase(ctx, w, h, "#c8c1b1");
  paintNoise(ctx, w, h, 51, 0.05, 2);
  paintCraters(ctx, w, h, 52, 260, {
    minR: 1,
    maxR: 5,
    dark: "rgba(130,120,100,0.6)",
    light: "rgba(235,230,215,0.6)",
  });
}

function paintTitan(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Smoggy orange — no surface features visible
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#d39a48");
  grad.addColorStop(0.5, "#e0a85a");
  grad.addColorStop(1, "#b07a32");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Faint banding
  ctx.fillStyle = "rgba(255,220,160,0.04)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
}

function paintIapetus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Two-toned — leading hemisphere is dark (Cassini Regio), trailing
  // hemisphere is icy-bright. We approximate this as left vs right.
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#1a130c");
  grad.addColorStop(0.45, "#3a2820");
  grad.addColorStop(0.5, "#7a6a55");
  grad.addColorStop(0.55, "#c4b89e");
  grad.addColorStop(1, "#d6cab0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Craters across the whole surface
  paintCraters(ctx, w, h, 63, 220, {
    minR: 1,
    maxR: 5,
    dark: "rgba(20,15,10,0.6)",
    light: "rgba(220,210,190,0.4)",
  });
  // Equatorial ridge — the famous "walnut seam"
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();
}

function paintMiranda(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#a8a39a");
  paintNoise(ctx, w, h, 71, 0.05, 2);
  // Chevron pattern + parallel grooves (Inverness Corona)
  ctx.strokeStyle = "rgba(60,55,50,0.7)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    const x = w * 0.3 + i * 4;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.3);
    ctx.lineTo(x + 18, h * 0.5);
    ctx.lineTo(x, h * 0.7);
    ctx.stroke();
  }
  // Cliff face — Verona Rupes
  ctx.fillStyle = "rgba(30,25,20,0.5)";
  ctx.fillRect(w * 0.7, h * 0.4, 8, 18);
}

function paintAriel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#bcb5a8");
  paintNoise(ctx, w, h, 81, 0.04, 2);
  paintCraters(ctx, w, h, 82, 140, {
    minR: 1,
    maxR: 4,
    dark: "rgba(100,90,75,0.5)",
    light: "rgba(220,215,200,0.5)",
  });
  // Long valley network
  ctx.strokeStyle = "rgba(80,70,60,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.6);
  ctx.bezierCurveTo(w * 0.4, h * 0.55, w * 0.7, h * 0.5, w * 0.95, h * 0.4);
  ctx.stroke();
}

function paintUmbriel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Darkest classical Uranian moon
  paintBase(ctx, w, h, "#5e564a");
  paintNoise(ctx, w, h, 91, 0.06, 2);
  paintCraters(ctx, w, h, 92, 180, {
    minR: 1,
    maxR: 5,
    dark: "rgba(40,35,30,0.6)",
    light: "rgba(120,110,95,0.4)",
  });
  // Bright "Wunda" crater
  ctx.fillStyle = "rgba(220,215,200,0.5)";
  ctx.beginPath();
  ctx.arc(w * 0.4, h * 0.42, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function paintTitania(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#b8a999");
  paintNoise(ctx, w, h, 101, 0.05, 2);
  paintCraters(ctx, w, h, 102, 150, {
    minR: 1,
    maxR: 4,
    dark: "rgba(110,95,80,0.55)",
    light: "rgba(220,205,185,0.5)",
  });
  // Messina Chasma
  ctx.strokeStyle = "rgba(80,65,50,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.4);
  ctx.bezierCurveTo(w * 0.4, h * 0.6, w * 0.6, h * 0.7, w * 0.9, h * 0.55);
  ctx.stroke();
}

function paintOberon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#a8988a");
  paintNoise(ctx, w, h, 111, 0.05, 2);
  paintCraters(ctx, w, h, 112, 230, {
    minR: 1,
    maxR: 6,
    dark: "rgba(80,65,50,0.6)",
    light: "rgba(210,195,175,0.55)",
  });
  // Dark crater floors
  ctx.fillStyle = "rgba(40,30,25,0.6)";
  for (let i = 0; i < 6; i++) {
    const rand = mulberry32(120 + i);
    ctx.beginPath();
    ctx.arc(w * rand(), h * rand(), 3 + rand() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintTriton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Pink ice + cantaloupe terrain
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#f8d3c4"); // south polar cap (top in our equirect)
  grad.addColorStop(0.5, "#d5a99a");
  grad.addColorStop(1, "#a87a6f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // Cantaloupe pits — circular depressions
  const rand = mulberry32(131);
  for (let i = 0; i < 80; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.7 + h * 0.15;
    const r = 2 + rand() * 3;
    ctx.fillStyle = "rgba(70,55,45,0.25)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(250,220,200,0.3)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintPhobos(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#5d4030");
  paintNoise(ctx, w, h, 141, 0.06, 2);
  paintCraters(ctx, w, h, 142, 140, {
    minR: 1,
    maxR: 5,
    dark: "rgba(35,25,18,0.7)",
    light: "rgba(120,90,70,0.4)",
  });
  // Stickney crater — the huge one
  const grad = ctx.createRadialGradient(w * 0.35, h * 0.45, 1, w * 0.35, h * 0.45, 14);
  grad.addColorStop(0, "rgba(30,20,15,0.85)");
  grad.addColorStop(1, "rgba(30,20,15,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(w * 0.35, h * 0.45, 14, 0, Math.PI * 2);
  ctx.fill();
}

function paintDeimos(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  paintBase(ctx, w, h, "#6a4838");
  paintNoise(ctx, w, h, 151, 0.05, 2);
  paintCraters(ctx, w, h, 152, 100, {
    minR: 1,
    maxR: 3.5,
    dark: "rgba(40,28,20,0.6)",
    light: "rgba(150,110,85,0.4)",
  });
}

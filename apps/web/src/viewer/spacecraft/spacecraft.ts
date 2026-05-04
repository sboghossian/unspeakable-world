import {
  Body,
  EquatorFromVector,
  GeoVector,
  type FlexibleDateTime,
} from "astronomy-engine";
import {
  CanvasTexture,
  Group,
  LinearFilter,
  Sprite,
  SpriteMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * 🛰 Iconic spacecraft markers.
 *
 * The original Voyagers and Pioneers are 35-50 years from Earth and their
 * sky direction shifts only ~0.05° / year — well below our display
 * precision — so we hardcode their J2000 directions. JWST is dynamic: it
 * sits at the Earth-Sun L2 point so its sky direction is always the
 * anti-solar direction (180° from the Sun in ecliptic longitude, ~0° in
 * ecliptic latitude). We recompute that each frame the Sun moves.
 *
 * Each marker is a small sprite with a glow + a label. Toggle bound to a
 * dedicated visibility flag, separate from the planet system.
 */

const RADIUS = 0.992;

type StaticCraft = {
  name: string;
  raDeg: number;
  decDeg: number;
  detail: string;
};

const STATIC_SPACECRAFT: StaticCraft[] = [
  // Voyager 1 — Pale Blue Dot mission, escaped solar system, current
  // direction of motion ~17h57m +12.4° (Ophiuchus/Hercules border).
  {
    name: "Voyager 1",
    raDeg: 269.4,
    decDeg: 12.4,
    detail: "Launched 1977 · ~166 AU · interstellar space",
  },
  // Voyager 2 — escaped southward, in Pavo / Telescopium.
  {
    name: "Voyager 2",
    raDeg: 295.6,
    decDeg: -56.6,
    detail: "Launched 1977 · ~138 AU · interstellar space",
  },
  // Pioneer 10 — silent since Jan 2003. Heading toward Aldebaran.
  {
    name: "Pioneer 10",
    raDeg: 85.0,
    decDeg: 26.0,
    detail: "Launched 1972 · silent 2003 · → Aldebaran in 2 Myr",
  },
  // Pioneer 11 — silent since 1995. Heading toward Aquila / Sagittarius.
  {
    name: "Pioneer 11",
    raDeg: 283.5,
    decDeg: -9.0,
    detail: "Launched 1973 · silent 1995 · → Aquila",
  },
  // New Horizons — past Pluto, heading toward Sagittarius / KBO PT 1.
  {
    name: "New Horizons",
    raDeg: 290.0,
    decDeg: -22.0,
    detail: "Launched 2006 · KBO survey · in Sagittarius",
  },
];

type Placed = {
  name: string;
  sprite: Sprite;
  label: Sprite;
  /** If non-null, position is recomputed each frame using this provider. */
  dynamic: ((time: FlexibleDateTime) => { ra: number; dec: number }) | null;
  detail: string;
};

export class Spacecraft {
  readonly group = new Group();
  private placed: Placed[] = [];

  constructor() {
    this.group.name = "Spacecraft";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up
    this.group.renderOrder = 2.5;
    this.group.visible = false;
    this.build();
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  visible(): boolean {
    return this.group.visible;
  }

  update(time: FlexibleDateTime): void {
    for (const p of this.placed) {
      if (!p.dynamic) continue;
      const eq = p.dynamic(time);
      const [x, y, z] = raDecToVec3(eq.ra, eq.dec, RADIUS);
      p.sprite.position.set(x, y, z);
      p.label.position.set(x, y, z);
    }
  }

  /** Resolve a craft name → world-Y-up direction (for tap-to-fly). */
  directionOf(name: string): { x: number; y: number; z: number } | null {
    const p = this.placed.find((x) => x.name === name);
    if (!p) return null;
    const v = p.sprite.position.clone().applyEuler(this.group.rotation).normalize();
    return { x: v.x, y: v.y, z: v.z };
  }

  list(): Array<{
    name: string;
    detail: string;
    direction: { x: number; y: number; z: number };
  }> {
    const out: Array<{
      name: string;
      detail: string;
      direction: { x: number; y: number; z: number };
    }> = [];
    for (const p of this.placed) {
      const v = p.sprite.position
        .clone()
        .applyEuler(this.group.rotation)
        .normalize();
      out.push({ name: p.name, detail: p.detail, direction: v });
    }
    return out;
  }

  private build(): void {
    for (const c of STATIC_SPACECRAFT) {
      this.placed.push(this.makeMarker(c.name, c.detail, c.raDeg, c.decDeg, null));
    }
    // JWST — at Earth-Sun L2, anti-solar in geocentric direction.
    const jwstDynamic = (time: FlexibleDateTime) => {
      const sun = GeoVector(Body.Sun, time, true);
      // L2 is on the far side of Earth from the Sun → invert the geo Sun
      // vector, then convert to RA/Dec.
      const inv = { x: -sun.x, y: -sun.y, z: -sun.z, t: sun.t };
      const eq = EquatorFromVector(
        inv as unknown as ReturnType<typeof GeoVector>,
      );
      return { ra: eq.ra * 15, dec: eq.dec };
    };
    // Initial RA/Dec doesn't matter — `update()` will overwrite it on the
    // first frame, but we still need a placeholder so the sprite exists.
    const jwst = this.makeMarker(
      "JWST",
      "James Webb Space Telescope · L2 · 1.5M km anti-solar",
      0,
      0,
      jwstDynamic,
    );
    this.placed.push(jwst);
  }

  private makeMarker(
    name: string,
    detail: string,
    raDeg: number,
    decDeg: number,
    dynamic:
      | ((time: FlexibleDateTime) => { ra: number; dec: number })
      | null,
  ): Placed {
    const tex = makeMarkerTexture();
    const mat = new SpriteMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.95,
    });
    const sprite = new Sprite(mat);
    sprite.scale.set(0.018, 0.018, 1);
    sprite.userData.body = name;
    const [x, y, z] = raDecToVec3(raDeg, decDeg, RADIUS);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 2.5;
    this.group.add(sprite);

    const labelTex = makeLabel(name);
    const labelMat = new SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.85,
    });
    const label = new Sprite(labelMat);
    const aspect = labelTex.image.width / labelTex.image.height;
    const h = 0.014;
    label.scale.set(h * aspect, h, 1);
    label.position.set(x, y, z);
    label.renderOrder = 2.6;
    this.group.add(label);

    return { name, sprite, label, dynamic, detail };
  }

  dispose(): void {
    for (const p of this.placed) {
      const m = p.sprite.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(p.sprite);
      const lm = p.label.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
      this.group.remove(p.label);
    }
    this.placed = [];
  }
}

function makeMarkerTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  // Cyan diamond / glow — distinct from planet sprites.
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, "rgba(180, 230, 255, 1)");
  grad.addColorStop(0.3, "rgba(120, 200, 255, 0.55)");
  grad.addColorStop(1, "rgba(120, 200, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Small diamond icon over the glow
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "rgba(220, 245, 255, 0.95)";
  ctx.fillRect(-5, -5, 10, 10);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function makeLabel(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 5;
  const padY = 2;
  const fontSize = 10 * dpr;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("2d context unavailable");
  measure.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.font = `${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 4 * dpr;
  ctx.fillStyle = "rgba(180, 230, 255, 0.95)";
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

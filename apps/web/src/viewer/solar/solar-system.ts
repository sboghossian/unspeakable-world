import {
  Body,
  EquatorFromVector,
  GeoVector,
  JupiterMoons,
  Vector as AstroVectorClass,
  type FlexibleDateTime,
  type Vector as AstroVector,
} from "astronomy-engine";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * Sun + Moon + 8 planets, plotted on the celestial sphere using AstronomyEngine.
 *
 * Each body is a small textured sprite with a subtle glow, sized by its
 * intrinsic apparent magnitude / category. Positions update when `update(time)`
 * is called (driven by the time slider in `ViewerScene.tick`).
 */

const BODY_RADIUS = 0.99; // inside HiPS sphere; render order keeps planets in front

type BodySpec = {
  body: Body;
  label: string;
  color: number;
  size: number; // sprite world-space size
};

const BODIES: BodySpec[] = [
  { body: Body.Sun, label: "Sun", color: 0xffe98a, size: 0.12 },
  { body: Body.Moon, label: "Moon", color: 0xfafaf2, size: 0.09 },
  { body: Body.Mercury, label: "Mercury", color: 0xc8c1b8, size: 0.04 },
  { body: Body.Venus, label: "Venus", color: 0xfff0c2, size: 0.06 },
  { body: Body.Mars, label: "Mars", color: 0xff8a5e, size: 0.05 },
  { body: Body.Jupiter, label: "Jupiter", color: 0xffd9a8, size: 0.075 },
  { body: Body.Saturn, label: "Saturn", color: 0xffe1a3, size: 0.065 },
  { body: Body.Uranus, label: "Uranus", color: 0xb6e6f0, size: 0.045 },
  { body: Body.Neptune, label: "Neptune", color: 0x7fa6ff, size: 0.045 },
];

type PlacedBody = {
  spec: BodySpec;
  sprite: Sprite;
  labelSprite: Sprite | null;
};

const GALILEAN_MOONS = ["Io", "Europa", "Ganymede", "Callisto"] as const;
type GalileanMoonName = (typeof GALILEAN_MOONS)[number];

type PlacedMoon = {
  name: GalileanMoonName;
  sprite: Sprite;
  labelSprite: Sprite;
};

export class SolarSystem {
  readonly group = new Group();
  private placed: PlacedBody[] = [];
  private moons: PlacedMoon[] = [];

  constructor() {
    this.group.name = "SolarSystem";
    this.group.renderOrder = 1; // in front of HiPS + stars
    this.group.rotation.x = -Math.PI / 2; // Z-up astronomy → Y-up Three.js
    this.build();
    this.buildMoons();
  }

  private buildMoons(): void {
    for (const name of GALILEAN_MOONS) {
      const tex = makeGlowTexture(0xfafaf2);
      const mat = new SpriteMaterial({
        map: tex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      });
      const sprite = new Sprite(mat);
      // Moons are tiny — sized so they only resolve when zoomed in.
      sprite.scale.set(0.012, 0.012, 1);
      sprite.renderOrder = 1.5;
      sprite.userData.body = name;
      this.group.add(sprite);

      const labelTex = makeLabelTexture(name);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.85,
      });
      const labelSprite = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const labelHeight = 0.012;
      labelSprite.scale.set(labelHeight * aspect, labelHeight, 1);
      labelSprite.renderOrder = 2;
      this.group.add(labelSprite);

      this.moons.push({ name, sprite, labelSprite });
    }
  }

  private build(): void {
    for (const spec of BODIES) {
      const tex =
        spec.label === "Sun" ? makeSunTexture() : makeGlowTexture(spec.color);
      const mat = new SpriteMaterial({
        map: tex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      });
      const sprite = new Sprite(mat);
      sprite.scale.set(spec.size, spec.size, 1);
      sprite.renderOrder = 1;
      sprite.userData.body = spec.label;
      this.group.add(sprite);

      const labelTex = makeLabelTexture(spec.label);
      const labelMat = new SpriteMaterial({
        map: labelTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const labelSprite = new Sprite(labelMat);
      const aspect = labelTex.image.width / labelTex.image.height;
      const labelHeight = 0.018;
      labelSprite.scale.set(labelHeight * aspect, labelHeight, 1);
      labelSprite.renderOrder = 2;
      this.group.add(labelSprite);

      this.placed.push({ spec, sprite, labelSprite });
    }
  }

  update(time: FlexibleDateTime): void {
    for (const p of this.placed) {
      const eq = bodyEquatorial(p.spec.body, time);
      const [x, y, z] = raDecToVec3(eq.ra * 15, eq.dec, BODY_RADIUS);
      p.sprite.position.set(x, y, z);
      if (p.labelSprite) {
        // Offset label slightly above the sprite (toward +z = north pole),
        // projected back onto the BODY_RADIUS sphere.
        const upBias = new Vector3(0, 0, 0.025);
        const labelPos = new Vector3(x, y, z)
          .add(upBias)
          .normalize()
          .multiplyScalar(BODY_RADIUS);
        p.labelSprite.position.copy(labelPos);
      }
    }
    // Galilean moons — geocentric position = Jupiter geo + moon-rel-to-Jupiter.
    try {
      const jupGeo = GeoVector(Body.Jupiter, time, true);
      const info = JupiterMoons(time);
      const lookup = {
        Io: info.io,
        Europa: info.europa,
        Ganymede: info.ganymede,
        Callisto: info.callisto,
      } as const;
      for (const pm of this.moons) {
        const rel = lookup[pm.name];
        const t = (jupGeo as unknown as { t: unknown }).t;
        const sum = new AstroVectorClass(
          jupGeo.x + rel.x,
          jupGeo.y + rel.y,
          jupGeo.z + rel.z,
          // EquatorFromVector reads .t; reuse Jupiter's so the rotation matches.
          t as never,
        );
        const eq = EquatorFromVector(sum);
        const [x, y, z] = raDecToVec3(eq.ra * 15, eq.dec, BODY_RADIUS);
        pm.sprite.position.set(x, y, z);
        const upBias = new Vector3(0, 0, 0.012);
        const labelPos = new Vector3(x, y, z)
          .add(upBias)
          .normalize()
          .multiplyScalar(BODY_RADIUS);
        pm.labelSprite.position.copy(labelPos);
      }
    } catch {
      // ignore; moons are non-critical
    }
  }

  /**
   * Returns a normalized direction vector pointing at a body in *world*
   * coordinates (i.e. after the Z-up → Y-up rotation has been applied),
   * suitable for handing to `VoyagerControls.setForward`.
   */
  directionOf(label: string): Vector3 | null {
    const p = this.placed.find((x) => x.spec.label === label);
    if (!p) return null;
    // Apply the group's rotation so the local Z-up position becomes a world
    // Y-up direction.
    return p.sprite.position
      .clone()
      .applyEuler(this.group.rotation)
      .normalize();
  }

  setLabelOpacity(opacity: number): void {
    for (const p of this.placed) {
      if (p.labelSprite) {
        (p.labelSprite.material as SpriteMaterial).opacity = opacity;
      }
    }
  }

  dispose(): void {
    for (const p of this.placed) {
      const mat = p.sprite.material as SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.group.remove(p.sprite);
      if (p.labelSprite) {
        const lm = p.labelSprite.material as SpriteMaterial;
        lm.map?.dispose();
        lm.dispose();
        this.group.remove(p.labelSprite);
      }
    }
    for (const pm of this.moons) {
      const mat = pm.sprite.material as SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
      this.group.remove(pm.sprite);
      const lm = pm.labelSprite.material as SpriteMaterial;
      lm.map?.dispose();
      lm.dispose();
      this.group.remove(pm.labelSprite);
    }
    this.placed = [];
    this.moons = [];
  }
}

/** Get equatorial coords (J2000, geocentric, with aberration) for a body. */
function bodyEquatorial(
  body: Body,
  time: FlexibleDateTime,
): { ra: number; dec: number } {
  const vec: AstroVector = GeoVector(body, time, true);
  const eq = EquatorFromVector(vec);
  return { ra: eq.ra, dec: eq.dec };
}

/** Build a soft circular sprite texture with a glow, tinted by color. */
function makeGlowTexture(color: number): CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const c = new Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0.0, `rgba(${r},${g},${b},1.0)`);
  grad.addColorStop(0.18, `rgba(${r},${g},${b},0.7)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.18)`);
  grad.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/**
 * Multi-layer Sun texture: tight bright disk, hot chromosphere, soft outer
 * corona, and faint radial spikes. Heavier than the planet glow but worth it
 * for the hero body in the scene.
 */
function makeSunTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const cx = size / 2;
  const cy = size / 2;

  // Outer corona — soft amber falloff to canvas edge.
  const corona = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  corona.addColorStop(0.0, "rgba(255, 220, 140, 0.55)");
  corona.addColorStop(0.25, "rgba(255, 180, 90, 0.32)");
  corona.addColorStop(0.55, "rgba(255, 130, 50, 0.12)");
  corona.addColorStop(1.0, "rgba(255, 100, 30, 0.0)");
  ctx.fillStyle = corona;
  ctx.fillRect(0, 0, size, size);

  // Faint radial spikes for a touch of "star" character.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = "lighter";
  const spikes = 6;
  for (let i = 0; i < spikes; i++) {
    ctx.rotate(Math.PI / spikes);
    const spike = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
    spike.addColorStop(0.0, "rgba(255, 180, 90, 0)");
    spike.addColorStop(0.5, "rgba(255, 220, 150, 0.25)");
    spike.addColorStop(1.0, "rgba(255, 180, 90, 0)");
    ctx.fillStyle = spike;
    ctx.fillRect(-size / 2, -1.5, size, 3);
  }
  ctx.restore();

  // Inner chromosphere — hot orange halo.
  const chromo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.28);
  chromo.addColorStop(0.0, "rgba(255, 240, 200, 1.0)");
  chromo.addColorStop(0.35, "rgba(255, 200, 110, 0.85)");
  chromo.addColorStop(0.75, "rgba(255, 150, 70, 0.35)");
  chromo.addColorStop(1.0, "rgba(255, 130, 50, 0.0)");
  ctx.fillStyle = chromo;
  ctx.fillRect(0, 0, size, size);

  // Photosphere — tight bright white-yellow core.
  const disk = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.12);
  disk.addColorStop(0.0, "rgba(255, 255, 245, 1.0)");
  disk.addColorStop(0.6, "rgba(255, 240, 180, 0.95)");
  disk.addColorStop(1.0, "rgba(255, 220, 140, 0.0)");
  ctx.fillStyle = disk;
  ctx.fillRect(0, 0, size, size);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/** Build a small text label canvas texture. */
function makeLabelTexture(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
  const fontSize = 11 * dpr;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("2d context unavailable");
  measure.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText(text, padX * dpr, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

// Suppresses unused-import lint warning if any of these are tree-shaken away.
void MeshBasicMaterial;

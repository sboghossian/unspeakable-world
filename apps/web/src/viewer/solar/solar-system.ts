import {
  Body,
  EquatorFromVector,
  GeoVector,
  type FlexibleDateTime,
  type Vector as AstroVector,
} from 'astronomy-engine';
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
} from 'three';
import { raDecToVec3 } from '../stars/coords';

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
  { body: Body.Sun, label: 'Sun', color: 0xffe98a, size: 0.12 },
  { body: Body.Moon, label: 'Moon', color: 0xfafaf2, size: 0.09 },
  { body: Body.Mercury, label: 'Mercury', color: 0xc8c1b8, size: 0.04 },
  { body: Body.Venus, label: 'Venus', color: 0xfff0c2, size: 0.06 },
  { body: Body.Mars, label: 'Mars', color: 0xff8a5e, size: 0.05 },
  { body: Body.Jupiter, label: 'Jupiter', color: 0xffd9a8, size: 0.075 },
  { body: Body.Saturn, label: 'Saturn', color: 0xffe1a3, size: 0.065 },
  { body: Body.Uranus, label: 'Uranus', color: 0xb6e6f0, size: 0.045 },
  { body: Body.Neptune, label: 'Neptune', color: 0x7fa6ff, size: 0.045 },
];

type PlacedBody = {
  spec: BodySpec;
  sprite: Sprite;
  labelSprite: Sprite | null;
};

export class SolarSystem {
  readonly group = new Group();
  private placed: PlacedBody[] = [];

  constructor() {
    this.group.name = 'SolarSystem';
    this.group.renderOrder = 1; // in front of HiPS + stars
    this.group.rotation.x = -Math.PI / 2; // Z-up astronomy → Y-up Three.js
    this.build();
  }

  private build(): void {
    for (const spec of BODIES) {
      const tex = makeGlowTexture(spec.color);
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
        const offset = new Vector3(x, y, z).normalize();
        const upBias = new Vector3(0, 0, 0.025);
        const labelPos = new Vector3(x, y, z).add(upBias).normalize().multiplyScalar(BODY_RADIUS);
        p.labelSprite.position.copy(labelPos);
        // Suppress when too close to the sprite center (avoids self-overlap on Sun/Moon).
        void offset;
      }
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
    return p.sprite.position.clone().applyEuler(this.group.rotation).normalize();
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
    this.placed = [];
  }
}

/** Get equatorial coords (J2000, geocentric, with aberration) for a body. */
function bodyEquatorial(body: Body, time: FlexibleDateTime): { ra: number; dec: number } {
  const vec: AstroVector = GeoVector(body, time, true);
  const eq = EquatorFromVector(vec);
  return { ra: eq.ra, dec: eq.dec };
}

/** Build a soft circular sprite texture with a glow, tinted by color. */
function makeGlowTexture(color: number): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  const c = new Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
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

/** Build a small text label canvas texture. */
function makeLabelTexture(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
  const fontSize = 11 * dpr;
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('2d context unavailable');
  measure.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  const metrics = measure.measureText(text);
  const width = Math.ceil(metrics.width + padX * 2 * dpr);
  const height = Math.ceil(fontSize + padY * 2 * dpr);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(text, padX * dpr, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

// Suppresses unused-import lint warning if any of these are tree-shaken away.
void MeshBasicMaterial;

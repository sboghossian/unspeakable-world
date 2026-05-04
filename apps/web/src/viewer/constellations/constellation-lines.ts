import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Sprite,
  SpriteMaterial,
} from "three";
import { raDecToVec3 } from "../stars/coords";

/**
 * The 88 IAU constellation outlines as line segments on the celestial
 * sphere.
 *
 * Source: d3-celestial — `data/constellations.lines.json` (BSD-3, Olaf
 * Frohn). GeoJSON FeatureCollection: each Feature is one constellation;
 * each Feature.geometry is a MultiLineString of [lon, lat] pairs in
 * degrees, ICRS J2000.
 */

const RADIUS = 0.999; // just inside the HiPS sphere; renderOrder keeps it on top

type LineFeature = {
  id: string;
  properties: { rank?: string };
  geometry: {
    type: "MultiLineString";
    coordinates: number[][][];
  };
};
type LineCollection = {
  type: "FeatureCollection";
  features: LineFeature[];
};

export class ConstellationLines {
  readonly group = new Group();
  private mesh: LineSegments | null = null;
  private material: LineBasicMaterial | null = null;
  private labels: Sprite[] = [];
  private lineCount = 0;

  constructor() {
    this.group.name = "ConstellationLines";
    this.group.rotation.x = -Math.PI / 2; // Z-up → Y-up
    this.group.renderOrder = 3;
    this.group.visible = false; // toggle on demand
  }

  async load(url: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`constellation lines HTTP ${res.status}`);
    const json = (await res.json()) as LineCollection;
    this.build(json);
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  setOpacity(o: number): void {
    if (this.material) this.material.opacity = o;
  }

  count(): number {
    return this.lineCount;
  }

  private build(json: LineCollection): void {
    // Pack every line segment into a single LineSegments mesh.
    const positions: number[] = [];
    let segmentCount = 0;

    for (const feature of json.features) {
      const polylines = feature.geometry.coordinates;

      // Centroid for label placement: average of every line vertex.
      let sumLon = 0;
      let sumLat = 0;
      let n = 0;
      for (const poly of polylines) {
        for (const pt of poly) {
          sumLon += pt[0]!;
          sumLat += pt[1]!;
          n++;
        }
        for (let i = 0; i < poly.length - 1; i++) {
          const [a, b] = [poly[i]!, poly[i + 1]!];
          const [ax, ay, az] = raDecToVec3(a[0]!, a[1]!, RADIUS);
          const [bx, by, bz] = raDecToVec3(b[0]!, b[1]!, RADIUS);
          positions.push(ax, ay, az, bx, by, bz);
          segmentCount++;
        }
      }

      if (n > 0) {
        const lonC = sumLon / n;
        const latC = sumLat / n;
        const [cx, cy, cz] = raDecToVec3(lonC, latC, RADIUS);
        const labelTex = makeConstellationLabel(feature.id);
        const labelMat = new SpriteMaterial({
          map: labelTex,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.78,
        });
        const sprite = new Sprite(labelMat);
        const aspect = labelTex.image.width / labelTex.image.height;
        const h = 0.024;
        sprite.scale.set(h * aspect, h, 1);
        sprite.position.set(cx, cy, cz);
        sprite.renderOrder = 4;
        this.labels.push(sprite);
        this.group.add(sprite);
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );

    const material = new LineBasicMaterial({
      color: 0x9fb6ff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
    });

    this.material = material;
    this.mesh = new LineSegments(geom, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3; // render on top of HiPS (-10), stars (-5), DSO (-3), planets (1)
    this.group.add(this.mesh);
    this.lineCount = segmentCount;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as LineBasicMaterial).dispose();
      this.group.remove(this.mesh);
      this.mesh = null;
      this.material = null;
    }
    for (const s of this.labels) {
      const m = s.material as SpriteMaterial;
      m.map?.dispose();
      m.dispose();
      this.group.remove(s);
    }
    this.labels = [];
  }
}

/** Build a tiny canvas texture with the constellation 3-letter code. */
function makeConstellationLabel(text: string): CanvasTexture {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const padX = 6;
  const padY = 3;
  const fontSize = 12 * dpr;
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
  ctx.fillStyle = "rgba(180, 200, 255, 0.85)";
  ctx.fillText(text, width / 2, height / 2);

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

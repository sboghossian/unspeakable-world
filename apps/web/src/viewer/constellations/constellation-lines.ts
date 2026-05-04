import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
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
    // GeoJSON MultiLineString: each polyline is N points → (N-1) segments
    // = (N-1)*2 vertices for THREE.LineSegments.
    const positions: number[] = [];
    let segmentCount = 0;

    for (const feature of json.features) {
      const polylines = feature.geometry.coordinates;
      for (const poly of polylines) {
        for (let i = 0; i < poly.length - 1; i++) {
          const [a, b] = [poly[i]!, poly[i + 1]!];
          // GeoJSON longitude is in [-180, 180] but our raDecToVec3 expects
          // RA in [0, 360). The math works on either convention because cos
          // and sin are periodic — same direction either way.
          const [ax, ay, az] = raDecToVec3(a[0]!, a[1]!, RADIUS);
          const [bx, by, bz] = raDecToVec3(b[0]!, b[1]!, RADIUS);
          positions.push(ax, ay, az, bx, by, bz);
          segmentCount++;
        }
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
  }
}

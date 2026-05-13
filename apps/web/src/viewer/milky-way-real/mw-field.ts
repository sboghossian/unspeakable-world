/**
 * mw-field — three.js renderer for the curated HII region + OB
 * association catalogs.
 *
 * Two point clouds in a single group:
 *   - HII regions: red, additive-blended, size scales with `sizePc`.
 *   - OB associations: cool blue, additive-blended, slightly smaller.
 *
 * Both are positioned in heliocentric Cartesian light-years using the
 * galactic-coordinate → Cartesian mapping shared with the rest of the
 * galactic-mode scenes (l, b, d in kpc converted via PC_PER_KPC and
 * LY_PER_PC). Sun sits at origin; galactic centre lies +x at ~26 000 ly.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
} from "three";

const LY_PER_PC = 3.261_563_777;
const PC_PER_KPC = 1000;

type GalacticPoint = {
  id: string;
  name: string;
  l: number;
  b: number;
  distKpc: number;
  sizePc: number;
};

function galToWorldLY(p: GalacticPoint): [number, number, number] {
  const lRad = (p.l * Math.PI) / 180;
  const bRad = (p.b * Math.PI) / 180;
  const dLy = p.distKpc * PC_PER_KPC * LY_PER_PC;
  // Standard galactic Cartesian: x toward galactic centre, y in plane,
  // z toward galactic north. We then map z (up) to world.y so the disc
  // lies horizontal in the existing galactic-mode camera.
  const x = dLy * Math.cos(bRad) * Math.cos(lRad);
  const yPlane = dLy * Math.cos(bRad) * Math.sin(lRad);
  const zNorth = dLy * Math.sin(bRad);
  return [x, zNorth, yPlane];
}

export class MilkyWayField {
  readonly group: Group;
  private readonly hiiPoints: Points;
  private readonly obPoints: Points;
  private readonly hiiMat: PointsMaterial;
  private readonly obMat: PointsMaterial;

  constructor() {
    this.group = new Group();
    this.group.name = "milky-way-real";

    this.hiiMat = new PointsMaterial({
      color: new Color("#ff4d6d"),
      size: 90,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.obMat = new PointsMaterial({
      color: new Color("#7cc8ff"),
      size: 60,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.hiiPoints = new Points(new BufferGeometry(), this.hiiMat);
    this.obPoints = new Points(new BufferGeometry(), this.obMat);
    this.group.add(this.hiiPoints, this.obPoints);
  }

  setHIIRegions(points: readonly GalacticPoint[]): void {
    const positions: number[] = [];
    for (const p of points) {
      const xyz = galToWorldLY(p);
      positions.push(xyz[0], xyz[1], xyz[2]);
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.computeBoundingSphere();
    this.hiiPoints.geometry.dispose();
    this.hiiPoints.geometry = geom;
  }

  setOBAssociations(points: readonly GalacticPoint[]): void {
    const positions: number[] = [];
    for (const p of points) {
      const xyz = galToWorldLY(p);
      positions.push(xyz[0], xyz[1], xyz[2]);
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.computeBoundingSphere();
    this.obPoints.geometry.dispose();
    this.obPoints.geometry = geom;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  dispose(): void {
    this.hiiPoints.geometry.dispose();
    this.obPoints.geometry.dispose();
    this.hiiMat.dispose();
    this.obMat.dispose();
  }
}

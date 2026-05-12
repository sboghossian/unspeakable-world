import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshBasicMaterial,
} from "three";

/**
 * Stylized JWST — gold primary mirror, kite-shaped 5-layer sunshield,
 * secondary mirror on a tripod boom. Built from primitive geometries
 * with Lambert materials so it lights from the Sun like every other
 * solar-flight body.
 *
 * The real Webb is 21 × 14 m and sits at the Earth–Sun L2. We render
 * it at ISS-size for consistency; the caller positions the Group
 * along the Sun-Earth line each frame.
 */

const GOLD = "#d4a13b";
const SUNSHIELD = "#e8e3da";
const STRUT = "#9aa1ab";
const INSTRUMENT = "#1f1f24";

export const JWST_SIZE = 0.006;

export class JwstModel extends Group {
  constructor() {
    super();
    this.name = "JwstModel";
    const u = JWST_SIZE / 12; // design space

    // Five-layer sunshield — kite-shaped, slightly offset stack.
    const shieldGroup = new Group();
    for (let i = 0; i < 5; i++) {
      const w = 12 * u - i * 0.4 * u;
      const d = 7 * u - i * 0.3 * u;
      const layer = new Mesh(
        new BoxGeometry(w, 0.04 * u, d),
        new MeshBasicMaterial({ color: SUNSHIELD }),
      );
      layer.position.y = -i * 0.18 * u;
      shieldGroup.add(layer);
    }
    this.add(shieldGroup);

    // Primary mirror — hexagonal-looking disk approximated by a flat
    // cylinder with 6 segments. Gold finish, lit by Sun.
    const primary = new Mesh(
      new CylinderGeometry(3.0 * u, 3.0 * u, 0.05 * u, 6),
      new MeshLambertMaterial({
        color: GOLD,
        emissive: "#3a2204",
        emissiveIntensity: 0.4,
      }),
    );
    primary.position.y = 1.6 * u;
    primary.rotation.x = -Math.PI / 18; // slight tilt for readability
    this.add(primary);

    // Instrument backplate.
    const backplate = new Mesh(
      new BoxGeometry(1.8 * u, 0.6 * u, 1.8 * u),
      new MeshLambertMaterial({ color: INSTRUMENT }),
    );
    backplate.position.y = 1.0 * u;
    this.add(backplate);

    // Secondary mirror on a 3-leg tripod boom.
    const secondary = new Mesh(
      new CylinderGeometry(0.45 * u, 0.45 * u, 0.06 * u, 16),
      new MeshLambertMaterial({ color: SUNSHIELD }),
    );
    secondary.position.y = 5.0 * u;
    this.add(secondary);
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const strut = new Mesh(
        new CylinderGeometry(0.03 * u, 0.03 * u, 3.6 * u, 6),
        new MeshLambertMaterial({ color: STRUT }),
      );
      strut.position.set(
        Math.cos(ang) * 1.5 * u,
        3.3 * u,
        Math.sin(ang) * 1.5 * u,
      );
      strut.lookAt(0, 5.0 * u, 0);
      strut.rotateX(Math.PI / 2);
      this.add(strut);
    }

    this.visible = false;
  }
}

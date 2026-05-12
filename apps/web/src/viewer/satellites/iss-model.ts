import {
  BoxGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshBasicMaterial,
} from "three";

/**
 * Stylized ISS — a recognizable silhouette without the polygon budget
 * of a CAD model. Reads as "long central truss with 8 solar-panel wings
 * + a habitation cluster at the middle" once you're close enough.
 *
 * Sized in scene units. Real ISS is ~109 m × 73 m; we render it at a
 * cosmetic scale so it's visible alongside Earth (drawSize ≈ 0.045
 * AU). Caller positions the whole Group each frame from the SGP4
 * propagation.
 */

const TRUSS = "#d9d9da";
const PANEL = "#1c2b56";
const PANEL_EDGE = "#384c80";
const MODULE = "#f4ecd8";

/** Total approximate width of the model, in scene units (AU). */
export const ISS_SIZE = 0.006;

export class IssModel extends Group {
  constructor() {
    super();
    this.name = "IssModel";

    // Scale the assembly so the longest dimension is ISS_SIZE.
    // We design in arbitrary units then scale down at the end.
    const u = ISS_SIZE / 12; // 12 unit-wide design space

    // Central truss — long thin bar along X.
    const truss = new Mesh(
      new BoxGeometry(12 * u, 0.5 * u, 0.5 * u),
      new MeshLambertMaterial({ color: TRUSS }),
    );
    this.add(truss);

    // Habitation cluster — small boxes at the center.
    const cluster = new Group();
    const mod1 = new Mesh(
      new BoxGeometry(2.0 * u, 1.1 * u, 0.9 * u),
      new MeshLambertMaterial({ color: MODULE }),
    );
    cluster.add(mod1);
    const mod2 = new Mesh(
      new BoxGeometry(0.9 * u, 0.9 * u, 1.6 * u),
      new MeshLambertMaterial({ color: MODULE }),
    );
    mod2.position.set(0, 0, 0.2 * u);
    cluster.add(mod2);
    this.add(cluster);

    // Solar panels — 4 pairs, two wings per pair (Z+ and Z-).
    // Panels are thin rectangles oriented in the X-Z plane.
    const panelX = [-5.4, -2.6, 2.6, 5.4];
    for (const x of panelX) {
      for (const sign of [1, -1]) {
        const panel = new Mesh(
          new BoxGeometry(2.4 * u, 0.04 * u, 3.6 * u),
          new MeshLambertMaterial({
            color: PANEL,
            emissive: PANEL_EDGE,
            emissiveIntensity: 0.25,
          }),
        );
        panel.position.set(x * u, 0, sign * 2.2 * u);
        this.add(panel);
      }
    }

    // Radiators — small white panels along the truss above the modules.
    const rad = new Mesh(
      new BoxGeometry(2.4 * u, 0.04 * u, 1.6 * u),
      new MeshBasicMaterial({ color: "#e6efff" }),
    );
    rad.position.set(0, 0.5 * u, -1.4 * u);
    this.add(rad);

    // Start hidden — caller flips visible once SGP4 succeeds.
    this.visible = false;
  }
}
